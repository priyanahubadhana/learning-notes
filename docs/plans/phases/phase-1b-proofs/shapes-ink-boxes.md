# Proof C: shapes, ink and boxes (read-only, 26 Nov 2026)

> One of the four reports behind [the proofs for the notebook spec](README.md) (26 Nov 2026). Read-only; made by a helper; the main claims were checked against the code by Fable.

Code read: `C:\Users\pc\Downloads\learning-notes`, branch `main` at `fcc433f3`. The last fetched `origin/main` (`e2aa199a`) is 3 commits ahead, but those commits touch only `docs/`; `src/` and `e2e/` are the same (checked with `git diff --stat HEAD origin/main -- src e2e`: empty). Nothing was run. Nothing was changed.

Words used: a **box** is a text box on the sheet. The **first box** is the page's own box (id `main`). A **stroke** is one pen mark. A **pad** is the clear layer over a box that catches the pen.

---

## The earlier findings, checked

| Earlier finding                                                                            | Result                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A stroke is stored with the block it was drawn over, as an offset from that block's corner | **Confirmed**, with one addition: the offset is in units of the **box's width in px**, for x and for y (`src/ink/anchor.ts:56-65`, `src/ink/layout.ts:98,113`). So a box that gets narrower also makes its ink smaller.                                            |
| A shape from the Shapes tool is a pen stroke                                               | **Confirmed.** Shapes sets the Pen to draw a clean shape (`src/app/tools/v8/cards/shapes/shapesModel.ts:5-31`). The stroke gets `shape: 'line' \| 'rect' \| 'ellipse' \| 'triangle' \| 'arrow'` (`src/core/inkTypes.ts:26,63`, `src/ink/controller.ts:1299-1303`). |
| A box is `PaperBox`                                                                        | **Confirmed** (`src/core/types.ts:240-272`). Boxes are stored as a list on the page record (`Page.boxes`). Their lines are blocks that carry `boxId` (`src/paper/boxService.ts:33-36`).                                                                            |
| A group holds boxes only                                                                   | **Confirmed** (`src/paper/boxService.ts:228-244`: a group is a `group` id on two or more boxes).                                                                                                                                                                   |
| Boxes are kept from lying on each other                                                    | **Confirmed.** Not by a check: boxes have no free place. Each box's place comes from `Page.rows` (rows of 1 to 3 columns, 1 or 2 boxes per column) through `layoutRows` (`src/paper/grid.ts:7-13,255-261`).                                                        |

---

## Point 1. NB-80, NB-86: what a shape is in the data, and the two ways to store a shape that holds text

### What exists

- **A drawn shape is one `Stroke`** (`src/core/inkTypes.ts:48-82`): `id`, `at`, `kind` (`ink`, `highlight` or `tape`), `style` (pen, width, colour, opacity …), `pts` (6 numbers per point), `bw` (box width when drawn), `shape?`, `fill?`, `flat?`, `label?`, `drawn?`.
- **Where it is stored:** in an `InkChunk` row (table `inkChunks`): up to 60 strokes of one layer over one block (`inkTypes.ts:106-115`). `blockId` is the line it belongs to; `null` means "the page". `fb` keeps the last place of the block, for when the block is deleted.
- **How it is drawn:** Shapes picks `drawAs` (`shapesModel.ts:21-31`). On the press, the Pen picks the line under the point (`controller.ts:1388`). While dragging, `shapeFromDrag` makes the clean outline from the two corners (`controller.ts:1544-1559`, `src/ink/shapes.ts:196-260`). A box shape is 5 points; an oval is 73 points; a triangle is 4 points (top middle, bottom right, bottom left, back to the top) (`shapes.ts:238-259`).
- **Each box has its own editor and its own ink layer.** One BlockNote editor per box (`src/editor/PageEditor.tsx:276-286`). Each box loads only the ink of its own lines (`src/ink/InkSurface.tsx:175-179`, `PageEditor.tsx:283-285`). The first box also takes ink with `blockId: null` and ink of lines that no longer exist (`PageEditor.tsx:285`).

### Way A: a kind of box inside a box

What the code makes **hard**:

- **No nesting in the data.** `Page.boxes` is a flat list. `PaperBox` has no "parent" field (`types.ts:240-272`). Every box gets its place from the rows (`grid.ts:255-261`). A box that is in no row gets **a full-width row of its own at the end of the page** (`grid.ts:177-205`). So a new box-in-a-box would be moved under the last row unless the grid learns to skip it.
- **Sweeps remove empty boxes.** An empty box goes away when the caret leaves, when another tool is picked, or on a press on the paper (`src/paper/usePaperBoxes.tsx:155-253`, `boxService.ts:587-617`). An empty box on the same spot as another box is removed when the page opens (`boxService.ts:521-579`). NB-93 (a shape stays when empty) needs an exception in all of these.
- **One box is one full editor plus one ink layer** (`PageEditor.tsx:276-286`, `InkSurface.tsx:175-199`). Many small shapes would mean many editors on one page. The speed of that is not known.
- **Pen ink would split.** A stroke over the shape would belong to the shape's own editor, and its ink layer stops at the shape's edge (see point 3). An arrow from one shape to the next could not be one stroke.

What the code makes **easy**: tapping, the caret, typing, a frame, a style and the Action bar for a box all exist already.

### Way B: a stroke that carries text

What the code makes **hard**:

- **There is no text field on a stroke** (`inkTypes.ts:48-82`). Text would be drawn on the ink canvas, or placed over it as a DOM element. The canvas cannot take a caret.
- **Text-tool taps never reach ink.** With the Text tool the pad lets every tap through (`controller.ts:841-847`: the pad takes taps only for Pen, Highlighter, Eraser and Lasso). A tap in the middle of a shape lands on the line of text under it. New hit testing is needed.
- **The Lasso takes a stroke only by its outline**, not by its inside (`controller.ts:2184-2201`: `segHit` on the points). A tap in the middle of an empty Box shape picks nothing.
- **Sync** is the whole chunk: the newer edit wins (`src/sync/tables.ts:6,33`). Text typed in a shape on one device could be lost if the other device changed another stroke in the same chunk.

What the code makes **easy**: moving, sizing with the corners kept (`controller.ts:286-287,3058-3073`), colour, copy, delete, the eraser and Undo of ink all exist already. A shape already moves with its box (it is inside the box's ink layer).

### Way C, found in the code (not in the spec): a new block in the box's text

The mind map is already a block inside the editor, with its node text in plain `<input>` fields (`src/editor/mindMap/mindMapBlock.tsx:1-19`, `src/editor/mindMap/MindMapView.tsx:336,485`). A "shape" or "diagram" block could work the same way. It lives in the box and moves with it. It syncs as a block, and a clash keeps the losing text in History (`tables.ts:7-8,20`). Text taps reach it, because it is DOM. **Limit:** a block takes its own lines in the text flow. It does not lie over existing words at any spot.

### The second editor inside a box

- **Not checked:** a full BlockNote editor nested inside a block. No such case exists in the app.
- **Precedent that exists:** the mind map's plain inputs inside a block (`MindMapView.tsx:485`).

### Undo

- Ink has its own Undo per box (`InkSurface.tsx:185`, `controller.ts:3430-3436`).
- Text Undo belongs to the box's editor (`InkSurface.tsx:205-208`).
- Making a box together with its ink is grouped into one step (`src/paper/PaperFrame.tsx:2007-2014`, `historyGroup('Shape', …)`).
- A shape that holds text would mix two or three of these Undo lists. **Not checked:** how they join.

### Size (estimate)

- Way A: **large.** Nesting in the grid, exceptions in the sweeps and the repair, the speed of many editors, and the ink split.
- Way B: **large.** Text on or over the canvas, a new hit test for the Text tool, a caret, growth, and sync.
- Way C: **medium to large.** A new block like the mind map. But NB-80 asks for a shape drawn anywhere inside the box, and that does not fit a block.

### Needs the running app or an iPad

- How a page with 20 or more boxes behaves on the iPad (for Way A).
- How the iPad's own Scribble acts on an input inside a block (for Way C).

---

## Point 2. NB-80, NB-01, NB-94: eraser, Lasso, group, bars, dots

### Eraser modes (`src/ink/eraser.ts:5-16`, `src/app/tools/main/inkSettings.ts:288-348`)

| Mode                     | Plain ink                                                                                 | A shape (box, oval, triangle, line, arrow)                                                          | Tape                             |
| ------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------- |
| `precise`                | removes exactly what it touched; the stroke splits into pieces (`eraser.ts:152-203`)      | the shape becomes plain ink and is cut where touched; the rest stays (`eraser.ts:141-151`, `73-82`) | whole tape (`eraser.ts:137-139`) |
| `standard` (the default) | the same, reaching 1.35 times further; tiny leftovers dropped (`eraser.ts:18-20,140,190`) | as precise                                                                                          | whole tape                       |
| `stroke`                 | the whole stroke (`eraser.ts:133-135`)                                                    | the whole shape                                                                                     | whole tape                       |

The eraser can also take text highlights and typed text (`inkSettings.ts:295-300,340-348`; default: highlights and pen on, text off). Each box's eraser works only on that box's ink (each box has its own ink document: `InkSurface.tsx:175-184`).

### Lasso

- **It takes a shape**, because a shape is a stroke: a tap on its outline picks it (`controller.ts:2323-2339`, `2184-2201`). **Not checked:** whether a loop takes a stroke by its points or by its box.
- The Lasso on the paper picks **boxes**, by each box's middle inside the loop. A loop that catches one member of a group takes the whole group (`PaperFrame.tsx:1855-1871`).

### Group

A group holds boxes only (`boxService.ts:228-244`). Ink and shapes have no group of their own. They move with a grouped box because they belong to its lines. A stroke can carry a `label` ("heart diagram"), and several strokes can share one; it is a name for Search, not a group (`inkTypes.ts:72-76`).

### What the bars offer for a selected stroke or shape

- **Selection bar (new tool bar, `toolbar.v8`)** while only drawings are picked with the Lasso (`InkSurface.tsx:450-451`): copy, cut, duplicate, delete, paste, deselect, convert, screenshot, make card, add to Summary, rotate 90° (`InkSurface.tsx:551-593`). It also has colour tiles, move steps and size steps (`src/app/tools/v8/SelectionBarV8.tsx:236-245,329-382`).
- **The older drawing menu:** copy, cut, duplicate, convert, colour, delete, thickness, make card, Summary, label (`src/ink/lassoMenu.ts:10-21`, `InkSurface.tsx:876-939`).
- **By hand:** drag inside the selection to move it (`controller.ts:2341-2348`). Handles scale and rotate it (`InkSurface.tsx:812-856`).
- **The Action bar** (`BoxBarV2`) is for boxes only (`usePaperBoxes.tsx:597-618`). **Not checked:** whether it shows anything for a stroke.

### Resize dots

- **For ink, the dots belong to the selection, not to the shape:** 4 corner dots that keep the form, plus 2 top and bottom dots and 2 side dots (each pair only when the selection is tall or wide enough), plus one turn handle (`InkSurface.tsx:746-763,843-856`). They are the same for every shape.
- **No 3-dot triangle exists.** NB-94 (three dots for a triangle, four for the others) is **new work**.
- **A box has 8 dots** (`src/paper/boxHandles.ts:1-12`). Their 44 pt targets lie outside the edge (`src/paper/BoxFrame.tsx:469-500`), as NB-89 asks.

### Size (estimate)

- A shape-aware eraser rule (for example: the eraser takes the outline, never the text): **small**.
- NB-94 dots on a shape: **medium.** The triangle needs its own corner model. Today's scaling works on the box around the selection.

### Needs the running app

- Whether the new Selection bar's colour and size steps work on a shape.
- What a loop over two boxes and their ink picks.

---

## Point 3. NB-76, NB-87, NB-88, NB-75: what an arrow or a pen mark belongs to, and issues #74, #75 and #76

### What a mark belongs to today

| Where the mark starts                     | What it belongs to                                                                                       | Evidence                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| On a line of text in a box                | that line (block) of that box                                                                            | `controller.ts:1388`, `anchor.ts:73-83`                                            |
| Below the last line, still inside the box | the line just above it (the last line)                                                                   | `anchor.ts:67-72,80-82`                                                            |
| Across several lines                      | its top line (for "draw and hold" and the Lasso; the live stroke uses its first point)                   | `anchor.ts:122-143`, `controller.ts:1388`                                          |
| Between two boxes, or on the empty sheet  | **no box.** The page makes a new box with empty lines, then plays the same stroke into that box (rule 4) | `src/paper/penOnPaper.ts:1-6`, `PaperFrame.tsx:2050-2101`, `boxService.ts:411-436` |

### Does it move?

- **When the box moves:** yes. The ink layer sits inside the box (`controller.ts:493-498,1051-1124`).
- **When the box gets wider or narrower:** the ink **scales with the width**, in x and in y. The unit is the box's width in px (`layout.ts:98,113`, `anchor.ts:56-65`). The text reflows instead. So a mark can drift off the word it was on.
- **When a handle makes the box taller:** no change (only the frame's height changes, `BoxFrame.tsx:250-253`).
- **When the text above it grows:** yes. Its line moves down, and the ink is drawn at the line's new corner (`layout.ts:134-147`).
- **When lines are added below its line:** no. A mark drawn under the last line stays with that line, so new lines run under the mark.
- **When its line is deleted:** it goes to the next line that moves into the place (`anchor.ts:105-120`, `layout.ts:139-145`).

### On a shape inside a box

- **If shapes stay strokes (Way B):** the arrow and the shape each belong to the line under their own first point. When a shape grows, the arrow does not follow it. Nothing links an arrow's end to a shape.
- **If shapes are a block (Way C):** a mark over that block belongs to the block and moves with it (`layout.ts:67-97` measures every `.bn-block-content`). But it does **not** grow with the block. Only pictures scale their ink (`anchor.ts:38-53`, `layout.ts:79-93`).
- **If shapes are boxes (Way A):** a mark on the shape belongs to the shape's own editor and is cut at the shape's edge.

For NB-76 ("a shape that grows does not cover the arrow"), all three ways need **new work** that links an arrow's ends to shapes. Nothing like it exists.

### #74: an arrow drawn in a narrow gap between two boxes resizes the boxes

Found in the code (proven by reading; not yet by a test):

- Between two columns of a row there is a **column divider**. It is shown for **every tool** whenever the page can be edited (`PaperFrame.tsx:2467-2483`, `enabled={!!onGridChange}`). Nothing in it checks the tool (`src/paper/GridDividers.tsx:57-121,170-210`).
- Its hit area is 20 px wide with a mouse, and **44 px with a finger or the Pencil** (`GridDividers.tsx:178`, `w-5 … pointer-coarse:w-11`). It sits in the middle of the gap (`GridDividers.tsx:172,183-186`).
- On a press it stops the event and takes the pointer (`GridDividers.tsx:187-193`). A drag moves the divider (`GridDividers.tsx:76-92`).
- So on the tablet a 32 px gap is **wholly covered** by the divider. The arrow becomes a column resize, and nothing is drawn.
- **Fix size: small** (the divider gives way to the Pen, Highlighter and Shapes). The spec still needs a place for the arrow to go; see #75.

### #75: arrows between boxes are saved but never shown

Found in the code (likely; not proven):

1. A stroke on empty paper makes a new box through `addBoxWithLines`. It is called **without a row** (`PaperFrame.tsx:2103-2114`, `boxService.ts:415-421`, `boxService.ts:186-197`).
2. On a page with rows, a box in no row gets **a full-width row at the end of the page** (`boxService.ts:70-77`, `grid.ts:177-205`). So the new box is not where the arrow was drawn.
3. The stroke is then played into that box's pad at its **original screen spot** (`PaperFrame.tsx:2091-2100`, `penOnPaper.ts:53-74`). The pad measures the point from its own box (`controller.ts:1325-1328`), so the points fall far outside that box.
4. Each box's ink canvas is clipped to the box (`src/ink/render.ts:222-232`: `overflow: hidden`, `contain: strict`). The stroke is saved but drawn outside the visible part.

A second possible path: the new box holds only empty lines, and a sweep may remove it before its ink is saved (`usePaperBoxes.tsx:211-240`; the check for ink reads saved rows only, `boxService.ts:596-606`). Its ink would then belong to lines that are gone. The first box takes over such ink (`PageEditor.tsx:285`), but draws it only inside its own area. **Needs a trace** from the running app to tell which path the owner hit.

**Fix size:** placing the box at the drawn spot is **small to medium** (the Text-tool tap already does this with a free row, `boxService.ts:145-185`). Real arrows **between** boxes are **large**: no page-wide ink layer exists on the paper. Every box owns and clips its own ink.

### #76 and NB-88: ink that starts in a box is cut at its edge and hidden behind the text

- **Cut at the bottom edge:** on purpose, since #64 and #65. In a box, the stroke stops where it crosses the bottom border (`controller.ts:1330-1340`, `1484-1493`, `1548-1550`).
- **Cut at the sides:** the box's ink canvas is only as wide as the box (plus its padding, `controller.ts:1086-1090,1122-1123`), and it clips (`render.ts:229-231`). Points beyond it are saved but not shown.
- **Hidden behind the text:** **cannot be settled from the code.** The box's ink layer has `z-index: 5` (`controller.ts:470-481`). The stacking of the boxes and the words around it was not traced. It needs a check in the running app: which element sits on top at a point where ink and words meet.
- **Fix size: large**, for the same reason as #75: ink would need a layer above all the boxes.

### NB-75 (with the option off, Shapes does what it does today)

Today's behaviour is broken over gaps and on empty paper (#74, #75), and it clips at a box's edges (#76). So "what it does today" cannot be the target as written. It should read "what it does today, with #74, #75 and #76 fixed".

---

## Point 4. NB-74: issue #87 against the fix of #64

### The #64 fix

- `4ab91297` "fix #64: a box made taller by a handle is filled to its border by editor, ink and typing". It was merged in `e4b7139c` on 24 Nov (`e2e/c33c34-inkbox.spec.ts`, `src/ink/controller.ts`, `BoxFrame.tsx`, `PaperFrame.tsx`, `boxV2.css`).
- **Reworked the next night in `fce3b8e0`** (25 Nov 02:12): the editor no longer grows to fill the frame (the CSS was removed, `src/paper/v2/boxV2.css:142-148`). Only the **ink pad** and the **ink floor** reach the frame's border, through `fillHeight` (`controller.ts:1055-1066,1095,1336-1340`). A Text tap below the lines goes to the end of the text (`BoxFrame.tsx:256-269`).

### Why the owner's case can still fail

1. **The first box is left out.** `fillHeight` works only for boxes that are not the first (`controller.ts:1063`: `[data-paper-box]:not([data-paper-box="main"])`). The same is true of the resize watch (`controller.ts:572-575`) and the side padding (`controller.ts:1086-1090`). But the first box can be made taller by its own handles (`PaperFrame.tsx:2372-2392`, `3179`). In a first box made taller, the pad stays as tall as its text. **Drawing reaches only the text's lines.** Also, ink never makes the first box taller (`controller.ts:902-929`).
2. **Typing goes to the end of the text, by design.** A tap in the empty part calls `caretAtEnd`: the caret goes after the last letter (`boxHandles.ts:24-38`, `BoxFrame.tsx:261-268`). There are no lines down there to type in. So typing "reaches only the first line until Enter is pressed" **in every box**, first or not.
3. **The tests did not cover the case.** The #64 tests use a second box only (`c33c34-inkbox.spec.ts:165-183`), with the mouse. The typing test checks only that the box got the caret and the text (`c33c34-inkbox.spec.ts:275-290`), not where the caret went.

**Not checked:** whether the owner's box was the first box. Whether other ways of making a box taller (Layout presets, a group drag, the iPad handle) set a height the pad does not watch.

### Spec impact

NB-74 "the whole of the box can be … typed in at once, with no extra step" is **new behaviour**, not a fault fix. A tap low in the box must add empty lines down to the tap, or place the text there. Rule 4 already does something close for the Pen: it makes a box with empty lines under the stroke (`boxService.ts:411-436`).

### Size (estimate)

- Drawing in a taller first box: **small** (take out the first-box exception, then test the C33 and #65 rules again).
- Typing at the tapped line: **medium** (lines added on a tap, with one Undo, kept by the empty-line sweeps, and the box's height unchanged).

### Needs the iPad

Which box the owner used, and a trace of the pad's height after the resize.

---

## Point 5. Ink when the page is zoomed

### What exists

- **Where a point lands** = the pointer's screen position minus the box's screen position (`controller.ts:1325-1328`). It is saved in units of the box's width on screen (`layout.ts:62,98,113`, `anchor.ts:56-65`). So zoom scales the saved ink with the box.
- **The app's own zoom** (pinch with two fingers, Ctrl + wheel, the zoom buttons) is CSS zoom on the box (`PaperFrame.tsx:145-151,397-480,2686`). The ink layer measures that zoom and undoes it on itself, so its numbers stay in screen px (`controller.ts:1044-1050,1069-1124`).
- **The Pencil never zooms** (`PaperFrame.tsx:150`; test `e2e/tb2-pencil.spec.ts:349-361`).
- **Test that exists:** a stroke drawn at 100 %, then two clicks on Zoom in: the ink stays on its line (`e2e/inkScrollNative.spec.ts:87-143`).
- **No GitHub issue** mentions zoom (search "zoom", all states: none).

### What is missing, or a risk

- **No test draws while zoomed** and then checks the place at 100 %. **Not proven.**
- **Browser zoom on the PC** (Ctrl and +) was not traced.
- **Safari's own pinch** on the iPad (the visual viewport) was not traced. The pad lets the browser pinch while a finger may not draw (`controller.ts:850-852`).
- **Different screen widths:** the paper's width follows the column it sits in (`PaperFrame.tsx:244-262`). No code was found that sizes the text with the sheet (a search in `src/paper` found only fixed sizes for bars and cards). If the text keeps its size while the box gets narrower (iPad upright against sideways, or the PC), the lines wrap in new places, but the ink shrinks with the box. Marks would then drift off their words. The `drawn` snapshot ("View as drawn", `inkTypes.ts:77-81`) shows the team knew this could happen. **Not proven.**

### Marks written by an import

- They would follow the same rules: they belong to a block, with offsets in box widths.
- **Under the app's zoom** they should stay in place (text and box zoom together). **Not proven by a test.**
- **On another screen width** they may drift inside a paragraph (see above).
- Marks belong to a paragraph, not to a word. A mark meant for one word cannot be pinned to that word.

### Size (estimate)

A test for "draw while zoomed": **small.** If drift is real, anchoring to words: **large.**

### Needs the iPad and the PC

Draw at 160 % and look again at 100 %. Draw upright, then turn the iPad sideways. Draw at browser zoom 125 % on the PC.

---

## Point 6. NB-81, NB-95: how a box grows, and the ink below

### What exists

- **Height:** a box is as tall as its text, or as tall as its handle height `h`, whichever is more (`types.ts:253-254`; `minHeight` in `BoxFrame.tsx:225,251-253`). It grows **down only**.
- **Width:** a box in a column has a fixed width; its text wraps. A free box that is "as wide as its text" grows **to the right only**, up to `freeMaxW`, then wraps (`grid.ts:34-35,44-57`, `BoxFrame.tsx:243-249`).
- **The boxes below** move down: each row starts under the row above (`grid.ts:255-261`).
- **Nothing grows in both directions while keeping its form.** The only "keep the form" code is ink scaling from a corner dot (`controller.ts:286-287`, `InkSurface.tsx:746-750`), which is done by hand.

### Ink when a box grows

- Ink in **that box** below its last line stays with the last line. New lines run under it: the mark ends up over the new text.
- Ink in **another box below** moves with that box (its ink lives in its own box).
- There is no ink "on the sheet below a box": a stroke there makes a new box (rule 4, point 3).

### What is missing

- NB-81: a shape that grows both ways, keeps its form, keeps its text in the middle, goes back to its drawn size, and never gets smaller. **New work.**
- NB-95: the box grows to hold a shape that outgrew it. **New work.** Today a box grows only from its text height and its handle height.

### Size (estimate)

**Medium to large.** It depends on Way A, B or C. With Way C (a block), the box's height already follows its blocks.

### Needs the iPad

How fast a shape that grows feels while typing with the Pencil's Scribble.

---

## Findings that change or contradict a spec line

1. **NB-75** cannot mean "as today": today an arrow over a gap becomes a column resize (#74, `GridDividers.tsx:178,187-193`), and ink on empty paper lands in a new box at the end of the page (#75, `grid.ts:177-205`).
2. **NB-76 / NB-88:** each box owns and clips its own ink (`render.ts:229-231`, `InkSurface.tsx:175-179`). Ink across box edges, or between boxes, needs a page-wide ink layer. That is large, and it is not in the plan yet.
3. **NB-74** is partly new behaviour. Typing at a tapped lower line does not exist (`boxHandles.ts:24-38`). The drawing part fails in the first box because the #64 fix leaves it out (`controller.ts:1063`).
4. **NB-80 / NB-86, Way A** clashes with the grid (no nesting; a box in no row goes to the end) and with the empty-box sweeps (NB-93).
5. **Ink scales with box width** (`anchor.ts:56-65`). A shape made of DOM elements next to strokes made of ink would come apart when the box's width changes.
6. **NB-94:** today's dots belong to the selection (4 corners and 4 sides), the same for every shape. A 3-dot triangle is new.
7. **The import:** marks belong to a paragraph, not to a word, and may drift on another screen width. Not proven; needs the device test in point 5.
