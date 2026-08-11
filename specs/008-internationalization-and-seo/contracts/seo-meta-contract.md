# Contract: SEO meta tags & assets

**Feature**: [spec.md](../spec.md) | Ground truth: `docs/review/05-seo.md`, `vercel.json`

This contract fixes the exact tag/asset set `index.html` and `public/` MUST carry once
User Stories 3-4 are implemented, so implementation and verification (`quickstart.md`)
check against the same list.

## `index.html` `<head>` contents (final state)

```html
<link rel="icon" aria-label="cash" type="image/svg+xml" href="/cash3.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/dashboard/site.webmanifest" />
<link rel="canonical" href="https://victorvaquero.com/dashboard/" />

<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#151719" media="(prefers-color-scheme: dark)" />

<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="CashPy" />

<meta property="og:type" content="website" />
<meta property="og:title" content="CashPy" />
<meta property="og:description" content="<real, accurate description — no placeholder>" />
<meta property="og:image" content="https://victorvaquero.com/dashboard/og-image.png" />
<meta property="og:url" content="https://victorvaquero.com/dashboard/" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="CashPy" />
<meta name="twitter:description" content="<same as og:description>" />
<meta name="twitter:image" content="https://victorvaquero.com/dashboard/og-image.png" />
```

**Rules**:

- `og:image`/`twitter:image`/`og:url`/canonical MUST be absolute URLs (WhatsApp and other
  crawlers cache aggressively and do not resolve relative URLs against the crawled page
  reliably) — this was explicitly flagged in `docs/review/05-seo.md`.
- No placeholder copy — `og:description`/`twitter:description` must describe the actual
  product, not lorem ipsum or a generic template string (spec FR-006: "accurate,
  non-placeholder values").
- `<html lang>` is NOT set statically here — it is set at runtime by `useLocale`
  (see `use-locale-hook-contract.md`); omit or default to `en` as the pre-hydration
  fallback.

## `public/site.webmanifest`

```json
{
  "name": "CashPy",
  "short_name": "CashPy",
  "start_url": "/dashboard/",
  "scope": "/dashboard/",
  "display": "standalone",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Rule**: `start_url`/`scope` MUST be `/dashboard/`, matching `vercel.json`'s rewrite
mount path — an incorrect path here is exactly the SC-003 failure mode (Add to Home
Screen launching to a 404).

## `public/` asset set (final state)

| File                             | Required                                    |
| -------------------------------- | ------------------------------------------- |
| `cash3.svg`                      | keep (canonical source, already referenced) |
| `favicon.svg`                    | **delete** (unreferenced duplicate)         |
| `favicon.ico`                    | new                                         |
| `favicon-16x16.png`              | new                                         |
| `favicon-32x32.png`              | new                                         |
| `apple-touch-icon.png` (180×180) | new                                         |
| `android-chrome-192x192.png`     | new                                         |
| `android-chrome-512x512.png`     | new                                         |
| `site.webmanifest`               | new                                         |
| `og-image.png` (1200×630)        | new                                         |

## Explicitly out of contract

- No `robots.txt` in `public/` (spec FR-008 — hard exclusion).
- No `sitemap.xml` in `public/` (spec FR-008 — hard exclusion).
- No JSON-LD / structured data (`docs/review/05-seo.md` explicitly deprioritizes this).
