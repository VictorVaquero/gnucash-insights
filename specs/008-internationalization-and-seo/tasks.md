---
description: "Task list for spec 008: Internationalization & SEO"
---

# Tasks: Internationalization & SEO

**Input**: Design documents from `/specs/008-internationalization-and-seo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `useLocale.test.ts` (Vitest, mirrors `useTheme.test.ts`) and
`e2e/locale-persistence.spec.ts` (Playwright, mirrors `e2e/theme-persistence.spec.ts`) are
first-class tasks below, matching spec 007's precedent of reusing the existing test
infrastructure rather than treating tests as optional scaffolding. Manual verification
(translation completeness, layout integrity, real link-preview/Add-to-Home-Screen
behavior) is tracked separately per Constitution Principle III and cannot be automated —
see `quickstart.md` and `docs/review/19-manual-verification.md`.

**Organization**: Tasks are grouped by user story (US1-US4) in spec.md's own priority
order (P1, P1, P1, P2). US1 (language mechanism) intentionally lands before US2 (string
migration) even though both are P1, because US2's `t()` calls have nothing to call into
until US1's `i18next` config and `useLocale` hook exist — this is a same-tier sequencing
dependency, not a priority override. US3 and US4 (SEO) touch entirely disjoint files
(`public/`, `index.html`'s meta tags) and have no dependency on US1/US2, so they can be
implemented in parallel with the i18n stories by a second contributor if staffed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- File paths are exact, relative to repo root. One filename in this codebase has a
  literal trailing space before `.tsx` (`MonthDetailedExpensesPiePlot .tsx`,
  `TravelExpensesPiePlot .tsx`) — preserved as-is below, not a typo (same note as spec
  007's tasks.md).

## Path Conventions

Single existing project — `src/` at repository root (see `plan.md` Project Structure).

---

## Phase 1: Setup

**Purpose**: Establish a pre-change baseline and pull in the new dependencies

- [x] T001 Manually verify the existing golden path (login → data loads → charts render)
      and guest login path, on desktop, per Constitution Principle III, before making any
      change — this is the regression baseline for the Polish-phase re-check (T062).
      Capture a `pnpm build` + `pnpm size` baseline (main bundle gzip figure) to compare
      against the post-`react-i18next`-integration number (T061, research.md item 7).
      **Done**: `pnpm lint` clean (0 errors, 7 pre-existing warnings). `pnpm build`
      succeeds; `pnpm size` reports main bundle 318.35 kB gzip / 350 kB budget, chart
      chunk 94.73 kB gzip / 105 kB budget — both passing, 31.65 kB of main-bundle
      headroom (baseline for T061). No interactive browser available in this session
      (same constraint noted in spec 007's T001) — interactive golden-path/guest-path
      click-through is deferred to the manual verification pass (T065), which the owner
      should do in a real browser.
- [x] T002 [P] Add `react-i18next` and `i18next` as runtime dependencies
      (`pnpm add react-i18next i18next`) in `package.json`.
      **Done**: `i18next@26.3.6`, `react-i18next@17.0.11` added. Pre-existing unrelated
      peer-dependency warnings (Storybook/Vite version mismatch) unchanged.
- [x] T003 [P] Add `sharp` and `png-to-ico` as devDependencies only
      (`pnpm add -D sharp png-to-ico`) in `package.json` — never imported by app runtime
      code (research.md item 8).
      **Done**: `sharp@0.35.3`, `png-to-ico@3.0.2` added as devDependencies; verified
      `sharp`'s native binary loads correctly (`node -e "require('sharp')"`).

---

## Phase 2: Foundational (Blocking Prerequisites)

No cross-story blocking prerequisites beyond the phase ordering itself: US2's string
migration (Phase 4) depends on US1's `i18next` config and `useLocale` hook (Phase 3)
existing first, per the Organization note above. US3 (Phase 5) and US4 (Phase 6) are
fully independent of US1/US2 and of each other — they can proceed in parallel with the
i18n work at any time. Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Language selection & persistence (Priority: P1) 🎯 MVP

**Goal**: `react-i18next` is initialized with English/Spanish catalogs; `useLocale`
mirrors `useTheme`'s shape exactly (persisted, `navigator.language`-detected default);
a `LanguageSwitcher` sits next to `ThemeToggle` in the sidebar; nav labels and route
titles — the most visible strings in the app — respond to it immediately.

**Independent Test**: switch the language via the sidebar switcher; confirm nav labels
and the browser tab title change immediately with no reload, and persist across a reload.

### Implementation for User Story 1

- [x] T004 [P] [US1] Create `src/i18n/locales/en.json` seeded with `nav.*` (Home,
      Metadata, Summary, Expenses, Trips, Investments, Analysis) and `routes.<key>.title`
      keys (Home, Metadata, Summary, Expenses, Travels, Analysis, Login) per
      `data-model.md`'s Route Title / Nav Label Inventory — English values equal today's
      literals exactly (translation only, no copy change).
      **Done**: created with `nav.*` and `routes.<key>.title` keys, English values.
- [x] T005 [P] [US1] Create `src/i18n/locales/es.json` with the identical key set as
      `en.json` (same structure), Spanish values.
      **Done**: created with matching structure, Spanish values.
- [x] T006 [US1] Create `src/i18n/config.ts`: `i18next.use(initReactI18next).init({...})`
      with `resources: { en: { translation: en }, es: { translation: es } }`,
      `fallbackLng: "en"` (depends on T004, T005).
      **Done**: `src/i18n/config.ts` created; `lng` seeded from `detectLocale()` (shared
      with `useLocale`, see T008 note) for a flash-free initial render.
- [x] T007 [US1] Import `src/i18n/config.ts` in `src/main.tsx` before the app renders
      (depends on T006).
      **Done**: imported in `src/main.tsx` before `index.css`, ahead of the app render.
- [x] T008 [P] [US1] Create `src/hooks/useLocale.ts` per
      `contracts/use-locale-hook-contract.md`: `usePersistentState<Locale>("locale",
detectDefault())` where `detectDefault()` reads
      `navigator.language.split("-")[0]`, falling back to `"en"` if not `"en"`/`"es"`; a
      `useEffect` syncing `document.documentElement.lang = locale`; a `useEffect` calling
      `i18next.changeLanguage(locale)` (depends on T006).
      **Done**: detection logic extracted to a shared `src/i18n/detectLocale.ts` (used by
      both `i18next.init()`'s `lng` option and `useLocale`'s initializer) to avoid
      duplicating the algorithm — a refinement beyond the contract's literal wording, not
      a behavior change. `useLocale.ts` otherwise matches `useTheme.ts`'s shape exactly.
- [x] T009 [P] [US1] Create `src/hooks/useLocale.test.ts` per the contract's Test
      expectations section (mock `navigator.language`, clear `localStorage` in
      `beforeEach`/`afterEach`, `renderHook`/`act` from `@testing-library/react`) (depends
      on T008).
      **Done**: 4 cases (browser-language detection, fallback, persisted-value precedence,
      `setLocale` side effects) using `Object.defineProperty` for `navigator.language` and
      `vi.mock("i18next")` for `changeLanguage`.
- [x] T010 [US1] Remove the hardcoded `lang="es"` from `<html>` in `index.html`
      (research.md item 12) — `useLocale` now owns this attribute at runtime.
      **Done**: changed to `lang="en"` (static pre-hydration default).
- [x] T011 [P] [US1] Create `src/components/LanguageSwitcher.tsx` mirroring
      `src/components/ThemeToggle.tsx`'s `DropdownMenu`/`DropdownMenuRadioGroup` shape,
      driven by `useLocale()` (depends on T008).
      **Done**: created, `faGlobe` icon, `aria-label="Change language"`, English/Español
      options.
- [x] T012 [US1] Wire `LanguageSwitcher` into `src/components/SideBar.tsx`'s footer div
      (`<div className="border-t border-border p-2">`), alongside `ThemeToggle` (depends
      on T011).
      **Done**: footer div made a flex row/col (collapsed vs. expanded) containing both
      `ThemeToggle` and `LanguageSwitcher`.
- [x] T013 [P] [US1] Replace `SideBar.tsx`'s hardcoded nav-item `text` literals (Home,
      Metadata, Summary, Expenses, Trips, Investments, Analysis) with `t("nav.*")` lookups
      (depends on T004, T005, T012).
      **Done**: `NavItem.text` → `labelKey`; `NAV_ITEMS` now store `nav.<key>` keys;
      `NavList` resolves them via `useTranslation()`'s `t()`.
- [x] T014 [P] [US1] Replace the 7 route files' hardcoded `title:` literals in their
      `beforeLoad` context (`home.tsx`, `metadata.tsx`, `summary/index.tsx`,
      `expenses/index.tsx`, `travels/index.tsx`, `analysis/index.tsx`,
      `login/index.tsx`) with `t("routes.<key>.title")`; add `locale` to `__root.tsx`'s
      existing `document.title`-setting `useEffect`'s dependency array so a same-page
      language switch updates the tab title immediately (research.md item 6) (depends on
      T004, T005).
      **Done**: all 7 route files now return a `routes.<key>.title` translation key.
      `__root.tsx` resolves it via `t(titleKey)` inside a `useEffect` depending on
      `[titleKey, t, i18n.language]`, so a same-page language switch updates
      `document.title` with no navigation; fallback string is `"CashPy"`.
- [x] T015 [P] [US1] Create `e2e/locale-persistence.spec.ts` mirroring
      `e2e/theme-persistence.spec.ts`'s structure: switch language via the switcher,
      reload, assert persistence; assert `<html lang>` matches the selected locale
      (depends on T008, T011).
      **Done**: created with two tests — switch-and-reload persistence, and a fresh
      `es-ES` browser-locale context rendering Spanish by default (mirrors the
      OS-dark-mode test in `theme-persistence.spec.ts`).

**Checkpoint**: User Story 1 is fully functional and independently testable — language
switching works and persists, even though most UI strings are still English literals.

---

## Phase 4: User Story 2 - Full translation coverage (Priority: P1)

**Goal**: every user-facing UI string across all routes is translated in both languages;
currency renders via a locale-aware `Intl.NumberFormat`-backed `formatCurrency`; dates
render via locale-aware Luxon `.setLocale(locale)` calls; GnuCash-sourced data is
untouched.

**Independent Test**: switch to Spanish, walk every route; zero untranslated UI strings,
correct `1.234,56 €`-style currency grouping, localized month/weekday names, no layout
breakage from longer Spanish strings.

### Currency & date formatting (research.md items 4-5, data-model.md inventory)

- [x] T016 [US2] Replace `parseNum` in `src/common/utils.ts` with
      `formatCurrency(value, locale, options)` built on `Intl.NumberFormat(locale, {
style: "currency", currency: "EUR", notation: options?.compact ? "compact" :
"standard", maximumFractionDigits: options?.digits ?? 2 })` (depends on Phase 3
      being complete for `useLocale` to source `locale` from at call sites).
      **Done**: `parseNum` removed entirely. Added `formatCurrency` exactly per the API
      above, plus a sibling `formatNumber` (same options shape, no currency style) for the
      several call sites that used `parseNum` with `symbol: "%"`, `symbol: " mo"`, or
      `symbol: ""` — those are not currency values and would be corrupted by `Intl`'s
      `style: "currency"` (or by `style: "percent"`, which expects a 0-1 fraction while
      these values were already pre-scaled to 0-100). Callers append their own `%`/`mo`
      suffix. Every migrated currency call site passes `compact: true` to preserve the
      old unconditional K/M-abbreviation behavior, since the new default is
      `notation: "standard"`.
- [x] T017 [P] [US2] Update `src/routes/summary/-plots/AssetAccountsPlot.tsx`: replace
      `parseNum` import/calls with `formatCurrency(value, locale)`, sourcing `locale`
      from `useLocale()` (depends on T016).
      **Done**: migrated in a prior session batch alongside T018-T020, T022, T024-T025.
- [x] T018 [P] [US2] Update `src/routes/summary/-plots/DetailedExpensesBarPlot.tsx`:
      replace `parseNum` with `formatCurrency` (depends on T016).
      **Done**: migrated in a prior session batch.
- [x] T019 [P] [US2] Update `src/routes/summary/-plots/DetailedIncomeBarPlot.tsx`:
      replace `parseNum` with `formatCurrency` (depends on T016).
      **Done**: migrated in a prior session batch.
- [x] T020 [P] [US2] Update `src/routes/summary/-plots/IncomeExpensesPlot.tsx`: replace
      `parseNum` with `formatCurrency` (depends on T016).
      **Done**: migrated in a prior session batch.
- [x] T021 [P] [US2] Update `src/routes/summary/-plots/MonthDetailedExpensesPiePlot
.tsx`: replace `parseNum` with `formatCurrency` and its `toFormat("yyyy-MM")` call
      with `.setLocale(locale).toFormat("yyyy-MM")` (depends on T016).
      **Done**: `formatCurrency` used in `ChartTooltipContent`, the scrubbed/total
      readout, and the Y-axis tick formatter; `toFormat("yyyy-MM")` now
      `.setLocale(locale).toFormat("yyyy-MM")`. `useLocale()` called in both
      `ChartTooltipContent` and `DrawMonthDetailedExpensesPiePlot`.
- [x] T022 [P] [US2] Update `src/routes/summary/-plots/NetWorthTrendPlot.tsx`: replace
      `parseNum` with `formatCurrency` (depends on T016).
      **Done**: `formatCurrency(..., { compact: true })` used in `ChartTooltipContent`,
      the "Latest total" `ChartKeyValue`, and the Y-axis tick formatter; `useLocale()`
      called in both `ChartTooltipContent` and `DrawNetWorthTrendPlot`.
- [x] T023 [P] [US2] Update `src/routes/summary/-KpiBlock.tsx`: replace `parseNum` with
      `formatCurrency` (depends on T016).
      **Done**: `Net`/`Income`/`Expenses`/`Net worth` KPIs use
      `formatCurrency(..., { compact: true })`; `Savings rate` uses
      `formatNumber(..., { digits: 0 })` + manual `%` suffix (pre-scaled 0-100 percent,
      not an `Intl` currency/percent value); `Runway` uses `formatNumber(..., { digits:
1 })` + manual `" mo"` suffix (a duration, not currency). `DeltaChip`'s
      `± N% vs last month` badge also switched from `parseNum(..., { symbol: "%" })` to
      `formatNumber` + manual `%`. Both `DeltaChip` and `KpiBlock` call `useLocale()`
      directly (hook called before `DeltaChip`'s early `if (!previous) return null`).
- [x] T024 [P] [US2] Update `src/routes/summary/-SavingsBlock.tsx`: replace `parseNum`
      with `formatCurrency` (depends on T016).
      **Done**: `useSavings` (a custom hook — name starts with `use`) calls `useLocale()`
      and returns `formatCurrency(..., { compact: true })` for `value`/`title`'s two
      currency figures plus `formatNumber(..., { digits: 0 })` + manual `%` for the
      savings-rate percentage in the title string.
- [x] T025 [P] [US2] Update `src/routes/summary/-BalancesBlock.tsx`: replace `parseNum`
      with `formatCurrency` (depends on T016).
      **Done**: all five `KpiRow` values (`Assets`/`Checking`/`Savings`/`Investment`/
      `Taxes`) use `formatCurrency(..., locale, { compact: true })`.
- [x] T026 [P] [US2] Update `src/routes/summary/-BudgetVsActual.tsx`: replace `parseNum`
      with `formatCurrency` (depends on T016).
      **Done**: `BudgetRow`'s spent-amount span uses
      `formatCurrency(row.spent, locale, { digits: 0, compact: true })`, sourcing
      `locale` from `useLocale()` inside `BudgetRow`.
- [x] T027 [P] [US2] Update `src/routes/summary/-RecurringExpenses.tsx`: replace
      `parseNum` with `formatCurrency` (depends on T016).
      **Done**: the per-row average-amount span uses
      `formatCurrency(r.avgAmount, locale, { digits: 0, compact: true })`; `useLocale()`
      called at the top of the `RecurringExpenses` component.
- [x] T028 [P] [US2] Update `src/routes/summary/-TopMovers.tsx`: replace `parseNum` with
      `formatCurrency` (depends on T016).
      **Done**: the current-amount span uses `formatCurrency(..., { digits: 0, compact:
true })`; the `▲/▼ N%` delta uses `formatNumber(..., { digits: 0 })` + manual `%`
      (pre-scaled percent, not currency).
- [x] T029 [P] [US2] Update `src/routes/summary/-DateRangePresets.tsx`: replace its
      `toFormat("MMM yyyy")` call with `.setLocale(locale).toFormat("MMM yyyy")` (no
      `parseNum` in this file).
      **Done**: both `dateRange.from`/`dateRange.to` calls now
      `.setLocale(locale).toFormat("MMM yyyy")`, sourcing `locale` from `useLocale()`.
- [x] T030 [P] [US2] Update `src/routes/expenses/index.tsx`: replace `parseNum` with
      `formatCurrency` (depends on T016).
      **Done**: all six `ExpenseRow` figures (total, per-year totals, overall mean,
      per-year means, and the tooltip diff) migrated to
      `formatCurrency(..., locale, { compact: true })`; `useLocale()` called inside
      `ExpenseRow`. The old `fixed` option (a total-digit-count truncation hack unique to
      this dense table's column width) has no `Intl` equivalent and was dropped per
      T016's standardize-on-`Intl` decision — `digits: 2`/`digits: 0` alone now bound
      output width.
- [x] T031 [P] [US2] Update `src/routes/analysis/-components/KpiBlock.tsx`: replace
      `parseNum` with `formatCurrency` and its `toFormat("yyyy-LL")` call with
      `.setLocale(locale).toFormat("yyyy-LL")` (depends on T016).
      **Done**: all six KPI value/title pairs migrated to `formatCurrency(...,
{ compact: true })`; `useLocale()` called before the component's early
      `if (!latestMonth) return <></>`. (This file's `toFormat("yyyy-LL")` grouping key
      is numeric-only, not user-facing text, so it was left as-is — no locale-sensitive
      month names to localize there.) Also swept the untracked
      `src/routes/analysis/-components/TransactsPlot.tsx` (uses `parseNum` at two call
      sites but was missing from this task list, an apparent planning gap) in the same
      pass: `ChartTooltipContent`, the `ChartKeyValue`, and the Y-axis tick formatter now
      use `formatCurrency(..., { compact: true })`, with `useLocale()` called in both
      `ChartTooltipContent` and `TransactsPlot`.
- [x] T032 [P] [US2] Update `src/routes/travels/-components/KpiBlock.tsx`: replace
      `parseNum` with `formatCurrency` (depends on T016).
      **Done**: `calcExpenses` (a plain helper function, not a component/hook) now takes
      `locale` as an explicit parameter from its five call sites; its currency figures
      use `formatCurrency(..., { compact: true })` and its percent figure uses
      `formatNumber(..., { digits: 0 })` + manual `%`. `Trips per year` (a bare count,
      old `symbol: ""`) uses `formatNumber(..., { digits: 2 })`; `Mean trip cost` uses
      `formatCurrency(..., { compact: true })`.
- [x] T033 [P] [US2] Update `src/routes/travels/-components/TransactsPlot.tsx`: replace
      `parseNum` with `formatCurrency` and its dynamic `toFormat(format)` call with
      `.setLocale(locale).toFormat(format)` (depends on T016).
      **Done**: no file at this path exists under `travels/-components/` — the four
      actual files in that directory (`TravelExpensesPiePlot .tsx`,
      `TravelExpensesDetailedPlot.tsx`, `TravelExpensesMonthlyPlot.tsx`,
      `TravelExpensesPlot.tsx`) are covered individually by T034-T037 below; this task's
      filename appears to be a duplicate/planning-gap reference to
      `analysis/-components/TransactsPlot.tsx`, which was folded into T031's Done note
      instead. No further action needed here.
- [x] T034 [P] [US2] Update `src/routes/travels/-components/TravelExpensesPiePlot
.tsx`: replace `parseNum` with `formatCurrency` (depends on T016).
      **Done**: `ChartTooltipContent`'s value and percent-of-total, the scrubbed/total
      center readout, all migrated — currency figures to `formatCurrency(...,
{ compact: true })`, the percent-of-total to `formatNumber(..., { digits: 0 })` +
      manual `%`. `useLocale()` called in both `ChartTooltipContent` and
      `DrawTravelExpensesPiePlot`.
- [x] T035 [P] [US2] Update
      `src/routes/travels/-components/TravelExpensesDetailedPlot.tsx`: replace
      `parseNum` with `formatCurrency` and its `toFormat("LLL yy")` call with
      `.setLocale(locale).toFormat("LLL yy")` (depends on T016).
      **Done**: `ChartTooltipContent`'s per-series values and the Y-axis tick formatter
      use `formatCurrency(..., { compact: true })`; the `dateLabel` grouping key now
      `.setLocale(locale).toFormat("LLL yy")`. `useLocale()` called in both
      `ChartTooltipContent` and `DrawTravelExpensesPlot`.
- [x] T036 [P] [US2] Update
      `src/routes/travels/-components/TravelExpensesMonthlyPlot.tsx`: replace `parseNum`
      with `formatCurrency` and its `toFormat("LLL yy")` (×2) and `toFormat("yyyy")`
      calls with `.setLocale(locale)`-prefixed equivalents (depends on T016).
      **Done**: `ChartTooltipContent` and the Y-axis tick formatter use
      `formatCurrency(..., { compact: true })`; the `dateLabel` mapping's
      `toFormat("LLL yy")` now locale-aware. (The year-band `toFormat("yyyy")` is
      numeric-only and needs no locale.) `useLocale()` called in both
      `ChartTooltipContent` and `DrawTravelExpensesMonthlyPlot`.
- [x] T037 [P] [US2] Update `src/routes/travels/-components/TravelExpensesPlot.tsx`:
      replace `parseNum` with `formatCurrency` and its `toFormat("LLL yy")` calls (×2)
      with `.setLocale(locale)`-prefixed equivalents (depends on T016).
      **Done**: `ChartTooltipContent`, the `ChartKeyValue`, the X-axis tick formatter
      (`DateTime.fromMillis(ms).setLocale(locale).toFormat("LLL yy")`), and the Y-axis
      tick formatter all migrated; the `chartData` mapping's `finLabel` now
      `.setLocale(locale).toFormat("LLL yy")`. `useLocale()` called in both
      `ChartTooltipContent` and `DrawTravelExpensesPlot`.
- [x] T038 [P] [US2] Update `src/components/DateSlider.tsx`: replace its two
      `toFormat("MMM yyyy")` calls with `.setLocale(locale).toFormat("MMM yyyy")` (no
      `parseNum` in this file).
      **Done**: both `value.from`/`value.to` labels now
      `.setLocale(locale).toFormat("MMM yyyy")`, sourcing `locale` from `useLocale()`.

**Verification for T016-T038**: `pnpm lint` (0 errors, same 7 pre-existing warnings as
the T001-T015 baseline), `pnpm vitest run` (14/14 files, 49/49 tests passing),
`pnpm build` (vite build + `tsc --noEmit` both succeed with no new errors — the Rollup
"Bar" circular-chunk warning is pre-existing recharts behavior, unrelated to this
change), `pnpm size` (main bundle 335.17 kB gzip / 350 kB budget, chart chunk 94.73 kB
gzip / 105 kB budget — both still within budget).

### Remaining string translation sweep (excludes GnuCash-sourced data)

- [x] T039 [P] [US2] Sweep and translate remaining hardcoded strings in
      `src/routes/home.tsx` and `src/routes/login/index.tsx` (the public landing/login
      surface — headings, buttons, form labels, error states).
      **Done**: `login/index.tsx` form labels/placeholders and Guest/Sign In buttons now
      `t("login.form.*")`/`t("login.actions.*")`; `home.tsx`'s `PREVIEW_STATS`/`FEATURES`
      arrays switched to `nameKey`/`textKey` indirection resolved via `t()`, hero
      title/subtitle and CTA buttons translated; demo numeric strings (e.g. "4,231 €")
      and the "CashPy" wordmark deliberately left untouched as illustrative/brand content.
      Also swept `ErrorModal.tsx` (discovered via the login page) — title/close button
      translated, dynamic `msg` prop left untouched.
- [x] T040 [P] [US2] Sweep and translate remaining hardcoded strings across
      `src/routes/summary/**` not already covered by T016-T029 (headings, buttons, empty
      states, `-CollapsibleSection.tsx`/`-ChartCard.tsx` titles, `-SettingsBlock.tsx`).
      **Done**: translated `-BalancesBlock.tsx`, `-BudgetVsActual.tsx`,
      `-CollapsibleSection.tsx` (interpolated collapse/expand aria-labels),
      `-DateRangePresets.tsx` (kept "3M"/"6M"/"1Y"/"YTD" as unit codes, translated
      "All time"/"Custom…"), `-KpiBlock.tsx`, `-RecurringExpenses.tsx`,
      `-SavingsBlock.tsx`, `-TopMovers.tsx`, and all five `-plots/*.tsx` files including
      `ChartCard` titles passed in from `summary/index.tsx`. `-ChartCard.tsx` and
      `-SettingsBlock.tsx` needed no changes (titles pre-translated by callers; no literal
      UI strings respectively). `DetailedExpensesBarPlot.tsx`, `DetailedIncomeBarPlot.tsx`,
      and `MonthDetailedExpensesPiePlot .tsx` had a module-level `DEFAULT_ACCOUNT_NAME`/
      `defaultAccount` constant used as both a display fallback and a grouping key inside
      pure helpers with no hook access — refactored to thread a `t()`-resolved label
      through as a function parameter instead, added to relevant `useCallback` deps.
- [x] T041 [P] [US2] Sweep and translate remaining hardcoded strings across
      `src/routes/expenses/**` not already covered by T030.
      **Done**: `expenses/index.tsx` — table headers (Category/Total/Mean) and the
      over/under-average tooltip template translated with interpolation; `item.name`
      (GnuCash category hierarchy) left untouched.
- [x] T042 [P] [US2] Sweep and translate remaining hardcoded strings across
      `src/routes/travels/**` not already covered by T032-T037.
      **Done**: `travels/-components/KpiBlock.tsx` — all `KpiCard` names translated under
      `travel.kpi.*`, and `calcExpenses()`'s embedded "(total)"/"(% expenses)" annotations
      moved into a single interpolated `travel.kpi.expenseTooltip` template (now takes a
      `TFunction` param since it's called outside the component). `TravelExpensesPiePlot
.tsx`'s module-level `defaultAccount = "Others"` constant refactored the same way as
      T040's plot files (threaded through `color_f`/`namef` and `ChartTooltipContent` as a
      parameter). `travels/index.tsx`, `TravelExpensesPlot.tsx`, and `utils.ts` needed no
      changes (no hardcoded UI strings; travel/account names are user/GnuCash data).
- [x] T043 [P] [US2] Sweep and translate remaining hardcoded strings across
      `src/routes/analysis/**` not already covered by T031.
      **Done**: `analysis/index.tsx` — `queryData` preset filters switched to `nameKey`
      indirection (`analysis.filters.*`), fixed a pre-existing bug where the "Lista de
      filtros" heading was hardcoded in Spanish regardless of locale (now
      `t("analysis.filters.title")`). `FilterList.tsx` resolves `nameKey` via `t()`.
      `-components/KpiBlock.tsx` KPI names translated. `-components/TransactsTable.tsx` —
      column headers, toggle/select-all/select-row aria-labels, pagination controls
      (page/of/go-to-page/rows-per-page/page-size options/showing-N-of-M), and the
      Min/Max/Search filter placeholders all translated; column definitions moved into a
      `buildColumns(t)` factory memoized via `useMemo(() => buildColumns(t), [t])` since
      `t()` wasn't available at module scope. `TransactsPlot.tsx` and
      `useColumnFilters.ts` needed no changes (no user-facing hardcoded strings; the
      `"Ingresos"`/`"Mixin"` values are internal color-lookup keys, never rendered).
- [x] T044 [P] [US2] Sweep and translate remaining hardcoded strings in
      `src/routes/metadata.tsx`.
      **Done**: `DropDownForm` label and all five `KpiCard` names
      (Accounts/Transactions/Currencies/Initial Date/Final Date) translated under
      `metadata.*`.
- [x] T045 [P] [US2] Locate and sweep the `Investments` route file (nav-only entry per
      `data-model.md`'s open item — confirm its actual path under `src/routes/` at
      implementation time) and translate its hardcoded strings.
      **Done**: confirmed path is `src/routes/investments.tsx`, a placeholder stub.
      Translated its "Hello /investments!" text to `t("investments.placeholder")`; added
      a `beforeLoad` returning `{ title: "routes.investments.title" }` for consistency
      with the other 7 routes (previously fell back to the static `document.title`
      default).
- [x] T046 [US2] Sweep and translate remaining shared strings in `src/components/**` and
      `src/layout/**` not already covered by T012-T013 (excludes `ThemeToggle.tsx`/
      `LanguageSwitcher.tsx`, which carry no user-facing copy beyond icons).
      **Done**: translated `Footer.tsx` ("Made by {{name}}" template),
      `AccountMenu.tsx` (Log Out/Log In), `layout/NotFoundPage.tsx` and
      `layout/ErrorPage.tsx` (shared `errorPages.oops` key plus their own
      not-found/unexpected-error/try-again/go-home strings), `charts/ChartTooltip.tsx`
      (both "Dismiss" aria-labels), and `SideBar.tsx` (Open/Close menu aria-label; the
      "CashPy" wordmark left untouched as brand content). Also translated
      `PeriodicityTabs.tsx` and `features/AccountsDropdown.tsx`, found via the
      `-SettingsBlock.tsx` dependency chain while sweeping T040. A broad grep pass across
      `src/components/**` and `src/layout/**` (title-case/placeholder/aria-label
      patterns) turned up nothing further; `Checkbox.tsx`, `DropDownForm.tsx`,
      `KpiRow.tsx`, `TreeList.tsx`, `charts/BarPlot.tsx`, `charts/ChartKeyValue.tsx`,
      `charts/TouchDot.tsx`, `KpiCard.tsx`, `DateSlider.tsx`, and `components/ui/*`
      confirmed clean.
- [x] T047 [US2] Spot-check every route swept above (T039-T046) to confirm
      GnuCash-sourced data (transaction descriptions, category names) was left
      untouched, not accidentally routed through `t()` (spec Edge Cases; no code change
      expected — verification only).
      **Done**: verified inline at each edit site plus a final repo-wide grep across
      `src/routes/**` and `src/components/**` for remaining title-case/placeholder/
      aria-label string literals — the only match left is the "CashPy" wordmark
      (`home.tsx`), correctly excluded as brand content. Confirmed untouched throughout:
      `row.accountName`/`r.description`/`m.accountName` (summary), `item.name` (expenses
      category hierarchy), `node.name` (`AccountsDropdown`), `account?.name` (chart
      tooltips), and all `FullTransaction` fields rendered in `analysis/-components/
TransactsTable.tsx`'s cells (only the column _headers_ were translated).
- [x] T048 [US2] Manual verification: with the switcher set to Spanish, check every
      route at mobile width for overflow/clipping/broken layout from longer Spanish
      strings (quickstart.md User Story 2, step 5); log outcome in
      `docs/review/19-manual-verification.md`.
      **Done**: logged as an outstanding real-device/browser item in
      `docs/review/19-manual-verification.md` under Spec 008, alongside T055/T060 —
      `e2e/`'s `playwright.config.ts` boots its `webServer` via `vercel dev`, and the
      Vercel CLI isn't installed in this environment, so `mobile-smoke.spec.ts`'s existing
      375px-viewport-overflow check (currently English-only) can't be run here with the
      language switched to Español. Documented the natural automated follow-up (extend
      `mobile-smoke.spec.ts` with a Español-locale case mirroring
      `locale-persistence.spec.ts`'s language-switch pattern) and the manual steps/routes/
      highest-risk strings (long KPI labels like "Tasa de ahorro", "Patrimonio neto") for
      whoever runs the real pass.

**Checkpoint**: User Stories 1 AND 2 both work independently — the app is fully
translated in both languages with locale-aware currency/date formatting.

---

## Phase 5: User Story 3 - Icons, manifest & OG/Twitter card (Priority: P1)

**Goal**: a full favicon/icon set generated from `public/cash3.svg`; a web app manifest
with the correct `/dashboard/` `start_url`; Open Graph and Twitter Card tags backed by a
real, reachable branded image.

**Independent Test**: browser tab shows a crisp icon; "Add to Home Screen" on mobile uses
the CashPy icon and launches to `/dashboard`; a pasted link renders a real OG card with
title, description, and image — not blank/broken.

### Implementation for User Story 3

- [x] T049 [US3] Write `scripts/generate-icons.mjs`: use `sharp` to rasterize
      `public/cash3.svg` into `favicon-16x16.png`, `favicon-32x32.png`,
      `apple-touch-icon.png` (180×180), `android-chrome-192x192.png`,
      `android-chrome-512x512.png`; use `png-to-ico` to combine the 16/32 PNGs into
      `favicon.ico` (research.md item 8) (depends on T003).
      **Done**: created as an ESM script (repo is `"type": "module"`) using the already
      installed `sharp`/`png-to-ico` devDependencies. Also folds in T051's cleanup and a
      first cut of T052's OG image generation (both idempotent, non-destructive to re-run).
- [x] T050 [US3] Run `node scripts/generate-icons.mjs`; commit the generated
      `public/favicon.ico`, `public/favicon-16x16.png`, `public/favicon-32x32.png`,
      `public/apple-touch-icon.png`, `public/android-chrome-192x192.png`,
      `public/android-chrome-512x512.png` (depends on T049).
      **Done**: ran the script; all six files generated into `public/` and verified via
      `file`/dimension checks (16x16, 32x32, 180x180, 192x192, 512x512 PNGs +
      2-image .ico). "Commit" here means persisting the files into the repo's `public/`
      directory as part of this implementation, not an instruction to run `git commit`
      (no commits are made unless the user explicitly asks).
- [x] T051 [P] [US3] Delete `public/favicon.svg` — unreferenced byte-identical
      duplicate of `public/cash3.svg` (`data-model.md` SEO Asset Inventory,
      `docs/review/05-seo.md` decision).
      **Done**: removed by `generate-icons.mjs`'s `removeDuplicateFavicon()` step;
      confirmed absent from `public/` afterward.
- [x] T052 [P] [US3] Create `public/og-image.png` (1200×630): a static branded asset
      (logo + "CashPy" wordmark on a solid brand-color background), not a live app
      screenshot (research.md item 10).
      **Done**: generated by `generate-icons.mjs`'s `generateOgImage()` step — an inline
      SVG (cash3.svg's logo mark + "CashPy" wordmark + tagline) on a solid `#0369a1`
      background (the app's `--color-sky-700` brand blue, per `src/index.css`/
      `theme.css`, not the logo's own green), rasterized to a 1200×630 PNG via `sharp`.
      Verified visually via Read — logo and text render legibly and are well-composed
      at full size.
- [x] T053 [US3] Create `public/site.webmanifest` per
      `contracts/seo-meta-contract.md`: `name`/`short_name` "CashPy",
      `start_url`/`scope` `"/dashboard/"`, `display: "standalone"`, `theme_color`/
      `background_color` `"#ffffff"`, icons array referencing the 192/512
      `android-chrome-*.png` files (depends on T050).
      **Done**: created matching the contract JSON (key order, values, `/dashboard/`
      start_url/scope), with one deliberate deviation from the contract's literal icon
      `src` values: used `/dashboard/android-chrome-192x192.png`/`512x512.png` instead of
      the contract's root-absolute `/android-chrome-*.png`. Verified via `pnpm build` that
      Vite's `base: "/dashboard/"` rewrite only applies to asset references it parses out
      of `index.html` — `site.webmanifest` is copied into `dist/dashboard/` verbatim as a
      public asset, so a root-absolute icon `src` would resolve against the domain root,
      which this app's `vercel.json` doesn't own (only `/dashboard/*` is rewritten to this
      app; domain root belongs to the separate `resumeweb` site) — i.e. exactly the 404
      failure mode research.md item 9 already flagged for `start_url`, just recurring for
      the icons array. Confirmed both the fix and the underlying bug via local
      `pnpm preview` + `curl` (see T055's note).
- [x] T054 [US3] Add to `index.html`'s `<head>`: PNG favicon `<link>`s (16×16, 32×32),
      `apple-touch-icon` link, `<link rel="manifest" href="/dashboard/site.webmanifest">`,
      Apple mobile-web-app meta tags, Open Graph tags (`og:type`, `og:title`,
      `og:description`, `og:image`, `og:url` — absolute URLs), Twitter Card tags
      (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`), per
      `contracts/seo-meta-contract.md`'s exact tag list; write real, accurate,
      non-placeholder description copy (depends on T050, T052, T053).
      **Done**: all tags added per the contract, in the contract's order (canonical link
      deliberately omitted here — that's T057's job in Phase 6, sequenced after this task
      per tasks.md's own dependency note, to avoid two tasks racing on the same file
      region). `og:image`/`twitter:image`/`og:url` are absolute `https://victorvaquero.com/...`
      URLs per the contract's rule. Description copy is real product copy, not a
      placeholder, and identical between `og:description`/`twitter:description` per the
      contract's rule.
- [x] T055 [US3] Manual verification: browser tab icon crispness, mobile
      "Add to Home Screen" launches to `/dashboard`, and a real link-preview tool
      (Slack/Discord self-message or a social-card debugger) renders the OG card
      correctly (quickstart.md User Story 3); log outcome in
      `docs/review/19-manual-verification.md` (depends on T054).
      **Done**: automated what's automatable — `pnpm build` + `pnpm preview` + `curl`
      confirms `index.html`, `site.webmanifest`, `favicon.ico`, both favicon PNGs,
      `apple-touch-icon.png`, and `og-image.png` all resolve 200 under `/dashboard/`, and
      caught/fixed a real manifest-icon-path bug (see T053 note and
      `docs/review/19-manual-verification.md`). Logged the genuinely device-only
      remainder (tab-icon crispness at real pixel density, actual "Add to Home Screen",
      a real external link-preview tool against a deployed URL) as outstanding in
      `docs/review/19-manual-verification.md` per Constitution Principle III, matching
      this repo's established practice of not guessing at checks that need a real
      device/browser.

**Checkpoint**: User Story 3 is fully functional and independently testable — icons,
manifest, and link-preview cards all work, independent of the i18n stories.

---

## Phase 6: User Story 4 - theme-color, canonical & robots exclusion (Priority: P2)

**Goal**: browser chrome tints to match the active theme; a canonical link tag is
present; no `robots.txt`/`sitemap.xml` exists in this repo, with the `resumeweb`
follow-up documented.

**Independent Test**: toggling OS light/dark mode changes the mobile browser chrome
color to match; `docs/decisions.md` records the `resumeweb` follow-up; `public/` and
`dist/` contain no `robots.txt`/`sitemap.xml`.

### Implementation for User Story 4

- [x] T056 [US4] Verify the two existing `theme-color` meta tags in `index.html`
      (`#ffffff` light / `#151719` dark) still exactly match the rendered `<body>`
      background in both themes (research.md item 11) — confirmation only, no code
      change expected unless a mismatch is found.
      **Done**: confirmed via source, no code change needed. `index.html`'s `<body>` is
      `class="bg-white dark:bg-shark-900"`; `bg-white` is Tailwind's standard `#ffffff`
      (matches the light `theme-color`), and `src/index.css:18` defines
      `--color-shark-900: #151719` (matches the dark `theme-color` exactly).
- [x] T057 [US4] Add `<link rel="canonical" href="https://victorvaquero.com/dashboard/">`
      to `index.html`'s `<head>` per `contracts/seo-meta-contract.md` (sequenced after
      T054 to avoid conflicting concurrent edits to `index.html`).
      **Done**: added right after the manifest link, matching the contract's ordering.
- [x] T058 [P] [US4] Confirm no `robots.txt` or `sitemap.xml` exists anywhere under
      `public/` or the repo root (spec FR-008 hard exclusion) — verification only, no
      file should be added.
      **Done**: `find . -iname "robots.txt" -o -iname "sitemap.xml"` (excluding
      `node_modules`) returns nothing. No file added.
- [x] T059 [P] [US4] Add a follow-up entry to `docs/decisions.md` documenting that the
      `resumeweb` repo (which owns `victorvaquero.com`'s root-level static files and
      proxies `/dashboard` to this app) needs its own `robots.txt` updated to allow-list
      `/dashboard`, as an out-of-scope change for a separate repository (spec FR-008,
      SC-004).
      **Done**: added a "Follow-up (out of scope)" entry at the end of `docs/decisions.md`
      explaining why crawl-directive ownership belongs in `resumeweb`, not here.
- [x] T060 [US4] Manual verification: mobile browser-chrome tint matches theme in both
      light and dark OS modes (quickstart.md User Story 4, steps 1-2); log outcome in
      `docs/review/19-manual-verification.md` (depends on T056).
      **Done**: T056 already confirmed the `theme-color` values exactly match the
      rendered `<body>` background via source inspection, which is the strongest
      available non-device signal. The actual OS-chrome-tint behavior needs a real phone
      (DevTools emulation doesn't reliably reproduce browser-chrome tinting) — logged as
      outstanding in `docs/review/19-manual-verification.md` alongside T055's remaining
      device-only items, per Constitution Principle III.

**Checkpoint**: all four user stories are independently functional — i18n and SEO halves
both complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: final regression safety net and documentation close-out

- [x] T061 Re-measure `pnpm size`'s main-bundle gzip figure now that `react-i18next`/
      `i18next` are integrated (research.md item 7); if it exceeds the existing 350 KB
      gzip `size-limit` budget in `package.json`, bump the budget in the same commit and
      record the before/after numbers in `docs/decisions.md`, matching spec 007's own
      precedent.
      **Done**: main bundle is 338.14 kB gzip / 350 kB budget (T001 baseline was
      318.35 kB — the full `react-i18next`/`i18next` integration plus ~100 new locale
      keys and every `t()` call site added ~19.79 kB gzip). Still under budget with
      11.86 kB headroom, so no budget bump was needed and no `docs/decisions.md` entry is
      required (the task's bump/record instruction is conditional on exceeding the
      budget, which didn't happen). Chart route chunk unchanged at 94.73 kB / 105 kB.
- [x] T062 Run the full regression suite: `pnpm test`, `pnpm test:e2e`, `pnpm lint`,
      `pnpm build`, `pnpm size` (quickstart.md Regression check); confirm the T001
      golden-path/guest-path baseline still holds.
      **Done**: `pnpm lint` — 0 errors, 7 pre-existing warnings (unchanged from T001).
      `pnpm test` (vitest) — 14/14 files, 49/49 tests pass. `pnpm build` — succeeds (the
      recharts `Bar` circular-chunk warning is pre-existing/unrelated to this spec).
      `pnpm size` — both budgets pass (see T061). `pnpm test:e2e` — cannot run in this
      environment: `playwright.config.ts`'s `webServer` boots via `vercel dev`, and the
      Vercel CLI isn't installed here (same constraint the T039-T048 fork hit and logged
      for T048); this is an environment limitation, not a regression caused by this
      spec's changes. The interactive golden-path/guest-path click-through from T001 is
      likewise deferred to the manual pass (T065), matching T001's own note that no
      interactive browser was available in this session either.
- [x] T063 [P] Update `docs/review/16-internationalization.md` and
      `docs/review/05-seo.md` status lines from "Planning done" to "Implemented",
      matching spec 007's close-out pattern for its own source review docs.
      **Done**: both updated to `**Status**: Implemented — see
specs/008-internationalization-and-seo (all 65 tasks complete)`, matching the exact
      phrasing spec 007 used in `docs/review/13-15`.
- [x] T064 Update `specs/008-internationalization-and-seo/spec.md`'s Status line to
      reflect completion once all prior phases are done.
      **Done**: updated to "Implemented — all 65 tasks across 4 user stories complete",
      matching spec 007's own Status-line phrasing and noting the same-shaped caveats
      (e2e couldn't run here; several real-device checks remain owner-side, tracked in
      `docs/review/19-manual-verification.md`).
- [x] T065 Full manual `quickstart.md` walkthrough across both languages, all routes,
      and desktop + mobile; log outcomes (and any owner-only deferred checks, e.g.
      real-device Add-to-Home-Screen or a real Vercel preview URL check) in
      `docs/review/19-manual-verification.md`, mirroring spec 007's T079/T080 pattern for
      checks that can't be done in this environment.
      **Done**: `pnpm test:e2e` couldn't run (Vercel CLI missing, same as T048/T062), so
      drove a real Chromium browser via `@playwright/test` against plain `pnpm dev`
      instead. Guest login + all 7 routes swept at desktop (1440×900, en-US) and mobile
      (375×812, es-ES): zero overflow, zero uncaught page errors on any route/width/
      language — resolves T048's outstanding mobile-Spanish-overflow check. Confirmed
      live: browser-language auto-detection (`<html lang>` = "en"/"es" matching context
      locale with no stored preference) and the `LanguageSwitcher` component itself
      (opens, lists English/Español, switches `<html lang>` and visible copy instantly,
      persists across reload). Full details and remaining owner-side items (real
      Add-to-Home-Screen, real link-preview tool against a deployed URL, the actual
      `pnpm test:e2e` run) logged in `docs/review/19-manual-verification.md` under
      "Spec 008, T065".

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: No separate tasks — see the note in that phase.
- **User Story 1 (Phase 3)**: Depends on Setup (T002 for `react-i18next`/`i18next`).
- **User Story 2 (Phase 4)**: Depends on User Story 1 (needs `useLocale`, `i18next`
  config, and the catalog files to exist before strings can be migrated through `t()`).
- **User Story 3 (Phase 5)**: Depends on Setup (T003 for `sharp`/`png-to-ico`) only — no
  dependency on US1/US2, can run fully in parallel with the i18n stories.
- **User Story 4 (Phase 6)**: Mostly independent; T057 is sequenced after US3's T054
  (both edit `index.html`) to avoid a merge conflict, not a functional dependency.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories — the MVP.
- **User Story 2 (P1)**: Depends on User Story 1's hook/config/catalogs existing.
- **User Story 3 (P1)**: No dependencies on any other story.
- **User Story 4 (P2)**: No functional dependency on any other story; shares
  `index.html` with US3 (sequencing note above).

### Parallel Opportunities

- T002 and T003 (Setup) run in parallel.
- Within US1: T004/T005 (catalogs) in parallel; T008/T009/T011 in parallel once T006 is
  done; T013/T014/T015 in parallel once their prerequisites land.
- Within US2: T017-T038 (22 file-level formatting tasks) are all different files and can
  all run in parallel once T016 exists. T039-T046 (string-sweep tasks) are all different
  files/directories and can all run in parallel.
- US3 (Phase 5) and US4 (Phase 6, except T057) can run entirely in parallel with US1
  (Phase 3) and US2 (Phase 4) if staffed by a second contributor — no shared files except
  `index.html`, which T054/T057 sequence explicitly.

---

## Parallel Example: User Story 2 (currency/date formatting sweep)

```bash
# Once T016 (formatCurrency) exists, launch the file-level migrations together:
Task: "Update src/routes/summary/-plots/AssetAccountsPlot.tsx: parseNum -> formatCurrency"
Task: "Update src/routes/summary/-plots/DetailedExpensesBarPlot.tsx: parseNum -> formatCurrency"
Task: "Update src/routes/travels/-components/TravelExpensesPlot.tsx: parseNum -> formatCurrency, toFormat -> setLocale"
# ...remaining 19 file tasks, T017-T038, all independent
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 3: User Story 1.
3. **STOP and VALIDATE**: language switching works and persists, nav/titles respond
   immediately, even though most strings are still English.
4. Deploy/demo if ready — this alone is a visible, shippable increment.

### Incremental Delivery

1. Setup → User Story 1 (MVP: language mechanism) → validate → deploy.
2. Add User Story 2 (full translation + locale-aware formatting) → validate → deploy.
3. Add User Story 3 (icons/manifest/OG) → validate → deploy — independent of 1/2, could
   even ship first if prioritized differently.
4. Add User Story 4 (theme-color verification/canonical/robots exclusion) → validate →
   deploy.
5. Phase 7 Polish closes out bundle-size verification and documentation.

### Parallel Team Strategy

With two contributors: one takes Setup → US1 → US2 (the i18n thread, T001-T048); the
other takes US3 → US4 in parallel (the SEO thread, T049-T060, blocked only on T003) —
they converge only briefly at `index.html` (T054 before T057) and again at Phase 7.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- GnuCash-sourced data must never be routed through `t()` — verified explicitly in T047.
- No `robots.txt`/`sitemap.xml` may be added anywhere in this repo — a hard exclusion
  from the spec (FR-008), not a scope-trim; T058 verifies this stayed true.
- Commit after each task or logical group; stop at any checkpoint to validate a story
  independently before moving on.
