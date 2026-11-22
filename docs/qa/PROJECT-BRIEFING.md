# Project briefing for auditors

Read this once, in ten minutes, before any audit. It tells you what the app is, how the project is run, where everything lives and what the words mean. Rules for you: [../../AGENTS.md](../../AGENTS.md). Your job and the cycle: [README.md](README.md).

## The app in five lines

Learning Notes is a "second brain" for studying: Notion, OneNote and Anki in one, calm and premium. Each notebook holds detailed notes (text boxes on A4 paper pages, pictures, mind maps, databases, ink), a short summary, and recall cards with spaced repetition. It is a web app (React, TypeScript, Vite, BlockNote editor, Dexie/IndexedDB on the device, Supabase for accounts and sync, Cloudflare Pages hosting). Today it is for one person, the owner, on a PC with mouse and keyboard; the iPad reads; later phones and Macs; much later everyone. Live build of `main`: https://learning-notes-app.pages.dev. Preview of `build/next`: https://build-next.learning-notes-app.pages.dev. The docs as a site: https://priyanahubadhana.github.io/learning-notes/.

## The three stages and where we are

1. **Stage 1, the working app for the owner** (now): a basic notebook used daily on the PC with no blocking bug; Claude Code writes notebooks in the app's format and the app imports them; the iPad reads. Four phases: 1A method tooling and the update fix (running), 1M the build machine, 1B the imported notebook and the PC editing path, 1C the bars complete, 1D reader basics and the end of stage 1. Plan: docs/plans/stage-1-plan.md.
2. **Stage 2, the premium app for the owner:** Apple Pencil first, then polish, then richer features. Pencil work exists but is parked behind switches, not dropped.
3. **Stage 3, for everyone:** accounts for all, AI inside the app, store releases.

The register **docs/FEATURES.md** has one row per feature, 227 rows, each with an id `F-nnn`, a pillar letter, its stage, its state (built, built behind a switch, partly built, parked, new, idea, building) and its phase. Cite the F-id in every finding. A feature in state "new" or "idea" has no code yet: a missing screen is not a bug, a wrong screen is.

## How the project is run (the method)

docs/METHOD-v2.md is the method as a spec. The flow for every feature: the owner's words → "what I heard" → a plan → a questionnaire with options → a **spec page in two layers** (top: goal, story, picture, rules, scenarios, done when, open points, confirm sheet for the owner; bottom: builds on, plan, tasks, detail lines, not in this part, Design and quality check, security check, tests) → the owner's confirm sheet → tasks → build, **tests first** → analyze → one review → the owner's test by scenario → issues → fixes → the switch ON.

Words you will meet:

- **Phase:** at most two weeks, ends with a release on the train (preview Friday, live every second Friday on the owner's yes). **Part:** under a day for one builder, ids like U0a, M3, 1M-02. **Scenario:** one user story proved by one browser test, ids S1, S2 in the phase page.
- **Statuses** of a spec: Draft, Confirmed, Building, Built, Verified, Live, set by programs and the owner's yes, never typed.
- **Switch:** every new feature is behind an on/off switch (for example `select.actionBar`); the preview has the phase under test ON.
- **Builds on:** every spec names the specs and part cards it extends; **part cards** (docs/features/parts/) own reusable building blocks; new code for a job a card owns is a fault.
- **The register, the inventory, the pictures:** docs/FEATURES.md, docs/plans/tool-inventory-2026-11-11.md (every tool feature), docs/mockups/ and docs/design/owner-decisions.md (approved pictures and their conditions).
- **Owner is a beginner:** every text in the app and the docs must be plain words. Unclear wording is a real finding.
- **Non-negotiables:** the spec is the only contract; nothing is done without proof; a red test stops the line; a redesign never drops a feature; everything works by click, by key and by a 44 px target, nothing hover-only; one Undo per change; light, dark and sepia themes; English, Spanish and Hindi texts through i18n keys.

## Where things live

| Folder                                                                                   | What                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLAUDE.md, rules/                                                                        | the builder's rules (quality, testing, security, architecture, global text rules)                                                                                                |
| docs/INDEX.md                                                                            | the map of all documents, read it first                                                                                                                                          |
| docs/STATE.md                                                                            | the one live state: what is running now, what is red, what the owner must do                                                                                                     |
| docs/features/                                                                           | one spec per feature, template v2 (_TEMPLATE.md); docs/features/parts/ the part cards                                                                                            |
| docs/plans/                                                                              | the stage plan, phase pages (plans/phases/), questionnaires, inventories                                                                                                         |
| docs/design/                                                                             | quality-standard.md (the bar), system.md (tokens and type), shell-spec.md, owner-ui-patterns.md, owner-decisions.md, principles.md, refs/ (GoodNotes and Notion reference shots) |
| docs/mockups/                                                                            | mock-ups (HTML and 101 PNGs) with the owner's comments; settings-v5 and box-bar are approved looks                                                                               |
| docs/DECISIONS.md, CHANGELOG.md, LIMITATIONS.md, IDEAS.md                                | why things are as they are, what changed, known limits (not bugs), parked wishes                                                                                                 |
| docs/CODE-MAP.md                                                                         | every code folder and what is in it                                                                                                                                              |
| src/core                                                                                 | data model, database, ids, ordering, records, upgrades, the privacy lock                                                                                                         |
| src/app                                                                                  | preferences, themes, shell, pop-up rule, the tool bars (src/app/tools)                                                                                                           |
| src/editor, src/blocks, src/ink                                                          | the BlockNote editor bridge (mapping.ts is the only file that knows its format), block types, the ink engine                                                                     |
| src/notebooks, src/pages, src/search, src/recall, src/databases, src/library, src/reader | the features by name                                                                                                                                                             |
| src/sync, supabase/                                                                      | accounts, encryption, sync; the SQL migrations and edge functions                                                                                                                |
| src/i18n                                                                                 | texts in en, es, hi; the app never shows a raw string                                                                                                                            |
| e2e/                                                                                     | 269 Playwright browser tests (Chromium, WebKit, iPad WebKit), 96 visual snapshots, helpers.ts                                                                                    |
| *.test.ts next to the code                                                               | 374 unit test files (Vitest)                                                                                                                                                     |
| scripts/                                                                                 | check scripts: definition of done, private-copy ratchet, size budget, links, spec template                                                                                       |
| .github/workflows/ci.yml                                                                 | checks and the fast set on every push; the full set nightly; deploy of main                                                                                                      |

## How the app is tested today

Unit tests for logic; browser tests for every user flow, one per scenario, named by id; visual snapshots for looks; six check scripts; `npm audit`; a push guard that runs the related tests before any push; CI on every push and a full nightly run. The browser tests turn the account gate off by a flag, so sign-in itself is proved only by hand on the live site. The real iPad is tested only by the owner.

## What is not a bug

Anything listed in docs/LIMITATIONS.md; a feature whose register state is new, idea or parked; a Pencil or touch behaviour on the PC (stage 2); a design choice recorded in docs/design/owner-decisions.md or docs/DECISIONS.md (report it as "preference" if you disagree, with the reason); texts in Spanish or Hindi that await a native review.

## What the owner wants most from you

Contradictions between documents; cases the spec forgot; words a beginner would misread; a screen that a top-tier product would not ship, and why; a test that proves less than its name says; a security hole with evidence; and, for pictures, whether the mock-up shows every row of its spec. Say what you ran and what you could not. Never fix. The owner decides.
