# Feature Specification: Repo Hygiene, Security Hardening & Public-Repo Readiness

**Feature Branch**: `005-repo-hygiene-security-and-public-readiness`

**Created**: 2026-08-10

**Status**: Draft — ready to plan/task via `/speckit-plan`

**Review docs covered**: [`docs/review/01-dependencies-and-config-hygiene.md`](../../docs/review/01-dependencies-and-config-hygiene.md), [`docs/review/02-config-schemas-and-validation.md`](../../docs/review/02-config-schemas-and-validation.md), [`docs/review/03-secrets-and-public-repo-readiness.md`](../../docs/review/03-secrets-and-public-repo-readiness.md), [`docs/review/04-security.md`](../../docs/review/04-security.md), [`docs/review/11-code-structure-and-patterns.md`](../../docs/review/11-code-structure-and-patterns.md)

**Input**: User description: "First spec in the sequence: clean up dead dependencies/config drift/orphaned code, add config validation, get the repo safe to go public, and harden the app against real attack vectors — all foundational work that everything else builds on top of. Covers: removing better-sqlite3/webpack/useS3.ts/dead SQLJsDatabase/VITE_DATA_SOURCE/duplicate ESLint config; adding knip; $schema + zod validation for vercel.json/tsconfig.json/components.json/src/config.json; engines.node pin; moving the private GnuCash account-GUID mapping out of src/config.json; full-history secret scan; Cognito self-signup check; cashpy-processor PII spot-check; MIT LICENSE; tracing the guest/real-user Turso-token auth boundary end-to-end; proactive rate limiting on api/turso-token.ts (owner-decided, not gated on evidence of abuse); CSP tightening (drop unsafe-eval/wasm-unsafe-eval, investigate nonce/hash for unsafe-inline) plus a cheap CI-enforced cross-repo CSP-drift guardrail against resumeweb (owner-decided: guardrail only, no shared-config rearchitecture); dangerouslySetInnerHTML grep, Cognito console hardening check, pnpm audit."

**Sequencing note**: run this spec **first**, before 006–009. It removes dead code and
config drift that later specs would otherwise build on top of or collide with, closes the
highest-stakes security gaps before the app gets any more surface area, and gates the
repo's ability to go public — a standing precondition the owner has flagged as important.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Private data no longer ships in the repo or the bundle (Priority: P1)

The real user's GnuCash account GUIDs/category labels currently ship inside
`src/config.json`, bundled straight into client code. Before the repo can go public, that
mapping must live outside the repository entirely.

**Independent Test**: `git grep` for the real account GUIDs/category labels across `src/`
returns nothing; the shipped JS bundle contains none of it; account→category display
still works identically via a Vercel-injected env var or server-side-only config.

**Acceptance Scenarios**:

1. **Given** the app is built and deployed, **When** the shipped bundle is inspected,
   **Then** no real GnuCash account GUID or category label appears in it.
2. **Given** the mapping has moved server-side, **When** the app runs (guest or real
   login), **Then** account-to-category display behaves identically to before.
3. **Given** old commits still contain the mapping, **When** the repo later goes public,
   **Then** the owner has made an explicit, documented call on whether git history needs
   scrubbing.

---

### User Story 2 - Dead dependencies, orphaned code, and config drift are removed and stay removed (Priority: P1)

`better-sqlite3`, `webpack`, `src/hooks/useS3.ts`, the `SQLJsDatabase` union member, the
`VITE_DATA_SOURCE` toggle, and a duplicate ESLint config are confirmed-unused leftovers.
`knip` is added so this class of drift is caught automatically going forward.

**Independent Test**: `pnpm run knip` reports zero findings for the items above; exactly
one ESLint config remains; `pnpm build`/`pnpm lint` succeed unchanged.

**Acceptance Scenarios**:

1. **Given** the cleanup, **When** `pnpm build` runs, **Then** it succeeds with
   `better-sqlite3`, `@types/better-sqlite3`, and `webpack` removed from `package.json`.
2. **Given** `knip` is installed and configured, **When** run, **Then** it reports the
   dependency/file findings this review found by hand.
3. **Given** `components.json`, **When** cleaned up, **Then** its `tailwind.config` path
   and `iconLibrary` fields match actual project configuration.

---

### User Story 3 - Config files validate themselves instead of failing silently (Priority: P2)

`vercel.json`, `tsconfig.json`, `components.json`, and `src/config.json` gain schema/
runtime validation, so a typo surfaces as a clear startup error instead of a confusing
downstream Cognito error.

**Independent Test**: introduce a malformed `src/config.json` (missing required field)
locally; confirm a clear, specific startup error names the missing field.

**Acceptance Scenarios**:

1. **Given** `vercel.json`, `tsconfig.json`, `components.json`, **When** opened with
   schema support, **Then** each offers autocomplete/inline validation via `$schema`.
2. **Given** `src/config.json` validated with `zod` at import time, **When** malformed,
   **Then** the app throws a specific, human-readable startup error.
3. **Given** `package.json` gains `engines.node`, **When** built on Vercel, **Then** the
   Node version is an explicit, version-controlled fact.

---

### User Story 4 - The guest/real-user auth boundary is provably not spoofable, and the endpoint resists abuse (Priority: P1)

Whether a client sending the synthetic `idToken: 'guest'` marker could reach the real
production database has not been traced end-to-end, and `api/turso-token.ts` has no rate
limiting.

**Independent Test**: attempt to mint a production-scoped Turso token via `idToken:
'guest'` sent directly to the endpoint; confirm it's rejected or routed only to the guest
database. Script repeated requests; confirm throttling beyond a defined threshold.

**Acceptance Scenarios**:

1. **Given** a request with `idToken: 'guest'`, **When** processed, **Then** it can only
   ever mint a guest-scoped token, enforced server-side.
2. **Given** a forged/expired real Cognito token, **When** processed, **Then** it's
   rejected before any Turso token is minted.
3. **Given** a minted token (guest or real), **When** its actual claims are inspected,
   **Then** scope, read-only restriction, and 1-hour lifetime are confirmed as issued.
4. **Given** a per-IP/per-token rate limit on `api/turso-token.ts` (owner-decided,
   proactive), **When** a client exceeds the threshold, **Then** further requests are
   rejected (e.g. HTTP 429) without affecting legitimate usage.

---

### User Story 5 - CSP is tightened and stops silently drifting between repos (Priority: P1)

CSP allows `'unsafe-inline'`/`'unsafe-eval'`/`wasm-unsafe-eval` (partly a sql.js leftover)
and must be manually kept in sync with `resumeweb`'s copy — a coupling that has already
caused two real incidents (see `docs/decisions.md`).

**Independent Test**: deliberately change this repo's CSP without updating `resumeweb`'s
copy; confirm a CI drift-detection check fails.

**Acceptance Scenarios**:

1. **Given** CSP no longer needs sql.js WASM support, **When** re-evaluated,
   **Then** `'unsafe-eval'`/`wasm-unsafe-eval` are removed unless explicitly justified.
2. **Given** a nonce/hash-based CSP investigation, **When** assessed, **Then** a decision
   on dropping `'unsafe-inline'` is recorded, implemented or not.
3. **Given** a checked-in test asserting this repo's CSP matches `resumeweb`'s copy for
   `/dashboard/:path*` (owner-decided: cheap guardrail only), **When** they drift, **Then**
   CI fails with a clear message.
4. **Given** `Strict-Transport-Security`/`Permissions-Policy` headers, **When** checked,
   **Then** their presence (or deliberate absence) is confirmed and recorded.

---

### User Story 6 - Injection/XSS/dependency vectors and the pre-publish checklist are explicitly checked (Priority: P2)

Closes the remaining "probably fine, not yet verified" items: `dangerouslySetInnerHTML`,
Cognito console hardening (MFA/password policy/lockout/self-signup), `pnpm audit`, a
full-history secret scan, a `cashpy-processor` PII spot-check, and a LICENSE file.

**Independent Test**: each checklist item has an explicit pass/fail recorded before the
repo's GitHub visibility changes.

**Acceptance Scenarios**:

1. **Given** a full grep of `src/` for `dangerouslySetInnerHTML`, **When** any usage is
   found, **Then** it's reviewed for user-controllable input.
2. **Given** the Cognito console, **When** MFA/password policy/lockout/self-signup are
   checked, **Then** the configuration and any decision to change it is recorded.
3. **Given** `pnpm audit`, **When** run, **Then** every finding is fixed or explicitly
   triaged.
4. **Given** `gitleaks` (or equivalent) across full git history, **When** run, **Then**
   the result is recorded in `docs/decisions.md`.
5. **Given** the `cashpy-processor` pipeline (separate repo), **When** spot-checked,
   **Then** equivalent PII exposure is ruled out or tracked as its own follow-up.
6. **Given** a `LICENSE` file, **When** added, **Then** it's MIT (owner-decided) and
   `package.json`'s `license` field is `"MIT"`.

### Edge Cases

- Old commits containing the real `src/config.json` mapping aren't removed by a `HEAD`
  fix — the owner must explicitly decide whether history rewrite is needed (User Story 1).
- `knip` false positives (dynamic imports, build-tool configs) get documented as config
  exceptions rather than the tool's output being ignored going forward.
- If removing `'unsafe-inline'`/`'unsafe-eval'` breaks a legitimate Vite build pattern,
  test against a production build specifically, not dev mode.
- If the CSP drift-detection CI check needs `resumeweb`'s live `vercel.json` and that repo
  is briefly unreachable, fall back to a hardcoded expected-hash comparison rather than
  making this repo's CI depend on another repo's availability.
- If rate limiting risks throttling legitimate rapid navigation, set the threshold
  generously above observed normal usage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `database.victor.*` account-GUID mapping MUST be removed from
  `src/config.json` and relocated server-side.
- **FR-002**: `package.json` MUST NOT list `better-sqlite3`, `@types/better-sqlite3`, or
  `webpack` once confirmed unused; `src/hooks/useS3.ts`, the `SQLJsDatabase` union member,
  and the `VITE_DATA_SOURCE` toggle MUST be deleted.
- **FR-003**: Exactly one ESLint config MUST exist; `components.json`'s `tailwind.config`
  and `iconLibrary` fields MUST be corrected or removed if unused.
- **FR-004**: `knip` MUST be installed, configured, and runnable via `pnpm run knip`.
- **FR-005**: `vercel.json`, `tsconfig.json`, `components.json` MUST each declare a
  `$schema` field; `src/config.json` MUST be validated against a `zod` schema at import
  time; `package.json` MUST declare `engines.node`.
- **FR-006**: A `LICENSE` file (MIT) MUST exist; `package.json`'s `license` MUST be
  `"MIT"`.
- **FR-007**: A full-history secret scan MUST be run and recorded before the repo's
  visibility changes; the Cognito self-signup setting MUST be checked and the decision
  recorded.
- **FR-008**: `api/_lib/verifyCognitoToken.ts` MUST be traced end-to-end to confirm a
  guest request can never mint a production-scoped Turso token; minted token claims MUST
  be verified directly against what's actually issued.
- **FR-009**: `api/turso-token.ts` MUST enforce a per-IP/per-token rate limit.
- **FR-010**: CSP's `'unsafe-eval'`/`wasm-unsafe-eval` MUST be removed unless justified; a
  nonce/hash-based decision for `'unsafe-inline'` MUST be recorded; a CI-enforced test
  MUST assert this repo's CSP matches `resumeweb`'s `/dashboard/:path*` copy.
- **FR-011**: `Strict-Transport-Security`/`Permissions-Policy` header presence MUST be
  confirmed and added if missing or justified as absent.
- **FR-012**: Every `dangerouslySetInnerHTML` usage MUST be reviewed; Cognito console
  hardening settings MUST be checked and recorded; `pnpm audit` MUST be run with every
  finding fixed or triaged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No real account GUID or private data from `src/config.json`'s old contents
  appears in the deployed JS bundle.
- **SC-002**: `pnpm run knip` and `pnpm audit` both run clean (or fully triaged)
  immediately after cleanup.
- **SC-003**: A guest-path request can be demonstrated to never reach the production
  Turso database under any input, and a scripted burst against `api/turso-token.ts` is
  measurably throttled.
- **SC-004**: A deliberate CSP mismatch between this repo and `resumeweb` fails CI.
- **SC-005**: Every pre-publish checklist item (secret scan, Cognito settings,
  `cashpy-processor` spot-check, LICENSE) has an explicit recorded outcome.

## Assumptions

- The `database.victor.*` mapping can be served behind `api/turso-token.ts`-style
  server-side code — confirmed during implementation, not assumed proven.
- Cognito public-client identifiers (`region`, `userPoolId`, `clientId`, `cognitoUrl`)
  remain committed as-is, per `specs/001-vercel-migration/spec.md`'s prior reasoning.
- The CSP drift-detection guardrail (owner-decided) is the only structural CSP-coupling
  change in scope — no shared-config rearchitecture or subdomain split. Changes to
  `resumeweb`'s own `vercel.json` are out of this repo's scope to implement directly, per
  the standing rule that this repo's tooling mostly touches `cashpy_v2` — see
  `docs/review/VERCEL-HARDENING-CHECKLIST.md`.
- Rate limiting starts with the simplest viable mechanism (in-memory or edge-config-backed
  counter); a heavier product like Vercel BotID stays deferred.
- This spec does not decide whether/when the repo actually goes public — it only makes
  going public a safe, deliberate choice.
- Manual, human-verification-only items (Cognito console checks, git-history scan review,
  `cashpy-processor` spot-check) are tracked in
  `docs/review/19-manual-verification.md`.
