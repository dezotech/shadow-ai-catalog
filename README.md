# shadow-ai-catalog

[![npm version](https://img.shields.io/npm/v/shadow-ai-catalog)](https://www.npmjs.com/package/shadow-ai-catalog)
[![CI](https://github.com/dezotech/shadow-ai-catalog/actions/workflows/ci.yml/badge.svg)](https://github.com/dezotech/shadow-ai-catalog/actions/workflows/ci.yml)
[![license: MIT AND CC-BY-4.0](https://img.shields.io/badge/license-MIT%20AND%20CC--BY--4.0-blue)](#license)

A curated catalog of AI providers with **tier-scoped compliance metadata** — BAA
availability, training-on-input, and data-retention facts — each backed by a
**primary, vendor-owned source** and a `verifiedAt` date.

Public AI-domain blocklists tell you *that* a host is an AI service, and stop
there. What that access *means for compliance* is a separate set of questions:
does the provider train on user input? How long does it retain data? Is a BAA
even available? And — critically — do those answers differ between the consumer
tier your firewall log actually saw and the enterprise tier your procurement
team negotiated? This catalog answers that second set, with sources. As of
v0.5.0 it covers 49 providers.

## Design principles

**1. Compliance facts are tier-scoped.** A firewall log sees `chatgpt.com` —
the consumer tier — not the enterprise contract. The same vendor can train on
consumer input and contractually exclude enterprise input; a BAA can exist for
the API tier and not for the web app. A fact is only true *for the tier of the
host you observed*, which is why the API is `complianceForHost(entry,
observedHost)` and not a flat per-vendor boolean. An enterprise claim must
never be attached to a consumer host.

**2. Unknown ≠ false.** A fact with no supporting source is `null`, never
guessed. A `null` is honest; a fabricated `false` is a bug. CI enforces this:
every positive claim must carry at least one source.

**3. Primary sources only.** Every positive claim cites the vendor's own
privacy policy, terms, or trust page — not a blog, news article, or
aggregator — and carries a `verifiedAt` date. CI proves a source *exists*;
the maintainer reads it and confirms it *supports* the claim before merge.

**4. Conservative defaults.** A host absent from an entry's `tiers` map is
`consumer` — the tier a network log can actually observe. An entry marked
`dualPurpose` (the domain serves substantial non-AI use) routes a hostname hit
to manual triage instead of asserting AI use.

## Part of a larger project

This catalog is the **open data layer** of [shadow-scan](https://github.com/dezotech/shadow-scan),
a private, offline CLI that turns exported network logs (FortiGate, Cisco
Umbrella, generic CSV) into a risk-prioritized Shadow AI inventory with a
PT-BR LGPD evidence annex:

```
exported network logs ──► shadow-scan (private CLI)
                          adapters → hostname matching → risk-prioritized
                          inventory + LGPD evidence annex
                                        ▲
                                        │ consumes as its data layer
                          shadow-ai-catalog (this repo, open)
                          tier-scoped facts + sources + verifiedAt
```

The split is deliberate: compliance *data* improves with public curation and
auditable provenance, so it is open; the assessment *engine* (log parsing,
ownership-anchored hostname matching, reporting) stays private. If you need
the full log-to-report pipeline, that is shadow-scan; if you need the facts —
for your own tooling, SIEM enrichment, or vendor review — they are all here.

## Install

```bash
npm install shadow-ai-catalog
```

## Quick start

```typescript
import { loadCatalog, complianceForHost, tierOfHost } from 'shadow-ai-catalog'

const catalog = loadCatalog() // bundled data/ai-providers.json
console.log(catalog.version, catalog.entries.length) // 0.5.0 49

// The same entry answers differently depending on the host you observed:
const copilot = catalog.entries.find((e) => e.id === 'microsoft-copilot')!

tierOfHost(copilot, 'copilot.microsoft.com')        // 'consumer'
complianceForHost(copilot, 'copilot.microsoft.com') // baaAvailable: false, trainsOnInput: null

tierOfHost(copilot, 'm365.cloud.microsoft')         // 'enterprise'
complianceForHost(copilot, 'm365.cloud.microsoft')  // baaAvailable: true,  trainsOnInput: false
```

## Recommended usage

### Always resolve facts through the observed host

```typescript
// WRONG — asserts enterprise facts for a host that may be the consumer tier:
const facts = entry.compliance.enterprise ?? entry.compliance.consumer

// RIGHT — the tier of the host you actually observed decides:
const facts = complianceForHost(entry, observedHost)
```

A fact is only valid for the tier of the host you saw in your logs. Reading
`compliance.enterprise` directly is how a consumer-tier ChatGPT session ends
up labeled "covered by a BAA" in an audit report.

### `dualPurpose` means triage, not assertion

For an entry like `huggingface`, the domain serves substantial non-AI use —
a hostname hit is evidence of *access*, not of AI usage. Route `dualPurpose`
hits to manual review instead of counting them as findings.

### Running with a fresher catalog

`loadCatalog(path)` accepts an explicit path, so you can run with a catalog
newer than the one bundled in your installed version. Failures are diagnosed
by stage and name the file: unreadable path, invalid JSON, or schema mismatch.

### Consuming the raw JSON

Non-TypeScript stacks can read the data directly — it ships in the package as
a subpath export (the `with { type: 'json' }` import-attribute syntax needs
Node 20.10+):

```javascript
import catalog from 'shadow-ai-catalog/data/ai-providers.json' with { type: 'json' }
```

Or fetch `data/ai-providers.json` from this repo. Validate against
`CatalogSchema` (or your own port of it) before trusting a fork.

### Pin an exact version when output stability matters

A catalog version bump changes *data* deliberately — new entries, corrected
facts, fresher `verifiedAt` dates. If your pipeline's output must be
reproducible (golden tests, signed reports), pin exactly and upgrade on
purpose:

```bash
npm install --save-exact shadow-ai-catalog
```

This is how shadow-scan itself consumes the catalog: exact pin, deliberate
regeneration of its golden snapshots on every bump.

## API reference

| Export | Semantics |
|--------|-----------|
| `loadCatalog(path?)` | Reads + validates a catalog JSON; defaults to the bundled `data/ai-providers.json`. Throws stage-named diagnostics (read / parse / schema), each naming the file. |
| `tierOfHost(entry, host)` | `'consumer' \| 'enterprise'` for the (case-insensitive) host; hosts absent from `entry.tiers` are `'consumer'`. |
| `complianceForHost(entry, host)` | The `ComplianceFacts` for the host's tier; falls back to consumer facts when no enterprise facts exist. |
| `CatalogSchema`, `CatalogEntrySchema`, `ComplianceFactsSchema` | Zod schemas — validate forks, ports, or hand-edited catalogs. |
| `Catalog`, `CatalogEntry`, `ComplianceFacts` | Inferred TypeScript types of the above. |
| `CATALOG_CATEGORIES` | The 8-category taxonomy entries must use. |

## Data model

Each entry:

| Field | Meaning |
|-------|---------|
| `id` | Stable slug. |
| `hostnames` | Registrable domains / curated FQDNs that identify the service. |
| `aliases` | Alternate hostnames folded into this entry. |
| `tiers` | Per-host tier map. A host **absent** here defaults to `consumer` — the conservative, log-observable tier. List a host only when it is the enterprise/API tier. |
| `compliance.consumer` / `compliance.enterprise` | Tier-scoped facts: `baaAvailable`, `trainsOnInput` (nullable), `dataRetention` (nullable). `enterprise` is optional. |
| `category`, `riskTier`, `dualPurpose` | Classification. `dualPurpose: true` ⇒ a hostname hit goes to triage, not asserted as AI use. |
| `jurisdiction` | ISO 3166-1 alpha-2, or `null`. |
| `frameworkFlags` | Framework-relevant tags (e.g. `pii-risk`); may be empty. |
| `sources`, `verifiedAt` | Provenance. Every positive claim cites a source; every entry is dated. |

## Versioning & freshness

The npm package version **is** the catalog data version (the `version` field
in `data/ai-providers.json`) — they move in lockstep, and
[CHANGELOG.md](CHANGELOG.md) records what changed. Re-verification of facts is
opportunistic — there is no fixed cadence promise. `verifiedAt` is what makes
staleness auditable: a fact is only as current as its date.

## For the Brazilian market (LGPD)

The catalog's jurisdiction and retention facts map directly onto LGPD concerns
(international transfer, training use, retention windows). The reference
consumer, shadow-scan, renders a PT-BR LGPD evidence annex from exactly these
fields.

## Contributing

Curation PRs are welcome and gated twice: CI runs the **honesty gate**
(every entry dated; every positive claim sourced; jurisdiction format;
hostname hygiene), and a maintainer reads each cited primary source to confirm
it supports the claim before merging. If you cannot find a vendor-owned
source, leave the fact `null` — that is a correct contribution.
See [CONTRIBUTING.md](CONTRIBUTING.md) for the rules, including the
byFqdn-vs-byEtld1 hostname decision.

## Disclaimer

This catalog is an **informational signal, not legal advice**. `verifiedAt`
indicates when a fact was last checked, not a guarantee of current accuracy.
Verify against the cited primary source for any compliance decision.

## License

Code (`src/`) under [MIT](LICENSE); catalog data (`data/ai-providers.json`)
under [CC BY 4.0](LICENSE-DATA). SPDX: `(MIT AND CC-BY-4.0)`. Using the data
requires attribution.
