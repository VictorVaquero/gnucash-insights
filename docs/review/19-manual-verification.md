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
- **Spec 007, US5 step 6 (chart resize + touch usability)**: repeat quickstart.md US5
  steps 2 (375px-viewport axis-label legibility, tightened margins, `BarPlot.tsx`'s
  height no longer clipping/leaving excess space) and 4 (tap-to-pin tooltip, bottom-sheet
  variant on narrow viewports) on an actual phone, not just DevTools device-toolbar
  emulation — DevTools touch/media emulation does not always match real OS/browser
  behavior 1:1 (Constitution Principle III; spec 007's Assumptions).
- **Spec 007, US6 (scrubber on every chart)**: on an actual touch device, finger-drag
  across each chart's plot area and confirm a crosshair tracks the drag position with the
  pinned tooltip value updating live, per quickstart.md US6. Automated e2e coverage
  (`e2e/chart-scrubber.spec.ts`) exercises the underlying `useChartScrubber` hook via
  synthetic mouse events in a desktop browser and passes, but per Constitution
  Principle III that's not a substitute for a real-touchscreen pass — spot-check at least
  one chart from `summary/-plots/`, one from `travels/-components/`, one from
  `analysis/-components/`, and the shared `BarPlot.tsx`.
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

- **Spec 008 (internationalization and SEO), T055**: icon/manifest/OG verification.
  Automated locally via `pnpm build` + `pnpm preview` + `curl` (2026-08-11): `index.html`,
  `site.webmanifest`, `favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`, and
  `og-image.png` all resolve `200` under `/dashboard/`, and the manifest's own icon
  entries (`/dashboard/android-chrome-192x192.png`/`512x512.png`) resolve `200` too —
  this caught and fixed a real bug: the SEO contract's literal manifest JSON used
  root-absolute icon paths (`/android-chrome-192x192.png`) which would 404, since this
  app's `vercel.json` only owns the `/dashboard/*` URL space (domain root belongs to the
  separate `resumeweb` site) and Vite's `base` rewrite only applies to `index.html`, not
  to JSON copied verbatim from `public/`; fixed by hardcoding the `/dashboard/` prefix in
  `public/site.webmanifest`'s icon `src` values. Still outstanding (needs a real
  device/browser, not curl): browser-tab icon crispness at actual pixel density; mobile
  "Add to Home Screen" actually installing and launching to `/dashboard`; a real
  link-preview tool (Slack/Discord self-message or a social-card debugger) rendering the
  `og-image.png` card correctly once this branch is deployed to a reachable URL (a
  `localhost` preview can't be crawled by an external link-preview tool).
- **Spec 008, T060**: mobile OS light/dark toggle actually re-tinting the browser chrome
  to match the `theme-color` meta pair (`#ffffff`/`#151719`) — needs a real phone, not
  DevTools emulation (Constitution Principle III).
- **Spec 008, T048**: full-app translation sweep (T039–T047) with the language switcher
  set to Español, at mobile width, checking every route for overflow/clipping/broken
  layout from longer Spanish strings. Could not be run in this environment: `e2e/`'s
  `playwright.config.ts` boots its `webServer` via `vercel dev`, and the Vercel CLI isn't
  installed here, so `pnpm test:e2e` (including the existing 375px-viewport check in
  `mobile-smoke.spec.ts`) can't start. `mobile-smoke.spec.ts` already asserts
  `scrollWidth <= 375` for every route in English; the natural automated version of this
  check is the same assertion after switching the language selector to Español (mirroring
  `locale-persistence.spec.ts`'s `page.getByRole("menuitemradio", { name: "Español" })`
  pattern) — worth adding as a permanent case once the CLI is available, rather than a
  one-off. Until then this needs an actual pass: `pnpm dev`, guest login, switch to
  Español via the sidebar language switcher, and check `/home`, `/login`, `/summary`,
  `/expenses`, `/travels`, `/investments`, `/analysis`, `/metadata` at 375px width for
  clipped KPI card labels/numbers (longer Spanish KPI names like "Tasa de ahorro" and
  "Patrimonio neto" are the most likely overflow risk), wrapped nav labels, and the
  analysis table's translated column headers not breaking the `TransactsTable.tsx` grid.
- **Spec 008, T065**: full manual `quickstart.md` walkthrough. Since the Vercel CLI isn't
  installed here (see T048 above), `pnpm test:e2e` couldn't run, but `pnpm dev` (plain
  Vite, no `vercel dev` needed — its `devGuestApiPlugin()` reimplements the guest-login
  API branch in-process) let a real Chromium browser (driven via `@playwright/test`'s
  `chromium` launcher, scripted ad hoc) exercise most of the walkthrough directly, done
  2026-08-11:
  - Guest login, then every route (`home`, `metadata`, `summary`, `expenses`, `travels`,
    `investments`, `analysis?query={}`) swept at desktop (1440×900, `en-US` browser
    locale) and at mobile (375×812, `es-ES` browser locale): zero horizontal overflow on
    any route at either width (`scrollWidth <= clientWidth` held throughout, including
    375px in Spanish — **this resolves T048's outstanding mobile-Spanish-overflow check
    above**), zero uncaught page errors on any route in either language.
  - Browser-language auto-detection (FR-001) confirmed live, not just unit-tested:
    `<html lang>` read `"en"` after guest login under an `en-US` browser context and
    `"es"` under an `es-ES` context, with no stored preference in either case.
  - Language switcher (the actual `LanguageSwitcher.tsx` component, not just
    auto-detection) round-tripped correctly: opening it (via keyboard activation — Radix's
    `DropdownMenuTrigger` opens on `pointerdown`/keyboard, not a synthetic `click` event,
    which tripped up the first two script attempts before landing on
    `trigger.focus()` + `Enter`) lists exactly `["English", "Español"]`; selecting
    "Español" while starting from an `en-US` context flips `<html lang>` to `"es"` and
    visible copy to Spanish immediately (no reload needed), and the choice survives a
    hard reload (`<html lang>` still `"es"` after reload) — confirms FR-001/FR-002's
    persistence requirement end-to-end.
  - Still outstanding (owner-side, real device/tool needed, not achievable from this
    environment): real "Add to Home Screen" install + launch-to-`/dashboard` check;
    pasting a real deployed URL into an actual link-preview tool (Slack/Discord/social-card
    debugger) — `localhost` can't be crawled externally; the real `pnpm test:e2e` suite
    itself (blocked on the missing Vercel CLI, same root cause as T048); and a full
    line-by-line reading of every translated string against `quickstart.md`'s scenario
    text beyond what the automated sweep's `textLen` checks and visible-sample spot check
    covered.

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
