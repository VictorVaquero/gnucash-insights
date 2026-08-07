# Implementation Plan: Database & Data Loading Simplification

**Branch**: `002-database-simplification` (work committed directly to `master`,
matching this repo's existing spec-kit practice) | **Date**: 2026-08-07 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-database-simplification/spec.md`,
decisions recorded in that spec's "Decisions (post-research, owner-approved
2026-08-07)" section, and the option comparison in `research.md`.

## Summary

Replace the S3-file + client-side-sql.js data path with a hosted **Turso** (libSQL)
database, queried directly by the browser through `drizzle-orm/libsql`. `cashpy-processor`
moves off AWS Lambda to a local script (its already-AWS-free parsing core, run manually
after each GnuCash export) that writes straight to Turso instead of uploading `cash.db`
to S3. Snapshot history is dropped in favor of latest-only (one database, updated in
place). Drizzle stays as the query layer — this is a driver swap
(`drizzle-orm/sql-js` → `drizzle-orm/libsql`) against the existing schema and ~1,150 lines
of query code, not a rewrite. The one design question research.md left open — how a
Turso credential reaches the authenticated browser without weakening today's
Cognito-gated access control — is resolved below in Phase 0.

## Technical Context

**Language/Version**: TypeScript (frontend, Node ≥24 per `package.json` `engines`),
Python 3.12 (cashpy-processor, unchanged)

**Primary Dependencies**: `drizzle-orm` (already present, `^0.36.4`), `@libsql/client`
(already present in `package.json` but currently unused in `src/` — confirms this
direction was anticipated), React 19 + TanStack Router/Query (unchanged), AWS Cognito
SDKs (unchanged — auth stays on Cognito). On the Python side: a libSQL/Turso client
(`libsql-client` or `libsql-experimental`, to be pinned during implementation) replacing
the raw `sqlite3` write step in `core/sql.py`; `boto3` is dropped entirely from
`cashpy-processor` once the S3 upload step is removed.

**Storage**: Turso (hosted libSQL, SQLite-dialect) — one production database, latest-only
(no per-export snapshot history). Replaces the `victor-mycash` S3 bucket for this
pipeline (the bucket itself is not decommissioned by this spec, per spec.md's Decisions).

**Testing**: No automated test framework is configured in `cashpy_v2` today (no
vitest/jest in `package.json`); verification is manual-in-browser per the constitution's
Principle III. `cashpy-processor` has `pytest` (`tests/test_parser.py`) — parsing-layer
tests are unaffected by this change; the new Turso-write step gets a manual smoke test
(`quickstart.md`) rather than new pytest coverage, consistent with this being a
personal-scale project and not expanding test scope beyond what the spec requires.

**Target Platform**: Browser (Vercel-hosted SPA, `victorvaquero.com/dashboard`) for the
dashboard; a new minimal Vercel Serverless Function for token issuance (see Phase 0);
local machine (owner's laptop) for the `cashpy-processor` ingestion script, replacing AWS
Lambda.

**Project Type**: Web application (existing SPA) + a new minimal server-side component
(one API route) — this spec is what introduces `cashpy_v2`'s first backend code, since
today's app is 100% static/client-side.

**Performance Goals**: Match or beat today's full-`cash.db`-download-then-parse time to
first data render (SC-003) — a direct libSQL query round-trip is expected to beat
downloading and locally parsing a ~4MB SQLite file, but this must be confirmed manually
(see quickstart.md), not assumed.

**Constraints**: $0/month recurring cost (FR-003, constitution Principle II); no
architectural regression in access control (FR-006, constitution Principle V); every
existing dashboard page must produce identical output against the same dataset (FR-005,
SC-004); the app must stay usable throughout the migration (constitution Principle III) —
old (S3) and new (Turso) paths may briefly coexist, then the old path is removed in a
separate change, not this one (constitution Principle I).

**Scale/Scope**: ~4MB dataset, one real authenticated user + occasional guest demo
traffic, 5 existing dashboard pages (summary, expenses, travels, investments, analysis)
to keep working unchanged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. Incremental, Reversible Migration**: PASS. The plan below keeps the S3/Cognito
  read path intact until the Turso path is verified in production (feature-flag-style
  cutover via an env var / config toggle, not a simultaneous rip-and-replace), then
  removes the old path as a distinct follow-up task. Rollback is "flip the toggle back,"
  no multi-system coordination required.
- **II. Cost-Consciousness**: PASS. Turso's free tier (5GB storage, 500M row reads/month,
  no card required) is documented in research.md with large headroom at this app's ~4MB /
  single-user scale; FR-003's $0/month default is maintained. No time-boxed trial, no
  silent-billing risk at this usage level (metered overage past free tier, not a
  surprise charge — see research.md Option C).
- **III. Continuity of the Working App**: PASS, contingent on executing the cutover as a
  distinct final task with manual golden-path verification (login → data loads → charts
  render, plus guest path) before the S3 path is removed, per quickstart.md.
- **IV. Boring, Well-Supported Technology**: PASS. Turso is libSQL/SQLite-compatible
  (same dialect the app already uses), actively maintained, with an official
  `@libsql/client` already a project dependency. Drizzle is kept rather than swapped
  (research.md's ORM section) — no novel tooling introduced beyond the necessary Turso
  client itself.
- **V. Data Privacy on a Public Surface**: **Needs a concrete answer, resolved in Phase 0
  below.** Turso credentials must not reach unauthenticated requests or the repo. The
  existing design has no server-side component at all (pure static SPA + direct
  Cognito-scoped S3 credentials), so introducing *any* database credential into the
  browser is new territory that must be designed carefully, not copy-pasted from the S3
  pattern.

No violations requiring Complexity Tracking — the one new component (a single token-
issuing serverless function) is the minimum necessary to satisfy Principle V, not
incidental complexity.

## Phase 0: Outline & Research

`research.md`'s comparison and Decisions in `spec.md` already resolve the database
choice, snapshot-history scope, `cashpy-processor`'s new home, and the ORM question.
One item was explicitly left open there ("Open items for the owner to confirm", #4):
**how does the browser get a Turso credential without weakening today's access
control?**

### Decision: Token issuance via a minimal Vercel Serverless Function

**What was researched**: Turso's token model (`docs.turso.tech/sdk/authorization`) — the
CLI/Platform API can mint tokens scoped by permission (`--read-only` vs. full read-write),
by target (single database vs. group), and by lifetime (`--expiration`), e.g.:

```
turso db tokens create <db> --read-only --expiration 7d
```

A read-only token cannot write, but a *static* read-only token baked into the client
bundle would still be fetchable by anyone who loads the page — unauthenticated — which
fails FR-006 and constitution Principle V just as surely as shipping a write token would.
Turso's docs don't claim static client-embedded tokens are a supported pattern.

**Decision**: Add one Vercel Serverless Function (e.g. `api/turso-token.ts`) that:
1. Accepts the caller's existing Cognito ID token (the same one already produced by
   today's `authService.tsx` sign-in flow) and verifies it server-side (Cognito's JWKS
   endpoint — no new identity system introduced).
2. On success, returns a short-lived, single-database, **read-only** Turso token (minted
   via the Turso Platform API using a long-lived admin token held only in a Vercel
   environment variable, never shipped to the client).
3. The guest login path gets the same treatment — guest Cognito credentials in, a
   short-lived read-only token out — mirroring today's guest Identity-Pool flow rather
   than inventing a separate mechanism.

The **write path never touches this function or the browser**: `cashpy-processor`'s local
script uses a separate, long-lived, full-access Turso token stored only in the owner's
local environment (e.g. a `.env` file, gitignored, same trust boundary as today's local
GnuCash export step).

**Rationale**: This is the smallest change that closes the gap — one endpoint, reusing
Cognito (no new auth system, satisfying constitution Principle IV), gating data access
behind authentication exactly as strictly as today (a request must present a valid
Cognito token before any Turso credential is issued), and keeping the write credential
off the browser and off Vercel's runtime entirely.

**Alternatives considered**:
- *Static read-only token shipped in the client bundle*: rejected — readable by anyone
  who loads the page without logging in, a direct FR-006/Principle V violation.
- *Full server-side query proxy (every query goes through Vercel functions, no client-side
  DB access)*: rejected — this is what pushed Option B (Neon/Postgres) into "adds a
  required API layer," the exact architectural growth this spec exists to avoid for the
  chosen option; a token-issuance-only endpoint is far smaller than a full query-proxy
  API.
- *Turso "embedded replica" / sync to the browser*: not applicable — embedded replicas are
  a server/edge-runtime feature (libSQL local file + sync), not a browser-WASM pattern;
  out of scope at this app's scale.

**Output**: this section (research.md is not modified — spec.md's Decisions section is the
system of record for owner-approved choices, and this Phase 0 addendum lives in plan.md
since it's a design resolution, not a new option comparison).

### Decision: Guest/demo dataset — a second, separate Turso database

spec.md's Edge Cases explicitly leaves this open: does guest data live in the same
database as real data (with access control) or stay separate? Today it's a fully separate
S3 prefix (`config.json`'s `guestFolderPath` vs. `folderPath`), same Cognito Identity
Pool, different object keys.

**Decision**: mirror that exactly — a **second Turso database** (`cashpy-guest` or
similar), populated once from the existing guest sample dataset (not regenerated on every
real ingestion run, since it's static demo data, same as today). `api/turso-token.ts`
picks which database URL to mint a token against based on whether the verified caller is
the guest Cognito identity or the real user (same branch today's `DbService.tsx`/
`s3Service.tsx` already has via `user === "guest"`).

**Rationale**: Free (Turso's free tier allows up to 100 databases), avoids adding
row-level guest/real partitioning logic to every query in `src/db/queries/*.ts` (which
would touch all ~1,150 lines instead of only `DbService.tsx`/the token endpoint), and
keeps the blast radius of a guest-token leak limited to non-sensitive sample data by
construction (the guest token is never scoped to a database containing real financial
data at all, not just access-controlled away from it).

**Alternative considered**: one database, guest rows tagged and filtered by a `bookId` or
tenant column. Rejected — real rewrite of the query layer for a distinction that's purely
about demo-data isolation, not a real multi-tenancy requirement (constitution Principle
II's spirit: don't build for hypothetical scale this app doesn't have).

## Phase 1: Design & Contracts

**Prerequisites**: Phase 0 complete (above).

### data-model.md

The financial dataset's shape is unchanged from `src/db/schema.ts` (meta, books,
accounts, commodities, prices, transactions, splits, timetable, accountsClosure,
summary_monthly/quarterly/yearly, fullTransactions) — Turso is SQLite-wire-compatible, so
the existing Drizzle schema carries over as-is (research.md's Query-layer finding). The
only structural change is dropping the "book/snapshot" concept's *storage* representation
(no more one-S3-folder-per-export); `booksTable` itself is unaffected since it already
models one row per GnuCash "book," not per export folder. See `data-model.md` for the
full entity list carried over verbatim, called out explicitly rather than silently
assumed.

### contracts/

Two contracts, since this spec introduces the app's first server-side surface:

1. **`POST /api/turso-token`** — request: Cognito ID token (Authorization header);
   response: `{ url: string, token: string, expiresAt: string }` scoped read-only to the
   one production database. Documented in `contracts/turso-token-endpoint.md`.
2. **Ingestion write contract** — how `cashpy-processor`'s local script authenticates to
   Turso (env vars: `TURSO_DATABASE_URL`, `TURSO_WRITE_TOKEN`), and the invocation replacing
   today's Lambda trigger (`python -m gcparser -f <file> -o <dir>` gains a `--push` step,
   or an equivalent explicit push command — exact CLI shape decided during
   `/speckit-tasks`). Documented in `contracts/ingestion-write-contract.md`.

### quickstart.md

Manual end-to-end validation: run the local ingestion script against a real GnuCash
export, confirm the Turso database updates, log in as the real user and as guest in a
browser, confirm every existing page (summary, expenses, travels, investments, analysis)
renders correctly, compare numbers against the current S3-backed production site for the
same underlying data (SC-004), and time first-data-visible against today's baseline
(SC-003).

## Project Structure

### Documentation (this feature)

```text
specs/002-database-simplification/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (option comparison, /speckit-plan command)
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output
│   ├── turso-token-endpoint.md
│   └── ingestion-write-contract.md
└── tasks.md               # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

This feature spans two repositories: the dashboard (`cashpy_v2`, this repo) and the
ingestion pipeline (`../cashpy-processor`, a sibling repo, per constitution's Technology &
Cost Constraints section).

```text
cashpy_v2/                         # this repo — existing SPA, now gains its first backend
├── api/                           # NEW — Vercel Serverless Functions
│   └── turso-token.ts             # NEW — Cognito-verified, mints short-lived read-only Turso token
├── src/
│   ├── db/
│   │   ├── schema.ts              # UNCHANGED (sqliteTable defs carry over to libSQL)
│   │   └── queries/                # UNCHANGED (Drizzle query builder code)
│   └── services/
│       ├── DbService.tsx           # CHANGED — drizzle-orm/sql-js + OPFS file load
│       │                           #   → drizzle-orm/libsql direct connection using
│       │                           #   the token from /api/turso-token
│       ├── s3Service.tsx           # REMOVED once cutover is verified (Principle I: removed
│       │                           #   in a separate, later change, not this one)
│       └── authService.tsx         # UNCHANGED (Cognito sign-in stays as-is)
└── src/config.json                 # CHANGED — S3 bucket/folder config replaced by Turso
                                     #   database URL (token is never stored here)

cashpy-processor/                   # sibling repo — ingestion pipeline
├── src/gcparser/
│   ├── app.py                      # REMOVED (Lambda handler retired; no longer S3-triggered)
│   ├── __main__.py                 # CHANGED — local CLI entry point gains a Turso-push step
│   └── core/
│       ├── sql.py                  # CHANGED — output step: stdlib sqlite3 file write
│       │                           #   → libSQL/Turso client write (replaces the S3 upload
│       │                           #   in app.py, which is deleted)
│       ├── parser.py               # UNCHANGED (zero AWS coupling already, per research.md)
│       ├── splitter.py             # UNCHANGED
│       └── transformer.py          # UNCHANGED
└── template.yml                    # REMOVED once Lambda is decommissioned (SAM template)
```

**Structure Decision**: Existing SPA structure is preserved; the only new directory is
`cashpy_v2/api/` (Vercel's convention for serverless functions, auto-deployed alongside
the static build — no new build tooling required). On the ingestion side, no new files —
`cashpy-processor`'s existing local-CLI entry point (already AWS-free per research.md's
Portability finding) is extended, and the Lambda-specific `app.py`/`template.yml` are
removed once the cutover is verified, matching constitution Principle I's "remove the old
path in a distinct, separate change."

## Complexity Tracking

*No entries — the one addition beyond a pure driver swap (the `/api/turso-token`
function) is justified directly by constitution Principle V and FR-006, not incidental
complexity, and is the minimum-sized component that satisfies them (a token-issuer, not a
full query proxy).*
