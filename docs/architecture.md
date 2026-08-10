# Architecture

Personal finance dashboard for a single real user, plus a public guest/demo login with
sample data. Low-traffic, solo-maintained — every choice below is optimized for that,
not for scale.

## Frontend

- **Build/dev**: Vite 7, base path `/dashboard/`, output to `dist/dashboard` (see
  "Deployment" below for why).
- **Framework**: React 19.
- **Routing**: TanStack Router, file-based (`src/routes/`). `__root.tsx` holds the shell
  (nav + account corner + footer); `beforeLoad` on routes sets page titles, guards, and
  search-param validation (e.g. `/login`'s `redirect` param).
- **Data fetching/caching**: TanStack Query, mainly for the Turso auth-token fetch and
  DB-backed queries in route loaders/hooks.
- **Styling**: Tailwind v4 (`@theme` custom `shark-*` palette in `src/index.css`, no
  shadcn CSS-variable theme wired up — the stock shadcn `Button` variant colors are
  effectively unstyled here; hand-styled `shark`-palette classes are used instead).
- **UI primitives**: Radix (`dropdown-menu`, `checkbox`, `slider`, `slot`) wrapped in
  shadcn-style components under `src/components/ui/`.
- **Charts**: Recharts (KPI sparkline on the home page) plus a set of hand-rolled D3
  charts under `src/routes/summary/-plots/` and `src/routes/travels/-components/`.
- **Icons**: FontAwesome (`@fortawesome/*`) is the primary icon set; `lucide-react` and
  `@remixicon/react` are also present with a handful of usages each — see
  `docs/review/01-dependencies-and-config-hygiene.md`.
- **Animation**: `motion` (Framer Motion) for the nav wordmark reveal and home-page
  entrance animations.
- **Table**: `@tanstack/react-table` for pivot/transaction tables (Expenses, Analysis).

## Layout shell

`__root.tsx` renders three independent, always-mounted pieces — there is no shared
full-width header bar:

- **`SideBar.tsx`**: a single `fixed` nav panel spanning the full viewport height. Only
  its `width` animates (`w-14` collapsed ↔ `w-64` expanded); it never toggles between
  `fixed`/`static` and never slides via `translate`, so it can't cause layout shift or a
  cross-fade seam. Page content has a constant `pl-14` matching the collapsed width. A
  `fixed inset-0` backdrop dims the page while expanded; the nav auto-collapses on route
  change.
- **`AccountMenu.tsx`**: the avatar/sign-out dropdown (or "Log In" link), independently
  `fixed top-4 right-4`, unrelated to the nav's open/closed state.
- **`Footer.tsx`**: a minimal "Made by Victor · © year · victorvaquero.com" strip, using
  `min-h-full` (not `height`) on the content wrapper above it so it never gets stranded
  mid-page on tall content.

## Data layer

- **ORM**: Drizzle, schema in `src/db/schema.ts`, hand-written query builders per domain
  area in `src/db/queries/*.ts` (summary, expenses, travel, global).
- **Driver (current, live)**: `@libsql/client` against **Turso** (`drizzle-orm/libsql`).
  `src/services/DbService.tsx` (`setupTursoDB`) is the only DB constructor actually
  called at runtime.
- **Auth token for Turso**: the browser never holds a long-lived Turso credential. The
  Cognito ID token is exchanged for a short-lived (1h), read-only, per-database Turso JWT
  via `POST /api/turso-token` (`api/turso-token.ts`, a Vercel serverless function that
  verifies the Cognito token server-side, then calls Turso's Platform API to mint the
  token). The client caches it client-side for 55 minutes (`useDB.tsx`).
- **Two databases**: a production database (real financial data, real-login only) and a
  separate guest/demo database (sample data only), selected server-side by which Cognito
  token — real or the synthetic `guest` marker — was presented.
- **Dead code from the pre-Turso path**: `src/db/dbType.ts` still declares a
  `SQLJsDatabase` union member and `src/hooks/useS3.ts` still exists, but neither is
  referenced anywhere at runtime — the S3/sql.js path was fully cut over and removed in
  spec 002 Phase 6, and these are leftovers. See
  `docs/review/01-dependencies-and-config-hygiene.md`.

### Ingestion

A separate pipeline, `cashpy-processor` (its own repo, AWS Lambda), parses a GnuCash
export and now writes directly into the Turso production database (replacing its old
"upload a SQLite file to S3" behavior). It is out of scope for this repo's docs/specs
except where a data-layer change here required a corresponding change there.

## Auth

- **Real login**: AWS Cognito (`@aws-sdk/client-cognito-identity-provider`,
  `src/services/authService.tsx`), username/password, with refresh-token-based session
  renewal (`useAuth.ts`).
- **Guest login**: no Cognito call at all — `signInGuest()` just sets a synthetic
  `user: 'guest'`, `idToken: 'guest'` pair in persisted client state. `api/turso-token.ts`
  and `api/_lib/verifyCognitoToken.ts` special-case this marker to hand back the
  guest-database token instead of verifying a real Cognito JWT.
- **Session persistence**: `usePersistentState` (localStorage-backed) — not httpOnly
  cookies; this is a deliberate simplicity/cost tradeoff for a single-user app, not an
  oversight, but is worth re-confirming against `docs/review/04-security.md`
  periodically.

## Deployment

- **Host**: Vercel, project `cashpy-v2`, connected to this repo — push to `master` =
  production deploy, every other branch/PR = its own preview deployment. No manual
  build/upload step.
- **Domain mounting (cross-repo)**: the app is not deployed under its own domain. It is
  reachable at `victorvaquero.com/dashboard` because a **separate** Vercel project
  (`resumeweb`, the owner's personal resume/CV site, which owns the `victorvaquero.com`
  apex domain) rewrite-proxies `/dashboard/*` to this project's Vercel deployment URL,
  and re-declares its own path-scoped CSP `headers` block for that path.
  - **Not to be confused with `bro_cv_web`** (git remote `PabloVaqueroCVWeb`): an
    unrelated third-party client site (`drpablovaquero.com`) that happens to sit in a
    similarly-named local folder. Earlier docs in this repo (and at least one prior
    session) mistakenly called `bro_cv_web` "the sibling project" that owns
    `victorvaquero.com` — it does not, and this repo's tooling/config must never target
    it. See the "Cross-repo naming incident" note below.
  - **This is a real coupling, not just routing**: `resumeweb`'s CSP for `/dashboard/*`
    must be kept in sync with this repo's own `vercel.json` CSP, by hand, across two
    repos. They drifted out of sync once already — see the "Post-cutover incident" note
    in `specs/002-database-simplification/spec.md` (stale CSP on the custom domain
    silently blocked all Turso `connect-src` traffic for real logins after the Turso
    cutover, with no catchable JS error, until traced via
    `vercel inspect victorvaquero.com --json`). Any future `connect-src`/CSP change here
    needs the same change mirrored in `resumeweb`.
  - **Cross-repo naming incident (2026-08-08 → discovered 2026-08-10)**: the fix for the
    above CSP drift (commits documenting/restoring the `/dashboard` proxy) was written
    under the mistaken belief that the local `bro_cv_web` folder _was_ `resumeweb`, and
    landed in the wrong repo (`PabloVaqueroCVWeb`, i.e. `drpablovaquero.com`'s codebase)
    instead. Separately, `resumeweb`'s Vercel project had its Production Branch
    misconfigured (`main` instead of its actual default branch), which caused
    `victorvaquero.com` root to briefly serve a stale/wrong deployment; the owner fixed
    this by rolling back to the correct deployment in the Vercel dashboard. Neither
    `bro_cv_web`/`PabloVaqueroCVWeb` nor `drpablovaquero.com` is touched by this repo or
    its tooling — do not edit that repo, and do not assume it is a stand-in for
    `resumeweb` regardless of what any prior doc says. See
    `docs/review/VERCEL-HARDENING-CHECKLIST.md` for the follow-up verification steps.
  - `cashpy-v2.vercel.app` (the project's own default domain) always reflects this repo's
    `vercel.json` directly and is unaffected by that coupling — useful as a
    ground-truth check when debugging anything CSP-related on the custom domain.
- **Security headers**: set in this repo's own `vercel.json` — CSP, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy` — plus the SPA-fallback rewrite so
  client-side routes resolve on direct load/refresh.
- **Legacy AWS hosting**: the app previously deployed to an S3 bucket + CloudFront
  (distribution `E5ZMBYGUCPRWJ`). That infrastructure is verified-unused but not yet torn
  down (needs a manual step outside this repo). The unrelated `victor-mycash` S3 bucket
  (raw financial data files, feeds `cashpy-processor`) is unaffected either way.

## Spec-kit history

This project uses the spec-kit workflow (`specs/`, `.specify/`) for larger changes, under
the ground rules in `.specify/memory/constitution.md` (incremental/reversible migration,
free-tier-first, continuity of the working app, boring technology, data privacy). See
`docs/decisions.md` for the resulting decision log and `specs/` for the full detail per
feature.
