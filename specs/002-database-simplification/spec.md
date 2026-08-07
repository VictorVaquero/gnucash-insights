# Feature Specification: Database & Data Loading Simplification

**Feature Branch**: `002-database-simplification`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "Simplify how the dashboard gets its financial data. Today, a separate pipeline (cashpy-processor) parses a GnuCash export and uploads a ~4MB SQLite file to an AWS S3 bucket; the browser downloads the whole file via Cognito-authenticated S3 requests and queries it client-side with sql.js. Evaluate whether this can be simplified — e.g. loading into a small hosted database instead of a downloaded file — including whether a free/low-cost option exists, and compare alternatives before picking one."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner sees fresh data without a manual multi-step pipeline (Priority: P1)

As the app's owner, when I export a new GnuCash book, I want the dashboard to reflect it
with as few manual steps and moving parts as possible, so refreshing my data isn't a
chore or a source of errors.

**Why this priority**: This is the actual pain point motivating the simplification —
today's flow spans a local export, an S3 upload, a Lambda trigger, and a client-side
download/parse. Fewer moving parts directly reduces the chance of a broken refresh.

**Independent Test**: Time and count the manual steps from "GnuCash export file on disk"
to "dashboard shows the new data" before and after the change; the after-count must be
less than or equal to the before-count, with no new manual step introduced.

**Acceptance Scenarios**:

1. **Given** a freshly exported GnuCash file, **When** the owner runs the (possibly
   simplified) ingestion step, **Then** the dashboard reflects the new data without
   requiring any manual client-side cache-clearing or additional workaround.
2. **Given** the chosen data-loading approach, **When** the owner inspects what
   infrastructure it depends on, **Then** the number of distinct services/systems involved
   in getting data from GnuCash export to rendered chart is documented and is not larger
   than today's (S3 bucket + Lambda + client download).

---

### User Story 2 - Dashboard loads data at least as fast as today (Priority: P1)

As any user (owner or guest), I want the dashboard's data to load in a comparable or
shorter time than today, so simplifying the backend doesn't degrade the experience.

**Why this priority**: A simpler architecture that's slower or less reliable is not a net
win. This must hold for the change to be worth making.

**Independent Test**: Measure time-to-data-visible on the summary page before and after,
on a comparable network condition.

**Acceptance Scenarios**:

1. **Given** the new data-loading approach is live, **When** an authenticated user opens
   the dashboard, **Then** their data is visible in a comparable or shorter time than the
   current full-SQLite-file download.
2. **Given** the guest demo path, **When** a visitor opens the dashboard without logging
   in, **Then** sample data loads with no new failure modes introduced by the new
   approach.

---

### User Story 3 - Decision is documented with real costs and limits (Priority: P1)

As the app's owner, I want a clear written comparison of the realistic options (cost,
free-tier limits, effort to migrate, vendor lock-in) before committing to one, so the
choice is deliberate rather than the first thing that came up.

**Why this priority**: The user explicitly asked to "analyse options" before deciding —
this is a research-and-decide spec as much as a build spec, and skipping the comparison
defeats the purpose of asking for it.

**Independent Test**: A comparison document exists covering at least: staying on
S3+client-side-SQLite (baseline), a Vercel-native storage/database option, and at least
one other small-database option, each with cost at this app's actual data volume (~4MB,
single-digit-MB growth per year) and usage (single real user).

**Acceptance Scenarios**:

1. **Given** the research is complete, **When** the owner reads the comparison, **Then**
   each option states its free-tier limits, what happens beyond them, and an estimated
   real monthly cost for this app's scale.
2. **Given** the comparison, **When** a database option is chosen, **Then** the choice is
   justified in writing against the alternatives, not asserted without reasoning.

---

### User Story 4 - Existing dashboard features keep working (Priority: P1)

As a user of the dashboard, I want every existing page (summary, expenses, travels,
investments, analysis) to keep working exactly as before after the data layer changes, so
the simplification is invisible to me functionally.

**Why this priority**: The data layer underpins every page in the app; any regression
here is a regression everywhere, so this is a hard gate on the spec regardless of which
option is chosen.

**Independent Test**: Exercise every existing route/query against the new data layer and
confirm output matches the old data layer for the same underlying dataset.

**Acceptance Scenarios**:

1. **Given** the same GnuCash export processed through both the old and new pipelines,
   **When** the dashboard renders any existing page, **Then** the numbers and charts shown
   are identical between old and new.
2. **Given** multiple "books" (dated exports) existed as selectable snapshots in the old
   S3-folder-per-export model, **When** the new approach is in place, **Then** either the
   same snapshot-selection capability is preserved, or its removal is called out
   explicitly as an accepted scope reduction (see Assumptions).

### Edge Cases

- What happens if the chosen hosted database's free tier is exceeded (e.g. by usage
  spikes, unexpected growth, or the demo/guest login being crawled)? The chosen option's
  behavior beyond free tier (hard cutoff vs. silent billing) MUST be known and preferred
  toward hard cutoffs or alerts over silent charges, per the constitution's
  cost-consciousness principle.
- What happens to the guest/demo dataset under the new approach — does it live in the same
  database as the real data (with access control), or stay as a separate static
  file/dataset?
- What happens if the ingestion step (GnuCash parsing) needs to change to write to the new
  destination — does `cashpy-processor` need code changes, and if so, is that still an AWS
  Lambda, or does it move too?
- What happens during the cutover window where old (S3 file) and new (hosted DB) paths
  might briefly coexist — is a hard cutover acceptable given this is a single-user app?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A written comparison of at least three data-hosting options MUST exist,
  covering: (a) the current approach (S3 file + client-side sql.js) as baseline, (b) a
  Vercel-native storage/database offering, and (c) at least one third-party small-database
  service suitable for this app's scale.
- **FR-002**: The comparison MUST state, per option: free-tier limits (storage, row/read
  count, bandwidth, or equivalent), what happens when limits are exceeded, and an
  estimated realistic monthly cost at this app's current scale (~4MB of data, one real
  user, occasional guest traffic).
- **FR-003**: The chosen option MUST NOT introduce a recurring cost unless explicitly
  accepted in writing by the app's owner (default expectation: $0/month).
- **FR-004**: The chosen approach MUST preserve or improve data load time for both the
  authenticated and guest paths, relative to today's full-file S3 download.
- **FR-005**: The chosen approach MUST preserve every existing dashboard page's
  functionality and correctness against the same underlying financial data.
- **FR-006**: The chosen approach MUST NOT expose financial data to unauthenticated
  requests; whatever access-control mechanism replaces (or reuses) Cognito MUST gate
  access to the real user's data at least as strictly as today.
- **FR-007**: The ingestion path (turning a GnuCash export into queryable data) MUST be
  documented for the chosen approach, including whether `cashpy-processor` requires code
  changes and whether it continues to run on AWS or moves elsewhere.
- **FR-008**: If the chosen approach changes how "books" (dated snapshots of exports) are
  represented or selected, that change MUST be called out explicitly as a scope decision,
  not silently dropped.
- **FR-009**: The decision and its rationale MUST be written down in this spec's
  directory (research/comparison artifact) so it survives beyond the conversation that
  produced it.

### Key Entities

- **Financial dataset**: The parsed GnuCash data (accounts, transactions, splits, prices,
  commodities, and derived summary tables) — today materialized as a SQLite file; the
  logical shape is expected to carry over regardless of storage choice.
- **Book/snapshot**: A dated export of the GnuCash file, today represented as a
  timestamped S3 folder containing its own `cash.db`; whether this concept is preserved,
  simplified to "latest only", or represented differently is an open decision for the
  comparison to resolve.
- **Hosting/storage option**: A candidate destination for the dataset (e.g. current S3
  approach, a Vercel-native offering, a third-party managed database), evaluated on cost,
  limits, and migration effort.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The number of distinct infrastructure services involved in the data
  pipeline (export → ingest → store → serve → client query) is documented and is equal to
  or fewer than today's count.
- **SC-002**: Monthly recurring cost of the chosen data-hosting approach is $0, or an
  explicitly higher amount that the owner has approved in writing in this spec.
- **SC-003**: Time from GnuCash export to data visible in the dashboard is equal to or
  faster than measured on the current pipeline.
- **SC-004**: 100% of existing dashboard pages produce identical output against the same
  source dataset, comparing old vs. new data layer.
- **SC-005**: Zero unauthenticated access to real financial data is possible under the new
  approach (verified by attempting data access without valid credentials).

## Assumptions

- **Small data volume**: The current dataset is roughly 4MB as a SQLite file (accounts,
  transactions, splits, prices, and derived summary tables for one GnuCash book), growing
  modestly year over year. This scale is assumed to comfortably fit within the free tier
  of any credible hosted-database option evaluated in the comparison.
- **Single real user**: Usage is dominated by one authenticated user plus occasional guest
  demo traffic; the comparison is scaled to this usage level, not to a multi-tenant
  product.
- **cashpy-processor may need changes**: This spec's comparison may conclude that the
  ingestion pipeline (`cashpy-processor`, currently an AWS Lambda writing to S3) needs
  code changes to target a new destination. Rewriting that pipeline's internals is in
  scope for this spec if the chosen option requires it; keeping it on AWS Lambda purely as
  a scheduled/triggered ingestion job (writing elsewhere) is an acceptable outcome and does
  not itself violate the "simplification" goal, since the complexity being reduced is the
  client-side file-download-and-query pattern, not necessarily every AWS touchpoint.
- **Book/snapshot history is not required to be fully preserved**: Today's model keeps
  every dated export as a browsable folder in S3. If the chosen approach makes
  "latest-only" meaningfully simpler or cheaper, dropping multi-snapshot browsing is an
  acceptable tradeoff, provided it's called out per FR-008 rather than silently lost.
- **This spec produces a decision, not necessarily a full migration**: Given the user
  asked to "analyse options" first, this spec's primary deliverable is the written
  comparison and a chosen direction (FR-001–FR-003, FR-009). Full implementation of the
  chosen option is expected to follow within this same spec's task list, but the
  comparison MUST be reviewed/confirmed before implementation tasks are generated, per
  the constitution's migration workflow.

## Decisions (post-research, owner-approved 2026-08-07)

Per `research.md`'s comparison and the owner's explicit sign-off, the following are now
settled, not open:

- **Database**: Turso (hosted libSQL/SQLite-compatible), not Neon/Postgres or the status
  quo. Rationale in `research.md`'s Recommendation section — smallest migration effort
  given the existing SQLite-dialect Drizzle schema, $0/month at this scale with large
  headroom, and it reduces rather than adds architectural surface area.
- **Book/snapshot history**: dropped in favor of **latest-only** — a single Turso
  database updated in place on each ingestion run, not a versioned/branched history of
  every dated export. This is an accepted scope reduction per FR-008, not a silent loss;
  no evidence the multi-snapshot browsing UI is exercised in practice.
- **cashpy-processor's new home**: moves **off AWS Lambda entirely**, becoming a local
  script run manually right after each GnuCash export (its parsing core already has a
  working AWS-free local CLI — see research.md's Portability finding). It pushes directly
  to Turso instead of uploading CSVs/`cash.db` to S3. This retires the S3 bucket, Lambda
  function, and the S3-trigger mechanism for this pipeline (the `victor-mycash` bucket
  itself may still exist for other purposes — decommissioning it, if warranted, is a
  manual follow-up outside this spec, same pattern as spec 001's AWS S3/CloudFront
  decommission note).
- **Query layer / ORM**: still open — the owner has asked to also research whether
  Drizzle ORM (the current query layer) has real stability issues with complex queries
  (recursive CTEs, aggregations) that would justify switching to an alternative
  (e.g. Kysely, raw `@libsql/client`) as a second phase of this same spec. This research
  is in progress; see `research.md`'s ORM section once added, and this Decisions section
  will be updated once that's resolved too.
