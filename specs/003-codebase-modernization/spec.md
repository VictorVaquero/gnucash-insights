# Feature Specification: Codebase Review & Modernization

**Feature Branch**: `003-codebase-modernization`

**Created**: 2026-08-07

**Status**: Draft — not yet planned/tasked. Its ground is covered informally by the
`docs/review/` folder (see especially `12-library-choice-review.md`,
`13-component-library-and-design-system.md`) for the current review pass; run
`/speckit-plan` on this spec if/when a formal spec-kit implementation pass through it is
wanted instead.

**Input**: User description: "Review the actual page: update libraries, move onto better ones if they exist, clean up everything, make sure we're using best practices. Suggest other improvements found during the review."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Dependencies are current and unused ones are gone (Priority: P1)

As the app's maintainer, I want every dependency to be either actively used and reasonably
current, or removed, so the project isn't carrying dead weight or known-vulnerable
versions.

**Why this priority**: This is the most mechanical, lowest-risk category of cleanup and
underpins everything else — you can't reason about "best practices" while unused/outdated
packages muddy the picture.

**Independent Test**: Run a dependency audit (unused-package check + outdated/vulnerable
check) before and after; after should show zero unused runtime dependencies and no
known-critical vulnerabilities.

**Acceptance Scenarios**:

1. **Given** the current `package.json`, **When** an unused-dependency scan runs, **Then**
   every flagged unused dependency is either justified (e.g. required transitively for
   tooling) or removed.
2. **Given** the dependency set after cleanup, **When** checked against latest stable
   versions, **Then** each dependency is on a current major version unless a documented
   reason (breaking change not worth the churn, upstream deprecation) keeps it pinned
   back.

---

### User Story 2 - Configuration is not duplicated or contradictory (Priority: P1)

As the app's maintainer, I want exactly one source of truth for tooling configuration
(linting, TypeScript, build), so there's no ambiguity about which rules actually apply.

**Why this priority**: A conflicting/duplicated config (e.g. two ESLint config systems
present at once) is actively misleading — it's not just untidy, it can silently mean the
"real" ruleset in CI/editor isn't the one a developer thinks they're editing.

**Independent Test**: For each tool with configuration (ESLint, TypeScript, Vite,
Tailwind), confirm exactly one authoritative config file/format exists.

**Acceptance Scenarios**:

1. **Given** the repo has both a flat ESLint config (`eslint.config.mjs`) and a legacy
   `.eslintrc.cjs`, **When** the cleanup is done, **Then** only one remains and it's the
   one actually active for the installed ESLint version.
2. **Given** the consolidated config, **When** `pnpm run lint` runs, **Then** it completes
   without errors introduced by the consolidation itself.

---

### User Story 3 - Library choices reflect current best practice for this app's needs (Priority: P2)

As the app's maintainer, I want a deliberate review of whether each major library
(routing, data fetching, charting, state, DB access) is still the right choice, so the
stack isn't accumulating incidental complexity or working against the framework's grain.

**Why this priority**: Lower priority than P1 items because it's judgment-based and
higher-risk (swapping a library touches more surface area), but it's the part of "review
the page" that delivers the most long-term value.

**Independent Test**: A written review exists per major library area, stating "keep" or
"replace with X because Y", with replacements scoped as separate, reviewable changes.

**Acceptance Scenarios**:

1. **Given** the review, **When** a library is recommended for replacement, **Then** the
   recommendation states the concrete problem with the current choice (not replaced for
   novelty, per the constitution).
2. **Given** a library is kept, **When** the review is read, **Then** it's clear that was
   a deliberate decision, not an oversight.

---

### User Story 4 - Code follows consistent, current patterns (Priority: P2)

As the app's maintainer, I want the codebase to use consistent patterns for common
concerns (data fetching, error handling, component structure) so it's easier to extend
and reason about.

**Why this priority**: Valuable but more subjective and time-consuming than P1 fixes;
comes after the mechanical cleanup and library-level decisions are settled.

**Independent Test**: Spot-check a sample of routes/components against the patterns
documented in the review; inconsistencies are either fixed or explicitly deferred with a
reason.

**Acceptance Scenarios**:

1. **Given** the review identifies a repeated anti-pattern (e.g. duplicated data-fetching
   logic, inconsistent error handling), **When** the cleanup is applied, **Then** the
   pattern is consolidated or documented as an accepted exception.

---

### User Story 5 - Additional improvements are captured, not just implied (Priority: P3)

As the app's owner, I want any other issues or opportunities noticed during the review
(security, accessibility, performance, DX) written down even if not all are acted on
immediately, so nothing found gets silently lost.

**Why this priority**: Explicitly requested by the owner ("suggest other improvements"),
but lowest priority since it's about capturing findings, not blocking on acting on all of
them.

**Independent Test**: A findings list exists, each item categorized (security / a11y /
performance / DX / other) and marked as "addressed in this spec" or "deferred, tracked
here."

**Acceptance Scenarios**:

1. **Given** the review is complete, **When** the owner reads the findings list, **Then**
   every finding has a clear disposition (fixed, or deferred with reason).

### Edge Cases

- What happens when a recommended library replacement would touch the data layer decided
  in spec 002 (e.g. drizzle-orm's sql-js driver)? This spec MUST NOT re-open spec 002's
  decision; data-layer library choices are only revisited here if spec 002 already
  concluded a change and this spec is executing the follow-through.
- What happens if updating a dependency to its current major version introduces a breaking
  change with no reasonable migration path in available time? Documented as deferred with
  the specific blocker, not silently skipped.
- What happens to Storybook and MSW (currently present but their active use in day-to-day
  development is unclear from the codebase alone)? Their status (kept, updated, or
  removed) MUST be explicitly decided, not left ambiguous.
- What happens with the unused `better-sqlite3` + `@types/better-sqlite3` dependencies
  (present in `package.json` but not imported anywhere in `src/`, seemingly a leftover
  from `drizzle-kit` tooling)? Confirmed dead weight — remove unless a concrete tooling
  reason is found during review.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All dependencies in `package.json` MUST be scanned for actual usage in the
  codebase; any dependency with zero references (e.g. `better-sqlite3`) MUST be removed
  or its retention justified in writing.
- **FR-002**: All retained dependencies MUST be evaluated against their current stable
  release; each MUST be upgraded, or pinned-back with a documented reason.
- **FR-003**: The duplicate ESLint configuration (flat `eslint.config.mjs` vs. legacy
  `.eslintrc.cjs`) MUST be resolved to a single authoritative config.
- **FR-004**: A written library-choice review MUST cover at minimum: routing (TanStack
  Router), data fetching/caching (TanStack Query), charting (Recharts + custom D3 usage),
  client-side DB access (sql.js + drizzle-orm), and component/UI primitives
  (Radix + shadcn-style components) — each with a keep/replace recommendation and
  rationale.
- **FR-005**: Any library replacement recommended and actioned in this spec MUST preserve
  existing functionality (verified per the constitution's continuity principle) and MUST
  NOT silently change the data layer decided by spec 002.
- **FR-006**: A findings list covering security, accessibility, performance, and
  developer-experience observations MUST be produced, with each item marked as addressed
  in this spec or explicitly deferred with a reason.
- **FR-007**: The review MUST explicitly decide the fate of Storybook and MSW (kept &
  updated, or removed) based on whether they're in active use.
- **FR-008**: Code style/pattern inconsistencies found during the review (e.g. duplicated
  data-fetching or error-handling logic across routes) MUST be either consolidated or
  documented as accepted exceptions.
- **FR-009**: The review and its findings MUST be written to this spec's directory so the
  reasoning is preserved beyond the implementation itself.

### Key Entities

- **Dependency**: An entry in `package.json` (runtime or dev); evaluated for usage,
  currency, and whether a better alternative exists.
- **Finding**: A discrete observation from the review (a library recommendation, a
  cleanup item, a security/a11y/performance note), each with a category and a
  disposition.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero unused runtime dependencies remain in `package.json` after cleanup.
- **SC-002**: Zero duplicate/conflicting tool configurations remain (one ESLint config,
  one TypeScript config, etc.).
- **SC-003**: 100% of major library areas (routing, data fetching, charting, DB access,
  UI primitives) have a documented keep/replace decision.
- **SC-004**: Every review finding has an explicit disposition (fixed or deferred with
  reason) — none are left unaddressed and unmentioned.
- **SC-005**: The application's existing functionality (per spec 001/002's verified
  baseline) is unchanged after modernization, confirmed by manual verification of the
  golden path and edge cases per the constitution.
- **SC-006**: `pnpm run lint` and `pnpm run build` complete with zero errors after all
  changes.

## Assumptions

- **Runs last**: Per the constitution's migration workflow, this spec starts only after
  spec 001 (Vercel migration) and spec 002 (database simplification) are both complete,
  since library choices in the data layer depend on spec 002's outcome, and verifying
  "nothing broke" is easiest against an already-stable, already-migrated deployment.
- **No test suite exists today**: There is no automated test runner in this project
  currently. Introducing one is a reasonable candidate finding for this spec (best
  practice for a codebase of this size), but its absence today means "verify nothing
  broke" for this spec relies on manual browser verification per the constitution, not
  regression tests, unless this spec itself chooses to add a test runner as one of its
  changes.
- **Scope is this repository**: `cashpy-processor` (the separate GnuCash-parsing
  pipeline) is out of scope for this spec except where spec 002 already required changes
  to it — this spec's "codebase" is `cashpy_v2`.
- **Storybook/MSW disposition unknown going in**: The review starts without a
  presumption on whether Storybook and MSW stay; FR-007 requires an explicit decision
  rather than defaulting either way.
