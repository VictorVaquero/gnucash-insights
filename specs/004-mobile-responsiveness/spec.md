# Feature Specification: Mobile Responsiveness

**Feature Branch**: `004-mobile-responsiveness`

**Created**: 2026-08-07

**Status**: Mostly Complete — 20/24 tasks done; remaining items (T009, T016, T019, T024)
are manual on-device/viewport validation checks — see `tasks.md` and
`docs/review/19-manual-verification.md`.

**Input**: User description: "Mobile responsiveness: make the cashpy_v2 dashboard usable on phone-sized viewports. Replace the brittle isMobile() user-agent sniffing with a reactive viewport/pointer-based check used consistently app-wide. Fix route-level layouts that use fixed multi-column CSS grids with no responsive breakpoints (travels, analysis) so they degrade to single-column on narrow screens, matching the existing pattern already used in summary. Redesign the Expenses page's pivot-table grid for mobile, since it structurally cannot fit a phone width and needs a different presentation. Make the analysis page's transaction table usable on mobile via horizontal scroll and/or column hiding, and clean up the pagination footer's wrap behavior. Fix chart responsiveness (fixed-height containers, window-resize-only sizing, fixed pixel margins that don't scale). Verify touch/interaction details on real devices: the hover-dependent account menu, and the login page's card positioning on short-height mobile viewports."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View the financial summary on a phone (Priority: P1)

A user opens the dashboard on their phone to check their financial summary — net worth, income, expenses, and the summary charts. They can log in, read every figure, and navigate to other pages without pinching to zoom or scrolling sideways to see cut-off content.

**Why this priority**: The Summary page is the landing experience after login and the single most common "quick check" use case for a phone. If this alone works well, the dashboard already delivers most of its mobile value.

**Independent Test**: Load the Summary page in a 375px-wide viewport after logging in; confirm every KPI card, chart, and settings control is visible and legible without horizontal scrolling or zooming, and that primary navigation (open menu, switch page) works using tap only.

**Acceptance Scenarios**:

1. **Given** a user on a 375px-wide phone viewport, **When** they log in, **Then** the Summary page renders in a single readable column with no element wider than the viewport.
2. **Given** the navigation menu is closed on a phone viewport, **When** the user taps the menu control, **Then** the menu opens and every destination page is reachable by tap, with no hover required at any step.
3. **Given** the navigation menu is open, **When** the user taps outside it or selects a page, **Then** the menu closes and the chosen page loads without leftover overlay or layout shift.
4. **Given** the account menu in the header, **When** a user on a touch device taps it, **Then** it opens and closes correctly without requiring a hover gesture.

---

### User Story 2 - Browse and filter transactions on a phone (Priority: P2)

A user wants to look up recent transactions and apply a quick filter (e.g., "Expenses" or "Trips") while on their phone. They can read transaction rows, apply filters, page through results, and understand which columns they're looking at, without the table becoming unreadable or controls overlapping.

**Why this priority**: The Analysis page is the main transaction-level workflow. It currently has no mobile accommodations at all and was identified as the least usable page on a phone today, but it's secondary to the "quick glance" Summary use case.

**Independent Test**: Load the Analysis page in a 375px-wide viewport with sample data; confirm the transaction table's rows can be scrolled to reveal all columns, all pagination controls are individually tappable without overlapping, and filters can be applied by tap.

**Acceptance Scenarios**:

1. **Given** a phone-sized viewport, **When** the user views the transaction table, **Then** they can scroll to see every column's data without any column being permanently hidden or the row height becoming unreadably small.
2. **Given** a phone-sized viewport, **When** the user changes the page or page size, **Then** every pagination control remains individually visible and tappable without overlapping neighboring controls.
3. **Given** a phone-sized viewport, **When** the user selects a saved filter (e.g., "Trips"), **Then** the filtered results and the chart above the table both update and remain fully within the viewport width.

---

### User Story 3 - View charts clearly on any page (Priority: P3)

A user viewing any chart-driven page (Summary, Analysis, Travels) on a phone sees each chart properly sized to their screen — axes, labels, and margins scale down instead of overflowing or being crushed — and can tap a data point to see its tooltip.

**Why this priority**: Charts appear on nearly every page, so this is broadly valuable, but it's a refinement on top of the layout fixes in P1/P2 rather than a blocker to basic usability.

**Independent Test**: Load a chart-heavy page (e.g., Summary) at several phone viewport widths (320px, 375px, 428px) and after toggling the navigation menu open/closed; confirm each chart resizes to fill its container with no clipped axis labels, and that tapping a data point shows its tooltip.

**Acceptance Scenarios**:

1. **Given** a chart is visible on a phone viewport, **When** the viewport width changes (e.g., device rotation), **Then** the chart resizes to match its new container width without needing a page reload.
2. **Given** a chart is visible, **When** the navigation menu is opened or closed (changing the available content width without necessarily changing the window size), **Then** the chart still resizes correctly to its new container width.
3. **Given** a user taps a data point or bar in a chart on a touch device, **When** the tap registers, **Then** the corresponding tooltip appears and remains readable within the viewport, and dismisses on a subsequent tap elsewhere.

---

### User Story 4 - View the detailed expense breakdown on a phone (Priority: P4)

A user wants to review the year-by-year expense breakdown (Expenses page) on their phone. Because this view is inherently wide (many years of data per category), they can access it in a usable form — by scrolling within a bounded area or through a condensed presentation — rather than the page being unusable.

**Why this priority**: This is the hardest layout to adapt (structurally many columns of data) and the least frequently used page relative to Summary and Analysis, so it's reasonable to solve last.

**Independent Test**: Load the Expenses page in a 375px-wide viewport; confirm the category tree and its yearly figures can be read and navigated (expand/collapse categories) without the page becoming unusable, even if horizontal scrolling within the table area is required.

**Acceptance Scenarios**:

1. **Given** a phone-sized viewport, **When** the user views the Expenses page, **Then** the category names and controls to expand/collapse categories remain visible without horizontal scrolling, even if the yearly figures require scrolling within a bounded area to view.
2. **Given** a phone-sized viewport, **When** the user expands or collapses a category, **Then** the interaction works via tap and the page does not require zooming to read the result.

---

### Edge Cases

- What happens on very narrow phones (320px width, e.g., older/smaller devices)? All primary content and controls must remain reachable, even if secondary information wraps or requires scrolling.
- What happens when a user rotates their phone between portrait and landscape mid-session? Layout and chart sizing must update without overlapping or clipped content, and without requiring a manual refresh.
- What happens on a tablet-sized viewport (e.g., iPad) that isn't a phone but also isn't full desktop width? The dashboard must not misidentify the device and show a layout mismatched to its actual screen size or input method.
- What happens when the same device supports both touch and mouse/trackpad input (e.g., a touchscreen laptop)? Hover-only interactions must still have a working touch-equivalent, without breaking the existing mouse experience.
- What happens when a chart or table has very little data (e.g., a new filter with zero results)? The layout must not break or leave broken/empty visual artifacts on narrow screens.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render primary navigation (header and page menu) usably on viewport widths as narrow as 320px, with no content requiring horizontal scrolling to be reached.
- **FR-002**: Users MUST be able to open, use, and close primary navigation and the account menu entirely via touch tap, independent of any hover capability.
- **FR-003**: All top-level dashboard pages (Summary, Analysis, Travels, Expenses, Metadata, Login) MUST reflow to a single-column (or otherwise non-overlapping) layout on narrow viewports rather than compressing a multi-column desktop layout into unreadable widths.
- **FR-004**: Users MUST be able to view every column of the transaction table on a phone-sized screen, via scrolling within a bounded area, without permanent data loss or illegibly small text.
- **FR-005**: Transaction table pagination controls MUST remain individually visible and tappable, without overlapping, at phone-sized viewport widths.
- **FR-006**: Charts MUST resize to fit their currently available container width on any supported viewport size, including immediately after the navigation menu is opened or closed.
- **FR-007**: Chart interactions that currently rely on mouse hover (tooltips, legends) MUST also be fully operable via touch tap.
- **FR-008**: The yearly expense breakdown view MUST remain navigable on narrow viewports — category labels and expand/collapse controls must stay reachable without horizontal scrolling, even if the numeric data requires scrolling within a bounded area.
- **FR-009**: System MUST determine mobile/touch-specific behavior (e.g., menu auto-collapse, tooltip timing) from the actual current viewport size and/or input capability, not from a one-time browser-identity signal, so behavior stays correct across resizing, rotation, and across devices whose declared identity doesn't match their actual screen size or input method.
- **FR-010**: The login page's form MUST remain fully visible (not clipped or pushed off-screen) on short-height mobile viewports, including landscape phone orientation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user on a phone-sized viewport (320px-480px wide) can log in and read every figure on the Summary page without pinch-zooming or scrolling sideways.
- **SC-002**: A user on a phone-sized viewport can reach every dashboard page and open/close the account menu using tap alone, with zero interactions that require hover to discover or trigger.
- **SC-003**: A user on a phone-sized viewport can browse and filter transactions in the Analysis table and read every column's value for any row, without any control overlapping another.
- **SC-004**: Every chart on every dashboard page renders fully within the visible screen width on phone-sized viewports, with no clipped axis labels or overflowing elements, both on initial load and after the navigation menu is toggled.
- **SC-005**: Layout and chart sizing remain correct (no overlapping, clipped, or off-screen content) immediately after a device orientation change, with no manual refresh required.
- **SC-006**: The Expenses page's category tree remains fully navigable (expand/collapse, read category names) on a phone-sized viewport without horizontal scrolling for that part of the page.

## Assumptions

- "Mobile" is defined by viewport width and input capability (touch vs. pointer), not by a device's declared browser identity — this codifies the fix for the current user-agent-based detection.
- Primary target range is phone-sized viewports from 320px to 480px wide; tablet-sized viewports (roughly 481px-1024px) may continue to use the existing intermediate/desktop-like layout where it already reads acceptably, and are only in scope where they currently produce broken or overlapping layouts.
- For the Expenses page's yearly breakdown, a scrollable-within-bounds presentation is an acceptable baseline; a more condensed alternate presentation (e.g., collapsing years, summarized view) is a nice-to-have but not required for this feature to be considered complete.
- No new data, backend endpoints, or data-loading behavior is introduced by this feature — it is limited to layout, interaction, and rendering behavior of already-loaded data. It is independent of and can proceed in parallel with the ongoing spec 002 (database simplification) work.
- Existing desktop-viewport behavior and visual design (colors, information hierarchy) must not regress — this feature adapts layouts for narrow viewports without changing the desktop experience.
- Automated cross-device testing infrastructure is not assumed to exist; verification is expected via browser viewport emulation and manual checks on at least one real phone device.
