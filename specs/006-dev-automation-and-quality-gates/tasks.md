---
description: "Task list for spec 006: Developer Automation & Quality Gates"
---

# Tasks: Developer Automation & Quality Gates

**Input**: Design documents from `/specs/006-dev-automation-and-quality-gates/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This spec's entire purpose is introducing the repo's first test runner, so
test-writing tasks are the implementation, not an optional extra — Vitest/RTL unit +
component tests (US2), Playwright e2e (US2), and `vitest-axe` assertions (US4) are all
first-class tasks below, not TDD-style tests-before-code for pre-existing behavior.

**Organization**: Tasks are grouped by user story (US1-US4, priority order from spec.md:
P1 tier — US1, US2 — then P2 tier — US3, US4) so each can be implemented and validated
independently, per `spec.md`'s own "Independent Test" for each story. US1 is sequenced
first because it creates `.github/workflows/ci.yml` and `e2e.yml` as skeleton files that
US2's and US3's CI-wiring sub-tasks append steps to (noted per-task below); the actual
test-writing/fix work within US2/US3/US4 does not depend on US1 and could proceed in
parallel if staffed. US4 depends on US2's `src/test/setup.ts` existing (one shared
`expect.extend` call site) — noted per-task.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- File paths are exact, relative to repo root

## Path Conventions

Single existing project — `src/`, `api/`, `.github/`, and root-level config files (see
`plan.md` Project Structure).

---

## Phase 1: Setup

**Purpose**: Establish a pre-change baseline so regressions are attributable to this spec

- [x] T001 Manually verify the existing golden path (login → data loads → charts render)
      and the guest login path, on desktop, per constitution Principle III, before making
      any change — this is the regression baseline for the Polish-phase re-check (T066).
      Automated baseline captured (no interactive browser available in this session):
      `pnpm lint` clean (0 errors, 7 pre-existing warnings), `tsc --noEmit` clean, `pnpm
build` succeeds (main entry `index-CjRgCwWc.js` 317.53 kB gzip, `CartesianChart-*.js`
      80.28 kB gzip). Interactive golden-path click-through is deferred to T066, which the
      owner should also do manually in a real browser.

---

## Phase 2: Foundational (Blocking Prerequisites)

No cross-story blocking prerequisites for this spec — every new devDependency set and
config file is scoped inside the user story that actually needs it. The only inter-story
coupling (US1's workflow-file skeletons; US2's shared setup file) is noted as an explicit
task dependency within the relevant story's phase below, not a separate blocking phase.
Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Every push/PR gets an automatic lint/typecheck/build/test signal (Priority: P1) 🎯 MVP

**Goal**: A GitHub Actions CI workflow runs install→lint→typecheck→build on every push/PR
and reports pass/fail on the PR; husky pre-commit (lint-staged) and pre-push (`tsc
--noEmit`) hooks block bad commits/pushes locally; Prettier is wired into lint-staged;
Dependabot opens weekly dependency-update PRs; a PR template exists.

**Independent Test**: open a PR with a deliberately introduced lint error; confirm the
GitHub Actions check fails and reports the specific error without needing a local run.

### Implementation for User Story 1

- [x] T002 [P] [US1] Create `.prettierrc.json` at repo root:
      `{ "semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100, "tabWidth": 2 }`
      (research.md item 4).
- [x] T003 [P] [US1] Create `.prettierignore` mirroring `eslint.config.mjs`'s `ignores`
      (`dist/`, `dist-ssr/`, `storybook-static/`, `src/routeTree.gen.ts`) plus
      `pnpm-lock.yaml` (research.md item 4).
- [x] T004 [US1] Add `prettier` and `eslint-config-prettier` to `package.json`
      devDependencies; run `pnpm install`; append `eslint-config-prettier` as the final
      entry in `eslint.config.mjs`'s flat-config array (research.md item 4).
- [x] T005 [US1] Add `"format": "prettier --write ."` and
      `"format:check": "prettier --check ."` scripts to `package.json` (depends on T004).
- [x] T006 [US1] Run `pnpm run format` to reformat the entire repo per
      `.prettierrc.json`; commit this reformat as its **own isolated commit**, separate
      from every other US1 tooling-wiring change, so the diff stays reviewable (research.md
      item 4, depends on T002-T005).
- [x] T007 [US1] Add `husky` and `lint-staged` to `package.json` devDependencies; add a
      `"prepare": "husky"` script; run `pnpm install` (which triggers `prepare`, scaffolding
      `.husky/`) (research.md item 2).
- [x] T008 [US1] Configure `.husky/pre-commit` to run `pnpm exec lint-staged`; add a
      `"lint-staged"` config block to `package.json`:
      `{ "*.{ts,tsx,js,mjs}": ["eslint --fix", "prettier --write"], "*.{json,css,md}": ["prettier --write"] }`
      (research.md item 2, data-model item 1, depends on T007).
- [x] T009 [US1] Configure `.husky/pre-push` to run `pnpm exec tsc --noEmit` (research.md
      item 3, depends on T007).
- [x] T010 [P] [US1] Create `.github/dependabot.yml` with an `npm` ecosystem entry
      (weekly, `minor-and-patch` update-types grouped, `open-pull-requests-limit: 5`) and a
      `github-actions` ecosystem entry (weekly) (research.md item 5, data-model item 5).
- [x] T011 [P] [US1] Create `.github/pull_request_template.md` with the three-item
      checklist (tested locally? touches `src/config.json`/secrets? touches the
      cross-repo CSP coupling from spec 005?), cross-linked to spec 005's guardrail
      (research.md item 6, FR-014).
- [x] T012 [US1] Create `.github/workflows/ci.yml`: triggers on `push`+`pull_request`;
      uses `pnpm/action-setup@v4` + `actions/setup-node@v4` (`node-version: 24`,
      `cache: pnpm`); job steps `pnpm install --frozen-lockfile` → `pnpm lint` →
      `tsc --noEmit` → `pnpm build` → `pnpm run format:check`. Leave a clearly-marked
      placeholder step for `pnpm test` (added by US2's T032) and for the Lighthouse/
      size-limit steps (added by US3's T049) (research.md item 1,
      contracts/ci-checks-contract.md).
- [x] T013 [US1] Create `.github/workflows/e2e.yml`: triggers on `push` to `master` only;
      checkout + `pnpm/action-setup@v4` + `actions/setup-node@v4` (`cache: pnpm`) steps.
      Leave a clearly-marked placeholder for the Playwright install/run steps (added by
      US2's T040) (research.md item 1, contracts/ci-checks-contract.md).
- [~] T014 [US1] Manually validate `quickstart.md`'s US1 steps 1-6: pre-commit blocks a
  lint violation; pre-commit auto-formats rather than blocking; pre-push blocks a type
  error; a PR with a deliberate lint error fails the `ci.yml` check with the specific
  error shown; Dependabot is visibly active on a weekly cadence; the PR template
  appears pre-filled on a new PR (depends on T002-T013). Steps 1-3 verified locally
  (lint-staged auto-fixes fixable violations and blocks on unfixable ones via its
  non-zero exit code; `tsc --noEmit` blocks on a real type error). Steps 4-6 require a
  pushed branch/PR on GitHub and are **not yet verified** — outstanding until this
  branch is pushed and a PR opened.

**Checkpoint**: User Story 1 (MVP) is complete — every push/PR gets an automatic
lint/typecheck/build signal, and local hooks catch problems before they reach CI.

---

## Phase 4: User Story 2 - A real, from-scratch test suite exists and runs in CI (Priority: P1)

**Goal**: Vitest covers `src/db/queries/*.ts` (against a real in-memory libsql DB) and
standalone utility functions; React Testing Library covers `TreeList`, `AccountMenu`,
`SideBar` collapse/expand, and Analysis pagination; Playwright covers the golden-path e2e
scenarios (guest login, every route, nav stability, mobile smoke, gated real-user login);
the fast suite gates every PR and Playwright runs on merge to `master`.

**Independent Test**: run `pnpm test` locally and in CI; confirm it covers at least
`src/db/queries/*.ts` unit tests, the four named component tests, and passes on a clean
checkout with no manual setup beyond `pnpm install`.

### Implementation for User Story 2 — Vitest unit + component tests

- [x] T015 [P] [US2] Add `vitest`, `jsdom`, `@testing-library/react`,
      `@testing-library/jest-dom`, `@testing-library/user-event`,
      `@vitest/coverage-v8` to `package.json` devDependencies; run `pnpm install`
      (research.md items 7-9).
- [x] T016 [US2] Create `vitest.config.ts` at repo root: standalone config (not merged
      into `vite.config.ts`), `react()` plugin only, `@` → `src` alias,
      `test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], globals: true }`
      (research.md item 7, depends on T015).
- [x] T017 [P] [US2] Create `src/mocks/handlers.ts`: shared MSW request handlers,
      including at minimum a `POST /api/turso-token` handler returning a synthetic
      `{ url, token, expiresAt, accountConfig }` shape with obviously-fake values
      (research.md item 12, data-model item 7).
- [x] T018 [US2] Create `src/mocks/server.ts` (`setupServer(...handlers)` from
      `src/mocks/handlers.ts`, for Vitest/Node) (depends on T017).
- [x] T019 [US2] Create `src/test/setup.ts`: register `@testing-library/jest-dom`
      matchers and the MSW server lifecycle
      (`beforeAll(() => server.listen())` / `afterEach(() => server.resetHandlers())` /
      `afterAll(() => server.close())`) — leave a clearly-marked spot for the
      `vitest-axe` matcher extension added by US4's T053 (research.md item 13, depends on
      T016, T018).
- [x] T020 [US2] Refactor `.storybook/preview.tsx` and
      `src/routes/login/-loginPage.stories.tsx` to import and use
      `src/mocks/handlers.ts` instead of their current inline per-story handlers
      (research.md item 12, Acceptance Scenario 4, depends on T017). `preview.tsx` now
      supplies the shared `handlers` array globally; the login story's Cognito-failure
      handler stays as a legitimate per-story override on top of it.
- [x] T021 [US2] Add `out: "./drizzle"` to `src/drizzle.config.ts`; run
      `pnpm exec drizzle-kit generate` to produce a checked-in migration SQL file under
      `drizzle/` from `src/db/schema.ts`/`views.ts` (research.md item 10, data-model item
      2). Generated `drizzle/0000_lumpy_archangel.sql`.
- [x] T022 [US2] Create `src/test/db.ts`: a test-only helper that creates a fresh
      `:memory:` `@libsql/client` + `drizzle-orm/libsql` instance, applies the migration
      SQL from `drizzle/`, and seeds a small fixed set of synthetic fixture rows
      (accounts/transactions/time rows) (research.md item 10, data-model item 2, depends
      on T021). Done via `src/test/db.ts` (`createTestDb`, applies
      `drizzle/0000_lumpy_archangel.sql` against a `:memory:` libsql client) +
      `src/test/fixtures.ts` (`seedFixtures`, a deterministic account hierarchy +
      transaction set shared by all query tests).
- [x] T023 [P] [US2] Write `src/db/queries/global.test.ts` covering
      `getAccountsClosureQuery` and `getDomain`, asserting exact computed totals against
      `src/test/db.ts`'s fixtures (research.md item 10, depends on T022). Also covers
      `getBooks`. 5 tests, all passing against real SQL execution.
- [x] T024 [P] [US2] Write `src/db/queries/expenses.test.ts` and
      `src/db/queries/summary.test.ts` covering `getExpensesYearlyQuery` and related
      exports (depends on T022). Hand-computed rollup/year totals verified; exported
      `getExpensesYearlyQuery` from `expenses.ts` (was previously unexported) for
      direct testability, matching the export convention of sibling query files.
- [x] T025 [P] [US2] Write `src/db/queries/travel.test.ts` covering the travel-query
      exports (depends on T022). Covers the 3 travel queries that join `timeTable` via
      direct `eq(timeTable.ymd, ft.ymdPosted)`; the 4 queries using
      `substr(datePosted, 0, 11)` expect a different (date-only) `timetable.ymd`
      storage convention and are documented as out of scope in the test file's header
      comment rather than given fabricated coverage.
- [x] T026 [P] [US2] Write `src/db/utils.test.ts` covering `setAccountConfig`/
      `getConfig` (plain `Map`-backed, no DB fixture needed). 4 tests covering the
      unset-user error, the not-yet-loaded error, and per-user isolation.
- [x] T027 [P] [US2] Write `src/components/TreeList.test.tsx`: 2-level fixture data,
      child rows absent until parent toggle clicked then present after, leaf-row (no
      children) branch renders `item.node` with no toggle button (research.md item 11,
      depends on T016). 3 tests, all passing.
- [x] T028 [US2] Create `src/test/routerHarness.tsx`: a shared test helper providing
      `createMemoryHistory` + `createRouter` with a stub root route supplying
      `{ auth: {...} }` context, wrapped in `RouterProvider`, for components that need
      `Link`/`useRouterState`/route-context (depends on T016). Exposes `renderWithRouter`
      and `createAuthStub`. Note: since the root route's component is a closure over the
      `ui` argument, each distinct prop combination needs its own `renderWithRouter` call
      (RTL's `rerender()` can't propagate through it) — this pattern is documented in the
      consuming tests (SideBar.test.tsx).
- [x] T029 [P] [US2] Write `src/components/AccountMenu.test.tsx` using
      `src/test/routerHarness.tsx`: authenticated case (avatar renders, "Log Out" calls
      `signOut()`) and unauthenticated case ("Log In" link, no dropdown) (research.md
      item 11, Acceptance Scenario 2, depends on T028). 2 tests, all passing.
- [x] T030 [P] [US2] Write `src/components/SideBar.test.tsx` using
      `src/test/routerHarness.tsx`: assert the `<aside>` always carries the `fixed`
      positioning class in both collapsed/expanded renders (the nav-redesign
      content-shift regression guard); assert the toggle button calls `toggleSidebar`
      and `aria-expanded` matches `!isCollapsed` (research.md item 11, depends on T028).
      4 tests, all passing. Note: the expanded state renders two links both named "Home"
      (header wordmark + nav item), so that assertion uses `findAllByRole` and checks
      every match is inside the `<aside>`, rather than assuming a single match.
- [x] T031 [P] [US2] Write
      `src/routes/analysis/-components/TransactsTable.test.tsx`: fixture array > 8 rows,
      default `pageSize: 8` shows only 8 rows, next-page control changes rendered rows,
      page-size `<select>` (10/20/30/40/50) changes row count, "Go to page" input jumps
      `pageIndex` (research.md item 11, depends on T016). 4 tests, all passing. Note: the
      component's `useColumnFilters` hook binds to the real `/analysis/` route via
      `getRouteApi` for URL-synced filters; since pagination is independent of that
      syncing, `useColumnFilters` is mocked with local `useState` to keep this test
      focused on pagination and avoid standing up a full route tree.
- [x] T032 [US2] Add `"test": "vitest run"` script to `package.json`; replace `ci.yml`'s
      placeholder test step (from US1's T012) with `pnpm test` (depends on T012, T023-T031).
      Full suite: 9 test files, 28 tests, all passing.

### Implementation for User Story 2 — Playwright e2e

- [x] T033 [P] [US2] Add `@playwright/test` to `package.json` devDependencies; run
      `pnpm install`; run `pnpm exec playwright install --with-deps chromium`
      (research.md item 14). **Done.** `@playwright/test@^1.62.1` added. On this sandbox
      (Arch Linux, no `apt-get`), `--with-deps` fails since Playwright's system-dependency
      installer assumes an apt-based OS; `pnpm exec playwright install chromium` (browser
      binary only, ubuntu24.04-x64 fallback build) was used locally instead and verified
      to launch correctly. CI runs on real Ubuntu GitHub Actions runners, where
      `--with-deps` works as documented, so `e2e.yml` (T040) still uses it.
- [x] T034 [US2] Create `playwright.config.ts` at repo root: `webServer` running
      `vercel dev --listen 3111 --yes`, `baseURL: http://localhost:3111`, a default
      Chromium project plus a second project reusing Chromium at
      `{ viewport: { width: 375, height: 812 } }` (research.md items 14-15, depends on
      T033). **Done**, with two adjustments discovered while getting the first spec to
      actually run. First, `baseURL` must include the app's Vite `base: "/dashboard/"`
      path (`http://localhost:3111/dashboard/`), and every `page.goto(...)` call must
      use a bare relative path with no leading slash — a leading `/` resolves against
      the origin root and drops the base path entirely (WHATWG URL resolution). Second,
      **found and fixed a real, pre-existing bug**: `vercel dev` serves the same
      production `Content-Security-Policy` (`script-src 'self'`, no
      `unsafe-inline`/nonce) as real Vercel deployments, and Vite's dev-mode React Fast
      Refresh injects an inline `<script type="module">` HMR preamble that this strict
      CSP blocks — the app never rendered at all under `vercel dev`
      (`@vitejs/plugin-react can't detect preamble`). This was a latent regression from
      spec 005's CSP hardening that nobody had exercised against `vercel dev` locally
      until this task. Fixed by adding
      `"devCommand": "vite build && vite preview --port $PORT --strictPort"` to
      `vercel.json`, so `vercel dev` serves the CSP-compliant production bundle instead
      of the live dev server. This only affects the `vercel dev`/`pnpm run dev:api`
      pathway (documented as the "test-against-real-secrets" path, not the primary dev
      loop); plain `pnpm dev` is unaffected and keeps HMR. Reporter set to
      `[["list"], ["html", { open: "never"
}]]` so CI can upload the HTML report as an artifact on failure (T040).
- [x] T035 [P] [US2] Write `e2e/guest-golden-path.spec.ts`: guest login → `/summary`
      renders with a populated KPI/chart element (research.md item 16, depends on T034).
      **Done** — asserts the "Net" KPI label renders after `guestLogin()`.
- [x] T036 [P] [US2] Write `e2e/routes-smoke.spec.ts`: after guest login, visit every
      top-level route (`/home`, `/metadata`, `/summary`, `/expenses`, `/travels`,
      `/investments`, `/analysis?query=%7B%7D`), asserting zero `error`-level console
      messages per route (research.md item 16, depends on T034). **Done.** This surfaced
      a second real bug (see T042 notes): "Account config not yet loaded for user guest"
      console errors on every protected route, fixed in `src/routes/__root.tsx`.
- [x] T037 [P] [US2] Write `e2e/nav-stability.spec.ts`: toggle `SideBar` collapse/expand,
      assert a stable content element's (e.g. page `<h1>`) bounding box `x`/`width`
      doesn't change (research.md item 16, depends on T034). **Done.**
- [x] T038 [P] [US2] Write `e2e/mobile-smoke.spec.ts`: same route list as
      `routes-smoke.spec.ts`, run under the 375px-viewport project, asserting
      `document.documentElement.scrollWidth <= 375` and zero console errors (research.md
      item 16, depends on T034). **Done**, verified via `pnpm exec playwright test
--project=mobile` (passing).
- [x] T039 [US2] Write `e2e/real-user-login.spec.ts`: logs in via the real Cognito form
      using `process.env.PLAYWRIGHT_TEST_USER_EMAIL`/`PLAYWRIGHT_TEST_USER_PASSWORD`,
      asserts `/summary` renders; guarded by
      `test.skip(!process.env.PLAYWRIGHT_TEST_USER_EMAIL, "...")` so it reports skipped,
      not failed, until those secrets exist (research.md items 16-17, depends on T034).
      **Done** — reports `skipped` locally (secrets not provisioned; see T041).
- [x] T040 [US2] Add `"test:e2e": "playwright test"` script to `package.json`; replace
      `e2e.yml`'s placeholder (from US1's T013) with
      `pnpm exec playwright install --with-deps chromium` + `pnpm run test:e2e`, wiring in
      the Turso secrets `api/turso-token.ts` needs plus (once provisioned)
      `PLAYWRIGHT_TEST_USER_EMAIL`/`PASSWORD` (depends on T013, T035-T039). **Done.**
      `e2e.yml` now installs Chromium with system deps and runs `pnpm run test:e2e` with
      env: `TURSO_PLATFORM_TOKEN`, `TURSO_ORG_SLUG`, `TURSO_DATABASE_NAME`,
      `TURSO_DATABASE_URL`, `TURSO_GUEST_DATABASE_NAME`, `TURSO_GUEST_DATABASE_URL`
      (all six required at `api/turso-token.ts` module load, even for guest-only
      requests), `COGNITO_REGION`/`COGNITO_USER_POOL_ID`/`COGNITO_CLIENT_ID` (needed only
      if `real-user-login.spec.ts` runs), and `PLAYWRIGHT_TEST_USER_EMAIL`/`PASSWORD`.
      Uploads `playwright-report/` as a build artifact on failure. These GitHub Actions
      secrets still need the owner to actually add them in repo settings before the
      workflow can run its guest-covering specs — flagged in the completion report.
      Also fixed a bug this task's local run surfaced: `vitest.config.ts` had no
      `exclude` for `e2e/`, so `pnpm test` was picking up the new `e2e/*.spec.ts` files
      and failing (`Playwright's test() from an async describe` — a Vitest/Playwright
      API clash), which would have broken `ci.yml`'s `pnpm test` step. Added
      `exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"]`.
- [x] T041 [US2] Add a task entry to `docs/review/19-manual-verification.md` documenting
      the owner-side Cognito test-account provisioning step (create a dedicated
      `playwright-test@<domain>` user, set a permanent password, confirm its
      `ACCOUNT_CONFIG_*` mapping points at non-sensitive demo data, add
      `PLAYWRIGHT_TEST_USER_EMAIL`/`PASSWORD` as GitHub Actions secrets) (research.md
      item 17). **Done** — entry added under spec 006.
- [x] T042 [US2] Manually validate `quickstart.md`'s US2 steps: `pnpm test` passes on a
      clean checkout; the query tests assert exact fixture totals; the `SideBar` test
      asserts the `fixed` class in both states; Storybook still renders correctly after
      the MSW refactor; the Playwright suite runs on push to `master` (or locally via
      `pnpm run test:e2e`) covering all five scenarios; `real-user-login.spec.ts` reports
      skipped without the secrets; a PR's status reflects only the fast suite, not e2e
      (depends on T032, T040, T041). **Done**, all seven steps verified: 1. `pnpm test` → 9 files / 28 tests pass. 2. `src/db/queries/expenses.test.ts`/`global.test.ts` assert exact fixture totals
      (confirmed in T027-T032). 3. `SideBar.test.tsx` asserts `fixed` class in both collapsed/expanded states. 4. `pnpm exec storybook build` succeeds against `src/mocks/handlers.ts`. 5. `pnpm exec playwright test --project=chromium` and `--project=mobile` both pass
      (4/4 chromium including 1 expected-skip, 1/1 mobile). 6. `real-user-login.spec.ts` shows `skipped` (no `PLAYWRIGHT_TEST_USER_*` env set). 7. `e2e.yml` triggers only on `push: branches: [master]`; `ci.yml` triggers on
      `push`+`pull_request` — a PR's checks reflect only the fast suite.

      **Real app bug found and fixed while validating step 5**: `routes-smoke.spec.ts`
      caught 46 repeated console errors — `"Error: Account config not yet loaded for
      user guest"` — on every protected route. Root cause: `signInGuest()`
      (`src/hooks/useAuth.ts`) sets `user`/`idToken` synchronously, so
      `auth.isAuthenticated()` becomes true and the router navigates to `/summary`
      immediately, before the async `/api/turso-token` round-trip that populates
      `accountConfigByUser` (`src/db/utils.ts`) via `setAccountConfig` (`src/hooks/
      useDB.tsx`) has resolved. At least 9 components/queries call `getConfig(user)`
      unconditionally during render (`KpiBlock`, `SavingsBlock`, `SettingsBlock`, four
      summary plots, `expenses/index.tsx`, `src/db/queries/summary.ts`/`travel.ts`),
      several *before* their own loading-state check, so patching each site
      individually wasn't a viable minimal fix. Fixed once at the root instead:
      `src/routes/__root.tsx`'s `RootComponent` now reads `auth`/`db`/`bookId` from
      router context and renders a `BarLoader` in place of `<Outlet />` until either the
      user is unauthenticated (routes that don't need `db`, e.g. `/login`) or `db` and
      `bookId` are both ready — which by construction is always after
      `setAccountConfig` has already run for that user. Verified: `pnpm exec tsc
      --noEmit` clean, full `chromium` + `mobile` Playwright projects pass consistently
      across repeated runs (no flakes observed after the fix — the earlier flaky-looking
      `guest-golden-path.spec.ts` failure in a parallel run was this same race, not
      independent flakiness).

**Checkpoint**: User Story 1 AND 2 both work independently — CI signal plus a real test
suite covering the highest-value logic, interactive components, and golden-path flows.

---

## Phase 5: User Story 3 - Performance and bundle-size regressions are caught automatically (Priority: P2)

**Goal**: Lighthouse CI runs against a local `vite preview` build with a checked-in
budget slightly above a real measured baseline; a `size-limit` bundle-size budget is set
from a real measured build; both gate every PR.

**Independent Test**: introduce a deliberate bundle-size regression (e.g. add an unused
large dependency) in a test branch; confirm the `size-limit` CI check fails.

### Implementation for User Story 3

- [ ] T043 [P] [US3] Add `@lhci/cli`, `size-limit`, `@size-limit/file` to `package.json`
      devDependencies; run `pnpm install` (research.md items 19-20).
- [ ] T044 [US3] Run `pnpm build && pnpm preview` locally, then
      `npx lhci autorun --collect.numberOfRuns=3` once to measure a real performance/
      best-practices/seo baseline score against `http://localhost:4173/dashboard/`
      (research.md item 19, depends on T043).
- [ ] T045 [US3] Create `lighthouserc.json`: `startServerCommand: "pnpm build && pnpm preview"`,
      `numberOfRuns: 3`, `categories:performance`/`categories:best-practices` asserted at
      `"error"` with `minScore` set from T044's measured score (or 0.03-0.05 below it if >0.95), `categories:seo` at `"warn"`, `categories:accessibility` at `"off"`
      (research.md item 19, data-model item 3, depends on T044).
- [ ] T046 [US3] Add a `"perf": "lhci autorun"` script to `package.json`.
- [ ] T047 [US3] Run `pnpm build`; read the actual gzip byte sizes of
      `dist/dashboard/assets/index-*.js` (main entry chunk) and
      `dist/dashboard/assets/CartesianChart-*.js` (heaviest route chunk) (research.md
      item 20, depends on T043).
- [ ] T048 [US3] Add a `"size-limit"` config block to `package.json` with the two entries
      from T047, `limit` set to each measured gzip size + ~10% headroom; add a
      `"size": "size-limit"` script (research.md item 20, data-model item 4, depends on
      T047).
- [ ] T049 [US3] Replace `ci.yml`'s Lighthouse/size-limit placeholder (from US1's T012)
      with `pnpm run perf` and `pnpm run size` steps, both after `build`, both required
      (research.md item 21, contracts/ci-checks-contract.md, depends on T012, T045, T046,
      T048).
- [ ] T050 [US3] Manually validate `quickstart.md`'s US3 steps: `pnpm run perf` and
      `pnpm run size` pass on current `master`; a deliberate bundle-size regression on a
      scratch branch fails `pnpm run size`; a deliberate performance regression fails
      `pnpm run perf`; both revert cleanly; `lighthouserc.json` uses `vite preview`, not a
      live URL (depends on T045, T048, T049).

**Checkpoint**: User Stories 1-3 all work independently — a future change that regresses
Core Web Vitals or bloats the bundle is caught before it reaches production.

---

## Phase 6: User Story 4 - Accessibility regressions are caught automatically, and known issues are fixed (Priority: P2)

**Goal**: The five manually-researched accessibility gaps (nav keyboard reachability,
`shark-*` contrast, hover-only chart interactions, login form labeling, post-navigation
focus) are fixed; `@axe-core/react` scans in dev mode and `vitest-axe` assertions exist on
the highest-traffic components.

**Independent Test**: run `@axe-core/react` in dev mode against the nav and login page;
confirm it reports zero violations after the fixes land, and that `vitest-axe` assertions
exist on the highest-traffic components.

### Implementation for User Story 4

- [ ] T051 [P] [US4] Add `@axe-core/react`, `vitest-axe` to `package.json`
      devDependencies; run `pnpm install` (research.md items 22-23).
- [ ] T052 [US4] Wire `@axe-core/react` into `src/main.tsx`: dynamically import and call
      `axe(React, ReactDOM, 1000)`, guarded by `if (import.meta.env.DEV)`, before
      `ReactDOM.createRoot(...).render()` (research.md item 22, depends on T051).
- [ ] T053 [US4] Add the `vitest-axe` `toHaveNoViolations` matcher via
      `expect.extend(matchers)` in `src/test/setup.ts` (research.md item 23, depends on
      US2's T019, T051).
- [ ] T054 [US4] Fix nav collapsed-state accessible name: in
      `src/components/SideBar.tsx`'s `ItemLinkComponent`, add
      `aria-label={isCollapsed ? text : undefined}` to the rendered `<a>` (research.md
      item 24).
- [ ] T055 [US4] Fix `shark-*` contrast in `src/components/Footer.tsx`: swap
      `text-shark-400` (body text) and both `text-shark-600` (separator dots) usages to
      `text-shark-50` (research.md item 25).
- [ ] T056 [US4] Fix `shark-*` contrast in `src/components/SideBar.tsx`: swap the
      inactive-state icon class `text-shark-300` and inactive-state label class
      `text-shark-100` to `text-shark-50` (research.md item 25).
- [ ] T057 [P] [US4] Add the `accessibilityLayer` prop to `RechartsBarChart` in
      `src/components/charts/BarPlot.tsx` (research.md item 26).
- [ ] T058 [P] [US4] Add the `accessibilityLayer` prop to each top-level chart component
      under `src/routes/summary/-plots/*.tsx` (research.md item 26).
- [ ] T059 [P] [US4] Add the `accessibilityLayer` prop to each top-level chart component
      under `src/routes/travels/-components/*.tsx` and to
      `src/routes/analysis/-components/TransactsPlot.tsx` (research.md item 26).
- [ ] T060 [US4] Add visually-hidden (`sr-only`) `<label htmlFor="user">Email</label>` /
      `<label htmlFor="password">Password</label>` immediately before the corresponding
      inputs in `src/routes/login/index.tsx`, preserving the current placeholder-driven
      visual design (research.md item 27).
- [ ] T061 [US4] Add post-navigation focus management in `src/routes/__root.tsx`: add
      `tabIndex={-1}` plus a `ref` to the existing `<main>` landmark in `RootComponent`,
      and call `mainRef.current?.focus({ preventScroll: true })` inside the existing
      `selected`-dependent `useEffect` (research.md item 28).
- [ ] T062 [P] [US4] Add a `vitest-axe` assertion
      (`expect(await axe(container)).toHaveNoViolations()`) to
      `src/components/SideBar.test.tsx`, `src/components/AccountMenu.test.tsx`,
      `src/components/TreeList.test.tsx`, and
      `src/routes/analysis/-components/TransactsTable.test.tsx` (depends on US2's T027,
      T029-T031, and T053).
- [ ] T063 [US4] Create `src/routes/login/index.test.tsx` with a `vitest-axe` assertion
      on the rendered login form (depends on T053, T060).
- [ ] T064 [US4] Manually validate `quickstart.md`'s US4 steps: dev-console
      `@axe-core/react` reports zero violations on nav and login; keyboard-only Tab
      reaches every collapsed nav item with an announced label; Footer/inactive-nav
      contrast measures ≥ 4.5:1; login inputs show an associated label (not
      placeholder-only) in devtools' Accessibility panel; route navigation visibly moves
      focus to `<main>`; Tab-to-chart + arrow keys trigger the tooltip; `pnpm test` passes
      with the new `vitest-axe` assertions; record any remaining known exception in
      `docs/decisions.md` rather than silently disabling a check (depends on T052-T063).

**Checkpoint**: All four user stories are independently functional — every quality gate
from the spec (CI signal, test suite, performance/bundle budget, accessibility) now
exists and runs automatically.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Close out repo-settings work that can't live in a file, and do the final
constitution-mandated regression pass.

- [ ] T065 Set `install-lint-typecheck-build-test`, `lighthouse`, and `bundle-size` (the
      `ci.yml` job names) as required status checks in GitHub's branch protection
      settings for `master` — a manual, one-time GitHub UI step outside any file this
      repo's CI can write (contracts/ci-checks-contract.md, depends on T012, T049).
- [ ] T066 Full manual golden-path + guest-path regression pass (desktop + mobile
      viewport), per constitution Principle III, confirming none of this spec's CI/hook/
      test/a11y additions broke the app relative to T001's baseline (depends on all prior
      tasks).
- [ ] T067 Run `quickstart.md`'s full validation end-to-end (all four user-story
      sections plus the Cross-cutting section) and record results, including whether the
      Cognito test-account provisioning (T041) is still outstanding per
      `docs/review/19-manual-verification.md` (depends on T014, T042, T050, T064, T066).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Empty — proceed directly to Phase 3.
- **User Story 1 (Phase 3)**: Depends on Setup. Creates `.github/workflows/ci.yml` and
  `e2e.yml` skeletons that US2's and US3's CI-wiring sub-tasks (T032, T040, T049) later
  fill in — those specific sub-tasks depend on US1's T012/T013, but the rest of US2/US3's
  work (writing tests, measuring budgets) does not.
- **User Story 2 (Phase 4)**: Depends on Setup. Independently testable via `pnpm test`/
  `pnpm run test:e2e` without any US1 CI wiring; only T032 and T040 (adding the step to
  the workflow files) depend on US1.
- **User Story 3 (Phase 5)**: Depends on Setup. Independently testable via
  `pnpm run perf`/`pnpm run size` locally; only T049 depends on US1.
- **User Story 4 (Phase 6)**: Depends on Setup and on US2's `src/test/setup.ts` (T019)
  existing, since T053 extends that same file with one more `expect.extend` call.
  Otherwise independently testable via dev-mode `@axe-core/react` and manual inspection.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Parallel Opportunities

- All `[P]`-marked tasks within a phase touch distinct files and can run in parallel once
  their own listed dependencies are satisfied.
- US3 (Lighthouse/size-limit) and US4 (accessibility) have no dependency on each other and
  can be worked in parallel once US1 and US2 (US4 only needs US2's T019) are far enough
  along.
- Within US2, the Vitest/RTL track (T015-T032) and the Playwright track (T033-T042) touch
  entirely different files and can proceed in parallel.

---

## Parallel Example: User Story 2 (Vitest/RTL track)

```bash
# After T016 (vitest.config.ts) and T022 (in-memory DB helper) are done:
Task: "Write src/db/queries/global.test.ts covering getAccountsClosureQuery and getDomain"
Task: "Write src/db/queries/expenses.test.ts and summary.test.ts"
Task: "Write src/db/queries/travel.test.ts"
Task: "Write src/db/utils.test.ts"

# After T016 (and T028 for the router-context ones) are done:
Task: "Write src/components/TreeList.test.tsx"
Task: "Write src/components/AccountMenu.test.tsx using the router harness"
Task: "Write src/components/SideBar.test.tsx using the router harness"
Task: "Write src/routes/analysis/-components/TransactsTable.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 3: User Story 1 (CI + hooks + Prettier + Dependabot + PR template).
3. **STOP and VALIDATE**: open a PR with a deliberate lint error; confirm CI fails with
   the specific error, with no local run needed.
4. This alone already delivers SC-001.

### Incremental Delivery

1. Setup → User Story 1 (CI signal) → validate → this is the MVP.
2. Add User Story 2 (real test suite, unit+component+e2e) → validate independently →
   SC-002/SC-003 delivered.
3. Add User Story 3 (Lighthouse + bundle budget) → validate independently → SC-004
   delivered.
4. Add User Story 4 (accessibility scanning + the 5 fixes) → validate independently →
   SC-005 delivered.
5. Phase 7 closes out the one manual GitHub-settings step and the final regression pass.

### Solo-Maintainer Sequencing Note

This spec has no multi-developer parallel-team scenario (constitution: solo-maintained
project) — the phase order above (US1 → US2 → US3 → US4 → Polish) is also the recommended
actual implementation order, since it matches both priority (P1 tier before P2 tier) and
the one real inter-story file dependency (US1's workflow skeletons).

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks.
- `[Story]` label maps task to specific user story for traceability.
- Every Lighthouse/size-limit numeric budget (T044-T045, T047-T048) MUST come from a real
  measured build/run at implementation time — no number in `research.md` or this file is
  a stand-in value to keep.
- The Playwright real-user scenario (T039, T041) is expected to stay in a "skipped, not
  failed" state until the owner completes the manual Cognito provisioning step — this is
  not a blocker for calling US2 done.
- Commit after each task or logical group; keep T006's repo-wide Prettier reformat in its
  own commit, separate from every other change, per research.md item 4.
- Stop at any checkpoint to validate that story independently before continuing.
