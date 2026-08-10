# Contract: CI Check Names, Triggers, and Gating Behavior

This is the "interface" this spec exposes to the rest of the project: the set of named
CI checks that appear on every PR/push, which ones are required-to-merge, and what each
one gates. Specs 007-009 (and any future PR) are implemented against this contract — a
later spec should not need to guess which checks exist or when they run.

## Checks defined by this spec

| Check (job name)                    | Workflow file                     | Trigger                                            | Runs                                                                                                                                           | Gates                                    |
| ----------------------------------- | --------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `install-lint-typecheck-build-test` | `.github/workflows/ci.yml`        | `push`, `pull_request` (any branch)                | `pnpm install --frozen-lockfile` → `pnpm lint` → `tsc --noEmit` → `pnpm build` → `pnpm test` (Vitest unit+component) → `pnpm run format:check` | Every PR (required)                      |
| `lighthouse`                        | `.github/workflows/ci.yml`        | `push`, `pull_request` (any branch), after `build` | `pnpm run perf` (`lhci autorun` against local `vite preview`)                                                                                  | Every PR (required)                      |
| `bundle-size`                       | `.github/workflows/ci.yml`        | `push`, `pull_request` (any branch), after `build` | `pnpm run size` (`size-limit`)                                                                                                                 | Every PR (required)                      |
| `e2e`                               | `.github/workflows/e2e.yml`       | `push` to `master` only                            | `pnpm run test:e2e` (Playwright, chromium + 375px-viewport projects)                                                                           | Merge to `master` only (not PR-blocking) |
| `csp-drift`                         | `.github/workflows/csp-drift.yml` | unchanged (spec 005)                               | unchanged                                                                                                                                      | unchanged                                |

## What a future spec/PR can rely on

- **Every PR** gets a single combined pass/fail signal from `ci.yml`'s three jobs
  (`install-lint-typecheck-build-test`, `lighthouse`, `bundle-size`) within a few minutes
  (SC-001) — no manual local run is required to catch a lint/type/build/perf/bundle
  regression before merge.
- **`pnpm test`** locally and in CI runs only the fast Vitest suite (unit + component) —
  it does **not** run Playwright. A contributor running `pnpm test` before pushing sees
  the same signal `ci.yml` will report, minus Lighthouse/size-limit/e2e.
- **Playwright e2e never blocks a PR.** It only runs after merge to `master`, so a
  regression it catches is visible on `master`'s Actions tab, not as a PR status check. A
  future spec that wants e2e coverage for new golden-path behavior adds a spec to
  `e2e/*.spec.ts` — it will start running automatically on the next merge, with no
  workflow-file change needed.
- **A pre-commit/pre-push hook mirrors part of this** locally (lint+format on staged
  files pre-commit; `tsc --noEmit` pre-push, `research.md` items 2–3) but is not a
  substitute for the CI checks above — CI is the source of truth; the hooks exist to
  shorten the feedback loop, not replace it (a hook can be bypassed with `--no-verify`;
  CI cannot).
- **Required-check branch protection**: this spec's implementation should set
  `install-lint-typecheck-build-test`, `lighthouse`, and `bundle-size` as required status
  checks on `master` in GitHub's branch protection settings (a manual, one-time GitHub UI
  step — not something this spec's code can automate, since it's a repo-settings change
  outside any file this repo's CI has permission to write). `e2e` is intentionally **not**
  a required PR check (it only runs post-merge) but should be watched — a merge-to-
  `master` `e2e` failure is a signal to fix forward promptly, not a blocked merge.

## Non-goals

- This contract does not cover deployment (Vercel's own build/deploy pipeline is
  unaffected by this spec — it remains triggered by Vercel's GitHub integration
  independently of these Actions workflows).
- This contract does not define a required code-coverage percentage (per the spec's
  Assumptions — no fixed target).
