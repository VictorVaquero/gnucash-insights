<!--
Sync Impact Report
- Version change: none → 1.0.0 (initial ratification)
- Modified principles: n/a (new document)
- Added sections: Core Principles (5), Technology & Cost Constraints, Migration Workflow, Governance
- Removed sections: none
- Templates requiring updates: .specify/templates/plan-template.md (✅ no changes needed, generic),
  .specify/templates/spec-template.md (✅ no changes needed, generic),
  .specify/templates/tasks-template.md (✅ no changes needed, generic)
- Follow-up TODOs: none
-->

# Cashpy Dashboard Constitution

## Core Principles

### I. Incremental, Reversible Migration
Work is split into independently shippable specs (currently: Vercel hosting migration,
database/storage simplification, codebase & dependency modernization), executed in that
order. Each spec MUST leave the app in a fully working, deployed state before the next
spec begins — a later spec MUST NOT be a precondition for an earlier one to be considered
done. Prefer changes that can be rolled back by reverting a deploy or a single config
value over changes that require a synchronized multi-system cutover. Every migration step
that changes where data or hosting lives MUST keep the old path functional until the new
path is verified in production, then remove the old path in a distinct, separate change.

### II. Cost-Consciousness (Free-Tier-First)
This is a low-traffic personal-use app (one real user plus a guest demo login). Any new
infrastructure (hosting, database, auth) MUST run on a free tier under realistic usage for
this app, or be justified in the spec with an explicit expected monthly cost and why it's
worth paying. Prefer options with no time-boxed trial, no card-required "free tier" that
silently starts billing, and no per-seat pricing. When comparing options in a spec, cost
tradeoffs MUST be stated explicitly, not left implicit.

### III. Continuity of the Working App
The dashboard MUST remain usable (by the real user and via the guest demo login) throughout
the migration. No spec may merge or deploy a change that breaks authentication, data
loading, or any existing route without an immediate, tested fallback. Manual verification
in a browser against the golden path (login → data loads → charts render) plus the guest
path is required before a phase is marked complete, per the project's existing UI-testing
practice.

### IV. Boring, Well-Supported Technology
When replacing a library, service, or pattern, prefer widely-adopted, actively-maintained
options with a clear migration path over novel or niche ones — this is a solo-maintained
personal project, not a place to bet on unproven tools. A library/service swap MUST be
justified by a concrete problem with the current one (unmaintained, insecure, poor fit for
Vercel's runtime, etc.), not novelty alone. Version upgrades and library replacements
happen in the modernization spec, not opportunistically mixed into the hosting or database
specs unless required to unblock them.

### V. Data Privacy on a Public Surface
Moving to `victorvaquero.com/dashboard` puts the app on a publicly reachable URL. Financial
data, auth tokens, and database credentials MUST NOT be exposed to unauthenticated
requests or committed to the repository. Any client-side data fetching MUST continue to
require authentication (or an explicitly scoped guest/demo account with non-sensitive
sample data, as today). Secrets required by build or runtime MUST live in Vercel
environment variables, never in source or in `config.json`-style committed files.

## Technology & Cost Constraints

- Target platform: Vercel (hosting, and possibly its managed database/storage offerings),
  replacing the current AWS S3 + CloudFront static hosting.
- The production URL MUST remain `victorvaquero.com/dashboard` (or an equivalent path under
  that domain) throughout and after the migration — this is a hard external-facing
  requirement, not an implementation detail.
- Auth MUST remain at least as simple for the user as today's Cognito-based login plus
  guest mode; replacing Cognito is in scope for the database/modernization specs only if it
  measurably simplifies the stack or removes AWS dependency entirely, not as a goal in
  itself.
- The existing gnucash-processing pipeline (`../cashpy-processor`, AWS Lambda + S3) is
  out of scope for the Vercel hosting spec. It MAY be revisited in the database
  simplification spec if the chosen database approach changes how data is ingested.

## Migration Workflow

- Each spec follows: `/speckit-specify` → (optional `/speckit-clarify`) → `/speckit-plan`
  → `/speckit-tasks` → (optional `/speckit-checklist` / `/speckit-analyze`) →
  `/speckit-implement`.
- A spec is not "done" until: the app builds, deploys, and has been manually verified in a
  browser per Principle III, and the spec's own success criteria (stated in its spec.md)
  are met.
- Database and hosting option comparisons (cost, limits, effort) MUST be written down in
  the relevant spec before an implementation choice is made, so the reasoning survives
  past this conversation.

## Governance

This constitution supersedes ad-hoc practice for this project. Amendments require an
explicit update to this file via `/speckit-constitution`, describing the change and
bumping the version per semantic versioning: MAJOR for incompatible principle
removals/redefinitions, MINOR for new principles or materially expanded guidance, PATCH
for clarifications and wording fixes. Specs and plans MUST NOT contradict this document;
where a conflict is found, either the spec is adjusted or an amendment is proposed here
first. Compliance is checked informally at the end of each spec (Principle III's
verification step doubles as the compliance gate) rather than via a separate audit
process, matching the scale of a solo personal project.

**Version**: 1.0.0 | **Ratified**: 2026-08-07 | **Last Amended**: 2026-08-07
