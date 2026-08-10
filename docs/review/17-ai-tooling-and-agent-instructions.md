# AI tooling: PR review & agent instructions

**Priority**: P1 · **Status**: Planning only

## Why this matters

This whole `docs/review/` effort is itself being produced by an AI session re-deriving
project context from scratch each time. A `CLAUDE.md` is the cheapest possible fix to
that: it turns "grep the codebase and re-read `docs/architecture.md` each session" into
"read one file."

## Current state (confirmed findings)

- **[confirmed]** No root `CLAUDE.md` exists.
- **[confirmed]** No custom `.claude/agents/` exist.
- **[confirmed]** No custom `.claude/skills/` exist beyond the 10 pre-existing
  `speckit-*` skills that ship with the spec-kit workflow.

## Goals

- A future session (including a post-compaction continuation of this exact kind of work)
  can pick up project conventions immediately from one file, rather than re-deriving them.
- Standing rules already being followed *by convention* in this project's sessions get
  written down so they're enforced regardless of which session/model is doing the work.

## Recommended approach

**`CLAUDE.md` contents**:
- Tech stack summary, with a link to `docs/architecture.md` rather than duplicating it.
- The standing rule already followed this session: **guest login only** — never
  automate against the owner's real Cognito credentials in any test or script.
- The standing rule already followed this session: **never commit or push without being
  explicitly asked.**
- A pointer to the spec-kit workflow (`specs/`, `/speckit-*` commands) and to this
  `docs/review/` folder as the place planning-in-progress work lives.
- The cross-repo relationship with `resumeweb` (mount point, CSP coupling per
  [04-security.md](04-security.md)) — this is exactly the kind of project-specific fact
  a generic AI session has no way to know without being told, and has already caused two
  real incidents when missed or misidentified (see `docs/architecture.md`'s "Cross-repo
  naming incident" note). **`bro_cv_web` is a different, unrelated repo**
  (`drpablovaquero.com`, a third-party client site) that must never be confused with or
  edited as if it were `resumeweb` — a local folder name is not proof of what a repo is;
  check `git remote -v` before assuming.

**Custom subagents/skills**: not worth building yet. A project-specific review agent is
most valuable when it can point at real lint/type/test signal — right now there's no CI
and no test suite for it to lean on (see [08](08-testing-infrastructure.md),
[09](09-developer-automation.md)), so it would just be reading code, which the built-in
`/code-review` (including its `ultra` cloud-review mode) already does without any setup.
Revisit once CI/tests exist and give a custom agent something concrete to check.

## Phased plan

1. **Phase 1**: write `CLAUDE.md` with the sections above, using currently-true facts
   only (link to docs still being written in this folder using their planned filenames —
   they'll resolve once each lands).
2. **Phase 2**: once [09-developer-automation.md](09-developer-automation.md)'s PR
   template lands, cross-link it from `CLAUDE.md` (secrets/CSP-coupling checklist items
   are relevant to both automated and AI-assisted review).
3. **Phase 3 — revisit later**: once CI/tests exist, reconsider whether a custom
   project-specific review agent/skill is worth building, now that it would have real
   signal to check against.

## Open decisions (owner input needed)

None — this is low-risk, low-cost documentation work.
