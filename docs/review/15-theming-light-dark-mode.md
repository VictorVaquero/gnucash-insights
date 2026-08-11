# Theming: light/dark mode

**Priority**: P1 · **Status**: Implemented — see specs/007-design-system-theming-and-charts (all 80 tasks complete)

## Why this matters

Owner ask this round: _"light vs dark modes"_ should be available. This isn't starting
from zero — there's a half-finished attempt already in the codebase, which changes the
right approach from "build it" to "finish it."

## Current state (confirmed findings)

- **[confirmed]** `tailwind.config.ts` has `darkMode: 'class'` configured.
- **[confirmed]** `dark:` Tailwind variant classes already exist in 5 files: `BarPlot.tsx`
  (16 occurrences), `AccountsDropdown.tsx` (1), `TransactsTable.tsx` (3),
  `dropdown-menu.tsx` (2), `slider.tsx` (3).
- **[confirmed]** Nothing anywhere in `src/` ever adds/removes/toggles a `.dark` class —
  no `classList.add('dark')`/`toggle`, no `prefers-color-scheme` media-query listener,
  no `matchMedia`-based theme detection. (The one `matchMedia` usage that does exist, in
  `src/common/utils.ts`, is for viewport/pointer-type detection from spec 004's mobile
  work — unrelated to theming.) **The result: those `dark:` classes are currently
  100% inert.** No user, in any browser or OS setting, currently sees a dark theme.
- **[confirmed]** shadcn's `Button` component (and likely other shadcn primitives) rely
  on CSS custom properties (`--background`, `--primary`, etc.) that aren't defined in
  `index.css` — see [13-component-library-and-design-system.md](13-component-library-and-design-system.md).
  This matters here because shadcn's theming convention is specifically built around
  swapping those CSS vars' values on a `.dark` class — i.e., **finishing dark mode and
  finishing the shadcn CSS-var wiring are the same piece of work**, not two separate
  efforts.
- Not yet audited: coverage — only 5 files have any `dark:` classes today, meaning even
  if the toggle were wired up, most of the app would not actually re-theme; this is a
  much bigger content gap than the toggle-wiring gap.

## Goals

- A real, working light/dark toggle (plus respecting OS `prefers-color-scheme` as the
  default) — not just a mechanism with no way to reach it.
- Dark-mode coverage across the whole app, not just the 5 files that happen to have
  `dark:` classes already.
- The choice persists across sessions (not reset every reload).

## Recommended approach

1. **Theme source of truth**: a small theme context/hook (`useTheme` — three states:
   `light` / `dark` / `system`) backed by `localStorage` (consistent with how auth state
   already persists via `usePersistentState`, per `docs/decisions.md` — reuse that
   pattern rather than introducing a new persistence mechanism) plus a
   `prefers-color-scheme` listener for the `system` state.
2. **Activation**: the hook sets/removes the `dark` class on `<html>` (matching
   Tailwind's `darkMode: 'class'` config) — this single mechanism is what makes the
   already-written `dark:` classes in those 5 files start working immediately, with zero
   changes needed to those files.
3. **Toggle UI**: a visible light/dark/system control, most naturally placed in the nav
   (post-redesign `SideBar`/`Header`) — exact placement is a UI decision, not a technical
   one.
4. **CSS var wiring**: define `--background`/`--primary`/etc. for both `:root` and
   `.dark` scopes, scoped together with
   [13-component-library-and-design-system.md](13-component-library-and-design-system.md)'s
   option (a) — see that doc, this is the same underlying change.
5. **Coverage expansion**: once the mechanism works, systematically add `dark:` variants
   to the rest of the app — charts (`BarPlot.tsx` already has them; the D3 chart files
   under `summary/-plots/`/`travels/-components/` almost certainly don't, worth an
   explicit check since chart colors/gridlines are exactly the kind of thing that looks
   bad un-themed against a dark background), tables, forms, the login page.
6. **`theme-color` meta tag**: once dark mode exists, the `<meta name="theme-color">` tag
   from [05-seo.md](05-seo.md) should become a light/dark-aware pair (two `<meta
name="theme-color" media="(prefers-color-scheme: ...)">` tags) rather than a single
   static value — noted there, actioned here.

## Phased plan

1. **Phase 1 — mechanism**: build `useTheme` (light/dark/system + localStorage
   persistence + `prefers-color-scheme` listener), wire it to toggle `.dark` on
   `<html>`. This alone activates the 5 files that already have `dark:` classes.
2. **Phase 2 — CSS var wiring**: jointly with
   [13-component-library-and-design-system.md](13-component-library-and-design-system.md)'s
   phase 2, define `--background`/`--primary`/etc. for both scopes.
3. **Phase 3 — toggle UI**: add the visible control to the nav.
4. **Phase 4 — coverage sweep**: audit every route/component for how it looks in dark
   mode; prioritize the D3 chart files (colors/gridlines/axis text are the most likely
   to look broken un-themed) and any hardcoded white/black backgrounds.
5. **Phase 5 — `theme-color` meta tag pair**: update `index.html` per
   [05-seo.md](05-seo.md)'s note.
6. **Phase 6 — real-device/browser verification**: check both explicit toggle states and
   the OS-`system`-following behavior in an actual browser with OS dark mode on, not
   just DevTools' "emulate CSS media feature" (which doesn't always match real OS
   behavior 1:1).

## Open decisions — decided 2026-08-10

- **Default theme for new/first-time users: `system`.** Respects OS `prefers-color-scheme`
  until the user explicitly overrides it via the toggle.
