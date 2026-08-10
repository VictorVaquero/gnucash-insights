# Contract: `useTheme` hook

This is the internal interface other code (this spec's `ThemeToggle`, and — per the
spec's Sequencing note — [008-internationalization-and-seo](../../008-internationalization-and-seo/spec.md)'s
`useLocale` hook, which mirrors this pattern) depends on. Treat signature changes here as
breaking for 008's design, not just for this spec.

## Signature

```ts
type ThemePreference = "light" | "dark" | "system";

function useTheme(): {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (next: ThemePreference) => void;
};
```

## Behavior contract

1. **Initial render**: `preference` reads from `localStorage` key
   `use-persistent-state-theme` (via `usePersistentState`'s existing prefixing
   convention); if absent or unparseable, `preference` is `"system"`.
2. **`resolved` derivation**: pure function of `preference` and, when `preference ===
"system"`, the live result of `window.matchMedia("(prefers-color-scheme: dark)")
.matches`. Never itself written to `localStorage`.
3. **Side effect**: on every change to `resolved`, the hook adds or removes the `dark`
   class on `document.documentElement` (`classList.toggle("dark", resolved === "dark")`).
   This is the _only_ mechanism in the app that touches that class — no other code may
   add/remove it, or the two will race.
4. **`system` live updates**: while `preference === "system"`, the hook subscribes a
   `matchMedia("(prefers-color-scheme: dark)")` `"change"` listener and unsubscribes it
   whenever `preference` changes away from `"system"` or the calling component unmounts.
   No listener is active while `preference` is `"light"` or `"dark"`.
5. **`setPreference`**: synchronously updates `preference` (and therefore, in the same
   render pass, `resolved` and the `dark` class); persists to `localStorage` via
   `usePersistentState`'s own effect (async, but same-tick in practice).
6. **SSR/no-`window`**: not applicable — this is a client-only SPA (Vite), no
   server-rendering guard is required.

## Consumers

- `ThemeToggle` (new, this spec): calls `setPreference` on user selection; renders
  `preference` (not `resolved`) as the selected control state, so `"system"` shows as
  its own selected option even while resolving to a specific light/dark render.
- Any component needing to _read_ the active theme in JS (rare — most theming is pure
  CSS via the `.dark` selector) may call `useTheme().resolved`, e.g. a chart choosing a
  Recharts theme object for gridline/axis colors that can't be expressed as CSS alone.

## Non-goals

- No React Context provider — `useTheme` is a plain hook; multiple call sites each read
  the same underlying `localStorage`-backed state independently via `usePersistentState`,
  consistent with how that hook is used elsewhere in the app (no shared context wrapper
  exists for `usePersistentState`-backed state today, and this spec doesn't introduce
  one).
- No theme values beyond `light`/`dark`/`system` (no per-user custom-color theming) —
  out of scope per the spec's Assumptions.
