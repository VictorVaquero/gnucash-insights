# Data Model: Internationalization & SEO

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This is a client-only, UI-preference spec with no server/database schema changes. The
"entities" below are client runtime state shapes and static asset/tag inventories used to
drive `tasks.md`, following the same pattern spec 007's `data-model.md` used for its
(also client-only) `Theme` state.

## Locale (client runtime state)

| Field    | Type           | Notes                                                                                                                  |
| -------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `locale` | `"en" \| "es"` | Persisted via `usePersistentState<Locale>("locale", detectDefault())`, localStorage key `use-persistent-state-locale`. |

**State transitions**: `locale` changes only via explicit user action in
`LanguageSwitcher` (no automatic re-detection after first load — mirrors `useTheme`,
where a user's explicit choice always wins over the system/browser default once made).

**Validation rules**: `detectDefault()` must always resolve to exactly `"en"` or `"es"` —
any other `navigator.language` value (e.g. `"fr"`, `"de"`) falls back to `"en"` (spec
Edge Cases: "unsupported browser language → English fallback").

**Side effects on change**: `document.documentElement.lang` is synced to `locale`
(useEffect, mirrors `useTheme`'s `dark` class toggle); `i18next.changeLanguage(locale)`
is called so `useTranslation()` consumers re-render with the new catalog; `document.title`
re-resolves via `__root.tsx`'s existing title effect (research.md item 6).

## Translation Catalog

| Field        | Type                                                     | Notes                                                                                                                                       |
| ------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| catalog file | `src/i18n/locales/en.json` / `es.json`                   | Flat-ish, namespaced-by-section JSON object; both files MUST have identical key sets (a missing key in one is a bug per spec Edge Cases).   |
| namespace    | `nav.*`, `routes.<route>.title`, `<route>.*`, `common.*` | Mirrors the route/nav inventory below — one top-level key per route plus a shared `nav`/`common` bucket, avoiding one giant flat namespace. |

**Validation rules**: every key referenced by a `t("...")` call in source must exist in
both `en.json` and `es.json` — enforced manually during the migration sweep (no automated
key-parity lint is in scope for this spec; could be a future follow-up, not required by
any FR here).

## Currency & Date Formatting Inventory (tracking entity for tasks.md)

| File                                                            | Current call                                            | Target                                               |
| --------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `src/common/utils.ts`                                           | `parseNum` definition                                   | replaced by `formatCurrency(value, locale, options)` |
| `src/routes/summary/-plots/AssetAccountsPlot.tsx`               | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-plots/DetailedExpensesBarPlot.tsx`         | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-plots/DetailedIncomeBarPlot.tsx`           | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-plots/IncomeExpensesPlot.tsx`              | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-plots/MonthDetailedExpensesPiePlot .tsx`   | `parseNum`, `toFormat("yyyy-MM")`                       | `formatCurrency`, `.setLocale(locale)`               |
| `src/routes/summary/-plots/NetWorthTrendPlot.tsx`               | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-KpiBlock.tsx`                              | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-SavingsBlock.tsx`                          | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-BalancesBlock.tsx`                         | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-BudgetVsActual.tsx`                        | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-RecurringExpenses.tsx`                     | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-TopMovers.tsx`                             | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/summary/-DateRangePresets.tsx`                      | `toFormat("MMM yyyy")`                                  | `.setLocale(locale)`                                 |
| `src/routes/expenses/index.tsx`                                 | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/analysis/-components/KpiBlock.tsx`                  | `parseNum`, `toFormat("yyyy-LL")`                       | `formatCurrency`, `.setLocale(locale)`               |
| `src/routes/travels/-components/KpiBlock.tsx`                   | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/travels/-components/TransactsPlot.tsx`              | `parseNum`, `toFormat(format)`                          | `formatCurrency`, `.setLocale(locale)`               |
| `src/routes/travels/-components/TravelExpensesPiePlot .tsx`     | `parseNum`                                              | `formatCurrency`                                     |
| `src/routes/travels/-components/TravelExpensesDetailedPlot.tsx` | `parseNum`, `toFormat("LLL yy")`                        | `formatCurrency`, `.setLocale(locale)`               |
| `src/routes/travels/-components/TravelExpensesMonthlyPlot.tsx`  | `parseNum`, `toFormat("LLL yy")` ×2, `toFormat("yyyy")` | `formatCurrency`, `.setLocale(locale)`               |
| `src/routes/travels/-components/TravelExpensesPlot.tsx`         | `parseNum`, `toFormat("LLL yy")` ×2                     | `formatCurrency`, `.setLocale(locale)`               |
| `src/components/DateSlider.tsx`                                 | `toFormat("MMM yyyy")` ×2                               | `.setLocale(locale)`                                 |

## Route Title / Nav Label Inventory (tracking entity for tasks.md)

| Route file                      | Current title | Nav label (`SideBar.tsx`)                                     |
| ------------------------------- | ------------- | ------------------------------------------------------------- |
| `src/routes/home.tsx`           | `"Home"`      | `"Home"`                                                      |
| `src/routes/metadata.tsx`       | `"Metadata"`  | `"Metadata"`                                                  |
| `src/routes/summary/index.tsx`  | `"Summary"`   | `"Summary"`                                                   |
| `src/routes/expenses/index.tsx` | `"Expenses"`  | `"Expenses"`                                                  |
| `src/routes/travels/index.tsx`  | `"Travels"`   | `"Trips"`                                                     |
| `src/routes/analysis/index.tsx` | `"Analysis"`  | `"Analysis"`                                                  |
| `src/routes/login/index.tsx`    | `"Login"`     | n/a (unauthenticated)                                         |
| n/a                             | n/a           | `"Investments"` (nav-only entry, route file TBD at task time) |

All become `t("routes.<key>.title")` / `t("nav.<key>")` lookups; `en.json`'s values equal
the current literals exactly (no copy change, translation only).

## SEO Asset Inventory (tracking entity for tasks.md)

| Asset                    | Path                                    | Source                                                      | Status                 |
| ------------------------ | --------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| Favicon (SVG, existing)  | `public/cash3.svg`                      | owner-supplied                                              | keep, canonical source |
| Favicon (SVG, duplicate) | `public/favicon.svg`                    | byte-identical to `cash3.svg`, unreferenced                 | delete                 |
| Favicon ICO              | `public/favicon.ico`                    | generated from `cash3.svg` via `scripts/generate-icons.mjs` | new                    |
| Favicon 16×16            | `public/favicon-16x16.png`              | generated                                                   | new                    |
| Favicon 32×32            | `public/favicon-32x32.png`              | generated                                                   | new                    |
| Apple touch icon         | `public/apple-touch-icon.png` (180×180) | generated                                                   | new                    |
| Android chrome icon      | `public/android-chrome-192x192.png`     | generated                                                   | new                    |
| Android chrome icon      | `public/android-chrome-512x512.png`     | generated                                                   | new                    |
| Web app manifest         | `public/site.webmanifest`               | hand-written, `start_url: "/dashboard/"`                    | new                    |
| OG / Twitter Card image  | `public/og-image.png` (1200×630)        | static branded asset (research.md item 10)                  | new                    |

## Meta Tag Inventory (`index.html`, tracking entity for tasks.md)

| Tag                                                                 | Status                                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `<html lang="es">`                                                  | change: remove hardcoded value, `useLocale` sets it at runtime (research.md item 12) |
| `<link rel="icon" href="/cash3.svg">`                               | unchanged                                                                            |
| `<meta name="theme-color" ... light>` / `dark`                      | unchanged, verify only (research.md item 11)                                         |
| `<link rel="canonical" href="...">`                                 | new                                                                                  |
| `<link rel="manifest" href="/dashboard/site.webmanifest">`          | new                                                                                  |
| `<meta property="og:title/description/image/url/type">`             | new                                                                                  |
| `<meta name="twitter:card/title/description/image">`                | new                                                                                  |
| `<meta name="apple-mobile-web-app-capable/title/status-bar-style">` | new                                                                                  |
| `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`        | new                                                                                  |
| `<link rel="icon" sizes="16x16/32x32" href="...">`                  | new                                                                                  |
