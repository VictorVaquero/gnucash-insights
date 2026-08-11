# Implementation Plan: Internationalization & SEO

**Branch**: `008-internationalization-and-seo` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-internationalization-and-seo/spec.md`

## Summary

Two coupled halves, sequenced so the second reuses the first's persistence pattern
rather than inventing a new one: (1) add `react-i18next` with `en.json`/`es.json`
catalogs and a `useLocale` hook that mirrors spec 007's `useTheme` shape exactly
(`usePersistentState`-backed, `navigator.language`-detected default, a nav-co-located
switcher next to `ThemeToggle`), then migrate every user-facing string across the ~61
non-test/story `.tsx` files under `src/routes`/`src/components`/`src/layout` through the
catalog, and replace the hand-rolled `parseNum` currency formatter (21 call sites) with a
locale-parameterized `Intl.NumberFormat` helper while keeping Luxon's built-in
locale-aware `toFormat`/`setLocale` for the 13 existing date-format call sites instead of
introducing a parallel `Intl.DateTimeFormat` path; then (2) close the SEO gaps confirmed
empty in `docs/review/05-seo.md` (no OG/Twitter tags, no canonical, no manifest, no icon
set beyond a single unreferenced-duplicate SVG pair) by generating a full icon set from
`public/cash3.svg` via a new `sharp`-based one-off script, adding `public/site.webmanifest`
with the correct `/dashboard/` `start_url`, adding OG/Twitter/canonical meta tags to
`index.html`, and verifying the `theme-color` meta pair spec 007 already shipped correctly
matches the actual rendered light/dark background colors — with no `robots.txt`/
`sitemap.xml` added here (that allow-list change is documented as a `resumeweb` follow-up
in `docs/decisions.md`, out of this repo's scope per FR-008). i18n lands first because the
SEO half's `theme-color` verification and the `lang` attribute fix both depend on
`useLocale` existing (the `<html lang>` mismatch this spec also fixes is driven by the
same hook that sets `<html class="dark">` today).

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js >=24 (unchanged).

**Primary Dependencies**: existing stack unchanged (React 19, Vite 7, Tailwind v4,
TanStack Router/Query, Luxon, `usePersistentState`). This spec's dependency changes:
**add** `react-i18next` (17.0.11) + `i18next` (26.3.6) as runtime dependencies (peer
requirements confirmed compatible with React 19 and TS 5.9 via `npm view`); **add**
`sharp` (0.35.3) + `png-to-ico` (3.0.2) as **devDependencies only** (build-time icon
generation, never shipped to the client bundle). Explicitly **not** adding
`i18next-browser-languagedetector` — `navigator.language` detection is a single
`navigator.language.split("-")[0]` read done once in `useLocale`'s `usePersistentState`
initializer, mirroring `useTheme`'s `systemPrefersDark()` pattern already in the codebase;
pulling in a whole detection plugin for one property read would contradict Constitution
IV's "boring, minimal" bar.

**Storage**: N/A — no data/schema changes. `useLocale`'s only persistence is a
`localStorage` key via the existing `usePersistentState` hook (same mechanism `useTheme`
already uses), per spec FR-001.

**Testing**: existing Vitest + React Testing Library (`useLocale.test.ts` mirrors
`src/hooks/useTheme.test.ts`'s structure — mock `navigator.language`, not `matchMedia`);
Playwright e2e (`e2e/theme-persistence.spec.ts` is the direct pattern for a new
`e2e/locale-persistence.spec.ts`); manual verification of both languages across every
route, icon rendering, and link-preview cards is tracked in
`docs/review/19-manual-verification.md` per Constitution Principle III and this spec's own
Assumptions (real-device/manual verification not automatable in CI).

**Target Platform**: Vercel-hosted SPA mounted at `/dashboard` under `resumeweb`'s
`victorvaquero.com` domain (unchanged) — the manifest `start_url`, canonical URL, and
`og:image` absolute URL all need the `/dashboard` mount path, verified against a real
preview deploy per `docs/review/05-seo.md` Phase 3 (the Vercel rewrite only exists in the
`resumeweb` repo, not locally reproducible).

**Project Type**: Single existing project (`cashpy_v2` SPA) — unchanged. No new top-level
application directories.

**Performance Goals**: no regression to spec 007's `size-limit` budgets
(`main bundle`: 350 KB gzip, currently measured at 318.87 KB gzip — only **31.1 KB of
headroom**; `chart route chunk`: 105 KB gzip, unaffected by this spec).
`react-i18next`+`i18next` together are commonly ~20-25 KB min+gzip — close enough to the
remaining headroom that the budget MUST be re-measured immediately after integration
(research.md item 7) and bumped in the same PR if it doesn't fit, matching spec 007's own
precedent of adjusting a budget when justified rather than blocking on it. Locale JSON
catalogs are plain data (highly compressible, not the risk) and are imported statically —
no lazy-loading complexity needed for catalog size alone.

**Constraints**: Must not break the golden path (login → data loads → charts render) or
guest path (Constitution Principle III) at any intermediate commit — string migration
proceeds file-by-file (nav/global chrome first per `docs/review/16-internationalization.md`
Phase 4, then route-by-route) so the app stays shippable mid-spec, per Constitution
Principle I. GnuCash-sourced data (transaction descriptions, category names) MUST NOT be
routed through the translation catalog even where it appears alongside translated UI
chrome (spec FR-003, Edge Cases). No `robots.txt`/`sitemap.xml` file MUST be added under
`public/` (spec FR-008) — this is a hard exclusion, not a scope-trim.

**Scale/Scope**: 61 non-test/story `.tsx` files under `src/routes`, `src/components`,
`src/layout` are candidates for the string audit (`git ls-files` count, confirmed via
`find`); exact per-file untranslated-string counts are an implementation-time audit task
(tasks.md Phase 3), not enumerated here, matching `docs/review/16-internationalization.md`'s
own "Phase 1 — audit" step. 21 files call the hand-rolled `parseNum` currency formatter in
`src/common/utils.ts` (`grep -rl "parseNum" src` — full list in research.md item 4). 13
call sites use Luxon's `DateTime#toFormat` with a hardcoded format token string (`grep -rn
"toFormat(" src` — full list in research.md item 5). 7 routes set a `title:` string via
route `beforeLoad`/`loader` context (`Home`, `Metadata`, `Summary`, `Expenses`, `Travels`,
`Analysis`, `Login`) plus 6 `SideBar` nav-item labels (`Home`, `Metadata`, `Summary`,
`Expenses`, `Trips`, `Investments`, `Analysis`). `public/` currently contains only
`cash3.svg` and an unreferenced identical duplicate `favicon.svg` (byte-for-byte, `diff`
confirmed) — no `.ico`, no PNG sizes, no manifest, no OG image. `index.html` already has a
correct light/dark `theme-color` meta pair (`#ffffff` / `#151719`, matching the app body's
actual rendered `bg-white`/`dark:bg-shark-900`, not the `--background` CSS token which
differs slightly in light mode — `grep` of `src/index.css` confirms) — this satisfies
spec FR-007's first half already; the remaining SEO gaps are canonical, OG/Twitter tags,
Apple meta, and the manifest, all confirmed absent by `grep`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                             | Check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Result |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Incremental, Reversible Migration  | i18n (US1-2) and SEO (US3-4) are independently shippable halves; within i18n, string migration proceeds file-by-file (nav chrome first, then route-by-route) so a partially-migrated state (some strings translated, some still English literals) is still a fully working app — no synchronized cutover. Icon/manifest/meta-tag additions are purely additive (no existing behavior removed) except deleting the unreferenced duplicate `favicon.svg`.                                                                     | PASS   |
| II. Cost-Consciousness                | `react-i18next`/`i18next` are free, open-source, no metered service. `sharp`/`png-to-ico` are devDependencies only (build-time icon generation), never shipped or run at runtime, no hosting cost. No new infrastructure.                                                                                                                                                                                                                                                                                                   | PASS   |
| III. Continuity of the Working App    | Golden-path (login → data loads → charts render) and guest-path Playwright suites (spec 006) re-run at each string-migration commit; a missing translation key falls back to `i18next`'s configured fallback language (English) rather than crashing, so an incomplete migration step never breaks rendering.                                                                                                                                                                                                               | PASS   |
| IV. Boring, Well-Supported Technology | `react-i18next` is the most established React i18n option (explicitly decided in `docs/review/16-internationalization.md`, not novel). `sharp` is the standard Node image-processing library (used by Vercel's own image optimization internally). Luxon's built-in `setLocale` is reused instead of introducing a second, parallel `Intl.DateTimeFormat` formatting path — the less-novel choice. Explicitly rejecting `i18next-browser-languagedetector` as an unnecessary dependency for a one-line read keeps this bar. | PASS   |
| V. Data Privacy on a Public Surface   | No auth, data-fetching, or credential-handling code is touched. GnuCash-sourced data is explicitly excluded from translation (FR-003) so no user financial data is sent through a third-party translation mechanism (there isn't one — catalogs are static local JSON, not a translation API). The OG image is a static branded asset, not a live screenshot of authenticated app state (research.md item 10), so no guest/demo data is ever exposed in a public share-preview image.                                       | PASS   |

No violations; Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/008-internationalization-and-seo/
├── spec.md                              # Feature spec (already exists)
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output (/speckit-plan command)
├── data-model.md                        # Phase 1 output (/speckit-plan command)
├── quickstart.md                        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── use-locale-hook-contract.md      # Phase 1 output — mirrors 007's use-theme-hook-contract.md
│   └── seo-meta-contract.md             # Phase 1 output — the exact tag/asset set index.html and public/ must carry
└── tasks.md                             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# i18n foundation (User Stories 1-2)
package.json                         # +react-i18next, +i18next (deps); +sharp, +png-to-ico (devDeps)
src/i18n/config.ts                   # new — i18next.init(), locale list ("es"|"en"), fallbackLng "en"
src/i18n/locales/en.json             # new — English catalog, namespaced by route/section
src/i18n/locales/es.json             # new — Spanish catalog, same key shape
src/hooks/useLocale.ts               # new — usePersistentState-backed, navigator.language-detected default, mirrors useTheme.ts shape
src/hooks/useLocale.test.ts          # new — mirrors useTheme.test.ts structure
src/components/LanguageSwitcher.tsx  # new — DropdownMenu control, mirrors ThemeToggle.tsx exactly
src/components/SideBar.tsx           # gains LanguageSwitcher next to ThemeToggle in the same footer div
src/main.tsx                         # wires src/i18n/config.ts (i18next.init) before render
index.html                           # lang="es" hardcoded -> removed/neutralized; useLocale sets document.documentElement.lang at runtime
src/common/utils.ts                  # parseNum replaced by locale-parameterized formatCurrency (Intl.NumberFormat)
src/routes/**/*.tsx                  # 61 files: hardcoded UI strings -> useTranslation()/t() lookups, route-by-route (research.md item 3 ordering)
src/components/**/*.tsx              # same, for shared nav/global chrome (highest priority per docs/review/16-internationalization.md Phase 4)
# 21 files calling parseNum (full list in research.md item 4) switch their import to formatCurrency
# 13 files calling DateTime#toFormat (full list in research.md item 5) gain .setLocale(locale) via a shared helper

# SEO (User Stories 3-4)
scripts/generate-icons.mjs           # new — one-off, sharp + png-to-ico, rasterizes public/cash3.svg into the full icon set
public/favicon.ico                   # new — generated
public/favicon-16x16.png             # new — generated
public/favicon-32x32.png             # new — generated
public/apple-touch-icon.png          # new — generated (180x180)
public/android-chrome-192x192.png    # new — generated
public/android-chrome-512x512.png    # new — generated
public/favicon.svg                   # deleted — unreferenced byte-identical duplicate of cash3.svg (docs/review/05-seo.md decision)
public/site.webmanifest              # new — name, short_name, icons, start_url "/dashboard/", theme_color, background_color, display "standalone"
public/og-image.png                  # new — static branded 1200x630 asset (research.md item 10), not a live screenshot
index.html                           # +canonical link, +OG tags, +Twitter Card tags, +Apple meta tags, +manifest link; theme-color pair verified unchanged
docs/decisions.md                    # +follow-up entry: resumeweb robots.txt allow-list change (FR-008), +i18n/SEO decision log entries
```

**Structure Decision**: no new top-level directories. i18n additions live in a new
`src/i18n/` folder (config + locale catalogs) plus a new hook/component pair that mirror
spec 007's `useTheme.ts`/`ThemeToggle.tsx` exactly; string migration is a modify-in-place
sweep across existing route/component files, not a restructure. SEO additions live
entirely in `public/` (generated assets) and `index.html` (meta tags) plus one new
build-time-only script (`scripts/generate-icons.mjs`) — no runtime code path for the SEO
half at all.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally omitted.
