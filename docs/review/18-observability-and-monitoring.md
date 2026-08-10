# Observability & monitoring

**Priority**: P2 · **Status**: Planning done — see specs/009-observability-docs-and-ai-tooling

## Why this matters

Right now a runtime error on the deployed app is invisible unless the owner happens to
be looking at the browser console at the moment it happens. That's a real gap, but this
doc deliberately weighs it against the app's actual scale (a single real user plus a
guest/demo path) rather than defaulting to a full observability stack.

## Current state (confirmed findings)

- **[confirmed]** No client-side error tracking (Sentry or equivalent) is configured.
- Not yet confirmed: whether Vercel's own deployment/build-failure notifications
  (email/Slack) are actually turned on, or whether a broken deploy would currently only
  be noticed by accident.
- **[confirmed]** No uptime/synthetic monitoring of the production URL exists.

## Goals

- The owner finds out about a broken deployment or a recurring client-side error without
  having to be actively looking when it happens.
- Whatever's added doesn't become a new place PII could leak — directly relevant given
  the `src/config.json` account-mapping finding in
  [03-secrets-and-public-repo-readiness.md](03-secrets-and-public-repo-readiness.md): an
  error-tracking payload that happens to include that mapping or real transaction data
  would recreate the same exposure this review is trying to close off elsewhere.

## Recommended approach

Given the single-real-user scale, don't default to a full stack. Split into a "do now,
free" tier and a "consider only if it becomes a real problem" tier:

**Do now (cheap, no new dependency)**:
- Confirm Vercel's built-in deployment-failure notifications are actually enabled for
  this project (a settings check, not a code change).

**Consider only if warranted**:
- Client-side error tracking (Sentry or similar) — worth it only if silent errors have
  actually caused a missed problem; adding it preemptively for a single-user app is a
  new dependency and a new place to audit for PII leakage for a benefit that's currently
  theoretical.
- Uptime/synthetic monitoring — same reasoning; a personal single-user app doesn't have
  the same uptime stakes as a multi-tenant product.

If either is added later, the PII-leakage check (scrub error payloads / avoid logging
raw query results or config values) must happen at setup time, not as an afterthought.

## Phased plan

1. **Phase 1**: verify Vercel deployment-failure notifications are on (no code change).
2. **Phase 2 — only if triggered by an actual incident**: add Sentry (or equivalent),
   with explicit scrubbing of any field that could carry `src/config.json` account
   mappings or real transaction/category data before it's enabled.
3. **Phase 3 — only if uptime actually matters going forward**: add a synthetic
   uptime check (e.g. a free-tier UptimeRobot-style ping) if the app's usage pattern
   changes (e.g. it becomes something other people rely on).

## Open decisions — decided 2026-08-10

- **Confirmed: hasn't caused a real problem yet.** Phases 2–3 (Sentry, uptime
  monitoring) stay deferred. Only phase 1 (verify Vercel deployment-failure
  notifications are on) is active.
