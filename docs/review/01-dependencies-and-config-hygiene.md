# Dependencies & config hygiene

**Priority**: P2 · **Status**: Implemented — see specs/005-repo-hygiene-security-and-public-readiness

## Why this matters

Dead dependencies and duplicate/contradictory tool configs actively mislead — a developer
(or an AI agent working in this repo) can't trust `package.json` or `components.json` to
reflect reality, and every finding here was discovered by manual grep rather than
tooling, which is itself the underlying problem (see [Phased plan](#phased-plan) below).

## Current state (confirmed findings)

- **[confirmed]** `better-sqlite3` + `@types/better-sqlite3`: zero references in `src/`.
  Leftover from `drizzle-kit` tooling.
- **[confirmed]** `webpack` devDependency: zero references (Vite is the actual bundler).
- **[confirmed]** `src/hooks/useS3.ts`: orphaned, zero references — leftover from the
  pre-Turso data path (spec 002 Phase 6 removed call sites but not this file). Same for
  the `SQLJsDatabase` union member in `src/db/dbType.ts` and its `drizzle-orm/sql-js`
  import.
- **[confirmed]** `VITE_DATA_SOURCE` (`s3`/`turso` toggle in `src/vite-env.d.ts` and
  `.env.example`): not read anywhere in `src/` — vestigial.
- **[confirmed]** Duplicate ESLint config: `eslint.config.mjs` (flat) and `.eslintrc.cjs`
  (legacy) both exist. Only one is actually active for ESLint 9.
- **[confirmed]** Three icon libraries coexist: `@fortawesome/*` (dominant),
  `lucide-react` (2 files), `@remixicon/react` (1 file). Cross-referenced in
  [13-component-library-and-design-system.md](13-component-library-and-design-system.md).
- **[confirmed]** `components.json` (shadcn CLI config): `tailwind.config` points at
  `tailwind.config.js` (actual file is `.ts`); `iconLibrary: "lucide"` contradicts actual
  FontAwesome-dominant usage.
- Storybook (`.storybook/` + 4 `*.stories.tsx` files) and `msw`/`msw-storybook-addon`:
  present but nothing in `src/` imports them at runtime, no CI/script runs story tests.
  `SideBar.stories.tsx`'s props are already stale (missing `isCollapsed`/
  `toggleSidebar`, now required).
- `pnpm outdated` / `pnpm audit` have not been run as part of this review.

## Goals

- Every entry in `package.json` is either used or justified in writing.
- Exactly one config file per tool (ESLint, in particular).
- Storybook/MSW get an explicit keep-or-remove decision, not indefinite limbo.
- This category of drift (dead code, contradictory config) gets **caught automatically
  going forward**, not just cleaned up once.

## Recommended approach

Two passes: a one-time cleanup of everything already found above, and — the more
valuable part — adopting a tool that keeps catching this class of problem automatically,
since every item above was found by hand (grep sweeps during this review), which doesn't
scale and won't happen again next time drift accumulates.

**[knip](https://knip.dev/)** is the concrete recommendation: a single tool that finds
unused files, exports, and dependencies in one pass (it would have caught
`better-sqlite3`, `webpack`, `useS3.ts`, and the dead `VITE_DATA_SOURCE` toggle
automatically). Wire it into `package.json` as `pnpm run knip` and, later, into CI (see
[09-developer-automation.md](09-developer-automation.md)) so this list doesn't need to be
manually re-derived next time.

## Phased plan

1. **Phase 1 — mechanical removal**: delete `better-sqlite3`, `@types/better-sqlite3`,
   `webpack`, `src/hooks/useS3.ts`, the `SQLJsDatabase` union member + its import, the
   dead `VITE_DATA_SOURCE` toggle (env var + type + `.env.example` entry). Resolve the
   duplicate ESLint config to one file. Fix `components.json`'s two stale fields (or drop
   the file if the shadcn CLI isn't actually used).
2. **Phase 2 — Storybook/MSW decision**: either fix `SideBar.stories.tsx`'s stale props
   and commit to keeping stories current, or remove both `.storybook/` and the story
   files + `msw`/`msw-storybook-addon` dependencies. (If kept, MSW becomes the natural
   mocking layer for [08-testing-infrastructure.md](08-testing-infrastructure.md)'s
   component tests too — decide both at once.)
3. **Phase 3 — install knip, run it, act on its output**: expect it to find more than
   this manual pass did (e.g. unused exports within otherwise-used files, which manual
   grep is bad at). Add `pnpm run knip` as a script; wire into CI once
   [09-developer-automation.md](09-developer-automation.md) lands.
4. **Phase 4 — `pnpm outdated` / `pnpm audit` pass**: bump what's safe to bump; document
   anything intentionally pinned back. Feed ongoing vulnerability scanning into
   [09-developer-automation.md](09-developer-automation.md)'s Dependabot item rather than
   treating this as a one-time task.

## Open decisions — decided 2026-08-10

- **Storybook/MSW: keep and fix.** Fix `SideBar.stories.tsx`'s stale props
  (missing `isCollapsed`/`toggleSidebar`) and commit to keeping stories current going
  forward. MSW becomes the shared mocking layer for
  [08-testing-infrastructure.md](08-testing-infrastructure.md)'s component tests too.
