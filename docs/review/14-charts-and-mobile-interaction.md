# Charts & mobile/touch interaction

**Priority**: P1 · **Status**: Planning only

## Why this matters

Direct owner ask this round: *"we should also aim to have the page to be mobile ready,
especially the graphs since right now they are mostly hover based, how can we improve
that?"* Charts are the single hardest part of this app to use on a phone, and they're
also where the two charting approaches (Recharts vs. hand-rolled D3) diverge most in how
hard that is to fix.

## Current state (confirmed findings)

- **[confirmed]** Two coexisting charting approaches: **Recharts** on the home/summary
  page, and **hand-rolled D3** in `summary/-plots/` and `travels/-components/`
  (~13+ files, e.g. `IncomeExpensesPlot.tsx`).
- **[confirmed]** `BarPlot.tsx` uses a fixed `h-80` container height regardless of
  viewport.
- **[confirmed]** The D3 charts' `useWindowSize` hook reacts only to `window.resize`
  events, not a `ResizeObserver` on the chart's actual container — so a chart inside a
  panel that changes size for a reason other than the window resizing (sidebar
  collapse/expand, orientation change on some browsers) doesn't redraw at the right
  size.
- **[confirmed]** The D3 charts use fixed pixel margins (axis label space, padding) that
  don't scale down for narrow viewports — on a ~375px-wide phone screen a chart with
  60–80px of fixed margin on each side has very little plotting area left.
- **[confirmed]** Interaction today is hover-first: tooltips/data-point detail appear on
  `mouseover`, which has no direct touch equivalent — a touch either does nothing, or (if
  wired to `onClick`/`onTouchStart`) fires a single event with no way to "hover and move"
  along the series the way a mouse can, and no visual affordance telling a touch user
  that the chart is interactive at all.
- Spec 004 (mobile responsiveness, already implemented — see
  `specs/004-mobile-responsiveness/`) already added *some* tap-support (its FR-007) and
  fixed the layout-level responsiveness of surrounding pages. This doc's scope is
  **interaction quality specifically for charts**, which spec 004 improved but — per the
  owner's framing this round ("mostly hover based") — did not fully solve. Treat spec
  004 as the baseline this doc builds on, not a solved problem being re-litigated.

## Goals

- A phone user can see the same key information a desktop hover shows, without needing
  hover.
- Charts resize correctly for any container size change, not just window resize.
- Chart margins and information density scale down for narrow viewports instead of
  simply shrinking the same desktop layout.
- Whatever touch pattern is chosen is applied consistently across all charts, not
  ad hoc per file.

## Recommended approach

### Touch interaction patterns (ranked, cheapest-first)

1. **Always-visible key values, no interaction required.** For the most important 1–2
   data points per chart (e.g. current month total, latest data point), render the
   value as a persistent on-chart label instead of gating it behind hover/tap entirely.
   This is the cheapest fix and helps *every* user, not just touch users — hover-only
   information is also bad for accessibility (see
   [07-accessibility.md](07-accessibility.md)).
2. **Tap-to-pin tooltip, not tap-to-flash.** Where detail-on-demand is still needed,
   a tap should pin the tooltip open (persist until tapped elsewhere or a different
   point is tapped) rather than the desktop pattern of vanishing the instant the pointer
   leaves — a touch has no "leave," so a hover-derived tooltip that auto-hides on
   `mouseout` needs an explicit touch-equivalent dismissal instead.
3. **Fixed-position/bottom-sheet tooltip on narrow viewports**, instead of a
   floating tooltip anchored to the data point. A floating tooltip near a data point
   close to a screen edge clips or gets covered by a thumb on mobile; a
   bottom-of-viewport or bottom-sheet-style tooltip avoids both problems and is a
   well-understood mobile pattern.
4. **Larger touch hit-areas around data points** than the visual marker size — a11y/
   touch-target guidance generally wants ~44×44px tappable areas, which is much bigger
   than a typical small D3 circle marker; the invisible hit-area should be sized to the
   touch target even though the visible dot stays small.
5. **Scrubber pattern, applied to all charts.** **Decided 2026-08-10: build it for
   every chart, not just the 1–2 highest-value ones** (reverses this doc's original
   scope-limiting recommendation). A horizontal touch-drag moves a single active
   vertical indicator across the series, updating one persistent tooltip as the finger
   moves — the closest touch equivalent to desktop mouse-hover-and-move. Full coverage
   costs more implementation time than the narrow scope originally proposed; budget for
   it as a per-chart-component rollout (phase 6 below) rather than a one-off on a couple
   of files. Building it once as a shared hook/component (rather than duplicating the
   drag logic per chart) is the way to keep that cost down given the "all charts" scope.
6. **Swipe gestures for time-range navigation**, where a chart currently has separate
   prev/next controls for paging through time — swipe becomes a natural mobile-native
   addition to (not a replacement for) any existing buttons.

### Reduced density on narrow viewports

Not just "shrink the same chart" — actively reduce what's drawn: fewer x-axis tick
labels (e.g. every 3rd month instead of every month), abbreviated labels ("Jan" not
"January", or currency without decimals), and confirm whether every series/category
legend entry needs to be visible at once on a narrow screen or could collapse.

### Recharts vs. D3 — decided 2026-08-10: consolidate onto Recharts

Confirms the direction flagged in [12-library-choice-review.md](12-library-choice-review.md):
all D3 charts (`summary/-plots/`, `travels/-components/`, ~13+ files) migrate to
Recharts, rather than keeping two charting approaches. Recharts ships more of the touch
patterns above out of the box (built-in `Tooltip` active-index behavior, responsive
container), which lowers the cost of the "scrubber on all charts" decision above —
migrated charts get much of that behavior for less hand-built work than doing it twice
(once on D3, once on Recharts). Sequencing: migrating a chart to Recharts and adding its
touch-interaction patterns can happen as one combined pass per chart, rather than
building the interaction patterns on D3 first and then re-doing them post-migration.

## Phased plan

1. **Phase 1 — container-based resize**: replace `useWindowSize`'s window-resize-only
   listener with a `ResizeObserver` on each chart's actual container, for both the D3
   charts and `BarPlot.tsx`'s fixed `h-80`.
2. **Phase 2 — margin/density scaling**: make D3 chart margins and tick density
   responsive to container width (breakpoint-based or continuous), starting with the
   1–2 highest-traffic charts as a pattern to replicate.
3. **Phase 3 — always-visible key values**: add persistent key-value labels to the
   highest-value charts (cheapest win, do early).
4. **Phase 4 — tap-to-pin tooltip + touch hit-area sizing**: apply consistently across
   all chart components, D3 and Recharts alike.
5. **Phase 5 — bottom-sheet/fixed-position tooltip on narrow viewports**: for charts
   where floating tooltips are prone to clipping.
6. **Phase 6 — scrubber pattern, rolled out to all charts**: build the scrubber as a
   shared hook/component once, then apply it across every chart (not scoped to 1–2) —
   the highest-cost item in this plan, sequence it alongside each chart's Recharts
   migration (see the consolidation note above) to avoid double-building the
   interaction on D3 first.
7. **Phase 7 — real-device verification**: everything above gets checked on an actual
   phone (or at minimum browser touch-emulation plus one real device), not just resized
   desktop-browser windows — touch hit-testing and tooltip clipping behave differently
   from mouse emulation in ways that are easy to miss otherwise.

## Open decisions — decided 2026-08-10

- **Scrubber pattern: all charts get it**, not just the 1–2 most important ones.
- **Recharts vs. D3: consolidate onto Recharts.** Every D3 chart migrates; do the
  migration and that chart's touch-interaction work together per chart to avoid
  hand-building patterns twice.
