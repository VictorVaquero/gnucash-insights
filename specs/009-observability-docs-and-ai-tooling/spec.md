# Feature Specification: Observability, Documentation & AI Tooling Wrap-Up

**Feature Branch**: `009-observability-docs-and-ai-tooling`

**Created**: 2026-08-10

**Status**: Draft — ready to plan/task via `/speckit-plan`

**Review docs covered**: [`docs/review/10-documentation-and-readme.md`](../../docs/review/10-documentation-and-readme.md), [`docs/review/17-ai-tooling-and-agent-instructions.md`](../../docs/review/17-ai-tooling-and-agent-instructions.md), [`docs/review/18-observability-and-monitoring.md`](../../docs/review/18-observability-and-monitoring.md)

**Input**: User description: "Wrap-up spec: confirm Vercel's built-in deployment-failure notifications are actually configured and working — owner-confirmed (2026-08-10) that the lack of Sentry/uptime monitoring hasn't caused a real problem yet, so both stay explicitly deferred, not added speculatively. Write a CLAUDE.md with a tech-stack summary, the guest-login-only rule for AI agents (never sign in as the real user), a never-commit-without-asking rule, a spec-kit pointer, and a cross-repo warning about resumeweb/bro_cv_web boundaries (matching the standing 'don't touch bro_cv_web' rule this whole project has followed). Custom subagents stay deferred until CI/tests exist (i.e. until spec 006 lands). Rewrite the README covering What/Architecture/Getting started/How to use/Testing/Deployment/spec-kit pointer sections; CONTRIBUTING.md stays explicitly deferred unless the repo going public (spec 005) actually invites outside contributions. This is the fifth and final spec in the sequence derived from docs/review/, documenting the end state of everything specs 005-008 changed."

**Sequencing note**: run this spec **fifth and last**. Its README rewrite and `CLAUDE.md`
should describe the _end state_ of the app after specs 005-008 have landed (correct tech
stack, correct testing story, correct theming/i18n/design-system/security state), so
writing it first would mean rewriting it again once those land.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Deployment failures are actually surfaced, without adding speculative monitoring (Priority: P1)

Vercel has built-in deployment-failure notifications; whether they're actually configured
and reaching the owner hasn't been confirmed. Sentry and uptime monitoring stay
explicitly deferred per the owner's 2026-08-10 confirmation that their absence hasn't
caused a real problem.

**Independent Test**: trigger (or review the config for) a Vercel deployment failure;
confirm a notification actually reaches the owner, not just that the setting exists.

**Acceptance Scenarios**:

1. **Given** the Vercel project's notification settings, **When** checked, **Then**
   deployment-failure notifications are confirmed enabled and reaching a channel the
   owner actually monitors.
2. **Given** the owner's 2026-08-10 confirmation, **When** recorded, **Then**
   `docs/decisions.md` states explicitly that Sentry/uptime monitoring are deferred by
   deliberate choice, not an oversight.

---

### User Story 2 - A CLAUDE.md exists with the rules AI agents actually need (Priority: P1)

AI coding agents need to know: the tech stack, that they must only ever guest-login
(never sign in as the real user), that they must never commit without asking first,
where to find the spec-kit workflow, and the `resumeweb`/`bro_cv_web` boundary rules.

**Independent Test**: a fresh AI agent session, given only `CLAUDE.md`, correctly states
it must guest-login only, ask before committing, and never edit `bro_cv_web`.

**Acceptance Scenarios**:

1. **Given** `CLAUDE.md` at the repo root, **When** read, **Then** it states the tech
   stack (TanStack Router/Query, Drizzle+Turso, Cognito+guest auth, Vercel deployment)
   concisely.
2. **Given** the same file, **When** read, **Then** it explicitly states: guest login
   only, never sign in as the real user; never commit without asking; never edit
   `bro_cv_web`/`PabloVaqueroCVWeb`, with `resumeweb` edits requiring explicit direction.
3. **Given** the same file, **When** read, **Then** it points to the spec-kit workflow
   (`specs/`, `/speckit-specify`/`/speckit-plan`/`/speckit-tasks`).
4. **Given** custom subagents, **When** considered, **Then** they remain explicitly
   deferred until [006-dev-automation-and-quality-gates](../006-dev-automation-and-quality-gates/spec.md)
   has landed, with a one-line note explaining why.

---

### User Story 3 - The README describes the app as it actually is, end to end (Priority: P2)

The README is rewritten to cover what the app is, its architecture, how to get it
running locally, how to use it, how to test it, and how it deploys, with a pointer to the
spec-kit workflow.

**Independent Test**: a new contributor follows the README's "Getting started" section
alone and successfully runs the app locally with guest login, with no steps missing.

**Acceptance Scenarios**:

1. **Given** the rewritten README, **When** read top to bottom, **Then** it covers: What,
   Architecture, Getting started, How to use (guest vs. real login), Testing, Deployment,
   and a spec-kit pointer.
2. **Given** "Getting started" specifically, **When** followed on a clean checkout,
   **Then** the app runs locally with no undocumented steps.
3. **Given** `CONTRIBUTING.md`, **When** considered, **Then** it stays explicitly
   deferred unless [005-repo-hygiene-security-and-public-readiness](../005-repo-hygiene-security-and-public-readiness/spec.md)'s
   going-public step has happened and outside contributions are anticipated.

### Edge Cases

- A stale Vercel notification channel (e.g. old email) gets updated, not just confirmed
  as "working."
- The `docs/decisions.md` deferred-monitoring entry exists specifically so a future
  reviewer doesn't re-flag the Sentry gap without new evidence of an actual problem.
- If spec 006 hasn't landed yet when this spec runs, the README's "Testing" section is
  held as a stub rather than describing a test suite that doesn't exist.
- `docs/architecture.md` and `docs/decisions.md` get cross-referenced from the README,
  not duplicated.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Vercel deployment-failure notifications MUST be confirmed enabled and
  reaching a monitored channel.
- **FR-002**: The deferred status of Sentry/uptime monitoring MUST be recorded in
  `docs/decisions.md` as a deliberate choice.
- **FR-003**: `CLAUDE.md` MUST exist at the repo root with: tech-stack summary,
  guest-login-only rule, never-commit-without-asking rule, spec-kit pointer, and the
  `resumeweb`/`bro_cv_web` cross-repo boundary warning.
- **FR-004**: `CLAUDE.md` MUST state that custom subagents are deferred until spec 006's
  CI/test infrastructure exists.
- **FR-005**: The README MUST be rewritten to cover What, Architecture, Getting started,
  How to use, Testing, Deployment, and a spec-kit pointer.
- **FR-006**: The README's "Getting started" steps MUST be independently followable on a
  clean checkout.
- **FR-007**: `CONTRIBUTING.md` MUST NOT be added unless the repo has actually gone
  public and outside contribution is anticipated.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A deliberately-triggered (or reviewed) Vercel deployment failure produces a
  notification the owner actually sees.
- **SC-002**: A fresh AI agent session, given only `CLAUDE.md`, correctly identifies the
  guest-login-only and ask-before-commit rules without additional prompting.
- **SC-003**: A new contributor following only the README's "Getting started" section
  successfully runs the app locally.
- **SC-004**: `docs/decisions.md` contains an explicit, dated record of the
  Sentry/uptime-deferral decision.

## Assumptions

- This spec runs last and describes the end state after specs 005-008 — its README and
  `CLAUDE.md` content should be finalized once those specs' changes are actually in
  place, not speculatively ahead of them.
- "Confirming" Vercel notification settings is a dashboard-configuration check, tracked
  partly via `docs/review/19-manual-verification.md` for the live-notification test.
- No new monitoring tooling (Sentry, uptime pings, etc.) is added by this spec — that
  stays deferred per the owner's 2026-08-10 decision, revisitable only if a real incident
  later demonstrates the need.
