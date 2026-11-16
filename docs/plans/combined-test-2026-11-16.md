# Combined first look, 16 Nov 2026: open bugs and how to resume

Read this first when continuing. It holds everything needed to pick up the owner's combined test and fix what it found. Raw notes are in [ipad-test-findings-2026-11-14.md](ipad-test-findings-2026-11-14.md), section "Combined first look".

## Where things stand

- **Test version:** build/next `9642f0d5` (CI run 43773655339 green, desktop and iPad). Preview https://build-next.learning-notes-app.pages.dev. It is frozen for the owner's test: do not push to build/next until the owner says the test is done, or after the fixes below.
- **How the owner tests:** iPad Safari › Settings › Try new features › Test a phase › "Up to Phase 2B" (Phase 1 + 2A tool bar + new text box), on a test page.
- **Built and in the test version:** Phase 1 with its fixes (P1.8–P1.12: update screens, frame, T29 offline note, T31 no key names on touch, ✕ on notices), all of Phase 2A (tool bar v9, tasks 2A.4–2A.16), Phase 2B up to 2B.11.
- **No helpers are running.** Nothing is half-merged. Main and build/next are in sync apart from docs.
- **Waiting to go live:** Phase 1 goes into the live app (task 0.7) after the combined test passes and the owner says yes. Merge the live-site-check fix (slice/live-check-sha af19a586) together with 0.7.

## Test progress

| Part             | Steps | Result                                                         |
| ---------------- | ----- | -------------------------------------------------------------- |
| A. New tool bar  | 1–10  | Pass, except C2–C6 below. Owner: "smooth and great" otherwise. |
| B. Page options  | 11–12 | Not tested yet                                                 |
| C. Phase 1 fixes | 13–15 | Not tested yet                                                 |
| D. Pencil look   | 16–19 | Not tested yet                                                 |

The full step list is in the 16 Nov chat message "Your combined test is ready"; short form: 11 ⋯ at the top of a page opens a panel from the right below the top bar; 12 tiles plus folded groups, + Pin an action ✓/✕; 13 Pretend a must-have update + Airplane mode: the note stays, Try again works; 14 no key names on the iPad; 15 notices ✕ left, Undo right; 16–19 text box: tap = border with 8 dots, second tap = cursor, double-tap = word, ≡ moves, dots resize, Scribble + pinch.

## Open bugs (fix these next)

**Owner answers (16 Nov): yes to all four picks:** C2 A, C3 A, C5 A, and A for the order (fixes start now; the owner tests parts B–D meanwhile; fixes merge into the test version only after the owner finishes B–D).

**C2. Eraser on shapes (Standard and Precise).** Erasing part of a shape removes the whole oval, or bends the rectangle into a slanted shape (the remaining corners get joined by a straight line). Whole stroke is fine. Likely cause: a shape is stored as a few corner points, and the eraser drops a point. Fix (pick A): when Standard or Precise touches a shape, turn the shape into ordinary ink first, then cut only what the tip touches. Alternative B: the eraser removes whole shapes only.

**C3. "Back after one" cut off** on the eraser bar, iPad upright, Professional ("Back after or"). Fix (pick A): icon only when space is tight, full name on hold. Alternative B: the shorter text "Back after 1".

**C4. Scribble to delete in a text box.** Scribbling over "6" deleted the selected word "Text" instead, and the scribble stayed as grey ink over the 6. It happened twice; the owner says scribble often doesn't work well. Likely cause: the iPad's scribble-delete acts on the existing selection, and the app also kept the strokes as pen ink. Fix: clear the old selection when a scribble starts over text, delete only the text under the scribble, never keep scribble strokes as ink inside a text box. Test many times with real Pencil-style input (e2e/realPen.ts).

**C5. Selecting symbols** (arrows, commas, slashes, circled numbers ①). Double- and triple-tap don't select them; a tap next to them works only sometimes; tapping an arrow jumps the selection to the first item of the line. Lasso (Rectangle, Picks: Text) around "① → 6" shows a dashed box but doesn't select the symbols. Likely cause: the word splitter skips anything that isn't a letter or number. Fix (pick A): a single tap puts the cursor next to the symbol; a double tap selects the symbol together with neighbouring symbols ("→", "①", "//"); a triple tap selects the line; the Lasso Text pick includes symbols. Alternative B: a double tap selects only the single symbol. Open question for the owner: after the Lasso box, does no menu appear, or does a menu appear but act on nothing?

**C6. "Edit tool bar" missing** in ⋯ More › Tool bar (it shows only "Tool bar on or off", "Settings", "All tools"). Add "Edit tool bar", which starts editing on the bar (hold, drag, Done), as in the approved v9.

**Withdrawn:** C1 (pen size dots): fine in the new tool bar; the screenshot was taken with the test switch off.

## Earlier open items (still waiting)

- R20: renaming a Journal month by double-tap fails on ipad-webkit (found 15 Nov), to check on the real iPad.
- R21 is fixed. 2B.12, 2B.13 and the 2B bugs (R15, T25, T26, R18) are still to do.
- Later list (docs/IDEAS.md): tool bar layouts (after the owner passes the Settings test), saved setups, sharing a setup, a settings file for experts, app suggestions, TB-58 Pro unlock beyond six favourites.
- Next after this test: Phase 2B finish, then the Settings v5 rebuild (approved pictures docs/mockups/settings-v5/, stories docs/features/settings-v5-stories.md, recount all 169 v3 feature switches first).

## How to resume (for the next chat)

1. Ask the owner for the 4 answers (C2, C3, C5 double-tap, test order), or use the picks.
2. One builder per bug group (C2 eraser; C4 + C5 text selection and scribble; C3 + C6 tool bar), in their own slice/ working copies from build/next. Tests first; review once; the owner may test again.
3. Helpers can't push to build/next (the safety layer refuses), so the main chat fast-forwards build/next for them. Merge main into build/next with each merge.
4. Rules learned this session: never run npm ci or npm install in a linked working copy (it emptied the main packages); every manual Playwright run uses --global-timeout=1200000; only one ipad-webkit run at a time; builders never touch main; pictures always with all five preview switches on (foundation.shell, toolbar.v8, toolbar.menu, page.menus, textbox.v2).
5. Then the owner finishes parts B–D, and Phase 1 goes live on the owner's yes (task 0.7 plus the live-check fix).

## Results added later on 16 Nov

- **Part B (Page options) and Part C (Phase 1 fixes): all pass** (owner, 8:23). Only Part D (Pencil look) is left to test.
- **C7 (manager, from the owner's 8:23 screenshot):** "Arrange pinned actions" inside Page options still has a "Done" button at the bottom and two ✕ stacked (one for Page options, one for Arrange). By the 15 Nov rule, ✕ goes on the left and ✓ on the right of the sheet's header, with no footer Done and one ✕. Small fix; it can go with C3/C6.
- **C8 (owner, 8:29, screenshot):** Box actions › "Delete box" does not delete the whole text box (owner: "This no delete the entire text box"). The screenshot shows the box after the attempt with empty bullets, numbers and a toggle arrow still inside. Owner confirmed: nothing at all is deleted. Expected: Delete box removes the box and everything in it, with one Undo.
- **C9 (owner, 8:33):** voice input. The owner wants to speak instead of type: dictation (voice turned into text) and recording audio. It existed before as the mic button on the old tool bar (src/app/tools/main/MainBar.tsx, "miniKeys") that opens the mini keys strip with a mic (MiniKeysStrip.tsx). The new tool bar has no mic by default. Fix now: "Mic (speak to type)" and "Record audio" are offered in the edit-the-bar "More tools" tray, so the owner can add them to the bar (not on the bar by default). Later, picture first: inside a text box, a mic choice "Type my words" or "Record audio" (docs/IDEAS.md).
- **C10 (owner, 8:37, screenshot):** typing focus must pause while the user works on something else, and come back afterwards.
  - While dragging a text box's resize dots, the text is not active; when the dot is let go, the cursor goes back exactly where it was.
  - The same for the tool bar: while tapping tools in the text bar, keystrokes or Pencil input must not land in the text behind it (the owner saw it "typing in the back").
  - Any tap on a bar, card or panel pauses text input; closing it puts the cursor back where it was, and the selection too if there was one.
- **C11 (owner, 8:40–8:41, Goodnotes reference screenshots):** text box states like Goodnotes.
  - (1) While typing in a box, show a thin border around the box with no resize dots.
  - (2) While a box is in typing mode, a tap just outside it ends typing (the cursor goes) and leaves the box selected, with its resize handles and the box bar.
    This changes the approved states picture (docs/mockups/textbox-2b/states.html: today the typing state also shows the 8 dots), so it needs a small picture for the owner's OK first. Open question: does a second tap outside then deselect the box completely? Owner: yes, a second tap outside deselects the box completely.
- **C12 (owner, 8:42, screenshot):** the selected box's frame (border and 8 dots) is shorter than the box itself: the box's coloured fill goes on about 140 px below the frame's bottom edge, with a small extra grey tab at the right edge. The frame must always match the box's real size, including its fill and padding.
- **C13 (owner, 8:44, screenshot):** two boxes side by side; dragging the right-hand box's top-right dot does nothing (other drags work, "the layout itself was absolutely awesome"). Cause found (src/paper/PaperFrame.tsx ~line 1221–1229, resize start): for a box in the last column of a row, an "e" dot has no next column to trade width with and is not the "lone" case, and an "n" dot works only for the first column (`ci === 0`), so ne, n and e on a right-hand box all do nothing. Fix (manager's pick, logged): every visible dot always does something. The outer right edge of the last box narrows or widens that box (the freed space stays empty at the page's right, like a single box); the top edge works from any box in the row (moves the row's top, as the left box does). Tests for every dot of the left and right box in a two-box row.
- **C11 picture approved (owner, 16 Nov: "I like your image"):** the 3 pictures 1-typing, 2-selected, 3-none (thin border while typing, no dots; one tap outside = selected; second tap outside = nothing). Copy kept in docs/mockups/textbox-2b/c11-shots/. Build it now.
- **C14 (owner, 16 Nov):** double-tapping a word with the Pencil sometimes deletes the word. Double and triple tap work only sometimes; several taps do select the paragraph. The owner thinks the time allowed between taps is too short and a slightly long tap counts wrong. Found in the code (manager): the text tap window is 450 ms (src/editor/tapSelect.ts), but on the ink layer a tap must be under 90 ms and under 3 px of travel and the second tap within 300 ms (src/ink/tapFilter.ts). A normal Pencil tap is often longer or moves more, so it becomes a tiny ink stroke, and a short stroke over a selected word may be read as Scribble's scratch-out (delete). Fix (manager's picks, logged):
  1. A double or triple tap never deletes anything. Deleting needs a real scratch-out (several back-and-forth strokes) over text that is already selected.
  2. One tap timing for the whole page: taps up to 500 ms apart add up; a Pencil tap may last up to 250 ms and move up to 8 px.
  3. Preview only: a "Tap speed" choice (Quick 350 ms, Normal 500 ms, Relaxed 700 ms) under Settings › Try new features, so the owner can try values on the iPad and pick one. The picked value becomes the default; the choice is removed before release.
  4. Tests with real Pencil-style input (e2e/realPen.ts): taps of 150–250 ms with 5 px drift, double and triple taps at 400–500 ms gaps, 50 repeats; a double tap on a selected word never deletes it.
- **C15 (owner, 8:51, two screenshots):** up and down resizing of boxes that sit in columns doesn't work well; left and right does. Layout: brown box on the left; on the right, the green box with the blue box under it.
  - Green box: its bottom dot can't be dragged down, because the blue box is under it.
  - Blue box: its top edge can't be dragged up.
  - Brown box: its bottom dot can't be dragged down. Its fill already goes about 140 px below its frame (C12 again), so the size the frame starts from is likely wrong.
  - Owner: every box should always be adjustable in every direction, in one predictable way.
  - Fix (manager's pick, logged):
    1. Bottom edge down: the box grows and pushes every box below it in that column down.
    2. Top edge up: the box grows into the free space above it. If there is none, the box and everything below it move down, so the box still grows.
    3. Shrinking always works, down to the text's own height.
    4. A dot never silently does nothing (C13).
  - Tests: drag every dot of each box in a "one box left, two stacked boxes right" layout, after typing and after a reload.
- **C16 (owner, 8:51 screenshot 2):** two boxes are selected at once (brown and green, each with dots, ≡ and ⋯), which is confusing. Rule: only one box is selected at a time. Selecting or typing in a box unselects any other box. Several boxes are selected only on purpose, where it is needed: Lasso around boxes, or a "Select several" mode (layout work). Fix (manager's pick, logged): as above, and the one box bar acts on the selected box only. Test: tap box A, then box B, and only B shows dots; Lasso around both still selects both.

## Ready to merge (after the owner finishes Part D)

- **C3, C6, C7, C9:** `slice/c36-toolbar` 01f21cd7. Review PASS (C7 ✕-cancel fixed). Chromium: 5/5 new tests. ipad-webkit: 65/65 related specs. At the merge, add `toolbarC36.spec.ts` to ipad-webkit's testMatch (playwright.config.ts, manager-approved) and run it there once.
- **C2:** `slice/c2-eraser-shapes` 1ab91f01. Review fixes checked by the manager (shape-way pieces, pixel test 4/4 chromium and ipad-webkit, removed checks replaced by stronger ones). PASS.
- **Split, 16 Nov:** C4, C5 and C14 on `slice/c45-scribble-symbols`; C8, C10–C13 and C15 on `slice/c-boxes` (new builder); C2 on `slice/c2-eraser-shapes`; C16 on hold for the owner's A/B/C answer.
