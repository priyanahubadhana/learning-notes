# Toolbar: main bar, options pill and detail card

Security rules: [rules/security.md](../../rules/security.md). Check them before building. Plan: [redesign-2026-11.md](../plans/redesign-2026-11.md) (step 2). Research: [inspiration-apps.md](../research/inspiration-apps.md), [toolbar-ribbon.md](../research/toolbar-ribbon.md). The full ribbon and device modes keep their own specs: [toolbar-ribbon.md](toolbar-ribbon.md), [device-modes.md](device-modes.md).

## Purpose

One simple way to use every tool: tap a tool, see its few options, tap the active option again for the full settings. Same on iPad, phone and computer. The interaction model is the one the owner showed (tool, options pill, detail card with sub-pages); the look, icons (Lucide) and layout are our own.

## The main bar

- One solid, icon-only row at the top of the page view (44 px targets, strong contrast). Order: Undo, Redo (a separate small pill) | Text, Pen, Highlighter, Eraser, New line, Lasso, Insert, Read | extra pinned tools (control panel pin), then ⌨ Keyboard and ⋯.
- **The selected tool is the mode.** The Write · Draw · Read switch and all automatic switching are gone. `activeTool` (`src/app/tools/main/mainTools.ts`) is Text, Pen, Highlighter, Eraser, Lasso or Read; Insert opens its pill without being a mode; New line is a button. The old "set" (`activeSet`) only tells the ribbon which tab to open and Reading mode whether to start (`changeSet` keeps them in step).
- Phone: two rows (Undo/Redo and ⋯, then the tools, which scroll sideways if the screen is narrower than 360 px).
- **⋯ menu:** Edit bar first, then All tools (opens the existing ribbon), Search all features, Done, copy and paste items, Reset bar position (floating) and the full list of formatting actions.
- Placement (top, bottom, floating), size, auto-hide, the Show tool bar safety and the ribbon behave as in [toolbar-ribbon.md](toolbar-ribbon.md) and [device-modes.md](device-modes.md). The bar can never be lost.

## The options pill

- Tapping a tool opens a second, smaller pill with that tool's options (tap again to close; the tool stays selected). Insert has a pill too.
- **Moves:** drag the ⠿ grip. While dragging, four drop zones show; on release the pill snaps smoothly to the nearest edge (top, left, right or bottom; vertical on the sides). Arrow keys move it, Home resets. It moves with CSS transforms (`will-change`, `requestAnimationFrame`, pointer capture) and never changes the page layout while dragging. The place (edge and position along it) is saved per device (`toolbar.pillPlace`); Settings › Tool bar › Options pill position resets it.
- **Against the bar:** a pill on the same edge as the bar (the default) gets its own room in the bar's stack (`pillReserve`, `PillRoom`), so it never covers the first lines of the page; on other edges it floats over the page.
- **Pop-up rule:** it follows `usePopup` (closes on a tap outside, Esc, another pop-up, a page scroll, ✕). 📌 pins it open (saved per device); ✕ also unpins. Choosing an option does not close it (logged in DECISIONS).
- **Press and slide (Pencil friendly):** press and hold a tool for about 350 ms, the pill opens; slide onto an option (it gets `data-hot`) and let go to choose it without lifting. Letting go elsewhere chooses nothing. A short press is a tap.
- **Options:** Text: Style▾, B, I, U, text colour (▾ card), highlight colour (▾ card), list▾, align▾, ★ key point. Pen: type▾, 3 thicknesses, colours and ⊕. Highlighter: 3 thicknesses, colours and ⊕, settings ▾. Eraser: Precise, Standard, Whole stroke; 3 sizes; Erase highlights only. Lasso: free-hand or rectangle; filter ink, pictures, text. Insert: Table, Shape, Picture, Camera, File or PDF, Callout, Audio, Recall card, Tape, Magnifier, Ruler (Table, Shape, Camera, File, Audio, Tape, Magnifier and Ruler are marked "coming"; Picture, Callout and Recall card work). Read: Aa, Contents, Bookmarks and notes, Listen, Find, Exit.

## The detail card

Opens when the active option is tapped again, or its ▾. Rows with › open sub-pages; ‹ goes back; every card has a ✕. It sits beside the pill (below a top pill, above a bottom pill, beside a side pill), always inside the screen.

- **Text › Style:** Title, Heading 1, 2, 3, Body; Font ›; size (90 to 150 %); line height; Text-box style › (Plain, Quote, Callout, Code block); Strikethrough, Code, Link. Font, size and line height are device display settings applied as CSS variables only when changed (`textStyle.ts`). Title is the biggest heading, centred (no separate Title block exists).
- **Text › List / Alignment / colours:** bullets, numbers, checklist (toggle list says "coming"); left, centre, right, justify; every colour by name.
- **Pen:** a live preview stroke plus sliders for tip sharpness, pressure, stabilisation and (Fountain) flatness; › Pen settings (tilt, thickness by speed, reduce latency, draw and hold for a perfect shape); › Pen gestures (scribble to erase, circle to lasso); › Stroke (solid, dashed or dotted; exact thickness). Colour page with ⊕ (custom colours, newest first, at most 6).
- **Highlighter:** preview, colour, Snap to text lines, Draw behind ink, opacity, Highlight eraser (selects the Eraser limited to highlights), Save to notes.
- **Eraser and Lasso:** modes with a one-line explanation, sizes, switches, and the filter.
- **Read › Aa:** tabs Font, Layout, Themes, More, backed by the existing Reading settings.

## Ink: the engine (step 3)

The settings model (`inkSettings.ts`: every value clamped when read, saved per device) drives the engine in [ink.md](ink.md). New in step 3: Pen settings › Snap shapes, Fill shapes and Finger can draw (Automatic, Always, Never); a Layers row (with the layer count) on the Pen, Highlighter and Lasso cards, opening the Layers card (names, show or hide, lock, order, delete, which layer draws, paper behind the ink). The preview note is gone. Drawing a stroke does not close an open pill. The ribbon's Draw tools now work (pen types, Pen, Highlighter, Eraser, Lasso, colour, thickness, opacity, pressure, smoothing, tapered ends, the four papers, Only the Pencil draws, Ink layers); Shapes, Tape, Magnifier and Ruler are still "coming".

## Lasso selection menu

With the Lasso open: words or a picture selected give Copy, Cut, Duplicate, Delete, Colour, ★ Key point, Make card and Save to notes (keeps the words in the notebook's "Highlights" page). Selected drawings have their own box and menu (Duplicate, Colour, Copy as picture, Save as picture, Delete; move, resize and turn by the box and its handles), see [ink.md](ink.md). Move, Scale, Rotate and Screenshot are dimmed on words and say they work on drawings. Convert handwriting (beta) is still to come.

## New line

A tap adds a line and can be repeated. Press and hold (default 0.6 s) opens the extras (Heading, Checklist, Divider). Settings › Tool bar: hold, double-tap instead, or off; the hold time (0.4 to 1 s).

## Edit bar

⋯ › Edit bar…: tick, drag or use ↑ ↓ to show, hide and reorder the main-bar tools (at least one stays) and each pill's options; ribbon tabs; size, position, auto-hide; pinned tools; Reset. Saved per device. **Migration:** once, a custom Write list becomes the Text pill's buttons in the same order, the ink tools missing from the Draw list are hidden, buttons with no place stay on the bar as pinned tools (`migrate.ts`); the old lists are kept.

## The Pencil follows the tool (final rules, owner, real iPad)

- **Default tool:** Text on Computer and Touch; **Lasso** in Pencil mode. The finger pans and zooms under every tool; a finger tap on text places the caret with one tap outside Pencil mode.
- **Text:** a Pencil tap on a block with words marks it (outline, no caret, no keyboard); a second tap in it places the caret where tapped (a brief highlight shows where). An empty block or blank space takes the caret at once. Setting "Pencil: tap twice to start typing" (Auto = on in Pencil mode). No double-tap word select. Scribble is free; only a big scratch-out (20 or more characters) is refused or offered an Undo (penGuard). A Pencil tap asks for no keyboard (`inputmode="none"`) until a finger tap, a key or the ⌨ button.
- **Hold:** the Pencil resting still on text for 0.5 s (0.3 to 1.5 s in Settings › Advanced) places the caret there; moving while held extends a selection; lifted without moving, only the caret stays (the mini toolbar shows after a selection).
- **Lasso:** a tap marks a block, a second tap places the caret (no keyboard); a drag on text selects (penSelect, whole blocks over pictures); a blank line takes no caret; double-tap selects a word, triple-tap a line (12 px tolerance, nearest-text fallback), then the **mini toolbar** (colour, size, style, B, I, align, list, highlight, link, cut, copy, ⋯ paste, Make card, ★, Save to notes) with two handles replaces the iOS callout.
- **Pen, Highlighter, Eraser:** the page is not focused and stylus touches are cancelled (the Pencil draws in step 3, a finger scrolls). **Read:** taps only; the Pencil can scroll.
- A selection that starts on text lets pictures and embeds pass the pointer (`ln-selgesture`) and never starts a drag or drop; a long press that starts on a picture keeps its menu and drag. Edge auto-scroll only while a selection is being extended.
- Settings › Advanced › Pencil writes text (Scribble) stays as an override. Settings › Tool bar › Pencil picks the Pen tool (off by default). Settings › Advanced › Pencil can scroll.

## Edge cases

- A saved list or value that is invalid reads as its default (`isMainList`, `isPillMap`, `isPillPlace`, ink field clamps).
- The pill is clamped into the visible screen and follows the keyboard; rotation re-places it.
- A tool that is "coming" can be tapped and says so; it is never hidden.

## Security check

Only device preferences are stored (tool lists, pill place, ink settings, hold times). Every stored value is validated on read. No data leaves the device. No deletes except what the user asks (Lasso Delete, with Undo).

## Tests

- Unit: `mainTools`, `pillPlace`, `inkSettings`, `migrate`, `newLineGesture`, `textOps`, `tapSelect` (tap counts, ranges, tolerant hit-testing, keyboard policy, edge scroll), `penGuard`, `lineActions`.
- Browser: `mainBar`, `inkPills`, `pillMove`, `editMainBar`, `newLineHold`, `mainBarLayout`, `penTools`, `pictureSelect` (Chromium and WebKit).
- Only a real iPad can confirm the Pencil, Scribble, keyboard and callout behaviour: see HANDOFF owner checks and LIMITATIONS.
