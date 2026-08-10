# Internationalization: es/en

**Priority**: P1 · **Status**: Planning only

## Why this matters

Owner ask this round: *"Languages should be available es/en."* This is a real toggle
request — a step up from the narrower issue previously noted (the `<html lang>`
attribute not matching actual page content), which only fixed metadata, not what a
user actually sees.

## Current state (confirmed findings)

- Not yet confirmed which language the app's UI strings are currently hardcoded in —
  needs a quick audit pass (likely English, given the codebase/comments are in English,
  but the `src/config.json` finding in
  [03-secrets-and-public-repo-readiness.md](03-secrets-and-public-repo-readiness.md)
  showed Spanish tax-category labels present in *data*, which is a separate concern from
  UI-string language).
- **[confirmed]** No i18n library (`react-i18next`, `next-intl`-style, `formatjs`,
  etc.) is present in `package.json` — there is currently no mechanism for
  language-switchable UI strings at all; every UI string is a hardcoded literal in JSX.
- `bro_cv_web` (an unrelated third-party client repo, **not** the `resumeweb` sibling
  project that owns `victorvaquero.com` — see `docs/architecture.md`'s "Cross-repo
  naming incident" note) already has a **working, live** es/en/ca locale-routing
  implementation worth using as an external reference pattern (not copying wholesale — it's a
  routed marketing site, this is a routed dashboard mounted under `/dashboard`, so the
  URL-structure part doesn't directly transfer): locale-prefixed routes, 301 redirects
  from legacy `?lang=` query params (per its `vercel.json` `redirects` block), and
  `hreflang` alternates in its sitemap. The transferable part is the **string-catalog
  approach** (separate translation files per locale) and the general shape of a
  `LanguageSwitcher` control, not the URL routing scheme.

## Goals

- Every user-facing UI string (nav labels, table headers, buttons, error messages,
  empty states) is translatable, not just a handful of top-level labels.
- A visible language switcher, with the choice persisted across sessions.
- Locale-aware number/currency/date formatting (this app is financial data — currency
  formatting in particular needs to follow the selected locale, not be hardcoded to one
  format regardless of language choice).

## Recommended approach

### URL structure — deliberately different from `bro_cv_web`'s pattern (external reference, unrelated repo)

`bro_cv_web` uses locale-prefixed routes (`/`, `/en`, `/ca`) because it's an SEO-relevant
marketing site where each locale's pages should be independently indexable.

**Note (2026-08-10)**: [05-seo.md](05-seo.md)'s indexing decision reversed since this
section was first written — the landing page (`/dashboard`, `/dashboard/login`) is now
decided to stay **indexed**, not excluded. That doesn't change the recommendation below:
the *authenticated* app (everything past login) still has no SEO reason to route by
locale, since none of it is ever crawlable regardless of the landing page's status. If
the landing page's own copy ever needs locale-specific indexable URLs (e.g. a
`/dashboard?lang=es` variant showing up separately in search), that would be a narrow,
separate addition scoped to just that one page — not a reason to restructure the whole
app's routing. Recommend a **stored user preference** (persisted the same way theme
preference will be, per [15-theming-light-dark-mode.md](15-theming-light-dark-mode.md)
— `localStorage`, consistent with `usePersistentState`) instead of locale-prefixed
routes for the app as a whole — simpler, and avoids restructuring TanStack Router's
route tree just for language.

### Library choice — decided: `react-i18next`

The most established option for a Vite+React app of this shape (TanStack Router doesn't
prescribe an i18n solution, so this was an open choice, not a framework-constrained
one). Gets pluralization and interpolation correct for free, which the lighter
hand-rolled alternative that was weighed against it would have needed to reinvent.

### Scope of what needs translating

- Nav labels, page titles, table column headers, button labels, empty/error states —
  the bulk of the work.
- Currency/number formatting via `Intl.NumberFormat` with the selected locale (already
  likely partially in place if any formatting currently uses `Intl` — worth checking
  during the audit phase — vs. hardcoded `toFixed()`/manual formatting that would need
  to become locale-aware).
- Date formatting via `Intl.DateTimeFormat`, same consideration.
- **Explicitly out of scope**: translating underlying *data* (transaction descriptions,
  category names sourced from GnuCash) — that's user-entered content, not app UI, and
  translating it would misrepresent the source data.

## Phased plan

1. **Phase 1 — audit**: grep for hardcoded UI strings across `src/` to size the actual
   scope (rough file/string count) before starting migration.
2. **Phase 2 — library + mechanism**: add `react-i18next`, set up `en.json`/
   `es.json` catalogs, wire a `useLocale`-style hook with `localStorage` persistence
   (mirroring the theme-preference pattern from
   [15-theming-light-dark-mode.md](15-theming-light-dark-mode.md)).
3. **Phase 3 — switcher UI**: visible control, likely co-located with the theme toggle
   in the nav (both are "preferences" controls, natural to group together).
4. **Phase 4 — string migration**: replace hardcoded strings with translation-catalog
   lookups, route by route — start with nav/global chrome (highest visibility), then
   page-by-page.
5. **Phase 5 — number/date formatting**: switch any hardcoded currency/date formatting
   to locale-aware `Intl` calls.
6. **Phase 6 — verification**: manually walk every route in both languages checking for
   untranslated strings, layout breakage from text-length differences (Spanish strings
   often run longer than English — worth explicitly checking nav/button widths don't
   break), and correct currency/date formatting in each locale.

## Open decisions — decided 2026-08-10

- **Default language: browser `navigator.language` detection.**
- **Library: `react-i18next`.**
