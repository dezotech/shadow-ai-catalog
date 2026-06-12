import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import {
  loadCatalog,
  CatalogSchema,
  CatalogEntrySchema,
  CATALOG_CATEGORIES,
  complianceForHost,
  tierOfHost,
} from '../src/index.js'

// Capture a synchronous throw's message. The final throw is OUTSIDE the try, so a
// non-throwing call fails loudly instead of being swallowed (the trap we hit in W3).
function throwMessage(fn: () => unknown): string {
  try {
    fn()
  } catch (e) {
    return (e as Error).message
  }
  throw new Error('expected loadCatalog to throw, but it returned')
}

describe('tier-scoped schema', () => {
  const base = {
    id: 'demo',
    hostnames: ['demo.com', 'enterprise.demo.com'],
    category: 'Generative AI - Assistant',
    riskTier: 'high',
    compliance: {
      consumer: { baaAvailable: false, trainsOnInput: null, dataRetention: 'no BAA on consumer' },
      enterprise: { baaAvailable: true, trainsOnInput: false, dataRetention: '30 days (API)' },
    },
    tiers: { 'enterprise.demo.com': 'enterprise' },
    sources: ['https://demo.com/privacy'],
    verifiedAt: '2026-06-05',
  }

  it('parses an entry with per-tier compliance', () => {
    const e = CatalogEntrySchema.parse(base)
    expect(e.compliance.consumer.baaAvailable).toBe(false)
    expect(e.compliance.enterprise?.baaAvailable).toBe(true)
    expect(e.dualPurpose).toBe(false) // defaults
  })

  it('tierOfHost defaults absent hosts to consumer', () => {
    const e = CatalogEntrySchema.parse(base)
    expect(tierOfHost(e, 'demo.com')).toBe('consumer')
    expect(tierOfHost(e, 'enterprise.demo.com')).toBe('enterprise')
    expect(tierOfHost(e, 'UNKNOWN.demo.com')).toBe('consumer')
  })

  it('complianceForHost returns the fact for the host tier (consumer host -> NO BAA)', () => {
    const e = CatalogEntrySchema.parse(base)
    expect(complianceForHost(e, 'demo.com').baaAvailable).toBe(false)
    expect(complianceForHost(e, 'enterprise.demo.com').baaAvailable).toBe(true)
  })

  it('falls back to consumer facts when host tier is enterprise but no enterprise block exists', () => {
    const e = CatalogEntrySchema.parse({
      ...base,
      compliance: { consumer: { baaAvailable: false, trainsOnInput: null, dataRetention: null } },
      tiers: { 'enterprise.demo.com': 'enterprise' },
    })
    expect(complianceForHost(e, 'enterprise.demo.com').baaAvailable).toBe(false)
  })
})

describe('catalog', () => {
  it('loads and validates the seed catalog', () => {
    const cat = loadCatalog()
    expect(cat.entries.length).toBeGreaterThan(0)
    expect(cat.entries.find((e) => e.id === 'openai-chatgpt')).toBeTruthy()
  })

  it('classifies phind as a catalog tool (closes the dogfood FN)', () => {
    const cat = loadCatalog()
    expect(cat.entries.find((e) => e.id === 'phind')).toBeTruthy()
  })

  it('rejects an entry with an invalid riskTier', () => {
    expect(() =>
      CatalogSchema.parse({
        version: '0.0.0',
        entries: [{ id: 'x', hostnames: ['x.com'], category: 'c', riskTier: 'critical' }],
      }),
    ).toThrow()
  })

  it('applies defaults for sources and verifiedAt', () => {
    const parsed = CatalogEntrySchema.parse({
      id: 'x', hostnames: ['x.com'], category: 'ML Platform', riskTier: 'low',
      compliance: { consumer: {} },
    })
    expect(parsed.sources).toEqual([])
    expect(parsed.verifiedAt).toBeNull()
    expect(parsed.compliance.consumer.baaAvailable).toBe(false)
    expect(parsed.compliance.consumer.trainsOnInput).toBeNull()
  })

  it('exposes the 8-category taxonomy', () => {
    expect(CATALOG_CATEGORIES.length).toBe(8)
    expect(CATALOG_CATEGORIES).toContain('Generative AI - Code')
    expect(CATALOG_CATEGORIES).toContain('AI - Meeting/Transcription')
  })
})

describe('curated consumer dataRetention facts (W1)', () => {
  const cat = loadCatalog()
  const entry = (id: string) => {
    const e = cat.entries.find((x) => x.id === id)
    if (!e) throw new Error(`entry ${id} missing from catalog`)
    return e
  }

  it('openai-chatgpt: deleted chats purge in 30 days + NYT legal-hold nuance, with primary source', () => {
    const e = entry('openai-chatgpt')
    const retention = e.compliance.consumer.dataRetention
    expect(retention).toMatch(/30 days/)
    expect(retention).toMatch(/legal hold/i)
    // the fact must carry its own primary source (honesty gate is per-fact, not per-entry)
    expect(e.sources).toContain('https://openai.com/index/response-to-nyt-data-demands/')
  })

  it('google-gemini: 18-month default + human-reviewed chats kept up to 3 years even after deletion', () => {
    const e = entry('google-gemini')
    const retention = e.compliance.consumer.dataRetention
    expect(retention).toMatch(/18 months/)
    expect(retention).toMatch(/3 years/)
    expect(retention).toMatch(/human/i)
    expect(e.sources).toContain('https://support.google.com/gemini/answer/13594961')
  })

  it('perplexity: policy sets no fixed retention period (the absence of a window IS the curated fact)', () => {
    const e = entry('perplexity')
    const retention = e.compliance.consumer.dataRetention
    expect(retention).toMatch(/no fixed/i)
    expect(retention).toMatch(/reasonably necessary/i)
    expect(e.sources).toContain('https://www.perplexity.ai/hub/legal/privacy-policy')
  })
})

describe('loadCatalog error diagnostics (--catalog)', () => {
  const FIX = (name: string) => join(__dirname, 'fixtures', name)

  it('names the path and fails loud when the --catalog file is missing', () => {
    const missing = FIX('catalog-does-not-exist.json')
    const msg = throwMessage(() => loadCatalog(missing))
    expect(msg).toMatch(/catalog:/)
    expect(msg).toMatch(/not found/i)
    expect(msg).toContain(missing) // the operator must see WHICH path failed
  })

  it('names the path and says "not valid JSON" on a malformed catalog', () => {
    const bad = FIX('catalog-malformed.json')
    const msg = throwMessage(() => loadCatalog(bad))
    expect(msg).toMatch(/catalog:/)
    expect(msg).toMatch(/not valid JSON/i)
    expect(msg).toContain(bad)
  })

  it('names the path and the offending field on a schema mismatch (not a raw Zod dump)', () => {
    const bad = FIX('catalog-invalid-schema.json')
    const msg = throwMessage(() => loadCatalog(bad))
    expect(msg).toMatch(/catalog:/)
    expect(msg).toMatch(/schema/i)
    expect(msg).toContain(bad)
    expect(msg).toMatch(/compliance/) // the missing required field surfaces
  })
})
