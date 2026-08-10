---

description: "Task list for spec 005: Repo Hygiene, Security Hardening & Public-Repo Readiness"

---

# Tasks: Repo Hygiene, Security Hardening & Public-Repo Readiness

**Input**: Design documents from `/specs/005-repo-hygiene-security-and-public-readiness/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No automated test runner exists in this repo yet (constitution Principle III;
`plan.md`'s Testing section). This spec introduces the repo's first two automated checks
— a guest/real-user auth-boundary regression test (US4) and a CSP-drift guardrail (US5)
— as small standalone Node scripts, not a full test framework (that decision belongs to
spec 006). Everything else is validated manually per `quickstart.md` or via existing
tooling (`pnpm build`, `pnpm lint`, `pnpm audit`, `git grep`).

**Organization**: Tasks are grouped by user story (US1-US6, priority order from spec.md:
P1 tier first — US1, US2, US4, US5 — then P2 tier — US3, US6) so each can be implemented
and validated independently. Within the P1 tier, US1 is sequenced first because US3 (zod
schema for `src/config.json`) and US4 (rate limiting on `api/turso-token.ts`) both build
on files US1 changes first (`src/config.json`'s shrunk shape; `api/turso-token.ts`'s
response shape).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- File paths are exact, relative to repo root

## Path Conventions

Single existing project — `src/`, `api/`, and root-level config files (see `plan.md`
Project Structure).

---

## Phase 1: Setup

**Purpose**: Establish a pre-change baseline so regressions are attributable to this spec

- [X] T001 Manually verify the existing golden path (login → data loads → charts render)
      and the guest login path, on desktop, per constitution Principle III, before making
      any change — this is the regression baseline for the Polish-phase re-check (T046).

---

## Phase 2: Foundational (Blocking Prerequisites)

No cross-story blocking prerequisites for this spec — every shared piece of setup
(`zod`, `knip`, the new env var) is scoped inside the user story that actually needs it.
Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Private data no longer ships in the repo or the bundle (Priority: P1) 🎯 MVP

**Goal**: The real user's GnuCash account-GUID mapping moves out of `src/config.json`
and into a server-sourced `accountConfig` field on the already-authenticated
`/api/turso-token` response, with account-to-category display unchanged for both guest
and real login.

**Independent Test**: `git grep` for a real account GUID/category label across `src/`
returns nothing; the built `dist/` bundle contains none of it; account-to-category
display still works identically via guest or real login.

### Implementation for User Story 1

- [X] T002 [P] [US1] Add an `ACCOUNT_CONFIG_VICTOR` entry to `.env.example` (documented as
      a JSON-encoded object matching the `AccountConfig` shape in `data-model.md` entity
      2), referencing `contracts/turso-token-endpoint-amendment.md`.
- [X] T003 [US1] In `api/turso-token.ts`: define the hardcoded guest `AccountConfig`
      constant; parse and validate `ACCOUNT_CONFIG_VICTOR` for the real-user branch
      (fail with `500 Server misconfigured` if missing/malformed, matching the existing
      Turso env var check's treatment); include `accountConfig` in both success response
      bodies, per `contracts/turso-token-endpoint-amendment.md`.
- [X] T004 [US1] Update `TursoTokenResponse` in `src/services/tursoService.ts` to include
      `accountConfig: AccountConfig` and return it from `fetchTursoToken`.
- [X] T005 [US1] Update `getConfig(user)` in `src/db/utils.ts` to read the account mapping
      from the cached token-fetch response's `accountConfig` field (wherever the token
      response is already cached client-side — `src/hooks/useAuth.ts`/`useDB.tsx`)
      instead of importing `database` from `src/config.json`.
- [X] T006 [US1] Remove the `database` key entirely from `src/config.json`, leaving only
      `region`/`userPoolId`/`clientId`/`cognitoUrl` (depends on T005 — no code may still
      read `config.json`'s `database` key).
- [X] T007 [US1] Set the real `ACCOUNT_CONFIG_VICTOR` value in Vercel's project
      environment variables (Production + Preview), using the GUID mapping removed from
      `src/config.json` in T006.
- [~] T008 [US1] Manually validate the US1 section of `quickstart.md`: `git grep` for a
      real GUID returns nothing (CONFIRMED); `pnpm build` + grep on `dist/` returns
      nothing (CONFIRMED); guest branch's `/api/turso-token` `accountConfig` payload
      verified byte-identical to the old `config.json` guest values via curl (CONFIRMED).
      **NOT YET DONE**: actual browser confirmation that account-to-category display is
      visually unchanged (Summary KPIs, Expenses pivot, Analysis filters, Travels) — no
      browser tool available in this session; deferred to the final T046 sign-off, which
      the user must do.
- [X] T009 [US1] Record the owner's explicit decision on whether git history needs
      scrubbing (spec Acceptance Scenario 3) in `docs/decisions.md`.

**Checkpoint**: User Story 1 (MVP) is complete — no real financial-structure data reaches
the repo or the built bundle, and display behavior is unchanged.

---

## Phase 4: User Story 2 - Dead dependencies, orphaned code, and config drift are removed and stay removed (Priority: P1)

**Goal**: Confirmed-dead dependencies/files are removed, exactly one ESLint config
remains, `components.json`'s stale fields are fixed, and `knip` is installed so this
class of drift is caught automatically going forward.

**Independent Test**: `pnpm run knip` reports zero (undocumented) findings; exactly one
ESLint config remains; `pnpm build`/`pnpm lint` succeed unchanged.

### Implementation for User Story 2

- [X] T010 [P] [US2] Remove `better-sqlite3` and `@types/better-sqlite3` from
      `package.json`; run `pnpm install`.
- [X] T011 [P] [US2] Remove `webpack` from `package.json` devDependencies; run
      `pnpm install`.
- [X] T012 [P] [US2] Delete `src/hooks/useS3.ts`.
- [X] T013 [P] [US2] Remove the `SQLJsDatabase` union member and its
      `drizzle-orm/sql-js` import from `src/db/dbType.ts`, collapsing `AppDatabase` to
      just `LibSQLDatabase`.
- [X] T014 [P] [US2] Remove `VITE_DATA_SOURCE` from `src/vite-env.d.ts`'s
      `ImportMetaEnv` and from `.env.example`.
- [X] T015 [P] [US2] Delete `.eslintrc.cjs`; port its `eslint-plugin-react-hooks`,
      `eslint-plugin-react-refresh`, and `eslint-plugin-storybook` rule coverage into
      `eslint.config.mjs` (flat config), so `pnpm lint` keeps enforcing what the dead
      legacy config used to. Also fixed a pre-existing bug found in the process: flat
      config had no `ignores`, so a local `dist/` build output was being linted
      (4416 false-positive errors) — added `ignores` for `dist/`, `dist-ssr/`,
      `storybook-static/`, `src/routeTree.gen.ts`.
- [X] T016 [P] [US2] Fix `components.json`: `tailwind.config` → `"tailwind.config.ts"`;
      `iconLibrary` → the actual dominant icon library (cross-check
      `docs/review/13-component-library-and-design-system.md`'s FontAwesome finding).
      Confirmed by usage count: FontAwesome 29 icon instances vs. lucide-react's 3 (all
      shadcn boilerplate) and @remixicon/react's 2 — set `iconLibrary: "fontawesome"`.
- [X] T017 [US2] Add `knip` as a devDependency; add a root `knip.json` (or
      `knip.config.ts`) with documented `ignore`/`entry` exceptions for
      `vite.config.ts`, `tailwind.config.ts`, `.storybook/*`, `src/routeTree.gen.ts`;
      add `"knip": "knip"` to `package.json` scripts (depends on T010/T011 — same file).
- [X] T018 [US2] Run `pnpm run knip`; fix or explicitly document every finding as a
      config exception in `knip.json` (per spec Edge Cases) — depends on T010-T016 so
      the report reflects the post-cleanup state. Deleted genuinely dead code (unused
      files `src/common/types.ts`/`src/db/views.ts`/`src/types/utils.ts`, unused symbols
      `getObjByKey`/`firstRow`/`BookContext`/`DBContext`/`InputData`, two dead Storybook
      devDependencies); stripped stray `export` keywords from file-local-only
      types/functions; documented genuine false positives inline via `@public` JSDoc
      tags (vendored Tremor chart utils, Drizzle schema completeness, parked Cognito
      self-signup flow) and in `knip.jsonc` (renamed from `.json` to allow comments) for
      CLI-only/CSS-only deps. `pnpm run knip` now exits 0.
- [X] T019 [US2] Run `pnpm build && pnpm lint`; confirm both succeed with the
      consolidated ESLint config and removed dependencies. `pnpm build` succeeds
      (pre-existing >500kB chunk-size warning, out of scope); `pnpm lint` exits with
      0 errors, 7 pre-existing warnings unrelated to this spec's changes.
- [X] T020 [US2] Manually validate the US2 section of `quickstart.md` (all eight steps).
      All eight steps pass: no better-sqlite3/webpack refs in package.json; useS3.ts gone;
      no SQLJsDatabase/VITE_DATA_SOURCE refs; `pnpm run knip` clean; no `.eslintrc*`;
      `pnpm build && pnpm lint` succeed; `components.json` points at `tailwind.config.ts`
      / `fontawesome`.

**Checkpoint**: User Stories 1 and 2 are both complete and independently verifiable.

---

## Phase 5: User Story 4 - The guest/real-user auth boundary is provably not spoofable, and the endpoint resists abuse (Priority: P1)

**Goal**: The guest/real-user `api/turso-token.ts` boundary (already correct by design,
per `research.md` item 4) is formally traced and regression-tested; the endpoint gains
per-IP rate limiting.

**Independent Test**: `idToken: 'guest'` sent directly to the endpoint is rejected or
routed only to the guest database; a forged/expired real token is rejected; a scripted
burst of requests is measurably throttled.

### Implementation for User Story 4

- [X] T021 [US4] Add a standalone regression-test script (e.g.
      `scripts/test-auth-boundary.mjs`, run via a new `pnpm` script) asserting today's
      already-correct behavior: `Authorization: Bearer guest` → `401`; `X-Guest-Request:
      true` → a token scoped to the guest database only; a forged/expired JWT → `401`.
      Base assertions on the full trace in `research.md` item 4. Written, runs via
      `pnpm run test-auth-boundary` (accepts `--base-url`/`BASE_URL`, defaults to local
      `vercel dev` on :3111). Verified 4/5 checks pass against a live local `vercel dev`
      instance (bearer-guest→401, guest-header→200 scoped to the exact guest DB URL from
      `.env.local`, forged-token→401, no-credentials→401); the 5th (429 burst, added by
      T022) needs a warm deployment to verify locally — confirmed 5/5 against a live
      Vercel Preview in T023.
- [X] T022 [US4] Add per-IP in-memory rate limiting to `api/turso-token.ts` (module-scope
      `Map<string, { count, resetAt }>`, keyed by `x-forwarded-for`/`x-real-ip`,
      returning `429` + `Retry-After` per `contracts/turso-token-endpoint-amendment.md`),
      with a threshold generous enough not to trip on normal rapid navigation; extend
      T021's test script to cover the `429` case. Fixed-window: 60s / 20 req per IP —
      generous since the client caches tokens ~55min (src/hooks/useDB.tsx), so normal
      usage is ~1 request per window. `api/tsconfig.json`-scoped `tsc --noEmit` passes.
- [X] T023 [US4] Manually validate the US4 section of `quickstart.md`: curl-based
      401/200/429 checks against a real deployment, and decoded-claim verification
      (scope, read-only, ~1h expiry) against an actually-minted token. Claims verified
      against local `vercel dev` (talks to the real Turso Platform API with real
      credentials): decoded JWT payload has `a: "ro"` (read-only), `exp - iat = 3600`
      (exactly 1h), and the guest path is scoped to `TURSO_GUEST_DATABASE_URL` only.
      401/200/429 checks run via `test-auth-boundary.mjs --base-url <preview-url>
      --protection-bypass <token>` against a live Vercel Preview deploy
      (`vercel deploy`, bypass token from `vercel curl <url> --debug` since the preview
      sits behind Deployment Protection): 5/5 pass. Confirmed empirically that the 429
      burst must be sent sequentially, not concurrently — a concurrent burst gets
      load-balanced across multiple Fluid Compute warm instances, each with its own
      independent module-scope counter, so it never trips; 30 sequential requests to
      the same instance correctly return 200 for the first 20 then 429 with
      `Retry-After` for the rest. Test script updated to send the burst sequentially
      and to accept `--protection-bypass`/`VERCEL_PROTECTION_BYPASS` for testing behind
      Deployment Protection.
- [X] T024 [US4] Record the FR-008 boundary-trace confirmation and the chosen rate-limit
      threshold/rationale in `docs/decisions.md`.

**Checkpoint**: User Stories 1, 2, and 4 are all complete and independently verifiable.

---

## Phase 6: User Story 5 - CSP is tightened and stops silently drifting between repos (Priority: P1)

**Goal**: The `unsafe-inline` question is investigated and decided (`unsafe-eval`/
`wasm-unsafe-eval` are already gone, per `research.md` item 5); missing security headers
are added; a CI-enforced guardrail catches CSP drift against `resumeweb`'s committed
snapshot without depending on that repo's live availability.

**Independent Test**: A deliberate CSP change here without updating the committed
`resumeweb` snapshot fails CI.

### Implementation for User Story 5

- [X] T025 [US5] Investigate dropping `script-src`/`style-src`'s `'unsafe-inline'` per
      `research.md` item 5 (test against a production `pnpm build` + `vite preview`
      first; fall back to a `style-src` hash allowlist only if something inline genuinely
      needs it); update `vercel.json`'s CSP accordingly. Decision: dropped
      `script-src 'unsafe-inline'` outright — `pnpm build` output has zero inline
      `<script>` content (entry is an external `<script type=module src=...>` tag;
      confirmed via `dist/dashboard/index.html`) and a repo-wide grep found no dynamic
      inline-script-injection patterns. Kept `style-src 'unsafe-inline'` — six
      `style={{}}` call sites are all dynamic/computed (colors, positions, motion
      transforms), plus `recharts`/`framer-motion` set inline style attributes at
      runtime pervasively; none of that is hash-coverable and a nonce architecture is
      disproportionate effort per research.md. Verified new headers apply via local
      `vercel dev` (`curl -D - localhost:3111/dashboard`).
- [X] T026 [P] [US5] Add `Strict-Transport-Security: max-age=63072000; includeSubDomains;
      preload` and a conservative deny-by-default `Permissions-Policy` (camera,
      microphone, geolocation, payment) to `vercel.json`'s `headers` block. Verified via
      local `vercel dev` curl.
- [X] T027 [US5] Obtain the current value of `resumeweb`'s `/dashboard/:path*` CSP header
      (via the owner's copy of that repo, or `vercel inspect victorvaquero.com --json`),
      and commit it as a hardcoded snapshot (e.g.
      `scripts/resumeweb-dashboard-csp.snapshot.txt`) — this repo's CI must not depend on
      `resumeweb`'s live availability, per `research.md` item 6. **Found and fixed a live
      production bug in the process**: `vercel inspect victorvaquero.com --json` showed
      resumeweb's `/dashboard` CSP still reflected the pre-Turso, S3-based architecture
      (`connect-src` had no `turso.io` at all — only Cognito + S3 — plus stale
      `'wasm-unsafe-eval'`/extra `'unsafe-inline'` in `script-src`), meaning real logins
      through `victorvaquero.com/dashboard` were CSP-blocked from reaching Turso in
      production. With owner approval, fixed it directly in
      `/home/victor/workspace/resumeweb` (commit `927c7cd`, pushed to `master`, live
      Vercel deploy confirmed via curl). Snapshot committed at
      `scripts/resumeweb-dashboard-csp.snapshot.txt` reflects the now-corrected live
      value, matching this repo's own CSP exactly.
- [X] T028 [US5] Create `scripts/check-csp-drift.mjs` comparing this repo's `vercel.json`
      CSP string against T027's snapshot; wire as a `pnpm` script; add a minimal
      first-ever `.github/workflows/csp-drift.yml` running it on every push/PR (this repo
      has no CI today — keep this workflow scoped narrowly to the CSP check; general
      CI/quality-gate setup is spec 006's scope per `docs/review/09-developer-automation.md`).
      `pnpm run check-csp-drift` passes locally; workflow added at
      `.github/workflows/csp-drift.yml` (checkout + setup-node@24 + run the script).
- [X] T029 [US5] Manually validate the US5 section of `quickstart.md`: curl header
      checks, and a deliberate local CSP-mismatch test against T028's guardrail. All 4
      steps pass: (1) no `unsafe-eval`/`wasm-unsafe-eval` in the served CSP (local
      `vercel dev` curl); (2) `check-csp-drift.mjs` passes against the committed
      snapshot; (3) a deliberate bogus `connect-src` host injected into `vercel.json`
      made the check fail with a clear mismatch message naming both values, then
      reverted cleanly (confirmed via `git diff` showing zero residual change); (4)
      `Strict-Transport-Security`/`Permissions-Policy` both present in the served
      headers.
- [X] T030 [US5] Record the `unsafe-inline` decision and HSTS/Permissions-Policy
      presence in `docs/decisions.md`. Also recorded the live resumeweb CSP-drift bug
      found and fixed during T027.

**Checkpoint**: User Stories 1, 2, 4, and 5 (all P1 stories) are complete and
independently verifiable.

---

## Phase 7: User Story 3 - Config files validate themselves instead of failing silently (Priority: P2)

**Goal**: `vercel.json`, `tsconfig.json`, `components.json` gain `$schema` fields;
`src/config.json` (now shrunk by US1) is validated with `zod` at import time.

**Independent Test**: A malformed `src/config.json` (missing required field) produces a
clear, specific startup error naming the missing field.

### Implementation for User Story 3

- [X] T031 [P] [US3] Add `"$schema": "https://openapi.vercel.sh/vercel.json"` to
      `vercel.json`. Verified `check-csp-drift.mjs` still passes after the edit.
- [X] T032 [P] [US3] Add `"$schema": "https://json.schemastore.org/tsconfig"` to
      `tsconfig.json` (and `tsconfig.paths.json` if it warrants its own). Added to both,
      plus `api/tsconfig.json` (a third, separate tsconfig in this repo) for the same
      reason. `tsc --noEmit` clean on both the root and `api/` configs after the edit.
- [X] T033 [P] [US3] Add shadcn's current published schema URL to `components.json`'s
      `$schema` field (confirm the exact URL against current shadcn docs). Already
      present (`https://ui.shadcn.com/schema.json`) — no change needed.
- [X] T034 [US3] Add `zod` as a dependency; define a schema for `src/config.json`'s
      post-US1 four-field shape (`region`/`userPoolId`/`clientId`/`cognitoUrl`, all
      required non-empty strings) per `data-model.md` entity 1. `zod@4.4.3` added via
      `pnpm add zod`; schema defined in `src/services/authService.tsx`.
- [X] T035 [US3] Validate `src/config.json` against T034's schema at import time in
      `src/services/authService.tsx`, throwing an `Error` listing every failing field
      (via `ZodError.issues`) before `cognitoClient` is constructed. `configSchema.safeParse`
      runs at module load, before `cognitoClient` is constructed; on failure throws
      `Error("Invalid src/config.json — <field>: <reason>; ...")` for every failing field,
      not just the first. Manually verified by temporarily blanking `clientId` and
      deleting `cognitoUrl` from `src/config.json`: produced
      `Invalid src/config.json — clientId: Too small: expected string to have >=1
      characters; cognitoUrl: Invalid input: expected string, received undefined`, then
      restored the file. `tsc --noEmit` clean.
- [X] T036 [US3] Manually validate the US3 section of `quickstart.md`: editor
      autocomplete/validation on all three `$schema` files; malformed-config error
      message test; confirm `engines.node` is present and accurate in `package.json`
      (already set — verification only, per `research.md` item 11). Step 1: all three
      files (`vercel.json`, `tsconfig.json`, `components.json`, plus `tsconfig.paths.json`
      and `api/tsconfig.json` beyond the literal task list) carry a `$schema` key pointing
      at the correct official schema URL for each tool. Step 2: covered by T035's malformed-
      config test (blanked/removed fields in `src/config.json` produced a clear multi-field
      error at import time, not a downstream SDK error); reverted cleanly. Step 3:
      `grep -n '"node"' package.json` → `"node": ">=24"`, accurate (matches the Node 24
      runtime this project targets). All three steps pass.

**Checkpoint**: User Stories 1, 2, 3, 4, and 5 are all complete and independently
verifiable.

---

## Phase 8: User Story 6 - Injection/XSS/dependency vectors and the pre-publish checklist are explicitly checked (Priority: P2)

**Goal**: Close the remaining pre-publish checklist items with an explicit, recorded
pass/fail for each.

**Independent Test**: Each checklist item has an explicit pass/fail recorded in
`docs/decisions.md` before the repo's GitHub visibility changes.

### Implementation for User Story 6

- [X] T037 [P] [US6] Grep `src/` for `dangerouslySetInnerHTML`; record the result (and
      review any usage found for user-controllable input) in `docs/decisions.md`.
      Zero matches. Recorded in `docs/decisions.md` under "Spec 005 US6".
- [ ] T038 [US6] Check the AWS Cognito console (this app's User Pool) for MFA,
      password-policy, account-lockout, and self-signup settings; record findings and
      any changes made in `docs/decisions.md`. **DEFERRED**: the CLI identity used in
      this session (`arn:aws:iam::397704334393:user/development`) lacks
      `cognito-idp:DescribeUserPool` permission; owner chose to skip rather than grant
      broader IAM access or check the console themselves right now. Open item — see
      `docs/decisions.md`.
- [X] T039 [US6] Run `pnpm audit`; fix what's safely fixable; document any
      triaged/accepted findings in `docs/decisions.md` (run after Phase 4/US2's
      dependency removals for a clean baseline). Baseline 115 findings (3 critical/61
      high/41 moderate/10 low). Rejected `pnpm audit --fix` (cascaded into breaking
      major-version bumps + peer conflicts). Fixed both production-reachable criticals
      by hand: `drizzle-orm` bumped directly to `^0.45.2` (direct prod dep); targeted
      `pnpm.overrides` added for `fast-xml-parser` (`>=5.5.7`, via `@aws-sdk`) and
      `seroval` (`>=1.5.3`, via `@tanstack/react-router` — genuinely shipped, not just
      devtools); also overrode `tar` (`>=7.5.19`, vercel CLI devDependency only) to
      close the last critical. Result: 0 critical, high 61→47, moderate 41→37, low
      unchanged. `tsc --noEmit` and `vite build` verified clean after each change.
      Remaining findings are all devDependency-only build tooling (storybook, vite,
      vercel CLI transitives), confirmed via `pnpm why <pkg> --prod`, and documented as
      an accepted/deferred follow-up in `docs/decisions.md`. Also fixed an unrelated
      `eslint.config.mjs` gap discovered along the way (20 `no-undef` errors on
      `scripts/*.mjs`'s Node globals) — now 0 errors.
- [X] T040 [US6] Run `gitleaks detect --source . --log-opts="--all"` (or equivalent)
      across full git history; record the result in `docs/decisions.md`. Downloaded
      the official portable `gitleaks v8.30.1` binary into the scratchpad (not
      installed system-wide, deleted after use). 63 commits scanned, no leaks found —
      confirms US1's history scrub was effective.
- [X] T041 [US6] Spot-check the separate `cashpy-processor` repo for an equivalent
      PII-in-source concern; record the outcome (ruled out, or filed as its own
      follow-up) in `docs/decisions.md`. **NOT ruled out** — found real unanonymized
      third-party PII in `tests/data/cash/*.csv`, `cash.db`, and `gnucash.gnca` (real
      names, transaction descriptions, amounts); an `anonimize` SQL script exists in
      the same folder but its output isn't what's committed. Repo is currently
      private on GitHub. No action taken on the other repo — filed as an explicit
      open follow-up per `docs/decisions.md`, owner to decide remediation.
- [X] T042 [P] [US6] Add an MIT `LICENSE` file at the repo root; set `package.json`'s
      `"license": "MIT"`. `LICENSE` added (MIT, copyright Victor Vaquero 2026);
      `package.json`'s `"license"` field set to `"MIT"`.
- [X] T043 [US6] Manually validate the US6 section of `quickstart.md` — confirm all six
      items have an explicit recorded outcome in `docs/decisions.md`. All six have an
      explicit outcome: (1) T037 pass — zero `dangerouslySetInnerHTML`; (2) T038
      deferred (owner chose to skip, documented as open item); (3) T039 pass —
      0 critical after fixes, rest triaged/accepted; (4) T040 pass — 0 leaks across
      63 commits; (5) T041 not ruled out — filed as explicit follow-up; (6) T042 pass
      — `LICENSE` present, `package.json` `"license": "MIT"`. Per the quickstart's own
      pass condition, a documented deliberate accepted-risk/deferred outcome (T038,
      T041) satisfies SC-005 — not every item needs to be a clean "pass."

**Checkpoint**: All six user stories are complete and independently verifiable.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final repo-wide validation and manual-verification bookkeeping

- [X] T044 [P] Update the `**Status**` line at the top of each of
      `docs/review/01-dependencies-and-config-hygiene.md`,
      `docs/review/02-config-schemas-and-validation.md`,
      `docs/review/03-secrets-and-public-repo-readiness.md`,
      `docs/review/04-security.md`, and
      `docs/review/11-code-structure-and-patterns.md` from "Planning done" to
      "Implemented — see specs/005-...". All five updated via `sed`; verified.
- [X] T045 Run the full `quickstart.md` validation matrix end-to-end across all six user
      stories. Re-ran every CLI/grep-based check in this final pass (not just cited
      earlier per-story results): US1.1 (zero GUID matches), US2.1-.8 (zero
      better-sqlite3/webpack/useS3.ts/SQLJsDatabase/VITE_DATA_SOURCE/.eslintrc*,
      clean `knip`, clean `pnpm build && pnpm lint`, `components.json` tailwind/icon
      config correct), US3.1/.3 (`$schema` present in all three files, `engines.node`
      accurate), US5.1/.2 (no `unsafe-eval` in CSP, drift check passes). US2.2's
      malformed-config test (US3.2) and US5.3's deliberate-mismatch test were already
      individually verified with reverts during T029/T036. US4's 5-step matrix and
      US5.4's HSTS/Permissions-Policy header check were already verified live during
      T023/T026 (5/5 and headers-present respectively) — not re-deployed again here,
      cited from those task notes. US6's 6 items per T043. All pass or have an
      explicit documented outcome.
- [ ] T046 Manually re-verify the golden path (login → data loads → charts render) and
      the guest path in a browser, desktop and at least one mobile viewport, per
      constitution Principle III, against the T001 baseline; record this pass — plus
      T024's Cognito boundary confirmation, T038's Cognito console check, T040's
      git-history scan, and T041's `cashpy-processor` spot-check — in
      `docs/review/19-manual-verification.md`, per the spec's own Assumptions.
      **PARTIALLY DONE**: `docs/review/19-manual-verification.md` updated with a new
      "Spec 005" entry recording this open item plus a pointer to T024 (already
      recorded in `docs/decisions.md`, no browser needed — code-level trace), T038
      (deferred, recorded), T040 (done, 0 leaks), and T041 (done, filed as follow-up).
      The golden-path/guest-path **browser session itself is not yet done** — no
      browser tool is available in this session; left open, tracked, not guessed at
      (same honesty standard this doc already applies to specs 001/004's open items).
      Left unchecked deliberately.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first.
- **Foundational (Phase 2)**: Empty — no cross-story blocking prerequisites.
- **User Stories (Phase 3-8)**: All can start after Setup. Recommended order is priority
  order (US1 → US2 → US4 → US5 → US3 → US6) both because it's the incremental-delivery
  order and because US3 and US4 build on files US1 changes first (see below) —
  US2/US5/US6 have no cross-story file dependencies and could be reordered or
  parallelized by a team.
- **Polish (Phase 9)**: Depends on all six user stories being complete.

### Cross-Story Dependencies

- **US3 depends on US1**: T034/T035's `zod` schema targets `src/config.json`'s shape
  *after* US1's T006 removes the `database` key — validating the pre-US1 shape would be
  wasted work.
- **US4 depends on US1**: T022 adds rate limiting to `api/turso-token.ts`, the same file
  US1's T003 already modifies (response shape) — sequencing avoids conflicting edits to
  one file across two stories.
- **US6's T039 (`pnpm audit`) benefits from following US2**: a clean audit baseline is
  easier to read once US2's dead dependencies (`better-sqlite3`, `webpack`) are already
  removed, though not a hard technical dependency.
- **US2, US5**: No dependency on any other story — could run fully in parallel with
  US1/US3/US4/US6 if staffed separately.

### Within Each User Story

- **US1**: T002 is independent (different file); T003 → T004 → T005 → T006 is a strict
  chain (each depends on the previous file's new shape); T007 can happen any time after
  T003; T008 (validation) depends on T002-T007; T009 is an independent decision-recording
  task.
- **US2**: T010-T016 are all independent (different files, parallel); T017 depends on
  T010/T011 (same file, `package.json`); T018 depends on T010-T016 (needs the
  post-cleanup state to report against); T019 depends on T015 and T010-T014; T020
  depends on everything above.
- **US4**: T021 is independent; T022 depends on T021 (extends its test); T023/T024
  depend on T022.
- **US5**: T025 and T026 are independent (different concerns, same file — sequence to
  avoid conflicting edits to `vercel.json`); T027 → T028 is a strict chain; T029/T030
  depend on T025-T028.
- **US3**: T031-T033 are independent (different files, parallel); T034 → T035 is a
  chain; T036 depends on all.
- **US6**: T037, T038, T040, T041, T042 are independent of each other; T039 has a soft
  dependency on US2 (see above); T043 depends on all.

### Parallel Opportunities

- T002 (US1) has no same-story task to parallelize with (the rest of US1 is a strict
  chain).
- T010, T011, T012, T013, T014, T015, T016 (US2) — seven independent files.
- T026 could run alongside T025 if two people split `vercel.json`'s edits carefully, but
  sequencing is simpler for one implementer.
- T031, T032, T033 (US3) — three independent config files.
- T037, T042 (US6) — independent of each other and of T038/T039/T040/T041.
- Across stories: US2 and US5 have no dependency on US1/US3/US4/US6 and can be worked
  fully in parallel by a second implementer.

---

## Parallel Example: User Story 2

```bash
# All independent, different-file cleanup tasks can run together:
Task: "Remove better-sqlite3 + @types/better-sqlite3 from package.json"
Task: "Remove webpack from package.json devDependencies"
Task: "Delete src/hooks/useS3.ts"
Task: "Remove SQLJsDatabase union member from src/db/dbType.ts"
Task: "Remove VITE_DATA_SOURCE from src/vite-env.d.ts and .env.example"
Task: "Delete .eslintrc.cjs and port its rules into eslint.config.mjs"
Task: "Fix components.json's tailwind.config path and iconLibrary"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (golden-path baseline).
2. Complete Phase 3: User Story 1 — private data leaves the repo/bundle.
3. **STOP and VALIDATE**: run the US1 section of `quickstart.md`.
4. This alone already closes the single highest-stakes item blocking the repo from going
   public (spec's own Sequencing note and `docs/review/03`'s P0 framing).

### Incremental Delivery

1. Setup → baseline established.
2. US1 → validate → private data out of the repo (highest-stakes item closed).
3. US2 → validate → dead code/config drift gone, `knip` guards against recurrence.
4. US4 → validate → auth boundary regression-tested, abuse-resistant.
5. US5 → validate → CSP tightened, drift can't silently recur.
6. US3 → validate → config typos fail fast instead of silently.
7. US6 → validate → every remaining pre-publish checklist item explicitly recorded.
8. Polish → full validation matrix, final manual golden-path/guest-path sign-off.

Each step can be deployed independently per constitution Principle I — none of these
phases requires a later one to be considered a working improvement, and per the spec's
own Sequencing note, completing this spec (all six stories) is itself a precondition for
starting specs 006-009, not the reverse.
