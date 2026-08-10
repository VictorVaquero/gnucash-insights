# Decisions

A condensed log of the significant, deliberate decisions behind the current
architecture, newest first. Full reasoning (alternatives considered, cost comparisons)
lives in each spec's `research.md`/`spec.md` under `specs/`; this is the "what and why,"
not the full writeup. Governing ground rules for all of these:
`.specify/memory/constitution.md`.

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
would *add* a required API layer rather than remove one — working against the actual
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
(`api/turso-token.ts`) verifies the *existing* Cognito ID token server-side rather than
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
