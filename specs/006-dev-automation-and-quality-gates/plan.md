# Implementation Plan: Developer Automation & Quality Gates

**Branch**: `006-dev-automation-and-quality-gates` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-dev-automation-and-quality-gates/spec.md`

## Summary

Turn every currently-manual check in this repo into a scripted, CI-enforced one, in five
independently-testable slices: (1) a two-file GitHub Actions setup
(`ci.yml` gating every push/PR with install→lint→typecheck→build→test→format-check→
Lighthouse→size-limit; `e2e.yml` running Playwright only on merge to `master`) plus husky
pre-commit (lint-staged: ESLint+Prettier) / pre-push (`tsc --noEmit`) hooks, Prettier, a
grouped weekly Dependabot config, and a PR template; (2) a from-scratch Vitest + React
Testing Library suite — `src/db/queries/*.ts` tested against a real in-memory libsql DB
(not mocks, since these are Drizzle query builders, not pure functions), plus
TreeList/AccountMenu/SideBar/Analysis-pagination component tests, sharing MSW handlers
with Storybook; (3) a from-scratch Playwright e2e suite covering guest login, every
top-level route, nav-stability, a 375px mobile smoke test, and a real-user login path
gated behind a not-yet-provisioned test Cognito account (owner-side manual task); (4)
Lighthouse CI against a local `vite preview` build and a `size-limit` bundle budget, both
gating every PR, with budgets measured from a real build at implementation time rather
than invented in planning; (5) `@axe-core/react` in dev + `vitest-axe` in the component
suite, plus five concrete, already-researched fixes (nav collapsed-state accessible name,
`shark-*` contrast token swaps that deliberately avoid touching shared palette values per
spec 007's dependency, Recharts `accessibilityLayer`, login `sr-only` labels, post-nav
focus on the `<main>` landmark). See `research.md` for the full decision record behind
each of these.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js >=24 (already pinned in `package.json`
`engines`) — unchanged by this spec.

**Primary Dependencies**: existing stack unchanged (React 19, Vite 7, TanStack Router/
Query, Drizzle ORM, `@libsql/client`, Tailwind v4, Storybook + MSW). New devDependencies
this spec adds, grouped by area — CI/hooks: `husky`, `lint-staged`, `prettier`,
`eslint-config-prettier`; unit/component tests: `vitest`, `jsdom`,
`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`,
`@vitest/coverage-v8`; e2e: `@playwright/test`; performance/bundle: `@lhci/cli`,
`size-limit`, `@size-limit/file`; accessibility: `@axe-core/react`, `vitest-axe`. No new
runtime (non-dev) dependencies.

**Storage**: unchanged (Turso/libSQL for app data). This spec's only storage-adjacent
addition is test-only: an in-memory libsql (`:memory:`) database, seeded from a checked-in
Drizzle-generated migration, used exclusively by `src/db/queries/*.test.ts` — never
touches the real Turso instance (`research.md` item 10).

**Testing**: this spec _is_ the introduction of the test runner — before it, none
existed (confirmed in spec 005's plan.md). After it: Vitest (`jsdom`) for unit +
component tests, colocated with source (`Component.test.tsx` next to `Component.tsx`,
mirroring the existing `*.stories.tsx` convention); Playwright for e2e, gated to
merge-to-`master`; Lighthouse CI (`@lhci/cli` against local `vite preview`) and
`size-limit` gating every PR; `vitest-axe` assertions layered into the same component
test files.

**Target Platform**: Vercel (unchanged) for the app itself; GitHub Actions (new) as the
CI platform — private repo, so the 2,000 free minutes/month tier applies with no
Constitution Principle II cost concern at this traffic level (`research.md` item 1).

**Project Type**: Single existing project (`cashpy_v2` SPA + `api/` serverless
functions) — unchanged. This spec adds tooling/test scaffolding, not a new application
surface: new top-level `e2e/` (Playwright specs), `.husky/` (git hooks), and
`.github/workflows/*.yml` / `.github/dependabot.yml` / `.github/pull_request_template.md`
directories/files, none of which are a "project" in the multi-project sense.

**Performance Goals**: Lighthouse CI performance/best-practices category scores must not
regress below a baseline measured from a real `pnpm build && pnpm preview` run at
implementation time (methodology fixed in `research.md` item 19; no score invented during
planning). Bundle-size budget (main chunk + heaviest/chart route chunk, gzip) similarly
set from a real measured build + ~10% headroom (`research.md` item 20).

**Constraints**: Must not break the existing golden path (login → data loads → charts
render) or guest path (constitution Principle III) — the Playwright suite is itself the
new safeguard for this, but must not regress it. The PR-gating CI job must stay fast (no
browser-automation e2e on every PR, per FR-009 — only Playwright is deferred to merge;
Lighthouse/size-limit are fast enough to gate every PR, `research.md` item 21). The
accessibility contrast fix (`research.md` item 25) must not change shared `shark-*`
palette token _values_, only which existing token is used at each flagged call site, per
the spec's own Edge Case (spec 007 also depends on those tokens). The real-user Playwright
login scenario must use a dedicated test/guest-equivalent Cognito account, never the
owner's real one, and must gracefully self-skip in CI until that account is manually
provisioned (`research.md` item 17) — this spec's code cannot create AWS Cognito users.

**Scale/Scope**: Touches: `package.json` (16 new devDependencies across 4 areas, ~8 new/
changed scripts), `eslint.config.mjs`, new `.prettierrc.json`/`.prettierignore`,
`.husky/pre-commit`/`.husky/pre-push`, `.github/workflows/ci.yml`/`e2e.yml`,
`.github/dependabot.yml`, `.github/pull_request_template.md`, new `vitest.config.ts` +
`src/test/setup.ts` + `src/test/db.ts`, new test files alongside
`src/db/queries/*.ts`/`src/db/utils.ts`/`TreeList.tsx`/`AccountMenu.tsx`/`SideBar.tsx`/
`TransactsTable.tsx`, new `src/mocks/handlers.ts`+`server.ts` (plus a small Storybook
refactor to share them), `src/drizzle.config.ts` (+new checked-in migration SQL), new
`playwright.config.ts` + 5 files under `e2e/`, new `lighthouserc.json`, a `"size-limit"`
config block in `package.json`, and the five accessibility-fix files enumerated in
`research.md` items 24–28 (`SideBar.tsx`, `Footer.tsx`, `login/index.tsx`, `__root.tsx`,
`main.tsx`, and every top-level chart component). No new top-level application
directories — `e2e/`, `.husky/`, `src/test/`, `src/mocks/` are tooling/test scaffolding.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                             | Check                                                                                                                                                                                                                                                                                                                                                                                                                          | Result |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| I. Incremental, Reversible Migration  | Every piece here (CI, hooks, one test suite, one CI check) is independently addable/revertible — a failing new CI check can be disabled without touching app code, a new test file can be deleted without touching the tested code. Nothing in 006 requires 007-009 as a precondition; per its own Sequencing note, 006 is itself the precondition-remover for those specs.                                                    | PASS   |
| II. Cost-Consciousness                | Every new tool is free/open-source (husky, lint-staged, Prettier, Vitest, RTL, Playwright, `@lhci/cli`, `size-limit`, `@axe-core/react`, `vitest-axe`, Dependabot). GitHub Actions minutes are free-tier-ample for a private, low-traffic solo repo (`research.md` item 1). No paid service introduced.                                                                                                                        | PASS   |
| III. Continuity of the Working App    | This spec's entire purpose is adding safeguards around the golden/guest path, not changing it — the five accessibility fixes are the only functional-code changes, each scoped narrowly (aria-label, color-class swap, chart prop, sr-only labels, focus call) and each gets a Playwright/RTL/manual check per `quickstart.md`. The Playwright golden-path scenario itself becomes the durable regression guard going forward. | PASS   |
| IV. Boring, Well-Supported Technology | Every tool chosen is a widely-adopted, actively-maintained standard for its purpose (husky/lint-staged/Prettier for hooks; Vitest/RTL for unit+component, matching the existing Vite toolchain; Playwright for e2e; Lighthouse CI + size-limit for perf/bundle budgets; axe-core/vitest-axe for a11y) — no novel or niche picks, each justified against at least one considered alternative in `research.md`.                  | PASS   |
| V. Data Privacy on a Public Surface   | The Playwright real-user login scenario explicitly requires a dedicated test/guest-equivalent Cognito account, never the owner's real credentials, and self-skips in CI until that account is manually provisioned — no real secrets or real financial data are used in any automated test (`research.md` item 17).                                                                                                            | PASS   |

No violations; Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-dev-automation-and-quality-gates/
├── spec.md                          # Feature spec (already exists)
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── ci-checks-contract.md        # Phase 1 output — the CI check names/triggers other specs and branch protection rely on
└── tasks.md                         # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# CI / hooks / formatting / dependency automation (User Story 1)
.github/
├── workflows/
│   ├── ci.yml                       # new — install→lint→tsc→build→test→format:check→perf→size, on push+PR
│   ├── e2e.yml                      # new — Playwright, on push to master only
│   └── csp-drift.yml                # existing (spec 005) — unchanged
├── dependabot.yml                   # new — npm (grouped minor/patch) + github-actions ecosystems, weekly
└── pull_request_template.md         # new — 3-item checklist per FR-014
.husky/
├── pre-commit                       # new — pnpm exec lint-staged
└── pre-push                         # new — tsc --noEmit
.prettierrc.json                     # new
.prettierignore                      # new
eslint.config.mjs                    # gains eslint-config-prettier as final entry
package.json                        # lint-staged block, prepare/format/format:check/test/test:e2e/size/perf scripts, new devDependencies

# Unit + component tests (User Story 2a)
vitest.config.ts                     # new — standalone, jsdom, not merged into vite.config.ts
src/test/
├── setup.ts                        # new — jest-dom + vitest-axe matchers, MSW server lifecycle
└── db.ts                           # new — in-memory libsql fixture helper
src/drizzle.config.ts                # gains `out: "./drizzle"`
drizzle/                             # new — checked-in migration SQL (drizzle-kit generate output)
src/db/
├── queries/*.test.ts                # new — global/expenses/summary/travel query tests against in-memory libsql
└── utils.test.ts                    # new — setAccountConfig/getConfig unit tests
src/components/
├── TreeList.test.tsx                # new
├── AccountMenu.test.tsx             # new
└── SideBar.test.tsx                 # new
src/routes/analysis/-components/
└── TransactsTable.test.tsx          # new
src/mocks/
├── handlers.ts                     # new — shared MSW request handlers
└── server.ts                       # new — setupServer() for Vitest
.storybook/preview.tsx               # refactored to consume src/mocks/handlers.ts instead of inline handlers

# e2e (User Story 2b)
playwright.config.ts                 # new — webServer: vercel dev, chromium + 375px-viewport projects
e2e/
├── guest-golden-path.spec.ts        # new
├── routes-smoke.spec.ts             # new
├── nav-stability.spec.ts            # new
├── mobile-smoke.spec.ts             # new
└── real-user-login.spec.ts          # new — self-skips until PLAYWRIGHT_TEST_USER_* secrets exist
docs/review/19-manual-verification.md  # gains the Cognito test-account provisioning task

# Performance / bundle budget (User Story 3)
lighthouserc.json                    # new — startServerCommand: vite preview, budgets measured at implementation time
package.json                        # gains "size-limit" config block (main + chart chunk, gzip)

# Accessibility (User Story 4)
src/main.tsx                         # @axe-core/react dev-only wiring
src/components/SideBar.tsx           # collapsed-state aria-label fix + shark-* color swap
src/components/Footer.tsx            # shark-* color swap
src/routes/login/index.tsx           # sr-only <label> for user/password inputs
src/routes/__root.tsx                # focus(-1) on <main> after route change
src/components/charts/BarPlot.tsx    # accessibilityLayer prop
src/routes/summary/-plots/*.tsx      # accessibilityLayer prop
src/routes/travels/-components/*.tsx # accessibilityLayer prop
src/routes/analysis/-components/TransactsPlot.tsx  # accessibilityLayer prop
```

**Structure Decision**: Single existing project (`cashpy_v2` SPA + its `api/` serverless
functions) — unchanged, matching spec 005's precedent. This spec's new top-level
directories (`e2e/`, `.husky/`, `src/test/`, `src/mocks/`) are tooling/test scaffolding,
not a new project or a project split. Test files are colocated with the source they
cover wherever source already exists (mirroring the pre-existing `*.stories.tsx`
convention), and only genuinely new concerns (Playwright specs, shared test setup, shared
MSW handlers) get their own directory.

## Complexity Tracking

_No Constitution Check violations — this section intentionally left empty._
