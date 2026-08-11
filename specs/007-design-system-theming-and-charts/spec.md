# Feature Specification: Design System, Theming & Charts

**Feature Branch**: `007-design-system-theming-and-charts`

**Created**: 2026-08-10

**Status**: Implemented — all 80 tasks across 6 user stories complete (see tasks.md); `pnpm test`/`pnpm test:e2e`/`pnpm lint`/`pnpm build`/`pnpm size` all pass. Two items remain owner-side per Constitution Principle III (real-device touch/scrubber pass and dark-mode contrast check, and real-Cognito golden-path re-check) — tracked in `docs/review/19-manual-verification.md`, not blocking.

**Review docs covered**: [`docs/review/12-library-choice-review.md`](../../docs/review/12-library-choice-review.md), [`docs/review/13-component-library-and-design-system.md`](../../docs/review/13-component-library-and-design-system.md), [`docs/review/14-charts-and-mobile-interaction.md`](../../docs/review/14-charts-and-mobile-interaction.md), [`docs/review/15-theming-light-dark-mode.md`](../../docs/review/15-theming-light-dark-mode.md)

**Input**: User description: "Third spec in the sequence: fix the adhoc component library and ship real light/dark mode, then use that same CSS-var/localStorage-preference foundation to consolidate charting onto Recharts and fix mobile/touch chart interaction. shadcn's Button relies on undefined --background/--primary CSS vars (silently unstyled) — owner-decided to wire up the theme rather than drop shadcn. Build a useTheme hook (light/dark/system, localStorage-backed, matching usePersistentState) plus a prefers-color-scheme listener; owner-decided default is 'system'. Add a nav toggle. Sweep the app (prioritizing D3 charts) for dark-mode coverage. Consolidate onto FontAwesome instead of three icon libraries. Then consolidate the dual charting approach (Recharts + ~13 hand-rolled D3 files) onto Recharts only — owner-decided — with every chart resizing via ResizeObserver (not just window resize), scaling margins/label density for narrow viewports, key values visible without hover, tap-to-pin + bottom-sheet tooltips for touch, and the scrubber/drag-to-scan pattern applied to every chart (owner-decided full scope, added cost accepted). Update the theme-color meta pair once dark mode exists."

**Sequencing note**: run this spec **third**, after 005 (repo hygiene/security) and 006
(dev automation/quality gates, so this lands with test/lint/CI coverage). Internally,
theming work (User Stories 1-3) must land before the Recharts migration (User Stories
4-6), since chart color theming shouldn't be redone after the migration. This spec's
`useTheme` hook is the pattern [008-internationalization-and-seo](../008-internationalization-and-seo/spec.md)'s
`useLocale` hook mirrors, and its nav toggle is where that spec's language switcher gets
co-located.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - shadcn's design-system layer is wired up and actually renders (Priority: P1)

shadcn's `Button` is currently unstyled because its CSS custom properties are never
defined. After this story, shadcn primitives are the real source of truth for
interactive elements.

**Independent Test**: render a shadcn `Button` with no className overrides; confirm it
now renders its intended styling, sourced from `shark-*`-mapped CSS custom properties.

**Acceptance Scenarios**:

1. **Given** `--background`, `--primary`, and related CSS custom properties defined for
   `:root`, **When** shadcn primitives render, **Then** they show intended styling with
   no override needed.
2. **Given** a re-audit of all shadcn primitives in use, **Then** none silently rely on
   an undefined CSS var.

---

### User Story 2 - A user can switch between light, dark, and system theme, and it persists (Priority: P1)

A visible toggle switches themes and the choice persists; with no stored preference, the
app follows the OS setting (owner-decided default: `system`).

**Independent Test**: with no stored preference, load the app with OS dark mode on;
confirm it renders dark by default. Toggle to light; reload; confirm it stays light.

**Acceptance Scenarios**:

1. **Given** a first-time user, **When** the app loads, **Then** it follows OS
   `prefers-color-scheme`.
2. **Given** a nav toggle, **When** a value is selected, **Then** the `dark` class
   toggles on `<html>` immediately and persists to `localStorage` (via
   `usePersistentState`).
3. **Given** `system` is selected, **When** the OS setting changes live, **Then** the
   app updates via a `matchMedia` listener without a reload.
4. **Given** the 5 files already using `dark:` classes (`BarPlot.tsx`,
   `AccountsDropdown.tsx`, `TransactsTable.tsx`, `dropdown-menu.tsx`, `slider.tsx`),
   **When** dark mode toggles on, **Then** those classes activate with zero further
   changes to those files.

---

### User Story 3 - Dark mode covers the whole app, and one icon library replaces three (Priority: P2)

Only 5 files have `dark:` styling today. Every route (especially D3/Recharts charts) gets
swept for coverage, the `theme-color` meta pair becomes light/dark-aware, and
`lucide-react`/`@remixicon/react` get consolidated onto FontAwesome.

**Independent Test**: toggle dark mode and manually walk every top-level route; confirm
no hardcoded-light element is illegible. `git grep` for `lucide-react`/`@remixicon/react`
returns zero results.

**Acceptance Scenarios**:

1. **Given** dark mode is active, **When** each top-level route is viewed, **Then** no
   hardcoded light-only background/text combination is illegible, and chart colors/
   gridlines/axis text are legibly themed.
2. **Given** the `theme-color` meta tag, **When** dark mode exists, **Then** it becomes a
   light/dark-aware pair.
3. **Given** the 3 files using `lucide-react`/`@remixicon/react`, **When** migrated,
   **Then** they use FontAwesome with no visual regression, and `components.json`'s
   `iconLibrary` field is corrected.

---

### User Story 4 - All charts render through one charting library (Priority: P1)

Recharts and hand-rolled D3 (~13 files under `summary/-plots/` and
`travels/-components/`) currently coexist. Every chart migrates to Recharts.

**Independent Test**: `git grep` for direct `d3-*` imports outside Recharts' own
dependency tree returns zero results; every chart renders via Recharts primitives.

**Acceptance Scenarios**:

1. **Given** each hand-rolled D3 chart file, **When** migrated, **Then** it renders
   visually equivalent output via Recharts with no data/metric loss.
2. **Given** the migration is complete, **When** `package.json` is checked, **Then**
   direct D3 sub-package dependencies are removed.
3. **Given** doc 12's "quick keep confirmation" items (TanStack Router, TanStack Query),
   **When** reviewed, **Then** each is confirmed with a one-line rationale in
   `docs/decisions.md`.

---

### User Story 5 - Charts resize correctly and stay usable on touch (Priority: P1)

Every chart uses `ResizeObserver` on its own container (not just `window` resize), scales
margins/density for narrow viewports, keeps key values visible without hovering, and
supports tap-to-pin plus bottom-sheet tooltips.

**Independent Test**: resize a chart's container programmatically; confirm it re-renders.
On a touch device, tap a data point; confirm a tooltip pins and stays visible.

**Acceptance Scenarios**:

1. **Given** any chart, **When** its container resizes for any reason, **Then**
   dimensions update via `ResizeObserver`; margins/label density scale down on narrow
   viewports; `BarPlot.tsx`'s fixed `h-80` becomes responsive.
2. **Given** any chart's total/current-period value, **When** viewed with no
   interaction, **Then** it's visible by default.
3. **Given** a touch device, **When** a user taps a data point, **Then** a tooltip pins
   until dismissed; on narrow viewports it renders as a bottom sheet.

---

### User Story 6 - The scrubber/drag-to-scan pattern is applied to every chart (Priority: P2)

Owner-decided (2026-08-10) full-scope application, not the originally-scoped 1-2 charts,
with the added implementation cost accepted.

**Independent Test**: drag across each chart's plot area; confirm a scrubber/crosshair
tracks the drag and updates the pinned value, on every chart in the app.

**Acceptance Scenarios**:

1. **Given** each chart (post-Recharts migration), **When** dragged across, **Then** a
   scrubber tracks the position and the value updates live.
2. **Given** the accepted added cost, **When** sequencing tasks, **Then** this story is
   scheduled last within the spec.

### Edge Cases

- Inline-styled components or raw hex/rgb literals bypassing `shark-*` get swept and
  migrated to the token system (doc 13 phase 4).
- New `dark:` classes must be checked for WCAG AA contrast in both light and dark
  variants (an [006-dev-automation-and-quality-gates](../006-dev-automation-and-quality-gates/spec.md)
  concern).
- `prefers-color-scheme`/`matchMedia` must be verified on a real browser with OS dark
  mode on, not just DevTools emulation (the two don't always match 1:1).
- A chart with very few data points must degrade gracefully for scrubber/tap-to-pin
  rather than erroring.
- Any D3 behavior with no direct Recharts equivalent (e.g. a custom curve) gets its
  visual deviation documented and confirmed acceptable, not silently dropped.
- A bottom-sheet tooltip on a very short-height viewport must leave the tapped point
  visible above it.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: CSS custom properties MUST be defined for `:root` and `.dark`, mapped onto
  `shark-*`; shadcn primitives MUST render intended styling with no overrides.
- **FR-002**: A `useTheme` hook MUST support `light`/`dark`/`system`, persisted via
  `usePersistentState`'s `localStorage` pattern, with live `matchMedia` updates for
  `system`.
- **FR-003**: A visible theme toggle MUST exist in the nav; the 5 known `dark:` files
  MUST activate with zero further changes.
- **FR-004**: Every top-level route (prioritizing charts) MUST be dark-mode-audited and
  fixed; the `theme-color` meta MUST become a light/dark-aware pair.
- **FR-005**: The app MUST use exactly one icon library (FontAwesome);
  `lucide-react`/`@remixicon/react` MUST be removed and `components.json`'s
  `iconLibrary` corrected.
- **FR-006**: Every chart MUST render through Recharts; no direct D3 sub-package
  chart-rendering code may remain.
- **FR-007**: Every chart MUST resize via `ResizeObserver` on its own container, with
  margins/label density scaling for narrow viewports.
- **FR-008**: Each chart's key value(s) MUST be visible by default; tapping a data point
  MUST pin a tooltip, rendered as a bottom sheet on narrow viewports.
- **FR-009**: The scrubber/drag-to-scan interaction MUST be implemented on every chart.
- **FR-010**: TanStack Router/Query keep decisions MUST each get a one-line rationale in
  `docs/decisions.md`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user sees the app in their OS `prefers-color-scheme` on first load;
  an explicit choice persists across reload and a new session.
- **SC-002**: Every top-level route in dark mode has zero illegible text/background
  combinations; `git grep` for `lucide-react`/`@remixicon/react` returns zero results.
- **SC-003**: `git grep` for direct D3 sub-package imports returns zero results outside
  Recharts' own tree; every chart at 375px width shows legible, correctly-scaled labels.
- **SC-004**: On a real touch device, every chart's key value is visible without
  interaction, tapping pins a working tooltip, and every chart supports drag-to-scan.

## Assumptions

- The `shark-*` palette itself isn't being redesigned — only mapped onto CSS custom
  properties and dark-mode variants.
- Icon consolidation lands on FontAwesome specifically, already dominant.
- Recharts can express every currently-hand-rolled D3 interaction (scrubber, tap-to-pin,
  bottom sheet) via its API plus custom overlays; no chart is expected to need to stay on
  raw D3.
- Real-device verification (dark mode, touch interaction) is tracked in
  `docs/review/19-manual-verification.md`.
