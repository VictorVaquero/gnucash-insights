# Phase 0 Research: Developer Automation & Quality Gates

Each item below resolves a "NEEDS CLARIFICATION" from `plan.md`'s Technical Context, or an
open technical question the spec left to implementation. Findings come from reading the
actual repo (`package.json`, `vite.config.ts`, `src/`, `.github/`), not just the
`docs/review/06-09` docs alone, since those docs predate this pass and in several places
(e.g. accessibility) had never actually been measured.

## User Story 1 — CI, git hooks, Prettier, Dependabot, PR template (FR-001–FR-005, FR-014)

Repo state confirmed before deciding: `.github/workflows/csp-drift.yml` already exists
(spec 005) as the only workflow — pattern to match: `actions/checkout@v4`,
`actions/setup-node@v4` pinned to `node-version: 24`, no pnpm caching anywhere yet. No
`.prettierrc`, no husky, no Dependabot config, no PR template. The repo is currently
**private** (`gh repo view` → `PRIVATE`), so GitHub Actions' 2,000 free minutes/month for
private repos applies — ample at this traffic level; no Constitution Principle II
(cost) concern, and spec 005's public-readiness work doesn't change that math materially.
Code style is inconsistent today (`src/services/authService.tsx` uses 2-space/double
quotes/semicolons; `src/components/AccountMenu.tsx` uses 4-space/no trailing semicolons) —
confirming no formatter has ever run, so Prettier's first commit will be a repo-wide
reformat.

### 1. GitHub Actions workflow structure

**Decision**: Two workflow files. `.github/workflows/ci.yml` (`on: [push, pull_request]`)
runs `pnpm install --frozen-lockfile` → `pnpm lint` → `tsc --noEmit` → `pnpm build` →
`pnpm test` (unit+component only) → `pnpm run format:check` → `pnpm run perf` (Lighthouse
CI) → `pnpm run size` (bundle budget), all as required PR-gating checks. A separate
`.github/workflows/e2e.yml` (`on: push: branches: [master]`) runs the Playwright suite,
per FR-009. Both new workflows add `pnpm/action-setup@v4` + `actions/setup-node@v4` with
`cache: pnpm` (new — `csp-drift.yml` has no install step so never needed this). The
existing `csp-drift.yml` stays unchanged.

**Rationale**: FR-009's PR-gate-vs-merge-trigger split maps directly onto two files, and
keeps the fast PR signal (SC-001) from being slowed down by Playwright's browser install.
Lighthouse CI and `size-limit` are fast, non-flaky-by-design checks (no browser
automation, no multi-route crawl) comparable to lint/typecheck, so they belong in the
PR-gating job, run after `build` since both depend on build output existing (see User
Story 3 below).

**Alternatives considered**: one workflow file with a conditional e2e job gated on
`github.ref == 'refs/heads/master'` — rejected as needlessly obscuring the trigger split
for a solo maintainer reading the Actions tab; two small files are easier to reason about
than one file with branching logic.

### 2. husky + lint-staged (pre-commit)

**Decision**: `husky@^9` + `lint-staged@^15` as devDependencies. `pnpm exec husky init`
scaffolds `.husky/pre-commit` running `pnpm exec lint-staged`. `lint-staged` config lives
in `package.json` (matches the existing `msw`/`pnpm.overrides` in-package.json
convention):

```json
"lint-staged": {
  "*.{ts,tsx,js,mjs}": ["eslint --fix", "prettier --write"],
  "*.{json,css,md}": ["prettier --write"]
}
```

Add a `"prepare": "husky"` script so hooks auto-install on `pnpm install` for any future
clone/contributor.

**Alternatives considered**: `simple-git-hooks` (lighter-weight) — rejected, `husky` is
the de facto standard with far more ecosystem docs/examples, no meaningful cost
difference at this repo's scale (Constitution Principle IV: boring, well-supported).

### 3. Pre-push hook

**Decision**: `.husky/pre-push` runs `tsc --noEmit` directly — not the full `pnpm build`
(which also runs `vite build`, too slow for a hook that blocks every push). This matches
FR-003 exactly and reuses the same typecheck step `package.json`'s existing `build` script
(`vite build && tsc`) already runs, without duplicating the Vite build locally.

### 4. Prettier

**Decision**: `prettier@^3` + `eslint-config-prettier@^9` as devDependencies.
`.prettierrc.json`:

```json
{ "semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100, "tabWidth": 2 }
```

Append `eslint-config-prettier` as the **last** entry in `eslint.config.mjs`'s flat-config
array, so it disables ESLint stylistic rules that would otherwise conflict with the
existing `tseslint.configs.stylistic`. `.prettierignore` mirrors `eslint.config.mjs`'s
`ignores` (`dist/`, `dist-ssr/`, `storybook-static/`, `src/routeTree.gen.ts`) plus
`pnpm-lock.yaml`. New scripts: `"format": "prettier --write ."`,
`"format:check": "prettier --check ."` — the latter wired into `ci.yml` after `pnpm lint`.
`printWidth: 100` / `tabWidth: 2` were chosen to match the more common style already
present in `src/`, minimizing the first-adoption reformat diff. The repo-wide `pnpm
format` run must land as its **own isolated commit**, separate from the tooling-wiring
commit, so the diff is reviewable.

**Alternatives considered**: `prettier-plugin-tailwindcss` (auto-sorts Tailwind classes) —
no FR calls for it; flagged as a future follow-up, not in this spec's scope.

### 5. Dependabot

**Decision**: `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly" }
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]
    open-pull-requests-limit: 5
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: { interval: "weekly" }
```

`npm` ecosystem type covers pnpm lockfiles natively (Dependabot reads `pnpm-lock.yaml`
under the `npm` ecosystem). The `minor-and-patch` grouping collapses routine bumps into a
single PR — directly actions the "avoid PR spam for a solo maintainer" concern from
`docs/review/09-developer-automation.md`; majors stay ungrouped so each gets individual
review. The `github-actions` ecosystem entry is a zero-cost addition (keeps the new
workflow files' pinned action versions from drifting) beyond FR-005's literal npm-only
wording — confirm at `/speckit-tasks` that this extra entry is wanted, since FR-005 names
only the npm/pnpm ecosystem explicitly.

### 6. PR template (FR-014)

**Decision**: `.github/pull_request_template.md`:

```markdown
## Summary

## Checklist

- [ ] Tested locally (`pnpm dev` / relevant `pnpm test` suite)
- [ ] Touches `src/config.json` or any secret/credential path
- [ ] Touches the cross-repo CSP coupling with `resumeweb` (see [005](../specs/005-repo-hygiene-security-and-public-readiness/spec.md) research.md item 6 / `scripts/check-csp-drift.mjs`)
```

Verbatim the three items FR-014 names, cross-linked to spec 005's guardrail rather than
re-explaining it inline.

**Constitution check for this story**: Principle II — all tooling is free; GitHub
Actions' private-repo minutes are ample at this traffic. Principle IV — husky,
lint-staged, Prettier, and Dependabot are all standard, actively-maintained, boring
choices; no novel tooling introduced.

**Files touched**: `.github/workflows/ci.yml` (new), `.github/workflows/e2e.yml` (new —
Playwright config itself is User Story 2's scope, see below), `.github/dependabot.yml`
(new), `.github/pull_request_template.md` (new), `.husky/pre-commit` (new),
`.husky/pre-push` (new), `.prettierrc.json` (new), `.prettierignore` (new),
`eslint.config.mjs` (append `eslint-config-prettier`), `package.json` (4 new
devDependencies, `prepare`/`format`/`format:check` scripts, `lint-staged` block).

---

## User Story 2a — Vitest unit tests + React Testing Library component tests (FR-006, FR-007)

### 7. Vitest config approach

**Decision**: a standalone `vitest.config.ts`, not merged into the existing
`vite.config.ts` via `mergeConfig`.

**Rationale**: `vite.config.ts` wires `tailwindcss()` and `tanstackRouter()` plugins that
are irrelevant (and slower) for unit/component tests — the router plugin's only job is
generating `routeTree.gen.ts`, a build artifact already on disk that components just
import normally at test time. The standalone config keeps only `react()` (JSX transform)
plus the same `@` → `src` alias, and adds
`test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], globals: true }`.

**Alternatives considered**: `mergeConfig` wrapping the existing Vite config — rejected,
drags Tailwind's PostCSS pipeline into every test run for zero benefit.

### 8. DOM environment

**Decision**: `jsdom`.

**Rationale**: components under test use Radix UI (`DropdownMenu`, portal-based),
`motion/react` (Framer Motion) animations, and FontAwesome — jsdom has the more mature DOM
implementation (`getComputedStyle`, portal/focus behavior) this ecosystem's testing
guidance assumes.

**Alternatives considered**: `happy-dom` — faster, but rejected on compatibility risk with
Radix/portals and motion, not worth the marginal speed win at this test count.

New devDependencies: `vitest`, `jsdom`, `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`, `@vitest/coverage-v8`
(`@vitejs/plugin-react` is already present).

### 9. Test file location and coverage

**Decision**: colocated test files (`Component.test.tsx` next to `Component.tsx`,
`expenses.test.ts` next to `expenses.ts`) — mirrors the existing `*.stories.tsx`
colocation convention already used throughout `src/components/`. No new top-level
`tests/` directory. Coverage via `@vitest/coverage-v8` (Vitest's modern default provider,
no separate instrumentation step), reported but **not** gated on a threshold — per the
spec's own Assumptions, no fixed coverage % target is wanted for a solo-maintained app;
coverage output stays informational (`pnpm test -- --coverage`).

### 10. `src/db/queries/*.ts` unit-test strategy

**Decision**: test against a **real in-memory libsql database**, not mocked Drizzle
chains.

**Rationale**: all four files under `src/db/queries/` (`global.ts`, `expenses.ts`,
`summary.ts`, `travel.ts`) export query builders that compose Drizzle subqueries/joins/
`sql` templates (e.g. `getAccountsClosureQuery`, `fullTransactionsQuery`,
`getExpensesYearlyQuery`) — not pure functions. Mocking the chain API would either be
impractical (deeply nested chain calls) or would end up testing the mock instead of the
SQL. `@libsql/client` (already a runtime dependency, same engine as production Turso)
supports a `:memory:` URL natively, so these can run as real SQLite-execution tests: fast,
hermetic, no network. Concretely: add `out: "./drizzle"` to the existing
`src/drizzle.config.ts` (currently has none), run `drizzle-kit generate` once to produce a
checked-in migration SQL file from `schema.ts`/`views.ts`, then a test-only helper
(`src/test/db.ts`) creates a fresh in-memory client, applies that SQL, and seeds a handful
of fixture rows before each test file. Start with the 2–3 highest-value functions per
`docs/review/08-testing-infrastructure.md`'s phased plan: `getExpensesYearlyQuery`,
`getAccountsClosureQuery`, `getDomain` — assert shaped output against known fixture
totals. `src/db/utils.ts`'s `setAccountConfig`/`getConfig` (plain `Map`-backed) are also
in scope for FR-006 as trivial standalone-utility tests.

**Alternatives considered**: mocking `db.select().from()...` chains — rejected, too
brittle and doesn't verify actual SQL correctness, the highest-risk part of this code.
Reintroducing `better-sqlite3` — rejected, spec 005 just removed it as confirmed-dead;
libsql's own `:memory:` mode makes it unnecessary.

### 11. RTL component-test plan for the 4 named targets

**Decision**:

- **`TreeList`** (`src/components/TreeList.tsx`): pure, no router/auth context needed.
  Render with 2-level fixture data; assert child rows are absent until the parent
  `<button>` is clicked and present after (tests `TreeNode`'s `collapse` state via
  `AnimatePresence`); assert the leaf-row (no-children) branch renders `item.node`
  directly with no toggle button.
- **`AccountMenu`** (`src/components/AccountMenu.tsx`): needs a router context (`Link`,
  `useRouterState`) and the `auth` route-context (`useAuth` reads
  `useRouteContext({from: '__root__'})`, throws if unset). Build a minimal harness:
  `createMemoryHistory` + `createRouter` with a stub root route whose `context` supplies
  `{ auth: {...} }`, wrapped in `RouterProvider`. Two cases matching Acceptance Scenario
  2: authenticated → dropdown trigger with first-letter avatar renders, "Log Out" calls
  `signOut()`; unauthenticated → renders the "Log In" `Link` instead, no dropdown.
- **`SideBar`** collapse/expand (`src/components/SideBar.tsx`): a controlled, stateless
  component (`isCollapsed`/`toggleSidebar` props); the actual content-shift regression it
  guards is CSS-structural (`<aside className="fixed inset-y-0 left-0 ...">` never enters
  document flow regardless of width). jsdom has no real layout engine, so the regression
  guard asserts the `<aside>` always carries the `fixed` positioning class in both
  collapsed/expanded renders (structurally impossible for width changes to affect flow),
  plus behavioral assertions: clicking the toggle `<button>`
  (`aria-label="Open menu"/"Close menu"`) calls `toggleSidebar`, and `aria-expanded`
  matches `!isCollapsed`. Needs the same router harness as `AccountMenu`.
- **Analysis pagination**
  (`src/routes/analysis/-components/TransactsTable.tsx`, `@tanstack/react-table`'s
  `getPaginationRowModel`, default `pageSize: 8`): render with a fixture array > 8 rows;
  assert only `pageSize` rows show initially; click next-page, assert page-index text and
  rendered rows change; exercise the page-size `<select>` (10/20/30/40/50) and the
  "Go to page" number input.

### 12. Shared MSW handlers module

**Decision**: extract shared request handlers into `src/mocks/handlers.ts` +
`src/mocks/server.ts` (`setupServer(...handlers)` for Vitest/Node), and point
Storybook's existing browser worker (`msw-storybook-addon`, currently wired with ad hoc
inline handlers per story, e.g. `src/routes/login/-loginPage.stories.tsx`) at the same
`handlers.ts`, per Acceptance Scenario 4. None of the 4 named components above need MSW
directly today (no data fetching inside `TreeList`/`SideBar`; `AccountMenu` reads
context, not network) — this piece is forward-looking shared infra for future
`useQuery`-backed component tests (e.g. charts), not a blocker for the 4 named tests.

### 13. Vitest setup file

**Decision**: `src/test/setup.ts` registers `@testing-library/jest-dom` matchers, the
`vitest-axe` `toHaveNoViolations` matcher (see User Story 4 below — that research stream
owns the a11y assertions, this file just hosts the shared `expect.extend`), and the MSW
server lifecycle (`beforeAll(() => server.listen())` /
`afterEach(() => server.resetHandlers())` / `afterAll(() => server.close())`).

**Files touched**: `vitest.config.ts`, `src/test/setup.ts`, `src/test/db.ts`; new test
files `src/db/queries/*.test.ts`, `src/db/utils.test.ts`,
`src/components/TreeList.test.tsx`, `src/components/AccountMenu.test.tsx`,
`src/components/SideBar.test.tsx`,
`src/routes/analysis/-components/TransactsTable.test.tsx`; `src/mocks/handlers.ts`,
`src/mocks/server.ts` (plus a minor refactor of `.storybook/preview.tsx` and
`-loginPage.stories.tsx` to consume the shared handlers); `src/drizzle.config.ts` (add
`out`) and a new checked-in `drizzle/*.sql` migration; `package.json` (`"test"` script:
`vitest run`, new devDependencies).

---

## User Story 2b — Playwright e2e (FR-008, FR-009, Edge Case: CI credentials)

Key discovery that shapes this whole area: **guest login is not static-data-only**.
`useAuth.ts`'s `signInGuest()` just sets a local `idToken = 'guest'` — the actual Summary
data comes from `tursoService.ts` calling `POST /api/turso-token`, a real Vercel
serverless function that mints a Turso DB token server-side
(`src/db/utils.ts`, `api/turso-token.ts`). So "guest login → Summary renders with data"
needs the `api/` functions running with real `TURSO_*` secrets, not just a static `vite
preview` build. This is a deliberate divergence from Lighthouse CI, which stays on plain
`vite preview` (User Story 3) because it only needs a rendered shell for performance
timing, not real data.

Routes enumerated from `src/routes/`: `/home`, `/metadata`, `/summary`, `/expenses`,
`/travels`, `/investments`, `/analysis` (needs `search: { query: {} }`), plus `/login`
and `/` (redirects to `/home`). The login form (`src/routes/login/index.tsx`) has
`user`/`password` text inputs (placeholder-only, no `<label>` — User Story 4's fix, not
this one) and "Guest"/"Sign In" buttons. `SideBar.tsx`'s toggle is root-level state in
`__root.tsx`; the nav `<aside>` is `fixed` and only animates `width`, so content-shift
regression can be asserted via a stable content element's bounding box.

### 14. Browsers and viewport strategy

**Decision**: Chromium only for the primary suite, plus a second Playwright _project_
reusing Chromium at a 375px viewport for the mobile smoke test (not a separate real
mobile browser engine).

**Rationale**: this is a solo-maintained app with no evidence of browser-specific bugs
today; a full cross-browser matrix adds CI time and flakiness surface disproportionate to
project scale (Constitution Principle IV).

**Alternatives considered**: full WebKit+Firefox+Chromium matrix — rejected as
disproportionate.

### 15. `webServer` / data availability

**Decision**: Playwright's `webServer` runs `vercel dev --listen 3111 --yes` directly
(not `scripts/dev-with-api.sh`, which hard-requires a local `.env.local` file — in CI the
same env vars arrive as GitHub Actions secrets exported directly into the job
environment, so the script's file-existence check would wrongly fail). `baseURL:
http://localhost:3111`.

### 16. Scenario-to-file mapping (`e2e/` at repo root)

**Decision**:

- `e2e/guest-golden-path.spec.ts` — guest login → `/summary` renders with data (assert a
  populated KPI/chart element, not just "page loaded").
- `e2e/routes-smoke.spec.ts` — after guest login, visit every top-level route in one
  spec, asserting zero `error`-level `page.on('console', ...)` messages per route.
- `e2e/nav-stability.spec.ts` — toggle `SideBar` collapse/expand and assert a stable
  content element's (e.g. the page `<h1>`) bounding box `x`/`width` doesn't change.
- `e2e/mobile-smoke.spec.ts` — same route list, under a
  `{ viewport: { width: 375, height: 812 } }` project, asserting no horizontal overflow
  (`document.documentElement.scrollWidth <= 375`) and no console errors.
- `e2e/real-user-login.spec.ts` — logs in via the real Cognito form using
  `process.env.PLAYWRIGHT_TEST_USER_EMAIL`/`PLAYWRIGHT_TEST_USER_PASSWORD`, asserts
  `/summary` renders. **Must** be `test.skip(...)`-guarded until those secrets exist (see
  below) so it shows as "skipped," not "failed," in CI in the interim.

### 17. Real-user test-account provisioning

**Decision**: this is an **owner-side manual AWS Console task**, not something this
spec's code can create — Cognito user-pool administration isn't reachable from this
repo's CI. Concretely: the owner creates one Cognito user in the existing pool (e.g.
`playwright-test@<domain>`), sets a permanent password via the AWS Console or
`aws cognito-idp admin-set-user-password --permanent`, and confirms this account's Turso
account-GUID mapping (per spec 005's `accountConfig`/`ACCOUNT_CONFIG_*` pattern) points at
guest-equivalent or otherwise non-sensitive demo data — never the owner's real financial
data. Required GitHub Actions secrets: `PLAYWRIGHT_TEST_USER_EMAIL`,
`PLAYWRIGHT_TEST_USER_PASSWORD`. Until both exist, `real-user-login.spec.ts` self-skips.
This is tracked as a standing task in `docs/review/19-manual-verification.md`, per the
spec's own Assumptions — not a blocker for the rest of User Story 2.

### 18. CI execution

**Decision**: runs only on merge to `master` (FR-009), in `.github/workflows/e2e.yml`
(User Story 1's file), separate from the PR-gating suite.
`playwright install --with-deps chromium` only (matches the single-browser decision). No
browser-binary caching needed initially given the single-browser, merge-only (not
per-PR) cadence — revisit only if job duration becomes a problem. Needs
`TURSO_PLATFORM_TOKEN` (or whatever `api/turso-token.ts` requires per spec 005) plus,
once provisioned, the two `PLAYWRIGHT_TEST_USER_*` secrets.

**Files touched**: `playwright.config.ts` (new, repo root); `e2e/*.spec.ts` (5 new
files); `.github/workflows/e2e.yml` (env additions, owned by User Story 1);
`docs/review/19-manual-verification.md` (gains the Cognito test-account provisioning
task); `package.json` (`"test:e2e": "playwright test"` script, `@playwright/test`
devDependency).

---

## User Story 3 — Lighthouse CI + bundle-size budget (FR-010, FR-011)

`docs/review/06-performance.md` already recorded an owner decision (2026-08-10):
Lighthouse CI runs against a local `vite preview` build; the one-time baseline uses the
live Vercel deployment. No Lighthouse run or bundle snapshot has ever actually been
recorded in the repo. `vite.config.ts` has no `manualChunks` config; TanStack Router's
file-based routing produces the route-chunk split implicitly. Build output goes to
`dist/dashboard` (base path `/dashboard/`). A stale, gitignored local `dist/` build gives
directional-only current sizes (main chunk gzip ~316 KB; heaviest route chunk —
`CartesianChart`, recharts+d3 — gzip ~80 KB) but is **not authoritative**: real budgets
must come from a fresh `pnpm build` at implementation time, not this research pass.

### 19. Lighthouse CI configuration and budget methodology

**Decision**: add `@lhci/cli` as a devDependency with a checked-in `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm build && pnpm preview",
      "url": ["http://localhost:4173/dashboard/"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": "<baseline_score>" }],
        "categories:best-practices": ["error", { "minScore": "<baseline_score>" }],
        "categories:seo": ["warn", { "minScore": "<baseline_score>" }],
        "categories:accessibility": ["off", {}]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

The accessibility category is turned **off** in Lighthouse's own assertions — User Story
4 already gates a11y via `@axe-core/react`/`vitest-axe`, tools with more actionable
component-level violation detail; double-gating the same concern through two CI checks
with different thresholds risks contradictory signals for one real violation. Performance
and best-practices are the categories this story actually targets.

**Budget methodology (no numbers invented here — execute at implementation time)**: run
`pnpm build && pnpm preview`, then `npx lhci autorun --collect.numberOfRuns=3` once
locally to get a real score; set `minScore` to that measured score (or 0.03–0.05 below it
if already >0.95, to absorb normal run-to-run noise) — matching
`docs/review/06-performance.md`'s "budgets set slightly above baseline" framing.
`numberOfRuns: 3` (median-based) reduces flakiness at a proportionate CI-time cost.

**Alternatives considered**: running against a live Vercel preview URL per-PR — rejected,
the owner decision is explicit (local `vite preview` only: faster, deterministic, no
dependency on Vercel preview deploy timing). Asserting raw Core Web Vitals
(LCP/CLS/TBT) instead of category scores — rejected as the _primary_ gate (category
scores are coarser but more stable across `lhci` versions); can be layered in later as
`warn`-level assertions if finer signal is wanted. Gating Lighthouse's own accessibility
category too — rejected as redundant with axe-core/vitest-axe.

### 20. Bundle-size budget tool and methodology

**Decision**: `size-limit` + `@size-limit/file` (not `@size-limit/preset-app`, whose
heuristics assume different build-tool conventions than Vite's `dist/dashboard/assets/*`
layout) as devDependencies. Config in `package.json` under a `"size-limit"` key, two
entries only — the main entry chunk and the single heaviest route chunk (charts, per
`docs/review/06-performance.md`'s explicit call-out of Recharts+D3) — not every chunk,
matching the spec's Assumptions philosophy of a small number of high-signal checks over
exhaustive coverage:

```json
[
  {
    "name": "main bundle",
    "path": "dist/dashboard/assets/index-*.js",
    "gzip": true,
    "limit": "<measured>"
  },
  {
    "name": "chart route chunk",
    "path": "dist/dashboard/assets/CartesianChart-*.js",
    "gzip": true,
    "limit": "<measured>"
  }
]
```

New script: `"size": "size-limit"`.

**Budget methodology**: run `pnpm build` fresh at implementation time, read the actual
gzip byte sizes of the two target files, set `limit` to that measured value + ~10%
headroom — do not use the stale unverified `dist/` numbers gathered during this research
pass.

**Alternatives considered**: `bundlesize` — rejected, largely unmaintained vs.
`size-limit`'s active maintenance (Constitution Principle IV). `@size-limit/preset-app` —
rejected, its auto-detection heuristics are a worse fit than explicit glob paths for
Vite's output layout. Budgeting only the main chunk — rejected, the review doc's specific
finding was two charting libraries potentially loading eagerly together; the chart-chunk
entry is what would actually catch that regression class.

### 21. CI placement: PR-gating, not merge-only

**Decision**: both Lighthouse CI and `size-limit` run as **required checks on every PR**.
FR-009's PR-vs-merge split is scoped to the _test suite_ (unit/component vs. e2e)
specifically because e2e is slow (browser automation, multi-route crawl). A `vite
preview`-based Lighthouse run (3 iterations against one route) and a `size-limit` check
(reads existing build output, no browser) are both fast, non-flaky-by-design checks —
they belong in the same PR-gating job group as lint/typecheck/build/test, running after
`build`.

**Alternatives considered**: deferring to merge-to-master alongside Playwright —
rejected, these checks are fast (seconds) and directly prevent exactly the regression
class (bundle bloat, perf drop) a PR author needs to see before merging, not after.

New devDependencies: `@lhci/cli`, `size-limit`, `@size-limit/file`.

**Files touched**: `lighthouserc.json` (new); `package.json` (`"size-limit"` config key,
`"size"`/`"perf"` scripts, 3 new devDependencies); `.github/workflows/ci.yml` (two new
steps after `build`, owned by User Story 1).

---

## User Story 4 — Accessibility scanning + the 5 known issues (FR-012, FR-013)

`docs/review/07-accessibility.md`'s 5 items were all marked "not yet tested/measured/
confirmed" — despite spec.md calling them "manually-found," no prior manual verification
had actually happened. This research pass computed real WCAG contrast ratios (sRGB
relative-luminance formula) against the app's actual dark-theme render background
(`shark-900`, `#151719`, the background every interior component hardcodes regardless of
the `dark:` media query on `<body>`), and inspected the real component code for each
issue.

### 22. `@axe-core/react` dev wiring

**Decision**: import and initialize in `src/main.tsx`, guarded by `import.meta.env.DEV`,
before `ReactDOM.createRoot(...).render()`:

```ts
if (import.meta.env.DEV) {
  const { default: axe } = await import("@axe-core/react");
  axe(React, ReactDOM, 1000);
}
```

**Rationale**: the standard integration point (root render entry); dev-only guard means
zero production bundle cost.

**Alternatives considered**: per-route wiring — rejected, a single global scan at the
render root already covers every mounted screen.

### 23. `vitest-axe`

**Decision**: add the `toHaveNoViolations` matcher via `expect.extend(matchers)` in the
shared Vitest setup file (`src/test/setup.ts`, item 13 above), then add
`expect(await axe(container)).toHaveNoViolations()` assertions to the same component test
files User Story 2a is already writing for TreeList/AccountMenu/SideBar/Analysis-
pagination, plus new/existing tests for the login form and nav specifically (named
explicitly in User Story 4).

### 24. Fix — nav keyboard reachability (`src/components/SideBar.tsx`)

**Decision**: the toggle `<button>` and nav `<a>` links are already native focusable
elements — that's not the actual gap. The real gap: when `isCollapsed`,
`ItemLinkComponent` renders only the icon and removes the `<span>` holding the visible
text from the DOM entirely, leaving the link with **no accessible name** in collapsed
state. Fix: add `aria-label={isCollapsed ? text : undefined}` to the rendered `<a>` in
`ItemLinkComponent` — omitted when expanded so the visible text remains the accessible
name (WCAG 2.5.3, Label in Name).

### 25. Fix — `shark-400`/`shark-600` contrast

**Decision**: computed contrast against `shark-900` (`#151719`, L≈0.0084):

| Token                                                                       | Hex       | Ratio  | Result                         |
| --------------------------------------------------------------------------- | --------- | ------ | ------------------------------ |
| `shark-400` (Footer body text)                                              | `#4e575f` | 2.44:1 | fails AA (needs 4.5:1)         |
| `shark-600` (Footer separator dots)                                         | `#373d43` | 2.98:1 | fails                          |
| `shark-300` (inactive nav icon)                                             | `#5a646d` | 2.98:1 | fails 3:1 non-text minimum too |
| `shark-100` (inactive nav label)                                            | `#707d89` | 4.27:1 | fails by a hair                |
| `shark-50` (existing lightest token, already used e.g. login focus outline) | `#778490` | 4.70:1 | **passes**                     |

Fix: swap usage sites only, no new token, no shared-palette value change — this is
explicitly what the spec's Edge Case requires (spec 007 also depends on the `shark-*`
tokens, so this must not touch them):

- `src/components/Footer.tsx`: `text-shark-400` → `text-shark-50`; both
  `text-shark-600` separator spans → `text-shark-50`.
- `src/components/SideBar.tsx`: inactive-icon class `text-shark-300` → `text-shark-50`;
  inactive-label class `text-shark-100` → `text-shark-50`.

**Alternatives considered**: introducing a new `shark-50-alt` token or editing the
`shark-*` scale's actual values — rejected, unnecessary (an existing token already
passes) and would risk the exact cross-spec collision the Edge Case warns about.

### 26. Fix — chart hover-only interactions

**Decision**: Recharts 3.6 (already the pinned version) ships an `accessibilityLayer`
prop on top-level chart components that makes the chart container keyboard-focusable and
lets arrow keys move a virtual cursor between data points, triggering the same
`<Tooltip>` that today only fires on mouse hover. Fix: add `accessibilityLayer` to every
top-level `Recharts*Chart` element — `src/components/charts/BarPlot.tsx`'s
`RechartsBarChart`, and each chart wrapper under `src/routes/summary/-plots/*.tsx`,
`src/routes/travels/-components/*.tsx`, `src/routes/analysis/-components/
TransactsPlot.tsx`. Exact prop name/default should be confirmed against the installed
recharts 3.6 changelog at implementation time — not runnable from this research pass.

**Alternatives considered**: bespoke keyboard handlers per chart — rejected, more code
than Recharts' own primitive, and less "boring/well-supported" (Constitution Principle
IV).

### 27. Fix — login form labeling (`src/routes/login/index.tsx`)

**Decision**: inputs `#user`/`#password` are placeholder-only, confirmed. Fix: add
visually-hidden (`sr-only`) `<label htmlFor="user">Email</label>` /
`<label htmlFor="password">Password</label>` immediately before each input — preserves
the current placeholder-driven visual design exactly while giving screen readers/password
managers a real associated label.

**Alternatives considered**: `aria-label` on the input directly — rejected as the weaker
convention for form fields; a real (even visually-hidden) `<label>` plays better with
autofill heuristics.

### 28. Fix — post-navigation focus (`src/routes/__root.tsx`)

**Decision**: add `tabIndex={-1}` plus a `ref` to the existing `<main>` landmark in
`RootComponent`, and in the existing `useEffect(() => { setCollapse(true) }, [selected])`
(or a sibling effect on the same `selected` dependency) call
`mainRef.current?.focus({ preventScroll: true })`.

**Rationale**: focusing the shared `<main>` landmark on every route change is a one-file
fix at the root, versus requiring every route to expose/ref its own page heading — avoids
scope creep into every route file for a spec whose primary focus is automation
infrastructure, not a UX redesign.

**Alternatives considered**: per-route heading refs — more "correct" in the abstract but
multiplies touched files for no meaningful UX gain in a single-main-content-area app like
this one.

**Files touched**: `src/main.tsx` (axe-core/react dev wiring); `src/components/
SideBar.tsx` (collapsed `aria-label`; inactive icon/label color swap); `src/components/
Footer.tsx` (muted-text color swap); `src/routes/login/index.tsx` (sr-only labels);
`src/routes/__root.tsx` (main-landmark focus-on-navigate); `src/components/charts/
BarPlot.tsx` + `src/routes/summary/-plots/*.tsx` + `src/routes/travels/-components/
*.tsx` + `src/routes/analysis/-components/TransactsPlot.tsx` (`accessibilityLayer`
prop); `package.json` (new devDependencies `@axe-core/react`, `vitest-axe`); the shared
Vitest setup file (item 13, gains the `vitest-axe` matcher extension only).
