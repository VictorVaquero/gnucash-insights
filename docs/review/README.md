# Project review — planning docs

This folder replaces the old single-file `docs/review-checklist.md`. Each file below is a
**planning document for one concern**, not just a checklist: it states the current
confirmed findings, the goal, the options weighed, a recommended approach, and a phased
breakdown so a concrete `specs/<NNN>-...` feature can be carved out of it later without
re-deriving the reasoning from scratch. Nothing in here is executed yet — this is the
"what to check and how we'd approach fixing it" pass, per the owner's request:
_"we're going to start reviewing current status of everything in this project and how to
improve it, we need first a list of things to check."_

**Priority tags**: `P0` = do before the repo goes public / addresses a real risk today;
`P1` = worth doing soon, meaningfully improves the app or workflow; `P2` = polish.

## Index

| #   | Doc                                                                                   | Priority  | One-line scope                                                            |
| --- | ------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------- |
| 01  | [Dependencies & config hygiene](01-dependencies-and-config-hygiene.md)                | P2        | Dead deps, duplicate configs, unused code                                 |
| 02  | [Config schemas & validation](02-config-schemas-and-validation.md)                    | P2        | `$schema` fields, runtime config validation                               |
| 03  | [Secrets & public-repo readiness](03-secrets-and-public-repo-readiness.md)            | **P0**    | `src/config.json` PII finding, licensing, history scan                    |
| 04  | [Security](04-security.md)                                                            | **P0**/P1 | Auth, injection/XSS, bot & abuse resistance, headers                      |
| 05  | [SEO & discoverability](05-seo.md)                                                    | P1        | Sitemap/robots ownership question, favicons, OG/social previews, manifest |
| 06  | [Performance & Core Web Vitals](06-performance.md)                                    | P1        | Turning one-off checks into scripted/CI checks                            |
| 07  | [Accessibility](07-accessibility.md)                                                  | P1        | Keyboard, contrast, screen reader, automated axe pass                     |
| 08  | [Testing infrastructure](08-testing-infrastructure.md)                                | **P1**    | Unit, component, and e2e test strategy from zero                          |
| 09  | [Developer automation](09-developer-automation.md)                                    | P1        | Git hooks, CI/CD, dependency-update bots                                  |
| 10  | [Documentation & README](10-documentation-and-readme.md)                              | P1        | README rewrite scope                                                      |
| 11  | [Code structure & patterns](11-code-structure-and-patterns.md)                        | P2        | Refactor candidates, consistency sweep                                    |
| 12  | [Library choice review](12-library-choice-review.md)                                  | P2        | Per spec 003 FR-004 keep/replace calls                                    |
| 13  | [Component library / design system](13-component-library-and-design-system.md)        | P1        | shadcn theme vars unwired, icon library sprawl                            |
| 14  | [Charts & mobile/touch interaction](14-charts-and-mobile-interaction.md)              | **P1**    | Hover-first charts → touch-first redesign                                 |
| 15  | [Theming: light/dark mode](15-theming-light-dark-mode.md)                             | P1        | Half-built dark mode, no toggle                                           |
| 16  | [Internationalization: es/en](16-internationalization.md)                             | P1        | Real language toggle, not just `lang` attribute fix                       |
| 17  | [AI tooling: PR review & agent instructions](17-ai-tooling-and-agent-instructions.md) | P1        | `CLAUDE.md`, custom agents/skills                                         |
| 18  | [Observability & monitoring](18-observability-and-monitoring.md)                      | P2        | Error tracking, uptime, deploy notifications                              |
| 19  | [Outstanding manual verification](19-manual-verification.md)                          | —         | Carried over from specs 001 & 004                                         |

## How this maps to future specs

Per the owner's plan ("we'll create concrete specs later to work in phases"), each file's
**Phased plan** section is written so it can become a `spec.md`'s user stories almost
directly — Phase 1 of a doc here is meant to map to a P1 user story, etc. When a doc's
plan gets picked up, run `/speckit-specify` off that doc's content rather than
re-researching, and once the spec exists, replace that doc's checklist items with a link
to the spec instead of letting both drift independently.

## Maintaining this folder

- Keep each doc's **Current state (confirmed findings)** section accurate — re-verify
  with a grep/read rather than assuming a finding is still true after other work lands.
- When a doc's plan is fully actioned, don't delete the file — mark it `Status: Done, see
specs/<NNN>` at the top so the reasoning trail survives (mirrors how
  `docs/decisions.md` is meant to work).
- Keep `docs/architecture.md` and `docs/decisions.md` updated when a decision in one of
  these docs is actually made — this folder is the "considering," those two files are the
  "decided."
