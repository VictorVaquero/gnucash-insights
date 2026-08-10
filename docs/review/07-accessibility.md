# Accessibility

**Priority**: P1 · **Status**: Planning only

## Current state (confirmed findings)

- Nav panel: keyboard reachability of the toggle button and nav items when collapsed
  (icon-only, no visible label) vs. expanded — not yet tested.
- Color contrast on the `shark-*` palette against text, especially the muted
  (`shark-400`/`shark-600`) tones used in the footer and inactive nav labels — not yet
  measured against WCAG AA thresholds.
- Chart tooltips/interactions: keyboard/screen-reader alternative to hover-only or
  D3-canvas-only interactions — cross-referenced heavily in
  [14-charts-and-mobile-interaction.md](14-charts-and-mobile-interaction.md), since the
  same hover-dependency that hurts mobile touch users also hurts keyboard/screen-reader
  users.
- Login form: not yet confirmed whether inputs have properly associated `<label>`s (vs.
  placeholder-only, which fails for screen readers).
- Focus management after route navigation: not yet confirmed.
- All of the above were identified by inspection, not tooling — no automated
  accessibility scan has been run against this app yet.

## Goals

- Baseline WCAG AA compliance on contrast, keyboard operability, and labeling for the
  primary user flows (login, nav, summary, analysis).
- An automated check exists so regressions are caught going forward, not just found once
  in this review.

## Recommended approach

`axe-core` (via `@axe-core/react` for dev-time console warnings, and
`jest-axe`/`vitest-axe` for the component test suite once
[08-testing-infrastructure.md](08-testing-infrastructure.md) exists) — the same
"scripted, not one-off" principle from
[06-performance.md](06-performance.md) applies here: manual inspection already found a
handful of issues; automated scanning will find more, and keep finding new ones as the
app changes.

## Phased plan

1. **Phase 1 — manual verification of the items already found**: keyboard-only pass
   through nav + account menu; contrast-check the `shark-400`/`600` tones with a
   contrast-ratio tool; confirm login form labeling; confirm post-navigation focus
   behavior.
2. **Phase 2 — automated baseline**: add `@axe-core/react` in dev mode for immediate
   console-level feedback during development.
3. **Phase 3 — wire into tests**: once component tests exist
   ([08-testing-infrastructure.md](08-testing-infrastructure.md)), add `vitest-axe`
   assertions to the highest-traffic components/pages so violations fail CI.
4. **Phase 4 — chart accessibility**: resolved jointly with
   [14-charts-and-mobile-interaction.md](14-charts-and-mobile-interaction.md)'s
   touch-first redesign, since a non-hover-dependent interaction model naturally serves
   both keyboard and touch users.

## Open decisions (owner input needed)

None — this is a build-quality bar, not a product decision.
