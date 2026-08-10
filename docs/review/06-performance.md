# Performance & Core Web Vitals

**Priority**: P1 · **Status**: Planning done — see specs/006-dev-automation-and-quality-gates

## Why this matters, and the framing the owner asked for specifically

The explicit ask was: _"The performance analysis should be scripted/automated, not just
a one off, same with most checks — they should be repeatable easily."_ This reframes the
whole doc: the deliverable isn't "a performance report," it's "a command (and a CI job)
that produces a fresh performance report on demand, forever." The same principle is
echoed back into several other docs in this folder (dependency hygiene via `knip`,
security via `pnpm audit`, accessibility via `axe-core`) — this doc is where that pattern
is spelled out once and referenced from the others.

## Current state (confirmed findings)

- No performance baseline has ever been measured for this app — no Lighthouse run, no
  bundle-size snapshot, nothing to compare against.
- Two charting libraries load simultaneously (Recharts + D3 — see
  [12-library-choice-review.md](12-library-choice-review.md) and
  [14-charts-and-mobile-interaction.md](14-charts-and-mobile-interaction.md)); not yet
  confirmed whether they're code-split per route or both end up in a shared chunk.
- `src/db/queries/*.ts`: not yet audited for N+1-style query fan-out.
- No `engines`/build-target pinning (see
  [02-config-schemas-and-validation.md](02-config-schemas-and-validation.md)) means the
  build environment itself isn't fully pinned, which matters for reproducible
  performance measurement too.

## Goals

- A real Core Web Vitals baseline exists (LCP, CLS, INP at minimum).
- Performance regressions are caught automatically (CI budget check), not noticed
  incidentally by a human.
- Bundle-size growth is visible and bounded, not discovered after the fact.
- **The mechanism generalizes**: this doc's "script it once, run it forever" pattern is
  the template for how every one-off audit item elsewhere in this folder should
  eventually be treated.

## Recommended approach

**Lighthouse CI (`@lhci/cli`)**: run against either a local `vite preview` build or a
Vercel preview deployment URL, with budget assertions (minimum performance score,
max LCP/CLS/TBT) that fail the CI job on regression rather than just producing a report
nobody reads. Config lives in a checked-in `lighthouserc.json` so budgets are
version-controlled and reviewable in a PR diff, same as any other config.

**Bundle-size budget**: a size-limit tool (`size-limit` or the Rollup/Vite
bundle-visualizer plugin combined with a byte-budget assertion) wired into the build
script, failing CI if the main chunk (or any route chunk) crosses a set threshold. This
is what would have caught "two charting libraries both loaded" as a build-time signal
instead of requiring someone to notice.

**The general "make checks repeatable" pattern**, applied across the folder:

| Concern                  | One-off way (what was done for this review) | Scripted/repeatable way                                                |
| ------------------------ | ------------------------------------------- | ---------------------------------------------------------------------- |
| Unused deps/dead code    | manual grep sweep                           | `knip` (see [01](01-dependencies-and-config-hygiene.md))               |
| Outdated/vulnerable deps | manual `pnpm outdated`                      | Dependabot/Renovate (see [09](09-developer-automation.md))             |
| Performance              | manual Lighthouse run                       | Lighthouse CI + budgets (this doc)                                     |
| Bundle size              | manual bundle-visualizer look               | `size-limit` in CI (this doc)                                          |
| Accessibility            | manual inspection                           | `axe-core` in the component test suite (see [07](07-accessibility.md)) |
| Lint/type errors         | manual `pnpm lint`/`tsc` run                | pre-commit hook + CI job (see [09](09-developer-automation.md))        |

A single `pnpm run audit:all` meta-script chaining lint + typecheck + `knip` +
`pnpm audit` + Lighthouse CI is the end state worth aiming for — one command (and one CI
job) that mechanically covers most of what this review folder currently requires manual
effort to check.

## Phased plan

1. **Phase 1 — establish a baseline manually, once**: run Lighthouse against the live
   deployed dashboard (guest login) to get an actual current LCP/CLS/INP number before
   automating anything — automating a check with no baseline to compare against isn't
   useful yet.
2. **Phase 2 — script it**: add `@lhci/cli` + a checked-in `lighthouserc.json` with
   budgets set slightly above the phase-1 baseline (so it passes today, catches future
   regression). Add a `pnpm run perf` script.
3. **Phase 3 — bundle-size budget**: add `size-limit` (or equivalent), set an initial
   budget from the current build output, add `pnpm run size`.
4. **Phase 4 — wire into CI**: once [09-developer-automation.md](09-developer-automation.md)'s
   CI pipeline exists, add both as required checks on PRs.
5. **Phase 5 — N+1 query check**: harder to automate generically; once
   [08-testing-infrastructure.md](08-testing-infrastructure.md)'s test infra exists,
   consider a lightweight query-count assertion in integration tests for the
   heaviest-loading routes (Analysis, Expenses) rather than a manual code read.
6. **Phase 6 — the `audit:all` meta-script**: once phases 1–5 and the equivalent items
   in [01](01-dependencies-and-config-hygiene.md)/[07](07-accessibility.md)/
   [09](09-developer-automation.md) exist, chain them into one script + one CI job.

## Open decisions — decided 2026-08-10

- **Lighthouse CI runs against a local `vite preview` build.** Faster and more
  deterministic for the recurring CI job. The one-time phase-1 baseline still uses the
  live Vercel deployment, since that's the only way to measure real current numbers.
