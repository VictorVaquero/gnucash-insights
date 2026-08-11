# Contract: `useLocale` hook

**Feature**: [spec.md](../spec.md) | Mirrors: `src/hooks/useTheme.ts`

## Shape

```ts
type Locale = "en" | "es";

interface UseLocaleResult {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function useLocale(): UseLocaleResult;
```

## Guarantees

1. **Initial value**: on first mount with no persisted preference, `locale` resolves from
   `navigator.language.split("-")[0]`; if that is not exactly `"en"` or `"es"`, `locale`
   defaults to `"en"` (spec Edge Cases: unsupported browser language → English fallback).
2. **Persistence**: once `setLocale` is called, the choice is written to `localStorage`
   via `usePersistentState` (key `use-persistent-state-locale`) and is used on every
   subsequent mount, overriding `navigator.language` detection (spec FR-001).
3. **DOM sync**: on every `locale` change (including the initial mount), a `useEffect`
   sets `document.documentElement.lang = locale`.
4. **i18next sync**: on every `locale` change, `i18next.changeLanguage(locale)` is called
   so every `useTranslation()` consumer in the tree re-renders with the new catalog. This
   MUST happen synchronously enough that no visible flash of mismatched language occurs
   for components already mounted.
5. **No locale-prefixed routing**: `useLocale` never reads from or writes to the URL path
   or query string (spec FR-002 — explicitly rejects the `bro_cv_web` locale-in-path
   pattern for this app).
6. **Single source of truth**: any component needing the current locale or a setter calls
   `useLocale()` directly — no prop-drilling. `LanguageSwitcher` and every
   `formatCurrency`/date-formatting call site are consumers of this hook, not each other.

## Non-goals

- No SSR hydration concerns (client-only SPA, no server-rendered HTML to mismatch).
- No automatic re-detection of `navigator.language` after a user's first explicit choice
  (matches `useTheme`'s "explicit user choice always wins" behavior).
- No support for locales beyond `"en"`/`"es"` in this spec (adding a third language is a
  future spec's concern; the type is a closed union deliberately).

## Test expectations (`useLocale.test.ts`, mirrors `useTheme.test.ts`)

- Mock `navigator.language` (not `matchMedia` — `useTheme`'s mock target, `useLocale`'s
  is different) before each test; clear `localStorage` in `beforeEach`/`afterEach`.
- Assert: no persisted value + `navigator.language = "es-ES"` → `locale === "es"`.
- Assert: no persisted value + `navigator.language = "fr-FR"` → `locale === "en"`
  (fallback).
- Assert: persisted `"es"` in `localStorage` + `navigator.language = "en-US"` →
  `locale === "es"` (persisted value wins over detection).
- Assert: calling `setLocale("es")` updates `document.documentElement.lang` to `"es"`.
- Assert: calling `setLocale("es")` persists to `localStorage` under the
  `use-persistent-state-locale` key.
