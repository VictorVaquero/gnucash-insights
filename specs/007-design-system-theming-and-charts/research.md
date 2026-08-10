# Phase 0 Research: Design System, Theming & Charts

All open questions below were already substantively decided across
`docs/review/12-library-choice-review.md`, `13-component-library-and-design-system.md`,
`14-charts-and-mobile-interaction.md`, and `15-theming-light-dark-mode.md` (all marked
"Planning done" / "decided 2026-08-10"). This file confirms those decisions against the
actual current code (some review-doc findings were stale, corrected below) and resolves
the remaining implementation-detail unknowns the review docs left open.

## 1. CSS custom property wiring: map onto `shark-*`, don't redesign the palette

**Decision**: define `--background`, `--foreground`, `--primary`, `--primary-foreground`,
`--secondary`, `--secondary-foreground`, `--accent`, `--accent-foreground`,
`--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`,
`--muted`, `--muted-foreground` (shadcn's standard set — grep `button.tsx`,
`dropdown-menu.tsx`, `slider.tsx`, `checkbox.tsx` for the exact set actually referenced,
since only the ones in use need values) as Tailwind v4 `@theme` tokens in `src/index.css`,
with light values sourced from the existing `shark-*` scale (`shark-50`...`shark-950`)
and white, and a `.dark` block overriding the same custom properties with darker-end
`shark-*` values — the same source-of-truth palette, just two mappings of it.

**Rationale**: doc 13's confirmed finding is that `Button` relies on these vars with zero
values defined anywhere; doc 13's decided option (a) is "wire up the theme properly," and
doc 15 confirms this is the same underlying change as dark-mode's CSS-var scope. Reusing
`shark-*` (not introducing a second palette) satisfies the spec's own Assumption that the
palette itself isn't being redesigned.

**Alternatives considered**: option (b) from doc 13 (drop shadcn's CSS-var convention,
formally commit to hand-styled `shark-*` utilities) — rejected, already decided against
2026-08-10 in favor of (a) specifically because it's synergistic with dark mode rather
than throwaway work.

**Correction found during implementation (T005)**: two mechanisms doc 13/15 assumed were
already working were not:

1. `tailwind.config.ts`'s `darkMode: "class"` is never loaded by the actual build — this
   project's Tailwind v4 setup is CSS-first (`@import "tailwindcss"` in `src/index.css`
   via the `@tailwindcss/vite` plugin), and nothing references the config file (no
   `@config` directive, no path passed to the plugin). Every `dark:` class in the app
   compiled to `@media (prefers-color-scheme: dark)`, not a `.dark`-class selector.
   `useTheme`'s `.dark`-class toggle (contract rule 3) would have silently done nothing.
   Fixed with Tailwind v4's actual mechanism: `@custom-variant dark (&:where(.dark, .dark
*));` in `src/index.css`.
2. The token-alias block mapping `--color-background` (etc.) onto the runtime `--background`
   var must live in `@theme inline { ... }`, not plain `@theme { ... }` — otherwise
   Tailwind pre-resolves the alias once against `:root` and every `bg-background`-style
   utility stays pinned to the light value regardless of `.dark`.

Both are now fixed in `src/index.css`; see `tasks.md` T005's Done note for the full
verification trail. `tailwind.config.ts` itself is left in place (still referenced by
`components.json` for shadcn CLI scaffolding) but drives none of this project's actual
CSS output.

## 2. `useTheme` hook shape

**Decision**: `light | dark | system` tri-state, `usePersistentState("theme", "system")`
for storage (reusing the exact hook/key-prefix pattern already in
`src/hooks/usePersistentState.ts`, not a new persistence mechanism), plus a
`useEffect` that (a) computes the resolved theme (`system` → read
`window.matchMedia("(prefers-color-scheme: dark)").matches`), (b) toggles the `dark`
class on `document.documentElement`, and (c) — only when the stored preference is
`system` — subscribes a `matchMedia` `"change"` listener (mirroring the existing
`useMediaQuery` pattern already in `src/common/utils.ts`, used today for
`useIsTouchDevice`/`useIsNarrowViewport`) so a live OS theme change re-renders without
reload, per spec Acceptance Scenario US2.3.

**Rationale**: doc 15's Phase 1 spells out exactly this shape; `usePersistentState` and
the `matchMedia`-listener pattern (`useMediaQuery`) already exist in this codebase for
unrelated purposes (viewport/pointer detection) and are directly reusable rather than
reinvented — same conclusion `docs/decisions.md`'s auth-persistence entry already reached
for `localStorage` generally ("reuse that pattern rather than introducing a new
persistence mechanism").

**Alternatives considered**: React Context provider wrapping the app — not needed; a
single hook called at the root (setting a `documentElement` class as a side effect) is
sufficient since consumers style via CSS (`.dark` selector), not via reading theme state
in JS, except the toggle control itself which calls the hook directly. `next-themes`-style
library — rejected per Constitution IV (no new dependency needed when the existing
`usePersistentState` + `useMediaQuery` patterns already cover it).

## 3. Icon consolidation: exact swap list

**Decision**: 3 files, small enough to enumerate exactly rather than treat as an unknown:

| File                                  | Current import                                             | FontAwesome replacement                         |
| ------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `src/components/ui/checkbox.tsx`      | `Check` (lucide-react)                                     | `faCheck` (`@fortawesome/free-solid-svg-icons`) |
| `src/components/ui/dropdown-menu.tsx` | `Check`, `ChevronRight`, `Circle` (lucide-react)           | `faCheck`, `faChevronRight`, `faCircle`         |
| `src/components/charts/BarPlot.tsx`   | `RiArrowLeftSLine`, `RiArrowRightSLine` (@remixicon/react) | `faChevronLeft`, `faChevronRight`               |

`components.json`'s `iconLibrary` field already reads `"fontawesome"` (confirmed by
reading the file directly — doc 13's claim that it reads `"lucide"` and contradicts usage
is **stale**; no edit needed there, only a note that this was already correct).

**Rationale**: FontAwesome is already the dominant, actively-used library
(`@fortawesome/fontawesome-svg-core` + `free-solid-svg-icons` + `react-fontawesome`); doc
12/13 both confirm the consolidation target. Package removal (`lucide-react`,
`@remixicon/react`) happens in the same PR as the last consuming file's migration.

## 4. D3 → Recharts migration scope: corrected file count

**Decision**: 15 files import `d3` directly (verified via
`git grep -l 'import \* as d3 from "d3"' src`), not the spec's estimated "~13": the 11
files under `summary/-plots/` and `travels/-components/` the spec names, **plus** 2 files
under `analysis/-components/` (`KpiBlock.tsx`, `TransactsPlot.tsx`) and 2 shared helpers
under `components/charts/` (`XAxis.tsx`, `YAxis.tsx`) the spec's prose doesn't name. This
is a scope _correction_, not a scope _expansion_ — FR-006 ("every chart MUST render
through Recharts") and SC-003 (`git grep` for D3 sub-package imports returns zero) already
cover these files by their literal wording; the spec's prose just under-enumerated them.
`KpiBlock.tsx` uses `d3` for scale/number formatting inside a KPI card, not a full chart —
confirm during implementation whether it needs a Recharts primitive at all or can drop the
`d3` dependency directly (e.g. replace `d3.scaleLinear`-style calls with plain arithmetic
or the existing `parseNum` helper) without introducing a chart component.

**Rationale**: `git grep` is authoritative over the spec's estimate; tasks.md should plan
for 15 conversions, not 13, to avoid a false "done" at 13/13 while 2 files still import
`d3`.

## 5. Resize mechanism: `useWindowSize` already uses `ResizeObserver` — only `BarPlot.tsx` needs fixing

**Decision**: `src/common/utils.ts`'s `useWindowSize` hook (used by 7 of the 15 D3 files:
`AssetAccountsPlot`, `IncomeExpensesPlot`, `MonthDetailedExpensesPiePlot`,
`TravelExpensesDetailedPlot`, `TravelExpensesMonthlyPlot`, `TravelExpensesPiePlot`,
`TravelExpensesPlot`, plus `TransactsPlot.tsx` = 8 files) **already** observes the chart's
own container via `ResizeObserver`, not `window.resize` — doc 14's confirmed finding
("`useWindowSize` hook reacts only to `window.resize` events") is **stale**; the hook was
already fixed, evidenced by spec 004's already-merged commit
`de6197b "Mobile responsiveness US3: container-based chart resizing + tiered margins"`.
The one file that genuinely still uses a window-only listener is `BarPlot.tsx`, via
`src/hooks/useOnWindowResize.ts` (a small Tremor-derived hook that only listens to
`window`'s `resize` event) — this is the file spec Acceptance Scenario US5.1 calls out by
name ("`BarPlot.tsx`'s fixed `h-80` becomes responsive"), and it's also already partially
fixed (`h-64 md:h-80`, not a bare fixed `h-80`) but its resize _mechanism_ is still
window-only.

**Rationale**: don't rebuild the 8 files' already-correct `ResizeObserver` wiring; the
real remaining work is (a) swap `BarPlot.tsx` from `useOnWindowResize` to a container
`ResizeObserver` (reuse `useWindowSize` or extract a ref-based variant that works with
Recharts' `ResponsiveContainer`), then delete `useOnWindowResize.ts` once unused, and
(b) since every D3 file is being rewritten onto Recharts anyway (item 4), each migrated
chart should use Recharts' own `ResponsiveContainer` (which is `ResizeObserver`-backed
internally) rather than carrying `useWindowSize` forward — so `useWindowSize`'s D3-era
callers disappear as a side effect of the Recharts migration, not as separate work.

**Alternatives considered**: patch `useOnWindowResize` itself into a `ResizeObserver`
version — rejected in favor of just using Recharts' built-in `ResponsiveContainer` for the
migrated `BarPlot.tsx`, consistent with every other migrated chart.

## 6. Margin/density scaling: spec 004 already added tiered margins; this spec extends, not originates

**Decision**: the same `de6197b` commit that fixed container-based resize also added
"tiered margins" — confirm the existing tiering logic during Phase 1/implementation and
extend it (not rebuild it) for any narrow-viewport gaps Recharts' own margin/tick-count
props don't already cover natively (Recharts' `XAxis`/`YAxis` `interval` prop and
`tick` render props are the direct replacement for hand-rolled "every 3rd month" tick-
skipping logic).

**Rationale**: doc 14's "not yet audited" framing predates spec 004's actual landed work;
avoid re-doing solved density work under a new name.

## 7. Touch interaction: tap-to-pin, bottom sheet, hit-area sizing, scrubber — one shared primitive, not per-chart

**Decision**: build two new shared primitives once, applied to every migrated chart
rather than duplicated 15 times:

- `useChartScrubber` (`src/hooks/useChartScrubber.ts`): pointer/touch-drag handler over a
  chart's plot area, computing the nearest data index from drag X position and exposing
  `{ activeIndex, isDragging }` for a chart to render its own crosshair/indicator +
  Recharts `Tooltip` at that index.
- `ChartTooltip` (`src/components/charts/ChartTooltip.tsx`): wraps Recharts' `Tooltip`
  content, pinning on tap (persists until dismissed or another point is tapped) and
  switching to a fixed bottom-sheet render on narrow viewports (reuse the existing
  `useIsNarrowViewport` hook from `src/common/utils.ts` for the breakpoint check, matching
  the 768px Tailwind `md` breakpoint already used elsewhere).

Touch hit-area sizing (~44×44px per doc 14 item 4) is handled via Recharts' own `Dot`/
`activeDot` `r`/pointer-events props sized independently of the visible marker radius, not
a new primitive.

**Rationale**: doc 14's phase 6 explicitly calls for building the scrubber "as a shared
hook/component (rather than duplicating the drag logic per chart)... given the 'all
charts' scope"; the same logic applies to tap-to-pin/bottom-sheet tooltip, which every
chart also needs (FR-008/FR-009). Building both alongside each chart's Recharts migration
(not before, not after) avoids hand-building the interaction twice, per doc 14's
sequencing note.

**Alternatives considered**: per-chart bespoke drag handlers (the original, cheaper-
scoped doc 14 recommendation) — superseded by the 2026-08-10 owner decision to apply the
scrubber to every chart; a shared primitive is _cheaper_ than 15 bespoke implementations
of the same interaction, not more expensive, so it's the correct choice even under the
expanded scope.

## 8. `theme-color` meta: new pair, not an edit to an existing tag

**Decision**: `index.html` currently has no `<meta name="theme-color">` tag at all
(confirmed by reading the file) — add two: `<meta name="theme-color" content="..."
media="(prefers-color-scheme: light)">` and the `dark` counterpart, with values matching
the `shark-*` background used at each end (`white`/`#ffffff` light, `shark-900`/`#151719`
or `shark-950`/`#0f1112` dark, matching `index.html`'s existing `body` classes
`bg-white dark:bg-shark-900`).

**Rationale**: spec FR-004 says the meta "becomes" a pair, implying an existing single
tag; the actual starting state is zero tags, which doesn't change the required end state
(a light/dark pair) but does mean this is a pure addition, not a migration of an existing
value.

## 9. TanStack Router/Query keep confirmations (FR-010)

**Decision**: write two short entries in `docs/decisions.md` during this spec's
implementation (not deferred), each a few sentences: TanStack Router — no concrete
problem identified, file-based routing already fits the app's route structure, actively
maintained; TanStack Query — no concrete problem identified, already the app's data-
fetching/caching layer, actively maintained, no simpler built-in alternative given the
app's server-state needs. This satisfies both this spec's FR-010 and closes out spec 003
FR-004/SC-003 per doc 12's phase 3.

**Rationale**: doc 12 phase 1 already scoped this as "a few sentences each... since
there's no open question driving them" — no further research needed, just execution.

## 10. Testing approach: reuse spec 006's infrastructure, don't stand up a new one

**Decision**: `useTheme` gets a Vitest + RTL unit test (mock `matchMedia`, assert
`localStorage` persistence and `.dark` class toggling); each migrated chart keeps or gains
a Storybook story (MSW-backed, per spec 006's shared-handlers pattern) covering at least
one light and one dark rendering; a Playwright e2e test (new, added to spec 006's existing
`e2e/` suite) covers: toggle theme → reload → theme persists; a 375px-viewport chart
render → tap a data point → tooltip pins. `vitest-axe` (already wired per spec 006) covers
new/changed `dark:` combinations for contrast where feasible in jsdom; real-device manual
verification (per spec Assumptions) is the authoritative check for touch/OS-dark-mode
behavior, tracked in `docs/review/19-manual-verification.md`, not substituted by
automated tests.

**Rationale**: spec 006 already built the full test/CI scaffolding this spec needs
(Vitest, RTL, Storybook+MSW, Playwright, `vitest-axe`) — per the constitution's Migration
Workflow and this spec's own sequencing note ("run this spec third, after... 006, so this
lands with test/lint/CI coverage"), 007 should consume that infrastructure, not duplicate
or bypass it.

## 11. Bundle-size impact: expect neutral-to-positive, re-measure rather than assume

**Decision**: don't pre-commit to a new `size-limit` number in this doc — removing `d3`
(a sizeable dependency, currently imported piecemeal across 15 files, meaning tree-shaking
already limits its actual bundled cost) while Recharts (already bundled today for
`BarPlot.tsx`) absorbs the remaining chart-rendering work is expected to be roughly
neutral or a net reduction, but the actual number should be measured with a real
`pnpm build` after the migration and the existing `size-limit` "chart route chunk" budget
(89 KB gzip, set by spec 006) adjusted in the same PR if needed, not guessed here.

**Rationale**: matches spec 006's own methodology ("budgets measured from a real build at
implementation time rather than invented in planning") — this spec should follow the same
discipline rather than inventing a number now.
