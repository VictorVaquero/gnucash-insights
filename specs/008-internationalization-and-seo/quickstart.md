# Quickstart: Internationalization & SEO

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Manual verification guide for spec 008. Automated tests (Vitest for `useLocale`,
Playwright for locale persistence and existing golden/guest paths) cover regression
safety; this guide covers what those can't (translation completeness by eye, layout
integrity with longer Spanish strings, real link-preview rendering, real
Add-to-Home-Screen behavior) per Constitution Principle III. Track completion in
`docs/review/19-manual-verification.md` alongside spec 007's outstanding items.

## Prerequisites

```bash
pnpm install
pnpm dev
```

Log in via guest access (same guest path used for spec 007 verification). Have both a
desktop browser and a mobile device (or device emulation) available. For User Story 4,
you will also need a real Vercel preview URL at some point (see step-by-step notes below)
since some checks (manifest reachability at `/dashboard`, absolute OG image URL) are not
meaningfully testable against `localhost`.

## User Story 1: Language selection & persistence (P1)

1. Set your OS/browser language to Spanish (or override via DevTools' "Accept-Language"/
   `navigator.language` emulation), then load the app fresh (clear `localStorage` first).
   **Expect**: the app renders in Spanish immediately, no flash of English before Spanish.
2. Open the language switcher (co-located with the theme toggle in the sidebar footer).
   Switch to English.
   **Expect**: UI updates to English immediately, no page reload; `<html lang="en">` in
   DevTools' Elements panel.
3. Reload the page.
   **Expect**: the app stays in English (your explicit choice persisted, browser-language
   detection is not re-applied).
4. Clear `localStorage`, set browser language to an unsupported one (e.g. French), reload.
   **Expect**: app defaults to English (fallback), not a blank/broken catalog.

## User Story 2: Full translation coverage (P1)

1. With the switcher set to Spanish, walk every route in `SideBar.tsx`'s nav order: Home,
   Metadata, Summary, Expenses, Travels, Analysis, Investments, plus Login (log out first
   to reach it).
   **Expect**: every nav label, page title (browser tab), heading, button, table header,
   empty-state, and error message is in Spanish — zero leftover English UI strings. Note
   any misses against `data-model.md`'s Route/Nav inventory to confirm nothing was
   skipped.
2. On the same walkthrough, inspect any GnuCash-sourced text (transaction descriptions,
   category names imported from the book).
   **Expect**: this data stays exactly as imported, untranslated — this is correct
   behavior, not a bug (spec Edge Cases).
3. On Summary/Travels/Analysis/Expenses (the `formatCurrency`-heavy routes), compare
   number formatting between English and Spanish.
   **Expect**: Spanish uses `,` as the decimal separator and `.` for digit grouping
   (e.g. `1.234,56 €`); English keeps `1,234.56 €` (`Intl.NumberFormat` locale behavior).
4. On any route showing dates (Summary's date-range presets, Travels' monthly breakdown,
   the date slider), compare month/weekday names between English and Spanish.
   **Expect**: Spanish shows localized month/weekday names (e.g. "ago 2026" not "Aug
   2026").
5. On narrow/mobile widths, check every Spanish-rendered page for layout breakage from
   longer strings (button overflow, truncated labels, wrapped nav items breaking the
   sidebar layout).
   **Expect**: no overflow/clipping/broken layout — Spanish strings are visibly longer in
   several places (e.g. "Configuración" vs "Settings") and must not break the grid.

## User Story 3: Icons, manifest & OG card (P1)

1. Check the browser tab icon on desktop.
   **Expect**: the CashPy icon renders crisply (not blurry/pixelated) — confirms
   `favicon.ico`/`favicon-32x32.png` are wired via `index.html`.
2. On a mobile browser, use "Add to Home Screen".
   **Expect**: home-screen icon uses the CashPy icon (not a generic globe/blank icon);
   launching the home-screen shortcut opens directly to `/dashboard` (not a 404 or the
   bare domain root) — confirms `site.webmanifest`'s `start_url`.
3. Paste the production/preview URL into a tool that renders link previews (e.g. a
   private Slack/Discord message to yourself, or a social-card debugger if available).
   **Expect**: a real Open Graph card renders — title "CashPy", a real description, and
   the branded 1200×630 image (not a blank/broken image icon, not a placeholder).
4. Inspect `public/` in the built output.
   **Expect**: `favicon.svg` (the unreferenced duplicate) is gone; `og-image.png`,
   `site.webmanifest`, and all generated icon PNGs/ICO are present.

## User Story 4: theme-color, canonical, robots exclusion (P2)

1. On mobile Chrome/Safari with the OS in light mode, open the app.
   **Expect**: the browser chrome (address bar area) tints to `#ffffff` (or very close,
   depending on OS chrome rendering) matching the app's light background.
2. Switch the OS to dark mode, reload.
   **Expect**: browser chrome tints to `#151719`, matching the app's dark background —
   no mismatch/flash of the wrong color.
3. View page source (or DevTools Elements) on the Home/Login routes.
   **Expect**: a `<link rel="canonical" href="https://victorvaquero.com/dashboard/">` tag
   is present with an absolute, correct URL.
4. Check this repo's `public/` directory and build output.
   **Expect**: no `robots.txt`, no `sitemap.xml` anywhere in `public/` or `dist/` — confirms
   FR-008's hard exclusion held.
5. Open `docs/decisions.md`.
   **Expect**: an entry documenting the `resumeweb` robots.txt allow-list follow-up is
   present (SC-004's second half — the follow-up is recorded even though not implemented
   here).

## Regression check (all user stories)

```bash
pnpm test
pnpm test:e2e
pnpm lint
pnpm build
pnpm size
```

**Expect**: all pass; `pnpm size`'s `main bundle` figure is checked against the (possibly
bumped, per research.md item 7) `size-limit` budget, not just "does it pass" — record the
actual gzip number in the PR description the way spec 007's tasks did.
