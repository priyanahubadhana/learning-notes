# Phase 1M: the build machine (Fable with the owner, 22 Nov 2026)

Stage 1 · Status: Draft until the owner's confirm sheet is all Yes · Builds on: METHOD-v2.md (M4, M5, M-N1, M-N5, M-N7), HOW-WE-BUILD.md sections 2 and 6, rules/quality.md section 5, design/token-efficiency.md rules 4, 5 and 9. Research and sources: [research-build-machine-2026-11-22.md](../research-build-machine-2026-11-22.md). Decisions: docs/DECISIONS.md, 22 Nov "The build machine".

## Goal

A repeatable build machine: every small task runs in its own fresh window, proves itself by program (function and look) before anyone says "done", several run side by side, and the whole machine can be copied to the next project in about an hour. Tokens are spent wisely, not minimally.

Case against: a few days of machine work with no visible app progress; gates sized wrongly turn a one-hour fix into a ritual (answered by the two task sizes).

## The two non-negotiables

1. **A window stays small and sharp.** A task is planned to finish under 100K tokens; nothing relies on compaction.
2. **"Done" is said by a program.** Tests, the verify recipe and a fresh checker pass before a builder may stop; the judge lives where the builder cannot edit it.

## Rules (one short line each)

- One task, one fresh builder window; the manager chat is cleared at each part boundary.
- Split by scope first, by a relay of windows second, by compaction never.
- A relay hands over by a dossier file in the branch, never by the chat.
- Two or three builder windows at once, in worktrees; pushes one at a time.
- Normal task: four gate layers, each in its own window. Tiny task: layers 1 and 2.
- Three failed rounds at a gate, then the ladder (Sonnet, Opus medium, Opus high, Fable, owner).
- The look is compared with the approved mock-up by a script, light and dark.
- Ordinary screens without a picture: Opus decides from the design files and logs it; important screens wait for the owner.
- Every merged task writes its own numbers; no number is typed by hand.
- The machine lives in a global template; a project overrides, never forks.

**Must never happen**

- **BM-N1** A builder says done while a scenario test or the verify recipe is red.
- **BM-N2** A builder edits the hook, the checker or the recipe that judges it.
- **BM-N3** A window is carried past its budget by compaction instead of a handoff.
- **BM-N4** A status or a metric typed by hand.
- **BM-N5** A tiny-path task that changes a screen.

## Scenarios

- **S1, the plain task.** Given a normal task with two scenarios and an approved picture, when the builder finishes, then the Stop hook has run the scenario tests and the verify recipe green, the checker has written PASS with file:line, the report shows the scenario table with side-by-side pictures, and tasks.csv has a row written by the program.
- **S2, the red that cannot hide.** Given a scenario test is red, when the builder tries to stop, then it is sent back with the failing lines; after the third round the hook prints ESCALATE and the manager starts the next rung.
- **S3, the wrong thing built nicely.** Given tests are green but the diff adds a feature the spec does not name, when the checker runs, then it writes FAIL naming the spec line and the file, and the merge is refused by the push guard.
- **S4, the look drifts.** Given a box sits 12 px lower than the mock-up, when the look compare runs, then it fails with a side-by-side picture and the number.
- **S5, the budget.** Given a builder reaches 80K, when the hook prints the budget line, then the builder commits, writes HANDOFF-<task>.md and stops with STOPPED-BUDGET; a fresh builder continues on the same branch from the dossier.
- **S6, the relay.** Given a task that is still big after splitting by scope, when the plan marks it RELAY, then window A writes the dossier (what was read, decisions, pointers), window B builds from it, window C verifies, and the checker reads the dossier too.
- **S7, a new project.** Given an empty repo, when the setup script runs, then agents, hooks, scripts, playbook and the spec template are in place and a dry task passes within an hour.

## Tools and where each is used

| Tool                                                       | Where                                                                                             | Not for                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------ |
| Plan mode                                                  | every phase plan (Fable + owner), every task plan (Opus) before a brief                           | tiny tasks                     |
| Builder subagent (Sonnet medium, autoCompactWindow 120000) | one task, own worktree                                                                            | a second task                  |
| Reviewer subagent (Opus, fresh window)                     | one review per task                                                                               | fixing                         |
| Checker subagent (new; read-only; fresh window)            | gate layer 3: diff vs spec lines, verify and look results, reuse gate                             | taste                          |
| Explore and web-fetch subagents                            | research digests and file sweeps; report under 20 lines                                           | editing                        |
| Stop hook on builder windows                               | gate layers 1 and 2; counts rounds; prints the budget line                                        | the manager chat               |
| `/verify` project recipe                                   | drives the app through the task's scenario ids before each commit                                 | unit logic                     |
| `/goal` in the manager chat                                | "all tasks of part X merged, 20 of 20 green" keeps the manager going unattended                   | builders (not available there) |
| `/loop`                                                    | watching CI, a background builder, a usage-limit reset; 5 to 15 minutes; never inside a long chat | work                           |
| SessionStart hook                                          | loads STATE "Now", the part page and the budget; stops on PAUSED                                  | -                              |
| Existing PreToolUse hooks, push guard, CI                  | the last net, never the first place a fault is seen                                               | -                              |
| Analyze (M5)                                               | spec, scenarios, tests and tasks agree; statuses by program                                       | -                              |
| Workflow tool, agent teams                                 | not now (opt-in; about 7x tokens)                                                                 | -                              |

## Building guide: how work is divided

- **Unit:** one task, one builder window, planned under 100K: brief and rules load about 20K, reading up to 25K, build and tests up to 40K, verify and report up to 15K.
- **A task owns** 1 to 3 scenarios of one spec, up to 6 files, one switch. **Tiny** = no screen change and under 3 files.
- **Too big after splitting by scope:** mark it RELAY in the plan. Window A (read): writes `HANDOFF-<task>.md` in the branch: files read with line pointers, decisions taken and why, open doubts, the exact next steps. Window B (build) starts from the dossier and the brief, never re-reads what the dossier settles. Window C (verify and report). Any combination that fits the task; the dossier is the contract between windows and the checker reads it.
- **Part:** 3 to 8 tasks; **phase:** 10 to 20 parts, two weeks at most (unchanged).
- **Lanes:** 2 to 3 worktrees; independent files only; pushes serialized; merges in review order.
- **Manager chat:** Opus medium, one part per window; at the boundary it rewrites STATE.md, lets the program add the tasks.csv rows, then `/clear`; `/next` reloads. `/goal` carries the part's done condition.
- **Budget line:** the hook warns at 80K; the builder commits, writes the dossier, reports STOPPED-BUDGET; a fresh builder continues.

## The parts (each one builder window; tiny parts take the light path)

| Id    | Part                                                                                                                                                                                                                                 | Done when (proof)                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1M-01 | This page, the research page, DECISIONS, the rules update (rules/sessions.md, CLAUDE.md Owner settings, HOW-WE-BUILD, token-efficiency, the global playbook)                                                                         | links green; DECISIONS carries D1 to D16; CHANGELOG entry  |
| 1M-02 | Agent files: builder and reviewer get autoCompactWindow 120000, report caps, the budget rule; new `checker.md` (read-only); global copies in ~/.claude/agents                                                                        | a dry task returns a report of 15 lines or fewer           |
| 1M-03 | SessionStart hook: prints STATE "Now", the part page, the budget; refuses on PAUSED                                                                                                                                                  | hook script test green; the lines appear in a new window   |
| 1M-04 | Stop hook for builders: related scenario tests, tsc and lint from a manifest the brief writes; exit 2 with the failing lines; round counter in `.claude/state/<task>.json`; honours stop_hook_active; after 3 rounds prints ESCALATE | a seeded red test blocks "done" three times, then ESCALATE |
| 1M-05 | `/verify` project recipe: dev server, seed, drive the scenario ids of the spec, result JSON; `.claude/skills/verify/SKILL.md`                                                                                                        | green on update-v2 S5; a broken scenario makes it red      |
| 1M-06 | Test-notebook seed: `scripts/seed-test-notebook.mjs` and a fixture; used by e2e and the recipe                                                                                                                                       | a fresh profile plus the seed gives identical data twice   |
| 1M-07 | Look compare: `scripts/look-compare.mjs` opens the mock-up HTML and the app at the same viewport (reuses e2e/visual/matrix.ts), compares boxes, text and order with a tolerance, writes a side-by-side PNG and JSON                  | passes on an approved screen; fails when a box moves 12 px |
| 1M-08 | Checker flow: the checker reads spec lines, `git diff` names, the verify and look JSON and the dossier; PASS or FAIL with file:line; the push guard refuses a merge without PASS                                                     | seeded drift gives FAIL; clean gives PASS                  |
| 1M-09 | Analyze v1 (M5 of METHOD-v2): rules, scenarios, tests and tasks agree; builds on; ratchet; statuses                                                                                                                                  | a spec missing a scenario test fails the push              |
| 1M-10 | Metrics by program: `scripts/task-metrics.mjs` writes the tasks.csv row (peak window tokens, rounds, gate that failed, minutes brief to merge); the weekly card shows the four numbers                                               | one merged dry task gives a full row with no hand edit     |
| 1M-11 | Task report: the scenario table generator (results, side-by-side pictures, verify), three teaching lines, "how you can help"                                                                                                         | renders for update-v2 S5                                   |
| 1M-12 | Setup script: `scripts/new-project.mjs` copies the template (agents, hooks, scripts, playbook, spec template, settings hooks block) into an empty repo; a one-hour README                                                            | a scratch repo gets the machine and a dry task passes      |
| 1M-13 | Dry run: one tiny and one normal task from phase 1B's first part through the whole machine; Fable's attack read of 1M-04, 1M-07 and 1M-08                                                                                            | both merged; rows by program; the attack read logged       |

Order: 01, 02, then 03, 04 and 06 in parallel, then 05, 07, 08, 09, 10, 11, 12, 13. Sizes are estimates until three merged parts correct them.

Reuse (no new code where a part owns the job): scripts/push-guard.mjs and push-guard-plan.mjs, scripts/ci-sort.mjs, e2e/visual/matrix.ts, scripts/docs-site.mjs, .claude/hooks/lib.mjs and guard-tests.mjs, scripts/check-dod.mjs.

## How the owner helps

- Phase planning: done examples per feature (I do X, I expect Y; must never), 2 to 4 lines each.
- Morning and evening slot, about 30 minutes: batched pictures, confirm sheets, a 5-minute preview check by scenario after each fix group.
- Say "important" when a screen matters more than the rule would guess.
- On a relay task, read the dossier's "decisions" lines.

## Open points (not blocking)

- The source of the peak-token number (transcript size or `/usage`): 1M-10 picks and documents.
- Whether a Stop hook fires for subagents in Claude Code 2.1.316: 1M-04 tests it first; if not, the builder's last step calls the same script and the checker enforces it.
- The recipe's scope (whole app or per spec): 1M-05 starts per spec id list.

## On the iPad later

What changes: the look compare adds the iPad viewports already in matrix.ts; the verify recipe gets an ipad-webkit run before each release. What does not: the gates, the budget, the relay.

## Confirm sheet (the owner answers by row: Yes, Explain again, or Change to …)

| Row | Statement                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------- |
| 1   | The goal line above is the goal.                                                                         |
| 2   | A task is planned under 100K; safety compaction at 120K; never relied on.                                |
| 3   | Split by scope first, relay second, compaction never; the dossier is the handoff.                        |
| 4   | Four gate layers for a normal task, each in its own window; two for a tiny task.                         |
| 5   | The look is compared with the mock-up by a script; the pixel test stays between builds.                  |
| 6   | Ordinary missing pictures: Opus decides and logs; important screens wait for me.                         |
| 7   | Numbers per task are written by a program; no hand edits.                                                |
| 8   | The machine is built as phase 1M before phase 1B; the red test and U0a finish first under the old rules. |
| 9   | Fable plans and attack-reads the three gates once; the rest by the ladder.                               |
| 10  | The machine lives in a global template with project overrides; a setup script copies it in an hour.      |

### Changes

- 22 Nov 2026 · - · page written by Fable with the owner; the relay rule added on the owner's point 4 · owner (chat)
