# Quickstart: Validating Repo Hygiene, Security Hardening & Public-Repo Readiness

Validation guide covering all six user stories. Most checks are command-line/grep-based
(fast, repeatable); a few require the AWS/Vercel/Turso consoles or a browser session, per
constitution Principle III and the spec's own Assumptions about manual-only items. Run
the automated checks after each relevant implementation phase, not only at the end.

## Prerequisites

- Repo cloned, `pnpm install` run.
- `.env.local` populated (see `.env.example`) for anything that needs a running dev
  server or the real Turso/Cognito credentials.
- `gitleaks` (or equivalent) available locally or in CI for US6's history scan.
- Access to: the AWS Cognito console (User Pool used by this app), the Turso dashboard/
  Platform API, and the Vercel project's environment variables.

## US1 — Private data no longer ships in the repo or the bundle (P1)

1. `git grep -n "REDACTED-ACCOUNT-GUID"` (or any other real GUID from the old
   `src/config.json`) across `src/` → expect **zero** matches after the move.
2. `pnpm build`, then `grep -r "REDACTED-ACCOUNT-GUID" dist/` → expect **zero**
   matches in the shipped bundle (SC-001).
3. Log in as the real user (or guest) locally/on a preview deploy; confirm every
   account-to-category display (Summary KPIs, Expenses pivot, Analysis filters, Travels)
   renders identically to before the change.
4. Confirm `docs/decisions.md` records the owner's explicit call on whether git history
   needs scrubbing (Acceptance Scenario 3) — this spec does not decide that call itself.

**Pass condition**: all four steps succeed.

## US2 — Dead dependencies, orphaned code, and config drift are removed and stay removed (P1)

1. `grep -c "better-sqlite3\|webpack" package.json` → expect `0` for both as runtime/dev
   dependencies (a lockfile reference during the transitional commit is fine; the final
   state should have neither).
2. `ls src/hooks/useS3.ts` → expect "No such file".
3. `grep -n "SQLJsDatabase" src/db/dbType.ts` → expect no match.
4. `grep -rn "VITE_DATA_SOURCE" src .env.example` → expect no match.
5. `pnpm run knip` → expect a clean run (or every remaining finding explicitly documented
   as a config exception, per the spec's Edge Cases).
6. `find . -maxdepth 1 -iname ".eslintrc*"` → expect no match (only `eslint.config.mjs`
   remains).
7. `pnpm build && pnpm lint` → both succeed.
8. Open `components.json`; confirm `tailwind.config` points at `tailwind.config.ts` (the
   real file) and `iconLibrary` matches actual dominant usage.

**Pass condition**: all eight steps succeed.

## US3 — Config files validate themselves instead of failing silently (P2)

1. Open `vercel.json`, `tsconfig.json`, `components.json` in an editor with JSON Schema
   support; confirm autocomplete/inline validation is active (each has a `$schema` key).
2. Temporarily rename a required key in a local copy of `src/config.json` (e.g.
   `region` → `regionX`); run the app locally; confirm a clear error naming `region` as
   missing appears at startup, not a downstream Cognito SDK error. Revert the edit
   afterward.
3. `grep -n '"node"' package.json` → confirm `engines.node` is present and accurate.

**Pass condition**: all three steps succeed.

## US4 — The guest/real-user auth boundary is provably not spoofable, and the endpoint resists abuse (P1)

1. `curl -i -X POST <deployment>/api/turso-token -H "Authorization: Bearer guest"` →
   expect `401`, no token/URL/accountConfig in the body.
2. `curl -i -X POST <deployment>/api/turso-token -H "X-Guest-Request: true"` → expect
   `200` with a token scoped to the **guest** database URL only (inspect the returned
   `url` field — must match the guest, not production, Turso database name).
3. `curl -i -X POST <deployment>/api/turso-token -H "Authorization: Bearer <expired-or-forged-JWT>"`
   → expect `401`.
4. Using a real, valid Cognito ID token: confirm the returned `url` matches the
   **production** database, and decode the minted Turso JWT's claims (e.g. via
   `jwt.io` or `jose`'s decode) to confirm read-only scope, correct database target, and
   ~1h expiry.
5. Script ~50-100 rapid POSTs to `/api/turso-token` in a loop (either branch); confirm
   requests beyond the documented threshold receive `429` with a `Retry-After` header,
   and that a single normal page-load's worth of requests never trips it.

**Pass condition**: all five steps succeed.

## US5 — CSP is tightened and stops silently drifting between repos (P1)

1. `curl -sI <deployment-url> | grep -i content-security-policy` → confirm no
   `unsafe-eval`/`wasm-unsafe-eval` token appears (already true today — confirm it stays
   true), and record the recorded nonce/hash-vs-`unsafe-inline` decision from
   `research.md` item 5 in `docs/decisions.md`.
2. Run the new CSP-drift test/script (`research.md` item 6) against the current
   `vercel.json` → expect it to pass against the committed `resumeweb` snapshot.
3. Deliberately edit `vercel.json`'s CSP value locally (e.g. add a bogus `connect-src`
   host) without updating the drift snapshot; re-run the check → expect it to fail with a
   clear message naming the mismatch. Revert the edit afterward.
4. `curl -sI <deployment-url> | grep -iE "strict-transport-security|permissions-policy"`
   → confirm both are present (or their deliberate absence is recorded per FR-011).

**Pass condition**: all four steps succeed.

## US6 — Injection/XSS/dependency vectors and the pre-publish checklist are explicitly checked (P2)

1. `grep -rn "dangerouslySetInnerHTML" src/` → record the result (expected: no matches,
   per `research.md`); if any are found, review each for user-controllable input and
   record the review outcome.
2. AWS Cognito console: check and record MFA, password policy, account-lockout, and
   self-signup settings for this app's User Pool in `docs/decisions.md`.
3. `pnpm audit` → every finding fixed or explicitly triaged (documented, not silently
   ignored).
4. `gitleaks detect --source . --log-opts="--all"` (or equivalent) → result recorded in
   `docs/decisions.md`.
5. Spot-check the `cashpy-processor` repo (separate repo, out of this repo's tree) for an
   equivalent PII-in-source concern; record the outcome (ruled out, or filed as its own
   follow-up) in `docs/decisions.md`.
6. `cat LICENSE` → confirms MIT text present; `grep '"license"' package.json` → confirms
   `"MIT"`.

**Pass condition**: all six steps have an explicit recorded pass/fail outcome (not
necessarily all "pass" — a documented, deliberate "accepted risk" also satisfies SC-005).

## Final sign-off

Per constitution Principle III: manually re-verify the golden path (login → data loads →
charts render) and the guest path in a browser after all six user stories land, on both
desktop and at least one mobile viewport (spec 004 is already in place). Record this pass
in `docs/review/19-manual-verification.md` alongside this spec's own manual-only items
(Cognito console check, git-history scan review, `cashpy-processor` spot-check) rather
than as a new, separate tracking list.
