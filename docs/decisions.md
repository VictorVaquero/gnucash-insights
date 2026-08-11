# Decisions

A condensed log of the significant, deliberate decisions behind the current
architecture, newest first. Full reasoning (alternatives considered, cost comparisons)
lives in each spec's `research.md`/`spec.md` under `specs/`; this is the "what and why,"
not the full writeup. Governing ground rules for all of these:
`.specify/memory/constitution.md`.

## Spec 006 US4: D3-based charts remain hover-only, keyboard access not fixed (2026-08-10)

**Decision**: `research.md` item 26 planned to fix hover-only chart interactions by
adding Recharts' `accessibilityLayer` prop everywhere. That fix landed on the one place
it actually applies — `src/components/charts/BarPlot.tsx`'s `RechartsBarChart` (T057),
which also covers its two consumers, `DetailedIncomeBarPlot.tsx` and
`DetailedExpensesBarPlot.tsx`. It does **not** apply to the other charts named in
T058/T059 — `src/routes/summary/-plots/AssetAccountsPlot.tsx`,
`IncomeExpensesPlot.tsx`, `MonthDetailedExpensesPiePlot .tsx`, everything under
`src/routes/travels/-components/`, and `src/routes/analysis/-components/
TransactsPlot.tsx` — because none of them use Recharts. They're hand-rolled D3 SVG
line/area/pie charts (`src/routes/summary/-plots/Tooltip.tsx` wires the shared tooltip
purely through `pointermove`/`pointerleave`/`click` D3 event listeners on the `<svg>`
ref), so there is no Recharts primitive to opt into — `accessibilityLayer` doesn't
exist on a hand-rolled `<svg>`.

**Why left unfixed rather than reworked**: matches research.md item 26's own
"Alternatives considered" — bespoke per-chart keyboard handlers were explicitly rejected
as more code than Recharts' own primitive and less "boring/well-supported"
(Constitution Principle IV). Building custom keyboard interaction for ~10 D3 charts is a
materially larger scope than this spec's stated purpose (automation/quality-gate
infrastructure, not a chart-library migration or bespoke a11y engineering pass).
Recording this here per spec 006 T064's instruction to log known exceptions rather than
silently disable a check — `@axe-core/react`/`vitest-axe` won't catch this class of gap
(missing keyboard equivalents for a mouse-only interaction isn't a DOM-structure
violation axe-core flags), so it's an intentionally accepted gap, not a passing check
with hidden scope.

**Revisit if**: the app's D3 charts are ever replaced with Recharts (or another
keyboard-accessible charting lib) for other reasons, or a future spec is explicitly
scoped to chart keyboard accessibility.

## Spec 005 US6: Pre-publish checklist — injection/XSS/dependency vectors (2026-08-10)

**T037 — `dangerouslySetInnerHTML` grep**: `grep -rn "dangerouslySetInnerHTML" src/`
returns zero matches. No usage to review. **Pass.**

**T039 — `pnpm audit`**: Baseline (after US2's dead-dependency removal) was 115
findings (3 critical / 61 high / 41 moderate / 10 low). `pnpm audit --fix` was tried
first and rejected: it wrote an unbounded `pnpm-workspace.yaml` overrides block that
cascaded into major-version jumps for build tooling (storybook 8→10, vite 7→8) and
produced new unmet-peer-dependency errors — not a "safe" fix, reverted immediately.

Root-caused the two production-reachable criticals by hand instead:

- `drizzle-orm` (direct prod dependency, used in `src/db/*`): SQL-identifier-escaping
  vulnerability, fixed upstream in `0.45.2`. Bumped `package.json`'s
  `drizzle-orm` from `^0.36.4` to `^0.45.2` directly (a normal semver-compatible
  dependency bump, not an override) — verified with `tsc --noEmit` and a full
  `vite build`, both clean.
- `fast-xml-parser` (transitive, via `@aws-sdk/client-cognito-identity-provider` →
  `@aws-sdk/core` → `@aws-sdk/xml-builder`, pinned by AWS at a vulnerable version
  regardless of which SDK release is installed) and `seroval` (transitive, via
  `@tanstack/react-router` → `@tanstack/router-core` — genuinely shipped in the
  browser bundle, not just the devtools package): both pinned via a targeted
  `pnpm.overrides` block in `package.json` (`fast-xml-parser: >=5.5.7`,
  `seroval: >=1.5.3`), each verified individually with `tsc --noEmit` + `vite build`
  before moving to the next. Also overrode `tar: >=7.5.19` (used only by the
  `vercel` CLI devDependency, not shipped) to close the remaining critical at zero
  extra risk.

Result: **0 critical** (was 3), high 61→47, moderate 41→37, low unchanged at 10 —
all fixed without any breaking version bump.

**Remaining findings, triaged and accepted**: everything left is a transitive
dependency of build/dev-only tooling — `storybook`, `vite`, `@vercel/node`/`vercel`
CLI, `eslint`-adjacent packages (`vite`, `rollup`, `postcss`, `picomatch`, `fast-uri`,
`nanoid`, `ajv`, `ws`, `serialize-javascript`, `webpack`, `diff`, `@babel/core`).
Confirmed via `pnpm why <pkg> --prod` that none of these resolve through a production
dependency chain — they exist only in `node_modules` for local dev/build, never in
the deployed Vercel Function bundle or the Vite-built browser bundle. Fixing the
remainder requires major-version migrations (storybook 8→10, vite 7→8) with their own
breaking-change review, judged out of scope for this hardening pass; deferred as a
follow-up, not a silent gap.

**Side fix**: `pnpm exec eslint .` was returning 20 errors (`no-undef` on `console`/
`process`/`fetch`) in `scripts/*.mjs` — a config gap from earlier in this spec (T023/
T028 added those scripts without a Node-globals block). Added a
`{ files: ['scripts/**/*.mjs'], languageOptions: { globals: {...} } }` block to
`eslint.config.mjs`. `eslint .` now: 0 errors, 7 pre-existing warnings unrelated to
this spec.

**T038 — AWS Cognito console check (MFA/password-policy/lockout/self-signup) —
RESOLVED (owner-verified via console, 2026-08-10)**: attempted via AWS CLI first
(`aws cognito-idp describe-user-pool --user-pool-id eu-west-3_VHPSFHPrK`); the
authenticated identity (`arn:aws:iam::397704334393:user/development`) got
`AccessDeniedException` — it lacks `cognito-idp:DescribeUserPool`. Rather than
grant that read permission, the owner checked the AWS Cognito console directly
for User Pool `eu-west-3_VHPSFHPrK` (region `eu-west-3`) and confirmed all four
settings are already in the intended safe state:

- **MFA**: off/optional (not required) — consistent with the app's login UI,
  which has no MFA step.
- **Password policy**: standard Cognito defaults — nothing weakened.
- **Account lockout / threat protection**: off — a deliberate cost trade-off
  for a small personal-use pool, not an oversight.
- **Self-service sign-up**: **disabled** — the security-relevant one, since
  this app is meant for owner + guest-demo login only; an open self-signup
  would have let anyone register a real account.

No changes were needed. Owner-verified, closing this item.

**T040 — `gitleaks` full-history scan**: `gitleaks` wasn't installed system-wide;
downloaded the official `v8.30.1` portable binary from GitHub releases into the
session scratchpad (not committed, not installed system-wide) rather than requiring
a `sudo pacman -S`. Ran `gitleaks detect --source . --log-opts="--all"` against the
full local repo history: **63 commits scanned, no leaks found.** Confirms US1's git-
history scrub (the account-GUID/secrets removal) was effective and no other secrets
exist anywhere in history. Scratchpad binary and report deleted after the run.

**T041 — `cashpy-processor` PII-in-source spot-check — finding filed as follow-up,
NOT ruled out**: `cashpy-processor` (`VictorVaquero/cashpy-processor`, currently
**private** on GitHub — confirmed via `gh repo view`) has real, unanonymized personal
data checked into its test fixtures: `tests/data/cash/accounts.csv`,
`transactions.csv`, `splits.csv`, `cash.db`, and `tests/data/gnucash.gnca` all contain
real third-party names (e.g. "Cesar", "Berru", "Gerardo") as GnuCash account names,
plus real transaction descriptions, dates, and monetary amounts — the same category
of PII this spec's US1 already removed from `cashpy_v2` itself. Notably, the same
folder contains `tests/data/cash/anonimize` — a SQL script that _would_ replace real
account names/memos with synthetic ones (`Account1`, `Trip 1`, etc.) and randomize
values — but the currently-committed fixtures show the real names, not the
anonymized output, meaning the script exists but was never applied to what's checked
in. No CLI/`git filter-repo` action was taken on `cashpy-processor` in this session:
it's a separate repo with real third-party PII in its history, a materially different
and more sensitive situation than the CSP fix made earlier in this spec, and the
owner should decide the remediation approach (re-run the anonymize script and rewrite
history, or keep the repo private indefinitely) rather than have it done unilaterally.
**Filed as an explicit open follow-up, not "ruled out."**

## Spec 005 US5: CSP tightened, HSTS/Permissions-Policy added, drift guardrail introduced (2026-08-10)

**Decision**: `script-src 'unsafe-inline'` dropped from `vercel.json`'s CSP outright — a
production `pnpm build` emits zero inline `<script>` content (the entry point is an
external `<script type=module src=...>` tag) and a repo-wide grep found no dynamic
inline-script-injection pattern anywhere in the codebase. `style-src 'unsafe-inline'` was
kept: six `style={{}}` call sites are all dynamic (computed colors/positions/motion
transforms), and `recharts`/`framer-motion` set inline style attributes at runtime
pervasively for animation — none of that is coverable by a static hash allowlist, and a
full nonce architecture (which would force `index.html` off static hosting and into a
per-request Function/Middleware response) was judged disproportionate effort for this
spec, per `research.md` item 5.

Added `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` and a
deny-by-default `Permissions-Policy` (camera, microphone, geolocation, payment — none of
which this app uses) to `vercel.json`. Both were confirmed absent before this change.

A CSP-drift guardrail was added: `scripts/check-csp-drift.mjs` (run via
`pnpm run check-csp-drift`, wired into a new first-ever `.github/workflows/csp-drift.yml`
on every push/PR) compares this repo's own CSP string against a hardcoded snapshot of
`resumeweb`'s `/dashboard/:path*` CSP, committed at
`scripts/resumeweb-dashboard-csp.snapshot.txt`. It intentionally does not fetch
`resumeweb` live in CI — that repo is a separate, unrelated project this repo's tooling
must not depend on the availability of (`research.md` item 6). The snapshot must be
updated by hand, in the same PR, whenever either side's `/dashboard` CSP changes; that
manual friction is deliberate, forcing the two to be kept in sync rather than silently
drifting again.

**Live bug found and fixed while pulling the T027 snapshot**: `vercel inspect
victorvaquero.com --json` showed `resumeweb`'s deployed `/dashboard` CSP still reflected
the pre-Turso, S3-based architecture — `connect-src` allowed only Cognito and S3 domains,
no `turso.io` at all, plus a stale `'wasm-unsafe-eval'` and an extra `'unsafe-inline'` in
`script-src` left over from the old sql.js-over-S3 driver. This meant real logins through
`victorvaquero.com/dashboard` (the app's actual public-facing URL) were being silently
CSP-blocked from reaching Turso in production — a live recurrence of the exact incident
already documented under "Hosting: Vercel..." below. Root cause: `resumeweb`'s CSP had
been correctly scoped to cashpy_v2's policy once (`10dfb07`), then patched for sql.js's
WASM needs (`6999f23`) before the Turso cutover, and never cleaned up afterward. Fixed
directly in `resumeweb` (a separate local repo at `/home/victor/workspace/resumeweb`,
distinct from `bro_cv_web` — see the "Cross-repo naming incident" note below) with owner
approval: commit `927c7cd`, pushed to `master`, live deploy confirmed via `curl` showing
the corrected header. The committed snapshot reflects this now-corrected value.

See `specs/005-repo-hygiene-security-and-public-readiness/research.md` items 5–7 for the
full design and alternatives considered.

## Spec 005 US4: guest/real-user auth boundary formally traced; rate limiting added (2026-08-10)

**Decision**: The guest/real-user auth boundary on `POST /api/turso-token` was already
correct by design (no code change needed to the branching logic) — confirmed by a full
code trace (`research.md` item 4) and formalized as a regression test,
`scripts/test-auth-boundary.mjs` (run via `pnpm run test-auth-boundary`). The trace: the
client (`src/services/tursoService.ts`) never sends the literal `idToken: 'guest'` value
as a Bearer token — it's converted to an `X-Guest-Request: true` header with no
`Authorization` header at all; the endpoint branches purely on which headers are present,
and even a hand-crafted `Authorization: Bearer guest` request fails real Cognito JWKS
signature verification before any Turso token is minted. The two branches mint against
disjoint, hardcoded env-var-sourced database identifiers, so there is no path from the
guest branch to the production database.

Proactive per-IP rate limiting was added to `api/turso-token.ts`: a module-scope
`Map<string, { count, resetAt }>` fixed-window counter (60s window, 20 requests/IP),
keyed by `x-forwarded-for`/`x-real-ip`, returning `429` + `Retry-After` once exceeded.
Threshold rationale: the client caches minted tokens for ~55 minutes
(`src/hooks/useDB.tsx`), so a normal session sends at most ~1 request per window — 20/60s
is generous headroom above that while still catching a scripted burst (SC-003).

**Known limitation, accepted**: this is a best-effort throttle, not a hard guarantee — the
counter resets on a cold start and isn't shared across concurrent instances/regions
(`research.md` item 3). It also does not persist across requests under local `vercel dev`
(which reloads the function module per invocation), so the 429 path in
`test-auth-boundary.mjs` can only be verified against a real deployment (Preview/
Production, where Fluid Compute reuses warm instances), not localhost. The other four
boundary checks (bearer-guest→401, guest-header→200 scoped correctly, forged-token→401,
no-credentials→401) were verified against a live local `vercel dev` instance.

See `specs/005-repo-hygiene-security-and-public-readiness/research.md` items 3–4 and
`contracts/turso-token-endpoint-amendment.md` for the full design.

**Verified against a live deployment (T023)**: deployed a Vercel Preview and ran
`test-auth-boundary.mjs` against it (5/5 checks pass, including the 429 path). Also
decoded a live-minted JWT: payload has `a: "ro"` (read-only), `exp - iat = 3600`
(exactly 1h), correctly scoped to the guest database on the guest branch. One nuance
found empirically: the 429 burst must be sent _sequentially_, not concurrently — a
concurrent burst gets load-balanced across multiple Fluid Compute warm instances, each
with its own independent counter, so it never trips the limit even well past the
threshold. 30 sequential requests to the same warm instance correctly returned `200` for
the first 20 and `429` + `Retry-After` for the rest. The test script was updated to send
the burst sequentially and to support Vercel Deployment Protection (a
`--protection-bypass`/`VERCEL_PROTECTION_BYPASS` token, since Preview deployments sit
behind an SSO wall by default).

## Spec 005 US1: account-GUID mapping moved server-side; git history scrubbed (2026-08-10)

**Decision**: `src/config.json`'s `database.victor.*` real GnuCash account-GUID mapping
was removed from the repo and now arrives at runtime as an `accountConfig` field on the
already-authenticated `/api/turso-token` response, sourced server-side from a new
`ACCOUNT_CONFIG_VICTOR` Vercel environment variable (Production + Preview, set via
`vercel env add`). The guest mapping (synthetic demo IDs) stays hardcoded in
`api/turso-token.ts` — not a secret. `getConfig(user)` in `src/db/utils.ts` now reads
from a module-level cache populated by `useSetupDB` (`src/hooks/useDB.tsx`) as soon as
each user's token response arrives, instead of importing `config.json`. See
`specs/005-repo-hygiene-security-and-public-readiness/research.md` item 1 and
`data-model.md` for the full design.

**Git history**: owner explicitly chose to scrub git history (spec Acceptance Scenario
3), not leave it as-is. Confirmed exactly 9 real account GUIDs appeared across this
repo's full history (64 commits), confined to `src/config.json`. Rewrote history with
`git-filter-repo --replace-text` (redacting only those 9 literal GUID strings to
`REDACTED-ACCOUNT-GUID`, everything else — guest/synthetic values, all other history —
untouched), force-pushed the rewritten history to `origin/master`
(`github.com/VictorVaquero/cashpy_v2`, private repo). Verified zero remaining matches for
all 9 GUIDs across `git log --all -p` post-rewrite before pushing. A full pre-rewrite
backup bundle was made first: `~/workspace/cashpy_v2-history-backup-20260810-104915.bundle`
(outside the repo tree, **not** committed) — this bundle still contains the original
un-redacted GUIDs, so it should be deleted once the owner is satisfied the rewrite is
correct, or moved somewhere access-controlled if kept longer.

**Consequence**: every commit hash changed. Any other local clone or fork of this repo
is now diverged from `origin/master` and must be re-cloned or hard-reset
(`git fetch origin && git reset --hard origin/master`) rather than pulled normally.

## Owner decisions across the `docs/review/` planning folder (2026-08-10)

**Decision**: the owner was interviewed through every open decision recorded across
`docs/review/`'s 19 planning docs and made a call on each. Full detail lives in each
doc's "Open decisions" section; condensed here for durability:

- **Public-repo readiness** ([03](review/03-secrets-and-public-repo-readiness.md)):
  move `src/config.json`'s `database.victor.*` account mapping out of the repo (not
  publish it as-is) before going public; license as **MIT**.
- **Security** ([04](review/04-security.md)): CSP-coupling fix stays a cheap
  drift-detection guardrail (test asserting the two repos' CSP strings match), not a
  structural rearchitecture. Add lightweight rate limiting to `api/turso-token.ts`
  **proactively now** — diverges from the doc's original "wait for evidence of abuse"
  default.
- **SEO** ([05](review/05-seo.md)): the landing page (`/dashboard`, `/dashboard/login`)
  should stay **crawlable/indexed** — diverges from the doc's original "not indexed"
  default; the authenticated inner routes stay disallowed. Canonical icon is
  `cash3.svg` (delete `favicon.svg`).
- **Dependencies** ([01](review/01-dependencies-and-config-hygiene.md)): keep
  Storybook/MSW and fix their stale props, rather than removing them.
- **Component library** ([13](review/13-component-library-and-design-system.md)): wire
  up the shadcn CSS-var theme properly rather than dropping it for hand-styled
  utilities only.
- **Theming** ([15](review/15-theming-light-dark-mode.md)): default to `system`
  (OS `prefers-color-scheme`).
- **i18n** ([16](review/16-internationalization.md)): default language via browser
  `navigator.language` detection; library is `react-i18next`.
- **Dev automation** ([09](review/09-developer-automation.md)): add Prettier.
- **Performance** ([06](review/06-performance.md)): Lighthouse CI runs against a local
  `vite preview` build, not a Vercel preview URL.
- **Testing** ([08](review/08-testing-infrastructure.md)): fast unit/component suites
  gate every PR; Playwright e2e runs on merge to `master`.
- **Charts & mobile** ([14](review/14-charts-and-mobile-interaction.md)): the scrubber
  touch pattern goes on **all** charts, not just the 1–2 most important ones — diverges
  from the doc's original scope-limited recommendation, adding real implementation
  cost. All D3 charts consolidate onto **Recharts**
  ([12](review/12-library-choice-review.md)), sequenced together with each chart's
  touch-interaction work.
- **Observability** ([18](review/18-observability-and-monitoring.md)): confirmed the
  "notice it by accident" gap hasn't caused a real problem yet — Sentry/uptime
  monitoring stay deferred.

## Layout: single-panel nav, no shared header (2026-08-08)

**Decision**: replaced a shared full-width `<Header>` bar + separate rail/drawer sidebar
with one self-contained, always-`fixed` nav panel (width-animates, never position-mode
switches) and an independently `fixed` account-menu corner.

**Why**: the two-piece rail+drawer approach (a permanently in-flow rail plus a
`fixed`-overlay drawer) caused a chain of layout bugs — content shifting on
open/close, a visible seam between the two overlapping elements during the transition,
and stacking-order fights with the header. A single element whose only animated
property is `width`, paired with content that always reserves exactly the collapsed
width via constant `padding-left`, removes the class of bug entirely rather than
patching each symptom.

## Database: Turso (libSQL) over Neon/Postgres or staying on S3+sql.js (2026-08-08)

**Decision**: moved the data layer from "SQLite file on S3, downloaded and queried
client-side with sql.js" to a hosted **Turso** (libSQL) database, queried directly by
the client via a short-lived, read-only, per-database token minted server-side.

**Why Turso over Neon**: free at this app's scale with effectively no accidental-cost
risk (5GB storage / 500M reads vs. a single user's actual usage), and the migration is
mechanical — SQLite dialect carries over, so the existing ~1,150-line Drizzle query
layer needed only its connection/driver setup changed, not a rewrite. Neon/Postgres is
also free at this scale but requires a dialect rewrite for no corresponding benefit, and
would _add_ a required API layer rather than remove one — working against the actual
goal (fewer moving parts).

**Why not just optimize the S3+sql.js path**: kept as the explicit baseline option and
rejected — it still requires shipping and parsing the full ~4MB file client-side on every
load, whereas Turso pushes querying server-side.

**Kept Drizzle** (did not switch to Kysely, which was raised mid-research): no concrete
stability problem was found with Drizzle for this codebase's query patterns; switching
ORMs was judged unjustified churn for a working, non-broken layer.

**Scope decided alongside this**: latest-only data in Turso (a single database updated
in place per ingestion run, dropping the old multi-snapshot/dated-folder browsing that
had no evidence of actual use) and `cashpy-processor` stays on AWS Lambda, changing only
its output step (S3 upload → Turso write) rather than moving off Lambda.

**Follow-through still owed**: the old sql.js/S3 driver path was cut over and the
service layer removed (spec 002 Phase 6), but two leftovers remain in the tree —
`src/hooks/useS3.ts` (orphaned, zero references) and the `SQLJsDatabase` union member in
`src/db/dbType.ts`. Tracked in `docs/review/01-dependencies-and-config-hygiene.md` and
`docs/review/11-code-structure-and-patterns.md`.

## Hosting: Vercel over continuing on AWS S3 + CloudFront (2026-08-07)

**Decision**: moved hosting from a hand-run S3 + CloudFront static site (manual
`aws s3 sync` + CloudFront invalidation) to Vercel, following the same pattern already
proven on the sibling `resumeweb` project (the owner's personal resume/CV site at
`victorvaquero.com`). Kept the production URL at `victorvaquero.com/dashboard` via a
rewrite-proxy from the project that owns the apex domain, rather than moving the app to
its own subdomain.

**Why**: push-to-deploy with automatic preview deployments per branch, no manual
sync/invalidate step, and it's the same pattern already operated successfully elsewhere
— consistent with the constitution's "boring, well-supported technology" principle.

**Known coupling accepted as a tradeoff**: because the domain-owning project
(`resumeweb`) proxies `/dashboard/*` and re-declares its own CSP for that path, any CSP
change in this repo must be manually mirrored there. This already caused one real
incident post-cutover (stale CSP silently blocked Turso traffic on the custom domain —
see the "Post-cutover incident" note in `specs/002-database-simplification/spec.md`).
Not re-architected away (e.g. by giving the dashboard its own subdomain) because the
`victorvaquero.com/dashboard` URL is a hard external-facing requirement; the coupling is
tracked as an operational risk instead — see `docs/review/04-security.md`.

**Correction (2026-08-10)**: `resumeweb` was previously misidentified in this repo's own
docs as "`bro_cv_web`" — a different, unrelated repo (git remote `PabloVaqueroCVWeb`,
deploying `drpablovaquero.com`, a third-party client site not owned by this project). The
name collision between a local folder called `bro_cv_web` and the actual sibling project
`resumeweb` caused a real incident: the CSP/proxy fix referenced above was committed to
the wrong repo, and `resumeweb`'s Vercel project was found with its Production Branch
pointed at `main` instead of its real default branch, briefly serving a stale deployment
on `victorvaquero.com`. Owner fixed the live symptom via a Vercel dashboard rollback.
`bro_cv_web`/`PabloVaqueroCVWeb`/`drpablovaquero.com` must never be treated as
`resumeweb` or edited by this repo's tooling. See `docs/architecture.md`'s "Cross-repo
naming incident" note and `docs/review/VERCEL-HARDENING-CHECKLIST.md`.

## Auth: kept Cognito, unchanged, across the hosting/database migrations (2026-08-07 → ongoing)

**Decision**: real-user login stays on AWS Cognito; guest/demo login stays a
non-Cognito synthetic session. Neither hosting migration (to Vercel) nor the database
migration (to Turso) touched auth — the Turso token-minting endpoint
(`api/turso-token.ts`) verifies the _existing_ Cognito ID token server-side rather than
replacing Cognito with anything new.

**Why**: per the constitution, replacing Cognito is only in scope if it measurably
simplifies the stack or removes the AWS dependency entirely — neither migration made
that case, so it was left alone rather than bundled in opportunistically.

## Process: incremental, ordered spec-kit migration (2026-08-07)

**Decision**: adopted a constitution (`.specify/memory/constitution.md`) committing to
an ordered sequence — hosting (spec 001) → database/ingestion (spec 002) → codebase
modernization (spec 003) — where each spec must leave the app fully working and deployed
before the next begins, and cost/free-tier tradeoffs must be written down before an
implementation choice is made. Mobile responsiveness (spec 004) was inserted between 002
and 003 as an owner-prioritized need, without violating the "each spec leaves the app
working" rule.

**Why**: this is a solo-maintained, low-traffic personal project — the constitution
exists to keep migrations reversible and reasoned-about-in-writing without imposing
process overhead disproportionate to the project's size (see "Governance" in the
constitution: compliance is checked informally at the end of each spec, not via a
separate audit process).

## Dependency keep: TanStack Router (spec 007, FR-010, closes spec 003 FR-004/SC-003)

**Decision**: kept TanStack Router, unchanged. No concrete problem was identified with
it during spec 007's D3→Recharts/theming work or otherwise.

**Why**: file-based routing already fits the app's route structure well, the library is
actively maintained, and there's no simpler built-in alternative that would reduce
complexity — replacing it would be churn without a measurable win, which the
constitution's "boring, well-supported technology" principle argues against.

## Dependency keep: TanStack Query (spec 007, FR-010, closes spec 003 FR-004/SC-003)

**Decision**: kept TanStack Query, unchanged, as the app's data-fetching/caching layer.
No concrete problem was identified with it during spec 007's work.

**Why**: it's already deeply integrated across every chart and data view, is actively
maintained, and no simpler built-in alternative meets the app's server-state needs
(caching, request dedup, background refetch) without reimplementing equivalent logic
by hand.

## Follow-up (out of scope): `resumeweb` needs its own `robots.txt` allow-list entry for `/dashboard` (spec 008, FR-008, SC-004)

**Decision**: spec 008 deliberately does not add a `robots.txt` or `sitemap.xml` to this
repo (`cashpy_v2`) — this app owns only the `/dashboard/*` URL space at
`victorvaquero.com`, and any `robots.txt` governing the whole domain (including whether
`/dashboard` is crawlable) belongs to `resumeweb`, the separate repo that owns
`victorvaquero.com`'s root-level static files and proxies `/dashboard` to this app via
its own rewrite config. Whoever maintains `resumeweb` should confirm its `robots.txt`
(if one exists, or when one is added) explicitly allow-lists `/dashboard` rather than
disallowing it by omission or default.

**Why**: adding a `robots.txt` here would be scoped to the wrong repo — it would only
ever be served in isolation if this app were somehow deployed standalone, not through the
`resumeweb` mount, and could silently diverge from whatever `resumeweb`'s own
`robots.txt` says. Keeping crawl-directive ownership in the repo that owns the domain
root avoids two files disagreeing about the same URL space.
