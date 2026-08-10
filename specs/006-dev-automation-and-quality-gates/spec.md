# Feature Specification: Developer Automation & Quality Gates

**Feature Branch**: `006-dev-automation-and-quality-gates`

**Created**: 2026-08-10

**Status**: Draft — ready to plan/task via `/speckit-plan`

**Review docs covered**: [`docs/review/06-performance.md`](../../docs/review/06-performance.md), [`docs/review/07-accessibility.md`](../../docs/review/07-accessibility.md), [`docs/review/08-testing-infrastructure.md`](../../docs/review/08-testing-infrastructure.md), [`docs/review/09-developer-automation.md`](../../docs/review/09-developer-automation.md)

**Input**: User description: "Turn every currently-manual, one-off check in this project into a scripted, repeatable one, and wire them into CI. Add a GitHub Actions CI workflow (install → lint → typecheck → build → test), git hooks (husky + lint-staged pre-commit, tsc pre-push), Prettier (owner-decided: yes), Dependabot. Build a test suite from zero: Vitest for unit tests (starting with `src/db/queries/*.ts`), React Testing Library for component tests (TreeList, AccountMenu, SideBar collapse/expand, Analysis pagination), Playwright for golden-path e2e (guest login → summary renders, every route loads, nav doesn't shift content, mobile-viewport smoke test, real-user login using test credentials only) — owner-decided cadence: fast unit/component suites gate every PR, Playwright e2e runs on merge to master. Add Lighthouse CI against a local `vite preview` build (owner-decided) with budget assertions, and a bundle-size budget (`size-limit`). Add automated accessibility scanning (`@axe-core/react` in dev, `vitest-axe` in the component suite) covering the manually-found issues (nav keyboard reachability, shark-palette contrast, chart hover-only interactions, login form labeling, post-navigation focus). This is the second spec in a sequence derived from `docs/review/` (five specs total, after merging related docs together), meant to run after 005 (repo hygiene & security) so `knip`, dependency cleanup, and hardening are already in place, and before 007-009 so every later spec lands with CI/test coverage instead of retrofitting it afterward."

**Sequencing note**: run this spec **second**, after 005. Every later spec (007–009)
should be implementable with this CI/test scaffolding already in place, so new work gets
covered by tests and automated checks as it lands rather than needing a retrofit pass.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Every push/PR gets an automatic lint/typecheck/build/test signal (Priority: P1)

A contributor (or the owner, working solo) pushes a branch or opens a PR. Instead of
relying on remembering to run `pnpm lint`/`tsc`/`pnpm build` locally, CI runs them
automatically and reports pass/fail directly on the PR.

**Why this priority**: this is the foundation every other automated check in this spec
(and, transitively, every future spec) plugs into.

**Independent Test**: open a PR with a deliberately introduced lint error; confirm the
GitHub Actions check fails and reports the specific error without needing a local run.

**Acceptance Scenarios**:

1. **Given** a push to any branch, **When** CI runs, **Then** it executes
   `pnpm install` → `pnpm lint` → `tsc --noEmit` → `pnpm build` and reports a single
   pass/fail status.
2. **Given** a pre-commit hook is installed via husky + lint-staged, **When** a developer
   commits a file with a lint violation, **Then** the commit is blocked locally before it
   ever reaches CI.
3. **Given** a pre-push hook running `tsc --noEmit`, **When** a developer pushes with a
   type error, **Then** the push is blocked locally.
4. **Given** Prettier is added and wired into `lint-staged`, **When** a developer commits
   an unformatted file, **Then** it's auto-formatted on commit rather than failing the
   commit outright.
5. **Given** Dependabot is configured, **When** a dependency has an available update or a
   known vulnerability, **Then** a PR is opened automatically on a weekly cadence.

---

### User Story 2 - A real, from-scratch test suite exists and runs in CI (Priority: P1)

Today there is no automated test of any kind. After this story, the highest-value logic
(data-shaping queries, interactive components, golden-path user flows) has coverage that
runs automatically.

**Why this priority**: the largest structural gap identified in the review relative to a
professional baseline — every other quality gate in this folder (performance,
accessibility) assumes a test runner exists as the substrate.

**Independent Test**: run `pnpm test` locally and in CI; confirm it covers at least
`src/db/queries/*.ts` unit tests, `TreeList`/`AccountMenu`/`SideBar`/Analysis-pagination
component tests, and passes on a clean checkout with no manual setup beyond
`pnpm install`.

**Acceptance Scenarios**:

1. **Given** Vitest is configured against the existing Vite config, **When** `pnpm test`
   runs, **Then** it executes unit tests for `src/db/queries/*.ts` and any standalone
   formatting/utility functions.
2. **Given** React Testing Library + Vitest (`jsdom`/`happy-dom`), **When** the component
   suite runs, **Then** it covers `TreeList` expand/collapse, `AccountMenu` dropdown
   open/close (guest vs. real-user rendering), `SideBar` collapse/expand (the specific
   regression guard for the recent nav redesign's content-shift fix), and Analysis
   pagination controls.
3. **Given** Playwright is configured, **When** the e2e suite runs (on merge to
   `master`, per the owner-decided cadence), **Then** it covers: guest login → Summary
   renders with data; every top-level route loads with no console errors; nav
   collapse/expand doesn't shift content; a 375px mobile-viewport smoke test across the
   same routes; and a real-user login path using **test/guest-equivalent credentials
   only**, never the owner's real Cognito account.
4. **Given** Storybook/MSW are kept (owner-decided 2026-08-10, see
   `docs/review/01-dependencies-and-config-hygiene.md`), **When** component tests need
   mocked data, **Then** MSW serves as the shared mocking layer for both Storybook and
   the Vitest component suite.
5. **Given** the fast unit/component suite and the slower Playwright e2e suite, **When**
   a PR is opened, **Then** only the fast suite gates the PR; Playwright e2e runs on
   merge to `master`.

---

### User Story 3 - Performance and bundle-size regressions are caught automatically (Priority: P2)

A future change that regresses Core Web Vitals or bloats the bundle gets caught by CI
before it reaches production, instead of being noticed incidentally.

**Why this priority**: directly actions the owner's explicit framing this round — "the
performance analysis should be scripted/automated, not just a one off."

**Independent Test**: introduce a deliberate bundle-size regression (e.g. add an unused
large dependency) in a test branch; confirm the `size-limit` CI check fails.

**Acceptance Scenarios**:

1. **Given** a one-time manual Lighthouse run establishes a baseline against the live
   deployed dashboard, **When** `@lhci/cli` is configured with a checked-in
   `lighthouserc.json`, **Then** budgets are set slightly above that baseline so the
   check passes today and fails on future regression.
2. **Given** the owner-decided CI target (2026-08-10), **When** Lighthouse CI runs as
   part of the pipeline, **Then** it runs against a local `vite preview` build, not a
   live Vercel preview URL.
3. **Given** `size-limit` (or equivalent) is configured with an initial budget from the
   current build output, **When** a PR increases the main or a route chunk beyond that
   budget, **Then** the `pnpm run size` CI check fails.

---

### User Story 4 - Accessibility regressions are caught automatically, and known issues are fixed (Priority: P2)

The manually-found accessibility gaps (nav keyboard reachability, `shark-400`/`600`
contrast, hover-only chart interactions, login form labeling, post-navigation focus) get
fixed, and an automated scan catches new regressions going forward.

**Why this priority**: a build-quality bar rather than a product decision (per
`docs/review/07-accessibility.md`'s own framing) — bundled into this spec because it
shares the same "wire into the test suite" mechanism as User Story 2.

**Independent Test**: run `@axe-core/react` in dev mode against the nav and login page;
confirm it reports zero violations after the fixes land, and that `vitest-axe`
assertions exist on the highest-traffic components.

**Acceptance Scenarios**:

1. **Given** the nav panel, **When** navigated with keyboard only (collapsed and
   expanded states), **Then** the toggle button and every nav item are reachable and
   operable without a mouse.
2. **Given** the `shark-400`/`shark-600` muted tones used in the footer and inactive nav
   labels, **When** measured against their background, **Then** they meet WCAG AA
   contrast thresholds (or are replaced with tones that do).
3. **Given** the login form, **When** inspected by a screen reader, **Then** every input
   has a properly associated `<label>`, not placeholder-only text.
4. **Given** a route navigation occurs, **When** the new page renders, **Then** focus
   moves to a sensible location (e.g. the page heading) rather than staying on the
   now-unmounted previous element or resetting to `<body>`.
5. **Given** `@axe-core/react` runs in dev mode and `vitest-axe` runs in the component
   suite, **When** either detects a violation, **Then** it's visible respectively as a
   dev-console warning or a failing CI test.

### Edge Cases

- What happens when Playwright's real-user login path needs credentials in CI? A
  dedicated test/guest-equivalent Cognito account (never the owner's real one) must be
  provisioned as a CI secret before this scenario can run automatically.
- What happens when Lighthouse CI's budget is crossed by a legitimate, intentional
  change (e.g. a genuinely heavier new feature)? The budget in `lighthouserc.json` is a
  checked-in, PR-reviewable config — bumping it is a deliberate, visible diff, not a
  silent override.
- What happens when `axe-core` flags a violation with no immediate fix (e.g. a
  third-party component's markup)? Document it as a known exception rather than
  disabling the check entirely.
- What happens if the accessibility contrast fix changes the `shark-*` palette itself?
  Cross-check with [007-design-system-theming-and-charts](../007-design-system-theming-and-charts/spec.md)
  before changing shared palette tokens, since that spec also touches the design system.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A GitHub Actions workflow MUST run `pnpm install` → `pnpm lint` →
  `tsc --noEmit` → `pnpm build` on every push and PR.
- **FR-002**: A pre-commit git hook (husky + lint-staged) MUST run ESLint and Prettier on
  staged files.
- **FR-003**: A pre-push git hook MUST run `tsc --noEmit`.
- **FR-004**: Prettier MUST be configured project-wide and wired into `lint-staged`.
- **FR-005**: Dependabot MUST be configured for the npm/pnpm ecosystem on a weekly
  cadence.
- **FR-006**: Vitest MUST be configured and cover, at minimum, `src/db/queries/*.ts` and
  standalone formatting/utility functions.
- **FR-007**: React Testing Library + Vitest MUST cover `TreeList`, `AccountMenu`,
  `SideBar` collapse/expand, and Analysis pagination.
- **FR-008**: Playwright MUST cover the golden paths listed in User Story 2, Scenario 3,
  using only test/guest-equivalent credentials for any authenticated flow.
- **FR-009**: The fast unit/component suite MUST run on every PR; the Playwright e2e
  suite MUST run on merge to `master`.
- **FR-010**: Lighthouse CI (`@lhci/cli`) MUST run against a local `vite preview` build
  with a checked-in `lighthouserc.json` budget, as a required CI check.
- **FR-011**: A bundle-size budget tool (`size-limit` or equivalent) MUST run as a
  required CI check.
- **FR-012**: `@axe-core/react` MUST run in dev mode; `vitest-axe` assertions MUST exist
  on the highest-traffic components/pages once the component suite exists.
- **FR-013**: The five manually-found accessibility issues listed in User Story 4 MUST
  be fixed.
- **FR-014**: A PR template MUST exist with a short checklist (tested locally? touches
  `src/config.json`/secrets? touches the cross-repo CSP coupling documented in
  [005-repo-hygiene-security-and-public-readiness](../005-repo-hygiene-security-and-public-readiness/spec.md)?).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every push/PR gets an automatic pass/fail CI signal within a few minutes,
  with no manual local-run step required to catch a lint/type/build error.
- **SC-002**: `pnpm test` (unit + component) passes on a clean checkout with only
  `pnpm install` as a prerequisite.
- **SC-003**: The Playwright golden-path suite passes on merge to `master`, covering
  guest login, every top-level route, nav stability, and a mobile-viewport smoke test.
- **SC-004**: Lighthouse CI and the bundle-size budget both fail CI on a deliberately
  introduced regression, proving the gate actually works.
- **SC-005**: `@axe-core/react`/`vitest-axe` report zero violations on the nav, login
  page, and the highest-traffic components after the fixes land.

## Assumptions

- This spec runs after [005-repo-hygiene-security-and-public-readiness](../005-repo-hygiene-security-and-public-readiness/spec.md),
  so `knip` already exists and can be added as a further CI step opportunistically
  (not re-specified here — see that spec).
- A dedicated test/guest-equivalent Cognito account for Playwright's real-user login
  scenario needs provisioning as part of this spec's implementation; it does not exist
  yet.
- No fixed test-coverage percentage target is assumed — per
  `docs/review/08-testing-infrastructure.md`, a small number of high-signal tests that
  stay maintained is preferred over a large suite that rots, appropriate for a
  solo-maintained app.
- Manual, on-device verification (e.g. confirming Playwright's mobile-viewport smoke
  test matches real-device behavior) is tracked in
  `docs/review/19-manual-verification.md` alongside this spec's own task list.
