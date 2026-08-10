# Code structure & patterns

**Priority**: P2 · **Status**: Planning done — see specs/005-repo-hygiene-security-and-public-readiness

## Current state (confirmed findings)

- **[confirmed]** `src/db/dbType.ts`'s `SQLJsDatabase` union member (dead, see
  [01-dependencies-and-config-hygiene.md](01-dependencies-and-config-hygiene.md)) is the
  clearest concrete refactor candidate already found — collapsing the type to just the
  Turso driver would simplify any code still branching on the union.
- Not yet audited: largest files by line count in `src/components/` and
  `src/routes/*/-components/` as a starting signal for split candidates.
- Not yet audited: duplicated data-fetching/formatting logic across route files that
  could consolidate into a shared hook or `src/db/queries/` helper.
- Not yet audited: data-fetching pattern consistency across routes (loader vs. hook vs.
  inline `useQuery` — spot-check needed).
- There's one `ErrorPage`/`ErrorModal` pair — not yet confirmed it's used uniformly
  rather than ad hoc per-route handling.
- Auth session storage (`usePersistentState`/localStorage vs. httpOnly cookies) — already
  a deliberate, documented tradeoff (see `docs/decisions.md`); cross-referenced in
  [04-security.md](04-security.md) rather than re-litigated here.
- Prop-drilling vs. context usage consistency, now that `AccountMenu` was recently
  extracted as its own top-level element — not yet confirmed whether it needs state
  that's awkward to thread from wherever auth state actually lives.
- Naming consistency (file naming, `-component`/`-plots` folder conventions, hook
  naming) — not yet audited.

## Goals

- No dead/orphaned types or branches remain once
  [01-dependencies-and-config-hygiene.md](01-dependencies-and-config-hygiene.md)'s
  cleanup lands.
- Consistent, documented conventions for data fetching, error handling, and file
  organization — not necessarily changing today's pattern, but making it explicit so
  deviations are visible.

## Recommended approach

This is judgment-based, lower-risk-but-lower-urgency work compared to the P0/P1 items
elsewhere in the folder — treat it as an ongoing "spot-check and consolidate as touched"
effort rather than a big-bang refactor pass, per the constitution's general bias against
large speculative rewrites.

## Phased plan

1. **Phase 1 — mechanical**: remove the dead `SQLJsDatabase` union member (tracked
   jointly with [01](01-dependencies-and-config-hygiene.md)).
2. **Phase 2 — audit pass**: spot-check data-fetching pattern consistency across a
   sample of routes; confirm `ErrorPage`/`ErrorModal` usage is uniform; identify the
   largest files as split candidates (informational, not a mandate to split
   everything found).
3. **Phase 3 — consolidate as found**: address duplicated logic opportunistically
   (e.g. when touching a route for an unrelated change) rather than as a dedicated
   sweep, unless the audit in phase 2 turns up something bad enough to warrant one.
4. **Phase 4 — naming/convention documentation**: once the audit settles on what the
   actual conventions are, write them down (in `docs/architecture.md` or a short
   `CONVENTIONS.md`) so they're enforceable/checkable rather than tribal knowledge.

## Open decisions (owner input needed)

None — this is maintainability polish, not a decision point.
