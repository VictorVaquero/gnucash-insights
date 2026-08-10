# Security (in depth)

**Priority**: P0/P1 · **Status**: Planning done — see specs/005-repo-hygiene-security-and-public-readiness

## Why this matters

Deeper than a general audit — oriented specifically toward "make sure the app is not
vulnerable to hacks or bots," per the explicit ask. Complements
[03-secrets-and-public-repo-readiness.md](03-secrets-and-public-repo-readiness.md), which
covers what's *in the repo*; this doc covers what's *reachable at runtime*.

## Current state (confirmed findings)

**Injection & XSS**
- Drizzle's query builder is parameterized by construction — no raw string-concatenated
  SQL found in a first pass, not yet exhaustively audited.
- Not yet confirmed: whether `dangerouslySetInnerHTML` appears anywhere in `src/`.
- **[confirmed]** CSP's `script-src`/`style-src` both include `'unsafe-inline'`, and
  `script-src` also allows `'unsafe-eval'`/`wasm-unsafe-eval` (added for the now-removed
  sql.js WASM path).

**Auth & session**
- Guest login's synthetic `idToken: 'guest'` marker: the server-side check in
  `api/_lib/verifyCognitoToken.ts` has not been traced end-to-end for whether a client
  sending `idToken: 'guest'` could reach the *production* database rather than guest's.
- Turso token scope/lifetime (1h, intended read-only, database-scoped): intent confirmed
  in code, not yet verified against Turso's actual issued-token claims.
- Session storage is `usePersistentState` (localStorage), not httpOnly cookies — a known,
  deliberate tradeoff (see `docs/decisions.md`) for a single-user app; means any XSS
  becomes token theft with no httpOnly barrier.
- Cognito MFA/password-policy/lockout settings: not yet checked against the AWS console.

**Headers & transport**
- **[confirmed]** `vercel.json` sets CSP, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`. `Strict-Transport-Security` and `Permissions-Policy` presence not yet
  checked.
- **[confirmed] Cross-repo CSP coupling**: `resumeweb`'s `vercel.json` re-declares CSP
  for `/dashboard/:path*` and must stay in sync with this repo's `vercel.json` by hand.
  Already caused one real incident (silent Turso `connect-src` block on the custom domain
  post-cutover — see `specs/002-database-simplification/spec.md`), and a second incident
  where the fix was committed to the wrong repo (`bro_cv_web`/`PabloVaqueroCVWeb`, an
  unrelated third-party site at `drpablovaquero.com` — see `docs/architecture.md`'s
  "Cross-repo naming incident" note and `docs/review/VERCEL-HARDENING-CHECKLIST.md`).
  `bro_cv_web` is **not** the domain owner for `victorvaquero.com` and must never be
  treated as such.

## Goals

- No injection/XSS vector exists that hasn't been explicitly checked.
- Guest-vs-real-user auth boundary is provably not spoofable, not just "probably fine."
- The app degrades gracefully under bot/scripted abuse rather than incurring unbounded
  cost or downtime.
- The cross-repo CSP coupling either goes away or gets a concrete guardrail so it can't
  silently drift again.

## Recommended approach

**Bot & abuse resistance** (new emphasis, not in the original checklist):
- `api/turso-token.ts` is a public serverless endpoint. Even gated by a valid Cognito
  token, a scripted client that automates Cognito sign-in — or repeatedly hits the guest
  path, which bypasses Cognito entirely — could generate unbounded Turso read traffic.
  **Decided 2026-08-10: add lightweight rate limiting proactively now**, rather than
  waiting for evidence of abuse (diverges from this doc's original "wait for evidence"
  default). A simple per-IP/per-token counter on the token-minting endpoint specifically
  is the cheapest version — no need for Vercel BotID or anything heavier at this stage.
- **Vercel BotID** (bot-detection/verification product) is a possible fit if bot traffic
  becomes a real, evidenced problem — explicitly **not** recommended pre-emptively for an
  app this size; note it here so it's evaluated with real data later, not adopted on
  spec.
- `robots.txt` (see [05-seo.md](05-seo.md)) is not a security control — noting the
  distinction explicitly so it doesn't get mistaken for bot protection when this list is
  actioned.

**CSP coupling — decided 2026-08-10: cheap guardrail only (option b).** Not worth the
structural investment of (a) shared-config-across-two-independent-Vercel-projects or
(c) a subdomain split. Add a checked-in test in each repo asserting the two CSP strings
match (fetch the other repo's `vercel.json` at test time, or hardcode an expected hash)
so drift fails CI instead of failing silently in production, as happened in the
2026-08-10 incident. Options (a)/(c) stay noted here but are not being pursued.

## Phased plan

1. **Phase 1 — audit, no code changes**: trace the guest-token spoofing question in
   `api/_lib/verifyCognitoToken.ts` end-to-end; verify Turso token claims directly (not
   just the minting code's intent); grep for `dangerouslySetInnerHTML`; check
   `Strict-Transport-Security`/`Permissions-Policy` presence; check Cognito console
   settings (MFA, password policy, lockout).
2. **Phase 2 — CSP tightening**: re-evaluate whether `'unsafe-eval'`/`wasm-unsafe-eval`
   is still needed post-sql.js-removal (likely not); investigate nonce/hash-based CSP to
   drop `'unsafe-inline'` if Vite's build output allows it without excessive complexity.
3. **Phase 3 — CSP-coupling guardrail**: add the cross-repo drift check (option b) —
   the decided, sole option; no structural fix (option a/c) planned.
4. **Phase 4 — rate limiting**: add lightweight per-IP/per-token rate limiting to
   `api/turso-token.ts` proactively — decided, not gated on usage-volume evidence.
5. **Phase 5 — dependency/supply-chain**: `pnpm audit` pass, feed into
   [09-developer-automation.md](09-developer-automation.md)'s Dependabot item for
   ongoing coverage rather than a one-time check.

## Open decisions — decided 2026-08-10

- **CSP-coupling: cheap drift-detection guardrail only (option b).**
- **Rate limiting: add proactively now**, not gated on evidence of abuse.
