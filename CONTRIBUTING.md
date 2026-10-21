# Contributing to shadow-ai-catalog

Thanks for helping keep the catalog accurate. Contributions are gated by CI and
by maintainer source review.

## The honesty gate (enforced by CI)

`tests/invariants.test.ts` runs on every PR. It requires:

- Every entry carries a `verifiedAt` date.
- Every **positive** compliance claim (`baaAvailable: true`, or a non-null
  `trainsOnInput` / `dataRetention` / `jurisdiction`) carries at least one
  `sources` entry.
- `jurisdiction` is `null` or a 2-letter ISO 3166-1 alpha-2 code (`"FR"`, not
  `"France"`).
- No hostname is a bare public suffix or redundant with a broader same-entry
  domain; no hostname/alias collides across entries; ids are unique; categories
  are from the approved taxonomy.
- Every `tiers` key is explicitly declared in the entry's `hostnames` or
  `aliases`. Tier lookup is exact and case-insensitive; no mapping is inherited
  by subdomains or inferred from an `api` prefix.

CI proves a source **exists**. It does NOT prove the source **supports** the
claim — that is the maintainer's review job (see below).

## Adding or changing a compliance fact

1. The source MUST be **primary and vendor-owned** (the provider's own privacy
   policy, BAA page, or terms) — not a blog, news article, or aggregator.
2. Put the URL in `sources` and set `verifiedAt` to today (`YYYY-MM-DD`).
3. **Unknown ≠ false.** If you cannot find a vendor source, leave the fact `null`.
   A `null` is honest; a guessed `false` is a bug.
4. A maintainer will read the primary source and confirm it supports the fact
   before merging.

## Adding a hostname — byFqdn vs byEtld1 (read this)

Matching is exact and ownership-anchored:

- A hostname that is its **own registrable domain** (eTLD+1, e.g. `oaistatic.com`)
  matches **every subdomain** of that domain.
- A **curated FQDN** under a shared or foreign parent (e.g.
  `copilot.microsoft.com`) matches that FQDN and what is beneath it only.

Choose consciously. Putting a registrable domain in `hostnames` over-captures
when the domain also serves public, non-account content — that produces false
positives attributing a bystander's traffic to AI use. Prefer the **curated FQDN
actually seen in logs** over a broad parent domain. Justify your choice in the PR.

Provider detection and policy attribution have different scopes. If a provider's
parent domain already detects an API endpoint, declare that endpoint in
`aliases` before adding an exact `tiers` override. Use vendor documentation to
verify the endpoint and the applicable policy. Keep shared product hosts on
consumer defaults when a hostname alone cannot identify the contract or plan.

## PR checklist

Prepare package, catalog, and lockfile root versions together for curation
changes, and document the release as Unreleased until published. The API-host
correction is prepared as `0.5.1`, pending release; published `0.5.0` remains
unchanged. Consumers can use the corrected JSON through `--catalog` while
keeping their npm pin at `0.5.0`, then update the pin after `0.5.1` is published.

The PR template will ask you to confirm the above. Run `npm run verify` locally
before opening the PR.
