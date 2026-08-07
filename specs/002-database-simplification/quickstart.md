# Quickstart: Validating the Turso Migration

Manual end-to-end validation, per constitution Principle III ("Manual verification in a
browser against the golden path ... plus the guest path is required before a phase is
marked complete"). No automated test suite covers this migration (see `plan.md`'s
Technical Context) — this document is the verification gate.

## Prerequisites

- A Turso account and a production database created (free tier, per `research.md`
  Option C).
- Two Turso tokens minted: one long-lived full-access token for local ingestion
  (`TURSO_WRITE_TOKEN`), one Platform-API admin token for `api/turso-token.ts` to mint
  short-lived read-only tokens from (see `contracts/turso-token-endpoint.md`).
- `TURSO_WRITE_TOKEN` and `TURSO_DATABASE_URL` set in the owner's local environment
  (`cashpy-processor`).
- The Turso admin token set as a Vercel environment variable (never committed, never
  exposed client-side).
- A real GnuCash `.gnca` export available locally.

## 1. Ingest a real export into Turso

```
python -m gcparser -f <path-to-export.gnca> -o <output-dir>
```

**Expected**: the script completes without error; querying the Turso database directly
(via `turso db shell <db>`) shows freshly rebuilt `accounts`, `transactions`, `splits`,
`summary_monthly`, etc. tables matching the export's contents.

## 2. Verify the token endpoint

With the dashboard deployed (or running locally against the deployed `/api` function):

- Attempt `POST /api/turso-token` with **no** Authorization header → expect `401`.
- Attempt it with an **expired/malformed** Cognito token → expect `401`.
- Sign in as the real user in the browser, then observe the app's own call to this
  endpoint (network tab) → expect `200` with a token, and confirm that token is
  **read-only** (attempt a write against it via `turso db shell` or a manual query — it
  must be rejected).

This directly exercises SC-005 (zero unauthenticated access to real financial data).

## 3. Golden path — real user

1. Log in as the real user.
2. Confirm the dashboard connects to Turso (not S3 — check network tab / remove S3
   credentials temporarily to prove no fallback dependency remains once cutover is
   complete).
3. Visit every existing page: summary, expenses, travels, investments, analysis.
4. Compare the numbers/charts shown against the current production site (still on S3 at
   this point, per the coexistence period in `plan.md`) for the **same underlying
   dataset** — they must be identical (SC-004, FR-005).

## 4. Guest path

1. Log out, use the guest demo login.
2. Confirm sample data loads with no new failure mode (FR-004's guest-path requirement).
3. Spot-check the same pages as step 3.

## 5. Timing comparison (SC-003)

On comparable network conditions, measure time-to-data-visible on the summary page:
- Before: current S3-download-and-parse path.
- After: direct Turso query path.

Record both numbers in the spec's completion notes; the new path must be equal or faster.

## 6. Cutover

Only after steps 1–5 all pass: remove the S3/Cognito-S3-credential read path
(`s3Service.tsx`, the S3-fetch branch of `DbService.tsx`) in a separate, distinct commit
— not combined with the steps above — per constitution Principle I. Decommissioning the
Lambda (`app.py`, `template.yml`) and, optionally, the S3 bucket itself follows as a
manual follow-up, same pattern as spec 001's AWS decommission note.
