# Quickstart: validating Design System, Theming & Charts

Run against a local dev build unless noted. Assumes spec 006's tooling (Vitest,
Playwright, Storybook, `vitest-axe`) is already set up (`pnpm install` already run).

## Prerequisites

```bash
pnpm install
pnpm dev          # http://localhost:5173, or the project's usual dev URL
```

Log in via the guest/demo path (per Constitution Principle III, no real credentials
needed for most of this validation).

## User Story 1 — shadcn primitives render

1. Find any `Button` rendered with no custom `className` (or temporarily render one in
   Storybook: `pnpm storybook`).
2. **Expect**: visible background/foreground styling (not transparent/unstyled).
3. Re-check every other shadcn primitive in `src/components/ui/` (`checkbox`,
   `dropdown-menu`, `slider`) the same way.

## User Story 2 — theme toggle + persistence

1. In OS settings, set dark mode on. Load the app fresh (clear `localStorage` first, or
   use a private window) with no prior visit.
2. **Expect**: app renders dark by default (`resolved === "dark"`, `<html class="dark">`).
3. Use the nav `ThemeToggle` to select "light". **Expect**: immediate re-render to light,
   `dark` class removed from `<html>`.
4. Reload the page. **Expect**: still light (persisted).
5. Select "system", then toggle the OS setting live (no reload). **Expect**: app follows
   the OS change without a reload (`matchMedia` listener working).
6. Open `BarPlot.tsx`'s chart, `AccountsDropdown`, the analysis table, the dropdown menu,
   and any slider. **Expect**: their existing `dark:` classes now visibly activate with
   dark mode on, with zero code changes to those 5 files.

## User Story 3 — dark-mode coverage + one icon library

1. With dark mode on, manually walk every top-level route (summary, analysis, travels,
   login). **Expect**: no illegible light-background/light-text combination anywhere,
   chart gridlines/axis text legible.
2. Check the browser tab / OS theme-color chrome (or inspect `index.html`'s
   `<meta name="theme-color">` tags) in both light and dark. **Expect**: a
   `prefers-color-scheme`-paired pair of tags, matching the active background.
3. Run `git grep -l "lucide-react\|@remixicon/react" src`. **Expect**: zero results.
4. Confirm `components.json`'s `iconLibrary` is `"fontawesome"`.

## User Story 4 — all charts on Recharts

1. Run `git grep -l 'import \* as d3 from "d3"' src`. **Expect**: zero results (except
   inside Recharts' own `node_modules` tree, which `git grep` over `src/` won't match
   anyway).
2. Visually compare each migrated chart against the pre-migration screenshot/behavior
   (Storybook stories, if kept up to date per chart, are the fastest way to do this
   file-by-file during implementation).
3. Run `pnpm knip` or `git grep d3` in `package.json` `dependencies`. **Expect**: `d3` and
   `@types/d3` removed once every consumer is migrated.
4. Confirm `docs/decisions.md` has the TanStack Router and TanStack Query keep-
   confirmation entries (FR-010).

## User Story 5 — chart resize + touch usability

1. Resize the browser window (or, in Storybook, resize the preview pane) across a chart.
   **Expect**: the chart redraws at the new size without a full window resize being
   required (e.g. collapse/expand the sidebar if that changes a chart's container size
   without a window resize event).
2. Set the viewport to 375px wide (DevTools device toolbar, or a real phone). **Expect**:
   axis labels are legible, not overlapping; margins are visibly tighter than desktop;
   `BarPlot.tsx` is no longer a fixed height that clips or leaves excess empty space.
3. With no interaction, confirm each chart's key value (current period total, latest
   point) is visible without hovering.
4. On a touch device (or DevTools touch emulation as a first pass — see step 6), tap a
   data point. **Expect**: a tooltip appears and stays pinned until dismissed or another
   point is tapped; on a narrow viewport it renders as a bottom sheet, not a floating
   tooltip near the tapped point.
5. On a very short-height mobile viewport, confirm the bottom-sheet tooltip doesn't cover
   the tapped data point itself.
6. **Real-device check required** (per Constitution Principle III and this spec's
   Assumptions): repeat steps 2 and 4 on an actual phone, not just DevTools emulation, and
   log the result in `docs/review/19-manual-verification.md` — DevTools touch/media
   emulation does not always match real OS/browser behavior 1:1.

## User Story 6 — scrubber on every chart

1. On each chart (desktop: click-drag; touch: finger-drag) across the plot area.
   **Expect**: a crosshair/vertical indicator tracks the drag position and the pinned
   tooltip's value updates live as you drag.
2. Confirm this works identically on all migrated charts, not just 1-2 — spot-check at
   least one chart from `summary/-plots/`, one from `travels/-components/`, one from
   `analysis/-components/`, and `BarPlot.tsx`.

## Automated checks

```bash
pnpm test              # useTheme unit test, migrated chart component tests, vitest-axe contrast checks
pnpm test:e2e           # Playwright: theme-toggle persistence, 375px chart tap-to-pin
pnpm lint
pnpm build && pnpm size # confirm size-limit chart-route-chunk budget still holds (or was re-measured, per research.md item 11)
```

## Definition of done (per Constitution Principle III)

- [ ] Golden path (login → data loads → charts render) verified in a real browser, light
      and dark.
- [ ] Guest path verified the same way.
- [ ] All six user-story checklists above pass.
- [ ] Real-device touch/dark-mode verification logged in
      `docs/review/19-manual-verification.md`.
- [ ] `docs/decisions.md` updated with the TanStack Router/Query confirmations.
