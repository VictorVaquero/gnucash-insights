# Phase 0 Research: Repo Hygiene, Security Hardening & Public-Repo Readiness

Each item below resolves a "NEEDS CLARIFICATION" from `plan.md`'s Technical Context, or an
open technical question the spec's Assumptions flagged as "confirmed during
implementation, not assumed proven." Findings come from reading the actual code (not the
`docs/review/` docs alone, which predate this pass and are sometimes already stale).

## 1. Where does `database.victor.*` actually need to live?

**Decision**: Have `api/turso-token.ts` return the account-GUID mapping alongside the
existing `{ url, token, expiresAt }` response, sourced from a new Vercel environment
variable (`ACCOUNT_CONFIG_VICTOR`, JSON-encoded) for the real-user branch, and a small
hardcoded object for the guest branch (guest values — `Account29`, `Account33`, etc. —
are synthetic demo IDs, not private data, so they don't need to move). The client stops
statically importing `database.*` from `src/config.json` and instead reads it off the
token-fetch response it already makes on login (`fetchTursoToken` in
`src/services/tursoService.ts`), caching it the same way it already caches the token.

**Rationale**: `getConfig()` (`src/db/utils.ts`) feeds account GUIDs directly into
Drizzle query builders (`src/db/queries/summary.ts`, `travel.ts`, and several
`-plots`/`-*Block.tsx` files under `src/routes/summary/`) that execute **client-side**
against Turso via `@libsql/client` over HTTP — there is no server-side query proxy (the
existing `turso-token-endpoint.md` contract's "Non-goals" section is explicit: this
endpoint issues a token only, it never executes SQL). That means the mapping must reach
the browser at runtime regardless of where it's _stored_ — moving it "server-side" can
only mean "not committed to git / not baked into the static JS bundle at build time," not
"the browser never sees it." Piggybacking on the already-authenticated `turso-token`
call means no new endpoint, no new auth boundary, and the value is fetched once per
session rather than shipped in every JS bundle indexed by search engines/GitHub code
search once the repo is public.

**Alternatives considered**:

- _New dedicated `api/account-config.ts` endpoint_: rejected — would duplicate the same
  Cognito/guest branching `turso-token.ts` already does, for no real benefit over
  extending one response shape.
- _Vite build-time env var (`import.meta.env.VITE_ACCOUNT_CONFIG_VICTOR`)_: rejected —
  build-time env vars still get inlined into the static JS bundle at build time, which is
  exactly what SC-001 says must not happen (a public repo's build output would still leak
  it, even if the source no longer does).
- _Keep it in `src/config.json` but `.gitignore` it, generating it from an env var during
  `vercel build`_: rejected as more moving parts than extending an endpoint that's
  already called on every login, for no added benefit.

## 2. `src/config.json` zod schema shape (post-move)

**Decision**: Once `database.*` moves out (item 1), `src/config.json`'s schema shrinks to
just the four Cognito public-client fields (`region`, `userPoolId`, `clientId`,
`cognitoUrl`) — already reasoned as safe-to-commit in `specs/001-vercel-migration/spec.md`
FR-007. Define a `zod` object schema for exactly these four required strings, validate
once at `src/config.json`'s single client-side import site
(`src/services/authService.tsx`), and throw a descriptive `Error` (naming the specific
missing/malformed field via `zodError.issues`) before `cognitoClient` is constructed —
matching FR-005/User Story 3's "clear startup error instead of a confusing downstream
Cognito error."

**Rationale**: `src/db/utils.ts`'s `import config from "@/config.json"` (the other
current import site) goes away entirely once `getConfig()` reads from the token-fetch
response instead — so there's exactly one import site left to validate at, not two.

**Alternatives considered**: validating separately in both `authService.tsx` and
`db/utils.ts` — moot once item 1 removes the second import site.

## 3. Rate limiting mechanism for `api/turso-token.ts`

**Decision**: In-memory per-IP token-bucket/fixed-window counter inside the function
module scope (a plain `Map<string, { count: number; resetAt: number }>` at module level,
not per-request), returning `429` with a `Retry-After` header once a client exceeds a
generous threshold (exact number decided at `/speckit-tasks`/implementation, per the
spec's edge case about not throttling legitimate rapid navigation). IP is read from
Vercel's `x-forwarded-for` (or `x-real-ip`) request header.

**Rationale**: Vercel's Fluid Compute (the platform default — see the Vercel session
context) reuses warm function instances across concurrent requests rather than spinning
up one instance per request, so an in-memory counter persists usefully across a burst
from the same client far more often than classic one-request-per-instance serverless
would suggest. This matches the spec's Assumption ("simplest viable mechanism... a
heavier product like Vercel BotID stays deferred") and needs no new paid service, no new
Vercel Marketplace integration, and no schema/infra to provision — appropriate for a
single-real-user app under constitution Principle II (cost-consciousness).

**Alternatives considered**:

- _Vercel Marketplace Redis/Upstash-backed counter_: rejected as unnecessary weight for
  current traffic (one real user + guest demo); revisit only if evidence of real abuse
  appears (mirrors the spec's own BotID deferral reasoning).
- _Vercel Edge Config_: rejected — Edge Config is optimized for infrequent-write/frequent
  read config data, not a fast-changing per-request counter; would need external writes
  from the function anyway, adding latency for no benefit over an in-memory counter at
  this scale.
- **Known limitation, accepted**: an in-memory counter resets on a cold start and is not
  shared across concurrent regions/instances, so it's a best-effort throttle, not a hard
  guarantee — acceptable for "degrade gracefully under bot/scripted abuse" (spec Goal),
  not for a strict SLA.

## 4. Guest/real-user auth boundary: is it already provably safe?

**Decision**: No code change needed for the boundary itself — trace confirms it's already
correct. Document the trace formally (a written trace note in this spec's tasks/plan, plus
a small regression test) rather than changing `api/turso-token.ts`'s branching logic.

**Rationale** (full trace, read directly from the current code):

- `src/services/tursoService.ts`'s `fetchTursoToken` converts the client's synthetic
  `idToken: 'guest'` marker into an `X-Guest-Request: true` header and sends **no**
  `Authorization` header at all in that case; for any other `idToken`, it sends
  `Authorization: Bearer <idToken>` and no guest header.
- `api/turso-token.ts` branches purely on which headers are present: `Authorization:
Bearer ...` → always calls `verifyCognitoIdToken` (`api/_lib/verifyCognitoToken.ts`,
  real Cognito JWKS signature/issuer/audience check) before minting a token scoped to
  `prodDatabaseName`; otherwise, if `X-Guest-Request: true` → mints a token scoped to
  `guestDatabaseName` with **no** verification call at all; otherwise → `401`.
- There is no code path where the literal string `"guest"` reaches
  `verifyCognitoIdToken` as a token to verify (the client never sends it as a Bearer
  token), and no code path where the guest branch touches `prodDatabaseName`/
  `prodDatabaseUrl` — the two branches mint against disjoint, hardcoded env-var-sourced
  database identifiers. Even a client that hand-crafts an HTTP request with
  `Authorization: Bearer guest` would hit `verifyCognitoIdToken`, which calls `jose`'s
  `jwtVerify` against Cognito's real JWKS — the string `"guest"` is not a well-formed JWT
  and fails signature verification, yielding `401` before any Turso token is minted.
- **New in scope for this spec**: a small integration/unit test asserting this (POST with
  `Authorization: Bearer guest` → 401; POST with `X-Guest-Request: true` → guest-scoped
  token only) so the boundary is regression-tested, not just traced once by hand.

**Alternatives considered**: none — the existing design already satisfies FR-008/User
Story 4's acceptance scenarios 1–2; scenario 3 (verify minted token claims match intent)
requires calling the real Turso Platform API during implementation/testing, tracked as a
task rather than a design decision.

## 5. CSP: current state vs. spec's description

**Decision**: `'unsafe-eval'`/`wasm-unsafe-eval` are **already removed** — confirmed via
`vercel.json` (current `script-src 'self' 'unsafe-inline'`, no `eval` token) and
`specs/002-database-simplification/tasks.md`, which recorded their removal once sql.js
left the bundle. The spec's User Story 5 / FR-010 description (written from
`docs/review/04-security.md`, which predates that cleanup) is stale on this point. Only
two things remain genuinely open for this spec:

1. A nonce/hash investigation for dropping `script-src`/`style-src`'s remaining
   `'unsafe-inline'`.
2. The CSP-drift CI guardrail against `resumeweb`.

**Rationale for `'unsafe-inline'` investigation approach**: Vite's production build emits
no inline `<script>` content by default (entry points are external `<script type=module
src=...>` tags) — the main risk is Tailwind's injected `<style>` tag(s) and any
React-injected inline styles, plus Storybook/dev-only patterns that don't ship to
production. A nonce requires per-response header generation, which means the SPA's
`index.html` can no longer be served as a static asset — it would need to become a
Vercel Function response (or Vercel's Edge Middleware-injected nonce) to stamp a
per-request nonce into both the CSP header and the HTML. That's a materially bigger
change than this spec's other items. **Recommendation to record as the decision during
implementation** (not pre-decided here, since it needs a real production-build test per
the spec's own Edge Cases): try a `style-src` hash-based allowlist first (cheap, static,
no per-request generation) for any unavoidable inline styles; leave `script-src
'unsafe-inline'` only if nothing inline actually needs it (likely already true — worth
testing removal outright before reaching for nonce/hash machinery at all).

**Alternatives considered**: full nonce-based CSP now — deferred as disproportionate
effort unless the cheap tests above fail; tracked as an explicit recorded decision
(pass/fail), not silently dropped, per FR-010.

## 6. CSP-drift CI guardrail mechanism

**Decision**: A checked-in test (e.g. `scripts/check-csp-drift.*` run in CI, or a
Vitest/Node test if item 8 below adds a test runner) that compares this repo's
`vercel.json` CSP string against a **hardcoded expected copy of `resumeweb`'s**
`/dashboard/:path*` CSP string, committed in this repo (e.g.
`scripts/resumeweb-dashboard-csp.snapshot.txt` or inline in the test), with a comment
explaining it must be updated by hand whenever either repo's CSP changes.

**Rationale**: `resumeweb` is a separate, unrelated repository not reachable from this
sandbox/CI environment (confirmed: it's not among this session's accessible working
directories, and per `docs/architecture.md`/constitution, this repo's tooling must not
reach into or assume access to sibling repos). The spec's own Edge Cases anticipated
exactly this ("if the CSP drift-detection CI check needs `resumeweb`'s live `vercel.json`
and that repo is briefly unreachable, fall back to a hardcoded expected-hash comparison")
— a live cross-repo fetch in CI would need `resumeweb`'s repo checked out or a live HTTP
call to production, either of which makes this repo's CI depend on another repo's
availability/access, explicitly ruled out by the Assumptions ("no shared-config
rearchitecture"). A hardcoded snapshot means: (a) this repo's CI never depends on
`resumeweb`'s availability, (b) a deliberate CSP change here fails the guardrail loudly
until the snapshot is updated by hand — which is the intended friction, forcing the
`resumeweb` side to be updated too — and (c) implementing this is a same-repo, same-PR
change, matching the constitution's standing rule that this repo's tooling mostly touches
`cashpy_v2` itself.

**Alternatives considered**: live `fetch()` of `resumeweb`'s deployed `vercel.json` or
production headers during CI — rejected per the Edge Case's own fallback guidance and the
cross-repo-availability coupling it would introduce; a git submodule or shared npm
package for CSP config — rejected as the "shared-config rearchitecture" the Assumptions
explicitly rule out of scope.

## 7. `Strict-Transport-Security` / `Permissions-Policy`

**Decision**: Add `Strict-Transport-Security: max-age=63072000; includeSubDomains;
preload` and a conservative `Permissions-Policy` (deny-by-default for
camera/microphone/geolocation/payment — none of which this app uses) to `vercel.json`'s
existing `headers` block, alongside the current `X-Frame-Options`/
`X-Content-Type-Options`/`Referrer-Policy`/CSP entries.

**Rationale**: Confirmed absent from the current `vercel.json` (grep across the repo
found no `Strict-Transport-Security`/`Permissions-Policy` occurrences outside `docs/`).
Vercel serves all production traffic over HTTPS already (custom domain via `resumeweb`'s
proxy, and `cashpy-v2.vercel.app` directly), so HSTS costs nothing functionally and closes
a real downgrade-attack gap now that the app is moving toward a public, real-domain
surface. `preload` submission itself is a separate, external, one-way action (submitting
the domain to browser preload lists) — out of scope for this spec to actually submit,
but the header is still correct to set (it's a no-op without submission, not harmful).

**Alternatives considered**: omitting HSTS because `resumeweb` (not this repo) owns the
apex domain's TLS termination for the custom-domain path — rejected; the header should be
present on this repo's own responses regardless (defense in depth, and it's still
correct/needed for the `cashpy-v2.vercel.app` domain directly).

## 8. `knip` configuration approach

**Decision**: Add `knip` as a devDependency with a minimal `knip.json`/`knip.config.ts`
at the repo root, ignoring known-intentional "unused-looking" files that are actually
build/tool config (`vite.config.ts`, `tailwind.config.ts`, `.storybook/*`,
`vitest`/`storybook` config, `src/routeTree.gen.ts` — a TanStack Router-generated file)
via `knip`'s `ignore`/`entry` config rather than suppressing findings ad hoc. Wire as
`"knip": "knip"` in `package.json` scripts (`pnpm run knip`).

**Rationale**: matches FR-004 and the spec's Edge Case ("knip false positives... get
documented as config exceptions rather than the tool's output being ignored"). Running it
after the Phase-1 mechanical cleanup (item 9 below) means its first real run should
report the dead-code items this research already found by hand as already-fixed, and
surface anything the manual grep sweep missed (per `docs/review/01`'s own framing: manual
grep is "bad at" catching unused-exports-within-used-files).

## 9. ESLint config consolidation

**Decision**: Keep `eslint.config.mjs` (the flat config — ESLint 9's default and the only
one `eslint .` actually loads today; `.eslintrc.cjs` is dead weight, silently not
executed). Delete `.eslintrc.cjs`. Port over the rule coverage it _was_ providing that
`eslint.config.mjs` currently lacks: `eslint-plugin-react-hooks`'s recommended rules,
`eslint-plugin-react-refresh`'s `only-export-components` rule, and
`eslint-plugin-storybook`'s recommended rules — all three plugins are already
`devDependencies` but only wired into the inactive legacy config.

**Rationale**: Confirmed via `ls`/`cat` — ESLint 9 (installed: `^9.20.0`) uses flat
config (`eslint.config.mjs`) by default and does not read `.eslintrc.*` unless
`ESLINT_USE_FLAT_CONFIG=false` is set, which nothing in this repo's scripts sets. That
means today's `pnpm run lint` silently does **not** enforce React Hooks rules, the
Storybook plugin's rules, or the fast-refresh-export rule — a real (if narrow) gap
uncovered by this consolidation, not just a duplicate-file cleanup. Fixing it is in scope
per FR-003 ("exactly one ESLint config MUST exist"), read together with the spec's
overall goal that config drift stop misleading whoever (human or AI agent) trusts it.

**Alternatives considered**: keep `.eslintrc.cjs` and delete the flat config — rejected;
flat config is ESLint's supported-going-forward format and is the one actually active.

## 10. `components.json` fixes

**Decision**: Fix `tailwind.config` from `"tailwind.config.js"` to `"tailwind.config.ts"`
(the actual file); fix `iconLibrary` from `"lucide"` — confirmed `@fortawesome/*` is the
dominant icon library (grep: FontAwesome used far more broadly than `lucide-react`'s 2
files or `@remixicon/react`'s 1 file). Per `docs/decisions.md`'s recorded owner call
("wire up the shadcn CSS-var theme properly rather than dropping it"), `components.json`
stays (shadcn CLI tooling is being kept, per spec 007's scope) — this spec only fixes its
two stale fields, it does not resolve the three-icon-library question itself (that's
spec 007's `13-component-library-and-design-system.md` scope, cross-referenced not
duplicated here).

**Rationale**: Both fields are demonstrably wrong today (`tailwind.config.js` doesn't
exist; `iconLibrary: "lucide"` doesn't match actual usage), matching FR-003 exactly. This
spec does not attempt to consolidate the three icon libraries into one — that's a larger
design-system decision explicitly owned by spec 007, out of this spec's hygiene/security
scope.

## 11. `engines.node` — already present

**Finding, not a decision**: `package.json` already declares `"engines": { "node":
">=24" }` — FR-005's `engines.node` requirement is **already satisfied** (likely landed
alongside a prior spec's Vercel setup work, ahead of `docs/review/02`'s writeup, which
still describes it as missing). No action needed here beyond confirming it stays accurate
if the Node version target changes.

## 12. `pnpm audit` / secret scan / Cognito console / `cashpy-processor` — tooling notes

**Decision**: `gitleaks` is not installed locally or in this repo's toolchain today (`git
log` filename-pattern scan already done per `docs/review/03`, confirmed clean, but that's
not a content scan). Run `gitleaks detect --source . --log-opts="--all"` (or equivalent)
as a one-off local/CI step — no need to add it as a permanent dependency/CI gate for this
spec (the spec frames this as a pre-publish checklist item, not continuous tooling, per
`docs/review/03`'s "treat as a pre-publish checklist to run once" framing). Cognito
console checks (self-signup, MFA, password policy, lockout) and the `cashpy-processor`
PII spot-check are human-only actions with no code artifact in this repo — they get
recorded in `docs/decisions.md` (per FR-007) and tracked in
`docs/review/19-manual-verification.md` (per the spec's own Assumptions), not implemented
as code/tests.

**Rationale**: matches the spec's explicit framing throughout (Assumptions: "manual,
human-verification-only items... are tracked in `docs/review/19-manual-verification.md`")
and `docs/review/03`'s recommendation to treat the whole secrets/publish checklist as a
one-time pre-publish pass rather than continuous CI.

## 13. LICENSE

**Decision**: Add a standard MIT `LICENSE` file at the repo root (owner name + current
year) and set `package.json`'s `"license": "MIT"` (currently absent from `package.json`).

**Rationale**: Directly decided already in `docs/decisions.md` ("License: MIT") — purely
mechanical, no further research needed.
