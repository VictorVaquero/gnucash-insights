# Tasks: Database & Data Loading Simplification

**Input**: Design documents from `/specs/002-database-simplification/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No automated test tasks are included — `cashpy_v2` has no test framework
configured today, and per `plan.md`'s Technical Context, verification is manual (see
Phase 6 below, which runs `quickstart.md`). This matches constitution Principle III's
existing practice, not a gap introduced by this feature.

**Organization**: All four of spec.md's user stories are Priority P1 — this spec has no
lower-priority stories to defer. They are still organized as separate, checkpointed
phases below so each can be validated on its own before moving on, per the constitution's
"leave the app in a fully working, deployed state" requirement (Principle I) and its
insistence that the old (S3) path stay live until the new path is verified.

## Path Conventions

Two repositories are touched:
- `cashpy_v2/` (this repo) — dashboard SPA + new `api/` serverless function
- `../cashpy-processor/` (sibling repo) — ingestion CLI

All paths below are relative to one of these two roots, stated explicitly per task.

---

## Phase 1: Setup

**Purpose**: Provision Turso and wire up credentials, before any code changes land.

- [X] T001 Create the production Turso database (`cashpy`) and a separate guest database
      (`cashpy-guest`, per `plan.md`'s "Guest/demo dataset" decision) via `turso db
      create`, both on the free tier, both in the `default` group (`aws-eu-west-1`).
      URLs: `libsql://cashpy-victor26.aws-eu-west-1.turso.io` (production) and
      `libsql://cashpy-guest-victor26.aws-eu-west-1.turso.io` (guest). (Considered the
      Vercel Marketplace Turso integration as a lower-friction alternative, but went
      CLI-only since it needs two separate databases with different purposes anyway.)
- [X] T002 [P] Minted a long-lived full-access write token for the production database
      via `turso db tokens create cashpy`, and stored it (with `TURSO_DATABASE_URL`) in
      `cashpy-processor/.env` (gitignored, real values) — `.env.example` keeps its
      existing empty placeholders, no real value committed.
- [X] T003 [P] Minted a Turso Platform API admin token via `turso auth api-tokens mint`
      and added it as the Vercel environment variable `TURSO_PLATFORM_TOKEN` (Production
      + Preview only — Vercel disallows sensitive vars on Development), scoped to the
      `cashpy-v2` project.
- [X] T004 [P] Added `TURSO_DATABASE_URL` (production) and `TURSO_GUEST_DATABASE_URL` to
      Vercel env vars (Production, Preview, Development; non-sensitive) via `vercel env
      add`; `cashpy-processor/.env` (from T002) already has the production URL.
- [X] T005 Confirmed `@libsql/client@^0.14.0` (pinned in `cashpy_v2/package.json`)
      resolves and connects: a throwaway script (`createClient` + `select 1`) against
      the production DB returned `[{"ok":1}]`.

**Checkpoint**: Turso infrastructure exists; no application code changed yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the read path (token issuance + Drizzle/libSQL connection) that every
user story either exercises directly or depends on to be testable at all. The existing
S3/Cognito read path is left fully intact through this phase — nothing is removed yet.

**⚠️ CRITICAL**: No user story below can be manually verified until this phase is done.

- [X] T006 Implement Cognito ID token verification (JWKS-based) as a reusable helper in
      `cashpy_v2/api/_lib/verifyCognitoToken.ts`
- [X] T007 Implement `cashpy_v2/api/turso-token.ts`: verify the caller (T006), pick
      real-vs-guest database per `contracts/turso-token-endpoint.md`, mint a short-lived
      read-only Turso token via the Platform API, return `{ url, token, expiresAt }`;
      return `401` on any verification failure
- [X] T008 [P] Add a `useTursoToken` fetch/query hook in `cashpy_v2/src/hooks/useDB.tsx`
      (or a new `src/hooks/useTursoToken.ts`) that calls `/api/turso-token` with the
      current Cognito ID token and re-fetches on expiry
- [X] T009 [P] Add a `drizzle-orm/libsql` connection factory in
      `cashpy_v2/src/services/DbService.tsx` (new function alongside the existing
      `sql-js`-based `setupDB`, not replacing it yet) that takes `{ url, token }` and
      returns a Drizzle instance
- [X] T010 Add a data-source toggle (env var or `config.json` flag, e.g.
      `VITE_DATA_SOURCE=s3|turso`) read in `cashpy_v2/src/hooks/useDB.tsx` so the app can
      run against either backend without a code branch removal, per constitution
      Principle I's reversible-cutover requirement
- [X] T011 Wire the toggle: when `turso`, `useSetupDB` uses T008/T009's token hook +
      libSQL connection instead of `fetchDBOptions`/`saveFile`/`setupDB`'s S3+sql.js path,
      in `cashpy_v2/src/hooks/useDB.tsx`
- [X] T012 Manually verify: with the toggle set to `turso` and an **empty** Turso
      database, the app connects without error (schema present, zero rows) — confirms the
      plumbing before any real data exists.
      **Superseded rather than run standalone**: by the time this was reached, both
      Turso databases already had real/guest data loaded (T017, T018), so a true
      "empty schema, zero rows" browser check was no longer reproducible. The
      connection plumbing itself was verified independently via T005 (direct
      `@libsql/client` round-trip) and confirmed again end-to-end by T017/T018's
      successful `libsql_client` writes and `turso db shell` reads. The
      dashboard-UI-level check (does the toggle actually render Turso data in the
      browser) happens as part of T019 instead.

**Checkpoint**: Dashboard can connect to Turso end-to-end (empty data). S3 path still
fully functional when the toggle is flipped back. Ready for user stories.

---

## Phase 3: User Story 1 - Owner sees fresh data without a manual multi-step pipeline (Priority: P1)

**Goal**: Replace the Lambda/S3 ingestion pipeline with a local script that pushes
straight to Turso, cutting the manual/moving-part count.

**Independent Test**: Run the local ingestion script against a real `.gnca` export, then
confirm the dashboard (toggled to `turso`) shows that data — count and compare manual
steps against the current S3 pipeline (per spec.md's Independent Test for this story).

### Implementation for User Story 1

- [X] T013 [US1] Add a libSQL/Turso Python client dependency to
      `cashpy-processor/pyproject.toml` (e.g. `libsql-client`), pinned
- [X] T014 [US1] Rewrite `cashpy-processor/src/gcparser/core/sql.py`'s output step:
      replace the stdlib-`sqlite3`-to-local-file write with a libSQL/Turso write using
      `TURSO_DATABASE_URL`/`TURSO_WRITE_TOKEN`, keeping the same
      drop/create/bulk-insert-per-table logic (including the in-database `timetable`,
      `accountsClosure` recursive CTE, and `summary_*` builds) unchanged in substance
- [X] T015 [US1] Update `cashpy-processor/src/gcparser/__main__.py` to call the new Turso
      write path (per `contracts/ingestion-write-contract.md`) instead of writing
      `cash.db` to `output_dir`
- [X] T016 [US1] Remove the S3 get/put calls and `boto3` usage from
      `cashpy-processor/src/gcparser/app.py`, or delete the file outright if no
      Lambda-specific logic remains needed for this phase (full removal of the Lambda
      deployment itself is deferred to Phase 6's cutover step, per constitution
      Principle I — this task only stops it from being the ingestion entry point)
- [X] T017 [US1] One-time load of the existing guest sample dataset into the guest Turso
      database created in T001 (static data, not part of the regular ingestion run).
      Ran `python -m gcparser -f tests/data/gnucash.gnca -o tests/data/cash` (the repo's
      existing test fixture — its `Account*`-style IDs match `config.json`'s `guest`
      block) against `cashpy-guest`'s write token. Confirmed via `turso db shell
      cashpy-guest`: all 14 tables present, `transactions` has 2505 rows.
      **Found and fixed a real bug while doing this**: `libsql-client==0.3.1`'s
      websocket (Hrana) transport fails its handshake against Turso's current server
      (`400 Invalid response status`) — switched `save_to_sql` in
      `cashpy-processor/src/gcparser/core/sql.py` to rewrite `libsql://` URLs to
      `https://` before connecting, which uses the HTTP transport instead and works.
- [X] T018 [US1] Manually run
      `python -m gcparser -f <export.gnca> -o <dir>` end-to-end against the production
      Turso database and confirm via `turso db shell` that all tables are rebuilt
      correctly (quickstart.md step 1).
      Along the way, found and fixed two path bugs in `cashmatcher/scripts/backupGnucash.fish`
      (the script the owner already uses to produce `.gnca` exports, run via `just backup`):
      (1) the source `cp` path was missing a `Documentos Personales/` segment and pointed
      at a nonexistent file (root cause of a 0-byte export from a prior run); (2) the
      `zf`/`of` destination paths were built with a literal backslash-space (`\ `) inside a
      single-quoted `string join`, which fish does **not** treat as an escape inside single
      quotes — it stayed as a literal `\` character, so the path didn't match the real
      directory either. Fixed both, ran `just backup`, got a fresh 5.8 MB `.gnca` export
      (also uploaded to S3 as the script always does — unrelated legacy side effect, left
      as-is). Ran `python -m gcparser -f <export> -o tests/data/cash` against the
      production Turso database (`cashpy`). **Caught a near-miss**: the output dir
      (`tests/data/cash`) is a git-tracked fixture path shared with the guest dataset —
      running against it overwrote the tracked CSVs with real financial data locally;
      discarded via `git checkout -- tests/data/cash/` before anything was staged/committed,
      so no real data ever touched git. Confirmed via `turso db shell cashpy`: 4011
      transactions, 8686 splits, 112 accounts, max transaction date 2026-08-07.
- [X] T019 [US1] With the dashboard toggle set to `turso`, confirm the dashboard reflects
      the freshly ingested data, and document the new step count (GnuCash export → run
      script → refresh browser) against today's baseline (S3 upload → Lambda trigger →
      client refetch), per spec.md's Acceptance Scenario 2 for this story.
      Verified in two stages. **Guest path**: confirmed fully programmatically —
      `/api/turso-token` with `x-guest-request: true` returns a scoped read-only token,
      and querying with it against `cashpy-guest` returns 2505 transactions (matches
      T017). **Real-user path**: local `vercel dev` couldn't be used (its dev proxy
      mis-routes this app's `base: "/dashboard/"` Vite config, an unrelated pre-existing
      tooling issue — logged as noise, not fixed). Instead deployed a Vercel Preview
      (`VITE_DATA_SOURCE=turso` scoped to Preview only; Production untouched, still
      `s3`) and had the owner log in and check directly in the browser.
      **Found and fixed two real bugs this surfaced, both now committed**:
      (1) `api/turso-token.ts` imported `./_lib/verifyCognitoToken` with no extension;
      under this project's `"type": "module"`, Node's ESM loader requires the literal
      `.js` extension on relative imports, and the deployed function wasn't bundled
      down to a single file, so every authenticated request crashed at import time
      (`ERR_MODULE_NOT_FOUND`) before ever reaching the handler — fixed by importing
      `./_lib/verifyCognitoToken.js` instead. (2) `vercel.json`'s CSP `connect-src` was
      missing `*.turso.io`/`wss://*.turso.io` entirely (only had the S3/Cognito
      domains from the old path), so even once the function worked, the browser would
      have blocked every libSQL query — added the missing entries.
      **Also closed a Phase 2 gap found along the way**: `api/turso-token.ts` needs
      `TURSO_ORG_SLUG`, `TURSO_DATABASE_NAME`, and `TURSO_GUEST_DATABASE_NAME` in
      addition to the vars T003/T004 already set, and `verifyCognitoToken.ts` needs
      `COGNITO_REGION`/`COGNITO_USER_POOL_ID`/`COGNITO_CLIENT_ID` (public client
      config, not secret — values taken from `src/config.json`) — none of these had
      been added to Vercel, so the endpoint was non-functional in every environment
      until now. Added all six to Production/Preview/Development.
      After both fixes, redeployed to Preview and the owner confirmed: real data
      loads correctly (4011 transactions, latest 2026-08-07).
      Step-count comparison: new path is GnuCash export (`just backup`, now fixed) →
      `python -m gcparser -f <export> -o <dir>` → refresh browser (toggle already on
      `turso`) — 2 manual steps, vs. today's S3 upload → wait for Lambda trigger →
      client refetch — the new path removes the Lambda hop and its associated wait/
      trigger-reliability risk entirely.

**Checkpoint**: Ingestion pipeline fully runs against Turso; dashboard (toggled) reflects
real data. S3/Lambda path still exists as a fallback (not yet removed).

---

## Phase 4: User Story 2 - Dashboard loads data at least as fast as today (Priority: P1)

**Goal**: Confirm the new direct-query path is at least as fast as today's full-file
download-and-parse, for both authenticated and guest users.

**Independent Test**: Measure time-to-data-visible on the summary page before/after on
comparable network conditions (spec.md's Independent Test for this story).

### Implementation for User Story 2

- [ ] T020 [P] [US2] Verify `api/turso-token.ts` (T007) responds well within a budget that
      keeps total time-to-data-visible competitive (e.g. sub-200ms server-side) — add
      basic timing logging if not already visible via Vercel function logs
- [ ] T021 [US2] Manually measure time-to-data-visible on the summary page against the
      current S3 baseline, real-user path, per `quickstart.md` step 5
- [ ] T022 [US2] Manually measure the same for the guest path, confirming no new failure
      mode (spec.md's Acceptance Scenario 2 for this story) — e.g. guest token issuance
      failing open/closed correctly, guest database reachable
- [ ] T023 [US2] If either measurement regresses vs. baseline, address the specific
      bottleneck found (e.g. missing index, oversized token payload, cold-start on the
      Vercel function) before proceeding — file location depends on what's found, no
      task can be pre-specified here

**Checkpoint**: Both real and guest paths meet or beat baseline load time, recorded in
spec.md's completion notes (SC-003).

---

## Phase 5: User Story 4 - Existing dashboard features keep working (Priority: P1)

**Goal**: Every existing page produces identical output against the new data layer,
compared to the old one, for the same underlying dataset.

**Independent Test**: Exercise every existing route/query against the new data layer and
confirm output matches the old data layer (spec.md's Independent Test for this story).

*(Note: spec.md orders this as User Story 4; it's sequenced last here because it's the
regression gate that only makes sense to run once US1's real data and US2's read path are
both in place and exercised — it is not a story with independent technical build tasks of
its own, it is verification of what Phases 2–4 already built.)*

### Implementation for User Story 4

- [ ] T024 [US4] With the toggle on `turso` and the same GnuCash export used to populate
      both the current S3 `cash.db` and the new Turso database, open every existing route
      (summary, expenses, travels, investments, analysis) and compare numbers/charts
      against the S3-backed version of the same page, per `quickstart.md` step 3
- [ ] T025 [US4] Repeat T024 for the guest login path against the guest Turso database,
      per `quickstart.md` step 4
- [ ] T026 [US4] For any discrepancy found in T024/T025, fix it in the relevant
      `cashpy_v2/src/db/queries/*.ts` file or in `cashpy-processor/src/gcparser/core/sql.py`
      (whichever layer produced the wrong value) — exact file depends on what's found

**Checkpoint**: 100% of existing pages verified identical between old and new data layers
(SC-004). This is the last gate before cutover.

---

## Phase 6: Polish & Cutover

**Purpose**: Remove the old path in a distinct, separate change once Phases 2–5 are all
verified, per constitution Principle I. Confirm spec.md's Success Criteria are fully met
and record final numbers.

- [ ] T027 Remove the data-source toggle from T010, defaulting permanently to `turso`, in
      `cashpy_v2/src/hooks/useDB.tsx`
- [ ] T028 [P] Delete `cashpy_v2/src/services/s3Service.tsx` and the S3-fetch branch of
      `cashpy_v2/src/services/DbService.tsx` (the `sql-js`/OPFS `setupDB`/`saveFile`/
      `fetchDBOptions` path), now unused
- [ ] T029 [P] Remove `@aws-sdk/client-s3`, `sql.js`, and related WASM/vite plugins
      (`vite-plugin-wasm`, `vite-plugin-top-level-await` if unused elsewhere) from
      `cashpy_v2/package.json`, and the `sql.js` WASM handling from `vite.config.ts` if
      nothing else needs it
- [ ] T030 [P] Update `cashpy_v2/src/config.json`: remove `bucketName`/`folderPath`/
      `guestFolderPath`, keep only what's still needed (Cognito fields stay; Turso URLs
      come from env vars per T004, not this file)
- [ ] T031 [P] Update `cashpy_v2/vercel.json`'s CSP `connect-src` to remove the
      `*.s3.eu-west-3.amazonaws.com` entry and add the Turso database host(s)
- [ ] T032 [P] Delete `cashpy-processor/src/gcparser/app.py` (Lambda handler) and
      `cashpy-processor/template.yml` (SAM config), and remove `boto3` from
      `cashpy-processor/pyproject.toml` if no longer used anywhere
- [ ] T033 Update `specs/002-database-simplification/spec.md` (or a completion note) with
      the final SC-001 (service count), SC-002 (monthly cost), and SC-003 (timing)
      measurements gathered in Phases 3–4
- [ ] T034 Run the full `quickstart.md` one final time end-to-end post-cutover (no S3
      fallback remaining) to confirm nothing silently depended on the removed path

**Checkpoint**: Spec complete — old path fully removed, all Success Criteria (SC-001
through SC-005) met and recorded.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (needs real Turso credentials to build
  and manually verify the connection). Blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 (needs the read path working to verify
  ingested data actually shows up).
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs real data in Turso to measure
  realistic load times, not an empty database).
- **User Story 4 (Phase 5)**: Depends on Phase 3 (needs real data to compare against) —
  can run in parallel with Phase 4 since both only read, don't modify, the state Phase 3
  produced.
- **Polish/Cutover (Phase 6)**: Depends on Phases 3, 4, and 5 all passing their
  checkpoints — this is a hard gate per constitution Principle I/III, not a suggestion.

### Within Each Phase

- T001–T005 (Setup) can mostly run in parallel; T005 wants at least one database from
  T001 to exist first.
- T006 before T007 (token endpoint needs the verification helper). T008/T009 can proceed
  in parallel with T007 (different files) but T011 needs all of T007–T010.
- Phase 3's T013 before T014 (dependency) before T015. T016 can happen any time after
  T014/T015 free `app.py` from being load-bearing. T017 is independent of T013–T016
  (different database). T018/T019 need T014–T016 done.
- Phase 6's T028–T032 are all independent files/repos — parallelizable — but all must
  wait for T027 (toggle removal) to confirm nothing still reads the toggle expecting `s3`
  to be a live option.

### Parallel Opportunities

- T002, T003, T004 (Phase 1, different credentials/files)
- T008, T009 (Phase 2, different files, both consumed by T011)
- T020 (Phase 4) alongside Phase 5's T024/T025 — different concerns (latency vs.
  correctness), same underlying data, no file conflicts
- T028, T029, T030, T031, T032 (Phase 6, five independent files/repos)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T006 (verification helper) and T007 (token endpoint) land:
Task: "Add useTursoToken hook in cashpy_v2/src/hooks/useDB.tsx"
Task: "Add drizzle-orm/libsql connection factory in cashpy_v2/src/services/DbService.tsx"
```

---

## Implementation Strategy

### MVP Scope

Because spec.md marks all four stories P1, there is no smaller MVP within this spec than
"all of it" — Phases 1 through 6 together are the deliverable. The phase breakdown exists
for **checkpointing and rollback safety** (per constitution Principle I), not for
choosing a subset to ship. If time-boxing is needed, the safest stopping point short of
full completion is **after Phase 2's checkpoint** (Turso read path proven against an
empty database, S3 path still fully live and default) — the app is in a fully working,
deployed state at every checkpoint through Phase 5, with Turso only becoming load-bearing
at Phase 6.

### Incremental Delivery

1. Phase 1 + Phase 2 → Turso plumbing proven, zero user-facing change (toggle defaults to
   `s3`).
2. Phase 3 → real data flows into Turso; dashboard can show it when toggled, but S3 stays
   the default in production.
3. Phase 4 + Phase 5 → confidence built (speed + correctness) with the toggle still
   flippable either way.
4. Phase 6 → flip the default, remove the old path, done.

### Rollback

At any point before Phase 6, rolling back is "leave the toggle on `s3`" (or don't flip
it) — no data or infrastructure needs to be undone, since the S3 pipeline keeps running
untouched until T016 changes `cashpy-processor`'s entry point in Phase 3. After T016,
rollback to the old Lambda pipeline would require redeploying `app.py` and re-pointing
the S3 trigger — noted here so Phase 3 is understood as the point past which the old
ingestion path stops being exercised, even though its code isn't deleted until Phase 6.
