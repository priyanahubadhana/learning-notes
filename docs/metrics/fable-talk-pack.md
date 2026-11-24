# The Fable talk pack (after phase 1A is live and green)

Written for: Fable, and for the owner who opens the talk. Kept by Opus during phase 1A; the owner asked for it on 25 Nov 2026 so that every point "to discuss with Fable" is in one place and can be handled in one sitting.

**When to use it:** after phase 1A is live and the full test set is green. Not before.

---

## 1. The prompt to paste (copy all of this box)

```text
Hi Fable. Phase 1A of Learning Notes is live and the full test set is green.
I want one talk with you that covers everything we kept for you.
Please read these files first, in this order, before you answer:

1. docs/metrics/fable-talk-pack.md   (this list: what we need from you)
2. docs/metrics/phase-1a-retro-input.md   (what went wrong in phase 1A, with proposals)
3. docs/qa/traces/2026-11-25-issue68-digest.md   (bug #68: quick Pencil taps, 5 recordings)
4. docs/STATE.md   (where the work stands)

Then, please:
A. Tell me what we could do better so these problems do not come back each phase.
   Pick the few changes that matter most, with the case against each one.
B. Give me a plan for bug #68 (quick Apple Pencil taps on words). Say what can be fixed
   in a web app on the iPad and what cannot, and what we do about the part that cannot.
C. Check the phase-end items (pack section 2C), then help me plan phase 1B (section 2D).

My own words on Pencil selection and my "worst first" pick are in section 3 of the pack.
Section 6 is Opus's deep background: the 18-day history of this bug, a code map,
the test gap, and Opus's own questions for you. Please answer those too.
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
