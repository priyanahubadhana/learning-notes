# Master plan: the front door

| Status                                                     | Scope                                                                                          | Builds on                                                                                                                   | Last change        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Draft, waiting for the owner's confirm sheet (22 Nov 2026) | the whole project: vision, stages, method, principles, register, plans, roles, tools, measures | docs/METHOD-v2.md, docs/FEATURES.md, docs/plans/stage-1-plan.md, docs/design/principles.md, docs/design/quality-standard.md | 22 Nov 2026, Fable |

This page is the one place to start. It is short on purpose: every section links to the live page that holds the detail, so this page never goes stale. If a thing is not reachable from here, it is not part of the plan.

## 1. The vision, in one line and five pillars

**A premium second brain.** Like Notion in what it can hold. Like GoodNotes with the Apple Pencil. Like Figma in how freely you shape a page. Like Power BI in how it shows data. With recall cards like Anki.

| Pillar                       | Letter | What it means for us                                                            | Where it stands today                                          |
| ---------------------------- | ------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Notion: what it can hold     | N      | notebooks, pages, blocks, tags, links, databases, templates, search, summaries  | built; made bug-free in stage 1                                |
| GoodNotes: the Apple Pencil  | G      | paper pages, ink, Lasso, text boxes, layers and Tape, selection with the Pencil | built in parts; the Pencil comes first in stage 2              |
| Figma: shape the page freely | F      | boxes anywhere, layout tools, looks, pickers, customisable bars and layouts     | half built; the bars finished in stage 1                       |
| Power BI: show the data      | P      | databases and views, dashboards, the study tracker                              | built in parts; stage 1 for databases, stage 1D for dashboards |
| Anki: recall cards           | A      | cards, cloze, the due review, study modes                                       | built; stage 2                                                 |

Every row of the feature register carries its pillar letter, so a gap in a pillar shows at a glance. The inspirations behind them: docs/research/inspiration-apps.md, premium-design-2026-11.md, deep-research-2026-11.md.

## 2. The road: three stages

Stages are the owner's order of 22 Nov. Inside a stage, phases of at most two weeks, each ending with a release on the train. The record of the sorting: docs/plans/stage-map-2026-11-22.md (confirmed 22 Nov).

| Stage              | For whom   | Goal, in the owner's words                                                                                                                                                                 | Plan                                                                                                     | State                         |
| ------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1, the working app | the owner  | "I use Learning Notes every day on the PC for my own notes, and read them on the iPad, without a blocking bug for a week." Claude Code writes the notebooks; the app imports them in full. | docs/plans/stage-1-plan.md, phases 1A to 1D, about 32 working days (estimate), usable from the end of 1B | phase 1A running since 22 Nov |
| 2, the premium app | the owner  | the Pencil first, then the polishing against the design principles, then the richer features; the Claude connector at the end                                                              | planned with Fable when stage 1 goes live                                                                | not started                   |
| 3, for everyone    | every user | what only other users or many users need: settings for many devices, privacy and permissions, AI inside the app, onboarding, languages, scale, stores                                      | planned with Fable when stage 2 goes live                                                                | not started                   |

## 3. How we build: the method

docs/METHOD-v2.md is the method written as a spec, confirmed 22 Nov. In one line: your words, "what I heard", plan, main questionnaire with options, the spec page in two layers, the confirm sheet, plan and tasks, build with tests first, analyze, review once, your test by scenario, issues, fix loop, switch ON. Pictures: docs/plans/method-v2/ (1 the loop, 2 your touchpoints and the ladder, 3 one source two faces, 4 the calendar).

- **Non-negotiables:** the spec is the only contract; nothing is done without proof.
- **Roles:** the owner says why and tests; Fable plans stages and phases and writes what everything copies; Opus runs the build, drafts ordinary specs, reviews once; Sonnet builds one part at a time; programs set the statuses. The ladder: Sonnet three fails → Opus medium → Opus high → Fable → the owner last.
- **The train:** preview every Friday; live every second Friday on the owner's yes, behind switches.
- **The replan trigger:** Opus counts meaningful plan changes; at 10, or any stage move, it asks the owner to open a Fable window.
- **Tools:** the formatted site (https://priyanahubadhana.github.io/learning-notes/), GitHub Issues as the one bug list, Spec Kit with our templates, the analyze program, the private-copy ratchet, the weekly card on Saturday evening.
- **Rules that bind every helper:** CLAUDE.md and rules/.

## 4. How it must look and feel: the design principles

docs/design/principles.md: ten principles in plain words, one picture each, for the owner's confirm. The builders' bar behind them: docs/design/quality-standard.md (the checklist every feature meets) and docs/design/owner-ui-patterns.md (what the owner looks for). Every spec fills a Design and quality check before its confirm sheet; the reviewer verifies it; no new UI where an approved one exists.

## 5. What we are building: the feature register

docs/FEATURES.md: every feature, one row, a stable id (F-001 …), its pillar, stage, state, phase and spec. Today: 40 rows in stage 1, 18 in stage 2, 17 in stage 3, plus the ideas sorted from F-200. A found-wishes sweep of every past owner message (owner-decisions, ideas, old plans, the archive) adds what is missing, each with a proposed stage and pillar, for the owner's one-pass confirm on the site.

## 6. The live pages, and nothing else

| Page                                                                  | Job                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------- |
| docs/MASTER-PLAN.md                                                   | this front door                                      |
| docs/METHOD-v2.md                                                     | how we build                                         |
| docs/design/principles.md, quality-standard.md, owner-ui-patterns.md  | how it looks and feels                               |
| docs/FEATURES.md                                                      | what we build, by stage                              |
| docs/plans/stage-1-plan.md (and later stage-2, stage-3)               | the phases and parts of the running stage            |
| docs/plans/stage-map-2026-11-22.md, stage-questionnaire-2026-11-22.md | the record of the owner's sorting                    |
| docs/STATE.md                                                         | now, needs you, next, parked                         |
| docs/DECISIONS.md, docs/CHANGELOG.md, docs/IDEAS.md, docs/metrics/    | the diary, the changes, the parking lot, the numbers |
| docs/features/ and docs/features/parts/                               | the specs and the part cards                         |

Everything else in docs/plans/ (phase-plan, build-master-plan, the November redesign and master plans, the old roadmap) moves to docs/archive/ with a one-line index after the found-wishes sweep. Nothing is deleted.

## 7. The names we use

Tool bar (top, fixed) · Action bar (floats by the selection) · pickers (colour, size, font, thickness; open from a button) · Hold menu (press and hold on empty paper) · part cards (the shared building blocks, docs/features/parts/) · the register and F-ids · the train · the sheet (a confirm sheet) · the slice (the stage 1 editing path on the PC) · the pillars N, G, F, P, A.

## 8. What we measure

Per part: hours against the estimate, review rounds, bugs found after Built and how many a scenario should have caught, hours a signed spec waited for a builder, hours a question waited for the owner, shaky or skipped tests (must be zero), tokens per verified part. Weekly card on Saturday evening with the owner's one line. Rules change only at a phase end, from the numbers. docs/metrics/.

## 9. Risks and assumptions we watch

- The update bug may have a platform ceiling on the iPad; the flow must never look stuck even then.
- The notes format v2 and the page-by-page layout are the biggest new pieces of stage 1; their first real notebook is the proof.
- The set-up tooling can become its own project; stage 0 is time-boxed.
- The estimate holds only if the owner answers sheets within the day and tests within a day of a report.
- The site is public like the repo: no note contents, no personal details, no secrets in specs, issues or screenshots.

## 10. The owner's part

Free talk; correct "what I heard"; choose in the plan; answer questionnaires in one go; sign sheets the same day; test by scenario when a phase is complete; file bugs from any device; say yes to go live; read the weekly card. Give references and test data whenever asked, and expect to be asked often. New wishes go to the ideas list with must, nice or later.

## Confirm sheet (the owner answers by row: Yes, Explain again, or Change to …)

| Row | Statement                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | The vision line and the five pillars.                                                                             |
| 2   | The three stages and their goals as written.                                                                      |
| 3   | The method, roles, ladder, train and replan trigger as written.                                                   |
| 4   | The design principles page is the owner-facing face of the quality standard, and every spec's check points to it. |
| 5   | The register with pillars, and the found-wishes sweep for the owner's one-pass confirm.                           |
| 6   | The live pages list; the old plans archived after the sweep.                                                      |
| 7   | The names.                                                                                                        |
| 8   | What we measure, the risks, and the owner's part.                                                                 |

### Changes

- 22 Nov 2026 · draft · Fable, after the owner's eight answers on the master plan.
