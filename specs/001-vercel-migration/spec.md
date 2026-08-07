# Feature Specification: Vercel Hosting Migration

**Feature Branch**: `001-vercel-migration`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "Move the cashpy dashboard from AWS S3/CloudFront to Vercel, following the same pattern already used successfully in the sibling resumeweb project, while keeping the app reachable at victorvaquero.com/dashboard. Keep the existing data layer (SQLite file on S3, fetched and queried client-side) and Cognito auth unchanged in this phase — this is a hosting-only move."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dashboard keeps working at its existing address (Priority: P1)

As the app's owner, I want the dashboard to still be reachable at
`victorvaquero.com/dashboard` after the migration, so that no bookmark, link from the
personal site, or muscle memory breaks.

**Why this priority**: This is the entire point of the migration from the user's
perspective — an invisible infrastructure change. If the URL changes or breaks, the
migration has failed regardless of what else works.

**Independent Test**: Visit `victorvaquero.com/dashboard` after migration and confirm the
app loads, with no dependency on any other user story.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** a user navigates to
   `victorvaquero.com/dashboard`, **Then** the dashboard application loads exactly as it
   did before the migration.
2. **Given** the migration is complete, **When** a user navigates to a deep link (e.g.
   `victorvaquero.com/dashboard/summary`), **Then** the correct route loads directly
   (no 404, no forced redirect to the home route).
3. **Given** the old AWS S3/CloudFront hosting is decommissioned, **When** a user visits
   the dashboard URL, **Then** it is served entirely from the new host with no
   dependency on the old infrastructure being alive.

---

### User Story 2 - Authenticated user sees their real data (Priority: P1)

As the returning authenticated user, I want to log in and see my actual financial data
loaded from S3, exactly as before, so the migration doesn't disrupt daily use.

**Why this priority**: Equal to User Story 1 — a reachable URL that fails to log in or
load data is not a working migration.

**Independent Test**: Log in with real credentials post-migration and confirm data loads
and renders on at least one chart-bearing page (e.g. summary).

**Acceptance Scenarios**:

1. **Given** valid credentials, **When** the user logs in on the newly-hosted app,
   **Then** authentication succeeds exactly as it did on the old hosting.
2. **Given** a successful login, **When** the app fetches the user's database file,
   **Then** data loads and renders on the summary, expenses, travels, and investments
   pages without new errors.

---

### User Story 3 - Guest demo still works (Priority: P2)

As a visitor without an account, I want to use the guest/demo login and see sample data,
so the dashboard remains showable as a portfolio piece after the migration.

**Why this priority**: Important for the app's secondary purpose (demo/portfolio) but not
blocking for the owner's own daily use, hence P2 rather than P1.

**Independent Test**: Use the guest login post-migration and confirm sample data renders.

**Acceptance Scenarios**:

1. **Given** no prior authentication, **When** a visitor selects the guest/demo option,
   **Then** they see the same sample dataset and charts as before the migration.

---

### User Story 4 - Every preview/branch gets its own deployable URL (Priority: P3)

As the developer, I want each pushed branch/PR to automatically get a preview deployment,
so I can verify changes before they reach the production URL.

**Why this priority**: A workflow/quality-of-life improvement inherited from the hosting
platform, not required for the migration to be considered successful for the app's single
user, hence lowest priority.

**Independent Test**: Push a branch and confirm a preview URL is generated and loads the
app independently of the production deployment.

**Acceptance Scenarios**:

1. **Given** a new branch is pushed, **When** the hosting platform builds it, **Then** a
   preview deployment is created at a distinct URL without affecting production.

### Edge Cases

- What happens when the build succeeds but the new host serves a route (e.g.
  `/dashboard/summary` reloaded directly) that a static single-page app doesn't
  automatically rewrite to `index.html`? The app MUST still load (client-side routing
  fallback required).
- What happens if a user has the old CloudFront URL cached/bookmarked instead of the
  domain-relative path? Out of scope to redirect from the old distribution — the old
  bucket/distribution's lifecycle is decommissioned separately (see Assumptions).
- What happens if the AWS credentials embedded in `config.json` (Cognito, S3 bucket
  name/region) still point at the same AWS account/resources? They MUST continue to work
  unchanged, since this phase does not touch auth or data.
- What happens during the deploy cutover window (DNS/path pointing at old vs. new host)?
  Some flicker/downtime is acceptable for a single-user personal app; a hard zero-downtime
  cutover is not required.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST be deployed on Vercel, building from the same GitHub
  repository via Vercel's git integration (push-to-deploy), matching the pattern used by
  the resumeweb project.
- **FR-002**: The application MUST remain reachable at `victorvaquero.com/dashboard`
  (and all sub-routes beneath it) after the migration.
- **FR-003**: The build MUST produce the same client-side single-page application
  currently built by `vite build`, with no server-side rendering or new backend
  introduced in this phase.
- **FR-004**: All existing client-side routes (e.g. summary, expenses, travels,
  investments, analysis, login) MUST resolve correctly on direct load/refresh, not just
  via in-app navigation — the new host MUST rewrite unmatched paths under `/dashboard` to
  the app's `index.html`.
- **FR-005**: Cognito-based authentication and the S3-backed SQLite data fetch MUST
  continue to function unchanged — no auth or data-layer code changes are in scope for
  this spec.
- **FR-006**: Security response headers equivalent to what CloudFront/the app currently
  relies on (or a documented equivalent baseline, e.g. matching resumeweb's `vercel.json`
  headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) MUST be present
  on the new deployment.
- **FR-007**: No secrets or credentials MUST be introduced into the repository as part of
  configuring the new host; any required build-time configuration MUST use the hosting
  platform's environment variable mechanism if needed (today's `config.json` contains only
  non-secret public identifiers — Cognito pool/client IDs and an S3 bucket name — consistent
  with AWS's public-client model, and MAY remain committed as-is).
- **FR-008**: Every git branch/PR MUST receive an isolated preview deployment that does not
  affect the production URL, using the hosting platform's built-in preview mechanism.
- **FR-009**: The old AWS S3 + CloudFront hosting for this dashboard MUST be documented as
  decommissioned (or scheduled for decommission) once the new host is verified working, so
  the app is not left running/paying for two hosting paths indefinitely.
- **FR-010**: The `package.json` deploy scripts (`clean`, `deploy` — currently `aws s3
  sync`/`cloudfront create-invalidation`) MUST be removed or replaced once the platform
  migration is verified, consistent with how resumeweb removed its legacy AWS scripts.

### Key Entities

- **Deployment target**: The Vercel project connected to this repository; produces
  production deployments from the default branch and preview deployments from other
  branches/PRs.
- **Route mount path**: `/dashboard` under `victorvaquero.com` — the existing site
  (resumeweb, already on Vercel) and this dashboard app need to coexist under one domain,
  which requires a routing decision (see Assumptions).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `victorvaquero.com/dashboard` loads the dashboard application with 100% of
  existing routes reachable via direct URL entry (not just in-app navigation).
- **SC-002**: An authenticated user can log in and see their data render within the same
  time-to-interactive ballpark as the pre-migration deployment (no material regression).
- **SC-003**: The guest/demo login path works with zero additional steps compared to
  before the migration.
- **SC-004**: Pushing a new branch produces a working preview deployment reachable at a
  unique URL within Vercel's normal build time, with no manual steps.
- **SC-005**: After cutover, no manual AWS CLI command (`aws s3 sync`, `cloudfront
  create-invalidation`) is required to ship a change — pushing to the main branch is
  sufficient.
- **SC-006**: Zero secrets or credentials appear in the git history as a result of this
  migration.

## Assumptions

- **Coexistence with resumeweb under one domain (decided)**: resumeweb (Astro, static)
  already owns `victorvaquero.com` on Vercel. This dashboard is deployed as its own,
  independent Vercel project (own build pipeline, own preview deployments). The two are
  joined only by a `rewrites` rule added to resumeweb's `vercel.json` that proxies
  `/dashboard/*` requests to this project's Vercel deployment URL. This keeps the two
  projects' deploy pipelines fully decoupled — this repo ships independently of resumeweb
  — and rollback is a one-line revert in resumeweb if needed. Implementing this rewrite
  requires a small, separate change in the resumeweb repo (out of this repo's tree, but
  in scope for this spec's completion).
- **No data or auth changes**: This spec is hosting-only. The SQLite-on-S3 data flow and
  Cognito auth flow are carried over unchanged; their simplification is explicitly
  deferred to the follow-up database-simplification spec.
- **Old AWS hosting decommission is a separate, later action**: Verifying the new
  deployment before tearing down the old S3 bucket/CloudFront distribution for this app is
  required (per the constitution's reversibility principle), but the actual teardown can
  happen as a fast-follow once confidence is established, not strictly inside this spec's
  completion gate.
- **No new environment variables needed**: Since `config.json`'s values are public client
  identifiers (not secrets), the Vercel build needs no new environment variable
  configuration beyond what Vercel infers automatically (Node version, build/output
  commands) — mirroring resumeweb's "no environment variables currently required" note.
- **Single Vercel account/team**: Deployment uses the same Vercel account/team already
  used for resumeweb.
