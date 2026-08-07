# Implementation Plan: Vercel Hosting Migration

**Branch**: `001-vercel-migration` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-vercel-migration/spec.md`

## Summary

Move hosting of the cashpy dashboard SPA from AWS S3 + CloudFront to Vercel, as its own
independent Vercel project, reachable at `victorvaquero.com/dashboard` via a `rewrites`
rule added to the sibling `resumeweb` Vercel project (already on Vercel, already owns the
apex domain). No changes to auth (Cognito), data fetching (S3 + sql.js), or application
code are in scope — this is purely a build/deploy/hosting change. The app already builds
with `base: "/dashboard/"` (Vite) and `basepath: "dashboard"` (TanStack Router), so the
existing build output requires no path changes.

## Technical Context

**Language/Version**: TypeScript 5.9 / Node.js — no `.nvmrc`/`engines.node` pinned today;
this plan adds both, matching resumeweb's pattern, pinned to the Node major already in use
locally (24) since Vercel supports it and there's no reason to jump to 26 speculatively.

**Primary Dependencies**: Vite 7 (build), React 19, TanStack Router 1.x (client-side
routing only, no SSR/prerendering), sql.js + drizzle-orm/sql-js (client-side DB,
unchanged), @aws-sdk/* (Cognito + S3, unchanged)

**Storage**: N/A for this spec — SQLite file fetched from S3 client-side, unchanged from
today. No server-side storage introduced.

**Testing**: No automated test suite exists in this app today. Verification for this spec
is manual: local build + `vite preview`, then browser verification against the deployed
Vercel preview and production URLs against the spec's acceptance scenarios.

**Target Platform**: Vercel static hosting (no serverless functions, no SSR) — pure static
SPA build (`vite build` → `dist/`), the same output shape Vercel already serves for
resumeweb (Astro static output), just a different framework producing it.

**Project Type**: Single-page web application (client-only, no backend in this repo)

**Performance Goals**: No material regression vs. current CloudFront-fronted S3 hosting;
Vercel's edge network is expected to be equal or better for a single-region personal app.

**Constraints**: Must be reachable at `victorvaquero.com/dashboard` (not a different
domain/subdomain); zero new secrets in the repo; must coexist with resumeweb without
coupling their deploy pipelines (per user's explicit choice — see spec Assumptions).

**Scale/Scope**: Single real user + guest demo login; negligible traffic. Free-tier Vercel
(Hobby plan) is expected to be more than sufficient.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Incremental, Reversible Migration**: PASS. Hosting-only change; old AWS S3 +
  CloudFront stays live and functional until the new Vercel deployment is verified
  (FR-009 documents decommission as a distinct, later step). Rollback is reverting the
  `resumeweb` rewrite — no data or auth migration is bundled in, so nothing here is
  irreversible.
- **II. Cost-Consciousness**: PASS. Vercel's Hobby (free) tier covers this app's traffic
  profile; no paid tier required. Decommissioning the old hosting bucket/distribution
  (after verification) net-reduces AWS cost. The `victor-mycash` data bucket is untouched.
- **III. Continuity of the Working App**: PASS. Spec's User Stories 1–3 and their
  acceptance scenarios exist specifically to gate this; old hosting remains live during
  verification (parallel-run, not cutover-then-verify).
- **IV. Boring, Well-Supported Technology**: PASS. Vercel + git-push-to-deploy is the same
  proven pattern already validated by resumeweb in this same account.
- **V. Data Privacy on a Public Surface**: PASS. No new data exposure — same client-side
  Cognito-gated S3 fetch as today, same public (non-secret) `config.json` identifiers,
  same security headers baseline (ported from resumeweb's `vercel.json`).

No violations. Complexity Tracking section not needed.

**Post-Phase 1 re-check**: Design artifacts (research.md, quickstart.md) introduce no new
services, no new secrets, and no new data flows beyond what's described above — the CSP
`connect-src` adjustment (research.md) only *allows* existing AWS calls this app already
makes, it doesn't add new ones. All five gates still PASS unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/001-vercel-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md         # Phase 1 output (manual verification guide)
├── checklists/
│   └── requirements.md  # Spec quality checklist (already complete)
└── tasks.md              # Phase 2 output (/speckit-tasks)
```

No `data-model.md` or `contracts/` — this spec introduces no new data entities or
interfaces; it only changes where existing build artifacts are served from.

### Source Code (repository root)

Single-project static SPA; no new source directories introduced. Relevant
existing/changed files:

```text
cashpy_v2/                       (this repo — becomes its own Vercel project)
├── vite.config.ts                # base: "/dashboard/" — already correct, verify unchanged
├── package.json                  # remove aws-cli deploy/clean scripts; add engines.node
├── vercel.json                   # NEW — security headers (ported from resumeweb), SPA fallback rewrite
├── .nvmrc                        # NEW — pin Node version, matching resumeweb's pattern
└── dist/                         # build output Vercel serves (unchanged build command)

resumeweb/                        (sibling repo — small, separate change, out of this repo's tree)
└── vercel.json                   # ADD a `rewrites` entry: /dashboard/(.*) → cashpy_v2's Vercel deployment URL
```

**Structure Decision**: Two independent Vercel projects (this repo, and the existing
resumeweb project), joined only by one `rewrites` rule living in resumeweb's
`vercel.json`. No monorepo, no shared build. This matches the user's explicit choice to
keep deploy pipelines decoupled and rollback trivial.

## Complexity Tracking

*No constitution violations — section not needed.*
