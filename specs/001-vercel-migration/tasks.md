# Tasks: Vercel Hosting Migration

**Input**: Design documents from `/specs/001-vercel-migration/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: No automated test suite exists for this app and none is introduced here (see
plan.md Technical Context). Verification is manual, via quickstart.md, embedded as tasks
in each story below.

**Organization**: Tasks are grouped by user story from spec.md, in priority order (US1 and
US2 are both P1 and are sequenced together since US2 cannot be verified without US1's
deployment existing; US3 is P2; US4 is P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are exact; `cashpy_v2/` is this repo's root, `resumeweb/` is the sibling repo
  at `/home/victor/workspace/resumeweb`

## Path Conventions

Single static SPA project at the repository root (`cashpy_v2/`), no `backend/`/`frontend/`
split. One small out-of-tree change in the sibling `resumeweb/` repo (the cross-project
rewrite — see research.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare this repo's config so it's ready to become its own Vercel project,
before any deployment or story-specific work happens.

- [x] T001 Add `.nvmrc` pinned to Node 24 in `cashpy_v2/.nvmrc` (research.md: Node version
      pin decision)
- [x] T002 Add `"engines": { "node": ">=24" }` to `cashpy_v2/package.json`
- [x] T003 [P] Create `cashpy_v2/vercel.json` with security headers (CSP, X-Frame-Options,
      X-Content-Type-Options, Referrer-Policy) ported from `resumeweb/vercel.json`, with
      CSP `connect-src` extended to allow the Cognito IDP endpoint
      (`cognito-idp.eu-west-3.amazonaws.com`), Cognito Identity endpoint
      (`cognito-identity.eu-west-3.amazonaws.com`), and S3 endpoint
      (`victor-mycash.s3.eu-west-3.amazonaws.com` or `s3.eu-west-3.amazonaws.com`) — see
      `cashpy_v2/src/config.json` for the exact region/bucket already in use
- [x] T004 [P] In `cashpy_v2/vercel.json`, add a `rewrites` rule sending unmatched paths
      under `/dashboard/*` to `/dashboard/index.html` (research.md: SPA fallback routing
      decision) — this MUST be a distinct rule from the headers block added in T003, both
      living in the same file
- [x] T005 Verify `cashpy_v2/vite.config.ts` still has `base: "/dashboard/"` and
      `cashpy_v2/src/main.tsx`'s router still has `basepath: "dashboard"` unchanged (these
      are already correct per plan.md; this is a confirmation task, not a code change)

**Checkpoint**: Repo has all Vercel-specific config files needed to deploy as a standalone
project.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Get the app actually deployed on Vercel as its own project. Nothing in any
user story can be verified until this exists.

**⚠️ CRITICAL**: No user story verification can begin until this phase is complete.

- [x] T006 Run `pnpm run build` locally and confirm it succeeds with no changes in
      behavior from the config added in Phase 1 (build output unchanged apart from the
      new `vercel.json`/`.nvmrc` files, which aren't part of the Vite build) — required a
      minimal pre-existing-bug fix (unrelated to this migration's scope, user-approved):
      `TreeList.stories.tsx` was calling `toHierarchy` with 6/8 args, and `global.ts` had
      an unused `maxPricesQuery` function; both fixed, build now passes clean
- [x] T007 Create a new Vercel project for `cashpy_v2`, connected to this repo's GitHub
      remote (via Vercel dashboard "Add New Project", or `vercel link` from the CLI) —
      one-time setup, no code change — production URL: `https://cashpy-v2.vercel.app`
- [x] T008 Trigger a deployment (push to the connected branch, or `vercel --prod`) and
      record the assigned stable production URL (`https://<project>.vercel.app`) — three
      follow-up fixes were needed before this went green: (1) pin `packageManager` +
      remove a stale tracked `yarn.lock` so Vercel actually used pnpm instead of Yarn
      (Yarn's resolution pulled in a Node-only AWS SDK submodule Vite couldn't bundle);
      (2) reorder `build` script to `vite build && tsc` since `routeTree.gen.ts` is only
      generated as a Vite plugin side effect and doesn't exist on a fresh checkout; (3) set
      `build.outDir` to `dist/dashboard` since `base: "/dashboard/"` only affects how Vite
      _references_ assets in HTML, not where files physically land — Vercel is a static
      host and needs the physical layout to match the referenced paths
- [x] T009 Visit `https://<project>.vercel.app/dashboard` and confirm the app loads (raw
      Vercel URL, not yet the final domain — validates Phase 1's config actually works
      before wiring up resumeweb) — confirmed 200, correct asset paths, all 4 security
      headers present (also satisfies T015 for this URL; will re-check on the final domain)
- [x] T010 Visit `https://<project>.vercel.app/dashboard/summary` directly (hard
      navigation, not in-app) and confirm it loads without a 404 (validates T004's SPA
      fallback rewrite) — confirmed 200

**Checkpoint**: `cashpy_v2` is live on Vercel at its own URL, SPA routing works. Ready to
wire up the real domain and verify functional behavior.

---

## Phase 3: User Story 1 - Dashboard keeps working at its existing address (Priority: P1) 🎯 MVP

**Goal**: `victorvaquero.com/dashboard` serves this app, including deep-linked routes,
with no dependency on the old AWS hosting once verified.

**Independent Test**: Visit `victorvaquero.com/dashboard` and a deep link under it; both
resolve correctly, per spec.md User Story 1's acceptance scenarios.

### Implementation for User Story 1

- [x] T011 [US1] In `resumeweb/vercel.json`, add two `rewrites` entries per research.md:
      `/dashboard` and `/dashboard/:path*`, both pointing at the production URL recorded
      in T008 — also required scoping resumeweb's site-wide CSP header rule to exclude
      `/dashboard` and adding a matching rule with cashpy_v2's extended `connect-src`,
      since Vercel applies the rewriting project's headers, not the origin's (would have
      silently blocked Cognito/S3 calls on login)
- [x] T012 [US1] Deploy `resumeweb` with the updated `vercel.json` (push to its connected
      branch, or `vercel --prod` in that repo) — pushed as 8c1c0cb then 10dfb07 (CSP fix)
- [x] T013 [US1] Run quickstart.md step 3: visit `https://victorvaquero.com/dashboard`
      and confirm the app loads under the real domain — confirmed 200, correct CashPy HTML
- [x] T014 [US1] Run quickstart.md step 3 (deep link): visit
      `https://victorvaquero.com/dashboard/summary` directly and confirm it loads without
      a 404 — confirmed 200
- [x] T015 [US1] Run quickstart.md step 7: `curl -I https://victorvaquero.com/dashboard`
      and confirm all four security headers from T003 are present — confirmed, including
      the extended `connect-src` (verified with a cache-busting query string since the
      edge cache briefly served the pre-fix CSP after the first deploy)
- [x] T016 [US1] Run quickstart.md step 8: grep git history of `vercel.json`/`.nvmrc` for
      accidental secrets; confirm no matches — confirmed clean in both cashpy_v2 and
      resumeweb

**Checkpoint**: The dashboard is reachable at its real, final URL with working deep links
and security headers. This alone is a demonstrable, shippable increment (MVP).

---

## Phase 4: User Story 2 - Authenticated user sees their real data (Priority: P1)

**Goal**: Logging in and loading real financial data works identically to the old
hosting, now that the app is served from Vercel.

**Independent Test**: Log in with real credentials on `victorvaquero.com/dashboard` and
confirm data renders on multiple pages, per spec.md User Story 2's acceptance scenarios.

### Implementation for User Story 2

- [x] T017 [US2] Run quickstart.md step 4: log in with real owner credentials on
      `https://victorvaquero.com/dashboard` — confirmed working
- [x] T018 [US2] Confirm summary, expenses, travels, and investments pages all render
      data and charts, matching the pre-migration app for the same account — confirmed by
      user after the CSP fix below landed
- [x] T019 [US2] Check browser devtools console for CSP violation errors during login and
      data fetch; if any Cognito/S3 request is blocked, fix the specific `connect-src`
      origin missing from `cashpy_v2/vercel.json` (added in T003) and redeploy — found a
      real issue, though not `connect-src`: sql.js's WASM module failed to compile
      (`script-src` was missing `'wasm-unsafe-eval'`), blocking all data loading after a
      successful login. Fixed in both `cashpy_v2/vercel.json` (acb81f6) and the
      `/dashboard`-scoped rule in `resumeweb/vercel.json` (6999f23)
- [x] T020 [US2] If T019 required a CSP fix, re-run T017–T018 to confirm the fix resolved
      it and nothing else regressed — confirmed by user, data now loads correctly

**Checkpoint**: Both P1 stories are done — the app is reachable at its real address AND
fully functional for the real user. This is the actual production-ready milestone.

---

## Phase 5: User Story 3 - Guest demo still works (Priority: P2)

**Goal**: The guest/demo login path continues to work unchanged, so the app remains
usable as a portfolio/demo piece.

**Independent Test**: Use the guest login on the migrated app and confirm sample data
renders, per spec.md User Story 3's acceptance scenarios.

### Implementation for User Story 3

- [ ] T021 [US3] Run quickstart.md step 5: log out, select the guest/demo login option on
      `https://victorvaquero.com/dashboard`
- [ ] T022 [US3] Confirm the same sample dataset and charts render as before the
      migration

**Checkpoint**: All three functional user-facing stories (P1 + P1 + P2) are verified
working end-to-end on the new hosting.

---

## Phase 6: User Story 4 - Every preview/branch gets its own deployable URL (Priority: P3)

**Goal**: Pushing a branch produces an isolated preview deployment, confirming the
developer workflow benefit of moving to Vercel.

**Independent Test**: Push a branch and confirm a preview URL is generated and works
independently of production, per spec.md User Story 4's acceptance scenarios.

### Implementation for User Story 4

- [ ] T023 [US4] Run quickstart.md step 6: push a throwaway branch/commit to `cashpy_v2`
- [ ] T024 [US4] Confirm Vercel creates a preview deployment at a distinct URL and that it
      loads the app correctly
- [ ] T025 [US4] Confirm `https://victorvaquero.com/dashboard` (production) is unaffected
      by the preview deployment

**Checkpoint**: All four user stories verified. Migration is functionally complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and decommissioning steps that apply across all stories, per FR-009
and FR-010. Only start once Phases 3–6 (all stories) are verified passing.

- [x] T026 Remove the `clean` and `deploy` scripts (`aws s3 rm`, `aws s3 sync` +
      `cloudfront create-invalidation`) from `cashpy_v2/package.json` (FR-010)
- [x] T027 [P] Update `cashpy_v2/README.md`'s "Deploy" section to describe the new
      git-push-to-deploy flow via Vercel, replacing the old `pnpm build`/`pnpm
clean`/`pnpm run deploy` instructions
- [x] T028 Document the old AWS S3 bucket (`victorvaquero.dashboard.net`) and CloudFront
      distribution (`E5ZMBYGUCPRWJ`) used for this app's hosting as scheduled for
      decommission (FR-009) — record this in `cashpy_v2/README.md` or wherever the
      project tracks infra notes; do not delete the AWS resources as part of this task,
      only document the decision (actual teardown is a separate, later action per the
      constitution's reversibility principle and plan.md's parallel-run approach)
- [ ] T029 Re-run quickstart.md in full, end to end, as a final sign-off pass now that
      Phase 7's cleanup is done (confirms removing the AWS scripts didn't somehow break
      the app, and serves as the spec's completion gate)

**Checkpoint**: Migration is fully complete, documented, and the legacy deploy path is
retired (while the underlying AWS resources remain live but unused, pending a separate
decommission action).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Must complete before Phase 4, since US2
  verifies login/data on the real domain wired up in US1.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs the real-domain deployment to log
  into).
- **User Story 3 (Phase 5)**: Depends on Phase 3 (needs the real-domain deployment); does
  not depend on Phase 4, could run in parallel with it if desired.
- **User Story 4 (Phase 6)**: Depends only on Phase 2 (needs _a_ Vercel project to exist,
  not the domain wiring) — could technically run right after Phase 2, but is sequenced
  last since it's P3 and unrelated to functional correctness.
- **Polish (Phase 7)**: Depends on Phases 3–6 all being verified passing.

### Within Each User Story

- All tasks in US1 (T011–T016) are sequential — each depends on the previous (rewrite
  config → deploy → verify).
- US2's tasks (T017–T020) are sequential; T019/T020 are conditional (only if a CSP issue
  is found).
- US3's tasks (T021–T022) are sequential and quick.
- US4's tasks (T023–T025) are sequential.

### Parallel Opportunities

- T003 and T004 (both editing `cashpy_v2/vercel.json`, but logically separable — headers
  vs. rewrite) can be done as one combined edit in practice; marked `[P]` here because
  they don't depend on each other's content, not because they should literally be
  simultaneous edits to the same file.
- Phase 5 (US3) can run in parallel with Phase 4 (US2) once Phase 3 is done, since neither
  depends on the other.
- T027 (README update) can run in parallel with T026/T028 within Phase 7.

---

## Parallel Example: Phase 1 Setup

```bash
# T003 and T004 both touch cashpy_v2/vercel.json but are logically independent pieces
# (security headers vs. SPA fallback rewrite) — fine to draft both in one sitting:
Task: "Create cashpy_v2/vercel.json with security headers"
Task: "Add SPA fallback rewrite to cashpy_v2/vercel.json"
```

## Parallel Example: Phase 4 + Phase 5

```bash
# Once Phase 3 (US1) is checkpointed, US2 and US3 verification can happen in either order
# or side by side:
Task: "Log in with real credentials and verify data pages (US2)"
Task: "Log in as guest and verify sample data (US3)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (deploy to Vercel, verify raw Vercel URL works).
3. Complete Phase 3: User Story 1 (wire up the real domain, verify it and deep links).
4. **STOP and VALIDATE**: `victorvaquero.com/dashboard` is live and reachable. This alone
   is a demonstrable win even before auth/data are re-verified.

### Incremental Delivery

1. Setup + Foundational → app deployed, not yet on the real domain.
2. User Story 1 → real domain live (MVP demo-able).
3. User Story 2 → confirmed fully functional for the real user (production-ready).
4. User Story 3 → guest path confirmed (demo-safe).
5. User Story 4 → preview deployments confirmed (developer workflow win).
6. Polish → legacy scripts removed, old hosting marked for decommission, final sign-off.

---

## Notes

- No `[Story]` label on Setup/Foundational/Polish tasks, per the task-format rules —
  those phases are shared infrastructure, not story-specific.
- This is a solo-developer, single-repo-plus-one-sibling-edit migration; the "parallel
  team" strategy from the template isn't applicable and has been omitted.
- Every verification task in Phases 3–6 maps directly to a numbered step in
  `quickstart.md` — that file is the source of truth for exact commands/URLs to use.
- Commit after each phase, not after each task, given how many tasks in this feature are
  "visit a URL and confirm" rather than code edits.
