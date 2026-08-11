---
description: "Task list for spec 007: Design System, Theming & Charts"
---

# Tasks: Design System, Theming & Charts

**Input**: Design documents from `/specs/007-design-system-theming-and-charts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: research.md item 10 decided to reuse spec 006's existing Vitest/RTL/
Playwright/Storybook+MSW/`vitest-axe` infrastructure rather than skip testing or stand up
new tooling — hook unit tests, component tests, Storybook stories, and Playwright e2e
tasks below are first-class, not optional TDD scaffolding for pre-existing behavior.

**Organization**: Tasks are grouped by user story (US1-US6), in spec.md's own numbering
order, **not** strict P1/P2 priority order — the spec's Sequencing note requires theming
(US1-3) to land before the Recharts migration (US4-6) regardless of priority tier, and
US6 (scrubber) is explicitly owner-scheduled last (spec Acceptance Scenario US6.2) even
though it's tier P2 like US3. Per research.md item 7, the shared chart-interaction
primitives (`ChartTooltip`, `useChartScrubber`) are each built once, in the story that
first needs them (US5, US6 respectively), then wired into each of the 15 chart files as a
fast, mechanical per-file task within that same story — this avoids hand-building the
same interaction 15 times while still keeping US4/US5/US6 independently testable and
delivered in the owner-mandated order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- File paths are exact, relative to repo root. Two filenames in this codebase have a
  literal trailing space before `.tsx` (`MonthDetailedExpensesPiePlot .tsx`,
  `TravelExpensesPiePlot .tsx`) — preserved as-is below, not a typo.

## Path Conventions

Single existing project — `src/` at repository root (see `plan.md` Project Structure).

---

## Phase 1: Setup

**Purpose**: Establish a pre-change baseline so regressions are attributable to this spec

- [x] T001 Manually verify the existing golden path (login → data loads → charts render)
      and the guest login path, on desktop, per Constitution Principle III, before making
      any change — this is the regression baseline for the Polish-phase re-check (T080).
      Capture a `pnpm build` + `pnpm size` baseline (main bundle + `CartesianChart-*`
      chart-route-chunk gzip sizes) to compare against post-migration numbers (T043,
      research.md item 11). Confirm and note today's known-broken starting state: shadcn
      `Button` renders unstyled, and no dark-mode toggle exists anywhere in the UI.
      **Done**: `pnpm lint` clean (0 errors, 7 pre-existing warnings), `pnpm build`
      succeeds (main `main-CJgQDsfZ.js` 317.83 kB gzip, `CartesianChart-KZbsUxuM.js`
      80.28 kB gzip — `pnpm size` reports 317.3 kB / 80.15 kB against the 350 kB / 89 kB
      budgets, both passing). No interactive browser available in this session (same
      constraint noted in spec 006's T001) — interactive golden-path/guest-path
      click-through in both light and dark is deferred to T079/T080, which the owner
      should also do manually in a real browser.

---

## Phase 2: Foundational (Blocking Prerequisites)

No cross-story blocking prerequisites beyond the phase ordering itself: Phases 3-5 (US1-
US3, theming) MUST complete before Phases 6-8 (US4-US6, charts) begin, per spec.md's
Sequencing note — chart color/gridline theming would otherwise be redone post-migration.
Within Phases 6-8, each per-file task depends on that same file's task in the prior chart
phase (noted individually below), not on a separate blocking phase. Proceed directly to
Phase 3.

---

## Phase 3: User Story 1 - shadcn's design-system layer is wired up and actually renders (Priority: P1) 🎯 MVP

**Goal**: `--background`/`--primary`/etc. CSS custom properties exist for `:root` and
`.dark`, mapped onto the `shark-*` palette, so shadcn primitives render their intended
styling with no overrides.

**Independent Test**: render a shadcn `Button` with no `className` overrides; confirm it
now renders its intended styling. (No theme toggle exists yet — verify the `.dark` state
by manually adding `class="dark"` to `<html>` in devtools.)

### Implementation for User Story 1

- [x] T002 [P] [US1] Audit exactly which CSS custom properties are referenced across
      `src/components/ui/button.tsx`, `checkbox.tsx`, `dropdown-menu.tsx`, `slider.tsx`
      via `git grep -n -- "--background\|--primary\|--foreground\|--secondary\|--accent\|--destructive\|--border\|--input\|--ring\|--muted" src/components/ui`;
      finalize the exact token set against `data-model.md`'s CSS Custom Property Token
      Map (some listed tokens may be unused, some in-use tokens may be missing from the
      table).
      **Done**: in-use set is `--background`, `--primary`/`-foreground`,
      `--secondary`/`-foreground`, `--destructive`/`-foreground`, `--accent`/`-foreground`,
      `--muted`, `--border`, `--input`, `--ring`. `--popover`/`--popover-foreground` are
      also referenced (`dropdown-menu.tsx` content wrapper: `bg-popover`,
      `text-popover-foreground`) but were missing from data-model.md's table — added.
      `--foreground` and `--muted-foreground` aren't referenced by a `ui/` component today
      but are kept (data-model.md lists them, and a base `body { @apply text-foreground }`
      layer is being added per standard shadcn convention). `--card`/`--card-foreground`
      are dropped — no `card.tsx` exists in `src/components/ui/`.
- [x] T003 [US1] Define light (`:root`) values for the audited token set as Tailwind v4
      `@theme` custom properties in `src/index.css`, sourced from the existing `shark-*`
      scale per `data-model.md` (depends on T002).
      **Done**: added a `@theme` block mapping `--color-{token}: var(--token)` for each
      shadcn token (this is the standard shadcn Tailwind v4 wiring pattern — plain runtime
      vars in `:root`/`.dark`, aliased into `@theme` so Tailwind generates the
      `bg-primary`/`text-primary-foreground`/etc. utilities), plus a `:root` block with
      light values sourced from `shark-*` per data-model.md's table (`--destructive` uses
      Tailwind's built-in `--color-red-600`, matching the `red-500`/`red-600` already used
      ad hoc across the app for expense/error styling). Also added the standard shadcn
      `@layer base { * { @apply border-border; } body { @apply bg-background
text-foreground; } }` block, since `dropdown-menu.tsx`'s bare `border` utility and
      shadcn's own convention both expect it (finding beyond T002's literal scope, noted
      here rather than opening a new task) — `index.html`'s body still carries its own
      hardcoded `bg-white dark:bg-shark-900` classes which currently win over this base
      layer's `bg-background`; left as-is for T016/T017's sweep to reconcile, not fixed
      here.
- [x] T004 [US1] Define dark (`.dark`) override values for the same token set in
      `src/index.css` (depends on T002; pairs with T003 in the same change).
      **Done**: `.dark` block added in the same edit as T003, values per data-model.md's
      table (`--destructive` uses `--color-red-500` for slightly brighter contrast on dark
      backgrounds). `pnpm build` succeeds with the new CSS (41.36 kB / 8.42 kB gzip CSS
      output, up from an unmeasured pre-token baseline since `:root` had no tokens before).
- [x] T005 [US1] Manually verify in a browser: with no `class="dark"`, `Button`/
      `checkbox`/`dropdown-menu`/`slider` render intended light styling; with
      `class="dark"` added manually via devtools, they render intended dark styling
      (spec Independent Test; depends on T003, T004).
      **Done**: verified via a temporary Storybook story (rendered `Button` (all 5
      variants), `Checkbox`, `DropdownMenu`, `Slider` together, wrapped in a `.dark` div
      for the dark case), driven headlessly with Playwright (browsers already installed
      locally) — computed `background-color`/`color` confirmed to flip between light and
      dark (e.g. panel bg `rgb(255,255,255)` → `rgb(21,23,25)`, text `rgb(21,23,25)` →
      `rgb(119,132,144)`), plus a visual screenshot of both states. The story file was
      temporary and has been deleted — it wasn't requested as a permanent addition, and
      T045/T046 in Phase 7 add dedicated component tests/stories for this spec's own
      new components instead.

      **Critical pre-existing bug found and fixed while verifying**: `.dark`-class-based
      dark mode did not actually work at all before this fix, for any file in the app.
      `tailwind.config.ts` sets `darkMode: "class"`, but Tailwind v4's CSS-first build
      (`@import "tailwindcss"` in `src/index.css`, driven by the `@tailwindcss/vite`
      plugin) never loads that config file — no `@config` directive references it, and
      `vite.config.ts`'s `tailwindcss()` plugin call takes no config path either. Every
      existing `dark:` utility class in the app (the 5 files referenced in spec
      Acceptance Scenario US2.4, e.g. `BarPlot.tsx`, `AccountsDropdown.tsx`) was
      therefore compiling to `@media (prefers-color-scheme: dark)`, not a `.dark`
      class selector — so `useTheme`'s planned `.dark`-class toggle on
      `document.documentElement` (per `contracts/use-theme-hook-contract.md` rule 3)
      would have had **zero effect** on any of them once built (US2 would have silently
      failed). Fixed by adding `@custom-variant dark (&:where(.dark, .dark *));` to
      `src/index.css` (Tailwind v4's own mechanism for class-based dark mode) — confirmed
      via the compiled CSS that `dark:*` utilities now emit `.dark &` selectors instead of
      a media query. `tailwind.config.ts`'s `darkMode` field is now fully inert (was
      already inert) — left in place since `components.json` still points shadcn's CLI at
      it for future component scaffolding, but it drives none of this project's own
      build. This corrects docs 13 and 15's "confirmed... `darkMode: 'class'`
      configured" claims, which checked the config file's contents but not whether it was
      actually wired into the build — flagged for T080's doc-status update.

      **Second bug found and fixed in the same pass**: the token-alias block (T003/T004)
      initially used a plain `@theme { --color-background: var(--background); ... }`.
      Tailwind v4 pre-resolves plain `@theme` values once against `:root`, so every
      `bg-background`/`text-primary`/etc. utility was permanently pinned to the light
      value regardless of `.dark` — confirmed by computed-style inspection showing
      `--color-background` correctly following `.dark` overrides at the CSS-variable
      level, but `background-color` on `bg-background` elements staying white. Fixed by
      moving the alias block into `@theme inline { ... }`, which makes Tailwind emit
      `background-color: var(--background)` directly in each utility instead of
      indirecting through a value pre-resolved at `:root` — re-verified via the same
      Storybook/Playwright check above, now flipping correctly.

- [x] T006 [P] [US1] Audit for any other shadcn primitive beyond `Button` silently
      relying on an undefined CSS var (spec Acceptance Scenario US1.2):
      `git grep -rn "bg-\(background\|primary\|secondary\|accent\|muted\|destructive\)\|text-.*-foreground" src/components/ui`;
      fix any found against the T003/T004 token set.
      **Done**: re-ran the grep including `bg-popover`/`text-popover-foreground`/
      `border-input`/`ring-ring` patterns (T002's superset). Every match across
      `button.tsx`, `checkbox.tsx`, `dropdown-menu.tsx`, `slider.tsx` resolves to a token
      already defined in `src/index.css`'s `:root`/`.dark` blocks — no undefined var
      remains.
- [x] T007 [P] [US1] Sweep for inline `style={{` usage and raw hex/rgb color literals
      bypassing `shark-*` (spec Edge Cases, doc 13 phase 4): `git grep -n "style={{" src`
      and `git grep -nE "#[0-9a-fA-F]{3,8}\b" src`; list call sites to migrate.
      **Done**: `style={{` hits are all non-color (layout/animation) — `TreeList.tsx`
      (`originX`), `BarPlot.tsx` (`paddingLeft`, `textAnchor`), `AccountsDropdown.tsx`
      (`paddingLeft`) — out of scope for token migration, left as-is. Hex-literal hits,
      categorized: (1) `BarLoader.tsx`'s `color = "#36d7b7"` default, redundantly
      re-passed as an explicit prop at all 11 call sites (`__root.tsx`,
      `analysis/index.tsx`, `expenses/index.tsx`, and 8 chart-loading-state call sites) —
      dead duplication, not really "bypassing" a token since no shadcn/`shark-*` token
      represents a loading-spinner brand accent; (2) `home.tsx`'s landing-page hex values
      (`#38bdf8`, `#202427`, `#778490`, `#fff`) inside Recharts SVG props (`stopColor`,
      `contentStyle`, etc., which need real color values, not Tailwind classes) — these
      exactly match existing `sky-400`/`shark-800`/`shark-50`/white values already used as
      Tailwind classes elsewhere in the same file; (3) `BarPlot.tsx`'s Recharts
      `cursor={{ fill: "#d1d5db" }}` — a hardcoded gray not sourced from `shark-*`; (4)
      `AssetAccountsPlot.tsx`'s `fill={"#00000000"}` (fully-transparent circle fill) — this
      file is fully rewritten to Recharts in US4 (T028), so left untouched here rather
      than edited twice.
- [x] T008 [US1] Migrate the call sites found in T007 to `shark-*`/CSS-var tokens
      (depends on T007; exact file list determined by the audit).
      **Done**: (1) stripped the redundant `color="#36d7b7"` prop from all 11 `BarLoader`
      call sites (the default already provides it — pure dead-code removal, not a token
      change); `BarLoader.tsx`'s own default hex is intentionally left as a standalone
      component-local accent, not routed through a new token (no spec-listed token
      represents it, and introducing one is out of scope). (2) `home.tsx`'s 4 SVG-prop hex
      values replaced with `var(--color-sky-400)`/`var(--color-shark-800)`/
      `var(--color-shark-50)`/`white` (Tailwind v4 default-palette and `shark-*` vars,
      both already real custom properties post-T003) — no visual change, since the values
      are identical, but now traceable to the token system. (3) `BarPlot.tsx`'s cursor
      fill changed to `var(--color-shark-400)` (light-mode-reasonable neutral; full
      light/dark-aware chart coloring via `useTheme().resolved` is US5's
      `contracts/chart-component-contract.md` Theming section, not re-done here). (4)
      `AssetAccountsPlot.tsx` deliberately left for its US4 rewrite (T028). `pnpm lint`
      (0 errors, same 7 pre-existing warnings) and `pnpm build` both pass after these
      changes.

**Checkpoint**: shadcn primitives are the real source of truth for interactive elements,
in both light and dark CSS states (toggle mechanism still pending — US2).

---

## Phase 4: User Story 2 - A user can switch between light, dark, and system theme, and it persists (Priority: P1)

**Goal**: A visible nav toggle switches themes; the choice persists via `localStorage`;
with no stored preference the app follows OS `prefers-color-scheme` (default `system`).

**Independent Test**: with no stored preference, load the app with OS dark mode on;
confirm it renders dark by default. Toggle to light; reload; confirm it stays light.

### Implementation for User Story 2

- [x] T009 [US2] Create `useTheme` hook in `src/hooks/useTheme.ts` per
      `contracts/use-theme-hook-contract.md`: `preference`/`resolved`/`setPreference`,
      backed by `usePersistentState("theme", "system")`, a `matchMedia` `"change"`
      listener active only while `preference === "system"`, toggling the `dark` class on
      `document.documentElement`.
      **Done**: matches the contract's 5 numbered rules exactly. Note on contract rule 1's
      "if absent or unparseable, preference is system": `usePersistentState` itself has no
      corrupted-JSON guard (a foreign non-JSON value under the key would throw from
      `JSON.parse` on mount) — this is a pre-existing limitation of the shared hook, not
      special-cased here, consistent with every other `usePersistentState` consumer in the
      app (none of them guard against this either); fixing it would be a
      `usePersistentState`-level change affecting all consumers, out of this spec's scope.
- [x] T010 [P] [US2] Unit test `useTheme` in `src/hooks/useTheme.test.ts`: mock
      `window.matchMedia`, assert `localStorage` persistence, `.dark` class add/remove,
      and live update on a simulated system-preference change (depends on T009).
      **Done**: 4 tests, all passing — system default resolves from `matchMedia`;
      explicit `setPreference` persists (`localStorage` key
      `use-persistent-state-theme`) and toggles the `.dark` class; live update on a
      simulated system-preference change while on `system`; listener count drops to 0
      once preference leaves `system` (contract rule 4).
- [x] T011 [US2] Create `ThemeToggle` component in `src/components/ThemeToggle.tsx`
      (light/dark/system control calling `useTheme().setPreference`; selected state
      reflects `preference`, not `resolved`) (depends on T009).
      **Done**: Built as a `DropdownMenu` trigger (FontAwesome sun/moon/desktop icon
      matching the currently-active `preference`) opening a `DropdownMenuRadioGroup` of
      the three `ThemePreference` values, `value={preference}` /
      `onValueChange={setPreference}` — so the checked radio item reflects `preference`
      directly, never `resolved`. Styled to match `SideBar.tsx`'s existing icon-button
      (`h-10 w-10 rounded-md hover:bg-shark-800`) and `AccountMenu.tsx`'s dropdown content
      classes (`bg-shark-600 border-shark-600 text-white`) for visual consistency with
      existing nav chrome. `tsc --noEmit` and `pnpm lint` both clean (same pre-existing 7
      warnings, 0 errors).
      **Regression caught & fixed**: wiring `ThemeToggle`/`useTheme` into `SideBar.tsx`
      (T013) broke 5 previously-passing Vitest tests (`SideBar.test.tsx` x4,
      `login/-index.test.tsx` x1) with `window.matchMedia is not a function` — jsdom
      doesn't implement `matchMedia`, and `useTheme` now calls it unconditionally on
      every render of any component that mounts the app-wide `SideBar`. Fixed at the
      root cause by adding a `window.matchMedia` polyfill to `src/test/setup.ts`
      (defaults to no-match/light; `useTheme.test.ts` already installs its own
      stateful mock per-test, which still overrides this default fine). Full
      `pnpm test` now passes 37/37 across all 11 files.
- [x] T012 [P] [US2] Storybook story for `ThemeToggle` in
      `src/components/ThemeToggle.stories.tsx` covering all three preference states
      (depends on T011).
      **Done**: Three stories (`Light`/`Dark`/`System`), each seeding
      `localStorage["use-persistent-state-theme"]` with its preference inside a
      per-story decorator (runs synchronously before the child mounts, so
      `usePersistentState`'s lazy `useState` initializer picks it up) and keying the
      `<Story>` element by preference to force a remount instead of reusing stale hook
      state across story switches. Verified live via headless Playwright against the
      Storybook dev server (`http://localhost:6006/iframe.html?id=components-themetoggle--<pref>`):
      for each of the 3 stories, opened the dropdown and asserted via
      `[role='menuitemradio']` `aria-checked` that exactly the matching option is
      checked — confirms the contract's "selected state reflects `preference`" rule
      end-to-end, not just by code inspection.
- [x] T013 [US2] Wire `ThemeToggle` into the nav in `src/components/SideBar.tsx` (exact
      placement is a UI decision, not a technical one) (depends on T011).
      **Done**: Added a bordered footer row (`border-t border-shark-800 p-2`) below
      `NavList` inside the `<aside>`, containing `<ThemeToggle isCollapsed={isCollapsed} />`
      — mirrors the existing collapse-button's sizing/hover styling and responds to the
      same `isCollapsed` prop the rest of the sidebar already threads through (used here
      only to flip the dropdown's `align` so it doesn't clip off-screen when the rail is
      collapsed to `w-14`).
- [x] T014 [US2] Manually verify the 5 already-`dark:`-classed files activate with zero
      further code changes once the toggle works (spec Acceptance Scenario US2.4):
      `src/components/charts/BarPlot.tsx`, `src/components/features/AccountsDropdown.tsx`,
      `src/routes/analysis/-components/TransactsTable.tsx`,
      `src/components/ui/dropdown-menu.tsx`, `src/components/ui/slider.tsx` (depends on
      T013).
      **Done**: `git grep -n "dark:"` confirms these are exactly the 5 non-`ThemeToggle`
      files using `dark:` classes in `src/` (`ThemeToggle.tsx` itself only matches on the
      unrelated object key `dark: faMoon`). For `dropdown-menu.tsx` and `slider.tsx`
      (both self-contained, no app routing/context dependency) built a throwaway
      `src/components/ui/_verify_dark.stories.tsx` rendering an unstyled
      `DropdownMenu`/`DropdownMenuContent`/`DropdownMenuItem` and a bare `Slider`, one
      story with no `.dark` class and one with `document.documentElement.classList.add("dark")`
      in its decorator; headless Playwright confirmed computed
      `background-color`/`color` flip correctly (dropdown: `rgb(255,255,255)` →
      `rgb(32,36,39)`/shark-800; slider track: `rgb(112,125,137)` → `rgb(32,36,39)`) with
      zero component changes — then deleted the throwaway story. For
      `AccountsDropdown.tsx` (needs `SummaryPageContext`), `TransactsTable.tsx` (needs a
      live match on the `/analysis/` route for `useColumnFilters`' `getRouteApi`), and
      `BarPlot.tsx` (many required data/callback props) — mounting each standalone would
      require building non-trivial fixture scaffolding whose only new information is
      "does this exact file also use plain, statically-named Tailwind `dark:` utility
      classes," which `git grep` already answered: every `dark:` class in all three files
      is a static string literal inside `className`/`cn()` (no dynamic/interpolated class
      names, which is the one thing that could make a static class invisible to
      Tailwind's build-time scan). Given the mechanism itself is now proven live via
      `dropdown-menu.tsx`/`slider.tsx` above (plus T005's Button/Checkbox/Slider proof),
      the remaining 3 files' `dark:` classes are the same construct and will activate
      identically — documenting this as a code-inspection-based verification rather than
      a full live mount, per the constitution's Cost-Consciousness principle.
- [x] T015 [P] [US2] Playwright e2e test in `e2e/`: toggle theme → reload → theme
      persists; fresh session with OS dark mode on renders dark by default (depends on
      T013).
      **Done**: Added `e2e/theme-persistence.spec.ts` with two tests: (1) guest-login →
      open `ThemeToggle` → click the "Dark" `menuitemradio` → assert `<html>` gains
      `.dark` → `page.reload()` → assert `.dark` still present (localStorage
      round-trip); (2) a fresh `browser.newContext({ colorScheme: "dark" })` (no prior
      localStorage) → guest-login → assert `<html>` has `.dark` without ever touching
      the toggle, proving the `system` default resolves from the OS preference. Follows
      the existing `guestLogin` helper/`menuitemradio` role query pattern used by
      `nav-stability.spec.ts`. `pnpm exec playwright test --list` confirms both tests are
      discovered and syntactically valid; actually _running_ them requires
      `playwright.config.ts`'s `webServer` (`vercel dev`), and the Vercel CLI is still
      not installed in this environment (same constraint hit in T005/spec 006) — so this
      is written and statically verified but not executed locally; it will run in CI.
      files now actually re-theme.

---

## Phase 5: User Story 3 - Dark mode covers the whole app, and one icon library replaces three (Priority: P2)

**Goal**: every top-level route is dark-mode-legible (charts prioritized), the
`theme-color` meta becomes a light/dark pair, and `lucide-react`/`@remixicon/react` are
fully replaced by FontAwesome.

**Independent Test**: toggle dark mode and manually walk every top-level route; confirm
no hardcoded-light element is illegible. `git grep` for `lucide-react`/`@remixicon/react`
returns zero results.

### Implementation for User Story 3 — dark-mode coverage sweep

- [x] T016 [US3] Manually walk every top-level route (summary, analysis, travels, login)
      with dark mode on; list every illegible hardcoded-light background/text
      combination, prioritizing D3/Recharts chart files per spec's explicit priority
      (depends on T013).
      **Done**: audited via systematic `git grep` across `src` for
      `text-white`/`text-shark-50`/`bg-white`/`text-black`/etc, then read every match's
      surrounding markup. **Major finding**: the spec's premise ("Only 5 files have
      `dark:` styling today") undersold the app's actual baseline — the overwhelming
      majority of the UI is hardcoded dark by design (`bg-shark-800`/`bg-shark-900`
      panels + `text-white`), and these are self-contained (own explicit background) so
      they stay legible under both page themes regardless of the `.dark` class — not
      bugs. The real bug class is narrower: `text-white`/near-white text with **no
      background of its own**, sitting directly on the plain `<body>`
      (`bg-white dark:bg-shark-900`) — invisible (or low-contrast) in light mode.
      Confirmed bugs list (fixed in T017): `src/components/charts/XAxis.tsx`,
      `src/components/charts/YAxis.tsx` (D3 axis text/gridlines, transparent chart
      backdrop), `src/components/AccountMenu.tsx` ("Log In" link), `src/layout/
ErrorPage.tsx` and `src/layout/NotFoundPage.tsx` (root text + their `bg-shark-800`
      button/link, which itself needed forcing back to explicit white since it's a
      permanently-dark pill), `src/routes/analysis/index.tsx` ("Lista de filtros" `h2`),
      `src/routes/analysis/-components/FilterList.tsx` (`SearchList` item text),
      `src/routes/analysis/-components/TransactsTable.tsx` (root `<table>` text,
      pagination-controls text, plus its `bg-shark-800` pagination buttons/input/select,
      which — like ErrorPage/NotFoundPage — needed forcing back to explicit white since
      their background never changes with theme), `src/components/Footer.tsx`
      (near-white `text-shark-50`), `src/routes/expenses/index.tsx` (table header +
      `TreeList` className) and `src/components/TreeList.tsx` itself (its sticky
      `bg-shark-900` category column and `hover:bg-shark-700` rows are always-dark, so
      fixing the ancestor's text color to be theme-reactive required adding explicit
      `text-white`/`hover:text-white` back onto those specific always-dark elements to
      avoid a new light-mode regression). Confirmed non-bugs (no fix needed, all
      self-contained dark panels): `login/index.tsx`, `Tooltip.tsx` (also slated for
      deletion in US4), `KpiCard.tsx`, `DropDownForm.tsx`, `PeriodicityTabs.tsx`,
      `ErrorModal.tsx`, `ThemeToggle.tsx`/`SideBar.tsx`/`AccountMenu.tsx`'s authenticated
      nav chrome, and `home.tsx` (intentionally always-dark marketing page).
- [x] T017 [US3] Fix the combinations found in T016 by adding `dark:` variants sourced
      from the T003/T004 token set (depends on T016).
      **Done**: rather than hand-pairing every fix with a literal `dark:` class, used the
      semantic shadcn tokens wired up in US1 wherever the element sits on the plain page
      body — `text-foreground` (resolves to `shark-900` in light, `shark-50` in dark) and
      `text-muted-foreground` (`shark-500`/`shark-300`) — per files listed in T016's
      done-note, since that's exactly what those tokens exist for and keeps the fix
      idiomatic with the rest of the theming layer. For the handful of elements whose
      _own_ background is permanently dark regardless of page theme (XAxis/YAxis text
      stayed off this list — their container is transparent, not self-contained — but
      TreeList's sticky column, ErrorPage/NotFoundPage's button, and TransactsTable's
      pagination pills all qualify), added explicit `text-white` (not a `dark:` pair,
      since these never need to flip) to prevent the ancestor's new theme-reactive color
      from regressing them to illegible in light mode. Also swapped
      `TransactsTable.tsx`'s unpaired literal `text-gray-400` instances to
      `text-muted-foreground` while already editing that file for the same underlying
      reason (low-contrast in light mode). Verified: `pnpm lint` (0 errors, same 7
      pre-existing warnings), `pnpm exec tsc --noEmit` (clean), `pnpm test -- --run`
      (37/37 passing), `pnpm build` (succeeds, same pre-existing chunk-size warning). Live
      browser verification against these specific routes was not run (same `vercel dev`
      / Vercel-CLI-not-installed constraint as T005/T015) — reasoning was cross-checked
      statically per element (own background vs. inherited color) instead, consistent
      with the constitution's Cost-Consciousness principle.
- [x] T018 [P] [US3] Add a light/dark `theme-color` meta pair to `index.html` (research.md
      item 8): two `<meta name="theme-color" media="(prefers-color-scheme: ...)">` tags
      matching the `bg-white`/`dark:bg-shark-900` values already on `<body>` (depends on
      T004).
      **Done**: added both tags to `index.html`'s `<head>` — `#ffffff` for
      `(prefers-color-scheme: light)`, `#151719` (confirmed exact hex of
      `--color-shark-900` in `src/index.css`) for `(prefers-color-scheme: dark)` —
      matching `<body>`'s existing `bg-white dark:bg-shark-900`. Per research.md item 8
      these are OS-media-query-driven (browser chrome color), not tied to the app's
      explicit light/dark/system `preference` toggle — a known, accepted limitation of
      the `theme-color` meta mechanism itself. `pnpm build` succeeds.
- [x] T019 [P] [US3] Check every `dark:` class added in T017 for WCAG AA contrast in both
      variants (spec Edge Cases), using `vitest-axe`/`@axe-core/react` (from spec 006)
      (depends on T017).
      **Done**: probed `vitest-axe`'s `color-contrast` rule in jsdom first (deliberately
      low-contrast fixture, `#f5f5f5` text on `#ffffff`) — it reports `incomplete`, never
      a violation, because jsdom has no layout/paint engine to compute rendered contrast;
      confirmed this makes it structurally incapable of catching contrast regressions
      regardless of how many component tests reference it, so writing more `axe()` calls
      would be a false-confidence no-op, not real coverage. Computed WCAG relative-luminance
      contrast ratios directly (per-spec formula) from the actual resolved hex values for
      every `--*-foreground`/`--*` token pair in `src/index.css` (T017's fixes route
      through this token layer, not raw `dark:` literals, so this covers T017 plus the
      rest of US1's token set it depends on) against their real call sites (`grep` for
      each `bg-*`/`text-*-foreground` combination actually used together in `src/`, not
      just the tokens in isolation). Found 6 pairs below 4.5:1 (normal text) that are used
      as real body/button/link text, not just large/decorative text: dark
      `secondary-foreground`/`secondary` (2.59:1 — SideBar nav text, DropDownForm,
      KpiCard, login panel), dark `accent-foreground`/`accent` (3.47:1 — dropdown-menu/
      button hover-focus text), dark `primary-foreground`/`primary` incl. the `text-primary`
      link variant (3.14:1 / 2.98:1 — login submit button, `Button` link variant), light
      `muted-foreground`/`muted` (4.34:1 — PeriodicityTabs inactive tab text), light
      `brand`/`background` (3.91:1 — SideBar active nav, home page icons), dark
      `destructive-foreground`/`destructive` (3.76:1 — `Button` destructive variant).
      Fixed by adjusting the token values in `src/index.css` (existing Tailwind palette
      shades only, no new custom colors): `--muted-foreground` slate-500→slate-600,
      `--brand` sky-600→sky-700 (`:root`); `--secondary-foreground` shark-300→gray-400,
      `--primary` shark-300→shark-50, `--accent-foreground` shark-50→white,
      `--destructive` red-500→red-600 (`.dark`). Re-verified all 8 affected pairs now
      clear 4.5:1 (4.70–13.28:1). `pnpm lint` (0 errors), `pnpm build`, `pnpm test`
      (37/37) all clean after the change. Live rendered verification still pending the
      same `vercel dev`/Vercel-CLI constraint as T015/T017 — tracked in
      `docs/review/19-manual-verification.md`.

### Implementation for User Story 3 — icon consolidation

- [x] T020 [P] [US3] Swap `lucide-react`'s `Check` for FontAwesome `faCheck` in
      `src/components/ui/checkbox.tsx`.
      **Done**: straight swap, same `className="h-4 w-4"` sizing preserved.
- [x] T021 [P] [US3] Swap `lucide-react`'s `Check`/`ChevronRight`/`Circle` for FontAwesome
      `faCheck`/`faChevronRight`/`faCircle` in `src/components/ui/dropdown-menu.tsx`.
      **Done**: all three swapped 1:1 at their existing call sites (`SubTrigger`'s
      trailing chevron, `CheckboxItem`'s indicator check, `RadioItem`'s indicator dot).
      Dropped the old `Circle`'s `fill-current` class — FontAwesome's `faCircle` (solid
      style) is filled by default via `currentColor`, so it wasn't needed.
- [x] T022 [P] [US3] Swap `@remixicon/react`'s `RiArrowLeftSLine`/`RiArrowRightSLine` for
      FontAwesome `faChevronLeft`/`faChevronRight` in
      `src/components/charts/BarPlot.tsx`.
      **Done**: Remix icon components were passed as `React.ElementType` and
      self-rendered (`<Icon className=... />`); FontAwesome icons are data objects
      (`IconDefinition`) consumed by a shared `<FontAwesomeIcon icon={...} />` renderer,
      not renderable the same way. Changed `ScrollButtonProps.icon`'s type from
      `React.ElementType` to `IconDefinition` and its render from `<Icon .../>` to
      `<FontAwesomeIcon icon={icon} .../>`, then passed `faChevronLeft`/`faChevronRight`
      at the two call sites.
- [x] T023 [US3] Remove `lucide-react` and `@remixicon/react` from `package.json`
      `dependencies` (depends on T020, T021, T022); confirm `components.json`'s
      `iconLibrary` field already reads `"fontawesome"` (research.md item 3 — verify
      only, no edit expected).
      **Done**: both removed from `package.json`, `pnpm install` re-run (lockfile
      updated, no unrelated changes). `components.json`'s `iconLibrary` confirmed already
      `"fontawesome"` — no edit needed.
- [x] T024 [P] [US3] Verify `git grep -rl "lucide-react\|@remixicon/react" src` returns
      zero results (spec SC-002) (depends on T023).
      **Done**: confirmed zero results. Also re-ran `tsc --noEmit` (clean), `pnpm lint`
      (0 errors, same 7 pre-existing warnings — fixed 4 new `no-empty-function` errors
      introduced by T011's `matchMedia` test polyfill along the way, see T011's
      done-note), `pnpm test` (37/37 passing), and `pnpm build` (succeeds, same
      pre-existing chunk-size warning). Spot-verified the icon swaps render correctly via
      headless Playwright against the `ThemeToggle` Storybook story: opening the dropdown
      shows real FontAwesome `sun`/`moon`/`desktop`/`circle` SVGs
      (`svg[data-icon]` attributes), screenshot confirmed visually correct.

**Checkpoint**: theming phase (US1-3) complete — the Recharts migration (US4-6) may now
begin per the Sequencing note.

---

## Phase 6: User Story 4 - All charts render through one charting library (Priority: P1)

**Goal**: all 15 D3-importing files (research.md item 4's corrected count — 4 more than
the spec's "~13" estimate) migrate to Recharts; `d3` and its types are removed from
`package.json`.

**Independent Test**: `git grep` for direct `d3-*` imports outside Recharts' own
dependency tree returns zero results; every chart renders via Recharts primitives.

### Implementation for User Story 4 — prep

- [x] T025 [US4] Re-confirm the D3 file inventory is still accurate:
      `git grep -l 'import \* as d3 from "d3"' src` (expect the 15 files listed in
      `data-model.md`'s Chart Migration Inventory).
      **Done**: confirmed exactly 15 matches, identical to `data-model.md`'s inventory
      (including the two trailing-space filenames, preserved as-is).
- [x] T026 [P] [US4] Write the TanStack Router keep-confirmation entry in
      `docs/decisions.md` (FR-010, research.md item 9).
      **Done**: added under "Dependency keep: TanStack Router" in `docs/decisions.md`.
- [x] T027 [P] [US4] Write the TanStack Query keep-confirmation entry in
      `docs/decisions.md` (FR-010, research.md item 9).
      **Done**: added under "Dependency keep: TanStack Query" in `docs/decisions.md`.

### Implementation for User Story 4 — per-file migration to Recharts

- [x] T028 [P] [US4] Migrate `src/routes/summary/-plots/AssetAccountsPlot.tsx` from D3 to
      Recharts (`ResponsiveContainer` + Line/AreaChart), preserving current data/metrics
      (spec Acceptance Scenario US4.1).
      **Done**: replaced the manual `<svg>`+D3-scale/line/circle-hit-target implementation
      with `ResponsiveContainer` + `LineChart`, one `<Line>` per account
      (`getRandomColor(accountId)` stroke, unchanged), long-format query data pivoted to
      one row per date via a `useMemo`. Recharts' own `XAxis`/`YAxis`/`Tooltip` used
      (shared D3 `XAxis`/`YAxis`/`Tooltip`/`tooltipFuncs` components dropped for this
      file). Tap-to-pin/always-visible-key-value/scrubber wiring deferred to US5/US6 per
      tasks.md's phase separation (contract's (d)/(e) requirements land there, not here).
- [x] T029 [P] [US4] Migrate `src/routes/summary/-plots/DetailedExpensesBarPlot.tsx` from
      D3 to a Recharts `BarChart`.
      **Done**: this file's chart rendering already went through the existing Recharts
      `BarChart` wrapper (`src/components/charts/BarPlot.tsx`, not one of the 15 D3
      files); its only `d3` usage was data aggregation (`d3.rollup`/`d3.sum`/
      `d3.flatRollup`/`d3.group` in `collapseMinorAccounts`/`pivotData`). Replaced with
      new plain-JS equivalents in `src/common/aggregate.ts` (`rollup`/`sum`/
      `flatRollup`/`groupBy`), same insertion-order/grouping semantics, zero behavior
      change.
- [x] T030 [P] [US4] Migrate `src/routes/summary/-plots/DetailedIncomeBarPlot.tsx` from D3
      to a Recharts `BarChart`.
      **Done**: same pattern as T029 — chart already Recharts via `BarPlot.tsx`; swapped
      `d3.rollup`/`d3.sum`/`d3.group` in `pivotData` for `src/common/aggregate.ts`.
- [x] T031 [P] [US4] Migrate `src/routes/summary/-plots/IncomeExpensesPlot.tsx` from D3 to
      Recharts.
      **Done**: replaced D3 `<svg>` (rects + two lines + custom tooltip) with a Recharts
      `ComposedChart` — `<Bar dataKey="netAbs">` with per-bar `<Cell>` colored by
      sign(net) (green/red, same `getPropertyValue` color source), plus `<Line>` for
      income and expenses. Custom `Tooltip` content component reproduces the
      income/expenses/net readout.
- [x] T032 [P] [US4] Migrate `src/routes/summary/-plots/MonthDetailedExpensesPiePlot .tsx`
      from D3 to a Recharts `PieChart`.
      **Done**: replaced D3 `pie()`/`arc()` donut with Recharts `<Pie>`
      (`innerRadius`/`outerRadius` percentages, `paddingAngle`), one `<Cell>` per account
      colored via the existing `getRandomColor`/`getDefaultColor`/hide-account-gray
      logic; click-to-hide-account preserved via `onClick` on each `<Cell>`. Centered
      month/total label kept as the pre-existing absolutely-positioned overlay div
      (unchanged pattern, independent of the SVG). Filename's trailing space preserved.
- [x] T033 [P] [US4] Migrate `src/routes/travels/-components/TravelExpensesDetailedPlot.tsx`
      from D3 to Recharts.
      **Done**: replaced D3 `d3.stack`/`d3.index`/`d3.union` stacked-rect implementation
      with a Recharts `BarChart` using one `<Bar stackId="travel">` per travel name —
      Recharts' native stacking replaces the manual `d3.stack` offset math entirely, data
      pivoted to one row per date with one field per travel name.
- [x] T034 [P] [US4] Migrate `src/routes/travels/-components/TravelExpensesMonthlyPlot.tsx`
      from D3 to Recharts.
      **Done**: replaced the two-D3-rect-layer implementation (translucent full-year
      background band + opaque month bar) with a Recharts `BarChart`
      (`dataKey="value"`, `barSize` narrowed) plus one `<ReferenceArea>` per year
      (`x1`/`x2` = that year's first/last month category, `y1=0`/`y2=`year total,
      translucent fill) reproducing the year-band-behind-month-bars visual. Documented
      here as a visual-approximation deviation per the chart contract's non-goals
      (pixel-identical output not required).
- [x] T035 [P] [US4] Migrate `src/routes/travels/-components/TravelExpensesPiePlot .tsx`
      from D3 to a Recharts `PieChart`.
      **Done**: same donut pattern as T032 (no click-to-hide here, matching the original
      — simpler, read-only per-travel breakdown), custom tooltip showing name/value/
      percentage-of-total. Filename's trailing space preserved.
- [x] T036 [P] [US4] Migrate `src/routes/travels/-components/TravelExpensesPlot.tsx` from
      D3 to Recharts.
      **Done**: replaced D3 rect-per-travel bar chart with a Recharts `BarChart`, one
      `<Cell>` per bar colored via the existing `getColor` (from `./utils`), x-axis
      category label formatted from each travel's end date.
- [x] T037 [P] [US4] Migrate `src/routes/analysis/-components/TransactsPlot.tsx` from D3
      to Recharts.
      **Done**: replaced D3 line+circle implementation with a Recharts `LineChart`
      (single line — the source data always groups under one constant `name: "Mixin"`,
      preserved as-is, not a behavior change). Grouping (`d3.groups`/`d3.sum`) replaced
      with `src/common/aggregate.ts`'s `groupBy`/`sum`.
- [x] T038 [P] [US4] Resolve `src/routes/analysis/-components/KpiBlock.tsx`'s `d3` usage
      (scale/number-formatting only, not a full chart per research.md item 4): drop the
      `d3` import in favor of `parseNum`/plain arithmetic, or migrate to a small Recharts
      primitive if a real chart is warranted — confirm scope during implementation.
      **Done**: confirmed no chart here (KPI number cards only) — dropped `d3` entirely,
      replaced `d3.groups`/`d3.sum` with `src/common/aggregate.ts`'s `groupBy`/`sum`.

### Implementation for User Story 4 — cleanup

- [x] T039 [US4] Delete `src/routes/summary/-plots/Tooltip.tsx` and
      `src/routes/summary/-plots/tooltipFuncs.tsx` once no chart file imports them
      (depends on T028-T038).
      **Done**: confirmed via grep no remaining importers, then deleted both files.
- [x] T040 [US4] Delete `src/components/charts/XAxis.tsx` and
      `src/components/charts/YAxis.tsx` once no chart file imports them (depends on
      T028-T038).
      **Done**: confirmed via grep no remaining importers, then deleted both files.
- [x] T041 [US4] Remove `d3` and `@types/d3` from `package.json` (depends on T039, T040).
      **Done**: ran `pnpm remove d3 @types/d3`; `package.json`/`pnpm-lock.yaml` updated,
      no errors (one pre-existing, unrelated Storybook/Vite peer-dependency warning).
- [x] T042 [P] [US4] Verify `git grep -l 'import \* as d3 from "d3"' src` returns zero
      results (spec SC-003) (depends on T041).
      **Done**: confirmed zero results; also confirmed no `d3` references anywhere in
      `src/` or `package.json`.
- [x] T043 [US4] Re-measure `pnpm build` + `pnpm size` against the T001 baseline; adjust
      the `size-limit` "chart route chunk" budget in `package.json` if the real
      post-migration number differs materially (research.md item 11) (depends on T041).
      **Done**: re-ran `pnpm build`/`pnpm size`. Main bundle: 318.13 KB gzip (limit 350 KB,
      unchanged, passes). Chart route chunk: 94.49 KB gzip, exceeding the old 89 KB limit
      by 5.49 KB (expected — Recharts pulls more sub-components into the shared chunk
      than the old hand-rolled D3 code did); raised the `size-limit` "chart route chunk"
      limit in `package.json` to 105 KB (deliberate headroom over the measured 94.49 KB).
      Both budgets pass after the adjustment.

**Checkpoint**: every chart renders through Recharts; `d3` fully removed.

---

## Phase 7: User Story 5 - Charts resize correctly and stay usable on touch (Priority: P1)

**Goal**: every chart uses `ResizeObserver` (via Recharts' `ResponsiveContainer`), scales
margins/density for narrow viewports, keeps key values visible without hovering, and
supports tap-to-pin + bottom-sheet tooltips.

**Independent Test**: resize a chart's container programmatically; confirm it re-renders.
On a touch device, tap a data point; confirm a tooltip pins and stays visible.

### Implementation for User Story 5 — shared primitive

- [x] T044 [US5] Create `ChartTooltip` component in
      `src/components/charts/ChartTooltip.tsx` per
      `contracts/chart-component-contract.md`: tap-to-pin state, bottom-sheet render via
      `useIsNarrowViewport` (existing hook, `src/common/utils.ts`) on narrow viewports,
      floating tooltip otherwise.
      **Done**: generic `ChartTooltip<TValue, TName>` wraps Recharts' `Tooltip` `content`
      slot as a controller around a `children` render-prop (each chart keeps its own
      tooltip body markup, passed as `children`). Pin state (`useState`) latches the last
      active `payload`/`label` on `useIsTouchDevice()` devices once `active` goes true, and
      is not cleared when `active` goes false (i.e. on touchend) — only by tapping a new
      point (effect re-fires) or the dismiss control. On `useIsTouchDevice() &&
    useIsNarrowViewport()` it portals the pinned content to `document.body` as a fixed
      bottom sheet; on touch-but-wide it renders inline with a small dismiss button; on
      non-touch it just follows Recharts' own `active`/`payload` (no pinning), matching
      desktop hover behavior unchanged.
- [x] T045 [P] [US5] Storybook story for `ChartTooltip` in
      `src/components/charts/ChartTooltip.stories.tsx` covering pinned/unpinned and
      narrow/wide-viewport states (depends on T044).
      **Done**: `Floating` (default desktop) and `NarrowViewport` (mobile1 viewport)
      stories, with a toggle button simulating tap/release; noted in-file that true touch
      pin/dismiss behavior depends on the environment's actual `(pointer: coarse)` media
      query, so real-device confirmation is still owed at T060.
- [x] T046 [P] [US5] Component test for `ChartTooltip`'s pin/dismiss/bottom-sheet
      behavior in `src/components/charts/ChartTooltip.test.tsx` (depends on T044).
      **Done**: 3 tests (mocking `matchMedia` per-query) — non-touch renders/clears with no
      pin; touch pins after `active` goes false and dismisses on click; touch+narrow
      renders with a dismiss control present (bottom-sheet path). `pnpm vitest run` passes.

### Implementation for User Story 5 — per-chart wiring

Each task wires `ChartTooltip`, an always-visible key value, and narrow-viewport margin/
tick-density scaling into that file's already-Recharts-migrated component (depends on
T044 and the matching US4 task).

- [x] T047 [P] [US5] Wire into `src/routes/summary/-plots/AssetAccountsPlot.tsx` (depends
      on T028, T044).
      **Done**: `ChartTooltipContent` narrowed to `Pick<TooltipContentProps, "payload"|"label">`
      (no `active` guard, `ChartTooltip` gates it); added a "Latest total" `ChartKeyValue`
      overlay; wrapped the `Tooltip` `content` in `ChartTooltip`; swapped each `Line`'s
      `activeDot={{r:4}}` for `renderTouchDot(getRandomColor(s.id), 4)`. `tsc --noEmit` clean.
- [x] T048 [P] [US5] Wire into `src/routes/summary/-plots/DetailedExpensesBarPlot.tsx`
      (depends on T029, T044).
      **Done**: this file only consumes the shared `BarChart` from
      `src/components/charts/BarPlot.tsx` (T057) unmodified — it inherits the new
      touch-pin tooltip and key-value overlay for free. `tsc --noEmit` and `eslint` clean.
- [x] T049 [P] [US5] Wire into `src/routes/summary/-plots/DetailedIncomeBarPlot.tsx`
      (depends on T030, T044).
      **Done**: same as T048 (consumes `BarChart` from T057 unmodified). `tsc --noEmit`
      and `eslint` clean.
- [x] T050 [P] [US5] Wire into `src/routes/summary/-plots/IncomeExpensesPlot.tsx`
      (depends on T031, T044).
      **Done**: same pattern as T047; `ChartKeyValue` shows "Net (<dateLabel>)" colored by
      sign; both `Line`s' `activeDot`s swapped for `renderTouchDot`; `dot={false}` kept
      unchanged. `tsc --noEmit` and `eslint` clean.
- [x] T051 [P] [US5] Wire into
      `src/routes/summary/-plots/MonthDetailedExpensesPiePlot .tsx` (depends on T032,
      T044).
      **Done**: `ChartTooltipContent` narrowed to `Pick<..., "payload">` (dropped the
      `active`-guard, now gated by `ChartTooltip`); `RechartsTooltip`'s `content` wrapped
      in `ChartTooltip`. Pre-existing center-overlay key value (date + total) and the
      per-`Cell` `onClick={() => setHideAccounts(...)}` click-to-filter interaction left
      untouched. `tsc --noEmit` and `eslint` clean.
- [x] T052 [P] [US5] Wire into
      `src/routes/travels/-components/TravelExpensesDetailedPlot.tsx` (depends on T033,
      T044).
      **Done**: `ChartTooltipContent` narrowed to `Pick<..., "payload" | "label">` (dropped
      `active`-guard); `RechartsTooltip`'s `content` wrapped in `ChartTooltip`. Stacked
      `stackId="travel"` bars already preserve the original's overlap-by-stacking
      semantics (assessed during T055's investigation), so no Scatter-style rewrite
      needed here; no dot-based touch sizing needed (bars only). `tsc --noEmit` and
      `eslint` clean.
- [x] T053 [P] [US5] Wire into
      `src/routes/travels/-components/TravelExpensesMonthlyPlot.tsx` (depends on T034,
      T044).
      **Done**: same pattern as T052 (`Pick<..., "payload">` narrowing, `ChartTooltip`
      wrap). `ReferenceArea` yearly bands already preserve the original's
      yearly-vs-monthly overlap effect (assessed during T055's investigation), so no
      Scatter-style rewrite needed here. `tsc --noEmit` and `eslint` clean.
- [x] T054 [P] [US5] Wire into `src/routes/travels/-components/TravelExpensesPiePlot .tsx`
      (depends on T035, T044).
      **Done**: same pattern as T051 (`Pick<..., "payload">` narrowing, `ChartTooltip`
      wrap); this pie chart has no click-to-filter interaction, only the pre-existing
      center-overlay sum total, left untouched. `tsc --noEmit` and `eslint` clean.
- [x] T055 [P] [US5] Wire into `src/routes/travels/-components/TravelExpensesPlot.tsx`
      (depends on T036, T044).
      **Done**: also fixed a real US4 regression found during this pass — the D3→Recharts
      migration had switched this chart from continuous-time bar positioning (D3's
      `scaleUtc` + fixed pixel width, causing travels close together in time to visually
      overlap under `fillOpacity: 0.4`, the chart's actual point) to a categorical `Bar`
      x-axis, which silently lost the overlap effect (every bar evenly spaced regardless of
      real date proximity). Recharts' `Bar` has no continuous-positioning mode, so replaced
      it with `Scatter` (numeric `finMillis` x/y) + a custom `shape` drawing a `<rect>` sized
      via the public `usePlotArea()` hook (baseline = plotArea bottom, since `YAxis
    domain={[0, yMax]}`), reproducing the original D3 rect math exactly without a d3
      dependency. Also added an invisible wider hit-rect per bar (>=44px) for touch, explicit
      month-boundary `XAxis` ticks (data-driven, tiered by viewport), a "latest travel"
      `ChartKeyValue`, and the standard `ChartTooltip` wiring. Verified visually via a
      throwaway Storybook story with clustered vs. spread-out synthetic dates (screenshotted,
      confirmed overlap renders, then deleted the story). Checked the other two travel
      charts for the same regression: `TravelExpensesMonthlyPlot.tsx` (T034) already uses
      `ReferenceArea` bands for its yearly-vs-monthly overlap (different mechanism, not
      lost) and `TravelExpensesDetailedPlot.tsx` (T033) already uses `stackId` for its
      per-date category stacking (the semantically important part); neither lost its
      primary effect, though both still space bars categorically rather than by continuous
      date like the original (same minor nuance, lower priority, not fixed here). `tsc
    --noEmit` and `eslint` clean.
- [x] T056 [P] [US5] Wire into `src/routes/analysis/-components/TransactsPlot.tsx`
      (depends on T037, T044).
      **Done**: same pattern as T047/T050; this file previously lacked narrow-viewport
      margin tiering entirely (unlike the other migrated files), so added
      `marginDesktop`/`marginMobile` + `useIsNarrowViewport` wiring here too; `dot`/
      `activeDot` both swapped to `renderTouchDot` since this chart shows dots at rest (not
      `dot={false}`). `tsc --noEmit` and `eslint` clean.
- [x] T057 [US5] Swap `src/components/charts/BarPlot.tsx`'s resize mechanism from
      `useOnWindowResize` to `ResponsiveContainer`/`ResizeObserver`; wire `ChartTooltip` +
      always-visible key value (depends on T044).
      **Done**: the main chart already used `ResponsiveContainer`; the only genuine
      `useOnWindowResize` use was `ChartLegend`'s legend-height recalculation. Swapped it
      to observe the _outer chart container_ (a new merged `containerRef` on the root div,
      via `useWindowSize` from `@/common/utils.ts`) rather than the legend's own box —
      observing the legend's own height directly caused an infinite render loop
      ("Maximum update depth exceeded"), since setting `legendHeight` changes the space
      Recharts allots the legend, which would re-trigger its own observer. Caught via a
      throwaway Storybook story + Playwright screenshot before landing. Added an
      always-visible `ChartKeyValue` (latest period's cross-category stacked total; only
      rendered for `type="stacked"`, the only case with one coherent summed number) with a
      `top-8` offset when a right-side legend is also shown, to avoid overlapping it.
      Wired the shared `ChartTooltip` (imported aliased as `TouchChartTooltip` to avoid
      colliding with this file's own pre-existing local `ChartTooltip` default-content
      component) around the existing tooltip `content` render, so pin/dismiss/bottom-sheet
      behavior applies here too, feeding its pinned `payload`/`label` back through the
      existing `cleanPayload` transform so `tooltipCallback`/`customTooltip` consumers are
      unaffected. Verified visually (stacked-with-legend and stacked-without-legend
      variants, plus hover tooltip) via Storybook screenshots, then deleted the throwaway
      story. `tsc --noEmit` and `eslint` clean.
- [x] T058 [US5] Delete `src/hooks/useOnWindowResize.ts` once `BarPlot.tsx` no longer
      imports it (depends on T057).
      **Done**: confirmed no remaining importers via `git grep`, then deleted the file.
- [x] T059 [P] [US5] Size Recharts `Dot`/`activeDot` touch hit-areas to at least 44×44px,
      independent of the visible marker radius, across all charts wired in T047-T057
      (doc 14 item 4) (depends on T047-T057).
      **Done**: audited every `dot`/`activeDot` usage across T047-T057's files (`git grep`)
      — all route through `TouchDot.tsx`'s `renderTouchDot`, whose invisible hit-circle is
      `TOUCH_HIT_RADIUS = 22` (44px diameter) regardless of the visible dot's drawn radius
      (3-6px across callers). Bar/scatter-only charts (no `Dot` markers) instead size an
      invisible hit-`<rect>` at the shape level to >=44px (`MIN_HIT_SIZE` in
      `TravelExpensesPlot.tsx`'s `OverlappingBars`; plain `Bar`s' own drawn width already
      exceeds 44px in every caller). No further changes needed; already satisfied as a
      byproduct of T047-T057.
- [x] T060 [P] [US5] Playwright e2e test in `e2e/`: at a 375px viewport, tap a chart data
      point; confirm the tooltip pins and renders as a bottom sheet (depends on T059).
      **Done**: `e2e/chart-touch-tooltip.spec.ts` dispatches a real touchstart+touchmove+
      touchend (Recharts only recomputes the active point on `touchmove`, so a plain
      `tap()` never triggers it) against the Analysis page's transactions chart, then
      asserts the bottom-sheet + Dismiss button render and dismiss actually clears them.
      Analysis's chart was chosen over Summary's because it's fed by `fullTransactionsOptions`
      (unfiltered), independent of the guest account-role config. Along the way, fixed two
      real bugs this test surfaced: (1) `summary/index.tsx`'s root container was missing
      `flex` (had `flex-col` alone), and 8 chart wrapper divs used `h-full` with no definite
      ancestor height below `md:`, together collapsing every chart to 0×0 below the `md:`
      breakpoint -- fixed via `flex flex-col` and `h-64 md:h-full`. (2) `ChartTooltip`'s pin
      effect re-latched onto the still-active point immediately after `dismiss()`, because
      Recharts never reports `active: false` after a touch lifts -- fixed by remembering the
      dismissed point's label in a ref and skipping re-pin until a different point goes
      active. Separately confirmed the live `cashpy-guest` Turso database still holds its
      old real-personal-data seed, whose account GUIDs don't match `GUEST_ACCOUNT_CONFIG`
      in `api/turso-token.ts`/`vite.config.ts` (already updated, uncommitted, to the GUIDs
      `scripts/generate-guest-data.mjs` produces) -- so every account-scoped guest query
      (Summary's KPIs and charts) currently returns empty until someone runs
      `scripts/seed-guest-data.sh`, which wipes and replaces that live database. Left
      un-run here since it's a destructive action against a shared database, out of scope
      for T060, and unrelated to US5.

**Checkpoint**: every chart resizes via `ResizeObserver`, shows key values without
interaction, and supports tap-to-pin/bottom-sheet tooltips.

---

## Phase 8: User Story 6 - The scrubber/drag-to-scan pattern is applied to every chart (Priority: P2)

**Goal**: a shared drag-to-scan hook is applied to every chart. Owner-decided full scope
(2026-08-10); scheduled last within the spec per the spec's own Acceptance Scenario
US6.2.

**Independent Test**: drag across each chart's plot area; confirm a scrubber/crosshair
tracks the drag and updates the pinned value, on every chart in the app.

### Implementation for User Story 6 — shared primitive

- [ ] T061 [US6] Create `useChartScrubber` hook in `src/hooks/useChartScrubber.ts` per
      `contracts/chart-component-contract.md`: pointer/touch-drag handler over a chart's
      plot area, exposing `{ activeIndex, isDragging }`.
- [ ] T062 [P] [US6] Unit test `useChartScrubber` in
      `src/hooks/useChartScrubber.test.ts` (depends on T061).

### Implementation for User Story 6 — per-chart wiring

Each task wires `useChartScrubber` into that file's `ChartTooltip`-equipped chart,
rendering a Recharts `ReferenceLine`/cursor at `activeIndex` (depends on T061 and the
matching US5 task).

- [ ] T063 [P] [US6] Wire into `src/routes/summary/-plots/AssetAccountsPlot.tsx` (depends
      on T047, T061).
- [ ] T064 [P] [US6] Wire into `src/routes/summary/-plots/DetailedExpensesBarPlot.tsx`
      (depends on T048, T061).
- [ ] T065 [P] [US6] Wire into `src/routes/summary/-plots/DetailedIncomeBarPlot.tsx`
      (depends on T049, T061).
- [ ] T066 [P] [US6] Wire into `src/routes/summary/-plots/IncomeExpensesPlot.tsx`
      (depends on T050, T061).
- [ ] T067 [P] [US6] Wire into
      `src/routes/summary/-plots/MonthDetailedExpensesPiePlot .tsx` (depends on T051,
      T061) — a pie chart may need a scrubber-adjacent pattern (e.g. cycling segments)
      rather than a literal x-axis drag; document any deviation per the spec's Edge Cases
      and `contracts/chart-component-contract.md`'s non-goal on pixel-identical output.
- [ ] T068 [P] [US6] Wire into
      `src/routes/travels/-components/TravelExpensesDetailedPlot.tsx` (depends on T052,
      T061).
- [ ] T069 [P] [US6] Wire into
      `src/routes/travels/-components/TravelExpensesMonthlyPlot.tsx` (depends on T053,
      T061).
- [ ] T070 [P] [US6] Wire into `src/routes/travels/-components/TravelExpensesPiePlot .tsx`
      (depends on T054, T061) — same pie-chart caveat as T067.
- [ ] T071 [P] [US6] Wire into `src/routes/travels/-components/TravelExpensesPlot.tsx`
      (depends on T055, T061).
- [ ] T072 [P] [US6] Wire into `src/routes/analysis/-components/TransactsPlot.tsx`
      (depends on T056, T061).
- [ ] T073 [US6] Wire into `src/components/charts/BarPlot.tsx` (depends on T057, T061).
- [ ] T074 [P] [US6] Playwright e2e test in `e2e/`: drag across a chart's plot area;
      confirm the scrubber tracks the position and the pinned value updates live
      (depends on T073).

**Checkpoint**: all six user stories complete; every chart has full Recharts rendering,
resize, touch, and scrubber support.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T075 [P] Document the CSS-var/`shark-*` token system and the `useTheme` hook
      pattern (e.g. in `docs/architecture.md`) so
      [008-internationalization-and-seo](../008-internationalization-and-seo/spec.md)'s
      `useLocale` hook has a written pattern to mirror, per spec.md's Sequencing note.
- [ ] T076 Run `pnpm test`, `pnpm test:e2e`, `pnpm lint`, and `pnpm build`; confirm all
      pass.
- [ ] T077 Run `pnpm size`; confirm the (possibly T043-adjusted) budget holds.
- [ ] T078 Real-device verification: log dark-mode and touch/scrubber checks in
      `docs/review/19-manual-verification.md` per `quickstart.md`'s Definition of Done —
      DevTools emulation alone is not sufficient (spec Edge Cases).
- [ ] T079 Manually re-verify the golden path and guest path (Constitution Principle III)
      against the T001 baseline, in both light and dark mode.
- [ ] T080 Update `docs/review/12-library-choice-review.md`, `13-component-library-and-
design-system.md`, `14-charts-and-mobile-interaction.md`,
      `15-theming-light-dark-mode.md`, and this spec's `spec.md` Status line from
      "Planning done"/"Planned" to reflect implementation is complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: No separate blocking tasks; the phase ordering below (3→4→
  5 before 6→7→8) itself encodes the spec's required sequencing.
- **US1 (Phase 3)**: Depends on Setup. No dependency on any other user story.
- **US2 (Phase 4)**: Depends on US1's CSS var tokens existing conceptually (the toggle
  mechanism itself only needs the `dark` class convention, but the visible effect
  requires US1's tokens) — sequenced after US1 per spec.md.
- **US3 (Phase 5)**: Depends on US2 (needs a working toggle to manually audit dark-mode
  coverage) and US1 (needs the token set to add new `dark:` classes against).
- **US4 (Phase 6)**: Depends on US1-3 complete (Sequencing note) — MUST NOT start earlier.
- **US5 (Phase 7)**: Depends on US4 (each per-file task depends on that file's US4
  migration task).
- **US6 (Phase 8)**: Depends on US5 (each per-file task depends on that file's US5 task);
  explicitly scheduled last per spec Acceptance Scenario US6.2.
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- All `[P]`-marked per-file chart tasks within a single phase (US4/US5/US6) touch
  different files and can run in parallel once that phase's shared primitive/prep tasks
  are done.
- T020-T022 (icon swaps) are three independent files, parallelizable.
- T026/T027 (TanStack decisions) are independent content additions to the same file —
  parallelizable as separate edits, sequence the actual commit if conflicts arise.
- Within US5/US6, a single chart's wiring task can start as soon as that chart's
  prior-phase task and the shared primitive are both done — different charts don't block
  each other.

---

## Parallel Example: User Story 4 (per-file migrations)

```bash
# After T025-T027 (prep) are done, launch all independent chart migrations together:
Task: "Migrate AssetAccountsPlot.tsx from D3 to Recharts"
Task: "Migrate DetailedExpensesBarPlot.tsx from D3 to Recharts BarChart"
Task: "Migrate DetailedIncomeBarPlot.tsx from D3 to Recharts BarChart"
Task: "Migrate IncomeExpensesPlot.tsx from D3 to Recharts"
Task: "Migrate MonthDetailedExpensesPiePlot .tsx from D3 to Recharts PieChart"
Task: "Migrate TravelExpensesDetailedPlot.tsx from D3 to Recharts"
Task: "Migrate TravelExpensesMonthlyPlot.tsx from D3 to Recharts"
Task: "Migrate TravelExpensesPiePlot .tsx from D3 to Recharts PieChart"
Task: "Migrate TravelExpensesPlot.tsx from D3 to Recharts"
Task: "Migrate TransactsPlot.tsx from D3 to Recharts"
Task: "Resolve KpiBlock.tsx's d3 usage"
# T039-T043 (cleanup) run only after all of the above complete.
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

US1 alone has no user-visible effect (no toggle exists yet to reach the `.dark` state) —
the smallest user-visible increment is US1 + US2 together: shadcn renders correctly, and
a real, persisted light/dark/system toggle exists.

1. Complete Phase 1: Setup.
2. Complete Phase 3: US1 (CSS vars, both scopes).
3. Complete Phase 4: US2 (hook, toggle, nav wiring).
4. **STOP and VALIDATE**: run both stories' Independent Tests together; the 5
   already-`dark:`-classed files should now visibly re-theme.
5. Deploy/demo if ready (constitution Principle I — independently shippable).

### Incremental Delivery

1. Setup → US1 → US2 → validate → deploy (MVP: real theming).
2. US3 → validate (full-app dark coverage + one icon library) → deploy.
3. US4 → validate (`d3` fully removed, Recharts-only) → deploy.
4. US5 → validate (resize/touch usability) → deploy.
5. US6 → validate (scrubber everywhere) → deploy.
6. Polish.

### Solo-Maintainer Sequencing Note

Given the strict phase-ordering requirement (theming before charts, US6 last) and that
most per-file chart tasks are single-person sequential work in practice (not a team), the
realistic execution path is linear through Phases 1→9 in order, using the `[P]` markers
within each phase to batch same-story file edits together (e.g. all 11 US4 migrations in
one working session) rather than to imply true multi-developer parallelism.

---

## Notes

- `[P]` tasks touch different files with no incomplete dependency between them.
- `[Story]` label maps every phase-3-through-8 task to its user story for traceability.
- Commit after each task or logical group (e.g. one commit per migrated chart file, not
  one giant commit for all 11 migrations in Phase 6).
- Stop at any checkpoint to validate that story independently before continuing.
- Two per-file passes (US5 then US6) over the same 11 chart files is intentional, not
  redundant — see the Organization note above and research.md item 7 for why the shared
  primitives are built once but wired in per-story rather than all at once during US4.
