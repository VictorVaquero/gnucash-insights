# SEO & discoverability

**Priority**: P1 · **Status**: Implemented — see specs/008-internationalization-and-seo (all 65 tasks complete)

## Why this matters, and why this is a bounded effort

This app is primarily a **login-gated personal finance dashboard** with a secondary
**guest-demo/portfolio-piece** purpose (it's shown as a project sample). Full SEO
investment (content strategy, structured data for search ranking) isn't warranted for a
private app — but link-preview hygiene (what a shared link looks like in Slack/WhatsApp/
iMessage/Twitter) and basic crawl hygiene are cheap, currently entirely missing, and
matter for the portfolio-piece use case specifically.

## Important context: this app is mounted under someone else's domain

`cashpy_v2` is not a root-level site. It's reverse-proxied by a **separate** Vercel
project — `resumeweb` (the owner's personal resume/CV site) — which owns the actual
domain `victorvaquero.com` and rewrites `/dashboard` and `/dashboard/:path*` to this
app's deployment.

**Correction (2026-08-10)**: this section previously named the domain-owning project as
`bro_cv_web`, confirmed `drpablovaquero.com` in that project's live config, and flagged
the mismatch as "worth a sanity check" without resolving it. That flag was correct to
raise: `bro_cv_web` (git remote `PabloVaqueroCVWeb`) is a **different, unrelated**
project belonging to a third-party client site (`drpablovaquero.com`), not the
`victorvaquero.com` domain owner. The real sibling project is `resumeweb`. See
`docs/architecture.md`'s "Cross-repo naming incident" note. Everything below has been
corrected to reference `resumeweb`; the underlying SEO conclusions (no root-level
`robots.txt`/`sitemap.xml` in this repo, etc.) are unchanged since they never depended on
which project owns the domain — only on the fact that _some other_ project does.

This has direct SEO consequences that a generic SEO checklist would miss:

- **Files that must live at the domain root (`/robots.txt`, `/sitemap.xml`) cannot be
  served by this repo.** `resumeweb`'s rewrite rule only matches `/dashboard` and
  `/dashboard/:path*` — it does not forward `/robots.txt` or `/sitemap.xml` requests. If
  `cashpy_v2` ships its own `public/robots.txt`, it would only be reachable at
  `/dashboard/robots.txt`, which no crawler looks for — **dead weight, not a fix.**
- `resumeweb` should already have (or should get) its own `public/robots.txt` and
  `public/sitemap.xml` at `https://victorvaquero.com/` covering its own pages — verify
  directly in that repo rather than assuming.
- **Conclusion**: `cashpy_v2` should **not** add its own `robots.txt`/`sitemap.xml`.
  **Decided 2026-08-10: the landing page should stay crawlable/indexed** (reverses this
  doc's earlier default of "not indexed"). That means `resumeweb`'s existing root
  `robots.txt` should explicitly _allow_ `/dashboard` and `/dashboard/login` (the
  portfolio-facing entry points) while still disallowing the authenticated inner routes
  (`/dashboard/summary`, `/dashboard/analysis`, etc., which have nothing indexable
  behind a login anyway) — a small, deliberate allow-list change in _that_ repo, not
  this one.

## Current state (confirmed findings)

- **[confirmed]** `index.html` has no `<meta name="description">`, no Open Graph tags
  (`og:title`/`og:description`/`og:image`/`og:type`/`og:url`), no Twitter Card tags, no
  `theme-color`, and no `<link rel="manifest">`.
- **[confirmed]** `index.html` declares `lang="es"` despite all app copy being English —
  a real mismatch (affects screen readers and translation tools, not just SEO). Tracked
  jointly with real es/en support in
  [16-internationalization.md](16-internationalization.md), since the fix depends on
  which language plan is adopted.
- **[confirmed]** `public/` contains only `cash3.svg` and `favicon.svg` —
  **no PNG fallback, no apple-touch-icon, no manifest icons, no favicon.ico.**
  `index.html` references only `cash3.svg`; `favicon.svg` is unreferenced anywhere.
- **[confirmed]** No `<link rel="canonical">`.
- **[confirmed]** No `robots.txt`/`sitemap.xml` in this repo (correct, per the domain-
  mounting reasoning above — **not a gap to fill here**).
- For comparison, `bro_cv_web` (an unrelated third-party client repo, **not** the
  `resumeweb` sibling project — see correction above; referenced here only as an external
  pattern to reuse) already implements a complete version of most of what's below: full
  favicon set
  (`favicon.svg`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`,
  `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`),
  a `site.webmanifest`, `og:image`/canonical/Twitter Card tags with absolute URLs,
  `Physician` JSON-LD structured data, and an explicit `robots.txt` allow-list including
  named AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.). This is a directly reusable
  reference implementation/asset pipeline for the items below rather than something to
  design from scratch.

## Goals

- A link to the dashboard shared in Slack/WhatsApp/iMessage/Twitter/LinkedIn renders a
  correct title, description, and preview image.
- The app has a correct, complete favicon/icon set across browsers, iOS home screen, and
  Android home screen ("Add to Home Screen" also matters for
  [14-charts-and-mobile-interaction.md](14-charts-and-mobile-interaction.md)'s mobile
  focus).
- `lang` is correct (or dynamic, once [16-internationalization.md](16-internationalization.md)
  lands).
- No SEO work is duplicated or placed where it can't actually take effect (the
  robots.txt/sitemap.xml non-goal above).

## Recommended approach — full checklist of what to add

**Icons / favicons** (asset generation: `bro_cv_web`'s existing pipeline/sizes are a
usable external template, not something owned by or shared with `resumeweb`):

- `cash3.svg` is the decided canonical icon (already referenced in `index.html`) —
  `favicon.svg` should be deleted rather than kept alongside it.
- `favicon.ico` (multi-size, legacy browser fallback) — does not currently exist, needs
  generating.
- `favicon-16x16.png`, `favicon-32x32.png` — standard PNG fallbacks for browsers that
  don't support SVG favicons.
- `apple-touch-icon.png` (180×180) — iOS home-screen icon; Safari does **not** reliably
  use SVG favicons for this purpose, a PNG is required.
- `android-chrome-192x192.png`, `android-chrome-512x512.png` — referenced from the web
  manifest (below) for Android "Add to Home Screen."
- `mask-icon.svg` (Safari pinned-tab icon) — optional/low-priority, single-color SVG +
  a `color` attribute.

**Web app manifest** (`public/site.webmanifest` or `manifest.json`):

- `name`, `short_name`, `icons` (referencing the Android PNGs above), `theme_color`,
  `background_color`, `display: "standalone"`, and a `start_url` that correctly accounts
  for the `/dashboard` mount path (this is the one place this app's setup genuinely
  differs from a root-mounted manifest — `start_url` must be `/dashboard` or
  `/dashboard/`, not `/`).
- Linked via `<link rel="manifest" href="/dashboard/site.webmanifest">` (path must
  resolve correctly given the Vercel rewrite — verify in a preview deploy, not just
  locally, since the rewrite only exists in `resumeweb`'s config).

**Open Graph / social link previews** (Facebook, WhatsApp, iMessage, LinkedIn all read
these; WhatsApp specifically caches aggressively and requires an **absolute** image URL,
not root-relative):

- `og:title`, `og:description`, `og:type` (`website`), `og:url` (absolute, canonical),
  `og:site_name`.
- `og:image` — needs a real image asset (1200×630 recommended) — doesn't exist yet.
  Absolute URL required (`https://<domain>/dashboard/og-image.png` or similar), plus
  `og:image:width`/`og:image:height` so consumers don't have to fetch the image just to
  lay out the preview card.

**Twitter/X Card**:

- `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`,
  `twitter:image` — can reuse the same `og:image` asset.

**Apple-specific meta**:

- `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
  `apple-mobile-web-app-title` — relevant given the manifest already targets
  "Add to Home Screen," these are the older-but-still-checked iOS-specific equivalents.

**Misc**:

- `theme-color` meta tag (also affects Android Chrome's toolbar color and, relevant to
  [15-theming-light-dark-mode.md](15-theming-light-dark-mode.md), should ideally have a
  light/dark-aware pair via two `<meta name="theme-color" media="(prefers-color-scheme: ...)">`
  tags once dark mode is wired up).
- `<link rel="canonical">` pointing at the absolute production URL.
- Page `<title>`: confirm whether it should vary per route (TanStack Router's route
  `head()`/meta API) — for a login-gated app, a single static title is probably fine;
  don't over-invest here.
- **Structured data (JSON-LD)**: explicitly **not recommended** for the authenticated
  app itself (no content to mark up meaningfully for search). If the home/landing page
  is meant to double as a portfolio showcase, a minimal `SoftwareApplication` or similar
  JSON-LD block is a nice-to-have, not a priority — `bro_cv_web`'s `Physician` JSON-LD
  (an external, unrelated site) is a reasonable pattern to reference if this is picked
  up, but don't treat it as required.
- **`robots.txt`/`sitemap.xml`**: explicitly **not** added to this repo — see above.
  **Decided: the landing page should be discoverable.** The `resumeweb` change is to add
  `Disallow: /dashboard/summary`, `/dashboard/analysis`, etc. (the authenticated inner
  routes) to its existing `robots.txt`, while explicitly leaving `/dashboard` and
  `/dashboard/login` allowed.

## Phased plan

1. **Phase 1 — meta tag baseline**: add description, canonical, `theme-color`, OG, and
   Twitter Card tags to `index.html` (text-only, no new image assets needed yet — can
   ship without `og:image` first and add it in phase 2, or block on phase 2 if a broken
   image preview is worse than no preview — recommend doing both together to avoid a
   half-finished preview card being cached by WhatsApp during the gap).
2. **Phase 2 — icon/image assets**: generate the full favicon set + `og-image` asset
   (1200×630), optionally using `bro_cv_web`'s existing sizes/pipeline as an external
   template. Add
   `apple-touch-icon`, Android manifest icons, and the manifest file itself with a
   correct `start_url`.
3. **Phase 3 — verify on the actual mounted path**: test the manifest/icons/OG tags
   against a real Vercel preview deployment at the `/dashboard` path (not `localhost`),
   since the rewrite behavior and absolute-URL requirements can only be verified there.
   Specifically test WhatsApp/iMessage link previews (paste the real URL in a chat to a
   test conversation) since these have the strictest caching/format requirements.
4. **Phase 4 — coordinate with `resumeweb` to allow-list the landing page**: a separate,
   small change in that repo's `robots.txt` (`Disallow` the authenticated inner routes,
   explicitly allow `/dashboard` and `/dashboard/login`) — out of this repo's scope to
   implement, but now has a confirmed reason to do it (landing page should be indexed).

## Open decisions — decided 2026-08-10

- **Landing page: indexed.** The `resumeweb` `robots.txt` follow-up in phase 4 allows
  `/dashboard`/`/dashboard/login` and disallows the authenticated inner routes.
- **Canonical icon: `cash3.svg`.** Delete the unreferenced `favicon.svg` rather than
  keeping both.
- Canonical domain for this app is `victorvaquero.com` (confirmed live 2026-08-10 — see
  `docs/architecture.md`). `drpablovaquero.com` belongs to the unrelated `bro_cv_web`
  site and is not relevant here.
