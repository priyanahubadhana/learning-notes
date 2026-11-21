# Phase 2B: text box and Pencil

Written by Fable, 14 Nov 2026 (night). Plan: [../phase-plan.md](../phase-plan.md) "Phase 2B". Owner's answers: [phase-2b-decisions.md](phase-2b-decisions.md) (all final). Spec: [../../features/textbox-v2.md](../../features/textbox-v2.md), lines TB-01 to TB-42. Whether the build is running: only [../../BUILD-STATE.md](../../BUILD-STATE.md) says.

## What the owner gets

A text box that feels calm and exact under the Apple Pencil and a finger: the first tap selects the box, the next tap puts the cursor where you tapped, a double-tap selects the word; one clear border with eight dots; the ≡ tab is the only way to drag; nothing else reacts during a drag; the box glides into place; handles that are easy to hit; the new Box card beside the box. Every saved page opens exactly as before.

- **Artifact (both approved):** the Box card in `docs/mockups/toolbar-v8/toolbar-mock-v8.html` (approved 12 Nov; design rules in `docs/mockups/toolbar-v8/design-study.md` §3) and the states picture `docs/mockups/textbox-2b/states.html` (approved 14 Nov night, with its numbers: landing outline 2 px, lift shadow = elevation 3, ⋯ list 248 px, the Layouts tiles, the phone tile and swatch sizes, the sepia canvas).
- **Switch:** `textbox.v2` (OFF in the live app). **Test preset:** `phase2b` ("up to Phase 2B" in Settings › Try new features › Test a phase).
- **Already built (kept, with their tests):** the layout engine and storage (`src/paper/boxService.ts`, `grid.ts`, `boxes.ts`, `boxState.ts`, `guides.ts`, `layoutPlan.ts`, `paginate.ts`, `src/core/boxStyle.ts`); the foundation this phase stands on (`src/app/input/eventRouter.ts`, `gestureRouter.ts`, `src/app/selection/store.ts`, `src/app/overlay/`, the shared parts steps 1 and 2); the tap counter `src/editor/tapSelect.ts`; the switch and the preset.
- **Not built:** everything behind `textbox.v2`. There is no `src/paper/v2/` folder yet.
- **Way to run:** the full team (owner, 14 Nov): an Opus `phase-manager` and Sonnet builders. In practice two builders at once, because `PaperFrame.tsx` is one lane and this PC runs one ipad-webkit suite at a time.
- **Rough size:** 12 tasks. Time: not known yet; the first three merged tasks give the measured pace, and the manager writes the estimate into BUILD-STATE then.

## Rules for every task in this phase

1. **Tests first, one e2e per TB line**, on chromium and ipad-webkit, in the task's own file `e2e/tb2-<name>.spec.ts`. Never weaken, skip or delete a test.
2. **One ipad-webkit run at a time on this PC.** Ask the manager for the turn ("webkit free"); set `PW_PORT` to a free port.
3. **First load has about 3.4 KB left** (limit 320,000 bytes, `scripts/check-size.mjs`). All v2 code lives in `src/paper/v2/` and loads lazily, only when `textbox.v2` is on, through one dynamic import (`src/paper/v2/index.ts`); the Box card and the layout mode are their own lazy pieces. New texts go in `src/i18n/en/late/` (plus es and hi), never in the first download. The whole phase may add at most 1.5 KB to the first load; each report names its number from `npm run check:size`.
4. **Switch OFF = today, pixel for pixel.** Old files stay untouched except for one `isOn('textbox.v2')` branch per block. No data change, no Dexie version.
5. **`src/paper/PaperFrame.tsx` is one lane:** one task holds it at a time and is merged alone, in the order below. `src/app/flags.ts` and the other hot files are not touched in this phase.
6. **No private pop-up, listener or z-index:** the overlay manager, the event router and the gesture router only (`npm run check:ratchet` must not go up).
7. **Pictures** against the approved picture in light, dark and sepia, taken after the last edit; open every picture you list (HOW-WE-BUILD section 7).
8. **Questions** go up the ladder (plan and picture, then Opus, then Fable); the owner is asked only for a real Pencil check.

## Task order

Two lanes. The manager starts lane A and lane B together and merges each task alone as soon as it is reviewed.

- **Lane A (Pencil core, holds `PaperFrame.tsx`, strictly one after another):** 2B.3 → 2B.4 → 2B.5 → 2B.7 → 2B.10 → 2B.11 → 2B.12.
- **Lane B (no `PaperFrame.tsx`):** 2B.1 → 2B.2 → 2B.8 (after 2B.3 is merged) → 2B.9 → 2B.13 (after 2B.12).

There is no task 2B.6: the number is not used.

| #     | Task                                        | TB lines                                                 | Files                                                                                                                                                                                         | Done when                                                                                                                                                                                                                                                                       |
| ----- | ------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2B.1  | Task 0.9: the three failing iPad tests, R9  | none (test health)                                       | `e2e/helpers.ts` (`createNotebook`), `e2e/textBoxFree.spec.ts` (:461), `e2e/toolsRefresh.spec.ts` (:60), `e2e/undoHistory.spec.ts` (:210); app code only if the cause is an app fault         | the cause of each is written down; each of the three passes 20 of 20 repeats on ipad-webkit on this PC; `createNotebook` passes 20 of 20 while a chromium suite runs beside it; no assertion, timeout or test removed or loosened                                               |
| 2B.2  | Pencil recorder for boxes; BUG-001 recorder | none (preview only)                                      | new `src/paper/v2/diag/boxPencilLog.ts`, `saveStateLog.ts`, a small hidden panel; pattern: the P1.5a Pencil check (`src/app/input/windowRecorder.ts`, `src/design/parts/pencilCheckLogic.ts`) | on the preview address only: taps and drags on a box are logged (pointer type, time, position, pressure, the event order, what reacted) and a "Not saved yet" moment is logged (time, block kind, error, online or not); no note text is ever stored; Copy button; unit + 1 e2e |
| 2B.3  | Select and cursor                           | TB-01, 02, 03, 05, 06, 07, 08, 09, 10; the keyboard rule | new `src/paper/v2/index.ts`, `BoxFrameV2.tsx`, `boxSelection.ts`; `PaperFrame.tsx` (box states, tap-paper, Delete key: one branch each)                                                       | one e2e per line; the caret test taps 20 spots and lands within 1 character each time, with no jump after 3 keystrokes; Pencil tap = no keyboard, finger caret tap = keyboard; pictures of the selected box match states panel 1 in three themes                                |
| 2B.4  | Double-tap and the one hint                 | TB-04, TB-42                                             | `src/paper/v2/BoxFrameV2.tsx`, `src/editor/tapSelect.ts` (reuse; change only with a test), `src/paper/hintPages.ts`, the hint block in `PaperFrame.tsx` (:1867)                               | e2e: first tap selects the box, then 2 = word, 3 = line, 4 = paragraph, with Pencil and with finger, with a 6 px wiggle; a Pencil timing test (taps 80 to 350 ms apart); never two hints on screen (panel 7)                                                                    |
| 2B.5  | Resize and dividers                         | TB-20, 21, 22, 23                                        | new `src/paper/v2/boxResize.ts`, `boxHandlesV2.ts`; `src/paper/GridDividers.tsx` pointer code; the resize block of `PaperFrame.tsx`                                                           | one e2e per line; unit tests: nearest handle wins, content minimum, minimum width = longest word; 44 pt targets measured in a test; a Pencil handle drag makes no ink and no scroll                                                                                             |
| 2B.7  | Move                                        | TB-11 to TB-18                                           | new `src/paper/v2/boxDrag.ts`; the drag block of `PaperFrame.tsx`                                                                                                                             | one e2e per line; unit tests: drop planned from the lift, Esc, lost "finger lifted" ends within 4 s; a drag on border, text or dot moves nothing; no ✓ after the drop; pictures match states panels 2 and 3                                                                     |
| 2B.8  | Object bar                                  | TB-19, 24, 30, 31; the locked and the tiny box           | new `src/paper/v2/BoxBarV2.tsx`, `BoxMoreList.tsx`; the shared Object bar part                                                                                                                | one e2e per line; ⋯ list 248 px wide as in panel 5; locked box: lock on the tab, no dots, text still editable (panel 4); a box under 120 px shows tab and ⋯ side by side                                                                                                        |
| 2B.9  | Box card                                    | TB-25 to TB-29                                           | new `src/paper/v2/BoxCard.tsx` (its own lazy piece); reuse `src/paper/boxPresets.ts`, `src/core/boxStyle.ts`; the shared Card frame                                                           | one e2e per line; every row of `BoxStylePopover.tsx` has its place (inventory); tall card under a wide box scrolls inside while the page stays still; phone = bottom sheet (panel 8); pictures match the Box card of toolbar mock v8                                            |
| 2B.10 | Several boxes and layout mode               | TB-32 to TB-35                                           | new `src/paper/v2/boxGroup.tsx`; `src/paper/LayoutDialog.tsx` pointer code, `layoutModeBus.ts`; the Lasso and group blocks of `PaperFrame.tsx`                                                | one e2e per line; one Undo for a group move and for a layout change; pictures match panels 6a and 6b                                                                                                                                                                            |
| 2B.11 | Pencil on paper, zoom and hover             | TB-36 to TB-41                                           | the pinch, hover, text-pen, pen-on-paper and gap-tap blocks of `PaperFrame.tsx`; reuse `src/paper/penOnPaper.ts`, `textPencil.ts`, `e2e/scribbleProbe.ts`                                     | one e2e per line; the Pencil never zooms; Text tool in a box leaves the writing to Scribble (no ink stroke), Pen tool makes ink in the box; the page bar and the tool bar stay in place at every zoom                                                                           |
| 2B.12 | Clean-up and the "nothing lost" check       | every inventory row; the accessibility lines of the spec | new `e2e/tb2-nothingLost.spec.ts`; `PaperFrame.tsx` (switch-ON path stops using `activeBox.ts`; the two lint warnings); `docs/features/textbox-v2.md` inventory                               | a probe test for each inventory row with the switch ON; switch OFF pictures equal today's, pixel for pixel; old-page fixtures (`boxRepair.test.ts`) open unchanged; arrows move a selected box one grid step, Enter edits; lint 0 warnings; BUG-001 fixed if 2B.2 caught it     |
| 2B.13 | Pictures and the owner's test list          | the screenshot matrix of the spec                        | `screenshots/phase-2b/`; this page (the test list below, version filled in); `docs/plans/owner-checks-pending.md`                                                                             | Beginner and Professional × light, dark, sepia × iPad landscape, portrait, phone, PC, for box selected, dragging and Box card open, each compared with the approved pictures by the reviewer; old text box checks (9 to 12 Nov) folded into the list below or dropped           |

### Builder briefs (the manager fills in the working copy and sends one per builder)

Every brief ends with: "Rules: docs/plans/phases/phase-2b.md 'Rules for every task'. Follow .claude/agents/builder.md."

```
Task 2B.1: the three iPad tests that always fail on this PC pass, and the shared helper no longer races. You own it until it is merged.
Where: working copy <given>, branch slice/2b-1-ipad-tests. No switch.
Spec: docs/archive/plans/ipad-test-findings-2026-11-14.md R9; phase-plan task 0.9.
Files: e2e/helpers.ts, e2e/textBoxFree.spec.ts:461, e2e/toolsRefresh.spec.ts:60, e2e/undoHistory.spec.ts:210. Not yours: playwright.config.ts, any timeout.
First find and write down each cause (run alone, with trace). Fix the cause; if it is an app fault, say so before touching app code.
The reviewer will compare with: the test guard (no fewer expects, no skip, no higher timeout).
Done when: 20 of 20 repeats each on ipad-webkit; createNotebook 20 of 20 beside a chromium suite.
```

```
Task 2B.2: a quiet recorder shows what the real Pencil sends on a text box, and when "Not saved yet" appears. You own it until it is merged.
Where: working copy <given>, branch slice/2b-2-recorders. Preview host only (copy freezeWatchHost in src/perf/slowMomentsSwitch).
Spec: phase-2b.md row 2B.2; PENDING BUG-001. Picture: none (hidden panel, shared parts only).
Files: src/paper/v2/diag/. Not yours: PaperFrame.tsx, flags.ts. Copy this pattern: src/app/input/windowRecorder.ts, src/design/parts/pencilCheckLogic.ts.
Passive listeners only; never stop or change an event. Never store note text, only kinds, times and numbers. Keep the last 300 entries on the device; a Copy button.
The reviewer will compare with: no listener outside the preview host; lazy loading; no text in the log.
Done when: unit tests for both logs, one e2e on chromium and ipad-webkit, check:size unchanged.
```

```
Task 2B.3: tapping a box selects it with one clear border; the next tap puts the cursor exactly there. You own it until it is merged.
Where: working copy <given>, branch slice/2b-3-select, switch textbox.v2 (OFF).
Spec: docs/features/textbox-v2.md TB-01, 02, 03, 05 to 10, "Sizes" and "Pencil / touch rules". Won't do: move, resize, bar. Picture: docs/mockups/textbox-2b/states.html panel 1.
Files: src/paper/v2/index.ts, BoxFrameV2.tsx, boxSelection.ts; PaperFrame.tsx (one switch branch per block; you hold the lane). Copy this pattern: src/paper/BoxFrame.tsx:116, :218; src/app/selection/store.ts.
The reviewer will compare with: first tap selects and never opens the keyboard; Pencil tap never opens it; no caret jump; no per-line outline; border 1.5 px accent with halo in dark and sepia.
Done when: one e2e per line on chromium and ipad-webkit; unit tests for boxSelection (one kind at a time).
```

```
Task 2B.4: a double-tap selects the word, and an empty page shows one hint only. You own it until it is merged.
Where: working copy <given>, branch slice/2b-4-doubletap, switch textbox.v2 (OFF).
Spec: textbox-v2.md TB-04, TB-42. Picture: states.html panel 7.
Files: src/paper/v2/BoxFrameV2.tsx, src/paper/hintPages.ts, the hint block of PaperFrame.tsx (:1867). Reuse src/editor/tapSelect.ts (rangeForTaps, watchTapSelect); change it only with a test. Use the 2B.2 log, if the owner sent one, for the real tap timing.
The reviewer will compare with: no word selected by a double-tap on an unselected box (the first tap only selects the box); Pencil wiggle up to 6 px still counts; nothing is deleted or replaced after the selection; Scribble still works a second later.
Done when: e2e for 2, 3 and 4 taps with Pencil and finger; the Pencil timing test; the one-hint test.
```

```
Task 2B.5: the dots are easy to hit and resize the box live. You own it until it is merged.
Where: working copy <given>, branch slice/2b-5-resize, switch textbox.v2 (OFF).
Spec: textbox-v2.md TB-20 to TB-23, "Sizes" (dots, 44 pt, 120 ms hold, 4 px dead-zone). Picture: states.html panels 1 and 4.
Files: src/paper/v2/boxResize.ts, boxHandlesV2.ts, src/paper/GridDividers.tsx pointer code, the resize block of PaperFrame.tsx (:993-1151 today). Copy this pattern: src/paper/boxHandles.ts:2-13; src/app/input/gestureRouter.ts.
The reviewer will compare with: side and corner zones never overlap; never smaller than the content; minimum width = longest word; Pencil never inks or scrolls mid-drag; dots drawn outside the text.
Done when: one e2e per line; unit tests for nearest handle and content minimum.
```

```
Task 2B.7: hold the ≡ tab and the box lifts, moves alone, and glides into place. You own it until it is merged.
Where: working copy <given>, branch slice/2b-7-move, switch textbox.v2 (OFF).
Spec: textbox-v2.md TB-11 to TB-18, "Motion". Won't do: a ✓ after the drop; dragging by the border. Picture: states.html panels 2 and 3.
Files: src/paper/v2/boxDrag.ts, the drag block of PaperFrame.tsx (:688-964 today). Reuse guides.ts, layoutDrop.ts, boxService.ts unchanged.
The reviewer will compare with: the drag lock (nothing else reacts anywhere); landing outline 2 px; lift = elevation 3; 200 ms glide, tappable only after it; one Undo; the 4 s safety end; one transform per frame.
Done when: one e2e per line plus the dropped-pointerup fault test; unit tests for boxDrag.
```

```
Task 2B.8: a selected box shows one bar and a ⋯ list. You own it until it is merged.
Where: working copy <given>, branch slice/2b-8-bar, switch textbox.v2 (OFF).
Spec: textbox-v2.md TB-19, 24, 30, 31, States "Locked box". Picture: states.html panels 4 and 5.
Files: src/paper/v2/BoxBarV2.tsx, BoxMoreList.tsx. Not yours: PaperFrame.tsx (mount through BoxFrameV2). Copy this pattern: src/paper/BoxBar.tsx:23, :45, :76-85; the shared Object bar part.
The reviewer will compare with: every action of today's bar is there; ⋯ list 248 px; lock hides the dots, text still edits; the bar never enters the 12 px safe top zone; phone 44 pt targets.
Done when: one e2e per line; the copy-failed toast test.
```

```
Task 2B.9: Box style opens the new Box card beside the box. You own it until it is merged.
Where: working copy <given>, branch slice/2b-9-card, switch textbox.v2 (OFF).
Spec: textbox-v2.md TB-25 to TB-29; Pro lines per docs/mockups/pro-features.md. Picture: the Box card in docs/mockups/toolbar-v8/toolbar-mock-v8.html, design-study.md §3; states.html panel 8 (phone).
Files: src/paper/v2/BoxCard.tsx (its own lazy piece). Not yours: PaperFrame.tsx, BoxStylePopover.tsx (stays for switch OFF). Reuse boxPresets.ts, src/core/boxStyle.ts, boxStyleBus.ts.
The reviewer will compare with: every row of BoxStylePopover.tsx:213-364 has a place; 376 px, radius 20, 8 px gap, never over the box; a tall card scrolls inside and the page stays still; the changed control glows once; one Undo per change.
Done when: one e2e per line; Beginner and Professional pictures in three themes.
```

```
Task 2B.10: pick several boxes with Lasso and try layouts on the page. You own it until it is merged.
Where: working copy <given>, branch slice/2b-10-group, switch textbox.v2 (OFF).
Spec: textbox-v2.md TB-32 to TB-35. Picture: states.html panels 6a and 6b.
Files: src/paper/v2/boxGroup.tsx, src/paper/LayoutDialog.tsx pointer code, layoutModeBus.ts, the Lasso and group blocks of PaperFrame.tsx (:1178-1196, :2002-2011 today; you hold the lane). Reuse layoutPlan.ts, layoutAssistService.ts unchanged.
The reviewer will compare with: one group pill with the count; all picked boxes move together with one Undo; the coach line text; Done ends the mode; the Layouts tiles as in the picture.
Done when: one e2e per line; reduced-motion run (no wiggle, states still change).
```

```
Task 2B.11: the Pencil on paper, in a box, pinch zoom and the "+ box" tag work on the new layer. You own it until it is merged.
Where: working copy <given>, branch slice/2b-11-pencil, switch textbox.v2 (OFF).
Spec: textbox-v2.md TB-36 to TB-41. Picture: none new (kept behaviour).
Files: the pinch (:344-442), hover (:559-588), text-pen (:1234-1332), pen-on-paper (:1378-1462) and gap-tap (:1590) blocks of PaperFrame.tsx, moved behind the gesture router (you hold the lane). Reuse penOnPaper.ts, textPencil.ts, zoomSpring, palmGuard unchanged.
The reviewer will compare with: the Pencil never zooms; Text tool in a box = Scribble (no ink), Pen tool = ink, never converted; handwriting near a shape cancels the shape; zoom 100 to 400 % with the spring.
Done when: one e2e per line (TB-41 with e2e/scribbleProbe.ts); the kept unit tests green and unchanged.
```

```
Task 2B.12: prove nothing was lost and tidy the switch-ON path. You own it until it is merged.
Where: working copy <given>, branch slice/2b-12-cleanup, switch textbox.v2 (OFF).
Spec: textbox-v2.md "Nothing lost (inventory)", "Tests" (switch OFF, old pages, accessibility).
Files: e2e/tb2-nothingLost.spec.ts; PaperFrame.tsx (you hold the lane); the inventory table (update file:line). Not yours: deleting old files (they stay until release).
The reviewer will compare with: one probe per inventory row; switch OFF equals today's pictures; labels on tab, dots and bar buttons; arrows and Enter; first-load number for the whole phase.
Done when: the probe file green on chromium and ipad-webkit; lint 0 warnings; the full test set green.
```

```
Task 2B.13: the pictures of the phase and the owner's test list are ready. You own it until it is merged.
Where: working copy <given>, branch slice/2b-13-pictures. No app code.
Spec: textbox-v2.md "Tests" (screenshot matrix); phase-2b.md "The owner's first look".
Files: screenshots/phase-2b/, docs/plans/phases/phase-2b.md (version, any step that changed), docs/plans/owner-checks-pending.md (fold or drop the old text box checks).
The reviewer will compare with: each picture beside its approved panel; real dark and sepia (check the theme attribute); real data; no tips or toasts open.
Done when: the matrix is complete and every listed picture was opened.
```

## The owner's morning Pencil checks (iPad, Safari, Apple Pencil, about 10 minutes)

Why: the build needs to know what your real Pencil sends when you tap and drag a box; a test computer cannot fake it. Claude says when the recorder (task 2B.2) is in the preview and names the version. If you have no time, skip it: the build carries on.

Address: https://build-next.learning-notes-app.pages.dev . First check Settings › Help & tour › About this app shows the version Claude names.

1. Open any page with two or three text boxes. Open the hidden "Box check" the way Claude describes and tap Start.
2. **Tap** a box once with the Pencil. Wait a second. **Tap** the same box again in the middle of a word.
3. **Double-tap** a word with the Pencil, five times, on different words, at your normal speed.
4. **Triple-tap** a line once.
5. **Drag** a box by its top handle to a new place and drop it. Do it three times.
6. **Pull** a corner of a box with the Pencil to make it wider, then narrower.
7. **Write** one short word with the Pencil inside a box with the Text tool, then with the Pen tool.
8. Rest your palm on the screen while you repeat step 2.
9. Tap Stop, then Copy, and paste the result to Claude (or send a screenshot). It holds times and positions only, never your notes.
10. **"Not saved yet" (BUG-001):** nothing to do. If you ever see "Not saved yet" on a checklist while you use the preview, tell Claude roughly when; the quiet recorder kept the details.

## The owner's first look (iPad, Safari, Apple Pencil and finger, about 25 minutes)

After task 2B.7 the manager offers a short early look at steps 1 to 12 (the Pencil core); the full list comes after 2B.13. Write down the step number and what you saw for anything that does not match.

0. Check the version in Settings › Help & tour › About this app. In Settings › Try new features › Test a phase choose "up to Phase 2B" and switch it On.
1. Open a page you wrote before today. **You should see:** it looks exactly as before; nothing moved.
2. Text tool, **Pencil**, tap a box once. **You should see:** one clear line around the whole box, eight dots, a ≡ tab on top and a ⋯ button; no outline around a single line; no keyboard.
3. Tap a word in that box again with the Pencil. **You should see:** the cursor exactly where you tapped; it does not jump; still no keyboard.
4. Tap the same spot with a **finger**. **You should see:** the cursor there and the keyboard opens.
5. Pencil double-tap a word, then triple-tap, then four taps. **You should see:** the word, then the line, then the paragraph selected; nothing deleted.
6. Tap empty paper. **You should see:** the box is no longer selected, nothing else happens. Tap empty paper again with the Text tool. **You should see:** a small new box with a cursor, under the box above, not beside it.
7. Type a long sentence in the new box. **You should see:** one line that grows to the right, then wraps by whole words, never letter by letter.
8. Open a new empty page. **You should see:** one hint only; it goes when you write.
9. Hold the ≡ tab, drag the box across the page and tap elsewhere with a finger while dragging. **You should see:** the box lifts; other boxes slide aside; an outline shows where it lands; nothing else reacts.
10. Drop it. **You should see:** it glides into place; no ✓ to press. Tap Undo. **You should see:** it is back where it was.
11. Try to drag a box by its border or its text. **You should see:** it does not move.
12. Pull a side dot and a corner dot with the Pencil. **You should see:** the box resizes; never smaller than its text; no ink drawn; the page does not scroll.
13. Select a box. **You should see:** one bar above it: Cut, Copy, Duplicate, Delete, Box style, ⋯.
14. Tap ⋯, then Lock in place. **You should see:** a small lock, no dots; the text can still be edited. Unlock it. Try Move up and Move down.
15. Tap Box style. **You should see:** the Box card beside the box, never over it. Pick Sticky, then a colour. **You should see:** the box changes at once.
16. Open Box style under a wide box near the bottom of the screen and scroll the card. **You should see:** the card scrolls inside; the page behind stays still.
17. Lasso around two boxes on empty paper. **You should see:** both picked, one small Group pill. Drag one: both move. Undo once: both are back.
18. Open Layout Assist from the Box card. **You should see:** the page steps back a little, the boxes wiggle, a strip of layouts; tap one, then Done. Undo brings the old layout back.
19. Text tool, write with the Pencil inside a box. **You should see:** your handwriting becomes typed text. Pen tool, write inside a box. **You should see:** it stays a drawing.
20. Pen tool, write on empty paper. **You should see:** a lined box appears under your writing.
21. Pinch with two fingers, then try with the Pencil. **You should see:** fingers zoom; the Pencil never zooms.
22. Use the page for ten minutes as you normally would. If "Not saved yet" shows, note the time.
23. In "Test a phase", switch Off. **You should see:** today's text box comes back at once.

## After the first look

- Fix each finding (one or two builders, each reviewed once), then the owner re-checks those steps.
- Polish to the release bar: the full screenshot matrix against the approved pictures, accessibility, the size budget, the full test set green.
- BUG-001: fixed here if the recorder caught it; if it never showed, it stays in docs/PENDING.md with the recorder running.

## Release

1. The full test set green; the first-load number written down; the two recorders of 2B.2 and the hidden "Box check" removed.
2. `textbox.v2` stays OFF in the live app until the owner's yes; the owner then switches "up to Phase 2B" On on each device.
3. After the owner's yes: the old files (`BoxFrame.tsx`, `BoxBar.tsx`, `BoxStylePopover.tsx`, `boxHandles.ts`, `activeBox.ts`) are listed for removal in a follow-up task.
4. Look back: the numbers of this phase go into docs/metrics/phase-results.md and one line into `~/.claude/playbook-results.md`.

## Definition of Done

Every line TB-01 to TB-42 has a green e2e on chromium and ipad-webkit; every inventory row has a probe; switch OFF equals today; the pictures match both approved pictures in light, dark and sepia; first load within the limit; the owner's first look has no open finding; rules/quality.md is met.

## Won't do in this phase

Rotation and layers (parked together; owner, 14 Nov); a ✓ after a drop; "tap beside a box = a box side by side" (saved in docs/IDEAS.md); moving a box by its border; a fix for the floating keyboard (docs/IDEAS.md); shrinking a box below its content; overlapping boxes; fold, hide or show a box; recall card or Summary from a box; any change to saved data; tool bar changes (Phase 2A); things inside a page and media (Phase 9).

## Decided (no question left for the owner)

The owner's answers of 14 Nov are in [phase-2b-decisions.md](phase-2b-decisions.md). Decided by Fable under the question ladder, also logged in docs/DECISIONS.md "Decisions to review":

- **A single tap on a box that is already selected puts the cursor there (TB-01).** The owner's rule names the first tap (select) and the double-tap (word); the single tap in between keeps today's meaning, so no feature is lost.
- **Two new spec lines, no new feature:** TB-41 (Pencil inside a box follows the tool) and TB-42 (one hint at a time) write down the owner's answers and the approved panel 7.
- **Keyboard arrows and ⋯ › Move up / Move down still move a box.** "Only by the ≡ tab" is about dragging; the other two are the no-drag way the shared drag part and accessibility need.
- **Recorders are preview-only and store no note text;** they are removed before release, like the Phase 1 Pencil check.
