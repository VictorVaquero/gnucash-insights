# Component library / design system

**Priority**: P1 · **Status**: Planning only

## Why this matters

The owner's own framing: *"our component library is quite adhoc."* Concretely, that's
not a vague feeling — there's a specific, confirmed symptom: a real design-system
component is present in the codebase but silently bypassed.

## Current state (confirmed findings)

- **[confirmed]** shadcn's `Button` component's default variant relies on
  `--background`/`--primary` CSS vars that aren't defined anywhere in this project's
  `index.css`. It's effectively unstyled/dead — hand-styled `shark-*`-palette Tailwind
  classes are used instead throughout the app. This is the clearest single symptom of
  "adhoc": the intended design-system entry point exists but nothing wires it up.
- **[confirmed]** `tailwind.config.ts` has `darkMode: 'class'` configured, and a
  **[confirmed]** handful of components already have `dark:` Tailwind variants written
  (`BarPlot.tsx` — 16 occurrences, `TransactsTable.tsx`, `dropdown-menu.tsx`,
  `slider.tsx`, `AccountsDropdown.tsx`) — but **[confirmed]** nothing in the codebase
  ever adds a `dark` class anywhere (no `classList` manipulation, no
  `prefers-color-scheme`/`matchMedia`-based toggle found). This means those `dark:`
  variants are currently **inert dead code** — a half-finished dark-mode attempt with no
  activation mechanism. Full plan in
  [15-theming-light-dark-mode.md](15-theming-light-dark-mode.md), but flagged here too
  since it's direct evidence of the same "adhoc, started-but-not-finished" pattern.
- **[confirmed]** Three icon libraries coexist: `@fortawesome/*` (dominant),
  `lucide-react` (2 files), `@remixicon/react` (1 file) — see
  [01-dependencies-and-config-hygiene.md](01-dependencies-and-config-hygiene.md).
  `components.json`'s `iconLibrary: "lucide"` setting contradicts actual usage.
- Not yet audited: inline-styled components (`style={{`) or ad hoc raw hex/rgb color
  literals bypassing the `shark-*` scale.

## Goals

- One clear, intentional answer to "what is this app's design system," not an accidental
  mix of a partially-wired shadcn layer and hand-styled utility classes.
- The dark-mode groundwork that already exists (Tailwind config + some `dark:` classes)
  either gets finished (see [15](15-theming-light-dark-mode.md)) or is understood as
  legacy and cleaned up — not left ambiguous.
- One icon library.

## Recommended approach — two real options, not a foregone conclusion

**(a) Wire up the theme properly.** Define `--background`/`--primary`/etc. as real CSS
custom properties in `index.css` (or Tailwind v4's `@theme` block) mapped onto the
existing `shark-*` scale, so shadcn's primitives — Button now, whichever others get
adopted later — become the actual source of truth for interactive elements. This is the
option that also directly unlocks
[15-theming-light-dark-mode.md](15-theming-light-dark-mode.md), since shadcn's
CSS-variable convention is designed precisely for a `.dark`-class swap — **the dark-mode
initiative and this initiative should be scoped together, not separately**, since (a) is
effectively the prerequisite for a clean dark-mode implementation.

**(b) Formally commit to hand-styled utilities.** Drop the unwired shadcn primitives
that aren't earning their keep, and document the `shark-*` palette + spacing scale as
the project's actual, intentional design system (even just a short section in
`docs/architecture.md`) so it stops looking accidental and starts looking like a
decision. Dark mode would then be implemented directly against `shark-*`-scale
`dark:` variants rather than CSS custom properties.

Recommendation: **(a)**, specifically because it's synergistic with the dark-mode work
that's already half-started — finishing what's there is less work than ripping it out
and redoing dark mode a different way.

## Phased plan

1. **Phase 1 — decide (a) vs. (b)**: owner call, informed by
   [15-theming-light-dark-mode.md](15-theming-light-dark-mode.md)'s scope, since the two
   decisions are coupled.
2. **Phase 2 — if (a)**: define the CSS custom properties, verify `Button` (and any
   other unstyled shadcn primitives) render correctly, audit for any other
   silently-broken shadcn components beyond `Button`.
3. **Phase 2 — if (b)**: remove unused shadcn primitive files, document the `shark-*`
   system in `docs/architecture.md`.
4. **Phase 3 — icon library consolidation**: pick FontAwesome (already dominant),
   migrate the 3 outlier files off `lucide-react`/`@remixicon/react`, remove the two
   unused packages, fix `components.json`'s `iconLibrary` field to match.
5. **Phase 4 — ad hoc styling sweep**: grep for `style={{` and raw hex/rgb color
   literals; migrate to the chosen system's tokens.
6. **Phase 5 — Storybook as documentation**: once a direction is picked and
   [01-dependencies-and-config-hygiene.md](01-dependencies-and-config-hygiene.md)'s
   Storybook keep/remove decision lands, Storybook (if kept) becomes genuinely useful as
   the design system's living documentation rather than orphaned config.

## Open decisions — decided 2026-08-10

- **(a): wire up the theme properly.** Define the CSS custom properties, scoped
  jointly with [15-theming-light-dark-mode.md](15-theming-light-dark-mode.md)'s phase 2
  as originally recommended.
