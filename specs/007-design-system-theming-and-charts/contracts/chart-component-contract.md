# Contract: shared chart component behavior

Every file in `data-model.md`'s Chart Migration Inventory MUST satisfy this contract once
migrated. This is the "interface" the spec's User Stories 4-6 require consistently across
all 15 charts, expressed as concrete component/hook obligations rather than prose.

## Rendering

- MUST render via Recharts primitives (`ResponsiveContainer` + one of
  `LineChart`/`AreaChart`/`BarChart`/`PieChart`) — no direct `d3-*` import (FR-006).
- MUST wrap in Recharts' `ResponsiveContainer` (not a manually-sized `<svg>`) so resize is
  `ResizeObserver`-backed by construction (FR-007) — this replaces every chart's own
  `useWindowSize`/`useOnWindowResize` call once migrated (research.md item 5).
- MUST scale margins and axis tick density for narrow viewports: use `useIsNarrowViewport`
  (existing hook, `src/common/utils.ts`) to switch `margin` props and `XAxis`/`YAxis`
  `interval`/`tick` formatting between a desktop and a mobile variant, not one fixed
  desktop layout shrunk to fit.

## Key values

- MUST render the chart's primary value (current-period total, latest data point — chart-
  specific) as an always-visible on-chart label or adjacent stat, not gated behind
  hover/tap (FR-008, US5.2).

## Touch interaction

- MUST use `useChartScrubber` (`src/hooks/useChartScrubber.ts`) for drag-to-scan: the hook
  takes the chart's data array and a container ref, returns `{ activeIndex, isDragging }`;
  the chart renders a Recharts `ReferenceLine`/cursor at `activeIndex` and feeds it to
  `ChartTooltip`.
- MUST use `ChartTooltip` (`src/components/charts/ChartTooltip.tsx`) as the `Tooltip`
  `content` renderer: pins open on tap (`pinned` state) until dismissed or a different
  point is tapped (FR-008), and renders as a bottom sheet instead of a floating tooltip
  when `useIsNarrowViewport()` is true.
- Interactive hit targets (Recharts `Dot`/`activeDot`) MUST use a pointer/touch hit radius
  of at least 44×44px independent of the visible marker's drawn radius.

## Theming

- MUST source gridline, axis-text, and series colors from the CSS custom properties
  defined in `data-model.md`'s CSS Custom Property Token Map (via `useTheme().resolved`
  where a JS-side color value is required, e.g. Recharts `stroke`/`fill` props that can't
  take a CSS variable directly in every case — confirm per-prop during implementation) so
  dark mode is legible (FR-004, spec Edge Cases).

## Non-goals

- Not every chart needs an identical visual layout post-migration — "visually equivalent"
  (US4.1) means same information, same general chart type and readability, not pixel-
  identical output from the old D3 rendering.
- A chart type with no direct D3-custom-curve equivalent in Recharts documents the visual
  deviation (spec Edge Cases) rather than blocking migration on an exact match.
