# Documentation & README

**Priority**: P1 · **Status**: Planning only

## Current state (confirmed findings)

- **[confirmed]** `README.md` is stale — still opens with ad hoc Vite troubleshooting
  notes from before the Vercel migration, and doesn't mention Turso, the spec-kit
  workflow, or `docs/`.
- `docs/architecture.md` and `docs/decisions.md` exist (added earlier in this review
  effort) but aren't yet linked from the README, so they're effectively undiscoverable
  to anyone who lands on the repo root first.

## Goals

- Someone new to the repo (including a future context-reset AI session) can get
  productive from the README alone: what it is, how to run it, how to test it, where to
  find the deeper docs.
- No duplication between the README and `docs/architecture.md`/`docs/decisions.md` — the
  README summarizes and links, it doesn't re-explain.

## Recommended approach — required README sections

- **What this is**: one paragraph — a personal finance dashboard fed from GnuCash data,
  what it shows (summary/analysis/travels/expenses/investments), useful both for a
  returning-after-a-break maintainer and for portfolio-piece viewers.
- **Architecture at a glance**: 2–3 sentences + a link to `docs/architecture.md`.
- **Getting started**: Node/pnpm version (once
  [02-config-schemas-and-validation.md](02-config-schemas-and-validation.md)'s `engines`
  field lands, quote it directly), `pnpm install`, required `.env` vars (link
  `.env.example`), `pnpm dev`, how to get guest/demo access locally vs. what needs real
  Cognito/Turso credentials.
- **How to use it**: guest login vs. real login, what each page shows.
- **Testing** (once [08-testing-infrastructure.md](08-testing-infrastructure.md) lands):
  how to run unit/component/e2e tests locally.
- **Deployment**: push-to-deploy via Vercel; link `docs/decisions.md` for the "why"
  rather than re-explaining it.
- **Spec-kit workflow**: brief pointer to `specs/` and the `/speckit-*` commands.

## Phased plan

1. **Phase 1**: rewrite `README.md` with the sections above using currently-true facts
   (skip the Testing section content until phase 2, just note "no automated tests yet,
   see `docs/review/08-testing-infrastructure.md`").
2. **Phase 2**: once [08-testing-infrastructure.md](08-testing-infrastructure.md) is
   actioned, fill in the Testing section for real.
3. **Phase 3**: add a short `CONTRIBUTING.md` only if/when the repo going public is
   expected to invite outside contributions — explicitly skip otherwise (solo-maintained
   project, no audience for contribution process overhead yet).

## Open decisions (owner input needed)

None.
