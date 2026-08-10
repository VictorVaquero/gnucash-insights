# Outstanding manual verification

**Priority**: P1 · **Status**: Planning only — tracking, not new scope

## Why this matters

These aren't implementation gaps — they're checks that were deliberately left
**unchecked rather than guessed at**, because they require a human in an actual
browser/device and can't be honestly verified by reading code. Carried forward here from
specs 001 and 004 so they don't get lost now that the single-file checklist is being
retired in favor of this folder.

## Current state (confirmed findings)

Not applicable in the usual sense — this doc's entire content _is_ the list of
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
- **Spec 005 (repo hygiene, security hardening, public-repo readiness), T046**: golden
  path (login → data loads → charts render) and guest path, re-verified in an actual
  browser — desktop and at least one mobile viewport — against the T001 baseline, after
  this spec's dependency bumps (`drizzle-orm`, `pnpm.overrides` for `fast-xml-parser`/
  `seroval`/`tar`) and CSP tightening (`script-src 'unsafe-inline'` dropped). The owner's
  live re-check caught two real regressions: `/dashboard/` (trailing slash) 404'ing on
  the root domain (fixed in the separate `resumeweb` repo), and dashboard charts
  rendering empty due to `ReactQueryDevtools` shipping unconditionally to production and
  tripping the tightened CSP (fixed by gating it dev-only, commit `cc7a0a3`). Owner
  re-verified live post-deploy — both the golden path and guest path now work correctly.
  **Done (2026-08-10).**
- **Spec 005, T038**: AWS Cognito console check (MFA/password-policy/account-lockout/
  self-signup settings) for User Pool `eu-west-3_VHPSFHPrK` — CLI identity lacked
  `cognito-idp:DescribeUserPool`, so the owner checked the console directly and
  confirmed MFA off/optional, standard password policy, lockout/threat-protection off
  (deliberate), and self-service sign-up disabled. No changes needed; see
  `docs/decisions.md` under "Spec 005 US6". **Done (2026-08-10).**
- **Spec 007 (design system theming and charts), T019**: dark/light theme contrast fixes
  in `src/index.css` (`--secondary-foreground`, `--primary`, `--accent-foreground`,
  `--muted-foreground`, `--brand`, `--destructive` — see tasks.md T019 done-note for the
  full list) were derived from computed WCAG contrast ratios against the token hex
  values, not from rendering in a real browser (`vitest-axe`'s `color-contrast` rule is a
  no-op in jsdom — confirmed by probe). Needs an actual browser pass, both themes,
  covering: SideBar nav (default + active + hover), login submit button, `Button`
  destructive/link variants, PeriodicityTabs inactive tab, dropdown-menu hover/focus
  state.
- **Spec 006 (dev automation and quality gates), T041**: owner-side Cognito test-account
  provisioning for `e2e/real-user-login.spec.ts`. Create one Cognito user in pool
  `eu-west-3_VHPSFHPrK` (e.g. `playwright-test@<domain>`), set a permanent password via
  the AWS Console or `aws cognito-idp admin-set-user-password --permanent`, and confirm
  this account's Turso account-GUID mapping (`ACCOUNT_CONFIG_*` pattern, see
  `api/turso-token.ts`) points at guest-equivalent or otherwise non-sensitive demo data —
  never real financial data. Add the resulting credentials as GitHub Actions repo secrets
  `PLAYWRIGHT_TEST_USER_EMAIL` / `PLAYWRIGHT_TEST_USER_PASSWORD` (consumed by
  `.github/workflows/e2e.yml`). Until both secrets exist, `real-user-login.spec.ts`
  self-skips rather than failing — this is expected, not a bug.

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
4. **Phase 4**: spec 005 items — done. Both the AWS Cognito console settings check and
   the golden/guest-path browser re-check against the T001 baseline are complete — see
   above.

## Open decisions (owner input needed)

None — this is tracking existing, already-agreed-necessary verification work, not a new
decision point.
