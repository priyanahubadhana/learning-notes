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
| D. Pencil look   | 16–19 | Pass (owner, 16 Nov); C11–C16 found along the way              |

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

## 16 Nov, later

- **Part D passed** (owner: "Part D, I done … all pass"). The combined test is finished. Small choices: the − in edit mode passes; "Back to tool hides while editing" was explained; the "All cards" and "Summary" icons are not checked yet.
- **C16 answer: A** (one selected box at a time; several only with a Lasso). Given to the box builder (`slice/c-boxes`).
- **Merged into build/next f2fdcda8:** C2 (eraser) and C3, C6, C7, C9 (tool bar), plus main. ipad-webkit 9/9 on the two new specs; push guard green; CI running.
- **Owner answers (16 Nov, after the test):**
  - (1) Keep the separate "All cards" and "Summary" icons.
  - (2) Phase 1 does **not** go live now. Everything is released together only after full testing and once all the bugs are fixed, because releasing again and again caused confusion. Task 0.7 waits for that.
- **Weekly limit:** 88% used on 16 Nov (resets 20 Nov, 00:30 IST). Only the two text box builders are running.
- **TB-24 (e2e/tb2-bar.spec.ts) red on a clean build/next checkout on this PC** (box builder, 16 Nov), while CI run 43799715681 is green. Check whether CI runs it, and fix the root cause (stop the line), before the next release.
- **C box group:** `slice/c-boxes` 82336aaf: C8, C10 (incl. the tool bar part, keyboardPolicy.ts), C11, C12, C13, C15, C16. Under review. Builder decision: Delete box on a page's first box empties it with one Undo (the first box always stays).
- **Merged into build/next 535695f8:** box group C8, C10–C13, C15, C16 (`slice/c-boxes` e4778dcc), with /cBoxes/ on ipad-webkit. ipad-webkit 20/20 (one flaky C13 retry came while another webkit run was going; 10/10 alone with no retries). Owner can re-test.
- **C4, C5, C14** (`slice/c45-scribble-symbols` 87523cea): C5 passes on ipad-webkit; 2 reds left (C14 triple taps 31/35, C4 "ten scribbles" sometimes). Opus tried twice, so this went to Fable (16 Nov). The Tap speed row is in flagSettings.ts.
- **Merged into build/next b0fe6c4a:** C4, C5, C14 (`slice/c45-scribble-symbols` a85c6154; Fable fixed the test driver; event.timeStamp tap timing; whole-path scratch-out). All C2–C16 fixes are now in the test version. ipad-webkit on the merged code: c45 + cBoxes 32/32 with --retries=0. Watch: in one heavier 4-spec run, C14 "double tap never deletes" and C12 "first box frame" failed once each, then passed 6/6 alone and in the next full run. If CI shows them, fix the cause (load sensitivity).
- **CI green** (run 43819906898, build/next with the Tap speed id fix). **Next:** the owner re-tests C2–C16 on the iPad (reload the test page; preset "Up to Phase 2B"; Settings › Try new features › Tap speed to try Quick, Normal or Relaxed).

## Re-test findings (owner, 16 Nov, 12:55)

- **C17 (screenshot):** the floating mic strip (⠿ mic ↵ ⌫, top right of the page) is shown with a red glow, but:
  - (1) the Apple Pencil can't tap its buttons;
  - (2) it has no ✕ to close it;
  - (3) the mic doesn't type anything. The owner expects it to type like the Apple keyboard's mic.
  - Code (manager): src/app/tools/main/MiniKeysStrip.tsx `mic()` uses Safari's SpeechRecognition (continuous, final results only); other errors are silent; buttons use onClick, which a Pencil tap may never fire (Pencil pointerdowns are cancelled in tapSelect.ts and the ink pad).
  - Fix (manager's pick): Pencil and finger both work on every strip button (act on pointerup, not click); a ✕ closes the strip (and the mic tool reopens it); the mic types words into the text at the cursor as you speak (show interim words, then the final text). Restart when Safari ends a session early. Show a clear message for every error (no permission, no network, not supported) with the way out: "use the keyboard's mic". The red glow only while it's really listening.
- **C18 (same screenshot, to check):** the box shows a cursor and the 8 dots at the same time (with a dashed outline); C11 says typing = thin border, no dots. It may be the mic strip taking the focus. Check it.
- **C17, more (owner):** the mic worked well in the early tests (the old tool bar), so this is a regression. Now: the mic strip can't be set in place ("fix"), and tapping the mic again doesn't stop the recording. "That tool itself is not working." Compare with the live app (main), where it worked: likely one of the new tap or focus changes (tapSelect.ts and penGuard.ts Pencil cancels, the C10 typing pause, keyboardPolicy.ts) swallows the strip's input.
- **C18 confirmed (owner):** while writing in a box, the 8 resize dots still show. Typing must show the thin border only (C11).
- **C19 (owner, re-test of item 5):**
  - Double and triple taps still work only sometimes. "Relaxed" tap speed felt best.
  - In the middle of a word: the first tap places the cursor, then a double tap often fails, and a pop-up flashes. At word ends and corners it works.
  - The owner wants a bigger tap radius: a second tap slightly off, but on the same word, still counts.
  - Manager's guess: iPadOS treats a tap on the caret as "show the edit menu".
  - Fix (manager's picks): default tap speed Relaxed (700 ms); a second or third tap counts within 24 px or on the same word; a tap on or near the caret never loses the multi-tap, and no edit menu flashes. Tests: 50 runs mid-word at 0–20 px offsets, all select. Builder: `slice/c19-taps` (Fable).
- **C20 (owner):** Duplicate box gives a copy of a different size (the text is the same). A duplicate must keep everything: width, height, fill, border, padding, font and paper settings, lock state and fields. It is only placed 10 mm lower and to the right (src/paper/boxService.ts ~254, clampBox).
- **Re-test results (owner, 13:14):** pass: Delete box; one selected box at a time; resizing doesn't type into the text. Everything else passes apart from the open bugs (C17–C21).
- **C21 (owner, two screenshots): box move and resize on the iPad are broken in practice.**
  1. Dragging a box (≡) up into space that is visibly free is refused (it snaps back; "Box moved" shows).
  2. Resizing isn't smooth: it shakes, and the pink guide line keeps popping in and out (the snap flips on and off).
  3. Just hovering the Pencil over a dot (no touch) starts resizing and the box shrinks. Resizing must start only on a real touch (pen hover sends pointermove with no buttons pressed).
  4. Making a box smaller shakes badly; with the Pencil the owner couldn't do it at all.
  - Fix: moves and resizes follow the finger or Pencil smoothly (one update per frame, no layout jumps). The guide line and snap have a dead zone (snap within 6 px, release only past 12 px). Hover never resizes or moves. A box can be moved into any free space it fits in, up or down. Shrinking works down to the text height with the Pencil.
  - Tests: real Pencil drags with hover moves before the touch; the box size never changes on hover; size changes are monotonic during a steady drag (no shake); move up into a gap is accepted.
- **Merged into build/next (16 Nov, afternoon):** C17 mic strip, C18 no dots while typing (strip text), C20 duplicate keeps size (`slice/c17-mic` 1a25f221; review fixes done). Chromium: 43/43 mic, duplicate and box specs. /duplicateBox/ added to ipad-webkit. Still open: C19 (Fable, slice/c19-taps), C21 (Opus, slice/c21-resize). Owner chose A: the duplicate sits just below the original, 10 mm to the right.
- **C22 (owner, 14:15, screenshot): the update got stuck** on "Updating… the app restarts by itself" with the notice "Restarting into the new version…" (Settings › About this app, update level 2; last check 2:14:18 PM). Owner: "make sure that update doesn't get stuck ever."
  - Code (src/app/restartNow.ts): it waits up to 60 s for the new worker, then clears and reloads; nothing on screen shows progress, and if `location.reload()` doesn't take effect nothing tries again.
  - Fix (manager's picks):
    1. The worker wait drops to 15 s.
    2. After 5 s the notice shows a "Restart now" button (saves first, then reloads).
    3. A watchdog: if the page is still there 4 s after a reload was asked for, it reloads again with a fresh address; after a second miss it shows "Couldn't restart. Tap to try again" (never silent).
    4. If the new version still isn't ready after the restart, the app opens normally on the old version and tries again next time: an update never blocks the app.
  - Tests: fake worker that never activates; reload ignored once and twice; notes typed during the wait are saved.
- **Re-test (owner, 14:27–14:28, two screenshots):**
  - Mic strip: **pass**.
  - **C18 still fails:** writing in a box with the Pencil (Scribble) shows the cursor together with the dashed frame, the dots and the ⠿/+ beside the box. Scribble text arrives as input events with no keydown or pointerdown on the text, so "typing" never starts. Fix: any text input into a box (beforeinput or input, including Scribble and dictation) counts as typing.
  - **C20 more:** the duplicate appeared to the right of the original in the same row (owner chose A, below), and it showed no frame, so you can't see which box is the copy. Fix: the copy goes below the original as chosen, and it is selected (frame and dots) right after Duplicate.
  - **C21 more:** the middle side handles (pill shapes) don't resize. This goes to the C21 builder.
  - Grey Pencil ink stayed inside the box next to "Was artok" (screenshot 2). Check: is it Scribble writing that wasn't turned into text and was kept as ink (C4 says never keep scribble strokes as ink inside a text box)?

## Re-test list (17 Nov 2026), build/next 00431173 (same app as the preview, 59533e16)

Reload the test page; preset "Up to Phase 2B"; Pencil.

1. **C18:** write in a box with the Pencil (Scribble): thin border only, no dots, no ⠿/+ while writing. No grey ink left in the box.
2. **C19:** in the middle of a word: tap once (cursor), then double tap: the word is selected; triple tap: the line. A second tap slightly off on the same word still counts. No edit menu flashes. Default tap speed is Relaxed 700 ms (Settings › Try new features › Tap speed to try others; tell us which one to keep).
3. **C20:** Duplicate a box: the copy goes below, same size and look, and it is selected (frame and dots).
4. **C21:** move a box up into free space: it stays. Resize with the Pencil, bigger and smaller, also with the middle side handles: smooth, no shaking, guide line steady. Hover the Pencil over a dot without touching: nothing changes. Note: boxes can now sit side by side, but the page layout dialog still stacks them; say if that is OK.
5. **C22:** when an update shows, "Restart now" appears after about 5 s and restarts; it never gets stuck. Offline: the app still opens.
6. **PR-3:** with the cursor in the page title, start writing or a lasso on the page: the page does not jump to the top.

## Re-test findings (owner, 17 Nov)

- **C23:** the box's ⋯ menu shows no Delete option.
- **C24:** Scribble with the cursor in the middle of a word: scribbling over the whole word changes only one or two letters on one side of the cursor.
- **C23 (two screenshots):** the box ⋯ menu (Box style, Copy, Cut, Duplicate box, Colour, Layout, …) is a long scrolling list; Delete is hidden at its end. The menu also crosses the page frame; it must stay inside the frame's side.
- **C25 (screenshot, page ⋯ menu in the sidebar):** a white scroll bar is drawn on top of the open menu (also next to the box menu). Menus must sit above every scroll bar.
- **C26:** "Tap here to keep writing" (and the "Enter text or type '/'" line) inside a box should go away once the box is in use.
- **C27:** a new box is far too big by default (owner could not see why it would not move: it fills the space). It should be small, like Goodnotes; owner sends a Goodnotes screenshot. Waits for that picture (no build without a picture).
- Owner: "Fix this and make sure there is no bug left. Recheck till Phase 2B." → a bug sweep of everything up to Phase 2B after these fixes.
- **C27 (owner, 17 Nov, reference picture docs/design/refs/c27-new-box-one-line.png):** a new box is one line tall and spans the whole line (like a Notion block); it grows downward only as text is written. Not bigger by default. The owner's picture is the approved reference.

## Bug sweep to Phase 2B (owner ask 17 Nov), found so far

- S1: a selected box shows two ⋯ buttons (on the box bar and beside the ≡ tab), each opening a different menu ("Box actions" vs the old Box style/Copy/Cut list). One box, one ⋯, one menu (TB-08 "the same ⋯ as every other box").
- S2: the page's first box opens the old (pre-v2) menu from its ⋯ even with textbox.v2 on.
- S3 (check): a box at the right edge squeezed so its text wraps one letter per line (TB-10). Being checked in the C23 takeover.
- S4: textBoxFree "one tap makes a small box" fails (72 px vs < 60); replaced by C27's one-line full-width rule, so the C27 slice owns that test.
- S3 confirmed (C23 takeover): a box made near the sheet's right edge comes out ~21 px wide, so its text wraps one letter per line (breaks TB-10). C27 slice (new box = full line width) should remove the cause; re-check after C27.
- S5: with the sidebar page ⋯ menu open, the row's help tip ("this row's actions…") still shows, peeking out behind the card. Tips hide while a menu is open.
- S6: textTool:156 "Type here" hint test red on slice/c23-menus base (C26/C27 area); C27 owns it.
- C23/C25/C26 merged into build/next 17 Nov (Opus takeover a8008553, reviewed on screenshots).
- **P1 (owner, 17 Nov): the app feels laggy and sluggish on the iPad, e.g. switching tabs.** Measure first (iPad-like CPU throttle, WebKit): page tabs Notes/Summary/Review, switching pages in the sidebar, main sections (Home/Library/Notebooks/Review), tool switching, opening menus and cards, typing. Find the causes, fix the biggest ones, show before/after numbers. Opus owns it, after C27 is merged.
- **C28 (owner, 17 Nov 14:28, older build): free space on the page cannot take a box.** Under the first box and to the left of a column of boxes there is empty paper, but a box cannot be moved (or pasted) there. Past rule C21: a box can be moved into any free space it fits in. In the 2B sweep (Opus): rebuild the layout, drag and paste into the free space with Pencil and finger, fix what fails. C27 (first box one line tall) frees the space under the first box.
- **C29 (owner, 17 Nov 14:24): no "Type here" in new boxes.** Only the first box of an empty page has the hint, gone once writing starts (owner-decisions.md "Box size and hints"). In the 2B sweep.
- **C30 (owner, 17 Nov 14:30): first tap in a box: cursor when near the text, box selected when in its empty part** (Goodnotes). Details and the owner's answers: owner-decisions.md "First tap in a box". In the 2B sweep.
- **C31 (owner, 17 Nov): typing in a box, then touching its ≡ tab (to move it) suddenly makes the box bigger.** A box keeps its size and shape unless it is resized on purpose (dots). Check every way into the ≡ tab: from typing, from selected, Pencil and finger, tap and drag, short and long text, a box made narrower by hand. In the 2B sweep.
- **C32 (owner, 17 Nov): the middle side handles (top, bottom, left, right) often do not resize the box, or get stuck.** They must always resize in their own direction (top/bottom: taller or shorter; left/right: wider or narrower), smoothly, with Pencil and finger, never below the text. Related: C21, TB-21, PENDING TB23-DIV. In the 2B sweep.
- **C33 (owner, 18 Nov, build 0B239D6): the first box of an empty page is tall (about 3 lines), not one line.** owner-decisions.md "Box size and hints": the first box is one line tall when empty and grows as you write. C27 missed the first box (or a later fix brought the height back). For a Sonnet builder; merged after the owner's re-test ends.
- **C34 (owner, 18 Nov, build 0B239D6): a tap near the first box's border (empty part, empty page) still gives the cursor.** C30/C30b: a tap in the empty part selects the box, the first box too. C30b kept the cursor on an empty page; the owner expects the box to be selected. A tap on or near the first line still gives the cursor.
- **Re-test 18 Nov (build 0419f87, iPad sideways), bug 1: the tool row vanishes after deleting a box.** Made a text box, typed, deleted the box: the whole tool row (Text, Pen, …) disappeared; the Text tool stays active (the cursor shows "+ box"). Picture: docs/plans/retest-18nov/bug1-toolrow-gone.png. Logged; fixed after the owner's test ends.
  - Bug 1 details (owner): it was the page's FIRST box (no other box); deleted with the new bar's 🗑, and earlier with the ≡ hold menu → Delete: same result. The tool row stays gone until a tap makes a new box ("+ box"), then it returns. Picture: retest-18nov/bug1-after-delete.png.
- **Bug 2: a reload turns the 2B test off.** After reloading, Settings › Test a phase › 2B had to be switched on again by hand (breaks "phase under test ON by default", PREVIEW_PHASE). Maybe linked to bug 1's state.
- **Bug 3: the new box after deleting has a style the owner did not pick:** a green fill with a dashed border (a style used once before). Picture: retest-18nov/bug3-green-new-box.png. Check "Use for new boxes" / the remembered box style.
  - Bug 2 details (owner): it happens on a plain reload of a normal page too (nothing deleted): the 2B test and "all those settings" go back to the start. A bug of its own, not caused by bug 1.
  - Bug 3: closed. The owner had ticked "Use for new boxes" on that style; working as designed.
  - Bug 1 cause found by the owner: selecting ANY box hides the whole top tool row; deleting the box leaves that state. Picture: retest-18nov/bug1-cause-select-hides-row.png.
  - Bug 2 facts: the owner uses the preview as a Home Screen app and is signed in.
  - Bug 2 time (owner): reloaded on purpose at 07:07 IST Wed 18 Nov (01:37 UTC), Home Screen app, signed in: 2B off again.
  - Bug 2 (owner): same in plain Safari, so not the Home Screen app.
- **Bug 4: a new page's first box is about 3 lines tall while typing, not one line; the empty space under the text "does not make sense"; every box should have the same text size and spacing.** Picture: retest-18nov/bug4-first-box-tall.png. Note: the hint shows "Enter text or type '/' for commands" (the old v2-OFF hint, not "Type, or tap anywhere…"), so 2B may have been off after a reload (bug 2). To be rechecked with 2B on.
  - Bug 4 recheck (owner, 7:20 IST): with Settings › Test a phase › 2B switched ON, a new page still shows no "Type, or tap anywhere" line (bug4-2b-on-no-hint.png) and a tap makes the tall box with the old hint "Enter text or type '/'" (bug4-2b-on-tall-box.png). So textbox.v2 is not really active even with 2B on: tied to bug 2.
  - Owner rule (equal boxes): by default the first box and every new box are the same: one line tall, the same padding around the text, the same text size; they differ only when a setting or "Use for new boxes" changes them.
- **Bug 5: in the first box, with the caret after the words, a tap in the box's empty part (lower right, marked red) acts like Enter:** a new line appears with the caret on it, instead of selecting the box (C30/C34). Only the first box. Picture: retest-18nov/bug5-empty-tap-new-line.png. The look is the v2-off one again (bug 2); recheck with v2 really on.
- **3-step check (owner, 7:58 IST, build with d7797ac8):** (1) reload keeps 2B on: PASS. (3) selecting/deleting keeps the tool row: PASS. (2) FAIL: a new page still shows the old hint and tall box, and a selected box shows the OLD box bar (Paste ▾, Copy, Cut, Duplicate, Turn into, Colour, Delete, More), not the new one bar. So textbox.v2 is still OFF on the owner's iPad although 2B stays on. Pictures: retest-18nov/check2-old-hint.png, check2-old-bar.png.
  - Owner wish: treat the first box as a plain text box like any other (same format, colours, shape); its only difference is the "Type here" hint that goes when typing starts; if the hint causes trouble, drop it.
  - Owner's Settings (8:06 IST): New text box ON (retest-18nov/settings-textbox-v2-on.png), yet the old look shows. Clue: an Apple Pencil Pro was connected at 7:58; the new bar showed at 7:04. Suspect Pencil mode takes old paths. Sonnet on slice/pencil-mode-v2.
- **Tests A/B (owner, 8:15 IST):** NOT Pencil-specific. In Pencil mode with a finger, and in Touch mode, with and without the Pencil: only the page's FIRST box is wrong. It is ~3 lines tall when selected (testAB-1), and with the caret shows BlockNote's "Enter text or type '/' for commands" (testAB-2). New boxes made below it are right (one line, the new bar, testAB-3/4). Owner's guess: the old "/" command hint in the first box causes it.
- **Bug 6: empty new boxes do not vanish when the next tap makes another box.** Tap top box, tap below (new box), tap below again (new box), tap back on the top box: two empty boxes stay (testAB-4). Rule (18 Nov): an empty new box vanishes at once when the user taps away.
- **3-step check 2 (owner, 13:22 IST, build 56F1CF1 = build/next 4693c6f3, sideways, new page in a notebook):** step 3 PASS (no empty boxes left; bug 6 fixed). Steps 1 and 2 FAIL:
  - **F1 (step 1):** the empty first box, once tapped, shows no "Type, or tap anywhere…" line (check3-1). To confirm with the owner: hint missing, or something else.
  - **F2 (look):** the first box's bar sits over the page tabs (Notes, Summary, Review) (check3-1). Rule: the bar never covers words; above has no room, so it goes below or into free space.
  - **F3 (step 2):** a tap in the first box's empty part (right side, near the border, marked red) puts the caret there, and iOS shows its own bars: Paste/Select/Select All/AutoFill/Format (check3-3), or a small ", ⊖" bar (check3-2, on a hold or a second tap). A double tap there selects the word or line (check3-4). Expected (C30/C34): the box is selected (dots), no caret, no iOS bar.
  - **F4:** in a taller first box (text plus a heading), a tap near the bottom-right corner, inside the box, shows the Text tool's "+ box" pointer instead of selecting the box (check3-5). Inside the box (border included) always means this box.
  - F1 confirmed: the hint was missing. F3 with the Pencil: the iOS bar on the FIRST tap. F3 with a finger: tap 1 selects the box (good), tap 2 gives the caret (good), tap 3 while the caret shows (fast or slow) brings the iOS bar (check3-6). Rule: a tap in the empty part never shows the iOS bar.
- **F5 (owner, 14:30 IST): circling a word with the Pencil (Text tool) selects it; the owner likes that. But Apple's selection shows:** Apple's purple handles (the line with two dots) and Apple's bar (Paste, Select, Select All, AutoFill, Format) (f5-1). Expected: our own selection look and our own strip (f5-2 shows our strip; f5-3 the word marked our way). Page: an older page with a Q/A card in a box. Next task after F1–F4 (same root: stop iOS's own selection UI inside notes).
  - F5 owner answer: only Apple's Paste/Select bar goes (Apple's handles may stay). After a circle-select, OUR selection strip shows in its place.
- **F6 (owner, 14:33 IST): circling a date with symbols ("2026-11-02") with the Pencil does not select it; other words far away get selected instead ("one real", one line up and to the right).** Repeated several times, same result (f6-circle-date-wrong-words.png). First check whether the circle is our gesture or Apple Scribble; then make a circle select exactly the words inside it, symbols included. Next task with F5.
