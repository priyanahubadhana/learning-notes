# Text box v2 (slice 2, flag `textbox.v2`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Sources: build-master-plan §1 ("Text box v2: reuse or restart?"), §3.3 row 2; PENDING (owner decisions 11 Nov); [owner-bug-batch-3](../archive/plans/owner-bug-batch-3-2026-11-11.md) items 1–10; [text-tool-plan](../archive/plans/text-tool-plan.md); [layout-assist-plan](../archive/plans/layout-assist-plan.md); [paper-page](paper-page.md); Box card in `docs/mockups/toolbar-v8/` (design system: `design-study.md` §3).

## Purpose

In plain words: a text box is a frame on the paper that holds your writing. Today it mostly works, but tapping, dragging and selecting it feel shaky (the cursor jumps, a Pencil double-tap does nothing, a drag lets other things react, the border is faint, the handle is small). This slice keeps everything that stores and arranges boxes (it is tested and safe) and rebuilds only the part your finger and Pencil touch, on the new shared foundation. Old pages open exactly as before.

- **Keep (unchanged, with their tests):** `src/paper/boxService.ts`, `grid.ts`, `boxes.ts`, `boxState.ts`, `guides.ts`, `layoutPlan.ts`, `paginate.ts`, `src/core/boxStyle.ts`. No data change, no Dexie version.
- **Rebuild:** `src/paper/BoxFrame.tsx`, `BoxBar.tsx`, `BoxStylePopover.tsx` (replaced by the Box card), `boxHandles.ts`, `activeBox.ts`, and the pointer code in `src/paper/PaperFrame.tsx` (pinch, hover, grab/drag/drop, resize, Lasso-on-paper, text-pen, tap-paper, gap-tap).
- **Foundation used:** `src/app/input/eventRouter.ts` (0c), `src/app/input/gestureRouter.ts` (0d), `src/app/selection/store.ts` (0e), `src/app/overlay/` (0f), `src/app/flags.ts` + `src/settings/level.ts` (0a). These do not exist on `main` yet (12 Nov); slice 2 starts only after 0c–0f and 0g step 1 are merged into `build/next`.

## How it works

### Shared parts used (plan 3.2 row 0g)

| Part                                                              | Used for                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Tokens                                                            | accent, ink, paper, radius, motion values below                       |
| Card / ▾ frame, panel width 376 px                                | the Box card (Box · Layout sections)                                  |
| Object bar                                                        | the box's one mini-bar (Cut, Copy, Duplicate, Delete, ⋯)              |
| Drag with drop-line and ▲▼                                        | box move (live preview, landing outline) and ▲▼ "move up / down" in ⋯ |
| Arrange sheet                                                     | Layout section and the on-page layout mode (Layouts strip, Done)      |
| ✕ field                                                           | preset rename field in the Box card                                   |
| Toast queue (0g step 2, falls back to today's toast until merged) | Undo after delete, layout change                                      |

No private pop-up, listener or z-index: all through the overlay manager and routers (lint count must go down).

### Sizes, spacing, motion

- Selected border: solid **1.5 px accent**, plus a 1 px paper-coloured halo outside it (visible on light, dark and sepia paper). Corner and side dots: 10 px visual, white fill, 1.5 px accent ring, **44 pt hit target** centred on the edge, drawn outside the text area.
- Grab tab (≡): 36 × 20 px visual pill centred on the top edge, 8 px above the border, 44 × 44 pt target. The ⋯ button sits at the top-right corner, same style. On a box narrower than 120 px both sit side by side above the left edge (kept from `BoxFrame.tsx:116`).
- Safe top zone: 12 px below the page tab bar; no box, handle or bar may enter it (B3-10).
- Box card: panel frame 376 px, radius 20, padding 12, opens **beside** the box on the side with more room, 8 px gap, no arrow (design-study §3.3). On phone: bottom sheet.
- Motion: grab feedback = tab and box scale 1 → 1.02 and shadow lifts in 120 ms; drag preview moves on every frame (one transform per frame); drop = glide to the landing spot 200 ms cubic-bezier(.2,.8,.2,1); others slide aside 200 ms; card open 200 ms / close 130 ms; changed control glows 700 ms. Reduced motion: all instant, states still change.
- Hold before a resize or move commits: 120 ms with the grow feedback; a move under 4 px (dead-zone) is a tap.

### When I do X → Y (one e2e test each)

Beginner and Professional unless marked. **Pro** lines name their unlock switch from `docs/mockups/pro-features.md`.

**Select and type (surface group T1)**

- TB-01 When I tap a box with the Text tool → if the box is not selected yet, this first tap selects the whole box (the TB-02 look) and nothing else; a tap in a box that is already selected puts the caret exactly where I tapped (± 1 character), and it does not jump on the next render or keystroke. A Pencil tap never opens the keyboard; a finger tap that places the caret opens it. (owner, 14 Nov)
- TB-02 When I tap a box with Select or another non-writing tool → the whole box is selected: solid 1.5 px accent border with 8 dots; no outline or highlight around a single line or block inside. This is the one selection look everywhere, whatever tool or tap selected the box. (owner, 14 Nov)
- TB-03 When I select a box → any text, ink, picture or table-cell selection elsewhere clears (selection store, one kind at a time).
- TB-04 When I double-tap a word in a selected box, with the Pencil or a finger → that word is selected; a triple-tap selects the line, four taps the paragraph (`src/editor/tapSelect.ts`). In a box that is not selected, the first tap only selects the box (TB-01) and the count starts with the next tap: there is no shortcut that selects a word in an unselected box. (owner, 14 Nov)
- TB-05 When I tap the padding or an empty corner inside a box with the Text tool → it counts as a tap on that box: the first tap selects it (TB-01), the next puts the caret at the nearest line; no new box is made on top (B3-4). (owner, 14 Nov)
- TB-06 When I tap empty paper with the Text tool → a new box with "Type here" and the caret appears there; not if a drag is in progress or ended under 400 ms ago (B3-2). A tap beside or below an existing box makes the new box in its own row under that box, never beside it; columns are made by dragging a box beside another (TB-13). With the Pencil the keyboard stays down; with a finger it opens. (owner, 14 Nov)
- TB-07 When I tap empty paper with any tool while a box is selected → the box deselects; nothing else happens.
- TB-08 When the page's first (default) box is selected → it shows the same ≡ tab and ⋯ as every other box (B3-6).
- TB-09 When I press Delete or Backspace with a box selected and no caret → the box is deleted and a toast offers Undo.
- TB-10 When I type in a new box → it stays one line wide until it nears the right margin; it never wraps letter by letter; its minimum width is its longest word.

**Move (T2)**

- TB-11 When I hold the ≡ tab for 120 ms → the box lifts (scale 1.02, shadow); a drag then moves it. The ≡ tab is the only way to drag a box: a drag on the border, the text or a dot never moves it. (owner, 14 Nov)
- TB-12 While a box is dragged → no tap, toolbar, menu, keyboard, ink, Lasso or new box reacts anywhere in the app until the drop (gesture router drag lock).
- TB-13 While a box is dragged → other boxes slide aside live and an accent outline marks the landing cell; on blank paper thin smart guides show and snap gently.
- TB-14 When I drop a box → it glides into the landing spot in 200 ms; one Undo puts it back; it becomes tappable only after the glide (B3-3). No ✓ to confirm: the drop is final and Undo is the way back. (owner, 14 Nov)
- TB-15 When I drop a box on blank paper → it stays a free box at the dropped left edge with its width kept; the default box goes back to a full-width row.
- TB-16 When I hold a dragged box near the top or bottom screen edge → the page scrolls and the box follows the paper.
- TB-17 When I press Esc during a drag → the box returns; nothing is saved.
- TB-18 When the iPad drops the "finger lifted" event during a drag → the drag ends by itself within 4 s, the box lands at the last preview, no tool stays stuck.
- TB-19 When I choose ⋯ › Move up or Move down → the box swaps place with its neighbour (the ▲▼ alternative to dragging).

**Resize (T3)**

- TB-20 When I press near an edge → the nearest handle wins; side and corner zones never overlap.
- TB-21 When I drag a side or corner dot → the box resizes live; east/west move the column divider beside it; it never gets smaller than its text and pictures need.
- TB-22 When I drag a handle with the Pencil → it never switches to ink mid-drag, and the page does not scroll.
- TB-23 When I drag a column divider between boxes → both boxes resize live (GridDividers).

**Bar and Box card (T4)**

- TB-24 When a box is selected → one Object bar shows above it: Cut, Copy, Duplicate, Delete, Box style (opens the card), ⋯. Only one minimise in the whole bar.
- TB-25 When I tap Box style → the Box card opens beside the box (never over it), with sections Box · Layout. When the card is taller than the room it has (for example under a wide box), the card scrolls inside itself; the page behind stays still. (owner, 14 Nov)
- TB-26 Box section, Beginner → look tiles (Plain, Sticky, Callout, own presets) and six round fill swatches; picking one changes the box at once and the card's chosen tile pops.
- TB-27 **Pro `tb.textBox`** Box section adds Border colour and width, Corners, Padding, Shadow, Full width, "Save as my look", rename / delete my looks, "Use for new boxes", Reset.
- TB-28 Layout section → Two columns, Six boxes, Layout Assist; **Pro `tb.layouts`** adds own layouts and "Apply to all pages in the notebook".
- TB-29 When I change any box setting → the changed control glows once (700 ms); one Undo reverses exactly that change.
- TB-30 When I tap ⋯ → a list card: Lock in place, Duplicate, Move up, Move down, Group / Ungroup (when 2+ picked), Delete.
- TB-31 When Copy fails (clipboard blocked) → a toast "Couldn't copy. Try again." (today `paper.box.copyFailed`).

**Several boxes, layout mode (T5)**

- TB-32 When I Lasso on empty paper → the boxes inside are picked with their ink; one group pill shows Group / Ungroup and the count.
- TB-33 When I drag one of several picked boxes → all move together; one Undo.
- TB-34 When I open Layout Assist → the page zooms out slightly, boxes wiggle, a coach line says "This is how your page will look. Drag any box to move it, pull an edge to resize. Tap Done when happy."; the Layouts strip sits on top; Done ends it.
- TB-35 When I tap a layout in the strip → the page shows the result at once; Undo returns the old layout.

**Pencil and paper (T6)**

- TB-36 When I write with the Pencil on empty paper → a box with lines is made under the stroke and the stroke goes into its ink.
- TB-37 When I draw a circle round a digit or a line, arrow, circle or rectangle with the Text tool → it becomes a circled number or a clean shape, with one Undo; handwriting nearby cancels the shape.
- TB-38 When I pinch with two fingers → zoom follows (100–400 %, springs back from below fit); the Pencil never zooms.
- TB-39 When I hover the Pencil or mouse over empty paper → a quiet "+ box" tag shows.
- TB-40 On a phone, when I tap the gap under a box with the Text tool → a new box is added right after it.
- TB-41 When I write with the Pencil inside a box → it depends on the tool: with the Text tool the handwriting becomes typed text (Scribble); with the Pen tool it stays a drawing in that box. The Pen tool never converts. (owner, 14 Nov)

**Hints (T1)**

- TB-42 On an empty page → one writing hint only ("Type, or tap anywhere…"); "Tap here to keep writing" waits until the page has something to continue; the hint goes the moment I type or draw. Two hints never show together. (owner, 14 Nov; picture `docs/mockups/textbox-2b/states.html` panel 7)

### States

- **Empty page:** one default box with the empty-page hint; TB-06 works anywhere below.
- **Error:** a save that fails keeps the box as it is on screen and shows the shared save notice; a broken stored box is repaired by `boxRepair` (kept).
- **Offline:** everything works; nothing here needs the network.
- **Phone (< 480 px column):** fit width; boxes stack in reading order; no drag between columns (▲▼ in ⋯ instead); the Box card is a bottom sheet.
- **Dark and sepia:** border and dots keep 3:1 contrast against the paper (halo); screenshots in all three.
- **Locked box:** shows a small lock on the tab; move and resize are off; tap still edits text.
- **Read-only (signed-out gate):** selection only, no bar actions.

### Pencil / touch rules

- Every handle, tab, dot and bar button: 44 pt target or more.
- No accidental typing: a tap that selects a box (TB-01, TB-02) never opens the keyboard. A Pencil tap never opens it either, also when it places the caret (the owner writes with the Pencil); the keyboard opens only for a finger tap that places the caret (TB-01, TB-05, TB-06). (owner, 14 Nov)
- No accidental selecting: a palm on the screen is ignored (`palmGuard`); a stray touch during a Pencil stroke is ignored.
- No accidental drawing: once a handle or tab is grabbed the gesture router owns the pointer until lift; ink never starts mid-drag.
- Pointer capture and `touch-action: none` on handles and tab only (not on the text).

## Nothing lost (inventory)

| Today's feature                                           | Where now (file:line)                                     | Where in v2                       |
| --------------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| Box bar: Cut, Copy, Duplicate, Delete, Box style, ⋯       | `src/paper/BoxBar.tsx:23, 76-85`                          | Object bar (TB-24)                |
| Copy-failed message                                       | `src/paper/BoxBar.tsx:45`                                 | TB-31                             |
| Box style: styles, my looks, rename, delete               | `src/paper/BoxStylePopover.tsx:213-271`                   | Box card › Box (TB-26, TB-27)     |
| Fill, border, width, corners, padding, shadow, full width | `src/paper/BoxStylePopover.tsx:293-340`                   | Box card › Box, Pro `tb.textBox`  |
| Use for new boxes, Reset                                  | `src/paper/BoxStylePopover.tsx:357, 364`                  | Box card (TB-27)                  |
| Move strips and grip                                      | `src/paper/BoxFrame.tsx:269, 293-331`                     | ≡ tab (TB-11)                     |
| 8 resize handles, 44 pt outside the edge                  | `src/paper/BoxFrame.tsx:419-433`, `boxHandles.ts:2-13`    | T3 (TB-20, TB-21)                 |
| Small-box tab placement                                   | `src/paper/BoxFrame.tsx:116`                              | kept (Sizes)                      |
| New empty box "Type here" dashed frame                    | `src/paper/BoxFrame.tsx:119, 323`                         | TB-06                             |
| Tap frame edits this box (B3-4)                           | `src/paper/BoxFrame.tsx:218`                              | TB-05                             |
| Active box / bar owner, editors list                      | `src/paper/activeBox.ts:11-55`                            | selection store (TB-03)           |
| Caret at end helper                                       | `src/paper/boxHandles.ts:25`                              | kept as a helper in the new frame |
| Pinch / wheel zoom, rubber zoom                           | `src/paper/PaperFrame.tsx:344-442`                        | gesture router pinch (TB-38)      |
| Hover "+ box" tag                                         | `src/paper/PaperFrame.tsx:559-588`                        | TB-39                             |
| Box states idle / selected / typing                       | `src/paper/PaperFrame.tsx:597-646` (`boxState.ts` kept)   | selection store drives `boxState` |
| Group select with whole group                             | `src/paper/PaperFrame.tsx:648`                            | TB-32                             |
| Delete key removes selected box                           | `src/paper/PaperFrame.tsx:672`                            | TB-09                             |
| Drag with live preview, landing outline, one Undo         | `src/paper/PaperFrame.tsx:688-750`                        | TB-12–TB-14                       |
| Free box on blank paper; default box back to row          | `src/paper/PaperFrame.tsx:795-803`                        | TB-15                             |
| One update per frame                                      | `src/paper/PaperFrame.tsx:836-851`                        | kept                              |
| Smart guides and snap                                     | `src/paper/PaperFrame.tsx:866` (`guides.ts` kept)         | TB-13                             |
| Edge auto-scroll                                          | `src/paper/PaperFrame.tsx:910-913`                        | TB-16                             |
| Esc cancels drag                                          | `src/paper/PaperFrame.tsx:939-951`                        | TB-17                             |
| Drop planned from the lift                                | `src/paper/PaperFrame.tsx:954-964`                        | TB-14                             |
| Resize with content minimum                               | `src/paper/PaperFrame.tsx:993-1151`                       | TB-21                             |
| Lasso picks boxes on empty paper                          | `src/paper/PaperFrame.tsx:1178-1196`                      | TB-32                             |
| Text pen: circled numbers, clean shapes, hold             | `src/paper/PaperFrame.tsx:1234-1332`, `textPencil.ts`     | TB-37                             |
| Pencil on paper makes a box with ink                      | `src/paper/PaperFrame.tsx:1378-1462`, `penOnPaper.ts`     | TB-36                             |
| Tap paper makes a box, not during/after drag              | `src/paper/PaperFrame.tsx:1488-1490`                      | TB-06                             |
| Phone gap tap                                             | `src/paper/PaperFrame.tsx:1590-1592`                      | TB-40                             |
| Pencil in a box: Text tool = Scribble, Pen tool = ink     | `e2e/scribbleProbe.ts`, `src/paper/textPencil.ts`         | TB-41                             |
| Empty-page hint and "Tap here to keep writing"            | `src/paper/PaperFrame.tsx:1867`, `src/paper/hintPages.ts` | TB-42                             |
| Group pill (Group / Ungroup)                              | `src/paper/PaperFrame.tsx:2002-2011`                      | TB-32                             |
| Column dividers                                           | `src/paper/GridDividers.tsx:124`                          | TB-23                             |
| Layout dialog and on-page layout mode                     | `src/paper/LayoutDialog.tsx`, `layoutModeBus.ts`          | TB-34, TB-35                      |
| Box presets                                               | `src/paper/boxPresets.ts`                                 | TB-26                             |
| Wake a box on focus                                       | `src/paper/wakeBox.ts`                                    | kept (called by the new frame)    |

## Won't do

Layers, bring to front / send to back, hide/show, fold a box, a separate handwriting block inside a box (Scribble and Pen ink in a box stay, TB-41), recall card or Summary from a box, rotation (parked with layers; owner, 14 Nov), shrink below content to scale text (slice 14), overlapping boxes, a ✓ confirm after a drop (owner, 14 Nov: Undo instead), "tap beside a box = a box side by side" (saved in docs/IDEAS.md; owner, 14 Nov). No change to stored data.

## Build order (sub-slices, one commit each, behind `textbox.v2`)

| #   | Sub-slice (audit ids)                          | Files it owns                                                                               |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 2a  | T1 select and type (P14 part)                  | new `src/paper/v2/BoxFrameV2.tsx`, `src/paper/v2/boxSelection.ts` (selection store adapter) |
| 2b  | T2 move (P14 drag preview, guides)             | new `src/paper/v2/boxDrag.ts`; `PaperFrame.tsx` drag block behind the flag                  |
| 2c  | T3 resize and dividers (P14)                   | new `src/paper/v2/boxResize.ts`, `boxHandlesV2.ts`; `GridDividers.tsx` pointer code         |
| 2d  | T4 Object bar and Box card (P1 box card)       | new `src/paper/v2/BoxBarV2.tsx`, `BoxCard.tsx`                                              |
| 2e  | T5 several boxes, layout mode (P12, P14 group) | new `src/paper/v2/boxGroup.tsx`; `LayoutDialog.tsx` pointer code                            |
| 2f  | T6 Pencil and paper (P13 pinch, hover)         | `PaperFrame.tsx` pinch / hover / text-pen / pen-on-paper behind the flag                    |
| 2g  | Clean-up                                       | flag-ON path removes the old `activeBox.ts` use; old files stay for flag OFF until release  |

Only one sub-slice touches `PaperFrame.tsx` at a time (2b, then 2e, then 2f).

## Security check

No new input from outside; preset names go through the existing text limits (80 chars, trimmed). No new storage. Nothing here talks to the network.

## Tests

- Unit: kept engine tests unchanged and green; new tests for `boxDrag` (drop from lift, Esc, lost lift within 4 s), `boxResize` (nearest handle, content minimum), `boxSelection` (one kind at a time).
- e2e (Chromium and `ipad-webkit`): one per line TB-01 to TB-42 (Scribble itself, TB-41, needs the real Pencil: the e2e proves the tool rule, the owner checks the handwriting); fault test for dropped `pointerup`; Pencil double-tap timing test.
- Screenshots: Beginner / Professional × light / dark / sepia × iPad landscape / portrait / phone / PC, box selected, dragging, Box card open.
- "Nothing lost" probe: every row of the inventory table.
- Flag OFF: today's screenshots pixel for pixel. Old pages (fixtures from `boxRepair.test.ts`) open unchanged.
- Accessibility: tab, dots and bar buttons have labels; keyboard: arrows move a selected box by one grid step, Enter edits.

## Owner iPad check (3 steps)

1. Tap a box: one clear border, 8 dots, no line outlines. Tap its text again with the Text tool: the caret lands where you tapped. Pencil double-tap a word: it is selected. (owner, 14 Nov)
2. Hold the ≡ tab and drag the box across the page while tapping elsewhere with a finger: nothing else reacts; drop it: it glides in; Undo puts it back.
3. Pull a corner dot with the Pencil: the box resizes, never below its text, never draws ink. Open Box style: the card sits beside the box.

## Decisions to review

1. **Double-tap = word, triple = line, four = paragraph: settled (owner, 14 Nov).** The first tap on an unselected box only selects the box (TB-01, TB-04).
2. **No ✓ confirm after a drop: settled (owner, 14 Nov).** The drop is final, with Undo.
3. **Free box on blank paper** (TB-15) kept from v2 code although the grid rule says "rows"; dropping no feature.
4. **"Move up / Move down" in ⋯** added as the ▲▼ alternative required by the shared drag part.
5. **Delete with a box selected shows a toast with Undo** although the toast rule removes plain "done" toasts: it is destructive, so the rule allows it.
6. Foundation folders (`src/app/input/`, `selection/`, `overlay/`) are not on `main` yet; the slice is blocked until slice 0 parts 0c–0g step 1 are merged.
7. New code goes in `src/paper/v2/` so flag OFF keeps today's files untouched; they are removed after release.
