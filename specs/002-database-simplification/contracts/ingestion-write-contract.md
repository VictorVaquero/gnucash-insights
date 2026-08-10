# Contract: `cashpy-processor` → Turso write path

Replaces today's `cashpy-processor/src/gcparser/app.py` Lambda handler (S3-triggered,
writes CSVs + `cash.db` back to S3). Per spec.md's Decisions, this pipeline moves off AWS
Lambda entirely, to a local script the owner runs manually right after each GnuCash
export.

## Trigger

Manual: the owner runs the local CLI after exporting a `.gnca` file from GnuCash. No S3
`ObjectCreated` event, no Lambda invocation.

## Invocation (extends today's existing local CLI, per research.md's Portability finding)

```
python -m gcparser -f <path-to-.gnca-export> -o <output-dir>
```

Today this already runs the full parse → transform → local-SQLite-write pipeline with
zero AWS coupling. This spec changes only the final write step (`core/sql.py`) from
"write a local SQLite file" to "push tables to Turso" — parsing/splitting/transforming
logic (`parser.py`, `splitter.py`, `transformer.py`) is untouched.

## Required local environment

```
TURSO_DATABASE_URL=libsql://<db-name>-<org>.turso.io
TURSO_WRITE_TOKEN=<long-lived, full-access, single-database token>
```

Both live only in the owner's local shell/`.env` (gitignored), the same trust boundary as
today's local GnuCash export step. `TURSO_WRITE_TOKEN` is **never** used by
`api/turso-token.ts`, never stored in Vercel, and never reaches the browser — it exists
solely for this local write path. This is the credential-scoping split that keeps
Principle V satisfied: read access is short-lived and browser-scoped (see
`turso-token-endpoint.md`), write access is long-lived but confined to the owner's local
machine, exactly as write access to the S3 bucket is today (an AWS credential the owner
holds locally/in the Lambda's IAM role, never in the browser).

## Write behavior (unchanged rebuild semantics, new destination)

Same full-rebuild pattern as today's `save_to_sql()`: `DROP TABLE`/`CREATE TABLE`/bulk
`INSERT` for every table in `data-model.md`'s list, including the in-database-built
tables (`timetable`, `accountsClosure` via `WITH RECURSIVE`, `summary_monthly` /
`summary_quarterly` / `summary_yearly`). The only change is the client used to execute
these statements: a libSQL/Turso Python client instead of stdlib `sqlite3` against a
local file. Because the run is a full rebuild each time (not incremental), this
directly implements the "latest-only" decision from `data-model.md` — there is no
partial-update path to reconcile.

## Removed as part of this contract

- The `boto3` S3 `get`/`put` calls in `app.py` (both the `.gnca` download-from-S3 step and
  the CSV/`cash.db` upload-to-S3 step).
- `app.py` itself (the Lambda handler) and `template.yml` (the SAM/Lambda deployment
  config), once the cutover is verified — per constitution Principle I, removed in a
  separate, later change after the Turso path is confirmed working, not simultaneously
  with introducing it.

## Non-goals

- No change to the `.gnca` export step itself (still a manual GnuCash export to a local
  file) — only what happens _after_ the file exists on disk.
- No incremental/partial-update logic — full rebuild each run is retained as-is.
