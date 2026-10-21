import { describe, it, expect } from 'vitest'
import { getDomain } from 'tldts'
import { loadCatalog, CATALOG_CATEGORIES, CatalogEntrySchema } from '../src/index.js'
import type { ComplianceFacts } from '../src/index.js'

describe('catalog invariants', () => {
  const cat = loadCatalog()

  it('every positive compliance claim, per tier, carries a dated source (honesty gate)', () => {
    const asserts = (f: ComplianceFacts) =>
      f.trainsOnInput !== null || f.dataRetention !== null || f.baaAvailable === true
    for (const e of cat.entries) {
      const tiers = [e.compliance.consumer, e.compliance.enterprise].filter(Boolean) as ComplianceFacts[]
      const claims = tiers.some(asserts) || e.jurisdiction !== null
      if (claims) {
        expect(e.sources.length, `${e.id} claims a vendor fact but cites no source`).toBeGreaterThan(0)
      }
    }
  })

  it('every entry carries a verifiedAt (no fact-free entry ships unverified)', () => {
    for (const e of cat.entries) {
      expect(e.verifiedAt, `${e.id} has no verifiedAt`).not.toBeNull()
    }
  })

  it('no catalog hostname is a bare public suffix (would wildcard the whole zone)', () => {
    for (const e of cat.entries) {
      for (const h of e.hostnames) {
        expect(getDomain(h), `${e.id}: "${h}" is a bare public suffix / not a registrable domain`).not.toBeNull()
      }
    }
  })

  it('no hostname is redundant with a broader same-entry eTLD+1 hostname (dead byFqdn key)', () => {
    for (const e of cat.entries) {
      for (const h of e.hostnames) {
        const covered = e.hostnames.some(
          (o) => o !== h && h.endsWith('.' + o) && getDomain(o) === o,
        )
        expect(covered, `${e.id}: "${h}" already owned by broader hostname`).toBe(false)
      }
    }
  })

  it('tiers map only references explicitly declared hostnames or aliases', () => {
    for (const e of cat.entries) {
      for (const host of Object.keys(e.tiers)) {
        const declared = [...e.hostnames, ...e.aliases].map((h) => h.toLowerCase())
        expect(declared, `${e.id}: tier host "${host}" not in hostnames or aliases`).toContain(host.toLowerCase())
      }
    }
  })

  it('has unique ids', () => {
    const ids = cat.entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has no hostname/alias collision across entries', () => {
    const seen = new Map<string, string>()
    for (const e of cat.entries) {
      for (const h of [...e.hostnames, ...e.aliases]) {
        expect(seen.has(h), `host "${h}" in both ${seen.get(h)} and ${e.id}`).toBe(false)
        seen.set(h, e.id)
      }
    }
  })

  it('uses only approved categories', () => {
    for (const e of cat.entries) {
      expect(CATALOG_CATEGORIES as readonly string[], `${e.id}: "${e.category}"`).toContain(e.category)
    }
  })

  it('reaches the initial-set floor', () => {
    // Conservative floor for the initial expansion (~48 entries); adjustable if the list is pruned.
    expect(cat.entries.length).toBeGreaterThanOrEqual(40)
  })

  it('jurisdiction is null or a 2-letter ISO 3166-1 alpha-2 code', () => {
    const ISO2 = /^[A-Z]{2}$/
    for (const e of cat.entries) {
      if (e.jurisdiction !== null) {
        expect(
          e.jurisdiction,
          `${e.id}: jurisdiction "${e.jurisdiction}" is not a 2-letter ISO code (use "FR" not "France", "DE" not "Germany")`,
        ).toMatch(ISO2)
      }
    }
  })

  it('CatalogEntrySchema rejects non-ISO jurisdiction at parse time', () => {
    const base = {
      id: 'test', hostnames: ['example.com'], category: 'Generative AI - Assistant',
      riskTier: 'low', compliance: { consumer: {} }, sources: ['https://example.com'],
      verifiedAt: '2026-01-01',
    }
    expect(() => CatalogEntrySchema.parse({ ...base, jurisdiction: 'Germany' })).toThrow()
    expect(() => CatalogEntrySchema.parse({ ...base, jurisdiction: 'France' })).toThrow()
    expect(() => CatalogEntrySchema.parse({ ...base, jurisdiction: 'us' })).toThrow()
    expect(CatalogEntrySchema.parse({ ...base, jurisdiction: 'US' }).jurisdiction).toBe('US')
    expect(CatalogEntrySchema.parse({ ...base, jurisdiction: null }).jurisdiction).toBeNull()
    expect(CatalogEntrySchema.parse({ ...base }).jurisdiction).toBeNull()
  })
})
