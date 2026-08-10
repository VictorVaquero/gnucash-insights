# Library choice review

**Priority**: P2 · **Status**: Planning done — see specs/007-design-system-theming-and-charts (also see specs/003-codebase-modernization FR-004)

## Current state

A written keep/replace review with rationale is required by spec 003 FR-004 for at
minimum: routing, data fetching/caching, charting, client-side DB access, and UI
primitives. Status per area:

- **Routing — TanStack Router**: not yet reviewed in writing; no known concrete problem.
- **Data fetching/caching — TanStack Query**: not yet reviewed in writing; no known
  concrete problem.
- **Charting — Recharts (home page) + hand-rolled D3** (`summary/-plots/`,
  `travels/-components/`, ~13+ files): two different charting approaches coexist.
  **Decided 2026-08-10: consolidate onto Recharts** — full breakdown, sequencing, and
  the mobile-touch rationale in
  [14-charts-and-mobile-interaction.md](14-charts-and-mobile-interaction.md).
- **Client-side DB access — Drizzle over libsql**: already reviewed and confirmed "keep"
  during spec 002 (see `docs/decisions.md`) — no need to re-litigate unless something
  concrete changes.
- **UI primitives — Radix + shadcn-style components**: **[confirmed]** the shadcn
  `Button` component's default variant relies on `--background`/`--primary` CSS vars not
  defined anywhere in this project's `index.css` — effectively unstyled/dead, with
  hand-styled `shark`-palette classes used instead throughout. Full breakdown in
  [13-component-library-and-design-system.md](13-component-library-and-design-system.md).

## Goals

Satisfy spec 003 FR-004: every major library area has an explicit, written keep/replace
decision with rationale — not an implicit "nobody's touched it so I guess we're keeping
it."

## Recommended approach

The two areas with real, actionable findings (charting, UI primitives) get their own
dedicated docs ([14](14-charts-and-mobile-interaction.md),
[13](13-component-library-and-design-system.md)) since they involve actual design
decisions and phased implementation work. Routing/data-fetching/DB access don't currently
have a concrete problem driving a review — a review of those can be a quick written
confirmation ("still the right choice, here's why") rather than a deep planning doc.

## Phased plan

1. **Phase 1**: write the quick keep confirmations for routing (TanStack Router) and
   data fetching (TanStack Query) — a few sentences each in `docs/decisions.md`, not a
   full doc, since there's no open question driving them.
2. **Phase 2**: charting and UI-primitives decisions proceed via their dedicated docs
   ([14](14-charts-and-mobile-interaction.md), [13](13-component-library-and-design-system.md)).
3. **Phase 3**: once all four/five areas have a written decision, this satisfies spec
   003 FR-004/SC-003 — update that spec's status accordingly (or formally run
   `/speckit-plan` on spec 003 if a full implementation pass through spec-kit is wanted
   instead of tracking via this folder).

## Open decisions

None beyond what's already tracked (and now decided) in docs 13 and 14.
