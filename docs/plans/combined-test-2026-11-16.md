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
