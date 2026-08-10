# Phase 0 Research: Vercel Hosting Migration

## Decision: Cross-project mounting via `rewrites` (Vercel "multi-zones" pattern)

**Decision**: `resumeweb`'s `vercel.json` gets a `rewrites` entry that proxies
`/dashboard/:path*` to this project's Vercel production deployment URL (a stable
`*.vercel.app` alias, not the ever-changing per-deploy URL). This repo (`cashpy_v2`)
becomes its own, separate Vercel project with its own build/deploy pipeline.

**Rationale**: This is Vercel's documented, supported pattern for serving multiple
independently-deployed applications under one domain without a monorepo (Vercel calls
this "multi-zones"). Each app deploys, previews, and rolls back independently; the only
coupling is one rewrite rule in the "outer" project. This matches the user's explicit
choice (see spec Assumptions) to keep deploy pipelines decoupled. Rollback if anything
goes wrong is a one-line revert of the rewrite in resumeweb — no DNS change, no touching
this repo.

**Alternatives considered**:

- _Monorepo / single Vercel project_: rejected by explicit user choice — couples
  resumeweb's deploys to the dashboard's, more setup work, harder rollback.
- _Subdomain (`dashboard.victorvaquero.com`)_: rejected — changes the URL from the
  required `victorvaquero.com/dashboard`, not just a hosting-config change.
- _Rewrite pointing at the per-deployment URL directly_: rejected — per-deployment URLs
  change on every deploy; must target the stable production alias/domain Vercel assigns
  to the project (or a custom `*.vercel.app` alias), otherwise every dashboard deploy
  would require also updating resumeweb's config.

**Concrete mechanism**:

1. Deploy `cashpy_v2` as a new Vercel project (e.g. via `vercel link` + `vercel --prod`,
   or importing the GitHub repo through the Vercel dashboard — same one-time setup
   resumeweb already documents).
2. Note its stable production URL (Vercel assigns `<project-name>.vercel.app` by default;
   this stays constant across deploys).
3. In `resumeweb/vercel.json`, add:
   ```json
   {
     "rewrites": [
       { "source": "/dashboard", "destination": "https://<cashpy-project>.vercel.app/dashboard" },
       {
         "source": "/dashboard/:path*",
         "destination": "https://<cashpy-project>.vercel.app/dashboard/:path*"
       }
     ]
   }
   ```
   (Two entries because `:path*` alone does not match the bare `/dashboard` path with no
   trailing segment on some Vercel routing configurations — belt-and-suspenders is cheap
   here and cheaper than debugging a missing-index-route edge case in production.)
4. Redeploy resumeweb (picks up the new `vercel.json`).

**Open item flagged for implementation, not a blocker for planning**: confirm at
implementation time whether Vercel's rewrite-to-external-deployment feature requires the
target project to be on the same Vercel team/account as the source project (expected: yes,
same account already used for resumeweb) — this is a five-minute check against Vercel's
current dashboard/docs during Phase 2 implementation, not something that changes this
plan's shape either way.

---

## Decision: SPA fallback routing on the new project

**Decision**: `cashpy_v2`'s own `vercel.json` includes a rewrite that sends all
unmatched paths under `/dashboard/*` to `/dashboard/index.html`, so client-side routes
(e.g. `/dashboard/summary`) resolve correctly on direct load/refresh, not just via in-app
navigation.

**Rationale**: Vite's static build produces one `index.html`; TanStack Router handles
routing client-side after that loads. Without a fallback rewrite, a hard refresh on
`/dashboard/summary` would 404 at the host level before React ever runs. This is standard
practice for any client-routed SPA on Vercel and directly satisfies spec FR-004.

**Alternatives considered**: Vercel's zero-config static detection sometimes handles SPA
fallback automatically for some frameworks, but TanStack Router + Vite isn't one of
Vercel's auto-detected frameworks (unlike Astro/Next/etc.), so an explicit rewrite is the
reliable choice rather than hoping auto-detection guesses correctly.

---

## Decision: Node version pin

**Decision**: Add `.nvmrc` and `package.json` `engines.node` pinned to Node 24 (the major
already used in this development environment), rather than jumping to Node 26 just
because resumeweb uses it.

**Rationale**: Vercel reads `engines.node` (or `.nvmrc`) to pick its build Node version.
Pinning avoids Vercel silently defaulting to whatever its platform default is (which
changes over time) and avoids an untested jump to a newer major with no local validation.
Node 24 is an actively-supported LTS-track version; there's no requirement in this app
that needs Node 26 specifically.

**Alternatives considered**: Match resumeweb's Node >= 26 exactly, for consistency across
the two repos — rejected for this spec since it's an unforced, unrelated upgrade; revisit
in spec 003 (modernization) if there's a concrete reason.

---

## Decision: Security headers

**Decision**: Port resumeweb's `vercel.json` header block (CSP, X-Frame-Options,
X-Content-Type-Options, Referrer-Policy) to this project's own `vercel.json`, adjusting
the CSP's `connect-src` to allow the AWS endpoints this app actually calls (Cognito IDP,
Cognito Identity, S3) since this app — unlike resumeweb — makes outbound API calls. Also
add `'wasm-unsafe-eval'` to `script-src`, required for the browser to compile the sql.js
WebAssembly binary this app currently depends on for its client-side SQLite database.

**Rationale**: Satisfies spec FR-006 (security headers baseline). resumeweb's CSP is
`connect-src 'self'` only, appropriate for a fully static site with no API calls; this
app needs Cognito/S3 origins allowed or authentication and data fetching will be silently
blocked by CSP in production despite working in local dev (dev has no CSP applied).
`'wasm-unsafe-eval'` was discovered missing during live verification (US2): sql.js's WASM
module failed `WebAssembly.instantiateStreaming`/`instantiate` under the initial CSP,
breaking all data loading post-login. Deferred to spec 001 rather than spec 002 (database
simplification) because spec 001's scope is "the existing app works identically on the
new host" — spec 002 may remove the sql.js/wasm dependency entirely, at which point this
CSP allowance should be removed as a one-line follow-up, not carried forward speculatively.

**Alternatives considered**: Reuse resumeweb's CSP verbatim — rejected, would break
login/data-fetching in production (a real risk, not hypothetical, since local `vite dev`
doesn't enforce any CSP and this would only surface after deploy). Wait for spec 002 to
land before fixing the wasm CSP block — rejected, would leave spec 001 in a state where
the migrated app is reachable but non-functional for real use, contradicting spec 001's
own success criteria.

---

## Decision: Legacy AWS deploy scripts removal

**Decision**: Remove `clean` and `deploy` scripts from `package.json` (currently
`aws s3 rm`/`aws s3 sync` + `cloudfront create-invalidation`) once the Vercel deployment
is verified — same approach resumeweb took (documented in its README as "removed from
package.json; if that infrastructure is ever decommissioned, it needs to happen
separately in the AWS console/CLI, outside this repo").

**Rationale**: Directly satisfies FR-010. Keeps the script surface honest about how
deploys actually happen (git push), avoiding a stale script someone might run by habit
post-migration.

**Alternatives considered**: Keep scripts as a documented rollback path — rejected;
Principle I (reversibility) is satisfied by the old CloudFront/S3 infrastructure staying
alive and untouched during the verification window, not by keeping a deploy script whose
whole point is to stop being used. The actual AWS resources aren't deleted by this spec,
only the npm script that pushes new builds to them.
