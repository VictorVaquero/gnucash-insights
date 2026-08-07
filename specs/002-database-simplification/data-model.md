# Data Model: Database & Data Loading Simplification

The logical schema is unchanged from today's SQLite file (`src/db/schema.ts`) — Turso is
SQLite-wire-compatible, so every `sqliteTable` definition carries over without a rewrite.
This document restates the entities for completeness and calls out the one structural
change (snapshot/book representation), per spec.md's FR-008 requirement that any such
change be explicit, not silently dropped.

## Entities carried over unchanged (source: `src/db/schema.ts`)

| Table | Purpose | Key relationships |
|---|---|---|
| `meta` | One row of book-level metadata (parse date/version, min/max transaction date) | — |
| `books` | One row per GnuCash "book" (id, version, entity counts) | referenced by `accounts`, `commodities`, `prices`, `transactions`, `accountsClosure`, `fullTransactions` via `bookId` |
| `accounts` | Chart of accounts (id, name, type, parent, commodity) | self-referencing `parent`; references `books`, `commodities` |
| `commodities` | Currencies/securities | referenced by `accounts`, `prices` |
| `prices` | Commodity price history | references `commodities` (both `commodity` and `currency`) |
| `transactions` | GnuCash transactions | references `commodities` (currency) |
| `splits` | Transaction line items | references `transactions` |
| `timetable` | Pre-generated 20-year daily calendar (built in-database at ingestion) | — |
| `accountsClosure` | Recursive parent/child account closure (built via `WITH RECURSIVE`, the Drizzle raw-SQL escape hatch noted in research.md) | references `accounts` (child, parent), `books` |
| `summary_monthly` / `summary_quarterly` / `summary_yearly` | Pre-aggregated totals per account per period | references `accounts` |
| `fullTransactions` | Denormalized transaction+split+account view | references `books`, `transactions`, `accounts`, `commodities` |

All of the above are rebuilt from scratch on every ingestion run today (`DROP
TABLE`/`CREATE TABLE`/bulk `INSERT` in `cashpy-processor`'s `core/sql.py`) — this
full-rebuild behavior is unchanged; only the *destination* of the write changes (a local
SQLite file → a Turso database, over the libSQL client instead of stdlib `sqlite3`).

## Structural change: book/snapshot representation (FR-008)

**Before**: every dated GnuCash export is a distinct, browsable unit — a full `cash.db`
(containing its own `books`/`accounts`/... rows) stored under its own timestamped S3
folder (`gnucash/processed/{export-name}/cash.db`). Multiple exports coexist in S3
indefinitely.

**After (owner-approved in spec.md's Decisions)**: **latest-only**. A single Turso
database holds exactly one generation of these tables at a time; each ingestion run drops
and rebuilds them in place (same rebuild logic as today, new destination). There is no
multi-snapshot browsing — the previous export's data is fully replaced, not archived
alongside the new one.

**Why this is safe to drop**: no evidence the multi-snapshot browsing UI is exercised in
practice (research.md's Recommendation section, item 2); `booksTable` itself is
unaffected structurally — it already models "one book," not "one export folder," so no
schema change is needed to represent latest-only, only a change in *how many* generations
are retained (one, not N).

## New concept: access-scoped tokens (not a data table)

Not part of the financial dataset, but introduced by Phase 0's access-control design
(`plan.md`): a Turso auth token is a bearer credential, not a database row. Two kinds
exist, both external to the schema above:

- **Read-only, short-lived, single-database token** — minted per authenticated session by
  `api/turso-token.ts`; used by the browser for all dashboard queries.
- **Full-access, long-lived token** — held only in the owner's local environment; used
  exclusively by `cashpy-processor`'s local ingestion script to write the tables above.

No token is persisted in the Turso database itself; this is purely an application-layer
credential, out of scope for the data model beyond this note.
