# Quickstart: Validating Mobile Responsiveness

Manual validation guide for this feature, per constitution Principle III (no automated UI test suite exists in this repo). Run every scenario below against both the guest login and the real login where feasible, and re-run the full pass on at least one real phone before marking this feature done — devtools emulation alone is not sufficient per `research.md`'s Testing approach.

## Prerequisites

- Local dev server running: `pnpm dev` (see `package.json`), or the deployed preview URL.
- A browser with responsive-design/device-emulation devtools (Chrome/Firefox/Safari all work).
- A real phone on the same network as the dev server (for the final real-device pass), or the deployed preview URL open on a phone.

## Viewport matrix

Run each scenario at these widths, portrait unless noted:

| Width                      | Represents                                      |
| -------------------------- | ----------------------------------------------- |
| 320px                      | Smallest supported phone (edge case)            |
| 375px                      | Common phone (iPhone SE/12/13 class)            |
| 428px                      | Large phone (iPhone Pro Max class)              |
| 375×667 rotated to 667×375 | Landscape phone (short-height case, login page) |

## US1 — Summary page + navigation (P1)

1. At 375px, log in (guest or real) and land on Summary. Confirm: every KPI card, chart, and settings control is visible without horizontal scroll or pinch-zoom (spec SC-001).
2. Tap the navigation menu control. Confirm it opens and every page link is reachable by tap alone (spec Acceptance Scenario US1.2).
3. Tap outside the open menu, or select a page. Confirm the menu closes cleanly with no leftover overlay or layout shift (US1.3).
4. Tap the account menu in the header on a touch-emulated device. Confirm it opens/closes without needing hover (US1.4).
5. Repeat steps 1-4 at 320px and 428px.

**Pass condition**: all four scenarios succeed at all three widths.

## US2 — Analysis page transaction table (P2)

1. At 375px, navigate to Analysis. Confirm the transaction table can be scrolled (within its own bounded area) to reveal every column, with no column permanently hidden and no row illegibly small (US2.1).
2. Change page and page size using the pagination footer. Confirm every control (first/prev/next/last, page-size select, page-jump input) is individually visible and tappable without overlap (US2.2).
3. Apply a saved filter (e.g., "Trips") from the filter list. Confirm the chart above the table and the filtered table both update and stay within the viewport width (US2.3).

**Pass condition**: all three scenarios succeed at 320px, 375px, and 428px.

## US3 — Chart responsiveness (P3)

1. At 375px on the Summary page, note each chart's size. Rotate the emulated device to landscape (667×375). Confirm each chart resizes to its new container width without a page reload (US3.1).
2. Toggle the navigation menu open, then closed, without changing the window/viewport size. Confirm charts still resize to match the resulting container width change (US3.2).
3. Tap a bar/data point in a chart on a touch-emulated device. Confirm the tooltip appears, is fully readable within the viewport, and dismisses on a subsequent tap elsewhere (US3.3).
4. Repeat at 320px and 428px, and on at least one chart on the Travels page (different component tree, same underlying fix).

**Pass condition**: all scenarios succeed at all widths, on both a Summary chart and a Travels chart.

## US4 — Expenses page (P4)

1. At 375px, navigate to Expenses. Confirm category names and expand/collapse controls are visible without horizontal scrolling, even though yearly figures may require scrolling within a bounded area (US4.1).
2. Tap to expand and collapse a category. Confirm it works via tap and no zooming is needed to read the result (US4.2).

**Pass condition**: both scenarios succeed at 320px and 375px.

## Edge cases

- 320px width: re-confirm all four user stories above still pass (no primary content or control becomes unreachable).
- Rotate mid-session on Summary and Analysis: no overlapping/clipped content after rotation, no manual refresh needed (SC-005).
- Emulate a touch-capable device with a mouse also present (e.g., Chrome's "touch" emulation toggle without disabling mouse): confirm hover-based desktop interactions still work when the emulator reports a fine pointer, and tap-based interactions still work when it reports coarse.
- Login page at 667×375 (landscape phone): confirm the login form is fully visible, not clipped or pushed off-screen (FR-010).
- Analysis page with a filter that returns zero results: confirm no broken/empty layout artifacts on a 375px viewport.

## Regression check (desktop, per constitution Principle III)

Before considering this feature done, re-run the existing golden path at a standard desktop width (e.g., 1440px): login → data loads → charts render on Summary, Analysis, Travels, Expenses, Metadata — confirming none of the above changes altered desktop-viewport behavior or visuals (spec Assumptions: "must not regress").
