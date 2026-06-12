# shadow-ai-catalog

A curated catalog of AI providers with **tier-scoped compliance metadata** — BAA
availability, training-on-input, and data-retention facts — each backed by a
**primary, vendor-owned source** and a `verifiedAt` date.

Public AI-domain blocklists tell you *that* a host is an AI service. This catalog
tells you what that use *means for compliance*, separately for the consumer tier
(what a firewall log usually sees) and the enterprise/API tier.

It is the data layer behind [shadow-scan](https://github.com/dezotech/shadow-scan),
an offline CLI that turns exported network logs into a risk-prioritized Shadow AI
inventory.

## Install

```bash
npm install shadow-ai-catalog
```

```typescript
import { loadCatalog, complianceForHost, tierOfHost } from 'shadow-ai-catalog'

const catalog = loadCatalog() // bundled data/ai-providers.json
const entry = catalog.entries.find((e) => e.id === 'openai-chatgpt')!

// Compliance is tier-scoped: pass the host you actually observed.
const facts = complianceForHost(entry, 'chatgpt.com') // consumer-tier facts
console.log(facts.baaAvailable, facts.dataRetention)
```

Or consume the raw JSON directly: `shadow-ai-catalog/data/ai-providers.json`.

## Data model

Each entry:

| Field | Meaning |
|-------|---------|
| `id` | Stable slug. |
| `hostnames` | Registrable domains / curated FQDNs that identify the service. |
| `aliases` | Alternate hostnames folded into this entry. |
| `tiers` | Per-host tier map. A host **absent** here defaults to `consumer` — the conservative, log-observable tier. List a host only when it is the enterprise/API tier. |
| `compliance.consumer` / `compliance.enterprise` | Tier-scoped facts: `baaAvailable`, `trainsOnInput` (nullable), `dataRetention` (nullable). |
| `category`, `riskTier`, `dualPurpose` | Classification. |
| `jurisdiction` | ISO 3166-1 alpha-2, or `null`. |
| `sources`, `verifiedAt` | Provenance. Every positive claim cites a source; every entry is dated. |

**Honesty rule: unknown ≠ false.** A fact with no supporting source is `null`,
never guessed.

## Freshness

`verifiedAt` makes staleness auditable. Re-verification is opportunistic — there
is no fixed cadence promise. A fact is only as current as its date.

## For the Brazilian market (LGPD)

The catalog's jurisdiction and retention facts map directly onto LGPD concerns
(international transfer, training use, retention windows). The reference consumer,
shadow-scan, renders a PT-BR LGPD evidence annex from exactly these fields.

## Disclaimer

This catalog is an **informational signal, not legal advice**. `verifiedAt`
indicates when a fact was last checked, not a guarantee of current accuracy.
Verify against the cited primary source for any compliance decision.

## License

Code (`src/`) under [MIT](LICENSE); catalog data (`data/ai-providers.json`) under
[CC BY 4.0](LICENSE-DATA). SPDX: `(MIT AND CC-BY-4.0)`. Using the data requires
attribution.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs are welcome and gated by CI + source
review.
