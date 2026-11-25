# The plan after phase 1A: one page (compiled 25 Nov 2026; second version, 26 Nov, after two audit rounds)

**Status: compiled by Fable on the owner's word ("let's compile everything now into one thing"). It waits for the owner's yes.** Until that yes, Opus does step 1 and step 2a of section 5. Nothing in those two steps is new: each item was decided by the owner before.

**What this page is.** The one page Opus follows after phase 1A. It holds what the owner and Fable decided on 25 Nov 2026, with every lesson of phase 1A applied. It replaces, as an instruction, the block "Start here" and sections 0, 4, 7, 13 and 14 of [the Fable review](fable-review-2026-11-25.md). Two parts of the review still instruct: section 5 (the quick Pencil taps) and section 6 (where each pending wish and issue is placed). The rest of the review is the record of the talk. Where the two differ, this page wins.

**The other pages that hold:** [the notebook spec](phases/phase-1b-notebook-spec-draft.md) (a draft until the owner's yes); [the talk notes](phases/phase-1b-notebook-talk.md); [the earlier decisions, collected](earlier-decisions/README.md); `docs/STATE.md` (where the work stands, kept by Opus).

## 1. The targets

The owner's three targets (25 Nov): a day part of the work is done and tested in about 8 hours; faults are caught before the owner sees them; the live app gets new things often.

"I can use the app every day" (the owner agreed on 25 Nov): on the PC, Claude writes a notebook, the app imports it in full, and the owner reads it and customizes it. On the tablet the owner reads. On the phone the owner answers recall cards.

When fast and accurate disagree, accurate wins: "an accurate result, based on the specs, at the fastest pace" (owner, 25 Nov).

## 2. The fences of the way of working

These must hold. They say what must be true, not how to work. Nothing is cut and no rule of the work changes without the owner's yes. For safety Opus may add a fence at once; it tells the owner in the next message, with the reason.

| #   | The fence                                                                                                                                                                                                                                                                                                                                                                        | From                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| F1  | These wait for the owner: money (a paid code review too); logins and secrets; anything that goes live (a merge of app code to main, a switch turned on in the live app); deleting data or files (a working copy and a stash are such things); a change that could lose the owner's data; a real decision on the product. A test on the real device is the owner's by its nature. | owner, 25 Nov; STATE                          |
| F2  | A decision the owner made earlier is never lost or ignored. Before a feature is planned, its earlier decisions are read and carried into its spec. A pick by Claude that touches a decision of the owner is never closed without the owner.                                                                                                                                      | owner, 25 Nov                                 |
| F3  | A spec line reaches a helper word for word: the lines in a brief are equal to the lines in the spec.                                                                                                                                                                                                                                                                             | owner, 25 Nov                                 |
| F4  | The one who builds a part does not write, change or judge the tests that prove it, and the part is reviewed once by a helper that did not build it.                                                                                                                                                                                                                              | owner, 25 Nov                                 |
| F5  | A test is never weakened, skipped or deleted.                                                                                                                                                                                                                                                                                                                                    | the owner's standing rule                     |
| F6  | "Done" is said by a program (the tests, the push guard, CI), never by the builder. "Ready" is written to the owner only when the preview holds the right version and the full set is green on that commit.                                                                                                                                                                       | the standing rule; 1A, 25 Nov                 |
| F7  | Only docs go straight to main: files under `docs/` and files that end in `.md`. Every other file goes through build/next and its pull request, because a push to main with such a file starts the live deploy.                                                                                                                                                                   | 1A, 24 Nov                                    |
| F8  | **Nothing is pushed to main while a release run is working, docs included.** The run puts the app live only if main has not moved since it started.                                                                                                                                                                                                                              | 1A, 25 Nov (the release that did not publish) |
| F9  | A red test in the full set is never passed over. It is fixed, or it is proved to be a fault of the test machine and not of the app. How that proof is made is the owner's decision (section 10).                                                                                                                                                                                 | the owner's standing rule; 26 Nov             |
| F10 | A part that touches start-up or the update path is run on the iPad engine before it is merged.                                                                                                                                                                                                                                                                                   | owner, 24 Nov                                 |
| F11 | After two day parts that the owner has not checked, the teams do only fixes and parts the owner cannot see, until the owner has checked.                                                                                                                                                                                                                                         | owner, 25 Nov                                 |
| F12 | A test whose expected behaviour waits for the owner's decision is not merged; its question goes to the owner the same day.                                                                                                                                                                                                                                                       | 1A; adopted on 25 Nov                         |

## 3. The goals of the way of working, and advice

The owner, 25 Nov: no hard rules on how Opus works; hard rules restricted Opus in phase 1A and the output suffered.

**Goals** (what good looks like; Opus is free in how):

- Something new reaches the owner on the preview each working day. A phase part keeps its full size; it is divided into day parts of 3 to 5 parts of work (owner, 25 Nov).
- Faults are caught before the owner sees them: the full test set runs on every push to the code line, and each recording from the real iPad becomes a test.
- The live app changes often: on the owner's yes, when the full set is green on that commit.
- The owner is asked little and clearly: 2 to 5 questions at once, in easy words, with a pick (the owner's own rule). The owner has no fixed hours and looks in several times a day; a day part does not wait for a yes when its parts are on an approved page, and each message repeats what waits.
- Planning never stops the build: the next phase part is planned with Fable while the current one is built.
- Each helper sees only what it needs: a small brief, with the big spec at hand to check a fact.
- Opus decides by itself and records it. Only a decision on something the owner will see or feel, where the spec was silent, goes to the owner.
- Fable is used little, because Fable is costly. Opus shows the level of the weekly limit in its daily message.

**Advice** (what this plan assumes, from the numbers and the audits; Opus may do otherwise and records why):

- The owner's check of a day part takes about 15 minutes (Fable's estimate).
- For a part: tests from the spec lines first; the fences of this page and of the spec go into every brief, because a helper sees nothing of the chat that started it.
- In tests: wait for a state, not for a time; a test that needs exact input timing runs alone; a speed limit is a hard test only on a machine that is known.
- A proof with many repeats runs on the hosted machines, for parts that touch start-up, the update path, a data upgrade or sign-in.
- A fast first pass: the test tool can run only the test files a change touches. Its makers say it "might miss tests", so it stands beside the full set and never in its place (from the owner's note of 25 Nov on how the Claude Code team works).
- A triage run takes only the failing tests and writes its report as it goes. A time limit comes from the measured length.
- A bug fix says only "the fault is gone"; a new behaviour needs the owner's own sentence; before a fix, the tests of the same spot are read for a clash.
- A helper file for tests ends in `.helper.ts`, and a pattern that picks test files ends in `[.]spec`.
- A recording from the iPad is saved in the repo the day it is taken. After a push, what is on main is read back. After a rename in the docs, the text generators are run.
- A helper stops at a sign-in screen. The tests' own switch for that screen is used on the preview only with the owner's yes.
- A reviewer that has no edit tools can still change files through the command line; Opus checks that the reviewer is stopped there too.
- A spec is audited before the owner approves it, by helpers that have not seen the planner's reasoning: against the owner's words and against the earlier decisions.
- A tool or a skill is built when the same fault happened twice. A tool that prints a warning nobody acts on is taken out or made to count.

## 4. Who does what

**Two modes (owner, 25 Nov).** Planning mode: the owner and Fable write the specs together, in depth, before a phase part starts and while the part before it is built; the owner opens that talk. Execution mode: Opus builds from the specs, decides by itself, records its decisions, and has the permissions it needs. At the start of a phase part the main chat lists the kinds of action that still ask for a click, and the owner allows them once.

| Who                                       | Does                                                                                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The owner                                 | Talks freely in planning; says yes or change to spec lines; checks on the real device; answers the questions; decides the things of F1.                                                            |
| Fable                                     | Planning mode with the owner. In execution mode only the questions below. Fable pushes docs to main only when no release run is working.                                                           |
| The main chat (Opus)                      | Talks to the owner; plans the day part; starts a part manager for each part; merges into the code line; owns the shared files; keeps STATE; is the only one in execution mode that pushes to main. |
| A part manager (a fresh Opus, one a part) | Gets the lines of its part, word for word, and the name of the big spec. Free in how. Starts the test-writer. Gives a plain part to a Sonnet builder, or builds a hard part itself.                |
| The test-writer                           | Writes the tests of a part from its lines, before the build.                                                                                                                                       |
| The reviewer (a fresh Opus)               | One read-only review: the result against the lines of the big spec, and the tests against the lines.                                                                                               |

- **To prove first:** that a helper started by the main chat can itself start a helper. If it cannot, the main chat starts the test-writer and the builder for each part.
- **A doubt about a test** is settled by the reviewer or the main chat, never by the one who built the part (F4).
- **Teams.** Two teams work side by side, each on its own area of the app. After the gate day both build features. A third team only when the numbers of section 8 are good (owner, 25 Nov).
- **Opus's own decisions** go into `docs/DECISIONS.md`, in its part "Decisions to review", newest first, one line each, with a kind: `in-spec`; `how`; `silent-visible` (the spec is silent on something the owner will see or feel). A `silent-visible` decision goes to the owner; one that is hard to undo is raised the same day and its part is parked. The owner's answer becomes a new spec line.
- **Reaching Fable (owner, 25 Nov):** Opus asks Fable by itself, in a short question with the spec line ids, when two spec lines or two earlier decisions of the owner contradict each other, when the spec is silent on something hard to undo, or when a fault is still there after Opus's tries. Three such questions a day, a step of the ladder counted in; Opus asks the owner before a fourth. A part that waits is parked and the others go on.
- **The ladder for a failing build** stays as the owner decided on 24 Nov: Sonnet 3 tries, then Opus at medium effort 2, then Opus at high effort 1, then Fable, then the owner. A fault that only the real iPad shows starts at Opus and counts the owner's re-tests.
- **A product rule that the owner gives while a fix runs** goes into the next questions; the fix in hand does not change. **A Pencil selection fault found in a stage-1 check** becomes an issue for stage 2 and is not fixed in the phase part.

## 5. The order of work

1. **Phase 1A goes live.** State on 26 Nov, 00:20: not live. Three release runs on 25 Nov did not publish: the first because main had moved (F8); the second and the third because tests of the iPad engine failed, different ones each time, on code that had passed in full earlier that evening. The live app still holds the old version.
   - Opus follows the owner's decision on such failures (section 10) and F9.
   - When a run has published: Opus checks that the live `version.json` holds the release commit, tells the owner, and asks for the owner's reading check on the iPad. (The first live update still uses the old updater.)
2. **The close-out of phase 1A.**
   - **2a, at once:**
     - The phase row and the numbers (section 8).
     - The issues: a stage label on each; the twelve marked fixed are closed, and #45; each fault of [the real-app page](../mockups/notebook-look/real-app/README.md) that Opus finds real, and the owner's fault of 25 Nov (a taller box cannot be drawn on), becomes an issue.
     - The picks (owner, 25 Nov): a pick older than 7 days that is built counts as accepted; the product picks of the last week are shown to the owner; F2 holds.
     - The working copies: **a list only** (branch, fully merged or not, anything not committed or stashed). Nothing is removed before the owner's yes to the list. Known today: `ln-buildnext` holds 37 screenshot edits that are not committed (never `git commit -a` there; `git reset --keep`, never `--hard`); `ln-bbar` holds a stash; `ln-fix-pencil-base` is removed only with the owner.
     - The main clone (the push guard runs its copy of the script): look first at what it holds; update it only by a fast-forward, never by a reset, when no builder is in the middle of a push. If a fast-forward is not possible, stop and tell the owner.
     - The five recordings of issue #68: saved under `docs/qa/traces/`. If the raw recordings are gone, the test data is built from the digest.
     - The owner's decisions of 24 and 25 Nov that the rule files do not hold yet: the ladder; two builders; a time limit from the measured length, 60 minutes at most; the state file is `docs/STATE.md`; the replan counter is 0; the idea "a tap on text switches to the Lasso" is dropped (the Lasso selects only by circling).
     - STATE rewritten in place, short, with a pointer to this page. The lines that protect unsaved work (above) are kept word for word.
     - After a docs push to main, main is merged into build/next, so that its pull request does not clash.
   - **2b, after the owner's yes to this page:** the rule files and the helper files (section 9). The helper files are done before the first part of 1B is built.
3. **The online test gate.**
   - First: a pull request from build/next to main is opened again. The preview and the tests run on it. It is merged only on the owner's yes (F1).
   - Measured on 25 Nov: the full set takes 56 minutes in 14 jobs; a push to the pull request runs only the fast set (30 minutes in run 45629335226). The full set was green once and then red three times on the same app code.
   - The goal: the full set runs on every push to the code line, as fast as the free hosted machines allow (20 jobs at once), and its result can be trusted. Also: a check that every test file loads; a red nightly run is the first line of the morning message; a proof run that can be started by hand; a job cut at its time limit counts as red.
   - A change for Opus to weigh: the last step of the release run could publish when the only newer commits on main are docs. Then F8 is no longer a trap.
4. **The quick Pencil taps (issue #68),** as the owner approved on 25 Nov: the iPad's own selection after a Pencil tap stands and our bar shows on it; the triple tap takes the paragraph; Apple's menu may still show at times until stage 2; a Pencil press ends at the first lift signal; a Pencil pointer is never dropped for not being "primary"; the recorder's button is moved off the bar (#59); the recordings are replayed as tests. Then the owner's 10-minute session. If it fails, it waits for stage 2. The detail is section 5 of the review. Meanwhile the second team does the small fixes #50 and #42 and the board.
5. **Phase 1B** (section 6).

## 6. Phase 1B

**What it is for:** "I can use the app every day."

**What is built:** [the notebook spec](phases/phase-1b-notebook-spec-draft.md), when the owner has approved it; the editing path of the stage-1 plan (its parts E2 to E10: the twelve actions with no blocking fault, data safety, the side-by-side check and the owner's test T1B); and what section 6 of the review places in 1B (#50, #42, #52 to #54, the board, the found wishes).

**An order inside 1B** (Fable's proposal; Opus sizes it and may change it, and records why):

1. **Proofs first** (read-only): the list "for Opus to prove" in the spec. Each proof says what exists, what is new, and how large the new part is. After it the owner and Fable confirm the last spec lines.
2. **The faults that lose work or block a line:** first the pen stroke that is saved late while "Saved" shows; then the taller box that cannot be drawn on; then the others that are real.
3. **Shapes that hold text,** arrows inside a box, and pen marks over words.
4. **The approved look:** one chapter made in the real app, shown to the owner in the frame, on the tablet and on the PC, in Night and in Day. The owner's yes makes it the look.
5. **The notes format and the import** (its first step), the notebook skill, and the Test notebook.
6. **The front page,** the row of options, the Summary as a page.
7. **Reading and cards:** the tablet, the PC, the phone.
8. **The first real notebook:** Claude skills, made by the skill, brought in, read by the owner. This is the first "usable every day" check.
9. **The second step of the import:** every other feature of the app (owner, 25 Nov: still in stage 1).

The editing path runs beside these from the first day, on the second team.

**How long:** not known. The stage-1 plan counted about 80 sized hours for 1B; that did not hold the shapes that hold text, the front page, a Summary that is a page, the phone, or an import of every feature. Opus gives a sized estimate after the proofs. It stays marked as an estimate until three day parts are measured. Fable gives no date.

## 7. Every lesson, and where it is applied

| #   | The lesson                                                                                                    | Where it is applied now                                                        |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | The test set that decides a release ran last and was red for a week (1A).                                     | Section 3, goals; section 5, step 3.                                           |
| 2   | A red nightly run stopped nobody (1A).                                                                        | Section 5, step 3.                                                             |
| 3   | A helper file was taken for a test and hid half of the full set (1A).                                         | Section 5, step 3 (every test file loads); section 3, advice (the two names).  |
| 4   | One fix broke nine other files that its own proof did not run (1A).                                           | Section 3, goals (the full set on every push).                                 |
| 5   | A rule was put into the owner's mouth (1A, issue #64).                                                        | Section 3, advice (a bug fix; the owner's own sentence); the spec's "Fable's". |
| 6   | A test waited days for a decision (1A).                                                                       | F12.                                                                           |
| 7   | A long local run was cut at its limit and saved nothing (1A).                                                 | Section 3, advice (triage).                                                    |
| 8   | Tests passed on the PC and failed on the hosted machines (1A).                                                | Section 3, advice (tests); F9.                                                 |
| 9   | "Ready" was said before the preview had the new version (1A).                                                 | F6.                                                                            |
| 10  | Recordings from the iPad lived only in a chat (1A).                                                           | Section 3, advice; section 5, step 2a.                                         |
| 11  | A deadline was set without the measured pace (1A; the target of 23 Nov, 20:00, was missed).                   | Section 6, "How long".                                                         |
| 12  | The tests cannot see what the real iPad does; the owner found the faults (1A).                                | Section 3, goals (recordings become tests); F11; "iPad" on spec lines.         |
| 13  | Paper before product: two thirds of the commits were docs or tooling (16 to 23 Nov).                          | Specs of goals and few fences; the build machine cut to the test gate.         |
| 14  | A phase was too big and had one door to live (1A).                                                            | Section 3, goals (day parts; live often).                                      |
| 15  | Rules changed while the work ran (November).                                                                  | Section 2, the first paragraph; section 4 (a rule given during a fix).         |
| 16  | Hard rules on how to work restricted Opus (owner, 25 Nov).                                                    | Sections 2 and 3.                                                              |
| 17  | The planner added limits the owner never asked for, several times in one day (25 Nov).                        | Section 3, advice (the audits); the spec's "Fable's".                          |
| 18  | Earlier decisions of the owner were left out of a new spec (25 Nov).                                          | F2; section 3, advice (the audits).                                            |
| 19  | Drawn sample pictures were rejected: not in the frame, not made with the app's tools (25 Nov).                | Section 6, step 4.                                                             |
| 20  | One session of real use of the preview found fifteen faults (25 Nov).                                         | Section 5, step 2a (issues); section 6, step 2.                                |
| 21  | A helper passed the sign-in screen with the tests' own switch, against its brief (25 Nov).                    | Section 3, advice.                                                             |
| 22  | A commit message claimed a file that had not been written (25 Nov).                                           | Section 3, advice (read back).                                                 |
| 23  | Following the review to the letter could have removed working copies with unsaved work (25 Nov, audit).       | F1; section 5, step 2a.                                                        |
| 24  | A push of scripts to main started the live deploy (24 Nov).                                                   | F7.                                                                            |
| 25  | Docs pushed to main during a release run stopped the release from publishing; the run looked green (25 Nov).  | F8; section 5, step 3 (the change to weigh).                                   |
| 26  | The full set was green once and then red three times on the same code; a release cost an hour a try (25 Nov). | F9; section 10 (the owner's decision); section 5, step 3 (a result to trust).  |
| 27  | More builders never made the work faster; merging and testing were the slow parts (13 Nov).                   | Section 4, teams.                                                              |
| 28  | Many Sonnet builders under one manager failed (13 Nov and after).                                             | Section 4 (a part manager for each part).                                      |
| 29  | A proof of twenty repeats took seven hours on the PC (23 Nov).                                                | Section 3, advice (the hosted machines).                                       |
| 30  | A race in the update path showed only on the iPad engine (24 Nov).                                            | F10.                                                                           |
| 31  | The push guard ran a copy of itself that was 1,526 commits old (25 Nov).                                      | Section 5, step 2a (the main clone).                                           |
| 32  | Generated texts went stale after a rename in the docs (24 Nov).                                               | Section 3, advice.                                                             |
| 33  | A test job was cut at its 60-minute limit run after run, and the run looked "cancelled", not red (1A).        | Section 5, step 3.                                                             |
| 34  | Most review fails were about paperwork, not the product (22 Nov: 4 of 6).                                     | Section 4 (the reviewer checks the result and the tests against the lines).    |
| 35  | Pencil fine work, which is stage 2, took two days of a stage-1 phase part (24 and 25 Nov).                    | Section 4, the last line.                                                      |
| 36  | A tool printed a warning on every push and nobody acted on it (1A).                                           | Section 3, advice (the last line).                                             |
| 37  | A plan of one small window for a task broke at its first real use (1A).                                       | No such rule in this plan.                                                     |

## 8. The numbers

**Phase 1A, measured (for the phase row):** planned for about 4 days from 22 Nov; the owner's own target of 23 Nov, 20:00, was missed; the owner's yes to go live came on 25 Nov; on 26 Nov, 00:20, it is not live. The full set: 65 to 74 minutes and red on 24 Nov; 56 minutes in 14 jobs on 25 Nov, green once, then red three times on the same app code. Red tests in the full set over the fix round: 26, then 19, then 6, then 0. The owner's findings: six faults in one 20-minute check (24 Nov); issue #68; the update tests passed. Lost to tooling mistakes: 3.3 hours. The push guard blocked 350 pushes of about 2,000. Tasks merged, and the days to the owner's first look: not recorded.

**One line for each day part,** written by Opus from git and CI:

`date | parts planned | parts merged | hours from the start to "ready" | the full set: time and colour | the owner's findings | live: yes or no`

**One cause for each fault the owner finds:** the builder misread the spec; the spec was silent or wrong; a test missed it; only the real iPad shows it.

**After three day parts** Opus shows the owner the three lines and a corrected estimate. The next phase part is a test of this way of working against phase 1A; at its end the owner and Fable compare the two and keep what was better in each.

## 9. Lines in other files that this page replaces

Opus corrects them in step 2b, after the owner's yes. Each file gets a head line that points to this page.

| File                                          | What no longer holds                                                                                                                                                                                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` (the project)                     | The loop with a confirm sheet for every part; phases of 2 weeks with 10 to 20 parts; "five tries for Opus"; "never call Fable by itself"; windows of 100K and four gate layers; 20 of 20 before every merge; the weekly card; outside auditors at two gates; "Opus drafts specs". |
| `docs/METHOD-v2.md`                           | The same points; "Built" as 20 of 20 (now: the full set green after the merge); one spec size with a bottom layer for builders.                                                                                                                                                   |
| `docs/plans/phases/phase-1m-build-machine.md` | Its status "Confirmed" and its parts, except the proof on the hosted machines. The audit accepted on 25 Nov replaces it.                                                                                                                                                          |
| `docs/plans/stage-1-plan.md`                  | "1B starts on the machine"; the sizes of 1B; "diagrams rendered to pictures"; dashboards only in 1D; no phone.                                                                                                                                                                    |
| `.claude/agents/builder.md`                   | "2 tries"; the fixed 20-minute limit of a run; "tests first" written by the builder; the builder merging into the code line.                                                                                                                                                      |
| `.claude/agents/reviewer.md`                  | The check against the bottom layer of the old spec form.                                                                                                                                                                                                                          |
| `.claude/agents/phase-manager.md`             | Not used. It still names old state files.                                                                                                                                                                                                                                         |
| New helper files                              | One for the part manager and one for the test-writer.                                                                                                                                                                                                                             |
| The global `~/.claude` rules and playbook     | "Failed twice"; the old state file name. These are the owner's own files: Opus proposes the change, and the owner makes it or says yes.                                                                                                                                           |
| `docs/STATE.md`                               | "Run 1M from 1M-02"; the old close-out list; old fixed facts ("pull request #5"; "no new code live since 12 Nov"), once the app is live.                                                                                                                                          |

## 10. What waits for the owner

- **Now: how a failed test in a release run is treated.** Fable's pick (26 Nov): each test that failed is run 20 times alone on the iPad engine; 20 of 20 means the machine failed, and the failed jobs of the release run are run again on the same commit; one failure in the 20 is a real fault and is fixed first. The other choice: every unsteady test is made steady before anything is run again.
- A reading check of the live app on the iPad, when Opus says it is live.
- A yes to this page; a yes to the spec's fences and goals; after Opus's proofs, a yes to the last spec lines.
- Yes or no to the product picks of the last week, and to the list of working copies.
- The kinds of action Opus may do without a click, allowed once.
- The changes to the owner's own `~/.claude` files.
- Whether a helper may use the tests' sign-in switch on the preview again.
- The check of each day part on the real device, about 15 minutes; the 10-minute Pencil session; the look of one real chapter; signing in on the phone for the cards.
- Opening the planning talk with Fable for the phase part after 1B.

## 11. Words

- **Stage:** 1, 2 or 3 of the whole plan. The owner also says "phase 1" for stage 1.
- **Phase part:** 1A, 1B, 1C, 1D.
- **Day part:** one working day inside a phase part.
- **Part:** one piece of work, with one part manager.
- **Team:** the builders of one area of the app, working beside another team.
- **Docs:** files under `docs/` and files that end in `.md`. The test machine does not run for them.
- **Board:** the page about the project's state, for the owner. **Dashboard:** an option of a notebook's front page, in the app.

## 12. The audit rounds

- **Round 1 (25 Nov):** four audits by helpers that had not seen Fable's reasoning. The spec against the owner's words; the spec against the earlier decisions; the review against itself; the state of the project. Applied in the first version of this page and the third draft of the spec.
- **Round 2 (25 and 26 Nov):** two attack reads. On this page: the release that could not publish (now F8); no open pull request after the merge (step 3); decisions of the owner that had become advice (now F10, F11, F12); steps that were not safe for unsaved work (step 2a). On the spec: lines that two builders would build in two ways; three things called "summary" in the code; an import that makes no normal notebook today; musts of the owner left as goals. Applied in this version and in the fourth draft of the spec. Five questions went to the owner and were answered on 25 Nov.
- **Round 3:** to come: a check that each finding of rounds 1 and 2 is fixed and that no fix made a new fault.
