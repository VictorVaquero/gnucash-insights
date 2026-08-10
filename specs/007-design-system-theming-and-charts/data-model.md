# Phase 1 Data Model: Design System, Theming & Charts

No database/storage schema is touched by this spec (see `plan.md` Technical Context —
Storage: N/A). "Data model" here is the UI/client state this feature introduces or
restructures: theme state, chart migration inventory (tracking entity for tasks.md), and
chart interaction state shared across every migrated chart.

## Theme

Client-only state, persisted to `localStorage`, no server representation.

| Field        | Type                            | Notes                                                                                                                                                                             |
| ------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preference` | `"light" \| "dark" \| "system"` | User's explicit choice; default `"system"` per spec's owner-decided default. Persisted via `usePersistentState("theme", "system")`.                                               |
| `resolved`   | `"light" \| "dark"`             | Derived, not persisted: `preference` directly when `light`/`dark`; `window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"` when `preference === "system"`. |

**State transitions**:

- User selects a value via `ThemeToggle` → `preference` updates → `resolved` recomputes
  synchronously → `dark` class added/removed on `<html>` → `localStorage` write (async,
  via `usePersistentState`'s effect).
- `preference === "system"` and the OS setting changes → `matchMedia` `"change"` listener
  fires → `resolved` recomputes → `dark` class updates. `preference` itself does not
  change (still `"system"`).
- Page load, no stored value → `preference` defaults to `"system"` → same resolution as
  above on first render (spec Acceptance Scenario US2.1).

**Validation rules**: `preference` MUST be one of the three literal values — no free-form
storage; `usePersistentState`'s `JSON.parse` on load means a corrupted/foreign
`localStorage` value should be guarded by falling back to `"system"` rather than throwing
(implementation detail for `useTheme`, not a new persistence entity).

## CSS Custom Property Token Map

Not runtime data, but a fixed mapping tasks.md implementation needs to enumerate exactly
once (research.md item 1 lists the candidate set) — recorded here as the "entity" whose
two states (`:root`, `.dark`) `useTheme` switches between via the `dark` class, and which
shadcn primitives and every `dark:`-swept component read.

| Token                                           | Light source                                                                                                             | Dark source              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `--background`                                  | `white`                                                                                                                  | `shark-900`              |
| `--foreground`                                  | `shark-900`                                                                                                              | `shark-50`               |
| `--primary`                                     | `shark-700` (or app's existing primary-action color — confirm against current hand-styled buttons during implementation) | `shark-300`              |
| `--primary-foreground`                          | `white`                                                                                                                  | `shark-950`              |
| `--border` / `--input`                          | `shark-200`                                                                                                              | `shark-700`              |
| `--ring`                                        | `shark-400`                                                                                                              | `shark-400`              |
| `--muted` / `--secondary`                       | `shark-100`                                                                                                              | `shark-800`              |
| `--muted-foreground` / `--secondary-foreground` | `shark-500`                                                                                                              | `shark-300`              |
| `--destructive`                                 | existing destructive/red token if any, else Tailwind red scale                                                           | darker red variant       |
| `--accent` / `--accent-foreground`              | `shark-100` / `shark-900`                                                                                                | `shark-800` / `shark-50` |

Exact values are an implementation-time decision (confirm against real rendered contrast,
not just token names) — this table fixes the _set_ of tokens and their general light/dark
direction, not final hex values, per `plan.md`'s note that only shadcn primitives actually
in use need values defined.

## Chart Migration Inventory

Tracking entity for `tasks.md` — one row per file that currently imports `d3` directly
(research.md item 4), each becoming one migration task. Not a runtime data structure.

| File                                                 | Current chart type   | Recharts target                                            | Notes                                                                                                                                           |
| ---------------------------------------------------- | -------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `summary/-plots/AssetAccountsPlot.tsx`               | D3 line/area         | `AreaChart`/`LineChart`                                    | uses `useWindowSize` already (ResizeObserver-backed)                                                                                            |
| `summary/-plots/DetailedExpensesBarPlot.tsx`         | D3 bar               | `BarChart`                                                 |                                                                                                                                                 |
| `summary/-plots/DetailedIncomeBarPlot.tsx`           | D3 bar               | `BarChart`                                                 |                                                                                                                                                 |
| `summary/-plots/IncomeExpensesPlot.tsx`              | D3 line/area         | `AreaChart`/`LineChart`                                    | uses `useWindowSize`                                                                                                                            |
| `summary/-plots/MonthDetailedExpensesPiePlot .tsx`   | D3 pie               | `PieChart`                                                 | filename has a trailing space — preserve or fix as a separate, explicitly-called-out rename                                                     |
| `summary/-plots/Tooltip.tsx`                         | D3 tooltip helper    | superseded by shared `ChartTooltip`                        | delete once no chart imports it                                                                                                                 |
| `summary/-plots/tooltipFuncs.tsx`                    | D3 tooltip logic     | folded into `ChartTooltip`/Recharts `Tooltip` content      | delete once unused                                                                                                                              |
| `travels/-components/TravelExpensesDetailedPlot.tsx` | D3                   | Recharts equivalent (confirm chart type at implementation) | uses `useWindowSize`                                                                                                                            |
| `travels/-components/TravelExpensesMonthlyPlot.tsx`  | D3 bar/line          | `BarChart`/`LineChart`                                     | uses `useWindowSize`                                                                                                                            |
| `travels/-components/TravelExpensesPiePlot .tsx`     | D3 pie               | `PieChart`                                                 | filename has a trailing space                                                                                                                   |
| `travels/-components/TravelExpensesPlot.tsx`         | D3                   | Recharts equivalent                                        | uses `useWindowSize`, `XAxis`/`YAxis`                                                                                                           |
| `analysis/-components/KpiBlock.tsx`                  | D3 scale/format only | likely no chart primitive needed                           | confirm during implementation (research.md item 4) — may just drop `d3` import                                                                  |
| `analysis/-components/TransactsPlot.tsx`             | D3                   | Recharts equivalent                                        | uses `useWindowSize`, `XAxis`/`YAxis`, shared `Tooltip`/`tooltipFuncs`                                                                          |
| `components/charts/XAxis.tsx`                        | D3 axis helper       | replaced by Recharts' built-in `XAxis`                     | delete once no consumer remains                                                                                                                 |
| `components/charts/YAxis.tsx`                        | D3 axis helper       | replaced by Recharts' built-in `YAxis`                     | delete once no consumer remains                                                                                                                 |
| `components/charts/BarPlot.tsx`                      | Already Recharts     | unchanged chart type                                       | resize mechanism swap (`useOnWindowResize` → `ResponsiveContainer`/`ResizeObserver`), add scrubber + tap-to-pin, icon swap (research.md item 3) |

Each row's migration MUST satisfy spec Acceptance Scenario US4.1 (visually equivalent,
no data/metric loss) and gain, in the same pass (per research.md item 7's sequencing):
always-visible key value(s) (US5.2), tap-to-pin + bottom-sheet tooltip (US5.3), and the
scrubber (US6.1).

## Chart Interaction State (shared, per-chart-instance)

Runtime state each migrated chart holds via the two new shared primitives
(`useChartScrubber`, `ChartTooltip` — see `contracts/chart-component-contract.md`), not
persisted.

| Field              | Type             | Owner                                    | Notes                                                                                         |
| ------------------ | ---------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `activeIndex`      | `number \| null` | `useChartScrubber`                       | index into the chart's data array currently under the pointer/touch drag, or `null` when idle |
| `isDragging`       | `boolean`        | `useChartScrubber`                       | true while a drag/touch-move gesture is active                                                |
| `pinned`           | `boolean`        | `ChartTooltip`                           | true after a tap, until dismissed or another point tapped                                     |
| `isNarrowViewport` | `boolean`        | `useIsNarrowViewport` (existing, reused) | drives `ChartTooltip`'s bottom-sheet vs. floating render choice                               |
