# The Fable talk pack (one deep talk: speed, management, quality, #68, pending)

Written for: Fable, and for the owner who opens the talk. Kept by Opus during phase 1A; the owner asked for it on 25 Nov 2026 so that every point "to discuss with Fable" is in one place and can be handled in one sitting.

**When to use it:** any time. The owner may open the talk before phase 1A is live; section 7 then says where things stand. Opus keeps the pack current until the talk.

---

## 1. The prompt to paste (copy all of this box)

```text
Hi Fable. I want one deep talk with you about Learning Notes. I feel the project
has moved much slower than it should have, and I want to find out why and fix it.
Please read these files first, in this order, before you answer:

1. docs/metrics/fable-talk-pack.md   (everything: status, time, delays, management, pending)
2. docs/metrics/phase-1a-retro-input.md   (what went wrong in phase 1A, with proposals)
3. docs/qa/traces/2026-11-25-issue68-digest.md   (bug #68: quick Pencil taps, 5 recordings)
4. docs/STATE.md   (where the work stands)

Then, please, in this order:
A. WHY SO SLOW: from my own words (section 7) and the numbers (sections 8 and 9), tell me the real reasons the
   project is slow, and the few changes that would make it fast again without losing quality.
   Give the case against each change.
B. MANAGEMENT: look at the management system in pack section 10 (the master instructions
   pack, the build machine 1M, the method, the board, the playbook). Tell me what to keep,
   what to cut, what to finish, and fix the contradictions between them.
C. BUG #68: give me a plan for the quick Apple Pencil taps (section 2B and section 6).
   Say what a web app on the iPad can fix and what it cannot.
D. PENDING: go through my pending wishes and open decisions (section 11) and help me
   place each one (now, phase 1B, stage 2, stage 3, or drop).
E. NEXT: help me plan what comes after phase 1A (sections 2C and 2D).

My own words are in sections 3 and 7. Opus's questions for you are in sections 6.4 and 12.
My targets: a whole phase done, tested, in about 8 hours; faults caught before I see them;
frequent releases. This is about management, not about how hard the models work.
Ask me all your questions at once, in easy words, with your pick for each.
```

---

## 2. What we need from Fable (the four topics)

### A. "What could we do better" (the phase 1A review)

Source: [phase-1a-retro-input.md](phase-1a-retro-input.md). Six events, each with what happened, the cost, why and a proposal:

1. The nightly full test set was red for a week and nobody stopped.
2. A test helper file broke the whole iPad part of the full set.
3. A rule was put into the owner's mouth (#64: a bug report was turned into a "rule").
4. A test stayed "owner decision pending" for days.
5. A local proof run was cut at its time limit and saved nothing.
6. About 20 iPad tests pass on the PC but fail on the CI machines (root causes are added when the fix round ends).

**Ask:** which proposals to adopt, which to drop, and anything the list misses. Rules change only at the phase end, from the numbers (the numbers section of that file is filled in at the close-out).

### B. Bug #68: quick Apple Pencil taps on a word act at random

Source: [2026-11-25-issue68-digest.md](../qa/traces/2026-11-25-issue68-digest.md) (5 recordings, 5 photos). It has been happening for a long time. **On the owner's word, no builder or Opus works on it until this talk.**

What the owner sees: sometimes the wrong thing is picked (once the top banner, "Drive disconnected"); sometimes nothing is picked; a selection "comes and disappears"; the iPad's own menu (Paste, Select, Select All) shows instead of the app's bar.

What the recordings show, in short:

- The iPad often never sends the "Pencil lifted" signal for a quick tap. The next tap is then counted as a second finger.
- The iPad runs its own word and paragraph selection at the same time as the app.
- Focus sometimes jumps out of the note to another part of the screen.

Three likely causes (A, B, C) and fix ideas are in the digest. **Known limit:** Safari on the iPad decides part of this itself, and a web app cannot fully stop it.

**Owner's rules that the plan must keep:**

- The Lasso selects only by circling. A tap or double tap on a word never selects it in Lasso mode, because mixing them brings the tap bugs back (25 Nov).
- Pencil hold = stays within about 3 mm (18 px) for 0.8 s. A small loop over typed text (not within 1 s of writing) = circle select. Any other loop = ink (25 Nov).
- A tap within about 3 to 4 mm (22 px) inside a box's left, right or bottom border picks the box, with any tool. Inside the box, the Pen draws and the Text tool places the caret (25 Nov).

**Owner's ladder for it (25 Nov):** Fable tries. If Fable cannot fix it either, it moves to the stage-2 refinement.

### C. Phase-end items already decided (to check, then apply at the 1A close-out)

From [STATE.md](../STATE.md) "Phase 1A close-out" and DECISIONS of 24 Nov evening:

- a. Master-pack answers go into CLAUDE.md:
  - The ladder: Sonnet 3 tries → Opus medium 2 → Opus high 1 → Fable → the owner last.
  - Two builders at a time.
  - The iPad engine runs before the merge of any part that touches start-up or the update path.
  - Each run's time limit is set from its measured length, 60 minutes at most.
  - Pictures are chosen by the case.
- b. Test-method proposals from the six iPad faults of 24 Nov:
  - Real Pencil input in every box, bar and ink test.
  - A situations list in each spec.
  - An always-on "must never happen" check.
  - No unproven fix on the preview.
  - Widen the iPad-engine rule to every Pencil, box, bar and ink part.
- c. Fix the S1 line of the Action bar spec: the unpinned bar stays hidden while the caret blinks.
- d. Open an issue for the two old failing phone-screenshot tests.
- e. "Never `git commit -a` in ln-buildnext" (it holds old screenshot edits).

### D. Phase 1B planning (with the owner)

- #66: the "Show toolbar" pill covers buttons.
- #50, #51, #52.
- #67: the small Selection bar stays after a Pencil tap. It is stage 3 by the owner's word; listed here only so nothing is lost.
- The found-wishes rows for stage 1.
- The management board: a page that a program makes from the files, on the docs site, with diagrams (a small part).
- Undo and Redo out of tool bar v8.
- Whether "Hide toolbar while writing" (#34) starts ON by default (the owner decides at the phase end).
- The update test's fast-set weight: the slow update scenarios stay in the fast set (owner: option A, limit 45 min); revisit only if the numbers say so.

---

## 3. The owner's part (fill in before the talk; 5 minutes)

**How I want selecting with the Pencil to work, in my own words (3 to 5 lines, one per tool):**

- Lasso:
- Text tool:
- Pen:
- Eraser / other:

**Which #68 problem bothers me most (fix it first):**
☐ the iPad's own menu shows up ☐ the selection comes and disappears ☐ the wrong thing gets picked ☐ nothing gets picked

**"Must never happen" lines (if any come to mind):**

-

---

## 4. How the owner helps Fable get the most out of it

1. **Paste the prompt in section 1 as it is.** It makes Fable read the facts first, so you don't have to retell them.
2. **Fill in section 3.** Your own words on Pencil selection let Fable plan to your rules instead of guessing.
3. **Pick the "worst first" problem.** Fable can then aim the first try at the part you feel most.
4. **Ask Fable to give the case against each pick.** That is the project's honesty rule, and it keeps the plan safe.
5. **Answer Fable's questions in one message.** One round of answers is faster than many small ones.

## 5. How the owner helps Opus (the everyday build)

- When something fails, send **the photo, the recording (Lasso recorder ON only during the test) and one line**: what you did → what you saw → what you expected.
- Keep your exact words, for example "a selection comes and disappears". They point straight to the cause.
- If a test step is unclear, say "I cannot do this step" (as you did on 25 Nov). Opus then rewrites it in easier steps.
- A bug report is not a rule. If you want a new behaviour, say it as a rule ("a tap near the border should pick the box"), so Opus never invents one for you.

---

## 6. Deep background for Fable (gathered by Opus, 25 Nov; facts with places)

### 6.1 #68 is not new: about 18 days of "fixed in tests, back on the iPad"

| Date      | What the owner saw                                                                               | What was done                                                                                                                                                                                      | Held on the iPad? |
| --------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 7 Nov     | R4-11, R6-17 to R6-20: a double or triple tap selection vanishes after about 1 s                 | The tap's own late synthetic click collapsed it: pen pointerdown and stylus touchstart from the 2nd tap on are preventDefault-ed; `keepSelection` restores; 600 ms grace (DECISIONS ~:318, ~:1400) | No                |
| 8 Nov     | R7-4, R7-6: same fault back; multi-tap dead after the app goes to the background                 | Gesture watchdog (app/gestureReset.ts); app/inputMachine.ts notes the iPad "often drops pointerup and pointercancel"                                                                               | No                |
| 11 Nov    | A double tap erased the word                                                                     | 600 ms grace (CHANGELOG ~:967)                                                                                                                                                                     | Partly            |
| 14 Nov    | F7: selection, then Apple's edit menu flashes                                                    | Touchend hold (`ownLiftUntil`)                                                                                                                                                                     | No                |
| 16 Nov    | C14 double tap deletes the word, slow taps work best; C19 a tap on the caret shows the edit menu | Default tap speed "Relaxed" 700 ms; a tap within 24 px or on the same word counts; rule "a tap never deletes" (DECISIONS ~:137)                                                                    | Partly            |
| 18-19 Nov | Planning                                                                                         | docs/archive/plans/pencil-select-plan.md left fork **A (take Scribble's result) vs B (our own reading of the gesture)** open, "to be decided by the owner's recorder traces"                       | Not decided       |
| 24-25 Nov | #68: wrong thing picked, nothing picked, "comes and disappears", Apple's menu                    | Five traces taken; owner: hold for Fable                                                                                                                                                           | —                 |

Related open issues: #55 (press-and-hold near punctuation shows no strip), #56 (a stray Pencil touch deletes the circled selection), #57 (a circle picks the word before, about 1 in 10), #38 and #10 (cursor jumps, handles grab the next word), #42 (Journal rename by double tap fails on ipad-webkit), #67 (bar stays; stage 3).

### 6.2 Where the code is (build/next, src/)

- **editor/tapSelect.ts**: the one tap counter (double = word, triple = line, four = paragraph; Text tool only). `onDown` ~:656, `onUp` ~:770 (selects after setTimeout 0, then `keepSelection`), `onCancel` ~:935, listeners ~:950-961 (pointer and touch, capture).
  - **A tap ends only on pointerup, pointercancel or the watchdog.** It never ends on touchend or on the next pointerdown, and touchend only preventDefaults the lift. This matches cause A in the digest.
  - It has no isPrimary filter.
- **app/inputMachine.ts**: the states idle / pressing / drawing / selecting / transforming. `end()` runs only on pointerup, pointercancel or lostpointercapture (~:249-253). A sweeper drops a down older than 4000 ms. There is no touchend path. This matches the trace: it stays in "pressing" until the next tap.
- **isPrimary is filtered in** app/useLongPress.ts:89, **editor/holdMenuWatch.ts:146** (drops exactly the quick-tap pointers that come as `pri 0`) and paper/blankHold.ts:23. This matches cause B, in those places only.
- editor/ownSelection.ts (`keepSelection` puts back a late collapse; has its own `pointerDown` flag), editor/penSelect.ts, holdSelect.ts, circleSelect.ts, dragSelect.ts, app/penTap.ts, app/gestureReset.ts, app/palmGuard.ts, app/input/* (router, recorder).
- **CSS:** `-webkit-touch-callout: none` and `user-select: none` are set only on the app's chrome (bars and panels), **never on the note text** (src/index.css ~:389-409 has an iOS block). Part of cause C.

### 6.3 The test gap (the most important fact for any plan)

- e2e/realPen.ts sends trusted Playwright mouse events relabelled as pen. It **always sends both down and up, always isPrimary = true, no touch events, no mouse and click chain, no native iOS selection.**
- So **no current test can show the #68 fault.** TB-04, pencilTaps, iosSelect F7 and ownSelection all pass for that reason, while the iPad fails.
- A red test needs dispatched events built from the trace sequences: down without up, touchend just before the next down, `isPrimary: false`, a native selectionchange to word, then paragraph, at 300 to 500 ms. Older specs and paper/penOnPaper.ts dispatch events this way.
- The project rule for an iPad-only fault: no new try without a new trace from the owner. Five traces exist now.

### 6.4 Opus's questions for Fable

1. **Fork A or B?** Should the app stop fighting iOS and adopt its native word and paragraph selection, showing our bar on it, or keep its own tap counter and suppress iOS? 18 days of B-style patches have not held. The case for B is TS-N1, "never Apple's bar", in docs/features/text-select.md.
2. **A replay harness first?** Should the first part be a tool that replays a recorder trace as dispatched events in ipad-webkit, so every iPad trace becomes a red test? It would cost about a day and make every later fix provable.
3. **Should a pen tap end on whichever comes first:** pointerup, touchend, or a new pen pointerdown? If so, what does that break in circle select and hold (#55, #56)?
4. **What can a web app not control on iPadOS Safari**, so the owner is told plainly what moves to stage 2? Examples: the edit menu, the triple-tap paragraph, Scribble.
5. **The CI-only reds (retro entry 6):** are they one cause (slow CI WebKit timing) or many? What is the right rule for timing budgets on CI without weakening tests?
6. **Is the ladder right for iPad-only faults?** Sonnet tries cannot be proven without a replay harness, so should iPad-only faults start at Opus or Fable?

---

## 7. The owner's own words on what felt wrong (25 Nov 2026, before the talk)

> "The entire phase should be completed within **8 hours**, including testing to done. It took **more than 2 days**. The same thing happens in each and every part of the phase, which in total makes it very hard for me."
>
> "The **quality of output** was not to my expectation. I was still finding bugs which should not have been passed."
>
> "The **rollout is very slow**. At that speed we will never be able to finish our app. So the main thing is **speed, and the specs**."
>
> "It is just from the point of **management**, not from the point of view of performance. The management must have done something wrong. So I am trying to fix that."

In short, the owner's three targets for the management fix:

1. **A phase is done, including testing, in about 8 hours.**
2. **Faults are caught before the owner sees them.**
3. **Releases happen often.**

The "management" the owner means is the **master instructions pack** (section 10) and how it runs this project.

## 8. Where the project stands (25 Nov 2026, morning IST)

- **The live app** (learning-notes-app.pages.dev) still serves an old build (4960aee8). No new code has gone live since 12 Nov, so for **13 days**.
- **Phase 1A** (method tooling and an update that never gets stuck):
  - It was planned for about 4 days from 22 Nov, so done around 26 Nov.
  - The owner's target of 23 Nov 20:00 IST was missed.
  - The owner approved going live on 25 Nov, with the same switches ON as the preview.
  - The release run of 24 Nov was red (26 tests), so the deploy was skipped (safe).
  - The fix round is running now:
    - Fixed: the box border tap, C21, C30, the long page name and homeBigData.
    - Under review: the Pencil hold and loop rules.
    - A second full run (45510870693) found 9 more red spec files, most likely from the box fix (the Pencil double and triple tap tests C14 and C19 among them). They are being sorted.
    - About 20 iPad tests fail only on the CI machines; the cause is not known yet.
- **The owner's update test on the preview:**
  - S5 passed on the PC and the iPad.
  - S6, S1, S7 and S4 wait for a new preview build.
  - Opus once said "ready" too early: the preview had no newer build.
- **Stage 1 plan** (docs/plans/stage-1-plan.md, confirmed 22 Nov):

| Phase | Days planned | What                                                                 |
| ----- | ------------ | -------------------------------------------------------------------- |
| 1A    | 4            | method tooling, the update fix                                       |
| 1M    | 6            | the build machine (added 22 Nov)                                     |
| 1B    | 10           | the notebook and editing path; **the owner's daily use starts here** |
| 1C    | 8            | bars complete                                                        |
| 1D    | 10           | reader basics, media, dashboards                                     |

The plan totals about 38 working days, with the owner's daily use planned from about day 14. **Today is day 4 and 1A is not done.** The owner's target is one phase in about 8 hours; the plan itself counts in days.

## 9. Time spent and why it was slow (facts; Opus's reading in 9.3)

### 9.1 Timeline

| Dates     | What happened                                                                                                                                                                                                                  | Result                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| 25-28 Oct | First build, 10 to 49 commits a day                                                                                                                                                                                            | Phase 1 of the app (notebooks, pages, editor)        |
| 6-12 Nov  | "Phases straight to live", 50 to 90 app changes a day, up to 492 commits a day                                                                                                                                                 | **Fast, and it worked**; the live app grew every day |
| 13-14 Nov | "Economy mode": 19.2 h, 19 parts, 0 reached the owner. "Trial": 15.5 h, 13 parts, up to 25 Fable visits per part                                                                                                               | **Both failed**; restart as "phased, lean" on 14 Nov |
| 16-23 Nov | 82 to 124 commits a day; **63% docs or tooling only**, 37% app code or tests                                                                                                                                                   | The live app got nothing new                         |
| 21-22 Nov | The pause talk with Fable: method v2, the stage plan, build machine 1M, outside auditors                                                                                                                                       | 13 decision sections on 22 Nov alone                 |
| 22-25 Nov | Phase 1A: the update fix U0 (6.5 h of code; 3 builder windows of 163K, 231K and 110K tokens against a plan under 100K), the 7-hour 20-of-20 proof, an iPad check with 6 faults (#60 to #65, fixed and passed), the red release | Not live yet                                         |

### 9.2 The five biggest time sinks (with evidence)

1. **Process before product.**
   - 63% of commits from 16 to 23 Nov changed only docs or tooling.
   - The specs hold about 166,000 words in 206 files.
   - 1A and 1M take 10 of the 38 planned days before any new feature.
   - A reviewer window often cost more than the builder (M2: 105K against 62K tokens; M8: 115K against 83K).
   - U0b took 3.5 h and 3 review rounds before any code.
2. **Proof runs on one PC.**
   - The 20-of-20 proof took about 7 h (23 Nov 22:45 to 24 Nov 04:49).
   - About 3.3 h were lost to tooling mistakes: a guessed 20-minute limit, two browsers in one folder, and a 90-minute triage run that saved nothing.
   - The 20:00 target was set without measuring how long the proof takes. The proof did find one real fault (#58).
3. **Red tests nobody watched.**
   - The nightly full set was red or cancelled every night from 18 to 24 Nov.
   - The release run was the first full run in a week, so a week of faults arrived at once.
   - Of the last 100 CI runs: 9 green, 7 red, 5 cancelled.
4. **iPad Pencil input, again and again (the owner's "bugs that should not have passed").**
   - #68 has come back for 18 days.
   - The Pencil hold rule changed three times in four days.
   - Rules were set in the middle of fixes (#64, C30, HOLD-MOVE).
   - The tests cannot copy what the real iPad does (section 6.3), so "fixed in tests" kept failing on the iPad.
   - In this fix round, one fix (the box border) broke 9 other spec files that its own proof did not run.
5. **Review loops and one lane of work.**
   - 1.6 review rounds per part (2.2 on 22 Nov). 4 of the 6 review fails on 22 Nov were process mistakes, not product faults.
   - The work ran in one lane: U0c, 1M and 1B each waited for the one before.
   - There were about 14 explicit rule or method changes in November, and at least 6 ways of working since 13 Nov.

### 9.3 Opus's reading (for Fable to confirm or reject)

- The project was fast when the loop was short: **build → the owner sees it live the same day**.
- It slowed each time a layer was added between the build and the owner: specs, reviews, proofs, the method, 1M. Each was added for a good reason (the 13 Nov failures, iPad regressions), but together they cost more than they saved, and **quality did not rise with them**: the owner still finds faults on the iPad.
- So the layers catch the wrong things. They check papers and green runs, not the real iPad.
- The likely fix has three parts:
  1. **Shorten the path to the owner again.**
  2. **Make proof cheap and automatic** (the free CI machines, since the repo is public; every iPad trace replayed as a test; the full set on every merge, sharded).
  3. **Keep only the gates that catch real faults**: the full set green, a short real-iPad check, and no test ever weakened.
- The case against: going fast without gates is what broke the live app on 13 Nov.

## 10. The management system: the master instructions pack and what runs on it

| Piece                                                                                        | What it is                                                                                                                                                                         | State                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Master instructions pack** (`C:\Users\pc\Downloads\master-instructions`, outside the repo) | The owner's universal management system for every project: CLAUDE.md (the universal prompt), GUIDEBOOK (14 chapters), OWNER-GUIDE, APP-SETTINGS, QUESTIONS, STE guide, agent files | Draft 3 of 24 Nov. QUESTIONS are answered. The owner has not read it through yet and the second fact check is still to do. **It is not applied to this project yet** (only at the 1A close-out). |
| **Build machine, phase 1M** (docs/plans/phases/phase-1m-build-machine.md)                    | One task per fresh window under 100K tokens; "done" said by a program; 2 to 3 windows at once; copyable in an hour                                                                 | Plan confirmed 22 Nov. 14 parts; **only 1M-01 (the documents) is built**. A pace note proposes cutting it to the two parts that carry the load: the agent files and the stop hook.               |
| **METHOD-v2** (docs/METHOD-v2.md)                                                            | One loop: the owner's words → plan → questionnaire → spec → confirm → build → analyze → review once → owner test → fix                                                             | Confirmed 22 Nov. Its analyze tool (M5) and part cards (M9) wait for 1M.                                                                                                                         |
| **Management board**                                                                         | A docs-site page a program makes from STATE, FEATURES and the issues, with diagrams                                                                                                | Not started (must, phase 1B). docs/DASHBOARD.md exists but was last made 22 Nov.                                                                                                                 |
| **~/.claude global rules, playbook, agents**                                                 | Rules for all projects, the playbook, helper definitions                                                                                                                           | The global CLAUDE.md dates from 14 Nov. The playbook results hold two failed rows only. phase-manager.md still names the old state file BUILD-STATE.md.                                          |

GUIDEBOOK chapters: 1 Fundamentals, 2 Way of working, 3 Orchestrator model, 4 Talking with the owner, 5 Tests and proof, 6 Tooling traps, 7 Continuity, 8 Tokens and cost, 9 Numbers, 10 Research, 11 Failures diary, 12 Outside auditors, 13 Contradictions (decided 24 Nov), 14 Starting a new project.

**Contradictions to settle:**

- **Escalation has three versions:**
  - Global: "the same failure twice", Sonnet → Opus → Fable.
  - Project CLAUDE.md: Sonnet three times, Opus five.
  - The owner's 24 Nov answer, written only in the pack: Sonnet 3 → Opus medium 2 → Opus high 1 → Fable → the owner.
- **Builders at once:** global 1 or 2; pack 2; 1M 2 to 3.
- **Test-run time limit:** a project rule says 20 minutes; the owner's answer is the measured length, 60 minutes at most.
- **State file:** the project uses STATE.md, but phase-manager.md says BUILD-STATE.md.
- **Replan counter:** DASHBOARD says 2 of 10 (22 Nov); the 1M-14 record says 4 of 10 (24 Nov). Not reconciled.
- **Goodnotes idea:** "a tap on text switches to the Lasso" (IDEAS, "discuss with Fable") clashes with the owner's 25 Nov rule that the Lasso selects only by circling.

**Ask Fable:**

- Make it one management system, not five. Which pieces to keep, which to cut, and in what order to finish the rest?
- Should the master pack be the single source that each project's CLAUDE.md copies?
- What in the pack must change so that a phase takes about 8 hours with fewer faults reaching the owner?

## 11. Pending: wishes and open decisions the owner gave along the way

**Must or near-term:**

- The management board (phase 1B, small).
- #66: the "Show toolbar" pill covers buttons.
- #50 to #54: the Antigravity audit, waiting for the 1B scope freeze (#52 guest mode, #54 CORS).
- #34: should "Hide toolbar while writing" start ON? The owner decides at the phase end.
- Undo and Redo out of tool bar v8.
- The stage-1 found-wishes (docs/plans/found-wishes-2026-11-22.md, 31 rows, F-352 to F-386).
- The update spec is too heavy for one CI job: B, C, or 1M-14 sharding, decided at the phase end. (The fast set stays as A, owner 25 Nov.)

**Pencil and selection (all around #68):**

- #55: hold near punctuation.
- #56: a stray Pencil touch deletes a circled selection.
- #57: a circle picks the word before, about 1 in 10.
- #59.
- #38 and #10: the cursor jumps; handles grab the next word.
- #42: Journal rename by double tap.
- #67: the Selection bar stays (stage 3).

**Stage 2 and 3 ideas (docs/IDEAS.md; 187 ideas: stage 1 27, stage 2 97, stage 3 63):**

- The "Show toolbar" pill as a small control (stage 3; pictures and the owner's yes first).
- Use the empty space when the bar hides.
- A spelling pop-up at the cursor.
- Tool previews on hold.
- Goodnotes features: resize with ink, Front and Back, Create Element. The owner says if any is a must.
- The Settings "later" block: saved setups, sharing, an expert file, "Your layouts", auto-tags.
- Try GitHub Spec Kit in the next planning.
- Notion as a read-only window on the project.

**Opus and Fable picks waiting for the owner's review:**

- DECISIONS.md "Decisions to review" holds about 210 entries; **17 are explicit "safest option" picks**.
- The newest:
  - The Pencil hold breaks past a 36 px path.
  - One Pencil hold everywhere.
  - The band tap is a tap only.
  - The fast-set CI limit is 45 minutes.
  - A scripts-only push to main deploys live.
- **Ask Fable:** a way to close this list in batches, so it never grows to 210 again.

**Before the public launch (money):**

- /code-review ultra, once, at the very end (about US$5 to 25 a run after 3 free runs).
- The Supabase paid plan (about US$25 a month).

**Housekeeping:**

- About 80 git worktrees (old slices, QA and scratch copies). Deletes need the owner's yes.
- Only 11 of 62 issues from #7 to #68 are closed. The old open ones include #45 (update loop), #19 (sign-in asked again), #25 (screen freezes), and #16 and #39 (CI timing).

## 12. Opus's questions for Fable (beyond 6.4)

1. What is the **shortest safe path from a builder's change to the owner's hands**, given one owner, one iPad and free CI? Can a phase really be about 8 hours, and what has to change for that?
2. Should 1M be cut to the agent files and the stop hook, with the 1B notebook lane started beside it now? (pace note P1; it adds 1 to the replan count)
3. **How much spec is enough?** 166,000 words of specs for a stage-1 app may itself be the slowdown. Should the small spec size be the default (pace note P2)?
4. Which gates catch real faults, by the numbers (the full set, the iPad check, the 20-of-20 proof, review), and which only cost time?
5. A builder's proof runs only the files it touched, so this round one fix broke 9 other files unseen. Should every merge run the whole set, sharded on CI, before it counts as done?
6. How do we stop rules changing in the middle of a fix? The owner's rules arrive while a test is red; the "owner decision pending" test is one example.
7. What does "done" mean for the owner? Today it is "green on CI", and the owner finds the faults on the iPad. Should every phase end with a 15-minute owner session as its gate, planned from the start?
