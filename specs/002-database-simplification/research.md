# Phase 0 Research: Database & Data Loading Simplification

## Current architecture, precisely

**Pipeline**: `cashpy-processor` (a Python AWS Lambda, `cash-parser`, Python 3.12, 60s
timeout, default 128MB memory) is triggered by an S3 `ObjectCreated:*` event on the
`victor-mycash` bucket, filtered to keys ending in `.gnca`. On trigger it:

1. Downloads the uploaded `.gnca` (GnuCash XML export) from S3 via `boto3`.
2. Parses it with `xmltodict` + `marshmallow` schemas into nested Python objects.
3. Flattens everything into pandas DataFrames (`meta`, `books`, `prices`, `accounts`,
   `commodities`, `transactions`, `splits`), including pivoting GnuCash's key-value
   transaction "slots" into `sl_*` columns.
4. Writes each table as a CSV to `s3://victor-mycash/gnucash/processed/{export-name}/`.
5. Builds a SQLite file at `/tmp/cash.db` (raw `sqlite3`, not `pandas.to_sql`), including
   several tables built *in-database* via SQL: `timetable` (a 20-year daily calendar),
   `accountsClosure` (a recursive-CTE account parent/child closure), `maxPrices`, and
   `fullTransactions` plus `summary_monthly`/`summary_quarterly`/`summary_yearly`
   pre-aggregations. Uploads this file to the same S3 folder as `cash.db`.
6. The browser (via `authService.tsx`/`s3Service.tsx`) uses a Cognito Identity Pool
   credential to fetch that `cash.db` object from S3 and loads it into sql.js
   client-side; all query logic in `src/db/queries/*.ts` runs against it through
   `drizzle-orm/sql-js`.

**Every run is a full rebuild** (`DROP TABLE`/`CREATE TABLE`/bulk `INSERT`), not
incremental — there is no partial-update path to preserve.

**Portability finding**: aside from the ~12 lines of S3 get/put in `app.py`, the parsing
core (`parser.py`, `splitter.py`, `transformer.py`, `sql.py`) has **zero AWS-SDK
coupling** — pure pandas + stdlib `sqlite3`/`xmltodict`/`marshmallow` — and already has a
working local CLI entry point (`python -m src.gcparser -f <file> -o <dir>`) that runs
identically without AWS. This means re-targeting the pipeline's *output* doesn't require
rewriting its *logic*, only its I/O boundary.

**Query-layer finding**: the app's Drizzle schema (`src/db/schema.ts`) uses
`sqliteTable` from `drizzle-orm/sqlite-core` throughout, and the `drizzle-orm/sql-js`
adapter is instantiated in exactly one place (`DbService.tsx`). All ~1,150 lines of query
code in `src/db/queries/*.ts` go through Drizzle's query builder, not raw sql.js calls.
This matters directly for migration effort below: a **SQLite-wire-compatible** target
(Turso/libSQL) is a driver swap; a **Postgres-dialect** target (Neon, "Vercel Postgres")
requires porting the schema and rewriting dialect-specific SQL (e.g. the recursive CTE in
`accountsClosure`, date-string formatting in the summary views) — a real rewrite, not a
config change.

**Current real numbers** (confirmed via `aws s3 ls`): latest `cash.db` is **~3.9MB**; 13
historical exports total **41.2MB** in the bucket; size grew from ~1.3MB (Sep 2024) to
~1.8MB (Dec 2025) to ~3.9MB (Dec 2025–Jan 2026) — the last jump is a step change (likely
a new data category or the added summary tables), not smooth linear growth, so "a few MB
per year" is a reasonable but not guaranteed extrapolation.

**Current AWS cost**: not directly queryable (the available IAM credential lacks
`ce:GetCostAndUsage`), but at this volume every touched service — Lambda invocations
(a few dozen/year), S3 storage (41MB) and requests, Cognito Identity Pool — sits
comfortably inside AWS's standard always-free allowances. The realistic current cost is
**$0/month**. This matters: the motivation for this spec is *architectural complexity*
(manual multi-step pipeline, multiple moving parts), not cost — cost is already at the
floor.

---

## Decision: Candidate comparison

### Important correction to the spec's framing

"Vercel Postgres" as a distinct first-party product **no longer exists** — Vercel
discontinued it and transitioned it to a **Neon** integration via the Vercel Marketplace
(fully sunset by mid-2025). So "(b) a Vercel-native storage/database offering" and
"(c) a third-party small-database service" substantially converge on Postgres: installing
"Postgres" from the Vercel dashboard today *is* provisioning a Neon database, billed
either through Vercel or directly through Neon. Vercel KV was also deprecated. Vercel
Blob remains a standalone first-party product but is object storage, not a queryable
database — using it here would mean going back to "download a file and query it
client-side," the exact pattern this spec exists to reconsider.

Given that, the real comparison is three genuinely distinct options:

### Option A — Baseline: keep S3 + client-side sql.js (no change)

| | |
|---|---|
| **Free tier** | AWS free tier: 1M Lambda requests + 400,000 GB-s compute/month (always free), S3 5GB standard storage for 12 months then normal S3 pricing (~$0.023/GB-month after), Cognito Identity Pool free for unauthenticated + authenticated identities at this scale |
| **Past free tier** | Standard AWS pay-as-you-go billing (no hard cutoff) — at 41MB total and a few dozen Lambda invocations/year, effectively unreachable at current usage |
| **Realistic monthly cost at this scale** | ~$0.00–0.01/month |
| **Migration effort** | None (status quo) |
| **What's simplified** | Nothing |

### Option B — Neon (serverless Postgres; via Vercel Marketplace or directly)

| | |
|---|---|
| **Free tier** | 100 compute-hours/month, 0.5GB storage **per project**, up to 100 projects, 10 branches/project, autoscale to 2 CU, scale-to-zero after 5 min idle (configurable) |
| **Past free tier** | **Hard cutoff**: hitting the CU-hour or storage cap **suspends the database** until the next monthly cycle, or until a payment method is added — no silent overage billing |
| **Realistic monthly cost at this scale** | $0/month. Scale-to-zero means a single-user app with sparse access burns negligible compute; 0.5GB comfortably covers a ~4MB dataset with years of headroom |
| **Migration effort** | **Real rewrite**, not a config change: `sqliteTable` schema → Postgres dialect (`pgTable`), recursive CTE and date-formatting SQL need Postgres-equivalent syntax, `cashpy-processor`'s `core/sql.py` needs a Postgres client (`psycopg`/`asyncpg`) instead of stdlib `sqlite3`, and the client needs a server-side query layer (Postgres isn't safely queryable directly from the browser — needs an API route, unlike the current direct-S3-fetch model) |
| **Access control** | Requires a server-side API layer (Vercel serverless functions) sitting in front of the DB, since Postgres credentials can't be shipped to the browser the way today's scoped Cognito credentials are — a bigger architecture change than "swap the storage layer" |

### Option C — Turso (libSQL, SQLite-compatible, serverless)

| | |
|---|---|
| **Free tier** | 5GB storage, 500M row reads/month, 10M row writes/month, up to 100 databases, no credit card required to sign up, **commercial use explicitly permitted** |
| **Past free tier** | Paid tier starts at $4.99/month (Developer: unlimited DBs, 9GB storage, 2.5B row reads) — no forced suspension noted at this tier transition, billing is metered by usage |
| **Realistic monthly cost at this scale** | $0/month. 4MB is ~0.08% of the free storage cap; even generous dashboard usage (every chart re-querying full tables) is very unlikely to approach 500M rows read/month for a single user |
| **Migration effort** | **Low**: SQLite-wire-compatible, so `src/db/schema.ts`'s existing `sqliteTable` definitions carry over unchanged; swap is mainly in `DbService.tsx` — replace the `drizzle-orm/sql-js` + manual S3-download-then-load flow with `drizzle-orm/libsql` and a direct authenticated connection. `cashpy-processor`'s `core/sql.py` output step changes from "write a local SQLite file" to "push to a libSQL database" (via the `libsql` Python client, or by keeping local SQLite generation and using Turso's `.dump`/import path) |
| **Access control** | Turso supports per-database auth tokens; a token scoped to this one database, issued server-side, replaces Cognito's role here. Simpler than Option B's requirement for a full API layer, though still needs *some* server-side mediation so a long-lived write-capable token never reaches the browser — a read-scoped token could plausibly be used client-side for the authenticated read path, worth confirming against Turso's token-scoping docs before implementation |
| **Notable extra** | `@libsql/client` is **already a dependency** in `package.json` (unused in `src/` today) — suggests this direction may have already been under consideration before this spec existed |

---

## Recommendation

**Turso (Option C)**, conditional on the owner's sign-off (FR-003/SC-002 require this
choice to be written and approved, not merely asserted).

**Why**: it's the only option that is simultaneously free at this scale with no
plausible path to accidental cost (5GB / 500M reads is enormous headroom for one user),
requires the smallest, most mechanical migration (SQLite dialect carries over; the
1,150-line query layer is very unlikely to need line-by-line changes, only the
connection/driver setup), and directly reduces the pipeline from "S3 bucket + Lambda +
Cognito-authenticated client download + client-side sql.js parse" to "ingestion step
writes to Turso + client connects directly" — satisfying SC-001 (fewer distinct
services) in a way Option B does not (Option B *adds* a required API layer that doesn't
exist today).

**Why not Neon/Postgres**: it's also free at this scale and arguably more
"industry-standard," but the Postgres dialect rewrite is real work with no corresponding
benefit for a single-user, ~4MB, read-heavy dashboard — and it *increases* architectural
surface area (a new required API layer) rather than reducing it, working against the
spec's actual motivation (fewer moving parts, not "the most standard possible database").

**Open items for the owner to confirm before implementation planning proceeds** (per
spec.md's Assumptions: this comparison must be reviewed/confirmed first):

1. Sign off on Turso as the chosen direction (or redirect).
2. Confirm the acceptable answer to FR-008 (books/snapshots): today every dated export is
   kept as a browsable S3 folder; recommendation is **latest-only** in Turso (a single
   database updated in place on each ingestion run) — dramatically simpler, and matches
   how the dashboard is actually used (no evidence the multi-snapshot browsing UI is
   exercised). This is a real scope reduction and needs explicit acceptance, not silent
   adoption.
3. Confirm whether `cashpy-processor` stays on AWS Lambda (triggered by an S3 upload of
   the `.gnca` file as today, but writing to Turso instead of S3) or moves — recommendation
   is **keep it on Lambda, change only the output step**, since the parsing logic has no
   AWS coupling to remove and rewriting the trigger mechanism isn't necessary to achieve
   the simplification goal (the complexity being cut is the client-side
   download-and-query pattern, per spec.md's Assumptions).
4. Confirm the token/access-control approach for Turso (a short-lived or read-scoped
   client token vs. a small serverless API route proxying queries) before implementation,
   since this determines whether FR-006 (no weaker access control than today) is met.

## Sources

- Vercel Postgres → Neon transition: https://neon.com/docs/guides/vercel-postgres-transition-guide
- Vercel free tier limits (2026): https://www.promptstoproduct.com/vercel-free-tier-limits
- Vercel Blob storage limits: https://artificialintelligenceherald.com/technology/vercel-blob-store-limit-increased-hobby-2026
- Neon pricing (2026): https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/
- Neon free tier: https://agentdeals.dev/vendor/neon
- Turso pricing: https://turso.tech/pricing
- Turso pricing breakdown (2026): https://saaspricehub.io/tools/turso
