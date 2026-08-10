# Testing infrastructure

**Priority**: P1 · **Status**: Planning only

## Why this matters

No automated test suite of any kind exists in this project today — confirmed absent: no
test runner installed, no `*.test.*`/`*.spec.*` files, no `test` script in
`package.json`. This is the largest structural gap relative to a "professional web app"
baseline, and every other automation-dependent item in this folder (performance budgets,
accessibility checks, CI gating) assumes a test runner exists as the substrate.

## Current state (confirmed findings)

- **[confirmed]** No Vitest/Jest in `package.json`, no test files anywhere.
- Storybook + MSW are present but their disposition is undecided (see
  [01-dependencies-and-config-hygiene.md](01-dependencies-and-config-hygiene.md)) — if
  kept, MSW becomes the natural mocking layer for component tests, so that decision
  should land before or alongside this doc's phase 2.

## Goals

- The highest-value, lowest-flakiness logic (query/data-shaping code) has unit coverage.
- Components with real interactive state (nav collapse, dropdowns, pagination) have
  component-level tests.
- Golden-path user flows are covered by real, automated browser interaction tests — not
  just component-level mocks.
- All of the above run in CI on every push/PR (see
  [09-developer-automation.md](09-developer-automation.md)), not just locally-and-
  optionally.

## Recommended approach

- **Unit tests**: **Vitest** — shares Vite's config/transform pipeline already in use,
  near-zero extra setup. Start with `src/db/queries/*.ts` (pure-ish data-shaping,
  easiest to test in isolation) and any standalone formatting/utility functions
  (currency/date formatting, the category-mapping logic that reads `src/config.json`).
- **Component/UI tests**: React Testing Library + Vitest (`jsdom`/`happy-dom`
  environment). Priority targets: `TreeList` (expand/collapse state), `AccountMenu`
  (dropdown open/close, guest vs. real-user rendering), the nav panel's collapse/expand
  behavior (this is also the natural regression guard for the layout bugs the recent nav
  redesign specifically fixed — content-shift-on-toggle should never silently come
  back), pagination controls on the Analysis table.
- **Fully automated end-to-end/web-interaction tests**: **Playwright** — first-class
  Vite/TanStack-Router-friendly, strong trace/debug tooling, runs headless in CI.

## Phased plan

1. **Phase 1 — Vitest setup + first unit tests**: install, configure against the
   existing Vite config, write tests for 2–3 `src/db/queries/*.ts` functions as the
   proof of setup.
2. **Phase 2 — component tests**: React Testing Library + Vitest, targeting `TreeList`,
   `AccountMenu`, `SideBar` collapse/expand, Analysis pagination. Resolve the
   Storybook/MSW keep-or-remove decision from
   [01-dependencies-and-config-hygiene.md](01-dependencies-and-config-hygiene.md) first
   if MSW mocking is going to be shared infrastructure here.
3. **Phase 3 — Playwright e2e, golden paths only**:
   1. Guest login → summary page renders with data.
   2. Navigate every top-level route (summary/analysis/travels/expenses/investments),
      confirm no console errors / broken renders.
   3. Nav panel collapse/expand doesn't shift content.
   4. Mobile-viewport smoke test at 375px width across the same routes (regression
      guard for spec 004's mobile-responsiveness work).
   5. Real-user login path — **must** use test/guest-equivalent credentials in any
      automated run, never the owner's real Cognito account (standing rule already
      followed in this project).
4. **Phase 4 — CI wiring**: run all three suites on every push/PR once
   [09-developer-automation.md](09-developer-automation.md)'s pipeline exists.
5. **Phase 5 — expand coverage opportunistically**: no fixed % target — for a
   solo-maintained app, a small number of high-signal tests that stay maintained beats a
   large suite that rots. Add tests when fixing bugs (regression-first), not as a
   separate coverage-chasing effort.

## Open decisions — decided 2026-08-10

- **e2e cadence: fast checks on PR, Playwright e2e on merge.** Unit/component suites
  gate every PR; the full Playwright golden-path suite runs on merge to `master` rather
  than on every PR push.
