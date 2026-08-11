# Phase 0 Research: Internationalization & SEO

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

All unknowns raised by the Technical Context are resolved below. No
`NEEDS CLARIFICATION` markers remain — spec 008 was already de-risked by
`docs/review/05-seo.md` and `docs/review/16-internationalization.md`, both of which
record "Open decisions — decided 2026-08-10" sections; this document formalizes those
decisions in spec-kit's Decision/Rationale/Alternatives format and adds the
implementation-level decisions those review docs left open.

## 1. i18n library

**Decision**: `react-i18next` (17.0.11) + `i18next` (26.3.6) as runtime dependencies.

**Rationale**: Already decided in `docs/review/16-internationalization.md` ("library
decision: react-i18next"). It is the most established React i18n solution (Constitution
IV), gets pluralization/interpolation/namespacing for free instead of hand-rolling a
lookup function, and integrates with `<Trans>`/`useTranslation()` without requiring
route-level code changes beyond wrapping strings. `npm view` confirms peer compatibility
with this project's React 19 and TypeScript 5.9.

**Alternatives considered**: a hand-rolled flat-dictionary approach (the pattern
`bro_cv_web` uses) was rejected — it would require rebuilding pluralization/interpolation
that `react-i18next` already provides, for no benefit, and the spec's own Assumptions
section says `bro_cv_web` is a shape reference only, not a library choice to replicate.
`FormatJS`/`react-intl` was not seriously evaluated since `react-i18next` was already the
documented decision in the review doc that spawned this spec.

## 2. Locale detection & persistence mechanism

**Decision**: `useLocale` hook, `usePersistentState<Locale>("locale", detectDefault())`
where `detectDefault()` reads `navigator.language.split("-")[0]`, falling back to
`"en"` if the result isn't `"es"` or `"en"`. No `i18next-browser-languagedetector`
dependency.

**Rationale**: `useTheme.ts` already establishes this exact shape —
`usePersistentState` for the persisted value, a plain function for the "system" default
read once at initialization. Mirroring it keeps the codebase's two preference hooks
structurally identical, which is explicitly called out in the spec's own sequencing note
("`useLocale` mirrors 007's `useTheme`"). `navigator.language` is a single synchronous
browser API call; there is no async detection step, no cookie/header sniffing (no SSR to
sniff on — this is a client-only SPA), so a dedicated detection library adds a dependency
for something a one-line function already does.

**Alternatives considered**: `i18next-browser-languagedetector` was evaluated (confirmed
installable via `npm view`, `8.2.1`) but rejected — it detects from `querystring`, `cookie`,
`localStorage`, `navigator`, and `htmlTag` by default, none of which this app needs beyond
the single `navigator` check, and Constitution IV favors the smaller, boring option when
both satisfy the requirement equally well.

## 3. String migration ordering

**Decision**: nav/global chrome first (`SideBar.tsx` labels, `__root.tsx` route titles,
shared components under `src/components/`), then route-by-route in the order: Home →
Login → Summary → Expenses → Travels → Analysis → Metadata → Investments. Each commit
keeps the app fully working in both languages (Constitution Principle I) — a
not-yet-migrated route simply still shows English literals, which is not a bug, just an
incomplete migration state.

**Rationale**: nav/global chrome is visible on every route, so migrating it first gives
the language switcher visible effect immediately and is the highest-leverage first step
(matches `docs/review/16-internationalization.md` Phase 4 ordering exactly). The
route order after that follows the existing nav order in `SideBar.tsx`, which
approximates usage frequency (Home/Summary are the primary landing surfaces).

**Alternatives considered**: a single big-bang PR translating all 61 files at once was
rejected as violating Constitution Principle I (no synchronized cutover) and making
review/testing materially harder; alphabetical file order was rejected as arbitrary and
disconnected from user-visible impact.

## 4. Currency formatting (`parseNum` replacement)

**Decision**: replace `src/common/utils.ts`'s hand-rolled `parseNum` with a new
`formatCurrency(value, locale, options)` built on `Intl.NumberFormat(locale, { style:
"currency", currency: "EUR", notation: options?.compact ? "compact" : "standard",
maximumFractionDigits: options?.digits ?? 2 })`. Currency stays hardcoded to EUR (the
underlying GnuCash book is EUR-denominated; this spec does not add multi-currency
support), only the number formatting (decimal separator, digit grouping, compact-notation
suffix language) becomes locale-aware. All 21 confirmed call sites
(`TransactsPlot.tsx`, `TravelExpensesPiePlot .tsx`, `travels/-components/KpiBlock.tsx`,
`summary/-KpiBlock.tsx`, `expenses/index.tsx`, `summary/-BudgetVsActual.tsx`,
`TravelExpensesDetailedPlot.tsx`, `analysis/-components/KpiBlock.tsx`,
`summary/-SavingsBlock.tsx`, `summary/-plots/NetWorthTrendPlot.tsx`,
`TravelExpensesMonthlyPlot.tsx`, `TravelExpensesPlot.tsx`,
`summary/-plots/DetailedExpensesBarPlot.tsx`, `summary/-plots/IncomeExpensesPlot.tsx`,
`summary/-TopMovers.tsx`, `summary/-BalancesBlock.tsx`,
`summary/-plots/MonthDetailedExpensesPiePlot .tsx`,
`summary/-plots/DetailedIncomeBarPlot.tsx`, `summary/-RecurringExpenses.tsx`,
`summary/-plots/AssetAccountsPlot.tsx`, and `common/utils.ts` itself) switch their import
from `parseNum` to `formatCurrency(value, locale)`, sourcing `locale` from `useLocale()`
at each call site (these are all components, so the hook call is always valid).

**Rationale**: `Intl.NumberFormat`'s `notation: "compact"` option produces the same
K/M-style abbreviation `parseNum`'s manual `Map`/string-slicing logic does today, but
locale-aware for free (e.g. Spanish groups digits with `.` and uses `,` for decimals,
which `Intl` handles natively — the current hand-rolled version hardcodes `.` as the
decimal separator, which is simply wrong for an `es` locale user). This directly
satisfies FR-004.

**Alternatives considered**: keeping `parseNum`'s custom logic and just swapping its
hardcoded `.`/`,` based on a locale flag was rejected — it would mean maintaining a
second, parallel, hand-rolled implementation of what `Intl.NumberFormat` already does
correctly, contradicting Constitution IV's "prefer standard library / well-supported"
bias, and risking subtle formatting bugs (e.g. locale-correct grouping in Indian/Arabic
numbering systems) that `Intl` handles automatically.

## 5. Date formatting

**Decision**: keep Luxon's `DateTime#toFormat(token)` calls as-is structurally, but wrap
every call site in a shared `formatDate(dt, token, locale)` helper (or, for the simpler
sites, a direct `.setLocale(locale).toFormat(token)` chain) so the 13 confirmed call
sites become locale-aware: `TransactsPlot.tsx` (dynamic `format` var),
`analysis/-components/KpiBlock.tsx` (`"yyyy-LL"`),
`travels/-components/TravelExpensesDetailedPlot.tsx` (`"LLL yy"`),
`travels/-components/TravelExpensesMonthlyPlot.tsx` (×2: `"LLL yy"`, `"yyyy"`),
`travels/-components/TravelExpensesPlot.tsx` (×2: `"LLL yy"`),
`summary/-DateRangePresets.tsx` (`"MMM yyyy"`),
`summary/-plots/MonthDetailedExpensesPiePlot .tsx` (`"yyyy-MM"`), `DateSlider.tsx`
(×2: `"MMM yyyy"`). `test/fixtures.ts`'s two calls (`"LLLL"`, `"cccc"`) are test-only and
out of scope.

**Rationale**: Luxon's `toFormat` already delegates to `Intl.DateTimeFormat` internally
for locale-sensitive tokens (month/weekday names), and `DateTime#setLocale(locale)` is
Luxon's documented, first-class mechanism for this — introducing a second, parallel
`Intl.DateTimeFormat`-based formatting path alongside the existing Luxon-based one would
mean two ways to do the same thing in the codebase, which Constitution IV weighs against.
`"yyyy-LL"`/`"yyyy-MM"`/`"yyyy"`-only tokens are numeric and don't change under locale,
but running them through the same helper keeps a single call pattern across all 13 sites
rather than special-casing which ones need `.setLocale()` and which don't.

**Alternatives considered**: building a wrapper around raw `Intl.DateTimeFormat` was
considered (matching the FR-004 wording literally, which mentions `Intl.DateTimeFormat`)
but rejected in favor of Luxon's own locale support, since Luxon is already the project's
date library end-to-end and `setLocale` produces `Intl.DateTimeFormat`-equivalent output
without adding a second formatting API surface. This satisfies the spirit of FR-004
(locale-aware date rendering) without the literal-API duplication risk.

## 6. Route titles & document.title

**Decision**: route `beforeLoad` `title` strings become translation keys
(`t("routes.home.title")` etc.) resolved inside `__root.tsx`'s existing `useEffect` that
sets `document.title`, re-run when `locale` changes (added to that effect's dependency
array) so the tab title updates immediately on language switch, not just on next
navigation.

**Rationale**: the existing mechanism (per-route `title` in `RootContext`, a single
`__root.tsx` effect setting `document.title`) already centralizes this responsibility —
only the string source (literal → `t()` call) and a `locale` dependency need to change,
no structural change to the title mechanism itself.

**Alternatives considered**: moving title resolution into each route's `beforeLoad` with
a `t()` call was rejected — `beforeLoad` runs on navigation, not on locale change, so a
same-page language switch wouldn't update the tab title; keeping resolution in the
`useEffect` where `locale` is already reactively available avoids that gap.

## 7. Bundle size risk

**Decision**: re-measure `pnpm size` immediately after adding `react-i18next`+`i18next`
and wiring `src/i18n/config.ts`, before starting the string-migration sweep. If the
`main bundle` gzip figure exceeds the 350 KB budget, bump the `size-limit` config's
`main bundle` entry in the same commit, following spec 007's own precedent (that spec
adjusted a size-limit budget when the real number differed from the original estimate),
with a one-line note in `docs/decisions.md` recording the before/after numbers and why.

**Rationale**: the current measured main bundle is 318.87 KB gzip against a 350 KB
budget — only 31.1 KB of headroom, and `react-i18next`+`i18next` together commonly land
in the 20-25 KB min+gzip range depending on tree-shaking, which is close enough that this
must be checked empirically rather than assumed safe. Locale JSON catalogs themselves are
not the risk (small, highly-compressible plain data, statically imported) — the risk is
purely the library code.

**Alternatives considered**: lazy-loading `i18next` and the catalogs via dynamic
`import()` was considered to avoid touching the main-bundle budget at all, but rejected
for this spec's scope — the language switcher and every translated string need the
catalog available essentially immediately on first paint (there's no meaningful
"pre-i18n" loading state to show), so splitting it out would add loading-state complexity
disproportionate to the ~20-25 KB at stake; if the post-integration measurement shows a
budget breach, bumping the budget (spec 007's precedent) is the simpler, justified fix.

## 8. Icon generation pipeline

**Decision**: a new one-off Node script `scripts/generate-icons.mjs`, run manually during
implementation (not part of the build/CI pipeline), using `sharp` to rasterize
`public/cash3.svg` into `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`
(180×180), `android-chrome-192x192.png`, `android-chrome-512x512.png`, then `png-to-ico`
to combine the 16/32 PNGs into `favicon.ico`. Both packages added as **devDependencies**
only. Generated PNG/ICO files are committed to `public/` as static assets (not
regenerated at build time).

**Rationale**: matches `docs/review/05-seo.md`'s icon checklist exactly. Running this as
a one-off script rather than a build step keeps the runtime build free of an image-
processing dependency (Constitution II/IV — `sharp` has native bindings, undesirable to
require on every CI/Vercel build when the source SVG changes rarely). `cash3.svg` was
already owner-confirmed as the correct source asset (spec Assumptions).

**Alternatives considered**: an online favicon generator (manual, no script) was
considered but rejected — not reproducible/version-controlled, and regenerating after a
future logo tweak would require redoing manual steps instead of re-running one command.
Adding `sharp` as a build-time dependency (regenerating icons on every build) was
rejected as unnecessary work on every deploy for an asset that changes essentially never.

## 9. Web app manifest

**Decision**: `public/site.webmanifest` with `start_url: "/dashboard/"`,
`scope: "/dashboard/"`, `display: "standalone"`, `name`/`short_name` from the existing
`<title>CashPy</title>`, `theme_color`/`background_color` matching the light-mode
`theme-color` value already in `index.html` (`#ffffff`), icons array referencing the
generated `android-chrome-192x192.png`/`512x512.png`. Linked via
`<link rel="manifest" href="/dashboard/site.webmanifest">` in `index.html`.

**Rationale**: `vercel.json`'s rewrite rules mount the SPA at `/dashboard` under the
`resumeweb`-owned domain (confirmed via reading `vercel.json`); an incorrect `start_url`
would make "Add to Home Screen" launch to a 404 or the wrong path, which is exactly the
failure mode SC-003 tests for.

**Alternatives considered**: none — the manifest shape here is standard PWA-manifest
boilerplate with no meaningful alternative structure; the only real decision was the
`start_url`/`scope` path, which is fixed by the existing Vercel rewrite configuration.

## 10. Open Graph image

**Decision**: a static branded 1200×630 `public/og-image.png` (logo + "CashPy" wordmark
on a solid brand-color background), generated once as part of the icon-generation work
(hand-composed or scripted via `sharp`'s composite API over the existing SVG), not a live
screenshot of any app page.

**Rationale**: the spec's Edge Cases wording — "generate/select one (e.g., a clean
Summary-page screenshot)" — gives an example, not a strict requirement. A live screenshot
of the Summary page would need either a permanently-seeded demo account (a standing
fixture to maintain) or a build-time Playwright screenshot step (a new heavyweight
build-time dependency for a once-per-brand-refresh asset), and risks exposing whatever
guest/demo financial figures happen to be in that account on a public, cacheable
link-preview image — a data-exposure consideration adjacent to Constitution Principle V
even though the underlying data isn't real. A static branded asset avoids both problems
entirely and is the simpler, more boring choice (Constitution IV).

**Alternatives considered**: a live Summary-page screenshot (the spec's literal example)
was seriously considered and rejected for the reasons above; reusing `cash3.svg` directly
as the OG image (skip generating a new asset) was rejected because OG images need to fill
a 1200×630 rectangle with brand color, not float a square logo on transparency, which most
social platforms render as a broken/empty-looking card.

## 11. `theme-color` meta pair status

**Decision**: no change needed to the two `theme-color` meta tags already in
`index.html` — verify only, during implementation, that `#ffffff`/`#151719` still exactly
match the live-rendered `body` background in both themes (they do today, confirmed by the
matching literal Tailwind classes `bg-white`/`dark:bg-shark-900` on `<body>`).

**Rationale**: FR-007 asks for a light/dark `theme-color` meta pair referencing spec 007's
actual colors — spec 007 already shipped this pair as part of its dark-mode work, and the
values already match the rendered background exactly. Re-verification (not re-
implementation) is the correct-sized task.

**Alternatives considered**: switching the hardcoded hex values to reference the
`--background` CSS custom property's resolved value was considered (for closer semantic
coupling to the design-token system) but rejected — `theme-color` meta content must be a
literal static string (no CSS variable resolution happens for this browser-chrome API),
and the current literals already match the actual rendered surface exactly, so there is
no bug to fix, only documentation/verification to close out.

## 12. `<html lang>` wiring

**Decision**: remove the hardcoded `lang="es"` from `index.html`'s `<html>` tag (leave
it unset or default to `"en"` as a pre-hydration fallback); `useLocale` sets
`document.documentElement.lang = locale` in a `useEffect`, mirroring exactly how
`useTheme` sets `document.documentElement.classList.toggle("dark", ...)`.

**Rationale**: today's `lang="es"` is simply wrong (all current UI copy is English) —
this was flagged directly in the Key Technical Concepts investigation. Once `useLocale`
exists, it's the natural single owner of this attribute, consistent with how theme state
owns the `dark` class.

**Alternatives considered**: server-side/build-time locale injection into `index.html`
was not applicable — this is a static SPA with no server-rendering step, so there is no
pre-request signal to inject a correct initial `lang` from; a brief default before
hydration is an accepted, unavoidable tradeoff of client-only detection (same tradeoff
`useTheme`'s dark-class flash already accepts today).

## 13. `robots.txt` / `sitemap.xml` exclusion

**Decision**: no `robots.txt` or `sitemap.xml` file is added anywhere in this repo. A
follow-up entry is added to `docs/decisions.md` documenting that the `resumeweb` repo
(which owns `victorvaquero.com`'s root-level static files and reverse-proxies
`/dashboard` to this app) needs its own `robots.txt` updated to allow-list `/dashboard`
if the landing page's indexing depends on it, as a separate out-of-scope change to be
made in that other repository.

**Rationale**: directly mandated by spec FR-008/SC-004 and confirmed structurally correct
by `vercel.json`'s rewrite rules, which only cover `/dashboard` and `/dashboard/:path*` —
this repo has no route/rewrite for a root-level `/robots.txt`, so adding one here would
either be unreachable (shadowed by the `resumeweb` deployment) or, if somehow reachable,
would incorrectly describe a domain this repo doesn't fully own.

**Alternatives considered**: none — this is a hard scope boundary set by the spec itself,
not an implementation choice.
