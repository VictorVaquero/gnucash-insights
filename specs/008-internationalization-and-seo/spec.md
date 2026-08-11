# Feature Specification: Internationalization & SEO

**Feature Branch**: `008-internationalization-and-seo`

**Created**: 2026-08-10

**Status**: Implemented — all 65 tasks across 4 user stories complete (see tasks.md);
`pnpm test`/`pnpm lint`/`pnpm build`/`pnpm size` all pass. `pnpm test:e2e` could not run
in this environment (Vercel CLI not installed; `playwright.config.ts`'s `webServer` needs
`vercel dev`). Several items remain owner-side per Constitution Principle III (real-device
icon/manifest/OG checks, mobile browser-chrome tint, full Spanish-mobile layout sweep,
real Playwright e2e run) — tracked in `docs/review/19-manual-verification.md`, not
blocking.

**Review docs covered**: [`docs/review/05-seo.md`](../../docs/review/05-seo.md), [`docs/review/16-internationalization.md`](../../docs/review/16-internationalization.md)

**Input**: User description: "Fourth spec in the sequence: add es/en language support and make the landing page properly discoverable/shareable, both content-facing changes that build on the theming spec's nav/localStorage patterns. i18n: add react-i18next (owner-decided), translate every user-facing UI string (not just top-level labels), a visible language switcher co-located with the theme toggle and persisted via localStorage (matching usePersistentState), default to browser navigator.language detection (owner-decided, reversing the doc's original 'ask the owner' framing), locale-aware Intl.NumberFormat/Intl.DateTimeFormat formatting; explicitly excludes translating underlying GnuCash data. SEO: generate a full favicon/icon set from cash3.svg (owner-decided canonical source) plus a web app manifest with the correct /dashboard start_url, Open Graph/Twitter Card tags, a light/dark-aware theme-color meta pair, a canonical link tag — given the owner-decided reversal that the landing page stays indexed. Explicitly do not add robots.txt/sitemap.xml to this repo; that allow-list logic belongs in resumeweb's robots.txt, out of this repo's scope to implement directly."

**Sequencing note**: run this spec **fourth**, after
[007-design-system-theming-and-charts](../007-design-system-theming-and-charts/spec.md).
The `useLocale` hook here mirrors that spec's `useTheme` hook (same
`usePersistentState`-based persistence) and the language switcher co-locates with its nav
theme toggle; the `theme-color` meta pair added here needs the light/dark CSS values that
spec establishes.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A translation mechanism exists, defaults sensibly, and persists (Priority: P1)

`react-i18next` is added with `en.json`/`es.json` catalogs and a `useLocale` hook that
persists the choice to `localStorage`, defaulting to browser-language detection.

**Independent Test**: with no stored preference, load the app in a browser set to
Spanish; confirm it renders in Spanish by default. Switch to English; reload; confirm it
stays English.

**Acceptance Scenarios**:

1. **Given** `react-i18next` configured with `en.json`/`es.json`, **When** a new user
   loads the app, **Then** the UI language matches `navigator.language`, falling back to
   English if neither `es` nor `en` matches.
2. **Given** a visible language switcher in the nav (co-located with the theme toggle),
   **When** a user selects a language, **Then** it persists via `usePersistentState`'s
   `localStorage` pattern and survives a reload.
3. **Given** the URL structure, **When** the switcher is used, **Then** no locale-prefixed
   route change occurs — this is a stored preference, not a routing scheme.

---

### User Story 2 - Every user-facing UI string is translated, and formatting is locale-aware (Priority: P1)

Nav labels, page titles, table headers, buttons, and empty/error states resolve through
the translation catalog; currency/date values format via `Intl.NumberFormat`/
`Intl.DateTimeFormat` parameterized by locale.

**Independent Test**: switch to Spanish and walk every top-level route; confirm no
untranslated English string remains (excluding GnuCash source data) and currency/date
values render in locale-appropriate format.

**Acceptance Scenarios**:

1. **Given** each top-level route, **When** walked in Spanish, **Then** every UI string
   is translated except user-entered GnuCash data (transaction descriptions, category
   names), which stays untranslated by design.
2. **Given** Spanish strings commonly run longer, **When** nav/button layouts are
   checked, **Then** no overflow or breakage occurs.
3. **Given** any currency or date value, **When** the locale switches, **Then** it
   re-renders via locale-parameterized `Intl` calls, not a hardcoded format.

---

### User Story 3 - The app has a complete icon set and renders correctly when shared (Priority: P1)

A full favicon/icon set generates from `cash3.svg`, a web app manifest declares the
correct `/dashboard` `start_url`, and Open Graph/Twitter Card tags make shared links
render properly.

**Independent Test**: check the browser tab icon and an "Add to Home Screen" result;
paste the app URL into a link-preview tool and confirm a correct title/description/image
card.

**Acceptance Scenarios**:

1. **Given** `cash3.svg` as canonical source, **When** a full icon set (favicon `.ico`,
   PNG sizes, SVG favicon) generates, **Then** every asset is correctly referenced in
   `index.html`.
2. **Given** a web app manifest, **When** added, **Then** it declares the correct
   `/dashboard` `start_url`, app name, and icon references.
3. **Given** `og:title`/`og:description`/`og:image`/`og:url` and matching Twitter Card
   tags, **When** added, **Then** they describe the app accurately with a real, reachable
   image.

---

### User Story 4 - The theme-color/canonical tags are correct, and no robots.txt/sitemap.xml is added here (Priority: P2)

The `theme-color` meta becomes a light/dark-aware pair, a canonical link tag is added for
the now-indexed landing page, and no `robots.txt`/`sitemap.xml` is added to this repo —
that logic belongs in `resumeweb`.

**Independent Test**: with OS dark/light mode toggled, confirm browser chrome color
matches; confirm no `robots.txt`/`sitemap.xml` exists under this repo's `public/`.

**Acceptance Scenarios**:

1. **Given** two `theme-color` meta tags (`prefers-color-scheme: light|dark`), **When**
   added, **Then** each references the actual colors from
   [007-design-system-theming-and-charts](../007-design-system-theming-and-charts/spec.md).
2. **Given** a `<link rel="canonical">` tag, **When** added, **Then** it points to the
   correct `/dashboard` URL.
3. **Given** this repo's `public/` directory, **When** this spec is implemented,
   **Then** no `robots.txt`/`sitemap.xml` is added, and a follow-up note documents that
   `resumeweb`'s robots.txt needs to allow-list `/dashboard`/`/dashboard/login`.

### Edge Cases

- A browser reporting a language other than `es`/`en` falls back to English.
- GnuCash data that happens to contain Spanish text (e.g. tax category labels) stays
  exactly as sourced — never translated or modified.
- A translation key missing from one catalog is treated as a bug to fix during
  verification, not silently accepted.
- `cash3.svg` illegible at very small favicon sizes gets simplified for icon generation
  only, without changing in-app logo usage.
- No existing marketing screenshot for the OG image → generate/select one (e.g. a clean
  Summary-page screenshot) rather than reusing the favicon at OG dimensions.
- Authenticated-only routes stay non-indexed by nature; OG/canonical/theme-color work
  applies to the public landing/login surface only.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `react-i18next` MUST be added with `en.json`/`es.json` catalogs; first load
  MUST default to `navigator.language` (fallback English), persisted via a `useLocale`
  hook using the `usePersistentState` `localStorage` pattern.
- **FR-002**: A visible language switcher MUST exist in the nav, co-located with the
  theme toggle; no locale-prefixed routing MUST be introduced.
- **FR-003**: Every user-facing UI string MUST resolve through the translation catalog in
  both languages; GnuCash-sourced data MUST NOT be translated.
- **FR-004**: Currency and date values MUST render via locale-parameterized
  `Intl.NumberFormat`/`Intl.DateTimeFormat`.
- **FR-005**: A full icon set MUST generate from `cash3.svg`, correctly referenced in
  `index.html`; a web app manifest MUST declare the correct `/dashboard` `start_url`.
- **FR-006**: Open Graph and Twitter Card meta tags MUST be present with accurate,
  non-placeholder values.
- **FR-007**: Two `theme-color` meta tags (light/dark) MUST reference the actual colors
  from the design-system/theming spec; a canonical link tag MUST be present on the
  indexed landing page.
- **FR-008**: No `robots.txt`/`sitemap.xml` MUST be added to this repo; a documented
  follow-up MUST record the needed `resumeweb` robots.txt allow-list change.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A Spanish-browser user with no stored preference sees the app in Spanish on
  first load; the choice persists across reload and a new session.
- **SC-002**: A manual walkthrough of every route in Spanish finds zero untranslated UI
  strings (excluding GnuCash data), with currency/date formats updating correctly.
- **SC-003**: The tab icon and "Add to Home Screen" icon render correctly; pasting the
  app URL into a link-preview tool produces a complete OG card.
- **SC-004**: Browser/OS chrome color matches the active theme; this repo contains no
  `robots.txt`/`sitemap.xml`, and the `resumeweb` follow-up is recorded in
  `docs/decisions.md`.

## Assumptions

- The favicon source (`cash3.svg`) and the "landing page stays indexed" decision are
  already owner-decided and not revisited here.
- `react-i18next`'s standard catalog/pluralization/interpolation features are sufficient.
- This spec does not touch `bro_cv_web`'s locale-routing implementation, referenced only
  as an external pattern for the string-catalog/`LanguageSwitcher` shape — its
  locale-prefixed URL routing does not transfer to this app.
- Implementing the `resumeweb` robots.txt change is out of this repo's scope to implement
  directly — this spec only documents the follow-up.
- Real-device/manual verification (layout in both languages, icon rendering, link
  previews) is tracked in `docs/review/19-manual-verification.md`.
