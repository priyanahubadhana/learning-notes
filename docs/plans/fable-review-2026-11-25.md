# Fable review, 25 Nov 2026: why the work was slow, and the plan from here

**Status:** Fable's proposals from the owner's deep talk of 25 Nov 2026. **Section 0 holds the owner's answers and wins over every section below.** Nothing is cut and no rule changes without the owner's yes. The talk on the method closed on 25 Nov. The block "Start here" is the current order of work.

## Start here: what Opus does now, in order

This block is the current truth. Where a section below says something else, this block and section 0 win.

1. **Finish phase 1A** (section 6, "Now"). Merge the hover fix after its review. Find the cause of the extra empty line (c33c34). Apply the three small picks (0.1, row 4). Get the full set green on build/next. Send the owner the update tests (S6, S7, S1, S4) only after the version check. Go live on the owner's yes.
2. **Close 1A.**
   - Correct the lines of 4.3 that the owner decided on 24 Nov (the ladder, two builders, the time limit, the state file), set the replan counter to 0, and drop the Goodnotes idea.
   - Write the phase row. Give every open issue a stage label. Close the 12 issues marked fixed, and #45 when the update tests pass.
   - Do the bulk clearing (section 10, question 5): old picks that are built count as accepted; working copies whose branch is fully merged are removed with git; the rest is listed for the owner.
   - Update the main clone, so that the push guard runs its current copy; do it when no builder is in the middle of a push.
   - Save the five #68 traces from the chat into the repo.
   - Update the three helper files to the new roles (13.5): no token budget, no checker.
3. **The first day after live: the online test gate** (G1, section 7). The full set on every push to the build/next pull request, in about 20 jobs; the list check; a red nightly as the first line of the morning message; a proof run by hand. Measure one full run and write its wall time down.
4. **The second day: the quick Pencil taps** (section 5.4). Extend the replay that exists (`e2e/circleTrace.ts`) for the traces, then P1, P2 and P3, then the owner's 10-minute session. If it fails, it waits for stage 2. The second team does the small 1B fixes (#50, #42) and the board until the first big specs of 1B are approved.
5. **Then phase 1B in day parts**, both teams on features. A day part does not wait for a yes (0.4). For each part: a fresh Opus part manager (13.5); tests written from the spec lines by a helper that is not the builder (13.4); one review; the full set; the owner's check. Opus records its own decisions (13.6) and reaches Fable as 13.7 says.
6. **Not built now:** the rest of the build machine, the skills, the brief cutter, a second checker (section 14). One of them is built only when its trigger in 14.6 happens; Opus tells the owner when it does.
7. **Numbers:** one line for each day part (section 11), and one cause for each fault the owner finds (0.6).
8. **What waits for the owner:** money; logins and secrets; anything that goes live; deleting data or files; a test on the real device. Nothing else.

**Planning mode runs beside this.** The owner and Fable plan phase 1B in depth while Opus finishes 1A. The big specs of 1B come into `docs/features/` with numbered lines (13.2); Opus builds a feature of 1B only from its approved big spec.

**Sections that no longer hold:** 4.2 (section 14 replaces it); 4.5 (13.2 and 13.3 replace the card); G2 and G3 in section 7 (see 14.5); the skills list in 13.9 (see 14.5); "less paper" in section 3, row C3, where it speaks of the card and of 1M.

## 0. The owner's answers (25 Nov 2026, after the first read)

### 0.1 Answered

| Question (section 10)  | The owner's answer                                                                                                                                                                                                                                        | What Opus does                                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. The size of a phase | A phase keeps its full size and its name; the whole of it stays. It is divided into parts of one working day. Each day part holds 3 to 5 parts of work and ends on the preview with the owner's check. Where this page says "day-phase", read "day part". | Plan by day parts from the day after 1A is live (section 4.6). Names until the owner picks others: phase 1B has the days 1B.1, 1B.2 and so on.                                                                                                         |
| 2. The quick taps, #68 | Yes to the pick (as Fable read the answer; the owner corrects it if wrong): the iPad's own selection stands, our bar shows on it, the triple tap takes the paragraph, Apple's menu may show at times until stage 2. No more fighting the iPad in stage 1. | Section 5 is approved: G2, then P1 to P4, then the owner's session. It starts after 1A is live.                                                                                                                                                        |
| 3. Less machinery      | **Not approved. On hold.** Nothing shrinks before the owner and Fable have discussed it. The build machine (1M) stays whole; it is divided into day parts, like every phase.                                                                              | **Cut nothing.** These are proposals only: every "Cut" row of 4.2; the rows "The repeat bar" and "Spec size" of 4.3; section 4.5; the line "Dropped" of section 6 where it names 1M parts, Spec Kit and the Notion window. Work by the rules in force. |
| 4. Three small picks   | Yes to all three.                                                                                                                                                                                                                                         | Apply now, each with its reason line: the speed test warns on the slow hosted iPad engine and stays hard on the PC; the eraser test ignores the named corner pixels, the same on every machine; "Hide toolbar while writing" starts OFF.               |
| 5. Clearing up in bulk | Yes, but only after the talk with Fable is closed.                                                                                                                                                                                                        | Do not start it. Wait for the owner's word.                                                                                                                                                                                                            |

What stands with no change: sections 2, 4.3 (the rows the owner decided on 24 Nov), 4.4, 4.6, 5, 9, 11, and the order of work in section 7 (G1, G2 and G3 are an order, not a cut).

### 0.2 Decided in the second round (owner, 25 Nov, after Fable's research)

- **Lanes.** The work is split by area of the app. One manager for each lane; a manager sees only the papers of its lane. Two lanes for three day parts; a third lane only when the numbers of section 11 are good. The shared files (the hot files in STATE) go through the main chat, one at a time.
- **Where the managers live.** Inside the one main chat; the owner talks to one chat. The main chat starts a fresh Opus manager for each part, with only that part's page and the lane's brief. That manager starts the Sonnet builder.
- **The build machine.** It stays whole: all 14 parts of the 1M plan. It is built as skills and checks, in day parts, in its own lane beside the feature lane. After each machine day the owner sees the numbers and says if the next machine part is still wanted. The "verify" step (1M-05) stays; Fable changed its view because the reports of Anthropic and OpenAI name the builder's own end-to-end check as what most raised accuracy.
- **Two modes (owner, third round).** Planning mode: the owner and Fable work together and write the plan and the specs, with as much depth as the wish needs. Execution mode: Opus builds from those specs and decides by itself; it records every decision it takes by itself; it has the permissions it needs for that.
- **Two briefs (owner, third round).** A helper gets a small brief to work from and can open the big spec to check a fact. The specs do not limit how Opus builds.
- **Earlier decisions (owner, third round).** A decision the owner made earlier must never get lost or be ignored.
- **The spec form and the rest (owner, fourth round).** Decided; written out in section 13. It starts with the phase after 1A. The full set on every push (G1) comes before any side-by-side lanes.
- **The next phase** is the one the stage plan names next. It is planned in planning mode, built the new way, and measured; each later phase improves from those numbers.

### 0.3 The talk on the method is closed (owner, fifth round, 25 Nov)

- Who builds a part: decided (13.5). How Opus reaches Fable: decided (13.7). When the earlier decisions are collected: decided as Fable read the answer (13.8); the owner confirms the reading.
- The owner opens the planning talk with Fable when a phase part is complete, for the next part.
- The bulk clearing (question 5 of section 10) starts at the 1A close-out, unless the owner says no.
- Words: the owner's "phase 1" is stage 1 of the plan; "phase 1 part A" and "part B" are 1A and 1B; a "day part" is one working day inside them.

### 0.4 Sixth round (owner, 25 Nov)

- **The objective of stage 1 ("I can use the app every day").** On the PC, Claude writes a notebook, the app imports it in full, and the owner reads it and corrects it by typing. On the iPad the owner reads. Pencil fine work stays in stage 2.
- **The order after 1A is confirmed:** the gate day, the Pencil taps day, then 1B, with the machine lane beside it (section 7).
- **The owner has no fixed hours** and looks in several times a day. So a day part does not wait for a yes when its parts are on the approved phase page: the day's message informs and asks. The owner's check is done whenever the owner comes; each message repeats what waits. The limit of two unchecked day parts stays (4.6, step 7). This replaces "The owner's yes starts the day" in 4.6, step 2.
- **The next phase part is a test of the new way against 1A.** At its end the owner and Fable compare the two with the same measures (section 11 and the numbers of 1A) and keep what was better in each.

### 0.5 Seventh round (owner, 25 Nov)

- **How much is planned again now: decided.** For the whole app: collect only. Helpers read every decision list and every spec and make one index of the earlier decisions for each area; nothing is rewritten and nothing is decided. In depth: only the next phase part. Fable started the collection on 25 Nov; the result goes to `docs/plans/earlier-decisions/`.
- **Accuracy and speed.** Accuracy wins: an accurate result, based on the specs, at the fastest pace. (Fable first wrote this as a hard rule about checks; the owner took that rule back in the eighth round. See 0.6.)
- **The owner's objective for time:** stage 1 complete within the next week. Fable's reply from the measured pace: one lane gives 6 to 8 sized hours a day; 1B alone is about 80 sized hours, so 5 to 7 working days with both lanes on features; all of stage 1 is about four times that. Fable's proposal for the next week: "I can use the app every day", which is the end of 1B. **Open.**
- **Still open:** what the two teams do in the next week (both on features after the first machine day, or one on the machine).

### 0.6 Eighth round (owner, 25 Nov)

- **No hard rules on how Opus works.** Hard rules restricted Opus in 1A and the output suffered. The specs say what the owner wants; Opus judges how to build it and how much checking a part needs. Fable's rule "a check is dropped when it caught nothing" is withdrawn.
- **The few fences that stay** (they say what must never happen, not how to work; the owner confirms the list): the four things that wait for the owner (13.1); an earlier decision of the owner is never lost or ignored; a spec line is never reworded on its way to a helper; the builder does not change a test that was written from the spec; nothing goes live without the owner's yes.
- **Planning goes deeper, never thinner.** In planning mode the owner and Fable go into as much depth as the feature needs. Thin specs gave a fast app that was of no use.
- **The target for the next week:** "I can use the app every day", the end of 1B.
- **The weekly limit.** Full speed; nothing is turned down when the limit runs low. The owner has a Max plan with room left and buys more if needed (the owner's decision each time; Opus asks first). If the limit stops the work, the state file and the scheduled restart carry it over, as the continuity rules say. Opus shows the level of the limit in its daily message.
- **Sonnet always has an Opus manager of its own.** Many Sonnet builders under one manager failed more than once. Now each part has its own Opus part manager (13.5).
- **A new measure for the comparison with 1A:** each fault the owner finds gets one cause: the builder misread the spec; the spec was silent or wrong; a test missed it; only the real iPad shows it.

### 0.7 Ninth round (owner, 25 Nov)

- **The fences.** The five fences of 0.6 stand. The list is not closed: when a fence is added, the owner is told in the next message, with the reason.
- **How a deep spec is approved.** The owner and Fable go through it together, in depth, line by line. No line counts as yes by default. This is done before a phase part starts, while the builders build the part before it, so that no builder waits for planning. When the planning of a part is done, Opus executes it.
- **Why.** Before, the owner planned less and Fable and Opus planned the rest; the build then differed from what the owner wanted. The owner and Fable must be on the same page: each learns from the other.
- **The earlier decisions are collected** for the whole app: [earlier-decisions/README.md](earlier-decisions/README.md), with the pairs that seem to disagree in [earlier-decisions/clashes.md](earlier-decisions/clashes.md).
- **Still open:** what the two teams do in the next week (0.5).

### 0.8 Tenth round (owner, 25 Nov)

- The owner asked what the build machine is for, whether Opus can do these things itself, and for a Fable audit of it. The audit is section 14. It waits for the owner's answer (14.7).
- Until the owner answers, nothing of phase 1M is built except the online test gate (G1).

### 0.9 Eleventh round (owner, 25 Nov)

- **The owner accepts the audit of the build machine** (14.7, pick A). Before the features only the online test gate is built. The 22 Nov yes to the confirm sheet of phase 1M is replaced as 14.7 says.
- **The two teams:** after the gate day, both build features. This closes the open point of 0.5 and 0.7.
- The decision of the second round, "the build machine stays whole" (0.2), is replaced by this one.

**Read for this review:** [the talk pack](../metrics/fable-talk-pack.md), [the retro input](../metrics/phase-1a-retro-input.md), [the #68 digest](../qa/traces/2026-11-25-issue68-digest.md), [STATE](../STATE.md), the master instructions pack (CLAUDE.md, GUIDEBOOK.md, QUESTIONS.md), the CI file and the Playwright config on build/next (4bf4d5b2), the Pencil tap code, [the stage-1 plan](stage-1-plan.md), [the 1M plan](phases/phase-1m-build-machine.md), [METHOD-v2](../METHOD-v2.md) and the last 40 CI runs.

## 1. The short answer

1. The models did not work slowly. The work waited in three places: at a release gate that runs last, at the owner's iPad, and in paperwork.
2. The test set that decides a release ran only at night and at the release. It was not green once in the last week. Faults piled up unseen and arrived together.
3. No test can copy what the real iPad does with the Pencil. So a green run meant little for Pencil work, and the owner found the faults.
4. Each failure since 13 Nov was answered with a new layer of process. No layer was ever removed.
5. A phase of 10 to 20 parts cannot be done in 8 hours at the measured pace. A phase of 3 to 5 parts can. So a phase becomes one working day.

## 2. Why it was slow: the five reasons, with the evidence

**R1. The release gate runs last.**

- A merge into build/next runs the fast set only: 37 of 511 test files. The full set runs at night, by hand, and on a push to main (ci.yml on build/next, lines 89, 142, 190). A pull request never runs it.
- The full set takes 65 to 74 minutes. It failed in all three runs of 24 and 25 Nov (45443692412, 45510870693, 45548141476). One Chromium job was cut at its 60-minute limit each time.
- The nightly run was red or cancelled from 18 to 24 Nov and stopped nobody.
- Result: the release run found 26 red tests at once. Then one fix broke 9 other files that its own proof did not run.

**R2. The tests cannot see the real iPad.**

- e2e/realPen.ts sends mouse events with the label "pen". It always sends the lift, always as the first pointer, and no iPad selection ever runs.
- Week 47: 49 bugs found after "Built". On 24 Nov the owner found 6 faults in one 20-minute check that every test had passed.
- The owner is the only real iPad test. That test was never planned; it came late and by surprise.

**R3. Paper before product.**

- 16 to 23 Nov: 63 percent of commits changed only docs or tooling.
- docs/features holds 109 files and about 190,000 words. METHOD-v2 has one spec size and skips no step for a small part.
- 1.6 review rounds per part. On 22 Nov, 4 of 6 review fails were process mistakes, not product faults. A reviewer window often cost more than the builder.
- 1A and 1M are 10 planned days of machinery before a new feature. 1M has 14 parts; one is built.

**R4. The phase is too big, and there is one door to live.**

- A phase was 4 to 10 days. All work collects on build/next and goes live together. The live app has had no new code since 12 Nov.
- The 8-hour target was set against a phase sized in days. The measured pace is a median of 1.6 hours per task from start to merged, and 27 parts verified in week 47.

**R5. Rules changed while the work ran.**

- About 14 rule or method changes in November and six ways of working since 13 Nov. The master pack was written in the nights of phase 1A.
- Pencil rules arrived in the middle of fixes: the hold rule changed three times in four days; #64; a test that waited days for a decision.
- Pencil fine work is stage 2 by the stage map (PC first). It still took most of 24 and 25 Nov inside a stage-1 tooling phase.

**Not a cause:** the number of builders, the models, or their effort.

## 3. The five changes

Each change has its case against. The numbers in section 11 decide after three day-phases if a change stays.

| #   | Change                                                                                                                                            | What it fixes | The case against                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | The full set runs on every push to build/next, on the free hosted machines, in about 20 jobs. A red is sorted before the next merge.              | R1            | With two builders a queue can form (20 jobs at once is the limit). Tests that fail only on the slow machines make noise until section 9 is done.       |
| C2  | The iPad is a planned gate: a 15-minute owner check ends each day-phase. Every iPad trace becomes a replay test the same day.                     | R2            | It costs the owner 15 minutes each working day. A replay proves what our code does with the recorded events, not what the iPad does.                   |
| C3  | Less paper: a one-page card for most parts, the full spec only for a new screen. One review, for product faults only. 1M shrinks to three parts.  | R3            | Thin specs caused the redone builds of 11 Nov. Guard: the owner's own words, the approved picture and the behaviour questions stay before every build. |
| C4  | A phase is one working day: 3 to 5 parts, on the preview by the evening, live on the owner's yes when the full set is green.                      | R4            | More and smaller phases mean more hand-offs. A day can end with nothing checked when the owner is away (limit: two unchecked day-phases).              |
| C5  | Rules freeze. One rules file for a project. The owner's new product rules and all waiting picks go into one daily list of at most five questions. | R5            | The owner loses instant steering: a new rule can wait up to one day. A wrong behaviour can live one day longer.                                        |

### 3.1 What 8 hours can hold (the honest numbers)

- Measured: one lane gives 6 to 8 sized hours a day. A part is 3 to 4 sized hours. Two lanes give 3 to 5 parts a day.
- So an 8-hour phase holds 3 to 5 parts, built, proved, on the preview, and checked by the owner. This is an estimate until three day-phases are measured.
- A phase of today's size (1B: 19 parts, about 80 sized hours) stays about 10 working days. It becomes about 10 day-phases, and each one ends in the owner's hands.
- Stage 1 left: about 30 working days (estimate from the plan's sizes: gate day 1, #68 day 1, 1B 10, 1C 8, 1D 10). Corrected after three measured day-phases.

## 4. Management: one system, not five

### 4.1 Three homes, one file each

| Home   | The one place                                              | Who reads it                     |
| ------ | ---------------------------------------------------------- | -------------------------------- |
| Rules  | The project `CLAUDE.md` (80 lines at most)                 | Every chat, at its start         |
| Method | `docs/METHOD-v2.md`, with the edits of this page           | Opus when it plans; never Sonnet |
| State  | `docs/STATE.md` (100 lines at most), Issues, `FEATURES.md` | Every chat, at its start         |

- A chat reads `CLAUDE.md` and `STATE.md` at its start. Nothing else by default.
- The GUIDEBOOK is the book of reasons. It is never instructions and is never read at a chat start.
- The board is a view that a program makes from the State home. It is never a source.

### 4.2 Keep, cut, finish

| Piece                                                                                       | Decision                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Master instructions pack                                                                    | **Keep, and stop work on it now.** It is the template a new project copies once. It is not applied to Learning Notes as a whole. It is updated from this page after three measured day-phases, so that it carries numbers from a method that works. |
| The pack's "read three files at each chat start"                                            | **Cut.** See 4.1.                                                                                                                                                                                                                                   |
| Simplified Technical English                                                                | **Keep** as the writing style (short sentences, active voice, one word for one thing). **Cut** the planned word-by-word check of the pack against the dictionary.                                                                                   |
| Build machine 1M-02 (agent files) and 1M-04 (the stop hook for builders)                    | **Finish** (part G3, section 7).                                                                                                                                                                                                                    |
| 1M-14 (the proof on the hosted machines)                                                    | **Finish, wider:** it becomes part G1, the full set on every push.                                                                                                                                                                                  |
| 1M-03, 05, 06, 07, 08, 10, 11, 12, 13                                                       | **Cut from stage 1.** Looked at again at the stage-1 end, with the numbers. 1M-09 (analyze) exists and stays warning-only.                                                                                                                          |
| The separate checker window and "the push guard needs PASS"                                 | **Cut.** One fresh reviewer per part does this job once.                                                                                                                                                                                            |
| METHOD-v2 loop                                                                              | **Keep**, with two spec sizes (4.5) and the day (4.6).                                                                                                                                                                                              |
| The confirm sheet                                                                           | **Keep** for a full spec (a new screen). For a card, the owner's yes to the day's plan is the confirmation.                                                                                                                                         |
| The three lenses and the attack read                                                        | **Keep only for risky parts:** start-up, the update path, a data upgrade, sign-in.                                                                                                                                                                  |
| The 20 of 20 on this PC                                                                     | **Cut.** **Owner** (question 3): 20 of 20 runs on the hosted machines, for risky parts and for any test that was red once with no known cause.                                                                                                      |
| Outside auditors: the evening checkpoint, the Saturday audit, three audits before a release | **Cut to one audit before a stage ends. Owner** (question 3). Evidence: the 22 Nov baseline; two of the three tools found nothing.                                                                                                                  |
| The weekly card                                                                             | **Cut.** The daily numbers line (section 11) and the board replace it.                                                                                                                                                                              |
| The management board                                                                        | **Finish, small:** one generated page (section 6). `docs/DASHBOARD.md` is removed with git when the board is live.                                                                                                                                  |
| Global `~/.claude/CLAUDE.md`                                                                | **Keep** the owner rules (plain words, money, secrets, the status lines, questions). **Cut** the method numbers from it; a project's own `CLAUDE.md` holds them.                                                                                    |
| Global playbook and `playbook-results.md`                                                   | **Keep** one line per finished stage-1 phase. The playbook text is corrected by 4.3.                                                                                                                                                                |
| `phase-manager` helper                                                                      | **Keep unused** (the owner's word only). Its file is corrected by 4.3.                                                                                                                                                                              |

### 4.3 The contradictions, settled

| Topic                 | The one rule from now                                                                                                                                                                           | Lines to correct at the close-out                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| The ladder            | Sonnet 3 tries → Opus medium 2 → Opus high 1 → Fable → the owner last (owner, 24 Nov).                                                                                                          | Project CLAUDE.md lines 24 and 48; global CLAUDE.md ("twice"); playbook.md line 25; builder.md line 21; phase-manager.md lines 15 and 17. |
| The ladder, iPad-only | A fault that only the real iPad shows starts at Opus. The count is the owner's re-tests, not the builder's tries. After 2 failed re-tests Fable reads it once. After that it waits for stage 2. | New line in the project CLAUDE.md.                                                                                                        |
| Builders at once      | Two.                                                                                                                                                                                            | phase-1m plan lines 21 and 71; phase-manager.md line 16.                                                                                  |
| Time limit of a run   | The measured length plus a margin; 60 minutes at most; a longer run is split.                                                                                                                   | The project rule that says 20 minutes; the old `--global-timeout=1200000` line in STATE.                                                  |
| The state file        | `docs/STATE.md`.                                                                                                                                                                                | phase-manager.md line 9; playbook.md line 66.                                                                                             |
| The replan counter    | This review is a Fable planning talk. The counter is 0 from the owner's yes to this page.                                                                                                       | DASHBOARD (2 of 10) and the 1M-14 record (4 of 10).                                                                                       |
| The Goodnotes idea    | "A tap on text switches to the Lasso" is dropped. The owner's rule of 25 Nov wins: the Lasso selects only by circling.                                                                          | IDEAS.md lines 176 to 181.                                                                                                                |
| The repeat bar        | Before a merge: the part's new and changed tests pass 3 of 3 on Chromium on the PC. After the merge: the full set on CI, both engines. 20 of 20 as in 4.2. **Owner** (question 3).              | Project CLAUDE.md line 26.                                                                                                                |
| Spec size             | Two sizes (4.5). **Owner** (question 3).                                                                                                                                                        | METHOD-v2 lines 27 and 105.                                                                                                               |
| Phase size            | One working day, 3 to 5 parts (4.6). **Owner** (question 1).                                                                                                                                    | METHOD-v2; the pack's values table ("2 weeks", "10 to 20 parts") when the pack is updated.                                                |

### 4.4 The path of a change (four gates, in this order)

```text
builder's branch
  → 1. push guard on the PC (format, lint, types, the touched tests)      minutes
  → 2. one review by a fresh Opus reviewer (product faults only)          once
  → merge into build/next
  → 3. CI: the preview deploys at once; the full set runs, about 20 jobs  target under 40 min
  → 4. the owner's 15-minute check at the end of the day-phase
  → the owner's yes + a green full set on that commit → merge to main = live
```

- **Gate 2.** A FAIL names a product fault or a missing test, with file and line. A process slip (a file outside the brief, a changelog line) is fixed by the manager in place and never sends a part back.
- **Gate 3.** A part is "Built" when the full run after its merge is green, or when its reds are sorted as not its own (`scripts/ci-sort.mjs`). A test that passed only on a retry is listed in the run summary and gets an issue the same day.
- **Gate 4.** "Verified" is the owner's yes in the daily check, for what the owner can see or feel. An inside part is Verified by gate 3.
- **Risky parts** (start-up, the update path, a data upgrade, sign-in) add: 20 of 20 on the hosted machines for the part's own tests, both engines, and Fable's attack read of the card.
- **"Ready" to the owner** is written only after `version.json` on the preview equals the commit (the 25 Nov "ready" was wrong).

### 4.5 Two spec sizes

**The card** is the default: one page, 300 words at most.

```text
<part id> <name>
Goal:          one sentence
Owner's words: the quoted sentences this part comes from, with the date
Picture:       the approved picture, or "no screen change"
Rules:         always true (5 at most); must never happen (3 at most)
Situations:    what the tests must cover (resized, first item, moved, small
               screen; Pencil, finger, mouse)
Scenarios:     S1 the plain case, S2 one that goes wrong, S3 the owner's real case
iPad-only:     no; or yes: what the owner checks, and the trace it needs
Builds on:     the specs and part cards; or "none, checked <date>"
Done when:     the tests by name; the owner's check steps
Not in this part
```

- **The full template v2** is only for a new screen or a redesign that the owner sees. It keeps its approved picture and its confirm sheet.
- A bug fix says only "the fault is gone". A new behaviour rule needs the owner's own sentence, quoted in the test's comment (retro entry 3).
- Before a fix is planned, grep the tests for the same spot and list the ones that clash as questions.
- The 109 old spec files are not rewritten. A spec is touched only when its part is built.

### 4.6 The day (standard work for one day-phase)

1. **Evening before (Opus, 30 minutes):** pick the next 3 to 5 parts from the stage plan; write their cards; write the owner's check list (5 to 10 steps); list the day's questions for the owner (5 at most).
2. **Morning:** one message to the owner: today's parts, the check time, the questions. The owner's yes starts the day. Two builders start; hot files go one at a time.
3. **Hours 1 to 6:** build, tests first; gates 1 to 3. The preview moves with each merge.
4. **Hour 6:** the last merge. No new part starts after it.
5. **Hours 6 to 7:** the full set green on the last commit; the look checked against the picture; the version check; then "ready".
6. **Hours 7 to 8, or the owner's next calm window:** the owner's 15-minute check. Each finding becomes an issue with a stage label. A finding with a red test and under one hour of work is fixed the same day; the rest is tomorrow's first part.
7. **Live:** the owner's yes and a green full set on that commit. No yes, no live; the next day goes on. After two unchecked day-phases the builders do only fixes and inside parts.
8. **Close (Opus, 15 minutes):** the numbers line (section 11); `STATE.md` rewritten in place.

- A product rule that the owner gives while a fix runs goes into the next daily list. The fix in hand does not change.
- A test whose expected behaviour waits for the owner is not merged. Its question goes to the owner the same day (retro entry 4).

## 5. Bug #68: quick Pencil taps on a word

### 5.1 What happens (read from the code and the five traces)

1. In the Text tool the Pencil touches editable text. Scribble watches every such touch. The page gets the touch-down at once, but the lift late or never. This is a known open WebKit fault (bug 217430, open since 2020) and matches the traces of 19 and 25 Nov. In Lasso mode the ink pad covers the text, so the lift arrives (trace 5).
2. The app's tap counter learns of a finished tap only in `onUp` (src/editor/tapSelect.ts, about line 886). With no pointerup, every tap counts as tap 1. So the app never cancels the second tap, and the iPad runs its own double tap: the word, then the paragraph, then Apple's menu.
3. Something of ours then writes a caret over the iPad's selection (digest, fact 3). That is "a selection comes and disappears". The candidates are the caret fix-ups in tapSelect.ts `onUp` (about lines 945 and 963), src/app/penTap.ts and the box tap rules. The first red replay test must name the writer.
4. src/editor/ownSelection.ts keeps `pointerDown` true until a pointerup or the 4-second sweeper. While it is true, every collapse counts as the person's own and is not put back.
5. src/editor/holdMenuWatch.ts line 156 drops a pen pointer that is not primary. Its hold timer stops only on pointerup, pointercancel or a move. So a quick tap with no lift can open the Hold menu after 0.8 s. To prove with a replay test.
6. The iPad still counts the first touch as down, so it marks the next taps "not primary". Any code that filters on `isPrimary` drops them (also src/app/useLongPress.ts line 89).

### 5.2 The decision: stop fighting the iPad (fork A)

- 18 days of "read the taps ourselves and cancel the iPad's" (fork B) did not hold. The reason is in 5.1 (1): under Scribble the page hears about a tap after the iPad has already acted. No code in a web page can win that race.
- **Rule N1.** In the Text tool, a selection that the iPad makes after a Pencil tap is the truth. The app adopts it, keeps it, and shows our bar on it. The app never collapses or replaces it; only the person does.
- **Rule N2.** The app's own tap counter acts only on complete taps (a touch-down and a lift signal for each). This is the PC path (mouse, a Windows pen) and it stays as it is.
- **Rule N3.** A Pencil press ends at the first of: pointerup, pointercancel, lost capture, the stylus touchend or touchcancel, a new Pencil pointerdown, or a Pencil move with no button (a hover: the tip is in the air). `inputMachine` is the one place that decides this; tapSelect, ownSelection and holdMenuWatch ask it.
- **Rule N4.** A Pencil pointer is never dropped for `isPrimary`.
- **Owner** (question 2): with N1 the Pencil's triple tap selects the paragraph, as the iPad does, not the line. Apple's menu can still show beside our bar until stage 2.

### 5.3 What a web app on the iPad can and cannot fix

| We can fix (our code)                                                 | We cannot fix from a web page                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The app stays "pressed" when the iPad sends no lift (N3).             | The iPad holds back the lift signal while Scribble watches the Pencil.                                 |
| The app drops taps that the iPad marks "not primary" (N4).            | Scribble's own picks: a circle that takes the word before; the one-word-left shift.                    |
| The app wipes a selection that the iPad just made (N1).               | Apple's menu (Paste, Select, Select All) on the iPad's own selection. We can make it rarer, not never. |
| Our bar does not show on the iPad's selection (N1).                   | What the iPad's triple tap selects (the paragraph).                                                    |
| The Hold menu opens after a quick tap (N3).                           | Scribble off for our page only, with handwriting kept. (The owner's rule: Scribble stays on.)          |
| Focus jumps to another control, once the recorder names it (part P4). | Pencil hover as a lift signal on an iPad that has no hover.                                            |

- **The fuller cure, stage 2:** "selected mode" of [text-select.md](../features/text-select.md): our own highlight and handles, with the iPad's selection collapsed, so Apple's menu has nothing to show for. It is planned there (parts A4 to A9).
- **The only complete cure:** a small native iPad shell around the app, which can control the edit menu and Scribble. It costs money (an Apple developer account, about US$99 a year) and real work. It is a stage 3 question for the owner, not a plan.

### 5.4 The plan: one day-phase, then the owner's ladder

| Part | What                                                                                                                                                                                                                                                                                          | Done when                                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| G2   | The replay helper: extend e2e/circleTrace.ts so a recorder trace is replayed as dispatched pointer, touch, mouse and selection events. Save the five #68 traces, cut to the tap windows, in e2e/fixtures/traces/. If the raw traces are gone, build the fixtures from the digest's sequences. | Trace 2 replays red on today's code for 5.1 (3), (5) and (6).                                                                        |
| P1   | N3 and N4 (the lift signals; no `isPrimary` filter for the Pencil).                                                                                                                                                                                                                           | The replay shows the machine idle before tap 2, no Hold menu after a quick tap, and no dropped tap. Lasso and hold tests stay green. |
| P2   | N1 and N2 (adopt the iPad's selection; our writers stand back; our bar shows).                                                                                                                                                                                                                | The replay of traces 2 and 3: the word stays selected for 2 s, the bar shows, the editor's selection equals the iPad's.              |
| P3   | #59: move the recorder's button off the bar. The recorder's focus line names the control that took the focus.                                                                                                                                                                                 | The owner can move the bar with the recorder on.                                                                                     |
| P4   | The focus jump (trace 4). No fix by guess: only after P3's line names the control in the owner's session.                                                                                                                                                                                     | A replay test from that new trace.                                                                                                   |

- **Order:** G2 first (one builder). Then P1, then P2, with the same builder, because both change tapSelect.ts. P3 beside them.
- **The owner's session (10 minutes, recorder ON only during it):** three boxes; in each, 10 double taps on words at the owner's normal speed, 5 triple taps and 5 taps on the caret; then two holds near punctuation (#55).
- **Pass:** the word is selected and stays in 9 of 10 or more; the wrong thing is picked 0 times; nothing is picked at most 1 time in 10. Apple's menu is counted, not judged.
- **Fail:** #68 moves to the stage-2 refinement, as the owner's ladder says. No more tries in stage 1.
- **Limit of this plan:** it is read from code and traces. It is not proven on an iPad. Only the owner's session proves it.

## 6. Pending, placed

**Now (to finish phase 1A):**

- The hover fix: merge after its one review.
- The extra empty line (c33c34): go on with the recording run. It blocks live until its cause is known; a slow machine shows a real race first (#58 was found this way). If the trace does not name the cause, it goes to Opus high at once.
- The two test choices and #34: **Owner** (question 4).
- The owner's update tests S6, S7, S1, S4 on the preview.
- Save the five #68 traces from the chat into the repo today. A trace that lives only in a chat is lost evidence.
- At go-live: close the 12 issues that carry `state:fixed`, and #45 when the update tests pass.
- Close-out: the lines of 4.3; the phase row in [phase-results.md](../metrics/phase-results.md); every open issue gets a stage label in one pass (no issue without one).
- The push guard runs the copy in the main clone, which is 1,526 commits behind main and lacks the `check:spec` line. Update that clone at the close-out, when no builder is in the middle of a push.

**Phase 1B:**

| Item                                    | Where                                                                                                                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The management board                    | First week, one part of 3 hours at most. One page from STATE, FEATURES, the issues and the CI runs: now, needs you, today's parts, the last full run, the last live date, the stage strip as one picture. |
| #50 (Sign in does nothing after Escape) | A small fix, test first.                                                                                                                                                                                  |
| #42 (Journal rename by double tap)      | A small fix; it is a test engine fault, not a Pencil fault.                                                                                                                                               |
| #52 guest mode and #53                  | The end of 1B, as the owner decided on 22 Nov. Fable's case against: it serves visitors, who come in stage 3.                                                                                             |
| #54 (CORS) and the security check       | The end of 1B, with the data-safety part E9.                                                                                                                                                              |
| Found wishes F-356, F-377               | With E7 (the frame, search, Library).                                                                                                                                                                     |
| Found wish F-357                        | With E3 (text styles).                                                                                                                                                                                    |
| Found wishes F-370, F-372               | With E4 (layout, the paper page).                                                                                                                                                                         |
| Found wish F-373                        | With E5 (databases).                                                                                                                                                                                      |
| Found wish F-376 (device modes, built)  | Checked in the owner's 1B test; no new part.                                                                                                                                                              |

Opus checks each found wish against its part card when that day is planned. A wish that does not fit moves to the next part that fits; it never makes a new part.

**Phase 1C (the bars):** #66 (the "Show toolbar" pill covers buttons); #51 (44 px targets); Undo and Redo out of tool bar v8 with F-378; F-367 (the "Keyboard stays hidden" switch).

**Stage 2 (Pencil first):** what is left of #68 after section 5; #55; #56 (first in stage 2: it can delete the owner's words); #57; #38 and #10; "selected mode"; use the empty space when the bar hides; a spelling pop-up at the cursor; tool previews on hold; the Goodnotes features (resize with ink, Front and Back, Create Element), none a must unless the owner says so.

**Stage 3 (for everyone):** #67; the "Show toolbar" pill as a small control; the Settings "later" block; the native iPad shell question; the paid code review, once; the Supabase paid plan.

**Dropped:** the Goodnotes "tap switches to the Lasso" idea (4.3); a second trial of GitHub Spec Kit (its template is merged since M2; one method is enough); the Notion window (the docs site is the window; it comes back only on the owner's word); 1M parts 03, 05 to 08 and 10 to 13 in stage 1.

**Settled by section 7:** "the update spec is too heavy for one CI job" (G1 splits it with the rest). The fast set stays as the owner chose (A) for slice pushes; on the build/next pull request the full set runs in its place, because the fast set is a part of it.

**The "Decisions to review" list:** **Owner** (question 5). From then on a pick goes into the daily list within one day, and the list never holds more than five.

**Housekeeping:** 87 working copies. **Owner** (question 5).

## 7. Next: the order of work

| Step | Day-phase               | Parts                                                                                                                                                                                                                                                                                                                                                                                              |
| ---- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Now                     | Finish 1A (section 6, "Now"); go live on the owner's yes; the close-out.                                                                                                                                                                                                                                                                                                                           |
| 1    | The gate day            | **G1** the full set on every push to the build/next pull request, about 10 Chromium and 10 iPad-engine jobs; `checks` no longer waits in front of the tests; `playwright test --list` for every project in `checks` (retro entry 2); a red nightly is the first line of the morning message (retro entry 1); a "proof" run by hand for 20 of 20. **G2** the replay helper. **G3** 1M-02 and 1M-04. |
| 2    | The #68 day             | Lane 1: P1, P2 (section 5). Lane 2: P3, then the board, then N1 (the notes format v2 spec, a full spec) and E1 (the slice spec) as drafts for the owner.                                                                                                                                                                                                                                           |
| 3    | The owner's #68 session | Ten minutes at the start of the day. Then 1B goes on.                                                                                                                                                                                                                                                                                                                                              |
| 3+   | 1B, about 10 day-phases | Lane 1: N2 to N9. Lane 2: E2 to E10. The parts and sizes of the [stage-1 plan](stage-1-plan.md) stay. Each day takes the next 3 to 5 parts.                                                                                                                                                                                                                                                        |
| then | 1C, then 1D             | As the stage-1 plan says, in day-phases.                                                                                                                                                                                                                                                                                                                                                           |

- **G1 is done when** one full run on a build/next push is measured and its wall time is in the metrics. The target is under 40 minutes (estimate). If a queue forms, the full set runs on the newest commit only, and a red is traced back by `ci-sort`.
- **The 1B planning talk** (Fable, with the owner, one questionnaire) happens on day 2, on the drafts of N1 and E1. It is the only Fable work in 1B besides attack reads of risky cards.
- **Scope freeze:** nothing joins a day after its morning message. A Pencil selection fault found in a stage-1 check becomes an issue with the label stage-2. It is not fixed in the phase.

## 8. Answers to Opus's questions

**Pack section 6.4**

1. **Fork A or B?** A, as rules N1 to N4. TS-N1 ("never Apple's bar") cannot be promised by a web page under Scribble; it moves to stage 2 with "selected mode".
2. **A replay harness first?** Yes, and small: part G2. It makes each iPad trace a test of our code's reaction. It cannot stand in for the iPad.
3. **Should a pen tap end at the first signal?** Yes: rule N3. The Lasso's circle and its holds are not touched, because their pointers are captured on the ink pad and their lifts arrive. The Text tool's hold gets safer: today it can fire after a quick tap. Re-test #55 and #56 in the owner's session.
4. **What can a web app not control?** Section 5.3.
5. **The CI-only reds: one cause or many?** One family and two singles. The family: the hosted machine is slow and skips screen updates, so taps arrive late, paints are late, and a test that looks at once sees an old screen. The singles: Linux pixel shading; c33c34 (cause not known). The rule is section 9.
6. **Is the ladder right for iPad-only faults?** No. Section 4.3, "The ladder, iPad-only".

**Pack section 12**

1. **The shortest safe path:** section 4.4. An 8-hour phase is real when it holds 3 to 5 parts (3.1).
2. **Cut 1M and start 1B beside it?** Yes: sections 4.2 and 7.
3. **How much spec is enough?** The card (4.5).
4. **Which gates catch real faults?** The owner's iPad check (6 faults in 20 minutes; 49 bugs after Built in week 47) and the full set (26 and then 9 reds, found too late). The 20 of 20 found one real race (#58) for about 7 hours and 3.3 lost hours: keep it for risky parts, on hosted machines. Review: keep one round, for product faults. Daily outside audits, the second checker and the confirm sheet for small parts found little for their cost: cut.
5. **The whole set on every merge?** Yes: G1 and gate 3.
6. **Rules that change in the middle of a fix?** Section 4.6, the last two lines, and the daily list.
7. **What does "done" mean?** Built: gate 3. Verified: gate 4. Live: the owner's yes. The 15-minute session is planned in the morning message, never asked for by surprise.

**The retro proposals:** entries 1 to 5 are adopted (entry 4 as in 4.6: such a test is not merged). Entry 6 is answered by section 9. Three more lessons: "ready" needs the version check (4.4); a fix is proved by the full set, not by its own files (gate 3); a trace is saved in the repo the day it is taken.

## 9. Tests that depend on time or on the machine

1. **Wait for a state, never for a time.** This fixed 9 tests on 25 Nov with no change to the app.
2. **A test that needs exact input timing** (the quick taps of c45, TB-04) runs alone with one worker. A run that the machine delivered late is a spoiled sample, not a pass and not a fail. **The limit on late runs stays as it is.** Running them alone fixed the cause; a higher limit would hide a stall. Look again only with numbers: late in more than 1 of 20 CI runs.
3. **The c45 tests prove rule N2** (complete taps). The real iPad's path (N1) is proved by the replay tests and the owner's session.
4. **A speed budget is a hard gate only on a known machine:** Chromium on CI, and the iPad engine on the PC before each release (one minute, added to the release list). On the slow hosted iPad engine it writes a warning with the measured number, so a trend shows. **Owner** (question 4).
5. **A pixel test** may ignore named edge pixels that a platform shades differently: the smallest mask, the same rule on every machine, a reason line in the test. **Owner** (question 4).
6. Points 2, 4 and 5 are not "a weakened test" when the reason line names the machine fact and the owner or Fable approved it. Fable approves 2 here. No other test changes under this section.

## 10. Questions for the owner (Fable's pick first)

1. **The size of a phase.** Pick: a phase is one working day of 3 to 5 parts and ends with your 15-minute check; live follows on your yes. Other option: keep phases of many days and accept that nothing reaches you for days.
2. **The quick Pencil taps (#68).** Pick: the iPad's own selection stands and our bar shows on it; the triple tap takes the paragraph; Apple's small menu may still show at times until stage 2; one day of work, one session with you, and what is left waits for stage 2. Other option: keep fighting the iPad's selection in stage 1.
3. **Less machinery.** Pick: 1M shrinks to three parts; a one-page card for most parts; 20 of 20 only for risky parts, on the hosted machines; one outside audit before a stage ends. Other option: build all of 1M first (about 5 more days before a feature).
4. **Three small picks.** (a) The speed test writes a warning on the slow hosted iPad engine and stays a hard test on the PC. (b) The eraser test ignores the few corner pixels that Linux shades differently. (c) "Hide toolbar while writing" starts OFF, because the pill that brings the bar back has an open fault (#66).
5. **Clearing up in bulk.** (a) Every pick on the "Decisions to review" list that is older than 7 days and already built counts as accepted; you see only the product picks of the last week. (b) Opus removes, with git, the working copies whose branch is fully merged, and lists the rest for you. (c) The 12 issues marked fixed are closed when 1A is live.

## 11. The numbers that decide (one line per day-phase)

Opus writes one line in [phase-results.md](../metrics/phase-results.md) at each day's close, from git and `gh`:

`date | parts planned | parts merged | hours from the morning yes to "ready" | full-set wall time and colour | owner findings (stage 1 / stage 2) | faults a test should have caught | live: yes or no`

- **After three day-phases** Opus sends the owner the three lines and the corrected estimate for stage 1.
- **A change of section 3 stays** when: "ready" comes within 8 hours on 2 of 3 days; the full set is green at the day's end on 2 of 3 days; the owner's stage-1 findings per day fall below the 24 Nov check (6 in 20 minutes).
- **If the numbers say no,** Opus asks the owner to open a Fable window. Rules do not change before that.

## 12. Limits of this review

- The #68 plan is not proven on an iPad (section 5.4).
- The 40-minute target for the full set is arithmetic from the measured job times (about 550 to 600 machine minutes over 20 jobs). G1 measures it.
- The stage-1 estimate uses the plan's sizes. They are not yet corrected by a measured day-phase.
- The found wishes were placed by their one-line titles. Opus checks each against its part card.
- Web sources for section 5: WebKit bug 217430; Apple Developer Forums thread 662874; the ProseMirror forum thread "How to disable the mobile Safari selection menu"; Wikimedia task T281771.

## 13. The way of working from the phase after 1A (decided in the talk of 25 Nov)

This section holds what the owner decided in rounds two to four. Where it differs from sections 3, 4 and 7, this section wins.

### 13.1 Two modes

**Planning mode: the owner and Fable.**

- When: once for each phase, before it starts, and for each new feature. Never in the middle of a build.
- How: the owner talks freely, by voice or text. Fable writes "What I heard", asks all its questions at once, then writes the big spec. The owner approves it line by line: Yes, Explain again, or Change to.
- Output: one big spec for each feature (13.2); the phase page with its day parts and lanes; the owner's check list for each day part.
- After each talk Fable gives the owner three lines: what would make the next talk give a better spec.
- Planning for the next phase runs while Opus builds the current one. Planning never stops the build.

**Execution mode: Opus.**

- Opus builds from the specs and decides by itself. It records each decision it takes by itself (13.6).
- Opus has the permissions it needs. At the start of the phase the main chat lists the kinds of action that still ask for a click, and the owner allows them once.
- **Four things still wait for the owner:** money; logins and secrets; anything that goes live (a merge to main, a switch ON in the live app); deleting data or files (working copies too). A test on the real device is the owner's by its nature.
- Nothing else waits. When a part cannot go on, Opus parks that part, goes on with another, and puts the question in the daily list.

### 13.2 The big spec (one for each feature; written in planning mode)

- **Holds:** the objective in the owner's words, with the date; real examples with real values; the numbered lines; the approved picture; "not in this feature"; open points.
- **The numbered lines.** One sentence each. Four kinds: always true; must never happen; "when ... then ..." (an acceptance line); a situation the tests must cover (resized, first item, small screen; Pencil, finger, mouse). A line that only the real iPad can prove is marked iPad-only.
- **Each line has an id** (the feature's short name and a number). An id is never used again and never renumbered.
- **Depth:** as deep as the wish needs on what the owner wants. Nothing on how: no file names, no build plan, no tasks.
- **Where the spec is silent, Opus decides** and records it (13.6).
- **A change to a line** is made only by the owner (in planning, or by an answer in the daily list). The line keeps its id; the change carries its date.
- **One place.** When the big spec of a feature is approved, the older spec files of that feature get the head line "replaced by" with a link and move to the archive. Nothing is deleted.

### 13.3 The small brief (one for each part; cut, never rewritten)

- A part's brief holds: the goal sentence; the spec lines of the part, copied word for word with their ids; the picture link; the lane and its files; "done when" (the tests, by line id); the report form.
- The main chat chooses which line ids belong to a part. Choosing is allowed; rewording is not.
- A program makes the brief from the ids (a new machine part, `scripts/part-brief.mjs`). Until it exists, the main chat copies the lines by hand, with no change of a word.
- The brief names the big spec. A helper opens it when: it would have to guess; two lines seem to clash; the part touches something the brief does not name.
- `analyze` fails a feature when a line id belongs to no part or to no test.

### 13.4 The checks

- **"Is the plan what we want?"** The owner's yes to the big spec, line by line, in planning mode.
- **"Is the built thing what the spec says?"** Tests. Before the build of a part, a test-writer helper (never the builder) writes them from the lines. The title of each test carries its line id.
- The builder cannot change these tests (the test guard). If it thinks a test is wrong, it reports; the part manager decides or escalates.
- The reviewer (fresh, read-only, once) checks the result against the lines of the big spec, never against the small brief.
- An iPad-only line is proved by the owner's check or by a replay test from the owner's trace.

### 13.5 Who does what in execution mode

| Who                                   | Does                                                                                                                                                                       | Sees                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| The main chat (Opus)                  | Talks to the owner. Plans the day part. Starts the part managers. Merges into build/next, one at a time. Owns the shared files. Keeps STATE.                               | STATE, the phase page, the short reports     |
| A part manager (a fresh Opus, a part) | Gets one small brief and its lane's brief. Is free in how. Starts the test-writer and the build. Returns the branch, the proof, its decision records, in 15 lines at most. | Its brief; the big spec when it needs a fact |
| The test-writer                       | Writes the tests of the part from the lines, before the build.                                                                                                             | The lines of the part                        |
| The builder                           | The part manager chooses for each part: a plain part goes to a Sonnet builder; a hard part (the Pencil, start-up, the owner's data) it builds itself.                      | Its brief                                    |
| The reviewer (a fresh Opus)           | One read-only review against the big spec's lines.                                                                                                                         | The diff and the lines                       |
| Fable                                 | Planning mode with the owner. In execution mode only what 13.7 names.                                                                                                      | The question and its line ids                |

- **Lanes.** A lane is one area of the app (its folders). Two lanes for the first three day parts: the machine lane and one feature lane. A third lane only when the numbers of section 11 are good.
- A part manager never touches another lane's files or a shared file. It asks the main chat.

### 13.6 The record of Opus's own decisions

One line for each decision, in `docs/DECISIONS.md`, newest first:

`date | part | kind | what was decided | why | the line id it rests on, or "silent" | easy to undo: yes or no`

| Kind             | Meaning                                                     | Who looks                                                           |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `in-spec`        | The spec's lines decide it.                                 | Nobody has to.                                                      |
| `how`            | A choice of how to build. This is Opus's freedom.           | Nobody has to.                                                      |
| `silent-visible` | The spec is silent on something the owner will see or feel. | The owner, in the daily list: five a day at most, the oldest first. |

- A `silent-visible` decision that is easy to undo is built as Opus picked, and shown to the owner.
- A `silent-visible` decision that is hard to undo parks its part until the owner or Fable answers.
- The owner's answer becomes a new numbered line in the big spec the same day. The record gets "closed" and the line id.

### 13.7 Who decides what (the escalation for decisions)

1. **The part manager** decides all it can from the lines.
2. **The main chat** decides a clash between two parts or two lanes, and all about shared files.
3. **Fable** gets one short question (under 200 words, with the line ids) when: two spec lines or two earlier decisions of the owner contradict each other; the spec is silent on something hard to undo; a fault is still there after Opus's tries; a risky part needs its attack read. Fable's answer is recorded as a spec line or as a decision record. Opus calls Fable by itself for at most three such questions a day, each recorded, and asks the owner before a fourth (owner, 25 Nov).
4. **The owner** gets the `silent-visible` decisions and the four things of 13.1.

Nobody stops and waits: park the part and go on. The ladder for a failing build stays as the owner decided on 24 Nov (4.3).

### 13.8 Earlier decisions are never lost

- Before a feature is planned, a helper collects every earlier decision about it, with its date and place: `docs/DECISIONS.md`, `docs/design/owner-decisions.md`, the old spec, the issues, the comments in the tests.
- Fable puts each one into the big spec as a numbered line with its date. From then on the big spec is the one place for that feature.
- The owner sees only the clashes: pairs of earlier decisions that disagree. The owner picks; the pick is a line.
- When: phase part by phase part. Before a phase part starts, the collection is done for every feature in it. The first one is done now, for the part after 1A. At the end of each phase part, check if a decision was missed, and repeat for the next part. (Fable's reading of the owner's answer of 25 Nov.)

### 13.9 The build machine, as skills and checks (the machine lane)

- All 14 parts of the 1M plan stay. Each becomes a skill (a procedure Claude loads when it needs it), a program, or a hook (a rule that must hold every time).
- The first machine day part is G1, G2 and G3 of section 7.
- The procedures that become skills: write a big spec; cut a part brief; write the checks; build a part; verify like a user (1M-05); review a part; sort a red run; turn an iPad trace into a test; plan a day part; write to the owner; check a release.
- The order of the other machine parts is set in the planning talk for the next phase. After each machine day part the owner sees the numbers and says if the next machine part is still wanted.
- No public skill pack is installed as a whole. Two shapes are borrowed: one small spec for each change, and acceptance lines as "when ... then ...".

### 13.10 Each phase improves the next

- At a phase's end: the numbers of section 11, and three lines on what to change. Rules change only then.
- The first numbers to watch: the hours from the morning yes to "ready"; the owner's findings in a day part; how many `silent-visible` decisions a day part makes (many means the spec was too thin there).

## 14. Audit of the build machine (Fable, 25 Nov, on the owner's word)

**Status:** an audit, not a decision. The owner decides (14.7). Until then nothing of phase 1M is built, except the online test gate (G1), which the order of work already holds.

### 14.1 The test each tool must pass

1. Does it answer a fault that really happened and was measured?
2. Can Opus prevent that fault by its own judgment, with no tool?
3. Does something the project already has do the same job?
4. Does it check a result, or does it tell Opus how to work? (The owner, 25 Nov: no hard rules on how.)

A tool is needed now only with: 1 yes, 2 no, 3 no, and 4 "checks a result".

### 14.2 What phase 1A showed

- **The checks the project already has do work.** The push guard blocked 350 of about 2,000 pushes: 117 for format, 73 for red browser tests, 56 for red unit tests, 54 for the ratchet, 27 for lint, 8 for types. So a builder already cannot push with its own tests red.
- **What was missing was not a tool for the builders.** It was test capacity at the right moment (the full set ran last and was never green) and the real iPad (no test can copy it).
- **The machine's own rules failed their first real use.** The one code part of 1A was planned under 100K tokens and took three windows of 163K, 231K and 110K. One spec took 3.5 hours and three review rounds before any code. On 22 Nov, 4 of 6 review fails were process mistakes.
- **A tool nobody acts on is only noise.** `analyze` prints "0 of 2 pages pass, 2 fail, 99 skipped" on every push, as a warning, and no one acts on it.
- **The project already carries much machinery:** about 25 process scripts, 3 hooks, 3 helper files, 10 rule files. Each more tool is one more thing to keep working.

### 14.3 The 14 parts, one by one

| Part  | What it is                                                           | The fault it was made for                               | What already does it, or can Opus do it                                                                                                 | Result                                                  |
| ----- | -------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1M-01 | The plan page and the research                                       | -                                                       | Done on 22 Nov.                                                                                                                         | Done.                                                   |
| 1M-02 | Helper files with a token budget and report caps; a new checker file | Builders with too little guidance                       | The role files must name the new roles (part manager, test-writer, reviewer). Opus writes them in about an hour. No budget, no checker. | **A small update, by Opus.**                            |
| 1M-03 | A start message for each new chat                                    | A chat that does not know the state                     | `CLAUDE.md` loads by itself and points to STATE; the "continue" step reads it. No fault of this kind in 1A.                             | Not needed.                                             |
| 1M-04 | A stop check: no "done" while tests are red; a round counter         | A builder that says done too early                      | The push guard runs the touched tests before every push (129 blocks for red tests). Each builder now has its own Opus manager.          | Not needed now. The counter is a rule on how.           |
| 1M-05 | A "verify" recipe that drives the app like a user                    | Features marked done with no user-like test             | Every scenario already is a test through the real screen (511 test files). Opus can open the app and look before it reports.            | Not needed.                                             |
| 1M-06 | A standard test notebook                                             | Tests that each make their own data                     | Needed for the notebook work. Phase 1B already has this part (N9, the Test notebook).                                                   | **Needed, inside 1B, not as a machine part.**           |
| 1M-07 | A program that compares a screen with the mock-up                    | Screens unlike the approved picture (15 Nov)            | The reviewer compares a screenshot with the picture; Opus can see pictures. Pixel tests exist in `e2e/visual/`. A fragile tool to keep. | Not needed now.                                         |
| 1M-08 | A second checker; no merge without its PASS                          | The wrong thing built nicely                            | The one fresh reviewer checks the result against the spec lines. The same job twice.                                                    | Not needed. A hard rule on how.                         |
| 1M-09 | `analyze`: specs, scenarios and tests agree                          | A rule with no test                                     | It exists, as a warning nobody acts on. For the first part the reviewer checks 20 to 40 spec lines by reading.                          | Later, if a line with no test reaches the owner.        |
| 1M-10 | Numbers written by a program                                         | Numbers typed by hand                                   | The fault in 1A was that no numbers were written at all. Opus writes one line for each day part from git and CI.                        | Not needed.                                             |
| 1M-11 | A report page for each task                                          | Reports the owner could not read                        | The day's message and the owner's check replace it.                                                                                     | Not needed.                                             |
| 1M-12 | A script that copies the machine into a new project                  | Starting the next project fast                          | There is no next project yet, and the method is not proven yet.                                                                         | Later, when a second project starts.                    |
| 1M-13 | A practice run of the machine, with Fable's read of 1M-04, 07 and 08 | An untested machine                                     | It tests parts that are not built. The next phase part is the real test.                                                                | Not needed.                                             |
| 1M-14 | The proof on the free hosted machines                                | The full set ran last; the proof took 7 hours on the PC | Nothing does this. Opus cannot do it by judgment: it is machine capacity.                                                               | **Needed, first.** It is part G1: the online test gate. |

### 14.4 The rules of the machine page

| Rule (22 Nov)                                                              | Result                                                                                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A task is planned under 100K tokens; a warning at 80K; a hand-over dossier | Old architecture (small Sonnet windows on a short lead). Broken in its first use, with no fault shown from it. Drop as a rule. |
| A relay of three windows for a big task                                    | Old architecture. Drop. A part manager splits a big part by its own judgment.                                                  |
| Four gate layers for a normal task, each in its own window                 | Old architecture. The path of section 4.4 stands: the push guard, one review, the full set, the owner's check.                 |
| Three failed rounds at a gate, then the ladder                             | The owner's ladder of 24 Nov stays as the owner decided it. No counter by program.                                             |
| "Done" is said by a program                                                | **Keep.** It is what works: the push guard, the tests, CI. It checks a result.                                                 |
| Every merged task writes its own numbers by program                        | Drop (see 1M-10).                                                                                                              |
| The machine lives in a template that a script copies                       | Later (see 1M-12).                                                                                                             |

### 14.5 Fable's own additions of this talk, put to the same test

| Addition                                        | Result                                                                                                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1, the full set on every push                  | **Needed, first** (the same as 1M-14).                                                                                                                                     |
| G2, the replay tool for iPad traces             | Not a machine part. `e2e/circleTrace.ts` and `e2e/inkReplay.spec.ts` already replay traces; the builder of the Pencil taps day extends them as that work needs.            |
| G3, the helper files and the stop check         | The helper files: the small update of 1M-02. The stop check: not needed now (1M-04).                                                                                       |
| The program that cuts the small brief (13.3)    | Not needed now. Opus copies the numbered lines word for word; the reviewer checks against the big spec. Built only if a reworded line is ever found.                       |
| Eleven procedures written as skills (13.9)      | Not needed up front. A skill is written when the same mistake happens twice; then it has earned its place.                                                                 |
| Fable's "Group 1" of seven tools (chat, 25 Nov) | Withdrawn. Five of the seven are already covered or are Opus's own work. Fable had not weighed the push guard's 350 blocks and the 511 scenario tests when it listed them. |

### 14.6 The result

- **Before the features, one thing is built: the online test gate** (about one day; an estimate until measured).
- **Beside it, with no builder's time:** Opus updates the three helper files to the new roles.
- **Inside 1B:** the Test notebook.
- **All the rest waits for a reason.** The reasons come from the cause that each fault of the next part gets (section 0.6):

| If this happens in the next part                            | Then this is built                                |
| ----------------------------------------------------------- | ------------------------------------------------- |
| Builders report "done" with red tests, more than twice      | The stop check (1M-04)                            |
| The owner finds a screen unlike its approved picture, twice | The look compare (1M-07)                          |
| A spec line with no test reaches the owner                  | The spec check by program (1M-09)                 |
| A helper's brief holds a reworded spec line                 | The brief cutter (13.3)                           |
| The same mistake in a procedure happens twice               | A skill for that procedure                        |
| A second project starts                                     | The copy script, or the pack as a plug-in (1M-12) |

- **The need of a build machine, in one line:** a judge that is not the builder, with enough test machines behind it. The project has the judge already; it lacks the machines. Everything else Opus can do itself.

### 14.7 The owner decides

- **A (Fable's pick):** accept this audit. The 22 Nov yes to the confirm sheet of phase 1M is replaced: rows 2, 3, 4, 5, 7 and 8 no longer hold; rows 1, 6, 9, 10 and 11 hold in the form of this page. Case against: a fault that one of the dropped tools would have caught can reach the owner once before the tool is built.
- **B:** keep the machine whole, as decided in the second round (0.2), and build it in day parts.
