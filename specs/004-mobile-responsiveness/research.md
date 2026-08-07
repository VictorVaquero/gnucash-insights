# Phase 0 Research: Mobile Responsiveness

## Context

This feature adapts an existing, working React 19 + TanStack Router + Tailwind CSS v4 dashboard for phone-sized viewports. There is no new backend, data model, or external interface — every decision below is about *how* existing UI code renders and reacts, not *what* it renders. Findings are drawn from direct code reading of the current `src/` tree (see prior conversation research), not from external unknowns, so this phase resolves implementation approach rather than clarifying requirements.

## Decision 1: Replace UA-sniffed `isMobile()` with viewport/pointer-based detection

**Decision**: Introduce a small reactive hook (e.g. `useIsTouchDevice()` / `useMediaQuery()`) backed by `window.matchMedia('(pointer: coarse)')` for input-capability checks, and rely on Tailwind's existing `md:` breakpoint (already the app's de facto mobile/desktop cutoff) for layout-driven checks. Remove the `navigator.userAgent` regex sniff in `src/common/utils.ts` and its three call sites (`__root.tsx`, `Header.tsx`, `Tooltip.tsx`).

**Rationale**: `matchMedia` reacts live to viewport/orientation changes and correctly classifies touchscreen laptops and tablets by actual input capability instead of a spoofable/stale browser-identity string — directly resolving FR-009 and the tablet/touchscreen-laptop edge cases. It requires no new dependency; `matchMedia` is a standard browser API already usable in this codebase's target browsers (Vite/ESM, no legacy IE support needed).

**Alternatives considered**:
- *Keep UA sniffing, just expand the regex*: rejected — still static/non-reactive, doesn't fix the rotation/resize edge case, and UA strings are trending toward reduction/freezing across browsers.
- *CSS-only (`@media` in stylesheet, no JS hook)*: sufficient for pure layout (already used via Tailwind `md:` classes) but insufficient for the JS-side decisions this feature also needs (tooltip hide-delay, auto-collapsing the sidebar) — those need a JS-readable signal too, so a hook is required alongside the existing CSS breakpoints, not instead of them.

## Decision 2: Chart container sizing via `ResizeObserver`, not `window` resize

**Decision**: Replace `useWindowSize()`'s `window.addEventListener('resize', ...)` (in `src/common/utils.ts`) with a `ResizeObserver` observing the chart's own container element. Keep the same hook signature/return shape so call sites (`IncomeExpensesPlot.tsx` and the ~13 other raw-D3 chart files) don't need structural changes beyond swapping the underlying hook.

**Rationale**: This directly fixes FR-006/SC-004 — chart size must track the container, which changes width when the sidebar drawer opens/closes without necessarily firing a `window` resize event. `ResizeObserver` is well-supported in all evergreen browsers this app already targets (no polyfill needed given the existing `engines.node >=24` / modern-only posture of the project).

**Alternatives considered**:
- *Recharts' `<ResponsiveContainer>` for the D3 charts too*: rejected — these charts are hand-built D3/SVG, not Recharts components; adopting Recharts for them would be a much larger rewrite out of scope for a layout-responsiveness feature (per constitution Principle IV, library swaps belong in the modernization spec unless required to unblock this one — it isn't required here).
- *Debounced window-resize polling*: rejected — doesn't solve the "container resized without window resize" case at all.

## Decision 3: Fixed pixel chart margins become viewport-aware, not removed

**Decision**: Compute D3 chart margins (currently a hard-coded `{ t: 20, r: 20, b: 20, l: 50 }` in `IncomeExpensesPlot.tsx` and siblings) as a function of the observed container width, using a smaller fixed margin set below a width threshold (matching the `md:` breakpoint already used for layout) rather than a continuous formula.

**Rationale**: A simple two-tier margin table (desktop margins vs. compact mobile margins) is enough to stop axis labels from eating a disproportionate share of a 320-375px chart and is easy to reason about/test, versus a continuous scaling function that risks non-monotonic label collisions at in-between widths.

**Alternatives considered**: Continuous proportional scaling (`margin = width * 0.05`) — rejected as unnecessary complexity for a two-breakpoint app (the app doesn't have a tablet-specific chart requirement per the spec's Assumptions).

## Decision 4: Route-level grids extend the pattern already proven in `summary/index.tsx`

**Decision**: For `analysis/index.tsx` and `travels/index.tsx` (currently hard-coded `grid-cols-[...]` with zero breakpoints), apply the same technique already shipped in `summary/index.tsx`: base layout is `flex flex-col` (single column, natural stacking order = priority order of content), switching to the existing multi-column `grid` only at `md:` and above.

**Rationale**: This is a proven, in-codebase pattern — no new technique, styling convention, or component is introduced, minimizing risk and reviewer surprise. Satisfies FR-003/SC-001 for these two pages with a scoped, mechanical change per page.

**Alternatives considered**: A shared `<ResponsiveGrid>` wrapper component — rejected as premature abstraction for two call sites with different column/row templates; revisit only if a third page needs the same treatment later.

## Decision 5: Transaction table gets a scroll wrapper + reflowed pagination footer, not a column-hiding redesign

**Decision**: Wrap `TransactsTable.tsx`'s `<table>` in a `div` with `overflow-x-auto` (bounded horizontal scroll), and make the pagination footer wrap onto multiple lines via `flex-wrap` with grouped controls (prev/next as one group, page-size/page-jump as another) instead of one unbroken row.

**Rationale**: Satisfies FR-004/FR-005/SC-003 with the minimum change that keeps every column and every existing filter/sort feature intact — no data is hidden, which matches the spec's explicit requirement that no column become permanently hidden. `@tanstack/react-table`'s existing column-visibility API would allow a future "hide low-priority columns on mobile" enhancement, but the spec doesn't require it (FR-004 already accepts "via scrolling").

**Alternatives considered**: Card-based row layout (each transaction as a stacked card instead of a table row) on narrow viewports — a more mobile-native pattern, but a materially larger rewrite of `TransactTable`'s rendering and column-filter UI; deferred as an enhancement beyond this spec's bar (spec only requires columns be reachable via scroll, not a redesigned row format).

## Decision 6: Expenses pivot table gets sticky-first-column scroll, not a full redesign

**Decision**: Wrap the Expenses page's subgrid table (`expenses/index.tsx` + `TreeList.tsx`) in an `overflow-x-auto` container and make the category-name column `sticky left-0` (with matching background) so category labels and expand/collapse controls stay visible while the numeric year columns scroll horizontally underneath.

**Rationale**: Directly satisfies FR-008/SC-006 ("category labels... stay reachable without horizontal scrolling, even if... numeric data requires scrolling") with a well-known CSS pattern (`position: sticky`), reusing the existing CSS Grid/subgrid structure rather than replacing it. Matches the spec's Assumptions, which explicitly accept a scrollable-within-bounds baseline and call a condensed/collapsed alternate presentation a nice-to-have, not required.

**Alternatives considered**: Collapsing to a single "latest year" or summarized view on mobile — rejected for this spec (explicitly a stretch goal per Assumptions, not required for FR-008), would need its own product decision about which years to show.

## Decision 7: Hover-dependent account menu moves to Radix `DropdownMenu`

**Decision**: Replace `Header.tsx`'s custom `:hover`/`group-hover` CSS plus `isMobile()`-gated `onClick` toggle with the project's existing `@radix-ui/react-dropdown-menu` primitive (already a dependency, already wrapped in `src/components/ui/dropdown-menu.tsx` and used elsewhere in the app).

**Rationale**: Radix's `DropdownMenu` handles pointer/touch/keyboard opening and closing (including outside-tap-to-close) correctly out of the box, directly satisfying FR-002/SC-002 without hand-rolled device-detection branching. Reuses an existing, already-vetted dependency rather than adding one — consistent with constitution Principle IV.

**Alternatives considered**: Hand-rolling a `pointerdown`-outside-close listener on top of the existing hover CSS — rejected as reinventing what the already-installed Radix primitive does correctly.

## Decision 8: Login card positioning

**Decision**: Change the login card from `absolute -translate-y-32` (which offsets it a fixed amount above center, risking clipping on short-height viewports) to a flow-based vertical centering that respects small/short viewports, e.g. centering within a scrollable full-height container rather than an absolute offset.

**Rationale**: Directly satisfies FR-010/the login edge case for landscape-phone/short-height viewports, and is a small, contained change to one page.

**Alternatives considered**: Media-query-only fix (override the transform at a breakpoint) — viable and simpler; final choice between the two is an implementation detail for the tasks phase, not a research blocker.

## Testing approach

Per constitution Principle III, this project's existing practice is manual browser verification of the golden path, not an automated UI test suite (no such suite exists in `package.json`'s devDependencies today). This feature follows the same practice: verification is via browser devtools viewport emulation (320px, 375px, 428px widths, portrait + landscape) plus a manual check on at least one real phone, per each user story's "Independent Test," rather than introducing new test infrastructure — consistent with the spec's Assumptions and with not adding new tooling opportunistically (Principle IV).
