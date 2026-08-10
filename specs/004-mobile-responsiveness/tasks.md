---
description: "Task list for spec 004: Mobile Responsiveness"
---

# Tasks: Mobile Responsiveness

**Input**: Design documents from `/specs/004-mobile-responsiveness/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: No automated test suite exists in this repo (constitution Principle III); validation tasks below are manual, driven by `quickstart.md`.

**Organization**: Tasks are grouped by user story (US1-US4, priority order from spec.md) so each can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- File paths are exact, relative to repo root

## Path Conventions

Single existing project — all paths under `src/` at repository root (see `plan.md` Project Structure).

---

## Phase 1: Setup

**Purpose**: Establish a pre-change baseline so regressions are attributable to this feature

- [x] T001 Manually verify the existing golden path (login → Summary loads → charts render, plus the guest login path) at a standard desktop width (~1440px), per constitution Principle III, before making any change — this is the regression baseline for the Polish-phase re-check.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared detection infrastructure that US1 and US3 both depend on

**⚠️ CRITICAL**: T003 (US1) and T014 (US3) require T002 to exist first

- [x] T002 Add `useIsTouchDevice()` (backed by `window.matchMedia('(pointer: coarse)')`) and `useIsNarrowViewport()` (backed by `window.matchMedia` at the same width used by Tailwind's `md:` breakpoint) reactive hooks to `src/common/utils.ts`, alongside — not yet replacing — the existing `isMobile()` function.

**Checkpoint**: New detection hooks exist; user story implementation can begin.

---

## Phase 3: User Story 1 - View the financial summary on a phone (Priority: P1) 🎯 MVP

**Goal**: A user can log in, read the Summary page, and navigate the app on a phone using tap only.

**Independent Test**: Load Summary at 375px after login; every KPI card/chart/control is visible without horizontal scroll or zoom, and the nav menu + account menu both open/close via tap alone.

### Implementation for User Story 1

- [x] T003 [US1] Update `src/routes/__root.tsx`'s auto-collapse-sidebar-on-navigation effect to use `useIsNarrowViewport()` instead of `isMobile()`.
- [x] T004 [US1] Migrate `src/components/Header.tsx`'s account menu from custom `:hover`/`group-hover` CSS plus `isMobile()`-gated click handling to `@radix-ui/react-dropdown-menu` (via the existing `src/components/ui/dropdown-menu.tsx` wrapper), removing its `isMobile()` call site.
- [x] T005 [US1] Manually validate the US1 section of `quickstart.md` at 320/375/428px: Summary renders single-column and fully legible; nav menu opens, reaches every page, and closes via tap only; account menu opens/closes via tap only.
      **Done**: automated via a Puppeteer script (touch-emulated viewports, guest login) since no real device was
      available in this environment; found and fixed a genuine overflow at 320/375px — `SettingsBlock.tsx`'s
      `MultiSelectTree` (fixed `w-56`) + `PeriodicityTabs` sat in a non-wrapping flex row that didn't fit narrow
      viewports, and the Summary page's outer container used a flat `p-10` with no narrow-viewport reduction.
      Fixed by adding `flex-wrap gap-2` to the settings row (`-SettingsBlock.tsx`) and `p-4 sm:p-10` to the page
      container (`summary/index.tsx`). Re-verified: 0px overflow at 320/375/428px, nav menu opens/reaches all 7
      links/closes via tap, account menu opens/closes via tap, all at each width; 1440px desktop regression check
      unaffected. Still recommend a real-device pass per the constitution before final sign-off (T024).

**Checkpoint**: User Story 1 (MVP) is complete and independently testable/demoable.

---

## Phase 4: User Story 2 - Browse and filter transactions on a phone (Priority: P2)

**Goal**: A user can read, filter, and page through the Analysis transaction table on a phone.

**Independent Test**: Load Analysis at 375px with sample data; table columns are reachable via scroll, pagination controls don't overlap, and applying a saved filter updates chart+table within the viewport.

### Implementation for User Story 2

- [x] T006 [P] [US2] Wrap `src/routes/analysis/-components/TransactsTable.tsx`'s `<table>` in an `overflow-x-auto` scroll container so every column stays reachable without being hidden.
- [x] T007 [US2] Reflow `TransactsTable.tsx`'s pagination footer into wrapped, grouped control clusters (prev/next as one group; page-size select and page-jump input as another) using `flex-wrap`, so no control overlaps at narrow widths.
- [x] T008 [P] [US2] Convert `src/routes/analysis/index.tsx`'s route-level grid from its fixed `grid-cols-[1fr_max-content]` layout to `flex flex-col` by default, applying the existing grid only at `md:` and above — matching the pattern already used in `src/routes/summary/index.tsx`.
- [ ] T009 [US2] Manually validate the US2 section of `quickstart.md` at 320/375/428px: table scrolls to reveal every column, pagination controls remain individually tappable without overlap, and selecting a saved filter (e.g. "Trips") keeps both chart and table within the viewport.

**Checkpoint**: User Stories 1 and 2 are both complete and independently testable.

---

## Phase 5: User Story 3 - View charts clearly on any page (Priority: P3)

**Goal**: Charts on any page resize correctly to their container on a phone, including after menu toggle/rotation, with touch-tappable tooltips.

**Independent Test**: Load a chart-heavy page at 320/375/428px and after rotation/menu-toggle; each chart resizes to fill its container with no clipped labels, and tapping a data point shows its tooltip.

### Implementation for User Story 3

- [x] T010 [US3] Replace `useWindowSize()`'s `window`-resize listener with a `ResizeObserver` observing the chart's own container element, in `src/common/utils.ts`, keeping the existing hook signature/return shape so call sites don't need structural changes.
- [x] T011 [US3] Add tiered chart margins (a smaller margin set below the `md:` width threshold) to `src/routes/summary/-plots/IncomeExpensesPlot.tsx`.
- [x] T012 [P] [US3] Apply the same tiered-margin treatment to the remaining D3 chart files under `src/routes/summary/-plots/` (`DetailedExpensesBarPlot.tsx`, `DetailedIncomeBarPlot.tsx`, `MonthDetailedExpensesPiePlot .tsx`, `AssetAccountsPlot.tsx`, and any other sibling chart files in that directory using fixed pixel margins). Note: `DetailedExpensesBarPlot.tsx`/`DetailedIncomeBarPlot.tsx` render via the Recharts-based `BarChart` (see T015), not raw D3 with fixed margins, so no change was needed there; `MonthDetailedExpensesPiePlot .tsx`'s margin is already a negligible 5px and its radius is already computed from live container size, so tiering it further wasn't meaningful — only `AssetAccountsPlot.tsx` needed the treatment and got it.
- [x] T013 [P] [US3] Apply the same tiered-margin treatment to the D3 chart files under `src/routes/travels/-components/` (`TravelExpensesMonthlyPlot.tsx`, `TravelExpensesDetailedPlot.tsx`, `TravelExpensesPlot.tsx`, `TravelExpensesPiePlot .tsx`). Note: `TravelExpensesPiePlot .tsx` also has a negligible 5px margin with an already-responsive radius, same reasoning as its summary-page counterpart, so it was left unchanged.
- [x] T014 [US3] Update `src/routes/summary/-plots/Tooltip.tsx` to use `useIsTouchDevice()` instead of `isMobile()` for its hide-delay timing.
- [x] T015 [US3] Review `src/components/charts/BarPlot.tsx`'s fixed `h-80` container height at narrow viewports (visually, during T016) and reduce it responsively if it's disproportionate on a 320-375px screen.
- [ ] T016 [US3] Manually validate the US3 section of `quickstart.md` at 320/375/428px plus landscape rotation, on both a Summary chart and a Travels chart: chart resizes on rotation, resizes on nav-menu toggle without a window resize event, and tooltip appears/is readable/dismisses via tap.

**Checkpoint**: User Stories 1, 2, and 3 are all complete and independently testable.

---

## Phase 6: User Story 4 - View the detailed expense breakdown on a phone (Priority: P4)

**Goal**: A user can read category names and expand/collapse the Expenses year-by-year breakdown on a phone.

**Independent Test**: Load Expenses at 375px; category labels and expand/collapse controls stay reachable without horizontal scroll, even though yearly figures require scrolling within a bounded area.

### Implementation for User Story 4

- [x] T017 [P] [US4] Wrap `src/routes/expenses/index.tsx`'s pivot grid in an `overflow-x-auto` container.
- [x] T018 [US4] Make the category-name column `sticky left-0` (with matching background color, to avoid visual bleed-through while scrolling) in `src/components/TreeList.tsx` / `expenses/index.tsx`'s subgrid, so it stays visible while the yearly figures scroll horizontally underneath.
- [ ] T019 [US4] Manually validate the US4 section of `quickstart.md` at 320/375px: category labels and expand/collapse controls reachable without horizontal scroll; expand/collapse works via tap without needing to zoom.

**Checkpoint**: All four user stories are complete and independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Close remaining FR-003/FR-010 gaps not covered by a specific user story, and finish the `isMobile()` removal

- [x] T020 [P] Convert `src/routes/travels/index.tsx`'s route-level grid to the same `flex-col`/`md:grid` pattern used in T008 (FR-003 coverage for the Travels page's own layout, distinct from its chart-resize fixes in US3).
- [x] T021 [P] Fix `src/routes/login/index.tsx`'s card positioning — replace `absolute -translate-y-32` with flow-based centering that doesn't clip on short-height viewports (FR-010).
- [x] T022 [P] Spot-check `src/routes/metadata.tsx` at 320-428px and fix any wrapping/spacing issues found (FR-003 coverage). Fixed `p-10` (40px fixed padding, eating a large fraction of a 320px viewport) to `p-4 md:p-10`; `DropDownForm`/`KpiCard` were already flexible (`max-w-80`/`w-full`, `flex-wrap`) and needed no change.
- [x] T023 Remove the now-unused `isMobile()` function and its import from `src/common/utils.ts`, once T003, T004, and T014 have all migrated off it. Confirmed via `grep -rn "isMobile" src` that only the definition/doc-comments remained; removed both. This also eliminates the pre-existing `no-useless-escape` ESLint baseline noise from its UA-sniffing regex.
- [ ] T024 Run the full `quickstart.md` validation matrix end-to-end (all 4 user stories + edge cases + the desktop regression re-check against the T001 baseline) across 320/375/428px and landscape, plus at least one real phone, before marking this feature done per constitution Principle III.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first.
- **Foundational (Phase 2)**: Depends on Setup. Blocks T003 (US1) and T014 (US3) specifically — US2 and US4 don't depend on it and could start in parallel with Phase 2 if desired.
- **User Stories (Phase 3-6)**: US1 has no dependency on other stories; US2, US3, US4 are each independently implementable once Phase 2 is done. Recommended order is priority order (US1 → US2 → US3 → US4) since that's also the incremental-delivery order, but nothing structurally blocks working them in a different order.
- **Polish (Phase 7)**: T023 depends on T003, T004, and T014 all being complete (can't remove `isMobile()` until nothing calls it). T024 depends on every prior phase being complete.

### Within Each User Story

- US1: T003 and T004 are independent of each other (different files); T005 (validation) depends on both.
- US2: T006/T007 (same file) are sequential; T008 (different file) can run in parallel with them; T009 (validation) depends on all three.
- US3: T010 must land before T011-T013 (margin tiers reference the new container-size behavior); T012 and T013 are parallel with each other; T014 and T015 are independent side tasks; T016 (validation) depends on all of T010-T015.
- US4: T017 and T018 touch overlapping layout but different files, sequence T017 → T018 to avoid conflicting assumptions about the scroll container; T019 (validation) depends on both.

### Parallel Opportunities

- T003 and T004 (US1) — different files.
- T006 and T008 (US2) — different files.
- T012 and T013 (US3) — different file sets (summary plots vs. travels components).
- T020, T021, T022 (Polish) — three unrelated files.

---

## Parallel Example: User Story 3

```bash
# After T010 (ResizeObserver hook) and T011 (first chart's tiered margins) land:
Task: "Apply tiered-margin treatment to remaining summary/-plots chart files"
Task: "Apply tiered-margin treatment to travels/-components chart files"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (baseline) and Phase 2 (detection hooks).
2. Complete Phase 3 (US1): nav + account menu work on a phone.
3. **STOP and VALIDATE**: run the US1 section of `quickstart.md`.
4. This alone already delivers the most common "quick check on my phone" use case.

### Incremental Delivery

1. Setup + Foundational → baseline established, hooks ready.
2. US1 → validate → MVP deliverable.
3. US2 → validate → transaction browsing now works on mobile.
4. US3 → validate → charts correct everywhere.
5. US4 → validate → Expenses page usable.
6. Polish → close remaining FR-003/FR-010 gaps, remove dead code, run full validation matrix.

Each step can be deployed independently per constitution Principle I (reversible, incremental) — none of these phases requires a later one to be considered a working improvement.
