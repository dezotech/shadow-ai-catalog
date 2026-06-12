# Changelog

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
