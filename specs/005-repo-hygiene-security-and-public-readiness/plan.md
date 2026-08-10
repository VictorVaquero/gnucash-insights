# Implementation Plan: Repo Hygiene, Security Hardening & Public-Repo Readiness

**Branch**: `005-repo-hygiene-security-and-public-readiness` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-repo-hygiene-security-and-public-readiness/spec.md`

## Summary

Six independently-testable cleanups that together make this repo safe to flip to public
and close known-but-unverified security gaps, before specs 006-009 add more surface area
on top: (1) move the real user's GnuCash account-GUID mapping out of `src/config.json`
and into a server-sourced `accountConfig` field on the already-authenticated
`/api/turso-token` response, sourced from a new Vercel env var; (2) delete confirmed-dead
dependencies/files (`better-sqlite3`, `webpack`, `useS3.ts`, `SQLJsDatabase`,
`VITE_DATA_SOURCE`, one of two ESLint configs) and add `knip` so this class of drift is
caught automatically going forward; (3) add `$schema` fields to `vercel.json`/
`tsconfig.json`/`components.json` and a `zod` schema validating `src/config.json`'s
(now-shrunk) shape at import time; (4) formally trace and regression-test the
guest/real-user Turso-token auth boundary (already correct by design — confirmed during
research) and add a per-IP in-memory rate limit to `/api/turso-token`; (5) tighten CSP
(`unsafe-eval`/`wasm-unsafe-eval` are already gone; this spec decides the
`unsafe-inline` question and adds a CI guardrail comparing this repo's CSP against a
committed snapshot of `resumeweb`'s, since that sibling repo isn't reachable from this
repo's CI) plus add missing `Strict-Transport-Security`/`Permissions-Policy` headers;
(6) close the remaining pre-publish checklist items (`dangerouslySetInnerHTML` grep,
Cognito console hardening check, `pnpm audit`, full-history secret scan,
`cashpy-processor` spot-check, MIT `LICENSE`). See `research.md` for the concrete
technical decision behind each of these.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js >=24 (already pinned in `package.json`
`engines`).

**Primary Dependencies**: React 19, Vite 7, TanStack Router/Query, Drizzle ORM
(`drizzle-orm/libsql`), `@libsql/client`, `@aws-sdk/client-cognito-identity-provider`,
`jose` (JWT verification), `@vercel/node` (serverless functions) — all already in
`package.json`. New dependencies this spec adds: `zod` (config validation) and `knip`
(dead-code detection), both devDependencies except `zod` which is a runtime dependency of
the client bundle (used in `authService.tsx`'s validation path).

**Storage**: Turso (libSQL) for app data — unchanged by this spec. This spec's own
"storage" concern is narrower: where the `database.victor.*` account-GUID mapping lives
(moving from a committed file to a Vercel environment variable read server-side — see
`research.md` item 1 and `data-model.md`).

**Testing**: No automated test runner currently exists in this repo (confirmed — no
`vitest`/`jest`/`playwright` in `package.json`). This spec introduces the first two
automated checks the codebase will have: a regression test for the guest/real-user
auth-boundary trace (`research.md` item 4) and the CSP-drift guardrail
(`research.md` item 6) — both implemented as small standalone scripts (Node, run via
`pnpm`/CI) rather than pulling in a full test framework, since spec 006
(`docs/review/08-testing-infrastructure.md`'s scope) is where a real test runner gets
decided and adopted; this spec must not preempt that decision. Everything else in this
spec is verified manually or via existing tooling (`pnpm build`, `pnpm lint`, `pnpm
audit`, `git grep`) per `quickstart.md`.

**Target Platform**: Vercel (Node.js serverless functions for `api/*`, static SPA for
`src/*`) — unchanged.

**Project Type**: Single-page web app + serverless API functions (existing `src/` +
`api/` split at repo root; no new top-level project).

**Performance Goals**: N/A — this spec is hygiene/security/config work, not a
performance change. The one adjacent concern (rate limiting) is explicitly scoped to not
degrade legitimate usage (spec Edge Cases), verified manually per `quickstart.md` US4.

**Constraints**: Must not break the existing golden path (login → data loads → charts
render) or guest path at any point (constitution Principle III); must not introduce paid
infrastructure for rate limiting (constitution Principle II — in-memory counter, not a
new Redis/BotID service, per `research.md` item 3); must not implement the CSP-drift
guardrail as a live cross-repo dependency (`resumeweb` isn't part of this repo's
scope/access — hardcoded snapshot instead, per `research.md` item 6); must not decide the
three-icon-library consolidation (that's spec 007's scope — this spec only fixes
`components.json`'s two factually-wrong fields).

**Scale/Scope**: Touches: `package.json`, `vercel.json`, `tsconfig.json`,
`components.json`, `.env.example`, `src/config.json`, `src/vite-env.d.ts`,
`src/services/authService.tsx`, `src/services/tursoService.ts`, `src/db/utils.ts`,
`src/db/dbType.ts`, `src/hooks/useS3.ts` (deleted), `.eslintrc.cjs` (deleted),
`eslint.config.mjs`, `api/turso-token.ts`, `api/_lib/verifyCognitoToken.ts` (read/traced,
not necessarily changed), a new `LICENSE` file, a new `knip.json`/`knip.config.ts`, a new
small CSP-drift check script, and `docs/decisions.md` (recording every checklist
outcome). No new top-level directories.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Incremental, Reversible Migration | Every change here is independently revertible via a normal deploy/config revert; nothing requires 006-009 as a precondition, and per the spec's own Sequencing note this spec is a precondition-remover for them, not the reverse. The `config.json` → `accountConfig` move changes a read path but keeps the old display behavior identical (US1 Acceptance Scenario 2). | PASS |
| II. Cost-Consciousness | No new paid service. `zod`/`knip` are free, dev-time/bundle-light dependencies. Rate limiting deliberately stays in-memory (no Redis/Upstash/BotID), matching the spec's own Assumptions. | PASS |
| III. Continuity of the Working App | The `config.json`→`accountConfig` move and the auth-boundary/rate-limit changes touch the golden path directly — `quickstart.md` requires a full golden-path + guest-path manual re-verification (desktop + mobile) before this spec is done, and Assumption confirms the server-side move is "confirmed during implementation, not assumed proven." | PASS (verification required at implementation, not a design-time blocker) |
| IV. Boring, Well-Supported Technology | `zod` and `knip` are both widely-adopted, actively-maintained, narrow-purpose tools with no lock-in (schema validation and unused-code detection respectively) — not novel bets. Rate limiting uses a plain in-memory `Map`, no new library. CSP-drift guardrail is a small script, not a new framework. | PASS |
| V. Data Privacy on a Public Surface | This spec's entire US1/US3/US6 scope directly implements this principle: real financial-structure data leaves the repo/bundle, secrets are scanned for across history, and the repo's public-readiness is gated on an explicit checklist rather than assumed. | PASS |

No violations; Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-repo-hygiene-security-and-public-readiness/
├── spec.md                                    # Feature spec (already exists)
├── plan.md                                    # This file (/speckit-plan command output)
├── research.md                                # Phase 0 output (/speckit-plan command)
├── data-model.md                              # Phase 1 output (/speckit-plan command)
├── quickstart.md                              # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── turso-token-endpoint-amendment.md      # Phase 1 output — amends spec 002's contract
└── tasks.md                                   # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Config files (root)
package.json               # remove better-sqlite3/@types/better-sqlite3/webpack; add zod, knip; add license: "MIT"
vercel.json                 # add $schema; add Strict-Transport-Security/Permissions-Policy; unsafe-inline decision
tsconfig.json                # add $schema
components.json              # add $schema; fix tailwind.config path + iconLibrary
eslint.config.mjs            # gains react-hooks/react-refresh/storybook plugin rules
.eslintrc.cjs                 # deleted
.env.example                  # remove VITE_DATA_SOURCE; document ACCOUNT_CONFIG_VICTOR
knip.json                     # new — knip config with documented ignore exceptions
LICENSE                       # new — MIT

# App source
src/
├── config.json                          # database.* removed; only Cognito public fields remain
├── vite-env.d.ts                        # VITE_DATA_SOURCE type removed
├── services/
│   ├── authService.tsx                  # zod-validates config.json at import time
│   └── tursoService.ts                  # TursoTokenResponse gains accountConfig field
├── db/
│   ├── utils.ts                         # getConfig() reads accountConfig instead of config.json's database key
│   └── dbType.ts                        # SQLJsDatabase union member + drizzle-orm/sql-js import removed
└── hooks/
    └── useS3.ts                         # deleted

# Serverless API
api/
├── turso-token.ts                       # response gains accountConfig; adds per-IP rate limiting (429)
└── _lib/
    └── verifyCognitoToken.ts            # traced, regression-tested — no logic change expected

# Docs
docs/
└── decisions.md                          # records every US6 checklist outcome + US5's unsafe-inline decision

# New guardrail script (exact filename decided at /speckit-tasks)
scripts/
└── check-csp-drift.*                     # compares vercel.json's CSP against a committed resumeweb snapshot
```

**Structure Decision**: Single existing project (`cashpy_v2` SPA + its `api/` serverless
functions). No new top-level directories or project split — every change lands inside the
existing `src/`, `api/`, and root-config surface, per the eight-plus decisions in
`research.md`. The one new file category is `scripts/check-csp-drift.*` (a same-repo
guardrail script, not a new project) and a root `knip.json` (tool config, same pattern as
existing root-level `eslint.config.mjs`/`vite.config.ts`).

## Complexity Tracking

*No Constitution Check violations — this section intentionally left empty.*
