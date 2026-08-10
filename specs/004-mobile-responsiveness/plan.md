# Implementation Plan: Mobile Responsiveness

**Branch**: `004-mobile-responsiveness` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-mobile-responsiveness/spec.md`

## Summary

Make the existing cashpy_v2 dashboard usable on phone-sized viewports (320-480px) by fixing eight concrete, previously-identified gaps in the current React/Tailwind UI: brittle user-agent-based mobile detection, un-responsive route-level grids (Analysis, Travels), a non-scrollable transaction table, an inherently-wide Expenses pivot table, window-resize-only chart sizing with fixed pixel margins, a hover-only account menu, and a login card that can clip on short viewports. No backend, data model, or external interface changes are involved — this is purely frontend layout/interaction work layered onto the existing React 19 + TanStack Router + Tailwind CSS v4 stack, reusing dependencies (Radix UI primitives) already present in the project. See `research.md` for the eight implementation decisions.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.2

**Primary Dependencies**: TanStack Router 1.102, TanStack Query 5.66, TanStack Table 8.20, Tailwind CSS 4.1, D3 7.9, Recharts 3.6, Radix UI primitives (`@radix-ui/react-dropdown-menu`, `-slider`, `-checkbox`), `motion` 11.18 — all already in `package.json`; this feature adds no new dependency.

**Storage**: N/A — no data model or persistence changes; the feature only changes how already-loaded data is laid out and rendered.

**Testing**: Manual browser verification (devtools viewport emulation + at least one real phone), per constitution Principle III and this project's existing practice — no automated UI test suite exists in the repo today, and this feature does not introduce one.

**Target Platform**: Web (Vite-built SPA), evergreen mobile and desktop browsers — Safari iOS and Chrome Android are the primary phone targets given the single real user's likely device mix.

**Project Type**: Single-page web application (existing `src/` tree under repo root; no frontend/backend split for this feature).

**Performance Goals**: No new performance targets beyond "layout and chart resize complete without a visible jank/flash on orientation change or menu toggle" (qualitative, verified manually per SC-005) — this feature is about correctness of layout, not throughput.

**Constraints**: Must not regress existing desktop-viewport behavior or visual design (spec Assumption); must not introduce new dependencies where an existing one (Radix `DropdownMenu`) already solves the problem, per constitution Principle IV.

**Scale/Scope**: Touches ~20 files: `src/common/utils.ts` (detection + resize hooks), `src/components/Header.tsx`, `src/routes/__root.tsx`, `src/routes/analysis/index.tsx`, `src/routes/analysis/-components/TransactsTable.tsx`, `src/routes/travels/index.tsx`, `src/routes/expenses/index.tsx`, `src/components/TreeList.tsx`, `src/routes/login/index.tsx`, `src/routes/summary/-plots/Tooltip.tsx`, `src/routes/summary/-plots/IncomeExpensesPlot.tsx` and ~13 sibling D3 chart files under `summary/-plots/` and `travels/-components/`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                             | Check                                                                                                                                                                                      | Result                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| I. Incremental, Reversible Migration  | Pure frontend change, deployable/revertible as a normal Vercel deploy; doesn't touch the Turso/S3 migration (spec 002) or require it as a precondition.                                    | PASS                                                                      |
| II. Cost-Consciousness                | No new infrastructure, service, or paid dependency introduced.                                                                                                                             | PASS                                                                      |
| III. Continuity of the Working App    | Golden path (login → data loads → charts render) plus guest path must be manually re-verified on both desktop and phone viewports before this spec is marked complete (see quickstart.md). | PASS (verification required at implementation, not a design-time blocker) |
| IV. Boring, Well-Supported Technology | Reuses already-installed Radix UI primitives and standard browser APIs (`matchMedia`, `ResizeObserver`); no new library added.                                                             | PASS                                                                      |
| V. Data Privacy on a Public Surface   | No change to auth, data fetching, or secret handling — layout/rendering only.                                                                                                              | PASS                                                                      |

No violations; Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-mobile-responsiveness/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `data-model.md` or `contracts/` — this feature introduces no new entities and no external interface (API, CLI, or otherwise); it only changes how the existing `src/` React tree renders and reacts.

### Source Code (repository root)

```text
src/
├── common/
│   └── utils.ts                              # isMobile() removal; useWindowSize -> ResizeObserver-backed hook
├── components/
│   ├── Header.tsx                            # hover-only menu -> Radix DropdownMenu
│   ├── SideBar.tsx                           # reference pattern only, no change expected
│   └── TreeList.tsx                          # sticky first column for Expenses pivot table
├── routes/
│   ├── __root.tsx                            # isMobile() call site -> new detection hook
│   ├── login/index.tsx                       # card positioning fix (short-viewport clipping)
│   ├── analysis/
│   │   ├── index.tsx                         # grid -> flex-col/md:grid pattern
│   │   └── -components/TransactsTable.tsx    # overflow-x-auto wrapper + reflowed pagination footer
│   ├── travels/index.tsx                     # grid -> flex-col/md:grid pattern
│   ├── expenses/index.tsx                    # overflow-x-auto wrapper around pivot grid
│   └── summary/-plots/
│       ├── Tooltip.tsx                       # isMobile() call site -> new detection hook
│       ├── IncomeExpensesPlot.tsx            # ResizeObserver sizing + tiered margins
│       └── ...12 sibling D3 chart files      # same ResizeObserver + margin treatment
└── routes/travels/-components/
    └── ...D3 chart files                     # same ResizeObserver + margin treatment
```

**Structure Decision**: Single existing project (`cashpy_v2` SPA). No new top-level directories; all changes land inside the existing `src/` tree, editing files in place per the eight decisions in `research.md`.
