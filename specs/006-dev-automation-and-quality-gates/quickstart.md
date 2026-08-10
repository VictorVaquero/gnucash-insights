# Quickstart: Validating Developer Automation & Quality Gates

Validation guide covering all four user stories. Run each section's checks after that
story's implementation phase, not only at the end — this spec is explicitly designed as
independently-testable slices (per spec.md's "Independent Test" on each user story).

## Prerequisites

- Repo cloned, `pnpm install` run (this alone should install husky hooks via the new
  `prepare` script — confirm `.git/hooks/pre-commit` exists and calls `.husky/pre-commit`
  after install).
- For Playwright's real-user scenario only: `PLAYWRIGHT_TEST_USER_EMAIL`/
  `PLAYWRIGHT_TEST_USER_PASSWORD` set locally (or skip — the spec expects this to be
  unset until the owner provisions the account, per `research.md` item 17).

## US1 — Every push/PR gets an automatic lint/typecheck/build/test signal (P1)

1. On a clean checkout, `git commit` a file with a deliberate ESLint violation → expect
   the commit to be **blocked locally** by the pre-commit hook, with the specific lint
   error printed (Acceptance Scenario 2).
2. `git commit` a deliberately unformatted file (e.g. wrong quote style) → expect it to
   be **auto-formatted and committed**, not rejected (Acceptance Scenario 4).
3. `git push` with a deliberate TypeScript type error introduced → expect the push to be
   **blocked locally** by the pre-push hook (Acceptance Scenario 3).
4. Open a PR with a deliberately introduced lint error (bypass hooks with
   `git commit --no-verify` to get it up) → confirm the `install-lint-typecheck-build-
test` GitHub Actions check **fails** and reports the specific error, with no local run
   needed to discover it (spec's own Independent Test for this story).
5. Confirm `.github/dependabot.yml` exists and `gh api repos/:owner/:repo/dependabot/
alerts` (or the repo's Insights → Dependency graph → Dependabot tab) shows it active on
   a weekly cadence (Acceptance Scenario 5).
6. Open a PR; confirm `.github/pull_request_template.md`'s three-item checklist appears
   pre-filled in the PR description box (FR-014).

**Pass condition**: all six steps succeed.

## US2 — A real, from-scratch test suite exists and runs in CI (P1)

1. `pnpm test` on a clean checkout (only `pnpm install` as prerequisite) → expect it to
   pass, covering `src/db/queries/*.ts` unit tests, `TreeList`/`AccountMenu`/`SideBar`/
   Analysis-pagination component tests (spec's own Independent Test, SC-002).
2. Inspect one `src/db/queries/*.test.ts` file's assertions against its known fixture
   totals in `src/test/db.ts` → confirm it asserts exact computed values, not
   "renders without throwing."
3. Toggle `SideBar`'s collapse state in its component test → confirm the test explicitly
   asserts the `fixed` positioning class is present in both states (the nav-redesign
   regression guard, Acceptance Scenario 2).
4. Run Storybook (`pnpm storybook`) and confirm stories that previously had inline MSW
   handlers still render correctly after the `src/mocks/handlers.ts` refactor
   (Acceptance Scenario 4 — shared mocking layer).
5. On a push to `master` (or a manually triggered `workflow_dispatch`/local
   `pnpm run test:e2e`), confirm the Playwright suite runs and covers: guest login →
   Summary renders with data; every top-level route with zero console errors; nav
   collapse/expand not shifting a stable content element's bounding box; a 375px
   mobile-viewport pass of the same routes (Acceptance Scenario 3).
6. Confirm `e2e/real-user-login.spec.ts` reports **skipped** (not failed) when
   `PLAYWRIGHT_TEST_USER_*` secrets are absent, and passes once the owner provisions the
   account and secrets (`research.md` item 17).
7. Open a PR; confirm the CI status only reflects the fast Vitest suite — Playwright does
   not run and does not block merge (Acceptance Scenario 5, FR-009).

**Pass condition**: all seven steps succeed.

## US3 — Performance and bundle-size regressions are caught automatically (P2)

1. `pnpm run perf` locally (`lhci autorun`) on the current `master` → confirm it passes
   against `lighthouserc.json`'s checked-in budget.
2. Introduce a deliberate bundle-size regression in a scratch branch (e.g. add an unused
   large dependency and import it from a route file) → `pnpm run size` → confirm the
   `size-limit` check **fails** (spec's own Independent Test, SC-004).
3. Revert the scratch regression; confirm `pnpm run size` passes again.
4. Introduce a deliberate performance regression (e.g. a large synchronous blocking
   loop in a hot render path) in a scratch branch → `pnpm run perf` → confirm Lighthouse
   CI's `categories:performance` assertion **fails**.
5. Open a PR with no regression → confirm both `lighthouse` and `bundle-size` show as
   required, passing checks (`contracts/ci-checks-contract.md`).
6. Confirm `lighthouserc.json`'s `startServerCommand` uses `vite preview` (not a live
   Vercel URL) — `grep -n "vite preview" lighthouserc.json` (Acceptance Scenario 2, owner
   decision 2026-08-10).

**Pass condition**: all six steps succeed.

## US4 — Accessibility regressions are caught automatically, and known issues are fixed (P2)

1. Run the app in dev mode (`pnpm dev`), open the browser console → confirm
   `@axe-core/react` reports **zero violations** on the nav and login page after the
   fixes land (spec's own Independent Test).
2. Keyboard-only (no mouse): Tab through the collapsed nav → confirm the toggle button
   and every nav item are reachable, and each collapsed nav item announces its label via
   screen-reader testing or `aria-label` inspection in devtools (Acceptance Scenario 1,
   `research.md` item 24).
3. Inspect `Footer`'s and the inactive nav labels' computed color against their
   background with a contrast-checker devtool → confirm ≥ 4.5:1 (Acceptance Scenario 2,
   `research.md` item 25's `shark-50` swap).
4. Inspect the login form's `<input>` elements in devtools → confirm each has an
   associated `<label for="...">` (via the Accessibility panel's "Name" field, not just
   placeholder text) (Acceptance Scenario 3).
5. Navigate between two routes via the nav → confirm keyboard focus visibly lands on the
   `<main>` landmark (not silently reset to `<body>` or stuck on the unmounted nav item)
   (Acceptance Scenario 4).
6. Tab to a chart element → confirm arrow keys move between data points and trigger the
   same tooltip that mouse-hover shows (Recharts `accessibilityLayer`, `research.md` item
   26).
7. `pnpm test` → confirm `vitest-axe` assertions exist and pass on the nav, login, and
   the four named components' test files (Acceptance Scenario 5, SC-005).
8. Confirm `docs/decisions.md` (or a new entry in it) records any axe-core violation left
   as a documented known exception rather than silently disabled, if one exists after the
   fixes (spec's Edge Cases).

**Pass condition**: all eight steps succeed.

## Cross-cutting

- After all four stories are implemented, do one full manual golden-path pass (desktop +
  mobile viewport) per constitution Principle III: guest login → Summary renders → every
  route loads → nav collapse/expand → real-user login (once the test account exists) —
  confirming none of this spec's tooling/hook/CI additions broke the app itself.
- `docs/review/19-manual-verification.md` should list the Cognito test-account
  provisioning step as an outstanding manual task if not yet done at the time this spec
  is otherwise complete (`research.md` item 17) — this does not block the rest of the
  spec's success criteria, per its own Assumptions.
