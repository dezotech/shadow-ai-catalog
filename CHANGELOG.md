# Changelog

## 0.5.1 — Unreleased

- Map the exact `api.openai.com` and `api.groq.com` hosts to their already-curated
  API compliance facts through the existing `enterprise` tier. Declare the
  OpenAI API alias and allow tier keys to reference explicit aliases. Shared
  web hosts, unmapped API hosts, and hostname lookalikes keep consumer defaults;
  tier mappings do not extend to subdomains.
- Resolve explicit tier keys case-insensitively as well as observed hosts,
  including uppercase and mixed-case keys in custom catalogs. Exact hostname
  boundaries and consumer fallback are preserved.
- Add regression coverage for API attribution, case-insensitive lookup, consumer
  controls, and hostname boundaries. Add vendor API endpoint documentation and
  the Groq Services Agreement as provenance. Re-check OpenAI and Groq sources
  on 2026-10-21 and refresh their `verifiedAt` dates. Qualify API retention by
  endpoint/features, replace the Groq API BAA text with retention information,
  and remove the unsupported fixed account-data deletion deadline. Qualify
  OpenAI consumer deletion with the de-identification exception and limited
  historical legal hold.
- Pin CI checkout and Node setup actions to releases using Node 24. Refresh the
  development dependency lockfile to remove six reported advisories; `npm audit`
  reports zero findings. Runtime dependencies are unchanged.
- Prepare package, lockfile root metadata, and catalog versions as `0.5.1`
  pending release, so scans and comparisons can distinguish the corrected data.
  Published `0.5.0` is unchanged. Existing installs can load the corrected JSON
  explicitly (`loadCatalog(path)` or shadow-scan
  `--catalog <path-to-corrected-json>`); update exact npm pins after `0.5.1` is
  published.

## 0.5.0 — 2026-06-11 (first public release)

First public release of the catalog as a standalone package. Extracted from the
private shadow-scan repository, where it evolved through these milestones:

- **0.1–0.3:** initial provider set, 8-category taxonomy, exact ownership-anchored
  matching (eTLD+1 via PSL), and the per-entry honesty gate (`verifiedAt` +
  sourced positive claims).
- **0.4.0–0.4.1:** tier-scoped compliance (consumer vs enterprise facts, so an
  Enterprise claim is unrepresentable on a consumer host); `claudeusercontent`
  false-negative fix; `phind` added.
- **0.4.2:** curated consumer `dataRetention` for openai/gemini/perplexity with
  primary sources (NYT legal-hold nuance, Gemini human-review retention,
  Perplexity's no-fixed-window fact).

`0.5.0` is `0.4.2` byte-for-byte (49 entries) plus the version bump; the change in
this release is the public packaging, not the data.
