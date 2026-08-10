# Implementation Plan: Design System, Theming & Charts

**Branch**: `007-design-system-theming-and-charts` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-design-system-theming-and-charts/spec.md`

## Summary

Two coupled halves, sequenced so the second doesn't redo the first's work: (1) finish the
half-built design-system/dark-mode layer — define `--background`/`--primary`/etc. CSS
custom properties for `:root` and `.dark` mapped onto the existing `shark-*` palette so
shadcn primitives (currently silently unstyled) render correctly, ship a `useTheme` hook
(`light`/`dark`/`system`, `localStorage`-backed via the existing `usePersistentState`
pattern, live `prefers-color-scheme` listener, default `system`) with a nav toggle, sweep
every route for dark-mode coverage, and consolidate three icon libraries
(`@fortawesome/*` + `lucide-react` + `@remixicon/react`, 3 files) onto FontAwesome alone;
then (2) migrate all 15 hand-rolled-D3 chart files (`summary/-plots/`,
`travels/-components/`, `analysis/-components/`, plus the shared `XAxis`/`YAxis` helpers —
more than the spec's ~13 estimate, confirmed by `git grep`) onto Recharts, so every chart
shares one resize mechanism (`ResizeObserver`, already correct at the hook level in
`useWindowSize` but only wired to 8 of the D3 files and not to `BarPlot.tsx`'s
`useOnWindowResize`), always-visible key values, tap-to-pin + bottom-sheet tooltips on
touch, and a shared scrubber/drag-to-scan component applied to every chart (owner-decided
full scope). Theming lands first because chart color/gridline theming would otherwise be
redone post-migration.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js >=24 (unchanged).

**Primary Dependencies**: existing stack unchanged (React 19, Vite 7, Tailwind v4 via
`@tailwindcss/vite` + `@theme` in `src/index.css`, `tailwind.config.ts` with
`darkMode: "class"` already set, Recharts 3.6, shadcn/Radix primitives, `usePersistentState`
for `localStorage`). This spec's dependency changes: **add** none (FontAwesome, Recharts,
and the CSS-var mechanism are all already present); **remove** `d3` (^7.9.0, plus
`@types/d3`), `lucide-react`, `@remixicon/react` once every consumer is migrated —
confirmed via `git grep` that removal is safe only after all 15 D3-importing files and the
3 lucide/remixicon files are converted (`research.md` items 1, 4, 6).

**Storage**: N/A — no data/schema changes. `useTheme`'s only persistence is a
`localStorage` key via the existing `usePersistentState` hook (same mechanism already used
for auth/UI state, per `docs/decisions.md`).

**Testing**: existing Vitest + React Testing Library + `vitest-axe` (from spec 006) for
`useTheme` and migrated chart components; Storybook (already configured, MSW-backed) for
visual/interaction states including a dark-mode toolbar addon if not already present;
Playwright (from spec 006) for a dark-mode-toggle e2e smoke test and mobile-viewport chart
interaction; manual verification on a real touch device per Constitution Principle III and
this spec's own Assumptions (real-device checks tracked in
`docs/review/19-manual-verification.md`).

**Target Platform**: Vercel-hosted SPA (unchanged) — web, evaluated at both desktop and
375px-wide mobile viewports; dark-mode/`prefers-color-scheme` behavior must be verified in
a real browser, not just DevTools emulation (spec Edge Cases).

**Project Type**: Single existing project (`cashpy_v2` SPA) — unchanged. No new top-level
application directories; this spec touches `src/index.css`, `tailwind.config.ts`,
`components.json`, existing chart/UI component files, and adds a small number of new
shared files (`useTheme` hook, a theme-toggle component, a shared scrubber
hook/component, a tooltip/bottom-sheet primitive).

**Performance Goals**: no regression to the spec-006-measured Lighthouse baseline or the
`size-limit` chart-route-chunk budget (89 KB gzip) — removing `d3` (~breaks even or nets
smaller once Recharts absorbs the rendering work already partially duplicated) is expected
to help, not hurt, this budget; re-measure and adjust the budget in the same PR if the
real post-migration number differs materially (research.md item 1).

**Constraints**: Must not break the golden path (login → data loads → charts render) or
guest path (Constitution Principle III) at any intermediate commit — each chart migrates
file-by-file so the app stays shippable mid-spec, per Constitution Principle I. Dark mode
and the icon swap must not regress the five accessibility fixes spec 006 already landed
(`SideBar` accessible name, `shark-*` contrast token swaps, Recharts `accessibilityLayer`,
login `sr-only` labels, post-nav focus) — new `dark:` classes get the same WCAG AA
contrast bar per this spec's Edge Cases. The `shark-*` palette's own values are not
redesigned (spec Assumptions) — only mapped onto CSS custom properties and dark variants.

**Scale/Scope**: 15 files import `d3` directly (`git grep -l 'import \* as d3 from "d3"' src`
— `summary/-plots/{AssetAccountsPlot,DetailedExpensesBarPlot,DetailedIncomeBarPlot,
IncomeExpensesPlot,MonthDetailedExpensesPiePlot ,Tooltip,tooltipFuncs}.tsx`,
`travels/-components/{TravelExpensesDetailedPlot,TravelExpensesMonthlyPlot,
TravelExpensesPiePlot ,TravelExpensesPlot}.tsx`, `analysis/-components/{KpiBlock,
TransactsPlot}.tsx`, and the shared `components/charts/{XAxis,YAxis}.tsx` — 2 more files
than the spec's "~13" estimate and 2 outside the `summary/`/`travels/` folders it names;
tracked as a scope correction, not a scope change, since FR-006/SC-003 already require
"every chart"). 3 files use `lucide-react`/`@remixicon/react` (`checkbox.tsx`,
`dropdown-menu.tsx`, `BarPlot.tsx`). 5 files already have (currently inert) `dark:`
classes. 1 already-Recharts file (`BarPlot.tsx`) needs its resize mechanism swapped from
window-only (`useOnWindowResize`) to container `ResizeObserver`, and its scrubber/
tap-to-pin/bottom-sheet added like every migrated chart. `index.html`'s
`<meta name="theme-color">` does not currently exist (spec's FR-004 "becomes" a pair —
confirmed this is new, not an edit to an existing single tag).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                             | Check                                                                                                                                                                                                                                                                                                                                                                    | Result |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| I. Incremental, Reversible Migration  | Theming (US1-3) and the Recharts migration (US4-6) are each independently shippable, and within the migration each of the 15 chart files converts as its own commit/PR-sized unit — a partially-migrated state (some charts D3, some Recharts) is still a working app, so no synchronized cutover is required. Icon consolidation is 3 small independent file edits.     | PASS   |
| II. Cost-Consciousness                | No new paid or metered service. FontAwesome, Recharts, and Tailwind's CSS-var mechanism are already-installed free/open-source dependencies; this spec is net dependency-_removal_ (`d3`, `lucide-react`, `@remixicon/react`).                                                                                                                                           | PASS   |
| III. Continuity of the Working App    | Every chart file migration must render "visually equivalent output... with no data/metric loss" (spec Acceptance Scenario US4.1) and gets a manual golden-path check before merge; the existing Playwright golden-path suite (spec 006) is the automated regression guard run at each step.                                                                              | PASS   |
| IV. Boring, Well-Supported Technology | Recharts (already a direct dependency, actively maintained, React-native API) replaces hand-rolled D3 — the well-supported-library direction, not the reverse. FontAwesome (already dominant in the codebase) replaces two minor icon libraries. CSS custom properties + a `class`-based dark-mode toggle is the standard Tailwind/shadcn pattern, not a novel approach. | PASS   |
| V. Data Privacy on a Public Surface   | No auth, data-fetching, or credential-handling code is touched by this spec — purely presentational/styling/charting-library changes over data that's already fetched under existing auth.                                                                                                                                                                               | PASS   |

No violations; Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-design-system-theming-and-charts/
├── spec.md                          # Feature spec (already exists)
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── use-theme-hook-contract.md   # Phase 1 output — the hook 008's useLocale mirrors
│   └── chart-component-contract.md  # Phase 1 output — shared props every migrated chart implements
└── tasks.md                         # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Theming foundation (User Stories 1-3)
src/index.css                        # add --background/--primary/etc. under @theme (:root) and a .dark override block, mapped onto shark-*
tailwind.config.ts                   # unchanged (darkMode: "class" already set) — reference only
components.json                      # iconLibrary: "lucide" -> "fontawesome" fix (already fontawesome; audit for drift)
src/hooks/useTheme.ts                # new — light/dark/system, usePersistentState-backed, matchMedia listener, sets .dark on <html>
src/components/ThemeToggle.tsx       # new — nav control (light/dark/system)
src/components/SideBar.tsx           # gains the ThemeToggle (or wherever nav placement lands — UI decision, not technical)
index.html                           # theme-color meta becomes a light/dark prefers-color-scheme pair
src/components/ui/checkbox.tsx       # lucide Check -> FontAwesome faCheck
src/components/ui/dropdown-menu.tsx  # lucide Check/ChevronRight/Circle -> FontAwesome equivalents
src/components/charts/BarPlot.tsx    # remixicon Ri*ArrowLine -> FontAwesome faChevronLeft/Right; dark-mode class audit
package.json                         # remove lucide-react, @remixicon/react once migrated

# Chart consolidation onto Recharts (User Stories 4-6), one file per row, D3 -> Recharts
src/routes/summary/-plots/
├── AssetAccountsPlot.tsx            # migrate
├── DetailedExpensesBarPlot.tsx      # migrate
├── DetailedIncomeBarPlot.tsx        # migrate
├── IncomeExpensesPlot.tsx           # migrate
├── MonthDetailedExpensesPiePlot .tsx# migrate
├── Tooltip.tsx                      # replaced by shared Recharts tooltip/bottom-sheet primitive
└── tooltipFuncs.tsx                 # logic folded into the shared primitive or removed if Recharts-native
src/routes/travels/-components/
├── TravelExpensesDetailedPlot.tsx   # migrate
├── TravelExpensesMonthlyPlot.tsx    # migrate
├── TravelExpensesPiePlot .tsx       # migrate
└── TravelExpensesPlot.tsx           # migrate
src/routes/analysis/-components/
├── KpiBlock.tsx                     # migrate (uses d3 for scale/format only — confirm scope during Phase 0)
└── TransactsPlot.tsx                # migrate
src/components/charts/
├── XAxis.tsx                        # removed once no D3 chart consumes it (Recharts has its own Axis)
├── YAxis.tsx                        # removed once no D3 chart consumes it
├── BarPlot.tsx                      # resize mechanism: useOnWindowResize -> ResizeObserver; add scrubber/tap-to-pin
└── utils.ts                         # shared chart helpers, extended with scrubber/tooltip-pin state if reusable here

# New shared chart interaction primitives
src/hooks/useChartScrubber.ts        # new — shared drag-to-scan hook, per-chart container
src/components/charts/ChartTooltip.tsx # new — tap-to-pin, bottom-sheet-on-narrow-viewport tooltip primitive
src/hooks/useOnWindowResize.ts       # removed once BarPlot.tsx no longer uses it (superseded by common/utils.ts's ResizeObserver-based useWindowSize)

docs/decisions.md                    # +TanStack Router/Query one-line keep confirmations (FR-010)
```

**Structure Decision**: no new top-level directories. This is a modify-in-place spec over
the existing single-SPA structure — CSS-var/theming changes live in `src/index.css` +
a new `src/hooks/useTheme.ts` + `src/components/ThemeToggle.tsx`; the chart migration
replaces file contents in place (same file paths, D3 implementation swapped for Recharts)
except for the two shared D3-only helpers (`XAxis.tsx`, `YAxis.tsx`) and D3-only tooltip
helpers (`Tooltip.tsx`, `tooltipFuncs.tsx`) which are deleted once superseded by Recharts-
native equivalents and the new shared `ChartTooltip`/`useChartScrubber` primitives.
