# Pencil tools — best practice brief (2026-11-07)

Scope: how top iPad note apps handle lasso, accidental tiny strokes, ruler, zoom window, pencil-vs-finger on text, and web constraints. Goal: pick the best approach for our PWA (iPadOS Safari, Pointer Events only, no PencilKit).

**Source legend:** [S] = seen in a source this session (date = when accessed, 2026-11-07, unless the page gave one). [U] = unverified: from general product knowledge or a single forum/user post. Several official help pages (GoodNotes support) returned HTTP 403 to fetching, so only search snippets were read.

Sources

- S1 GoodNotes support, Lasso Tool — https://support.goodnotes.com/hc/en-us/articles/7353695644175 (snippet only)
- S2 GoodNotes support, "Included in selection" filter — https://support.goodnotes.com/hc/en-us/articles/360000629656
- S3 GoodNotes support, Ruler — https://support.goodnotes.com/hc/en-us/articles/8254946748687 (snippet)
- S4 GoodNotes feedback, "turn off ruler angle snapping (135°)" — https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes-apple/suggestions/48306005
- S5 GoodNotes support, Zoom Window — https://support.goodnotes.com/hc/en-us/articles/7353756826383 (403; title only)
- S6 GoodNotes feedback, auto-advance / zoom box requests — https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes/suggestions/40668082 and .../44989567
- S7 Gavan Watson blog, Notability zoom auto-advance — https://gavan.ca/technology/my-app-of-choice-hand-written-notes-and-the-ipad/ (old, ~2011)
- S8 MyScript Nebo help, pen gestures — https://help.myscript.com/nebo/edit-content/pen-gestures-and-interactions
- S9 MyScript Nebo support, basic interactions / double-tap — https://app-support.myscript.com/support/solutions/articles/16000140406 , .../16000085944
- S10 Apple dev forums, "Safari iPadOS14 missing PointerEvents with Scribble" — https://developer.apple.com/forums/thread/662874 ; WebKit bug 217430 (marked fixed) — https://bugs.webkit.org/show_bug.cgi?id=217430
- S11 Apple dev forums, Pencil Pro pointer sampling — https://developer.apple.com/forums/thread/776468 ; 240 Hz / no getCoalescedEvents — https://developer.apple.com/forums/thread/689375
- S12 tldraw blog "A touchy subject" (pen blocks finger events) — https://tldraw.dev/blog/a-touchy-subject
- S13 DEV.to, Scribble interfering with canvas — https://dev.to/skyjinxx/ipados-scribble-interfering-with-apple-pencil-canvas-drawing-in-web-browsers-3ba7
- S14 Q&A, disabling Scribble for web annotation — https://yomotherboard.com/question/how-can-i-disable-apples-scribble-feature-for-a-web-annotation-tool/
- S15 Adobe Fresco community, ruler snaps 2°→0° — https://community.adobe.com/t5/fresco-discussions/how-to-rotate-the-ruler-1-degrees-it-snaps-from-2-to-0-degrees-when-rotating-with-two-fingers/td-p/12418685

---

## 1. Lasso

What apps do

- GoodNotes 6: lasso selects handwriting, images, text boxes, sticky notes [S1]. A per-type filter ("Included in selection": Handwriting / Images / Text boxes...) [S2]. Freehand or rectangle mode [S1]. Handles: resize corners + rotate control; menu actions depend on type: cut, copy, duplicate, delete, arrange, recolor, convert (handwriting), crop/share (images) [S1]. Tap outside to commit [S1].
- Hit-test: GoodNotes/Notability select a stroke when a large share of it is inside the loop, not just touched [U]. Apple Notes (PencilKit) selects strokes mostly inside the loop [U]. Nebo selects by recognised word/block [S8/U].
- Moving: all apps drag from anywhere inside the selection bounds (not only on ink) [U, consistent across apps].
- Text under ink: in GoodNotes, typed text is a separate text-box object; lasso moves the box, it does not select characters inside it [U].

Recommended for our app

- Selects: ink strokes + images/text boxes on the ink layer only. Never the BlockNote text underneath (lasso is an ink tool; text stays editable by finger).
- Hit rule: stroke is selected if **>= 60% of its sample points** are inside the polygon (point-in-polygon, even-odd). Fully-enclosed is too strict for rough loops; "touched" grabs too much. Close the loop automatically from last point to first.
- Bounds box with 8 resize handles (corner = keep aspect) + 1 rotate handle 24 px above top-centre; snap rotation to 0/90/180/270 within **±5°**. Handles at least **44 px** touch target (Apple HIG).
- Drag anywhere inside the bounds box moves; outside tap clears. Floating menu above the box: Cut, Copy, Duplicate, Delete, Colour, Add to Summary (existing Phase M item).
- Text under the selection must not react: the overlay owns the pointer (see 6).

## 2. Tiny accidental strokes (taps, double-taps)

What apps do

- No app documents its thresholds [U]. Observed behaviour: a single pencil tap in GoodNotes/Notability leaves a dot (deliberate dots for "i", periods must survive) [U]. Apple Pencil double-tap (on the barrel, Pencil 2/Pro) is a hardware gesture, not a screen tap, so it never makes a dot [U]. Screen double-tap with a finger usually zooms or is ignored [U].
- Common web/ink-library practice: drop a stroke if path length < ~2–3 px AND duration < ~100 ms _only when_ it is part of a tap sequence; tldraw treats moves under a few px as a "click" not a drag [S12/U].

Recommended for our app

- Pen: always keep dots (render a round dot). Exception: if a **second pen-down comes within 300 ms and 10 px** of a stroke that was **< 3 px long and < 150 ms**, treat both as a double-tap: remove the first dot, do not draw the second, fire the double-tap action.
- Finger (when finger-drawing is off): never ink. Finger taps go to the text/UI.
- Drop any stroke with **< 2 sample points and 0 px length** only if pointercancel fired (Scribble/system stole it).

## 3. Ruler

What apps do

- GoodNotes: two fingers on the ruler rotate it; strokes along either edge snap to the edge; works with pen, highlighter, pencil; "Set angle" option [S3]. Snaps near 45° multiples (a user asked to turn the 135° snap off) [S4]. Degree readout: unclear [U].
- Apple Notes/PencilKit ruler: one-finger drag moves, two-finger twist rotates, shows the angle in degrees in the centre, snaps at 0/45/90 [U, widely known]. Adobe Fresco snaps small angles to 0 (2°→0°) [S15].
- Dismiss: tap the ruler tool again [S3/U].

Recommended for our app

- One-finger drag = move; two-finger twist = rotate (angle from the two touch points). Pen never moves the ruler.
- Snap to every **15°** (always to 0/45/90) within **±2°**; show a live degree pill "37°" in the ruler's centre while rotating, integer degrees.
- Edge snap: if pen-down is within **24 px** of an edge (perpendicular distance), project every point onto that edge line; keep along-edge motion only. Further than 24 px = normal ink.
- Ruler size: ~**80 px** tall, length = longest screen side; tick marks every 1 cm (CSS px ≈ 37.8/cm).
- Dismiss: toolbar toggle; also close when leaving the page. No auto-hide.

## 4. Zoom Window / magnifier

What apps do

- GoodNotes and Notability: a pad at the bottom of the screen (~1/3 of screen height) shows a magnified copy of a target box on the page; writing in the pad inks the target box [S5/S6/S7]. Auto-advance: when you write near the right end of the pad, the target box jumps right; at the right margin it wraps to the next line at the left margin [S6/S7]. Margins are user-adjustable lines on the page [S6/U]. Users ask for free resize and an off switch for auto-advance, so both matter [S6].
- Zoom level adjustable (~2x–5x) by pinching the pad or a slider [U]. Erase and undo inside the pad act on the page as normal [U].

Recommended for our app

- Pad: full width, **30% of viewport height** default, drag the top edge to resize between **20% and 50%**; zoom **2.5x default** (range 1.5–4x), pinch on the pad to change.
- Target box: outlined rectangle on the page, aspect equal to the pad, drag with finger to move.
- Auto-advance: when the pen lifts with its last point in the **right 20%** of the pad, slide the box right by **60%** of its width; if that passes the right margin (default **5% inset**), wrap to left margin and one box-height minus **10%** overlap down. Toggle on/off; arrow buttons for manual move.
- Erase/undo: pad uses the same current tool (eraser works in the pad); undo is the global stack (one stroke = one step). Pad is just a different input view.

## 5. Pencil vs finger on text

What apps do

- Notability: typed text and ink share a page; finger taps text to place the cursor, pencil writes ink over it [U]. GoodNotes: text lives in text boxes; with the text tool you tap a box to edit; with pen tool, pencil inks over boxes [S1/U].
- Nebo: finger double-tap on handwriting converts it to text; double-tap a text block to edit; long-press a word selects it [S8/S9]. Pen gestures (scratch-out, strike) edit [S8].
- OneNote iPad: "Draw with touch" off means finger selects/types, pen inks; double-tap word / triple-tap paragraph with finger are standard iOS text gestures [U].

Recommended for our app

- In ink mode: **pen = ink only, finger = text** (cursor, double-tap = word, triple-tap = paragraph, the native iOS behaviour inside BlockNote). Pen never selects text.
- In text mode (no ink tool active): pen and finger both behave as normal text input (Scribble allowed there).
- Pencil barrel double-tap: not exposed to the web; don't plan for it [U].

## 6. Web-specific constraints (iPadOS Safari)

Findings

- Scribble can swallow pen `pointerdown` even with `touch-action: none` [S10/S14]. WebKit 217430 is marked fixed but reports continue [S10/S13]. Cited workaround: non-passive `touchstart`/`touchmove` listener that calls `preventDefault()` on the drawing surface [S10/S13].
- No `getCoalescedEvents()` in Safari (reported) and pointermove may be sampled lower than touchmove on Pencil Pro [S11]. Use `desynchronized: true` canvas context for latency [S11].
- While the pen touches the screen, iPadOS may stop sending finger events to the page; scrolling is a native layer and can still happen [S12].
- `user-select:none; -webkit-user-select:none; -webkit-touch-callout:none` reduce text selection/callouts but do not stop Scribble alone [S14].

Recommended for our app

- Ink overlay element: `touch-action: none`, `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none`, and a non-passive `touchstart` + `touchmove` listener calling `preventDefault()` **only when the touch is from the pen** (`touch.touchType === 'stylus'`) so finger scrolling still works.
- On `pointerdown` with `pointerType === 'pen'`: `setPointerCapture(e.pointerId)`, start stroke. Fingers (`'touch'`) pass through to the text (overlay uses `pointer-events` routing: hit-test overlay only for pen; easiest is overlay listens, and for touch re-dispatches nothing and lets the native scroll happen via `touch-action: pan-y` on a finger path) [U: needs device test].
- While a stroke or lasso is active, add a class on the editor root that sets `user-select: none` and blur the text editor, so text beneath never gets selected; remove on pointerup/pointercancel.
- Handle `pointercancel` as "end stroke, keep it if > 2 points" (Scribble/system steal).
- Read `pressure` (pen only), ignore `tiltX/Y` for now; read both pointermove and (fallback) touchmove coordinates if Pencil Pro sampling looks coarse [S11].
- Test checklist on a real iPad: Scribble on vs off; rapid taps; pen + palm; zoom pad; ruler twist with pen resting.
