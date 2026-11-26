# The method, as a spec (method v2)

> **26 Nov 2026:** the lines that [plans/plan-after-1a.md](plans/plan-after-1a.md) section 9 names were changed in its step 2b (the owner's yes of 26 Nov, with a review afterwards). Where this page and that page differ, that page wins. The list of the changes: plans/rule-changes-2026-11-26.md.

| Status                                         | Switch                  | Phase         | Pictures                                              | Builds on                                                      | Last change        |
| ---------------------------------------------- | ----------------------- | ------------- | ----------------------------------------------------- | -------------------------------------------------------------- | ------------------ |
| Confirmed 22 Nov 2026 (owner, all 11 rows Yes) | none (a way of working) | PC-1, part M0 | docs/plans/method-v2/ 1 to 4 (1 to 3 approved 21 Nov) | docs/archive/METHOD.md of 20 Nov (replaced), CLAUDE.md, rules/ | 21 Nov 2026, Fable |

This page is written in the same shape every feature spec will use from now on, so that the method is checked the way a feature is checked. The top layer is for the owner; the bottom layer is for Opus and the builders. Decisions behind it: docs/DECISIONS.md, 21 Nov rounds 1 to 5.

## Goal

A usable product reaches the owner at a measured pace with few surprises: every part is built from a spec the owner signed, proved by tests before anyone says "done", tested by the owner by scenario, and fixed through the spec, never around it.

## The two non-negotiables

1. **The spec is the only contract.** Nothing is built that a confirmed spec does not say. A finding changes the spec first, then the test, then the code.
2. **Nothing is done without proof.** Green tests, a clean analyze check, the picture side by side, the owner's yes by scenario. A status is set by a program, never typed.

## Story

As the owner, who is a beginner and is often away from the PC, I want to say what I need in my own words, see it written back in a page I can read with pictures, confirm it row by row, and then test the finished thing by scenario on a preview, so that what gets built is what I meant, bugs are caught where they start, and I never have to read code or chase a list to know where things stand.

## Rules

**Always true**

- **Two modes** (owner, 25 Nov; replaces the one loop with a confirm sheet for every part): planning mode, where the owner and Fable write the specs together and the owner approves them; execution mode, where Opus builds from the specs and decides by itself (plan-after-1a section 4).
- **A big spec and a small brief** (owner, 25 Nov; replaces the one spec size with a bottom layer for builders). Each helper sees only what it needs: a small brief, with the big spec at hand to check a fact; the spec lines in a brief are equal to the lines in the spec (plan-after-1a F3 and section 3).
- **Options, not open questions.** Every question to the owner carries what it is, why it matters, option A (the pick) with the case against it, option B, Other.
- **"What I heard".** After every free-talk round, five lines in the owner's words, corrected on the spot.
- **Small questions only when they change the build.** Otherwise the safest option is taken and logged.
- **Builds on.** A new spec names the specs and part cards it extends, or says "none, checked on <date>". The questionnaire lists the related specs before a word is written. A spec that outgrows one sitting is split, the new one pointing at the old.
- **Shared parts only.** A builder may not create code for a job a part card owns. The reviewer checks it. A counter of private copies may only go down.
- **Tests from the spec.** One scenario, one test through the real screen, named after the id. Red first, then green, then broken once on purpose. "Done" is said by a program; "ready" only when the full set is green (plan-after-1a F6). Unit tests for the logic inside, never instead.
- **Bugs are issues.** Every finding is a GitHub Issue in the owner's words with a screenshot; the issue number is the bug id; a bug changes the scenario before the code.
- **One source, two faces** (picture 3). The repo is the only source. A program renders the site, the board and the data file on every push. No copy is kept by hand.
- **Honesty.** Every pick carries the case against it. A position changes only for a named new reason. An override is logged as "owner chose X; the reason against was Y". "Done" needs proof.
- **The ladder** (picture 2). Sonnet, three fails with new evidence each; Opus medium; Opus high; Fable; the owner last.
- **The register and the stages.** Every feature has one row and one id (F-…) in docs/FEATURES.md with its stage (1 the working app for the owner, 2 the premium app for the owner, 3 for everyone), state and phase; the id is used everywhere. Every spec and part card carries its Stage in the header. A stage holds phase parts; a phase part keeps its full size and is divided into day parts of 3 to 5 parts of work (owner, 25 Nov; plan-after-1a section 3), each phase part ending with a train release (preview every Friday, live every second Friday on the owner's yes); a part is under a day. A move between stages or phases goes through the stage map and the owner's yes.
- **Replan trigger.** Opus counts meaningful changes to the live plan since Fable last planned (a confirmed spec's scope changed, a feature moved between stages or phases, a part added or removed, an estimate slip over three days; trivial edits do not count). At 10, or at any stage move, Opus stops adding and asks the owner to open a Fable window to replan; never on its own.
- **Short lines.** A rule or a must-never line is one short line, about twelve words; the detail lives in scenarios and detail lines.
- **Design and quality in the spec.** The Design and quality check is filled before the confirm sheet and the reviewer checks it. No new UI where an approved one exists.
- **Flexible.** Everything a user might want to change is customisable: simple default, advanced under the ▾; never drop a feature.
- **Measured, then changed.** One numbers line for each day part, written by Opus from git and CI (plan-after-1a section 8); rules change only at a phase end, from the numbers.

**Must never happen**

- **M-N1** A status (Confirmed, Built, Verified, Live) typed by hand.
- **M-N2** Code written for a part whose confirm sheet has a row that is not Yes.
- **M-N3** A bug fixed in code while its scenario still says the old behaviour.
- **M-N4** A rule changed in the middle of a phase.
- **M-N5** A test weakened, skipped or deleted to go green.
- **M-N6** A second copy of a list kept by hand (specs, bugs, state) that can drift from the repo.
- **M-N7** A helper reading more than the files its brief names.
- **M-N8** A new file for a job a part card already owns.

**Limits**

- The owner's own time is never counted in an estimate; estimates come from the measured pace and are marked estimate until three merged parts correct them.
- Fable plans a phase and writes what everything else copies; otherwise it is reached by the ladder, or by Opus's own short questions, three a day at most (owner, 25 Nov; plan-after-1a section 4).
- Two lanes at most on this PC; one iPad-size test run at a time.

## Scenarios

- **S1, the plain case.** Given the owner describes a part in free talk, when the round ends, then five "what I heard" lines appear within the same message, and the owner corrects or accepts them before any spec is written.
- **S2, the confirm sheet.** Given a draft spec with a confirm sheet of 9 rows, when the owner answers "row 4: explain again" and "row 7: change to B", then the spec is reworked and the sheet comes back with only rows 4 and 7 open, and no task is created until all 9 rows are Yes.
- **S3, a finding.** Given the owner reports "S3 fails: I pressed Delete on a selected box and the page scrolled", when the report is read, then within one working day an issue exists in those words with the screenshot, scenario S3 of that spec is changed and marked with the issue number and date, a red test exists, and only then is the code changed.
- **S4, reuse.** Given a builder needs a bar that floats near a selection, when the task starts, then the builder imports the Bar shell and Bar place parts; a new placement function anywhere outside the part files fails the analyze check and the review.
- **S5, status by program.** Given all tests of a part are green and analyze is clean on the push, when the site rebuilds, then the spec shows Built; when the owner answers yes by scenario, the status is set to Verified by the program from the issue thread, never by an edit of the page.
- **S6, the thing that goes wrong.** Given Sonnet has failed the same task three times with three different approaches and new evidence each time, when the fourth attempt would start, then Opus at medium takes it; if Opus falls short, Opus at high; only then Fable. A fourth Sonnet try, or a model change without evidence, fails the review of the task.
- **S7, the week.** Given a Saturday evening, when the weekly card is read, then it shows eight computed numbers and the owner's one line, takes 15 minutes, and changes no rule before the phase end.

## How we get there (the steps, each with its test)

| Step | What it gives                                        | Proved by                                                                                         |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| M0   | This spec, confirmed                                 | the owner's sheet, all Yes                                                                        |
| M1   | One live docs set, the rest archived; one STATE file | every link check green; the index lists every moved file                                          |
| M2   | Spec Kit with our templates                          | a spec created from the template has both layers and a confirm sheet                              |
| M3   | Issues as the bug source                             | every open problem of the old lists has an issue with its old id                                  |
| M4   | The site and the board                               | the owner opens both on the iPad and finds a spec, its pictures, a bug and its state              |
| M5   | Analyze v1                                           | a spec missing a scenario test, or "builds on", or with a private copy, fails the check on a push |
| M6   | The weekly card                                      | the first card renders with eight numbers                                                         |
| M8   | The rules updated                                    | CLAUDE.md, rules/ and the agent files carry the 21 Nov decisions; a diff is in the changelog      |

## Done when

M0 to M8 proved as above; the first feature of Phase PC-1 has gone through steps 1 to 16 of picture 1 once; the first weekly card exists; the owner says the reports helped (the one line).

## We assume (not proven yet)

- Spec Kit's templates can be replaced without breaking its commands. Check: M2.
- GitHub Pages renders the site from the public repo without a secret. Check: M4.
- Issue states can be read by the analyze program with the token GitHub gives an Action. Check: M5.
- The owner answers sheets within a day. Check: hours waited, on the weekly card.

## Open points

- Decided 22 Nov: the weekly card is read on Saturday evening (Q11). The one bar is the Action bar; the top one is the Tool bar; pickers; Hold menu (Q4).

## Confirm sheet (the owner answers by row: Yes, Explain again, or Change to …)

| Row | Statement                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The two non-negotiables are right and complete.                                                                                                                  |
| 2   | The loop of picture 1 is the one loop for every part, with no step skipped for small parts (a small fix gets one scenario and one test, still through the loop). |
| 3   | Every spec has the two layers in one file; the top layer must stand on its own.                                                                                  |
| 4   | "What I heard" after every free-talk round; small questions only when they change the build.                                                                     |
| 5   | "Builds on" is required in every new spec and checked by a program.                                                                                              |
| 6   | Bugs live only in GitHub Issues; the issue number is the bug id; a bug changes the scenario before the code.                                                     |
| 7   | Statuses are set by a program from tests, analyze and the owner's yes; nobody types them.                                                                        |
| 8   | The honesty rules and the override log as written.                                                                                                               |
| 9   | The ladder, with Opus at high effort before Fable.                                                                                                               |
| 10  | The weekly card: eight computed numbers and the owner's line; rules change only at a phase end.                                                                  |
| 11  | The must-never lines M-N1 to M-N8.                                                                                                                               |

---

## Bottom layer: for Opus and the builders

### Roles

- **Owner:** free talk, corrections, choices in the plan, questionnaire answers, confirm sheets, tests by scenario, bugs, the yes to go live, the weekly line. Never asked for anything else.
- **Fable:** the phase plan with the owner; the method spec; the spec and part card templates; attack reads of the part cards and of risky specs; the ladder's last step before the owner.
- **Opus (main chat, medium effort):** builds from the specs that the owner and Fable write in planning mode (plan-after-1a section 4); writes plan and tasks; hands tasks to Sonnet; reviews once; takes over after three Sonnet fails; raises its own effort to high before escalating; keeps STATE.md, DECISIONS.md and CHANGELOG.md current.
- **Sonnet (builder, medium effort):** one task; tests first; shared parts only; its own fixes; reports with proof.
- **Programs:** analyze, the site and board generator, the weekly card, the ratchet, the test runs.

### Reports

- After each free-talk round: "what I heard", five lines.
- After the main questionnaire: the spec page; nothing else until it is built.
- When a feature is complete: the build report, by scenario, with proof links, the exact steps to test on the preview, open issues, time against estimate, "how you can help".
- Morning and evening: the status line.
- Weekly: the card. Phase end: the numbers and the owner's word.

### Tools

- **Spec Kit:** `.specify/` with our templates; commands used: constitution (points at CLAUDE.md and rules/), specify, clarify, plan, tasks, analyze, checklist. Not used: implement. Version pinned in the repo.
- **GitHub Issues:** labels `part:<id>`, `state:<open|in-spec|in-test|fixed|verified>`, `found-by:<owner|test|review>`; the bug form: saw, expected, where (device, app, version), screenshot.
- **The site:** generated by a GitHub Action on push to GitHub Pages: spec pages, part cards, the board, decisions, changelog, state, the weekly card; one data file for the in-app Project notebook later.
- **Analyze:** rules ↔ scenarios ↔ tests ↔ tasks; "builds on" present; shared-part imports; the private-copy ratchet; sets the status badges.

### Statuses and who sets them

| Status           | Set when                                                                       | By                                                              |
| ---------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Draft            | the page exists                                                                | the writer                                                      |
| Confirmed <date> | every confirm-sheet row is Yes in the chat log                                 | Opus records the date; analyze checks the sheet has no open row |
| Building         | the first task branch exists                                                   | the program, from git                                           |
| Built            | the full set green after the merge (plan-after-1a section 9) and analyze clean | the program                                                     |
| Verified <date>  | the owner's yes by scenario is in the issue thread of the part                 | the program, from the issue                                     |
| Live             | the switch is on in the live app                                               | the program, from the release record                            |

### Detail lines

- **M-01** Spec file name: `docs/features/<name>.md`; part cards: `docs/features/parts/<name>.md`; one feature per file.
- **M-02** Ids: rules by short name; scenarios `S1…`; must-never `<prefix>-N1…`; detail lines `<prefix>-01…`; the prefix is the spec's two or three letters.
- **M-03** The changes log at the end of every spec: `date · #issue · what changed · who confirmed`.
- **M-04** A brief to a builder names the spec, the task ids, the part cards, the files it may touch, "done when", and "do not touch". Never a pasted file.
- **M-05** The weekly card's eight numbers: parts verified; hours per part against estimate; review rounds per part; bugs found after Built and how many a scenario should have caught; hours a signed spec waited for a builder; hours a question waited for the owner; shaky or skipped tests (must be zero); tokens per verified part.
- **M-06** Private-copy ratchet: the count of components outside `src/design/parts/` that place, fold, pick colour or size, or draw a bar; recorded in `scripts/ratchet-baseline.json`; a merge may only lower it.

### Not in this part

The in-app Project notebook (needs database views); the starter kit for other projects (after the first PC slice); Notion (only on the owner's word, with a cost check).

### Security check

The site is public like the repo: no secrets, no owner data, no note contents in specs or issues. The Action uses only GitHub's own token. Screenshots in issues show the app, never the owner's notes.

### Tests

S1 to S7 above are checked by hand once at the end of stage 0 (M0 to M8), and S4 to S6 by the analyze program on every push after that.

### Changes

- 22 Nov 2026, 06:30 · S7 says Saturday (the owner's Q11); the two open points closed; note on M-N4: these rules were set at the start of stage 1 by the owner's decisions of 21 and 22 Nov, between the paused phase and the new one, not in the middle of a running phase · Fable.

- 22 Nov 2026, 05:00 · rules added from the owner's decisions of 22 Nov (the register and the stages, the replan trigger, short lines, design and quality in the spec, flexible); the owner decided each in chat; no sheet row changed its meaning · Fable.
- 22 Nov 2026 · confirmed · the owner answered all 11 rows Yes on the site's sheet (chat of 22 Nov, 00:10).
- 21 Nov 2026 · draft · Fable, from the owner's decisions of 21 Nov rounds 1 to 5.
