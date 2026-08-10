# Config schemas & validation

**Priority**: P2 · **Status**: Planning done — see specs/005-repo-hygiene-security-and-public-readiness

## Why this matters

Nothing in the repo currently declares a `$schema` for its own config files, and nothing
validates config shape at build/runtime — a typo in `vercel.json` or `components.json`
fails silently or late (a confusing runtime error, or a silently-ignored setting) rather
than being flagged immediately in the editor or at build time.

## Current state (confirmed findings)

- **[confirmed]** No `$schema` field in `vercel.json`, `tsconfig.json`, or
  `components.json` — all three have a well-known public schema available.
- **[confirmed]** `src/config.json` has no schema/type validation at all — it's imported
  straight into `authService.tsx` (`import config from "../config.json"`) and trusted
  as-is. See [03-secrets-and-public-repo-readiness.md](03-secrets-and-public-repo-readiness.md)
  for the privacy-relevant contents of this same file.
- `.env.example` vs. actual required env vars: last known drift was the now-dead
  `VITE_DATA_SOURCE` entry (see
  [01-dependencies-and-config-hygiene.md](01-dependencies-and-config-hygiene.md)) — not
  otherwise audited for completeness in this pass.
- **[confirmed]** `package.json` has no `engines` field pinning the Node version Vercel
  builds with — currently relying entirely on Vercel's default/auto-detection.

## Goals

- Every hand-maintained config file gets IDE-level validation (autocomplete + inline
  error on typo), for free, via a `$schema` reference.
- `src/config.json` fails fast and loudly on a malformed edit, rather than surfacing as a
  confusing runtime auth error somewhere downstream.
- The Node version this app builds/runs on is an explicit, version-controlled fact, not
  an implicit platform default that can silently change.

## Recommended approach

This is almost entirely mechanical — no architectural decision needed, just execution:

- Add `"$schema": "https://openapi.vercel.sh/vercel.json"` to `vercel.json`.
- Add `"$schema": "https://json.schemastore.org/tsconfig"` to `tsconfig.json` (and any
  other `tsconfig.*.json` if the project splits configs).
- Add shadcn's published schema URL to `components.json` (check the current shadcn docs
  for the exact URL at implementation time, since it's versioned).
- For `src/config.json`: define a `zod` schema (zod is a reasonable new dependency here —
  TanStack Router's `validateSearch` already leans on the same pattern of runtime
  validation) and validate once at import time in `authService.tsx`, throwing a clear
  error naming the missing/malformed field rather than letting a `undefined.region`-style
  error surface deep in the Cognito SDK call.
- Add `"engines": { "node": ">=22" }` (or whatever version this repo actually targets) to
  `package.json`.

## Phased plan

1. **Phase 1**: add `$schema` fields to `vercel.json`, `tsconfig.json`,
   `components.json` — zero-risk, no code change, immediate IDE benefit.
2. **Phase 2**: add the `zod` schema for `src/config.json` and wire the validation call
   into `authService.tsx`'s import path.
3. **Phase 3**: audit `.env.example` against actual `import.meta.env.VITE_*` usages in
   `src/` for completeness/drift; add a small startup assertion (throw if a required
   `VITE_*` var is `undefined`) so a missing env var in a new environment fails
   immediately instead of producing a downstream `undefined`-shaped bug.
4. **Phase 4**: add the `engines` field to `package.json`.

## Open decisions (owner input needed)

None — this is low-risk mechanical work; no decision blocks starting it.
