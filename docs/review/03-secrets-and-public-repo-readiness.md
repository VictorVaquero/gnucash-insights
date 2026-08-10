# Secrets & public-repo readiness

**Priority**: P0 — do this pass **before** the repo is made public, not after.
**Status**: Planning done — see specs/005-repo-hygiene-security-and-public-readiness

## Why this matters

This is the highest-stakes doc in the folder: everything else here is quality/DX, this
one is about what a stranger would see the moment the repo goes public.

## Current state (confirmed findings)

- **[confirmed]** `.gitignore` correctly excludes all `.env*` files and `.vercel/`; only
  `.env.example` is tracked. `git log --all` for `*.env`/`*secret*`/`*credential*` path
  patterns returns nothing — no secret **file** has ever been committed.
- **[confirmed]** No hardcoded email addresses anywhere in `src/` (regex swept across
  `.ts`/`.tsx`/`.json`).
- **[confirmed, needs an owner decision]** `src/config.json` is tracked in git and
  imported directly into client-bundled code (`import config from "../config.json"` in
  `authService.tsx`). It contains two categories of data:
  1. Cognito public-client identifiers (`region`, `userPoolId`, `clientId`,
     `cognitoUrl`) — not secrets by AWS Cognito's public-client design (already reasoned
     through explicitly in `specs/001-vercel-migration/spec.md` FR-007/Assumptions), so
     fine to keep committed as-is.
  2. A `database.victor.*` map from the real user's actual GnuCash account **GUIDs** to
     their semantic categories (checking/savings/income/expenses/assets/liability/
     investments/taxes) plus Spanish tax-category labels. This is structural/personal
     information about the actual owner's real finances — not a credential, but
     genuinely private data about a real person's financial setup.
- **[confirmed]** No `LICENSE` file, no `license` field in `package.json`.

## The one real decision here — decided 2026-08-10

`src/config.json`'s `database.victor.*` mapping: **(b) move it out of the repo.**
Relocate the mapping to a Vercel-injected build-time env var (or a server-side-only
config the client never receives, if the mapping isn't actually needed client-side at
all — worth checking whether it could move behind `api/turso-token.ts` instead of
shipping to the browser). This must land **before** the repo goes public.

## Goals

- No credential or exploitable secret ever reaches the public history (confirmed clean
  today; keep it that way).
- The one open PII question above gets an explicit, written decision before the repo is
  made public.
- A license (or explicit "no license granted" stance) is chosen deliberately.

## Recommended approach

Beyond the decision above, treat this as a **pre-publish checklist to run once, right
before flipping the repo to public** — not a continuous concern, since nothing here
changes on every commit the way lint/test status does.

## Phased plan

1. **Phase 1 — the config.json move**: scope the actual code change (env var plumbing
   through Vite's `import.meta.env` and/or a new `api/` route so the mapping never ships
   to the browser) as its own small spec.
2. **Phase 2 — full-history secret scan**: run a filename-pattern check (already done,
   clean) **plus** a content-based scan (`gitleaks` or similar) across full history —
   filenames alone don't catch a secret pasted inline into an otherwise innocuous commit
   message or diff.
3. **Phase 3 — Cognito User Pool signup check**: confirm in the AWS console whether the
   User Pool allows public self-signup. If it does, a public repo pointing at the real
   `userPoolId`/`clientId` effectively invites anyone to attempt account creation —
   decide whether to disable self-signup or accept the exposure.
4. **Phase 4 — `cashpy-processor` spot-check**: the separate ingestion pipeline (out of
   this repo's tree) may have its own equivalent of the `config.json` concern — check
   before assuming this repo is the only surface with owner-identifying data.
5. **Phase 5 — license**: pick a license (or explicit all-rights-reserved stance) and add
   `LICENSE` + `package.json`'s `license` field.
6. **Phase 6 — go public**: only after phases 1–5.

## Open decisions — decided 2026-08-10

- **`src/config.json`: move it out of the repo (option b)** — see above, blocking on
  going public.
- **License: MIT.**
