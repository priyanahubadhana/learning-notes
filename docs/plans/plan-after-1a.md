# The plan after phase 1A: one page (compiled 25 Nov 2026; third version, 26 Nov, after three audit rounds)

**Status: the owner said yes on 26 Nov, with a review afterwards.** The owner: "Let's give Opus an opportunity to do it. Just make sure ... it does not changes something which we have already decided and made a rule out of by mistake. I want to review those changes later ... It can continue working." Opus works by this page from now on. The rule files are brought in line under the safeguards of step 2b in section 5, and the owner reviews the list of those changes when the owner chooses. Compiled by Fable on the owner's word of 25 Nov ("let's compile everything now into one thing").

**What this page is.** The one page Opus follows after phase 1A. It holds what the owner and Fable decided on 25 Nov 2026, with every lesson of phase 1A applied. It replaces, as an instruction, the block "Start here" and sections 0, 4, 7, 13 and 14 of [the Fable review](fable-review-2026-11-25.md). Four parts of the review still instruct: section 5 (the quick Pencil taps); section 6 (where each pending wish and issue is placed); section 13.2 (the big spec: a line is changed only by the owner and keeps its id; an older spec file gets the head line "replaced by" and nothing is deleted); and the table of section 14.6 (what is built only when a named fault happens, which the owner accepted on 25 Nov). The rest of the review is the record of the talk. Where the two differ, this page wins.

**The other pages that hold:** [the notebook spec](phases/phase-1b-notebook-spec-draft.md) (approved by the owner on 26 Nov; Opus moves it to `docs/features/`); [the talk notes](phases/phase-1b-notebook-talk.md); [the earlier decisions, collected](earlier-decisions/README.md); `docs/STATE.md` (where the work stands, kept by Opus).

## 1. The targets

The owner's three targets (25 Nov): a day part of the work is done and tested in about 8 hours; faults are caught before the owner sees them; the live app gets new things often.

"I can use the app every day" (the owner agreed on 25 Nov): on the PC, Claude writes a notebook, the app imports it in full, and the owner reads it and customizes it. On the tablet the owner reads. On the phone the owner answers recall cards.

When fast and accurate disagree, accurate wins: "an accurate result, based on the specs, at the fastest pace" (owner, 25 Nov).

## 2. The fences of the way of working

These must hold. They say what must be true, not how to work. Nothing is cut and no rule of the work changes without the owner's yes, and rules change only at a phase end, from the numbers (the owner's standing rule). One exception, for safety: Opus may add a fence at once; it tells the owner in the next message, with the reason.

| #   | The fence                                                                                                                                                                                                                                                                                                                                                                        | From                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| F1  | These wait for the owner: money (a paid code review too); logins and secrets; anything that goes live (a merge of app code to main, a switch turned on in the live app); deleting data or files (a working copy and a stash are such things); a change that could lose the owner's data; a real decision on the product. A test on the real device is the owner's by its nature. | owner, 25 Nov; STATE                                                                |
| F2  | A decision the owner made earlier is never lost or ignored. Before a feature is planned, its earlier decisions are read and carried into its spec. A pick by Claude that touches a decision of the owner is never closed without the owner.                                                                                                                                      | owner, 25 Nov                                                                       |
| F3  | A spec line reaches a helper word for word: the lines in a brief are equal to the lines in the spec.                                                                                                                                                                                                                                                                             | owner, 25 Nov                                                                       |
| F4  | The one who builds a part does not write, change or judge the tests that prove it, and the part is reviewed once by a helper that did not build it.                                                                                                                                                                                                                              | owner, 25 Nov                                                                       |
| F5  | A test is never weakened, skipped or deleted.                                                                                                                                                                                                                                                                                                                                    | the owner's standing rule                                                           |
| F6  | "Done" is said by a program (the tests, the push guard, CI), never by the builder. "Ready" is written to the owner only when the preview holds the right version and the full set is green on the same app code. (A pull request runs only the fast set; the full set is a run by hand on the code line, or the nightly run.)                                                    | the standing rule; 1A, 25 Nov                                                       |
| F7  | Only docs go straight to main: files under `docs/` and files that end in `.md`. Every other file goes through build/next and its pull request, because a push to main with such a file starts the live deploy.                                                                                                                                                                   | 1A, 24 Nov                                                                          |
| F8  | While a release run is working, nothing but docs is pushed to main. (Since the release fix of 26 Nov a commit of docs only no longer stops a publish; before that fix nothing at all could be pushed.)                                                                                                                                                                           | 1A, 25 Nov (the release that did not publish); 26 Nov                               |
| F9  | A red test in the full set is never passed over. Its root cause is found, from its recording, and fixed where it lies: in the app, in the test, or in the set-up of the test machine. A longer wait, a retry or a higher limit is not a fix. A test that passed only on its second try is listed and treated the same way.                                                       | the owner's standing rule; owner, 26 Nov ("find root cause and fix it permanently") |
| F10 | A part that touches start-up or the update path is run on the iPad engine before it is merged.                                                                                                                                                                                                                                                                                   | owner, 24 Nov                                                                       |
| F11 | After two day parts that the owner has not checked, the teams do only fixes and parts the owner cannot see, until the owner has checked.                                                                                                                                                                                                                                         | owner, 25 Nov                                                                       |
| F12 | A test whose expected behaviour waits for the owner's decision is not merged; its question goes to the owner the same day.                                                                                                                                                                                                                                                       | 1A; adopted on 25 Nov                                                               |

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
- Fable is used little, because Fable is costly. Opus shows the level of the weekly limit in its daily message. The work runs at full speed and nothing is turned down when the limit runs low (owner, 25 Nov); buying more is the owner's own decision.

**Advice** (what this plan assumes, from the numbers and the audits; Opus may do otherwise and records why):

- The owner's check of a day part takes about 15 minutes (Fable's estimate).
- For a part: tests from the spec lines first; the fences of this page and of the spec go into every brief, because a helper sees nothing of the chat that started it.
- A red or unsteady test: its recording is read first (the time line around the failing step, with real time stamps), before any change. On 25 Nov waits were added to such tests and they failed again; on 26 Nov the recordings gave each cause within the hour.
- In tests: wait for a state, not for a time; a test that needs exact input timing runs alone; a speed limit is a hard test only on a machine that is known.
- A proof with many repeats runs on the hosted machines, for parts that touch start-up, the update path, a data upgrade or sign-in.
- A fast first pass: the test tool can run only the test files a change touches. Its makers say it "might miss tests", so it stands beside the full set and never in its place (from the owner's note of 25 Nov on how the Claude Code team works).
- A triage run takes only the failing tests and writes its report as it goes. A time limit comes from the measured length.
- A bug fix says only "the fault is gone"; a new behaviour needs the owner's own sentence; before a fix, the tests of the same spot are read for a clash.
- A helper file for tests ends in `.helper.ts`, and a pattern that picks test files ends in `[.]spec`.
- A recording from the iPad is saved in the repo the day it is taken. After a push, what is on main is read back. After a rename in the docs, the text generators are run.
- A helper stops at a sign-in screen. The tests' own switch for that screen is used on the preview only with the owner's yes. The owner gave that yes on 26 Nov for one use: Opus's read-only proofs of section 6, on the preview only, to look, with no real account and no real data. Any other use asks again.
- A reviewer that has no edit tools can still change files through the command line; Opus checks that the reviewer is stopped there too.
- A spec is audited before the owner approves it, by helpers that have not seen the planner's reasoning: against the owner's words and against the earlier decisions.
- A tool or a skill is built when the same fault happened twice. A tool that prints a warning nobody acts on is taken out or made to count.

**Features of Claude Code itself (owner, 26 Nov; checked against its documents that day):**

- **The advisor: yes, as a trial.** In the first day part of 1B the Sonnet builders have Opus as their advisor: a builder asks Opus for advice in the middle of its task, with no hand-over. The owner turns it on once by typing `/advisor opus` in the main chat (only a person can turn it on; the feature is experimental). Opus records the tries for each part and the usage with it; it stays only if those numbers are better than without it. Fable is not set as an advisor: each such call is billed outside the plan, and nothing limits how many there are (F1).
- **The built-in code review: yes.** The reviewer runs it at the normal level on each finished part, beside its own read of the result against the spec lines. It runs as a helper apart from the builder, so F4 holds.
- **The deep review in the cloud (also called the ultra review): not during the build.** It is used when the whole of stage 1 is done. Opus reminds the owner then, and asks before each run: three runs are free, later ones are paid. Only the owner can start it.
- **Not taken:** `/ship` and `/steward` (only a person can start them; on a Windows PC their watching half does not start; the review is done by the chat that built the work, against F4), and Code Mode (experimental; it runs only in the plain terminal and changes speed, not the result). Opus keeps doing the useful part of `/ship` itself: it opens the pull request, watches its tests, and merges only on the owner's yes. Checked twice on 26 Nov, the second time on the owner's word: the documents say "/ship starts only from a line that you type" and "On native Windows, no watch starts" (it "can still review your change"); it needs Claude Code 2.1.330 or later in a terminal (the terminal copy on this PC was 2.1.316). What is in public beta on GitHub is another thing with a like name, "Claude Ship" (a managed review, a pull request steward and approvals); the documents say it "is available on Team and Enterprise plans", and the owner's plan is Max. If the owner moves to such a plan, or builds on a Mac or Linux machine, this is looked at again.

## 4. Who does what

**Two modes (owner, 25 Nov).** Planning mode: the owner and Fable write the specs together, in depth, before a phase part starts and while the part before it is built; the owner opens that talk. After each free talk Fable writes "What I heard" and three lines on what would make the next talk give a better spec. Execution mode: Opus builds from the specs, decides by itself, records its decisions, and has the permissions it needs. At the start of a phase part the main chat lists the kinds of action that still ask for a click, and the owner allows them once.

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
- **Reaching Fable (owner, 25 Nov):** Opus asks Fable by itself, in a short question with the spec line ids, when two spec lines or two earlier decisions of the owner contradict each other, when the spec is silent on something hard to undo, or when a fault is still there after Opus's tries. Three such questions a day; Opus asks the owner before a fourth. (Fable's reading, not the owner's: a step of the ladder that reaches Fable counts as one of the three.) A part that waits is parked and the others go on.
- **The ladder for a failing build** stays as the owner decided on 24 Nov: Sonnet 3 tries, then Opus at medium effort 2, then Opus at high effort 1, then Fable, then the owner. A fault that only the real iPad shows starts at Opus and counts the owner's re-tests.
- **A product rule that the owner gives while a fix runs** goes into the next questions; the fix in hand does not change. **A Pencil selection fault found in a stage-1 check** becomes an issue for stage 2 and is not fixed in the phase part.

## 5. The order of work

1. **Phase 1A goes live.**
   - **What happened on 25 Nov.** The full set was green on build/next (run 45610217196). The owner said yes and the code was merged into main. The release run on main was stopped by hand after 21 minutes: three docs commits had moved main (one by Opus, two by Fable), so it could no longer publish. Two full runs by hand on main then failed on tests of the iPad engine, different ones each time, on the same app code.
   - **The root cause (Fable, 26 Nov, from the run history and the recordings).** Three things together. (a) The release asked for a second green full run on code that had already passed in full. (b) Since its iPad part truly runs (24 Nov), the full set was green in about one run of ten, for the causes named in step 3. (c) A commit of docs on main stopped a publish, and the run still looked finished.
   - **The fix (26 Nov, pull request #70, one review by a fresh reviewer).** The same app code is tested in full once: on main, the job `proven` looks for an earlier run of main or build/next whose full set passed on exactly this app code; when it finds one, the full set is not run again and the publish follows the checks; any doubt runs the full set as before. The publish step compares the code, not the commit id. No test and no app file changed. The gate keeps its strength: nothing is published without one green full run on exactly the code that is published.
   - **How a release goes from now on.** The full set is green on build/next in a run by hand with "full" ticked (the night run cannot count as the proof: it runs under main's commit). The owner says yes. The pull request is merged. The run on main finds the proof and publishes in about 15 minutes. Opus checks that the live `version.json` holds the merge commit.
   - **State now:** **phase 1A is live since 26 Nov, 01:31 IST.** Pull request #70 was merged (main 7e53ae5d); the run on main (45689636839) found the proof (run 45610217196), skipped the second full run, and published in 8 minutes; the live `version.json` holds 7e53ae5d (checked).
   - When it is live: Opus tells the owner and asks for the owner's reading check on the iPad. (The first live update still uses the old updater.)
2. **The close-out of phase 1A.**
   - **2a, at once:**
     - The phase row and the numbers (section 8).
     - The issues: a stage label on each; the twelve marked fixed are closed, and #45; each fault of [the real-app page](../mockups/notebook-look/real-app/README.md) that Opus finds real, and the owner's fault of 25 Nov (a taller box cannot be drawn on), becomes an issue.
     - The picks (owner, 25 Nov): a pick older than 7 days that is built counts as accepted; the product picks of the last week are shown to the owner; F2 holds.
     - The working copies: **a list only** (branch, fully merged or not, anything not committed or stashed). Nothing is removed before the owner's yes to the list. Known today: `ln-buildnext` holds 37 screenshot edits that are not committed (never `git commit -a` there; `git reset --keep`, never `--hard`); `ln-bbar` holds a stash; `ln-fix-pencil-base` is removed only with the owner.
     - The main clone (the push guard runs its copy of the script): look first at what it holds; update it only by a fast-forward, never by a reset, when no builder is in the middle of a push. If a fast-forward is not possible, stop and tell the owner.
     - The five recordings of issue #68: saved under `docs/qa/traces/`. If the raw recordings are gone, the test data is built from the digest.
     - The owner's decisions of 24 and 25 Nov that the rule files do not hold yet are written into STATE as notes (no rule file is touched before step 2b): the ladder; two builders; a time limit from the measured length, 60 minutes at most; the state file is `docs/STATE.md`; the replan counter is 0; the idea "a tap on text switches to the Lasso" is dropped (the Lasso selects only by circling).
     - STATE rewritten in place, short, with a pointer to this page. Its line "Run 1M from 1M-02" and its old close-out list are replaced by that pointer now, because a new chat would follow them. Kept word for word: the lines that protect unsaved work (above), the list of hot files, "one iPad-engine suite at a time on this PC", and what waits for the owner. The open items of STATE's own close-out list are carried over, none dropped: the test-method proposals from the six faults of 24 Nov, the open point S1 of the selection bar spec, the phone-shot tests as an issue, and the LEARNING lines.
     - After a docs push to main, main is merged into build/next, so that its pull request does not clash; not while the owner is in the middle of a test on the preview.
   - **2b, the rule files and the helper files (section 9), on the owner's yes of 26 Nov, with a review afterwards.** The helper files are done before the first part of 1B is built. What must hold, so that no rule the owner decided is changed by mistake:
     - **The old rule files can be put back in one step.** Before the first change Opus marks the state of the repo (a tag), and the list below names that mark.
     - **Only the lines that section 9 names are changed.** Every other line of a rule file stays word for word. A line Opus doubts stays as it is and goes on the list as a question.
     - **A rule that came from a decision of the owner changes only where a later decision of the owner replaces it.** The list names both decisions, with their dates (F2). Where no later decision exists, the rule stays.
     - **The changes stand apart:** in commits of their own, never mixed with other work.
     - **A list for the owner,** in easy words, at `docs/plans/rule-changes-2026-11-26.md`: for each change the file, the old words, the new words, and the decision of the owner it comes from; then the questions; then how to put everything back.
     - **One check by a fresh helper that did not make the changes,** before Opus works by them: each change against this page and against [the earlier decisions, collected](earlier-decisions/README.md). What it finds is corrected, or put on the list.
     - **The owner's review, when the owner chooses.** Until it is done, Opus's daily message says that the list waits. For each item the owner says "ok" or "put back". A "put back" is done the same day, and the work done under that rule since then is looked at again.
     - The owner's own global files under `~/.claude` are not touched: Opus only proposes (section 9).
3. **The online test gate.**
   - Done on 26 Nov: the pull request from build/next to main is open again (#70), and the release fix of step 1.
   - Measured on 25 Nov: the full set takes 56 minutes in 14 jobs; a push to the pull request runs only the fast set (30 minutes in run 45629335226). The full set was green in about one run of ten.
   - **First work of the gate: the causes found in the recordings of the two failed release runs (26 Nov), each fixed at its cause (F9).** In short:
     1. **A real fault in the app (PC).** One mouse click outside a box that is being typed in can drop the selection, as if it were two taps: the page reads the box's state when the button is released, but the browser has already moved the focus when it was pressed (`src/paper/PaperFrame.tsx`, `tapPaper`). The tests C10 and C11 of `e2e/cBoxes.spec.ts` showed it for days as "passed on the second try". The fix is in the app (decide from the state at the press). The proof: a new test that holds the mouse button 100 ms; it fails every time today.
     2. **A test that depends on real milliseconds.** F63 (`e2e/tb2-bar-fix.spec.ts:160`) reads a position, then makes its first Pencil touch; the app switches to Pencil mode on that touch only when the last key press is more than 1.5 seconds old, and then the page moves 10 px. On a slow machine it is, on a fast one it is not. The fix is in the test (the mode is set before the position is read). Other tests with the same pattern are listed in the report.
     3. **A fault in the test's own driver.** The timed Pencil tap tests (`e2e/c45-symbols-scribble.spec.ts`, driver `e2e/realPen.ts`) wait for the browser's answer to a pointer move before each next press. On the failed machine that answer came only with the next redraw, about 490 ms later, so every gap arrived late whatever the driver did. The app was right in every run. The fix is in the driver (a press goes out at its planned time; the driver records when it really sent each event, so that it can tell its own wait from a slow machine). The limit of ten late runs stays (decision of 19 Nov).
     4. **A hosted machine that stops drawing.** After the box bar appears, or while text is selected, some hosted machines draw nothing for 0.5 to 0.9 seconds, while the page itself answers in a few milliseconds. This is behind the click that timed out at 800 ms (`e2e/tb2-bar.spec.ts:407`) and it feeds causes 2 and 3. Likely the bar's blur, drawn without a graphics card; not proven. To do: measure the time between frames around the bar's first show, with the blur and without; the test clicks by position, so that it still proves "the tap is not swallowed" and no longer measures the drawing speed.
     5. **A second real fault in the app: fresh ink is saved late.** The first pen stroke in a new box asks for a save in 0.4 seconds, and the next redraw pushes that save to 3 seconds (`src/ink/inkDoc.ts`, `schedule`). Test TB-37 (`e2e/tb2-pencil.spec.ts:171`) showed it when the machine was slow. It is of one kind with the fault "a pen stroke is saved late while Saved shows" of the real-app page. The fix is in the app (a waiting save is never moved later), with a unit test.
     6. **A test that reads in the middle of a slide.** TB-32 (`e2e/tb2-group.spec.ts:293`) reads the ink and its box at two moments while the box's 150 ms slide has not been drawn. The fix is in the test (wait for the box's own animations to end; read both in one step).
   - **One condition lies behind causes 2 to 6:** on some hosted machines the page of the iPad test engine redraws about once a second instead of sixty times (cause 4). Every wait that counts frames or animations stalls, and every wait counted in milliseconds runs out. Why it happens is not proven. So the first two things built are: the measurement of cause 4, and each iPad-engine test writing its measured frame time into its result, so that a machine that is not drawing is seen next to a failure.
   - The full reports, with the time lines and the proposed changes: [docs/qa/unsteady-tests-2026-11-26](../qa/unsteady-tests-2026-11-26/README.md). Nothing in them is proven by a test run yet; each fix is built in the normal way, tests first.
   - Opus's branch `fix/flaky-g1` holds earlier work on the shaky tests (stopped on 26 Nov, kept). Before any of it is used, it is checked against the reports: a change that only adds a wait or a retry is not taken.
   - **Then, the goal as before:** the full set runs on every push to the code line, as fast as the free hosted machines allow (20 jobs at once), and its result can be trusted. Also: a check that every test file loads; a red nightly run is the first line of the morning message; a proof run with many repeats that can be started by hand; a job cut at its time limit counts as red; a test that passed only on its second try is listed in the run's summary and in the morning message (F9).
   - About 22 tests hold a hard speed limit in milliseconds and 11 use a wait under one second (the list is in the report of cause 3). Each is looked at once: a speed limit is a hard test only on a machine that is known (section 3).
4. **The quick Pencil taps (issue #68),** as the owner approved on 25 Nov: the iPad's own selection after a Pencil tap stands and our bar shows on it; the triple tap takes the paragraph; Apple's menu may still show at times until stage 2; a Pencil press ends at the first lift signal; a Pencil pointer is never dropped for not being "primary"; the recorder's button is moved off the bar (#59); the recordings are replayed as tests. Then the owner's 10-minute session. If it fails, it waits for stage 2. The detail is section 5 of the review. Meanwhile the second team does the small fixes #50 and #42 and the board.
5. **Phase 1B** (section 6).

## 6. Phase 1B

**What it is for:** "I can use the app every day."

**What is built:** [the notebook spec](phases/phase-1b-notebook-spec-draft.md), which the owner approved on 26 Nov; the editing path of the stage-1 plan (its parts E2 to E10: the twelve actions with no blocking fault, data safety, the side-by-side check and the owner's test T1B); and what section 6 of the review places in 1B (#50, #42, #52 to #54, the board, the found wishes).

**An order inside 1B** (Fable's proposal; Opus sizes it and may change it, and records why):

1. **Proofs first** (read-only, so they may start at once, beside steps 1 to 4 of section 5): the list "for Opus to prove" in the spec. Each proof says what exists, what is new, and how large the new part is. After it the owner and Fable confirm the last spec lines.
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

| #   | The lesson                                                                                                                        | Where it is applied now                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | The test set that decides a release ran last and was red for a week (1A).                                                         | Section 3, goals; section 5, step 3.                                           |
| 2   | A red nightly run stopped nobody (1A).                                                                                            | Section 5, step 3.                                                             |
| 3   | A helper file was taken for a test and hid half of the full set (1A).                                                             | Section 5, step 3 (every test file loads); section 3, advice (the two names).  |
| 4   | One fix broke nine other files that its own proof did not run (1A).                                                               | Section 3, goals (the full set on every push).                                 |
| 5   | A rule was put into the owner's mouth (1A, issue #64).                                                                            | Section 3, advice (a bug fix; the owner's own sentence); the spec's "Fable's". |
| 6   | A test waited days for a decision (1A).                                                                                           | F12.                                                                           |
| 7   | A long local run was cut at its limit and saved nothing (1A).                                                                     | Section 3, advice (triage).                                                    |
| 8   | Tests passed on the PC and failed on the hosted machines (1A).                                                                    | Section 3, advice (tests); F9.                                                 |
| 9   | "Ready" was said before the preview had the new version (1A).                                                                     | F6.                                                                            |
| 10  | Recordings from the iPad lived only in a chat (1A).                                                                               | Section 3, advice; section 5, step 2a.                                         |
| 11  | A deadline was set without the measured pace (1A; the target of 23 Nov, 20:00, was missed).                                       | Section 6, "How long".                                                         |
| 12  | The tests cannot see what the real iPad does; the owner found the faults (1A).                                                    | Section 3, goals (recordings become tests); F11; "iPad" on spec lines.         |
| 13  | Paper before product: two thirds of the commits were docs or tooling (16 to 23 Nov).                                              | Specs of goals and few fences; the build machine cut to the test gate.         |
| 14  | A phase was too big and had one door to live (1A).                                                                                | Section 3, goals (day parts; live often).                                      |
| 15  | Rules changed while the work ran (November).                                                                                      | Section 2, the first paragraph; section 4 (a rule given during a fix).         |
| 16  | Hard rules on how to work restricted Opus (owner, 25 Nov).                                                                        | Sections 2 and 3.                                                              |
| 17  | The planner added limits the owner never asked for, several times in one day (25 Nov).                                            | Section 3, advice (the audits); the spec's "Fable's".                          |
| 18  | Earlier decisions of the owner were left out of a new spec (25 Nov).                                                              | F2; section 3, advice (the audits).                                            |
| 19  | Drawn sample pictures were rejected: not in the frame, not made with the app's tools (25 Nov).                                    | Section 6, step 4.                                                             |
| 20  | One session of real use of the preview found fifteen faults (25 Nov).                                                             | Section 5, step 2a (issues); section 6, step 2.                                |
| 21  | A helper passed the sign-in screen with the tests' own switch, against its brief (25 Nov).                                        | Section 3, advice.                                                             |
| 22  | A commit message claimed a file that had not been written (25 Nov).                                                               | Section 3, advice (read back).                                                 |
| 23  | Following the review to the letter could have removed working copies with unsaved work (25 Nov, audit).                           | F1; section 5, step 2a.                                                        |
| 24  | A push of scripts to main started the live deploy (24 Nov).                                                                       | F7.                                                                            |
| 25  | Docs pushed to main during a release run stopped the release from publishing; the run looked green (25 Nov).                      | F8; section 5, step 1 (the publish step compares the code).                    |
| 26  | The full set was green once and then red three times on the same code; a release cost an hour a try (25 Nov).                     | F9; section 5, steps 1 and 3.                                                  |
| 27  | More builders never made the work faster; merging and testing were the slow parts (13 Nov).                                       | Section 4, teams.                                                              |
| 28  | Many Sonnet builders under one manager failed (13 Nov and after).                                                                 | Section 4 (a part manager for each part).                                      |
| 29  | A proof of twenty repeats took seven hours on the PC (23 Nov).                                                                    | Section 3, advice (the hosted machines).                                       |
| 30  | A race in the update path showed only on the iPad engine (24 Nov).                                                                | F10.                                                                           |
| 31  | The push guard ran a copy of itself that was 1,526 commits old (25 Nov).                                                          | Section 5, step 2a (the main clone).                                           |
| 32  | Generated texts went stale after a rename in the docs (24 Nov).                                                                   | Section 3, advice.                                                             |
| 33  | A test job was cut at its 60-minute limit run after run, and the run looked "cancelled", not red (1A).                            | Section 5, step 3.                                                             |
| 34  | Most review fails were about paperwork, not the product (22 Nov: 4 of 6).                                                         | Section 4 (the reviewer checks the result and the tests against the lines).    |
| 35  | Pencil fine work, which is stage 2, took two days of a stage-1 phase part (24 and 25 Nov).                                        | Section 4, the last line.                                                      |
| 36  | A tool printed a warning on every push and nobody acted on it (1A).                                                               | Section 3, advice (the last line).                                             |
| 38  | The same code had to pass the full set twice in a row to go live, while the set passed about one time in ten (25 Nov).            | Section 5, step 1 (tested in full once).                                       |
| 39  | Tests that passed only on their second try were shown as green for days; two of them pointed at a real fault in the app (25 Nov). | F9; section 5, step 3.                                                         |
| 40  | Unsteady tests got longer waits and failed again; reading the recordings gave each cause within the hour (25 and 26 Nov).         | F9; section 3, advice.                                                         |
| 41  | A rule can be changed by mistake when many rule files are rewritten at once (the owner's caution, 26 Nov).                        | Section 5, step 2b (the safeguards and the owner's review).                    |
| 37  | A plan of one small window for a task broke at its first real use (1A).                                                           | No such rule in this plan.                                                     |

## 8. The numbers

**Phase 1A, measured (for the phase row):** planned for about 4 days from 22 Nov; the owner's own target of 23 Nov, 20:00, was missed; the owner's yes to go live came on 25 Nov; it went live on 26 Nov, 01:31 IST, after three release runs that published nothing and the release fix of section 5, step 1 (that release run took 8 minutes). The full set: 65 to 74 minutes and red on 24 Nov; 56 minutes in 14 jobs on 25 Nov, green once, then red three times on the same app code. Red tests in the full set over the fix round: 26, then 19, then 6, then 0. The owner's findings: six faults in one 20-minute check (24 Nov); issue #68; the update tests passed. Lost to tooling mistakes: 3.3 hours. The push guard blocked 350 pushes of about 2,000. Tasks merged, and the days to the owner's first look: not recorded.

**One line for each day part,** written by Opus from git and CI:

`date | parts planned | parts merged | hours from the start to "ready" | the full set: time and colour | the owner's findings | live: yes or no`

**One cause for each fault the owner finds:** the builder misread the spec; the spec was silent or wrong; a test missed it; only the real iPad shows it.

**After three day parts** Opus shows the owner the three lines and a corrected estimate. The next phase part is a test of this way of working against phase 1A; at its end the owner and Fable compare the two and keep what was better in each.

## 9. Lines in other files that this page replaces

Opus corrects them in step 2b, under its safeguards (the owner's yes of 26 Nov, with a review afterwards). Each file gets a head line that points to this page.

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
| `docs/STATE.md`                               | Already in step 2a: "Run 1M from 1M-02" and the old close-out list. In step 2b: old fixed facts ("pull request #5"; "no new code live since 12 Nov"), once the app is live.                                                                                                       |

## 10. What waits for the owner

- Answered on 26 Nov: how a failed test in a release run is treated. The owner: "find root cause and fix it permanently." It is F9 now. The owner's rule of the same night for the 1A release (each failed test 20 times alone; 20 of 20 means the machine, and the failed jobs are run again) was not needed, because the release fix came first. It stays on record in `docs/DECISIONS.md` and is used for a later release only on the owner's word.
- Answered on 26 Nov: the five small questions of the notebook spec (its section 8).
- A reading check of the live app on the iPad, when Opus says it is live.
- Given on 26 Nov: the yes to this page, with a review afterwards. Waiting: the owner's review of the list of rule changes (`docs/plans/rule-changes-2026-11-26.md`), when the owner chooses; the two points of the notebook spec that are asked with the real thing on the preview (its section 8). Given on 26 Nov, after the proofs ([the proofs](phases/phase-1b-proofs/README.md)), two short rounds of questions and a final audit: the yes to the notebook spec, with Fable's marked readings.
- Yes or no to the product picks of the last week, and to the list of working copies.
- The kinds of action Opus may do without a click, allowed once.
- The changes to the owner's own `~/.claude` files.
- Answered on 26 Nov: the tests' sign-in switch may be used on the preview for the read-only proofs (section 3).
- The check of each day part on the real device, about 15 minutes; the 10-minute Pencil session; the look of one real chapter; signing in on the phone for the cards.
- Opening the planning talk with Fable for the phase part after 1B.
- At the end of stage 1: Opus reminds the owner of the deep review in the cloud (section 3), and the owner decides.
- Once, at the start of the first build day of 1B: typing `/advisor opus` in the main chat (section 3).

## 11. Words

- **Stage:** 1, 2 or 3 of the whole plan. The owner also says "phase 1" for stage 1.
- **Phase part:** 1A, 1B, 1C, 1D.
- **Day part:** one working day inside a phase part.
- **Part:** one piece of work, with one part manager.
- **Team:** the builders of one area of the app, working beside another team.
- **Docs:** files under `docs/` and files that end in `.md`. A push of only such files to main starts no test run; a pull request runs its tests for them too.
- **The daily list:** the questions and the `silent-visible` decisions that Opus sends the owner in its daily message.
- **Board:** the page about the project's state, for the owner. **Dashboard:** an option of a notebook's front page, in the app.

## 12. The audit rounds

- **Round 1 (25 Nov):** four audits by helpers that had not seen Fable's reasoning. The spec against the owner's words; the spec against the earlier decisions; the review against itself; the state of the project. Applied in the first version of this page and the third draft of the spec.
- **Round 2 (25 and 26 Nov):** two attack reads. On this page: the release that could not publish (now F8); no open pull request after the merge (step 3); decisions of the owner that had become advice (now F10, F11, F12); steps that were not safe for unsaved work (step 2a). On the spec: lines that two builders would build in two ways; three things called "summary" in the code; an import that makes no normal notebook today; musts of the owner left as goals. Applied in this version and in the fourth draft of the spec. Five questions went to the owner and were answered on 25 Nov.
- **Round 3 (26 Nov):** a fresh helper checked each finding of rounds 1 and 2 against the text, and looked for new faults made by the fixes. Most were fixed. Still open or partly fixed, and corrected in this version and in the fifth draft of the spec: decisions of the owner that the page had dropped by replacing the review (the table of what is built only when a named fault happens; "a line is changed only by the owner"; rules change only at a phase end; full speed when the limit runs low); "ready" worded so that it could never hold; a step that could be read as changing rule files before the yes; a pick for failed release tests that could not have published. In the spec: a line that contradicted itself (a second import); the Database option shown by default against the owner's word; "corner", "edit", the zip and the A4 sheet missing; sentences of Fable's marked as the owner's. Five small product questions went to the owner.
