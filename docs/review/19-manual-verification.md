# Outstanding manual verification

**Priority**: P1 · **Status**: Planning only — tracking, not new scope

## Why this matters

These aren't implementation gaps — they're checks that were deliberately left
**unchecked rather than guessed at**, because they require a human in an actual
browser/device and can't be honestly verified by reading code. Carried forward here from
specs 001 and 004 so they don't get lost now that the single-file checklist is being
retired in favor of this folder.

## Current state (confirmed findings)

Not applicable in the usual sense — this doc's entire content *is* the list of
outstanding checks, copied forward unchanged from their source specs:

- **Spec 001 (Vercel migration), T021–T022**: guest/demo login re-verified against the
  final Vercel setup.
- **Spec 001, T023–T025**: push a throwaway branch, confirm it gets its own preview
  deployment URL, confirm production is unaffected.
- **Spec 001, T029**: final end-to-end `quickstart.md` sign-off pass.
- **Spec 004 (mobile responsiveness), T009/T016/T019**: manual mobile-viewport
  validation (320/375/428px) for Expenses scroll/pagination, chart resize-on-rotation +
  tooltip behavior, and Analysis category expand/collapse — per
  `specs/004-mobile-responsiveness/quickstart.md`.
- **Spec 004, T024**: full validation matrix across all four user stories plus at least
  one real phone.

## Goals

- Each item above gets an actual pass/fail from a real device/browser session, not left
  permanently open.
- New manual-only verification items from this round's work (charts/mobile-touch per
  [14](14-charts-and-mobile-interaction.md), theming per
  [15](15-theming-light-dark-mode.md), i18n per [16](16-internationalization.md)) get
  added here as they're identified, rather than started as a second parallel list.

## Recommended approach

Batch these into a single real-device verification session rather than one-off checks —
several items overlap in what they need (a phone, a few throwaway git operations), so
doing them together is more efficient than repeatedly context-switching back into "go
check something on a phone" mode.

## Phased plan

1. **Phase 1**: spec 001 items (guest login, preview-deployment isolation,
   `quickstart.md` sign-off) — quick, mostly about confirming the Vercel setup is still
   correct today.
2. **Phase 2**: spec 004 items (mobile viewport matrix, real phone pass).
3. **Phase 3 — ongoing**: as [14](14-charts-and-mobile-interaction.md)'s touch-interaction
   work, [15](15-theming-light-dark-mode.md)'s dark-mode work, and
   [16](16-internationalization.md)'s i18n work each land, append their own
   real-device/browser verification items here rather than treating each as fully done
   at the code-review stage.

## Open decisions (owner input needed)

None — this is tracking existing, already-agreed-necessary verification work, not a new
decision point.
