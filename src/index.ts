import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { z } from 'zod'

export const ComplianceFactsSchema = z.object({
  baaAvailable: z.boolean().default(false),
  trainsOnInput: z.boolean().nullable().default(null),
  dataRetention: z.string().nullable().default(null),
})
export type ComplianceFacts = z.infer<typeof ComplianceFactsSchema>

export const CatalogEntrySchema = z.object({
  id: z.string(),
  hostnames: z.array(z.string()).min(1),
  aliases: z.array(z.string()).default([]),
  // Per-host tier. Hosts absent here default to 'consumer' — the conservative,
  // log-observable tier (firewall logs almost always see the consumer host). Only
  // list a host when it represents the enterprise/API tier.
  tiers: z.record(z.string(), z.enum(['consumer', 'enterprise'])).default({}),
  category: z.string(),
  riskTier: z.enum(['low', 'medium', 'high']),
  // Compliance is tier-scoped: a firewall log detects a hostname, and the fact
  // reported must be the one true for THAT host's tier. 'consumer' is always
  // present (the default tier); 'enterprise' is optional.
  compliance: z.object({
    consumer: ComplianceFactsSchema,
    enterprise: ComplianceFactsSchema.optional(),
  }),
  // True when the domain serves substantial non-AI use (AI is one feature). A
  // hostname hit cannot be asserted as AI use → routed to manual triage.
  dualPurpose: z.boolean().default(false),
  // ISO 3166-1 alpha-2 only (e.g. "US", "DE"). English names ("Germany") are
  // rejected at parse time so the regex invariant is enforced on every loadCatalog().
  jurisdiction: z.string().regex(/^[A-Z]{2}$/).nullable().default(null),
  frameworkFlags: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  verifiedAt: z.string().nullable().default(null),
})

export const CatalogSchema = z.object({
  version: z.string(),
  entries: z.array(CatalogEntrySchema),
})

export type CatalogEntry = z.infer<typeof CatalogEntrySchema>
export type Catalog = z.infer<typeof CatalogSchema>

export const CATALOG_CATEGORIES = [
  'Generative AI - Assistant',
  'Generative AI - Search',
  'Generative AI - Code',
  'Generative AI - Image',
  'Generative AI - Audio/Video',
  'AI - Productivity/Embedded',
  'AI - Meeting/Transcription',
  'ML Platform',
] as const

export function tierOfHost(entry: CatalogEntry, host: string): 'consumer' | 'enterprise' {
  return entry.tiers[host.toLowerCase()] ?? 'consumer'
}

export function complianceForHost(entry: CatalogEntry, host: string): ComplianceFacts {
  const tier = tierOfHost(entry, host)
  if (tier === 'enterprise' && entry.compliance.enterprise) return entry.compliance.enterprise
  return entry.compliance.consumer
}

export function loadCatalog(path?: string): Catalog {
  const resolved =
    path ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'ai-providers.json')

  // Each of the three failure points (read, parse, validate) gets a diagnostic that
  // names the file — a --catalog typo or a hand-edited catalog must not surface as a
  // raw ENOENT / SyntaxError / Zod dump. The catalog is provider metadata, not a PII
  // log, so echoing the path and parser detail is safe (unlike the generic-csv adapter).
  let text: string
  try {
    text = readFileSync(resolved, 'utf8')
  } catch (e) {
    const code = (e as { code?: string }).code
    const why = code === 'ENOENT' ? 'file not found' : (code ?? 'unreadable')
    throw new Error(
      `catalog: cannot read ${resolved} — ${why}. The --catalog path is resolved from the current working directory.`,
    )
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    throw new Error(`catalog: ${resolved} is not valid JSON — ${(e as Error).message}.`)
  }

  const result = CatalogSchema.safeParse(raw)
  if (!result.success) {
    const summary = result.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`catalog: ${resolved} does not match the catalog schema:\n${summary}`)
  }
  return result.data
}
