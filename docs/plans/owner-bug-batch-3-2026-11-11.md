# Owner bug batch 3 (11 Nov 2026) — NOTED ONLY, run all together when owner says "go"

Already running before the notes-only rule: (a) Pencil double-tap erases a word + grace period; (b) repeated sign-in on all devices (after updates AND after closing/reopening).

1. Box drag handle (⠿ / ⋯) too small: hard to tap and drag. Make it bigger (at least a 44 pt touch area).
2. Text tool makes stray boxes: while a box is being dragged or dropped, a tap elsewhere creates a new empty box (noise). No new box during drag or drop, and none just after it.
3. GoodNotes rule: drag and drop first; the box becomes selectable only after it is dropped.
4. Tapping on an existing box with the Text tool must edit that box (caret inside), never create a new box on top of it. The tap area is the whole box frame, not just the text.

Owner answers: a tap on empty space with the Text tool makes a new box, but not during a drag or right after a drop. The handle (⠿) and ⋯ show only on the selected box.

5. Layout is hard to find (hidden in box ⋯ › Layout). Add a Layout button to the main toolbar (Text tab), opening the layout choices (Two columns, Six boxes, Layout Assist).
6. The top text block (the first one, "On") has no ⠿ handle and no ⋯ menu, unlike the other boxes. Every box, the first included, must have both when selected.
   - Owner: the Layout button goes on the MAIN toolbar. Also add Layout inside the Text tool's own box settings (box style etc.).
7. Layout Assist preview is useless (owner: "no purpose"): it's a static picture and you can't drag in it, so you can't see where a box will land. Rework into a live, full-page preview where you drag and drop boxes freely, Apple-style (Home Screen jiggle mode, Pages/Keynote: others move aside live). Questions to the owner pending.
   - Owner decisions for 7:
     - Edit on the page itself: the page zooms out slightly, boxes wiggle (iPad Home Screen style), Done to finish.
     - While dragging, the other boxes slide aside live.
     - Keep the ready-made layouts as a quick strip at the top: tap one, then fine-tune by dragging.
     - Show the current page only. Scroll to another page and it is laid out only when you open it (lazy, cheaper).
     - Add "Apply this layout to all pages in the notebook".
8. Layout dialog was confusing: the owner tried to drag inside it and didn't know dragging only works after Done. In the new on-page mode (item 7), say it plainly: a short coach line "This is how your page will look. Drag any box to move it, pull an edge to resize. Tap Done when happy." Every layout preset shows a live result straight away.
9. Four-way resize: the box has handles on all 4 sides (left, right, top, bottom), not just left and right.
10. Boxes in the top row collide with the Notes/Summary/Review tab bar: their ⠿ and ⋯ sit on its border and you can't see them fully. Root fix: a reserved top margin (safe zone) below the tab bar that no box, handle or menu can enter, applied in one place so it stops coming back.
   - Owner answers for 9:
     - 8 handles: 4 sides plus 4 corners, each a round, easy-to-grab circle (GoodNotes style). Replaces the confusing 6-dot handling for resize.
     - Minimum size = the space its text and pictures need. A box can never be made shorter or narrower than its content, so text size never changes. No scroll-inside.
     - (Idea parked: shrinking below that scales the text and pictures, with a warning.)
11. The bottom toast ("Layout changed · Undo") sits behind or blurred under the iPad keyboard bar and can't be read. Toasts must sit above the keyboard and the keyboard bar, never under them.
12. Too many toasts and warnings. Give the owner a tick list of every toast or warning (keep or remove); do whatever they tick.
   - Tick-list artifact made with all 145 toasts (my suggestion: keep errors and how-to-fix messages, remove 46 plain "done" messages). Waiting for the owner's pasted choices.
13. Page scroll bar: a TAP on the track (owner tapped near the bottom) moves the thumb only partway, not to the tapped spot. A tap on the track must jump straight there (thumb centred under the finger or Pencil). Dragging the thumb should also follow exactly.
   - Owner (11 Nov): "you decide, too much noise." Decision: remove the 46 suggested "done" toasts (list in the tick-list artifact https://claude.ai/artifact/11Kjcc535Ng5CkpME4E3tu, default ticks). Also cut low-value info toasts where the result is visible on screen. Rule from now on: a toast only for errors, how-to-fix hints, or an action that can't be seen (with Undo for destructive actions like delete). Show at most one at a time, never over the keyboard.
