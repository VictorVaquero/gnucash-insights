# Phase 1 Data Model: Developer Automation & Quality Gates

This spec introduces no application persistent-storage entities (no new database tables/
columns — see `plan.md`'s Technical Context, Storage). What it does introduce is a set of
**tooling/config shapes** that CI, git hooks, and the test suites depend on. Documented
here instead of a traditional entity-relationship model, one entity per config surface
this spec adds or changes.

## 1. `lint-staged` config (`package.json`)

```ts
type LintStagedConfig = Record<string, string[]>;
```

**Shape** (`research.md` item 2):

```json
{
  "*.{ts,tsx,js,mjs}": ["eslint --fix", "prettier --write"],
  "*.{json,css,md}": ["prettier --write"]
}
```

**Validation rules**: every glob key must map to a non-empty command array; commands run
in array order per file group. No dynamic generation — this is a static, checked-in
config, reviewable in a PR diff like any other source change.

**Consumers**: `.husky/pre-commit` (`pnpm exec lint-staged`).

## 2. `AccessibleFixture` — in-memory libsql test database

Not an application entity — a **test-only** database used exclusively by
`src/db/queries/*.test.ts` (`research.md` item 10), created fresh per test file.

```ts
type TestDbHandle = {
  client: Client; // @libsql/client, url: ":memory:"
  db: LibSQLDatabase; // drizzle-orm/libsql wrapping `client`
};
```

**Lifecycle**:

1. `src/test/db.ts` creates a `:memory:` client.
2. Applies the checked-in migration SQL under `drizzle/` (generated once via
   `drizzle-kit generate` against `src/db/schema.ts`/`views.ts`, per `research.md` item
   10 — the same DDL that defines production Turso's schema).
3. Seeds a small, fixed set of fixture rows (a handful of accounts/transactions/time
   rows) via plain Drizzle inserts.
4. Each test file gets a fresh instance (no shared state between test files) — created
   in a `beforeEach`/`beforeAll` local to that file, not a global singleton.

**Validation rules**: fixture data must be synthetic (no real account GUIDs or amounts —
this file lives in the repo and, per spec 005, the repo may go public). Fixture totals
must be hand-computed and asserted against exactly, so a test failure means the query
logic changed, not that the fixture "looks about right."

## 3. `lighthouserc.json` (Lighthouse CI config)

```ts
type LighthouseCiConfig = {
  ci: {
    collect: { startServerCommand: string; url: string[]; numberOfRuns: number };
    assert: { assertions: Record<string, ["error" | "warn" | "off", { minScore?: number }]> };
    upload: { target: string };
  };
};
```

**Shape** (`research.md` item 19) — `categories:performance` and
`categories:best-practices` asserted at `"error"` with a `minScore` measured from a real
`pnpm build && pnpm preview` run at implementation time; `categories:seo` at `"warn"`;
`categories:accessibility` explicitly `"off"` (owned instead by `vitest-axe`/
`@axe-core/react`, avoiding two CI checks gating the same concern with different
thresholds).

**Validation rules**: `minScore` values MUST be derived from an actual measured run, not
invented — this is the one config in this spec where a wrong/fabricated number would
silently make the gate meaningless (it would always pass, defeating SC-004). The task
that authors this file must run the measurement first and record the raw score it
observed (e.g. as a code comment or in the PR description) so the number is traceable.

## 4. `size-limit` config (`package.json`)

```ts
type SizeLimitConfig = Array<{ name: string; path: string; gzip: boolean; limit: string }>;
```

**Shape** (`research.md` item 20) — exactly two entries: the main entry chunk
(`dist/dashboard/assets/index-*.js`) and the heaviest route chunk
(`dist/dashboard/assets/CartesianChart-*.js`, the recharts+d3-heavy chart bundle
specifically called out in `docs/review/06-performance.md`), both `gzip: true`.

**Validation rules**: same measured-not-invented rule as item 3 — `limit` values come
from a real `pnpm build` at implementation time, set to the measured gzip size + ~10%
headroom.

## 5. `dependabot.yml` config

```ts
type DependabotConfig = {
  version: 2;
  updates: Array<{
    "package-ecosystem": "npm" | "github-actions";
    directory: string;
    schedule: { interval: "weekly" };
    groups?: Record<string, { "update-types": string[] }>;
    "open-pull-requests-limit"?: number;
  }>;
};
```

**Shape** (`research.md` item 5): `npm` ecosystem (covers `pnpm-lock.yaml`) with a
`minor-and-patch` group capping routine-bump PR volume, plus a `github-actions` ecosystem
entry for the new workflow files' pinned action versions.

**Validation rules**: standard Dependabot YAML schema (validated by GitHub itself on
push — no local validation tooling needed).

## 6. Playwright test-account credentials (external, not committed)

```ts
type PlaywrightTestCredentials = {
  PLAYWRIGHT_TEST_USER_EMAIL: string;
  PLAYWRIGHT_TEST_USER_PASSWORD: string;
};
```

**Source**: GitHub Actions repository secrets, never committed, never present in any
source file (`research.md` item 17). The account itself is a dedicated Cognito user the
owner provisions manually — out of band from this spec's code.

**Validation rules**: `e2e/real-user-login.spec.ts` MUST check for the presence of both
env vars at runtime and call `test.skip(...)` if either is missing, so the suite reports
"skipped" rather than "failed" until the owner completes provisioning. No fallback to a
hardcoded credential is permitted (Constitution Principle V).

## 7. `AccountConfig`-adjacent test fixtures (MSW handlers)

```ts
// src/mocks/handlers.ts
type MockHandlers = HttpHandler[]; // msw's http.get/post(...) handler array
```

**Shape**: a single exported array of MSW request handlers, covering the same endpoints
Storybook stories currently mock ad hoc (`research.md` item 12) — at minimum
`POST /api/turso-token` returning a synthetic `{ url, token, expiresAt, accountConfig }`
shape (matching spec 005's `AccountConfig` contract amendment) with obviously-fake values.

**Consumers**: `src/mocks/server.ts` (`setupServer(...handlers)`, used by
`src/test/setup.ts` for Vitest) and `.storybook/preview.tsx`'s existing
`msw-storybook-addon` worker (refactored to import the same array instead of its current
inline per-story handlers).

**Validation rules**: handler response bodies must never contain real account GUIDs or
amounts, for the same public-repo reason as item 2.
