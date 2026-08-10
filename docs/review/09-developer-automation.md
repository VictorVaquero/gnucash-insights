# Developer automation (scripts, hooks, CI/CD)

**Priority**: P1 · **Status**: Planning done — see specs/006-dev-automation-and-quality-gates

## Why this matters

This is the doc that makes every other "scripted, not one-off" recommendation in this
folder ([06](06-performance.md), [07](07-accessibility.md),
[01](01-dependencies-and-config-hygiene.md)) actually run automatically instead of
staying available-but-unrun.

## Current state (confirmed findings)

- **[confirmed]** No `.github/` workflows exist at all — no CI runs lint, typecheck,
  build, or (once they exist) tests on push/PR today.
- **[confirmed]** No git hooks configured anywhere — no husky/lint-staged/
  simple-git-hooks; `.git/hooks/` only has the default `.sample` files.
- No formatter (Prettier or equivalent) configured — formatting consistency currently
  relies on ESLint's stylistic rules (if any) plus manual discipline.
- No Dependabot/Renovate config exists.
- No commit message / PR conventions enforced (no commitlint, no PR template).

## Goals

- Lint/typecheck/build (and, once they exist, tests) run automatically on every push/PR.
- Common mistakes (the kind this review already found by hand — duplicate ESLint config,
  a `components.json` pointing at a nonexistent file) get caught at commit time, not
  discovered months later during a review pass.
- Dependency updates and vulnerability alerts surface automatically.

## Recommended approach

- **CI**: a minimal GitHub Actions workflow —
  `pnpm install` → `pnpm lint` → `tsc --noEmit` → `pnpm build` → `pnpm test` (once tests
  exist) → (once they exist) [06-performance.md](06-performance.md)'s Lighthouse/size
  budgets and [01-dependencies-and-config-hygiene.md](01-dependencies-and-config-hygiene.md)'s
  `knip` check. Cheap to add given Vercel already builds on every push anyway — this
  just surfaces failures faster and as a visible PR check rather than a Vercel build log
  nobody reads until something's already broken.
- **Git hooks**: `husky` + `lint-staged` for a pre-commit hook (ESLint + Prettier, if
  adopted, on staged files only — fast), and a pre-push hook running `tsc --noEmit`
  (slower, but push is a less frequent event than commit).
- **Dependency updates**: Dependabot (GitHub-native, zero extra tooling to adopt) is the
  lowest-effort starting point over Renovate; revisit only if Dependabot's
  configurability proves insufficient.
- **PR template**: a short checklist (tested locally? touches `src/config.json`/secrets?
  touches the cross-repo CSP coupling documented in
  [04-security.md](04-security.md)?) — cheap, and a natural complement to
  [17-ai-tooling-and-agent-instructions.md](17-ai-tooling-and-agent-instructions.md)'s
  AI-assisted review rather than a replacement for it.

## Phased plan

1. **Phase 1 — CI skeleton**: add `.github/workflows/ci.yml` running install → lint →
   typecheck → build on every push/PR. No test step yet (none exist).
2. **Phase 2 — git hooks**: add husky + lint-staged (pre-commit) and a `tsc --noEmit`
   pre-push hook.
3. **Phase 3 — formatter decision**: adopt Prettier (or explicitly decide not to) and
   wire it into lint-staged if adopted.
4. **Phase 4 — Dependabot**: minimal `.github/dependabot.yml` for `npm`/pnpm ecosystem
   updates, weekly cadence.
5. **Phase 5 — expand CI as other docs land**: add the test suite
   ([08-testing-infrastructure.md](08-testing-infrastructure.md)) and performance/size
   budgets ([06-performance.md](06-performance.md)) as CI steps once they exist.
6. **Phase 6 — PR template**: add `.github/pull_request_template.md`.

## Open decisions — decided 2026-08-10

- **Add Prettier.** Wire into `lint-staged` per phase 3.
