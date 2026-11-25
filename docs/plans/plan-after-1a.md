# The plan after phase 1A: one page (compiled 25 Nov 2026)

**Status: compiled by Fable on the owner's word ("let's compile everything now into one thing"). It waits for the owner's yes.** Until that yes, Opus does steps 1 and 2 of section 5 only; both hold nothing but what the owner decided before.

**What this page is.** The one page Opus follows after phase 1A. It holds everything the owner and Fable decided on 25 Nov 2026, with every lesson of phase 1A applied. It replaces, as an instruction, the block "Start here" and sections 0, 13 and 14 of [the Fable review](fable-review-2026-11-25.md). That review stays as the record of the talk, with its reasons and its numbers. Where the two differ, this page wins.

**The other pages that hold:** [the notebook spec](phases/phase-1b-notebook-spec-draft.md) (what is built in phase 1B; a draft until the owner's yes); [the talk notes](phases/phase-1b-notebook-talk.md) (the owner's words); [the earlier decisions, collected](earlier-decisions/README.md); `docs/STATE.md` (where the work stands, kept by Opus).

**Three audit rounds.** Round 1 (four audits by helpers that had not seen Fable's reasoning) is applied here. Rounds 2 and 3 are recorded at the end of this page.

## 1. The targets

The owner's three targets (25 Nov): a part of the work is done and tested in about 8 hours; faults are caught before the owner sees them; the live app gets new things often.

"I can use the app every day" (owner, 25 Nov): on the PC, Claude writes a notebook, the app imports it in full, and the owner reads it and corrects it by typing. On the tablet the owner reads. On the phone the owner answers recall cards.

When fast and accurate disagree, accurate wins: "an accurate result, based on the specs, at the fastest pace" (owner, 25 Nov).

## 2. The fences of the way of working

These must hold. They say what must be true, not how to work. A fence that is added later is told to the owner in the next message, with its reason.

| #   | The fence                                                                                                                                                                                                                                   | From                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| F1  | Four things wait for the owner: money; logins and secrets; anything that goes live; deleting data or files (a working copy and a stash are such things). A test on the real device is the owner's by its nature.                            | owner, 25 Nov                 |
| F2  | A decision the owner made earlier is never lost or ignored. Before a feature is planned, its earlier decisions are read and carried into its spec. A pick by Claude that touches a decision of the owner is never closed without the owner. | owner, 25 Nov                 |
| F3  | A spec line is never reworded on its way to a helper.                                                                                                                                                                                       | owner, 25 Nov                 |
| F4  | The one who builds a part does not write, change or judge the tests that prove it.                                                                                                                                                          | owner, 25 Nov                 |
| F5  | A test is never weakened, skipped or deleted.                                                                                                                                                                                               | the owner's standing rule     |
| F6  | "Done" is said by a program (the tests, the push guard, CI), never by the builder. "Ready" is written to the owner only after the version on the preview is checked.                                                                        | the standing rule; 1A, 25 Nov |
| F7  | Only docs go straight to main. Every other change goes through build/next and its pull request, because a push to main with such a file starts the live deploy.                                                                             | 1A, 24 Nov                    |
| F8  | The code line is not left red. A red full set is sorted before the next merge.                                                                                                                                                              | the owner's standing rule     |
| F9  | The rules of the work change only at the end of a phase part, from the numbers.                                                                                                                                                             | the owner's standing rule     |

## 3. The goals of the way of working, and advice

The owner, 25 Nov: no hard rules on how Opus works; hard rules restricted Opus in phase 1A and the output suffered.

**Goals** (what good looks like; Opus is free in how):

- Something new reaches the owner on the preview each working day. A phase part keeps its full size; it is divided into day parts.
- Faults are caught before the owner sees them: the full test set runs on every push to the code line, and each recording from the real iPad becomes a test.
- The live app changes often: on the owner's yes, when the full set is green on that commit.
- The owner is asked little and clearly: one daily list (the owner's own rule: 2 to 5 questions at once, in easy words, with a pick).
- Planning never stops the build: the next phase part is planned with Fable while the current one is built.
- Each helper sees only what it needs: a small brief, with the big spec at hand to check a fact.
- Opus decides by itself and records it. Only a decision on something the owner will see or feel, where the spec was silent, goes to the owner.
- Fable is used little, because Fable is costly.

**Advice** (what this plan assumes, from the numbers and the audits; Opus may do otherwise and records why; each number here is Fable's estimate):

- A day part of about 3 to 5 parts of work for two teams; the owner's check takes about 15 minutes.
- For a part: tests written from the spec lines first, by a helper that is not the builder; one review by a fresh reviewer, on the product and not on paperwork.
- In tests: wait for a state, not for a time; a test that needs exact input timing runs alone; a speed limit is a hard test only on a machine that is known.
- A proof with many repeats runs on the hosted machines, for parts that touch start-up, the update path, a data upgrade or sign-in. The iPad engine runs before such a part is merged (owner, 24 Nov).
- A triage run takes only the failing tests and writes its report as it goes. A time limit comes from the measured length.
- A bug fix says only "the fault is gone". A new behaviour needs the owner's own sentence.
- A tool or a skill is built when the same fault happened twice (the audit of the build machine, accepted by the owner).

## 4. Who does what

**Two modes (owner, 25 Nov).** Planning mode: the owner and Fable write the specs together, in depth, before a phase part starts and while the part before it is built. Execution mode: Opus builds from the specs, decides by itself, records its decisions, and has the permissions it needs.

| Who                                       | Does                                                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The owner                                 | Talks freely in planning; says yes or change to spec lines; checks on the real device; answers the daily list; decides the four things of F1.                    |
| Fable                                     | Planning mode with the owner. In execution mode only the questions below.                                                                                        |
| The main chat (Opus)                      | Talks to the owner; plans the day part; starts a part manager for each part; merges into the code line; owns the shared files; keeps STATE.                      |
| A part manager (a fresh Opus, one a part) | Gets the lines of its part, word for word, and the name of the big spec. Free in how. Gives a plain part to a Sonnet builder, or builds a hard part itself.      |
| The test-writer                           | Writes the tests of a part from its lines. When the part manager builds the part itself, a different helper settles a doubt about a test, or the main chat does. |
| The reviewer (a fresh Opus)               | One read-only review against the lines of the big spec.                                                                                                          |

- **Teams.** Two teams work side by side, each on its own area of the app. After the gate day both build features. A third team only when the numbers of section 8 are good (owner, 25 Nov).
- **Opus's own decisions** go into `docs/DECISIONS.md`, in its part "Decisions to review", newest first, one line each: the date, the part, the kind, what, why, the spec line it rests on or "silent", easy to undo or not. The kinds: `in-spec`; `how`; `silent-visible` (the spec is silent on something the owner will see or feel). Only `silent-visible` goes into the daily list. The owner's answer becomes a new spec line the same day.
- **The daily list is one list:** the `silent-visible` decisions and every other question, five a day at most, the oldest first.
- **Reaching Fable (owner, 25 Nov):** Opus asks Fable by itself, in a short question with the spec line ids, when two spec lines or two earlier decisions of the owner contradict each other, when the spec is silent on something hard to undo, or when a fault is still there after Opus's tries. Three such questions a day; Opus asks the owner before a fourth. A part that waits is parked and the others go on.
- **The ladder for a failing build** stays as the owner decided on 24 Nov: Sonnet 3 tries, then Opus at medium effort 2, then Opus at high effort 1, then Fable, then the owner. A fault that only the real iPad shows starts at Opus and counts the owner's re-tests.
- **Before a spec is approved** it is audited by helpers that have not seen the planner's reasoning: against the owner's words, and against the earlier decisions (the lesson of 25 Nov: the planner's own limits and forgotten decisions were found only this way).

## 5. The order of work

1. **Phase 1A goes live.** The release run finishes. Opus checks that the live `version.json` holds the commit of the release, tells the owner, and asks for the owner's reading check on the iPad. (The first live update still uses the old updater.)
2. **The close-out of phase 1A.**
   - The phase row and the numbers (section 8).
   - The rule files, corrected (section 9). Each is pushed as a docs change.
   - The issues: a stage label on each; the twelve marked fixed are closed, and #45; each fault of [the real-app page](../mockups/notebook-look/real-app/README.md) that Opus finds real, and the owner's fault of 25 Nov (a taller box cannot be drawn on), becomes an issue.
   - The picks: a pick older than 7 days that is built counts as accepted; the product picks of the last week are shown to the owner; F2 holds.
   - The working copies: **a list only** (branch, fully merged or not, anything not committed or stashed). Nothing is removed before the owner's yes to the list.
   - The main clone: look first at what it holds; update it only by a fast-forward, when no builder is in the middle of a push.
   - The five recordings of issue #68, saved in the repo.
   - The helper files (section 9).
   - STATE rewritten in place, short, with a pointer to this page.
3. **The online test gate.** Measured on 25 Nov: the full set takes 56 minutes in 14 jobs and is green; a push to the code line's pull request runs only the fast set (30 minutes). The goal: the full set runs on every push to the code line, as fast as the free hosted machines allow (20 jobs at once). Also: a check that every test file loads; a red nightly run is the first line of the morning message; a proof run that can be started by hand. Opus measures one run and writes the time down.
4. **The quick Pencil taps (issue #68),** as the owner approved on 25 Nov: the iPad's own selection after a Pencil tap stands and our bar shows on it; a Pencil press ends at the first lift signal; a Pencil pointer is never dropped for not being "primary"; the recordings are replayed as tests (the replay that exists is extended). Then the owner's 10-minute session. If it fails, it waits for stage 2. The detail is in section 5 of the review.
5. **Phase 1B** (section 6).

## 6. Phase 1B

**What it is for:** "I can use the app every day."

**What is built:** [the notebook spec](phases/phase-1b-notebook-spec-draft.md), when the owner has approved it; and the editing path of the stage-1 plan (the twelve actions work with no blocking fault).

**An order inside 1B** (Fable's proposal; Opus sizes it and may change it, and records why):

1. **Proofs first** (read-only, about a day): the list "for Opus to prove" in the spec. Each proof says what exists, what is new, and how large the new part is.
2. **The faults that lose work or block a line:** first the pen stroke that is saved late while "Saved" shows; then the taller box that cannot be drawn on; then the others that are real.
3. **Shapes that hold text,** arrows inside a box, and pen marks over words.
4. **The approved look:** one chapter made in the real app, shown to the owner in the frame, on the tablet and on the PC. The owner's yes makes it the look.
5. **The notes format and the import,** the notebook skill, and the Test notebook.
6. **The first screen:** the dashboard, the contents as a database, the row of options, the Summary first.
7. **Reading and cards:** the tablet, the PC, the phone.
8. **The first real notebook:** Claude skills, made by the skill, brought in, read by the owner. This is the first "usable every day" check.

The editing path runs beside these from the first day, on the second team.

**How long:** not known. The stage-1 plan counted about 80 sized hours for 1B; that did not hold the shapes that hold text, the dashboard as a first screen, a Summary led by a picture, or the phone. Opus gives a sized estimate after the proofs. It stays marked as an estimate until three day parts are measured. Fable gives no date.

## 7. Every lesson, and where it is applied

| #   | The lesson                                                                                                                          | Where it is applied now                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | The test set that decides a release ran last and was red for a week (1A).                                                           | Section 5, step 3; F8.                                                                     |
| 2   | A red nightly run stopped nobody (1A).                                                                                              | Section 5, step 3 (the first line of the morning message).                                 |
| 3   | A helper file was taken for a test and hid half of the full set (1A).                                                               | Section 5, step 3 (the check that every test file loads).                                  |
| 4   | One fix broke nine other files that its own proof did not run (1A).                                                                 | Section 5, step 3 (the full set on every push).                                            |
| 5   | A rule was put into the owner's mouth (1A, issue #64).                                                                              | Every spec line names where it comes from; a line that is not the owner's says "Fable's".  |
| 6   | A test waited days for a decision (1A).                                                                                             | Section 4, the daily list.                                                                 |
| 7   | A long local run was cut at its limit and saved nothing (1A).                                                                       | Section 3, advice.                                                                         |
| 8   | Tests passed on the PC and failed on the hosted machines (1A).                                                                      | Section 3, advice; already applied in the tests on 25 Nov.                                 |
| 9   | "Ready" was said before the preview had the new version (1A).                                                                       | F6.                                                                                        |
| 10  | Recordings from the iPad lived only in a chat (1A).                                                                                 | Section 5, step 2; from now a recording is saved in the repo the day it is taken.          |
| 11  | A deadline was set without the measured pace (1A).                                                                                  | Section 6, "How long".                                                                     |
| 12  | The tests cannot see what the real iPad does; the owner found the faults (1A).                                                      | The owner's check in each day part; replayed recordings; "iPad" on spec lines.             |
| 13  | Paper before product: two thirds of the commits were docs or tooling (16 to 23 Nov).                                                | Specs of goals and few fences; the build machine cut to the test gate.                     |
| 14  | A phase was too big and had one door to live (1A).                                                                                  | Day parts; live on the owner's yes whenever the full set is green.                         |
| 15  | Rules changed while the work ran (November).                                                                                        | F9; the daily list.                                                                        |
| 16  | Hard rules on how to work restricted Opus (owner, 25 Nov).                                                                          | Sections 2 and 3: fences and goals; the rest is advice.                                    |
| 17  | The planner added limits the owner never asked for, four times in one day (25 Nov).                                                 | "Fable's" on such lines; the audits of section 4 before a spec is approved.                |
| 18  | Earlier decisions of the owner were left out of a new spec (25 Nov: the boxes that never overlap, the three themes, the ink rules). | F2; the collected earlier decisions; the audit against them.                               |
| 19  | Drawn sample pictures were rejected: not in the frame, not made with the app's tools (25 Nov).                                      | A look is approved on a real page in the app (the spec, section 7).                        |
| 20  | One hour of real use of the preview found fifteen faults (25 Nov).                                                                  | Section 6, step 2; a real page is made before a look is called done.                       |
| 21  | A helper passed the sign-in screen with the tests' own switch, against its brief (25 Nov).                                          | A helper stops at a sign-in screen. That switch is used again only with the owner's yes.   |
| 22  | A commit message claimed a file that had not been written (25 Nov).                                                                 | After a push, what is on main is read back.                                                |
| 23  | Following the review to the letter could have removed working copies with unsaved work (25 Nov, audit).                             | F1; section 5, step 2 (a list only).                                                       |
| 24  | A push of scripts to main started the live deploy (24 Nov).                                                                         | F7.                                                                                        |
| 25  | More builders never made the work faster; merging and testing were the slow parts (13 Nov).                                         | Two teams; a third only by the numbers.                                                    |
| 26  | Many Sonnet builders under one manager failed (13 Nov and after).                                                                   | Each part has its own Opus part manager.                                                   |
| 27  | A proof of twenty repeats took seven hours on the PC (23 Nov).                                                                      | Section 3, advice (the hosted machines).                                                   |
| 28  | A race in the update path showed only on the iPad engine (24 Nov).                                                                  | Section 3, advice (the iPad engine before such a merge).                                   |
| 29  | The push guard ran a copy of itself that was 1,526 commits old (25 Nov).                                                            | Section 5, step 2 (the main clone).                                                        |
| 30  | Generated texts went stale after a rename in the docs (24 Nov).                                                                     | Opus runs the generators after such a rename; a check for it is built if it happens twice. |

## 8. The numbers

**Phase 1A, measured (for the phase row):** planned for about 4 days from 22 Nov; the owner's yes to go live came on 25 Nov, day 4. The full set: 65 to 74 minutes and red on 24 Nov; 56 minutes and green on 25 Nov, in 14 jobs. Red tests in the full set over the fix round: 26, then 19, then 6, then 0. The owner's findings: six faults in one 20-minute check (24 Nov); issue #68; the update tests passed. Lost to tooling mistakes: 3.3 hours. The push guard blocked 350 pushes of about 2,000. Tasks merged, and the days to the owner's first look: not recorded.

**One line for each day part,** written by Opus from git and CI:

`date | parts planned | parts merged | hours from the start to "ready" | the full set: time and colour | the owner's findings | live: yes or no`

**One cause for each fault the owner finds:** the builder misread the spec; the spec was silent or wrong; a test missed it; only the real iPad shows it.

**After three day parts** Opus shows the owner the three lines and a corrected estimate. The next phase part is a test of this way of working against phase 1A; at its end the owner and Fable compare the two and keep what was better in each.

## 9. Lines in other files that this page replaces

Opus corrects them at the close-out, by searching for the words, not by line numbers. Each file gets a head line that points to this page.

| File                                          | What no longer holds                                                                                                                                                                                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` (the project)                     | The loop with a confirm sheet for every part; phases of 2 weeks with 10 to 20 parts; "five tries for Opus"; "never call Fable by itself"; windows of 100K and four gate layers; 20 of 20 before every merge; the weekly card; outside auditors at two gates; "Opus drafts specs". |
| `docs/METHOD-v2.md`                           | The same points; "Built" as 20 of 20 (now: the full set green after the merge); one spec size with a bottom layer for builders.                                                                                                                                                   |
| `docs/plans/phases/phase-1m-build-machine.md` | Its status "Confirmed" and its parts, except the proof on the hosted machines. The audit accepted on 25 Nov replaces it.                                                                                                                                                          |
| `docs/plans/stage-1-plan.md`                  | "1B starts on the machine"; the sizes of 1B; "diagrams rendered to pictures"; dashboards only in 1D; no phone.                                                                                                                                                                    |
| `.claude/agents/builder.md`                   | "2 tries"; the fixed 20-minute limit of a run.                                                                                                                                                                                                                                    |
| `.claude/agents/reviewer.md`                  | The check against the bottom layer of the old spec form.                                                                                                                                                                                                                          |
| `.claude/agents/phase-manager.md`             | Not used. It still names old state files.                                                                                                                                                                                                                                         |
| New helper files                              | One for the part manager and one for the test-writer.                                                                                                                                                                                                                             |
| The global `~/.claude` rules and playbook     | "Failed twice"; the old state file name. (The owner's own files: Opus proposes the change; the owner makes it or says yes.)                                                                                                                                                       |
| `docs/STATE.md`                               | "Run 1M from 1M-02"; the old close-out list, where this page says otherwise.                                                                                                                                                                                                      |

## 10. What waits for the owner

- A reading check of the live app on the iPad, when Opus says it is live.
- A yes to this page.
- Three questions on the notebook spec (its section 8), then the yes to its lines.
- Whether a helper may use the tests' sign-in switch on the preview again.
- Later: the list of working copies; the 10-minute Pencil session; the look of one real chapter.

## 11. Words

- **Stage:** 1, 2 or 3 of the whole plan. The owner also says "phase 1" for stage 1.
- **Phase part:** 1A, 1B, 1C, 1D.
- **Day part:** one working day inside a phase part.
- **Part:** one piece of work, with one part manager.
- **Team:** the builders of one area of the app, working beside another team.
- **Board:** the page about the project's state, for the owner. **Dashboard:** the first screen of a notebook, in the app.

## 12. The audit rounds

- **Round 1 (25 Nov):** four audits. The spec against the owner's words: 16 things missed, 11 limits of the planner's own, 6 pairs of lines that fought. The spec against the earlier decisions: 4 contradicted, 12 missing. The review itself: 10 contradictions inside it, stale text, 11 gaps, 6 risks. The state of the project. All applied in this page and in the third draft of the spec.
- **Round 2:** to come.
- **Round 3:** to come.
