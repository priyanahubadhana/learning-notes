# Toolbar: main bar, options pill and detail card

Security rules: [rules/security.md](../../rules/security.md). Check them before building. Plan: [redesign-2026-11.md](../plans/redesign-2026-11.md) (step 2). Research: [inspiration-apps.md](../research/inspiration-apps.md), [toolbar-ribbon.md](../research/toolbar-ribbon.md). The full ribbon and device modes keep their own specs: [toolbar-ribbon.md](toolbar-ribbon.md), [device-modes.md](device-modes.md).

## Purpose

One simple way to use every tool: tap a tool, see its few options, tap the active option again for the full settings. Same on iPad, phone and computer. The interaction model is the one the owner showed (tool, options pill, detail card with sub-pages); the look, icons (Lucide) and layout are our own.

## The main bar

- One solid, icon-only row at the top of the page view (44 px targets, strong contrast). Order: Undo, Redo (a separate small pill) | Text, Pen, Highlighter, Eraser, New line, Lasso, Insert, Read | extra pinned tools (control panel pin), then ⌨ Keyboard and ⋯.
- **The selected tool is the mode.** The Write · Draw · Read switch and all automatic switching are gone. `activeTool` (`src/app/tools/main/mainTools.ts`) is Text, Pen, Highlighter, Eraser, Lasso or Read; Insert opens its pill without being a mode; New line is a button. The old "set" (`activeSet`) only tells the ribbon which tab to open and Reading mode whether to start (`changeSet` keeps them in step).
- Phone: two rows (Undo/Redo and ⋯, then the tools, which scroll sideways if the screen is narrower than 360 px).
- Undo and Redo are pinned at the left, outside the scrolling tools, in the main bar and in the full ribbon (the ribbon no longer lists them under Home). Test: e2e/pinnedHistory.spec.ts.
- **⋯ menu:** Edit bar first, then All tools (opens the existing ribbon), Search all features, Done, copy and paste items, Reset bar position (floating) and the full list of formatting actions.
- Placement (top, bottom, floating), size, auto-hide, the Show tool bar safety and the ribbon behave as in [toolbar-ribbon.md](toolbar-ribbon.md) and [device-modes.md](device-modes.md). The bar can never be lost.

## Bars that overflow (bug batch 1 item 49)

A row wider than its room (the ribbon, the context strip, the main bar, pills) scrolls sideways with a mouse too: edge chevrons (`ScrollFade`, `BarScroll`), the wheel scrolls it sideways, a thin scrollbar shows on hover, touch swipes natively. Test: e2e/ribbonScroll.spec.ts, barScroll.spec.ts.

## The options pill

- Tapping a tool opens a second, smaller pill with that tool's options (tap again to close; the tool stays selected). Insert has a pill too.
- **Moves:** drag the ⠿ grip. While dragging, four drop zones show; on release the pill snaps smoothly to the nearest edge (top, left, right or bottom; vertical on the sides). Arrow keys move it, Home resets. It moves with CSS transforms (`will-change`, `requestAnimationFrame`, pointer capture) and never changes the page layout while dragging. The place (edge and position along it) is saved per device (`toolbar.pillPlace`); Settings › Tool bar › Options pill position resets it.
- **Top gap (R8-1):** the page has a gap under the main bar, part of its top margin (`--page-top-gap`, `TOP_GAP` 62 px, set while the main bar is at the top), just tall enough for the options pill. A pill docked at the top sits in it. Scrolled down, or on the left, right or bottom edge, the pill floats over the page (draggable as before). Opening or closing a pill never moves the page.
- **Pop-up rule:** it follows `usePopup` (closes on a tap outside, Esc, another pop-up, a page scroll, ✕). 📌 pins it open (saved per device); ✕ also unpins. Choosing an option does not close it (logged in DECISIONS).
- **Press and slide (Pencil friendly):** press and hold a tool for about 350 ms, the pill opens; slide onto an option (it gets `data-hot`) and let go to choose it without lifting. Letting go elsewhere chooses nothing. A short press is a tap.
- **Options:** Text: Style▾, B, I, U, text colour (▾ card), highlight colour (▾ card), list▾, align▾, ★ key point. Pen: type▾, 3 thicknesses, colours and ⊕. Highlighter: 3 thicknesses, colours and ⊕, settings ▾. Eraser: Precise, Standard, Whole stroke; 3 sizes; Erase highlights only. Lasso: free-hand or rectangle; filter ink, pictures, text. Insert: Table, Shape, Picture, Camera, File or PDF, Callout, Audio, Recall card, Tape, Magnifier, Ruler (all of these work; the only tool still marked "coming" is Print and PDF in the File tab). Read: Aa, Contents, Bookmarks and notes, Listen, Find, Exit.

## The detail card

Opens when the active option is tapped again, or its ▾. Rows with › open sub-pages; ‹ goes back; every card has a ✕. It sits beside the pill (below a top pill, above a bottom pill, beside a side pill), always inside the screen.

- **Text › Style:** Title, Heading 1, 2, 3, Body; Font ›; size (90 to 150 %); line height; Text-box style › (Plain, Quote, Callout, Code block); Strikethrough, Code, Link. Font, size and line height are device display settings applied as CSS variables only when changed (`textStyle.ts`). Title is the biggest heading, centred (no separate Title block exists).
- **Text › List / Alignment / colours:** bullets, numbers, checklist, toggle list; left, centre, right, justify; every colour by name.
- **Pen:** a live preview stroke plus sliders for tip sharpness, pressure, stabilisation and (Fountain) flatness; › Pen settings (tilt, thickness by speed, reduce latency, draw and hold for a perfect shape); › Pen gestures (scribble to erase, circle to lasso); › Stroke (solid, dashed or dotted; exact thickness). Colour page with ⊕ (custom colours, newest first, at most 6).
- **Highlighter:** preview, colour, Snap to text lines, Draw behind ink, opacity, Highlight eraser (selects the Eraser limited to highlights), Save to notes.
- **Eraser and Lasso:** modes with a one-line explanation, sizes, switches, and the filter.
- **Read › Aa:** tabs Font, Layout, Themes, More, backed by the existing Reading settings.

## Ink: the engine (step 3)

The settings model (`inkSettings.ts`: every value clamped when read, saved per device) drives the engine in [ink.md](ink.md). New in step 3: Pen settings › Snap shapes, Fill shapes and Finger can draw (Automatic, Always, Never); a Layers row (with the layer count) on the Pen, Highlighter and Lasso cards, opening the Layers card (names, show or hide, lock, order, delete, which layer draws, paper behind the ink). The preview note is gone. Drawing a stroke does not close an open pill. The ribbon's Draw tools now work (pen types, Pen, Highlighter, Eraser, Lasso, colour, thickness, opacity, pressure, smoothing, tapered ends, the four papers, Only the Pencil draws, Ink layers); Shapes, Tape, Magnifier and Ruler are still "coming".

## Lasso selection menu

With the Lasso open: words or a picture selected (the Lasso's Text or Pictures filter, or a tap selection in typing mode) give Copy, Cut, Duplicate, Delete, Colour, ★ Key point, Make card and Save to notes (keeps the words in the notebook's "Highlights" page). Selected drawings have their own box, handles and menu (a row of Copy, Cut, Duplicate, Convert to text, Colour by default, the rest under ⋯ More; the row is chosen in the Lasso card), see [ink.md](ink.md). Convert to text needs AI (Phase P) and says so.

## New line

A tap adds a line and can be repeated. Press and hold (default 0.6 s) opens the extras (Heading, Checklist, Divider). Settings › Tool bar: hold, double-tap instead, or off; the hold time (0.4 to 1 s).

## Edit bar

⋯ › Edit bar…: tick, drag or use ↑ ↓ to show, hide and reorder the main-bar tools (at least one stays) and each pill's options; ribbon tabs; size, position, auto-hide; pinned tools; Reset. Saved per device. **Migration:** once, a custom Write list becomes the Text pill's buttons in the same order, the ink tools missing from the Draw list are hidden, buttons with no place stay on the bar as pinned tools (`migrate.ts`); the old lists are kept.

## The Pencil follows the tool (final rules, owner, real iPad)

- **Default tool:** Text on Computer and Touch; **Lasso** in Pencil mode. The finger pans and zooms under every tool; a finger tap on text places the caret with one tap outside Pencil mode.
- **Text:** a Pencil tap on a block with words marks it (outline, no caret, no keyboard); a second tap in it places the caret where tapped (a brief highlight shows where). An empty block or blank space takes the caret at once. Setting "Pencil: tap twice to start typing" (Auto = on in Pencil mode). No double-tap word select. Scribble is free; only a big scratch-out (20 or more characters) is refused or offered an Undo (penGuard). A Pencil tap asks for no keyboard (`inputmode="none"`) until a finger tap, a key or the ⌨ button.
- **Hold:** the Pencil resting still on text for 0.5 s (0.3 to 1.5 s in Settings › Advanced) places the caret there; moving while held extends a selection; lifted without moving, only the caret stays (the mini toolbar shows after a selection).
- **Lasso:** a tap marks a block, a second tap places the caret (no keyboard); a drag on text selects (penSelect, whole blocks over pictures); a blank line takes no caret; double-tap selects a word, triple-tap a line (12 px tolerance, nearest-text fallback), then the **mini toolbar** (colour, size, style, B, I, align, list, highlight, link, cut, copy, ⋯ paste, Make card, ★, Save to notes) with two handles replaces the iOS callout. Round 5: its colour button opens the colour panel; a grip drags it anywhere and 📌 keeps it there (saved per device); it is placed only for a new selection (formatting never moves it); it sits at `--z-mini` (35), under every pill, card and menu. **Mini keyboard strip:** the mic button next to ⌨ shows a draggable strip (🎤 speak to type via SpeechRecognition when the browser has it, else the keyboard mic with a hint; ↵; ⌫ with hold-repeat) that snaps to the four edges like the pills and is remembered. The iPadOS shortcut bar is never suppressed.
- **Pen, Highlighter, Eraser:** the page is not focused and stylus touches are cancelled (the Pencil draws in step 3, a finger scrolls). **Read:** taps only; the Pencil can scroll.
- A selection that starts on text lets pictures and embeds pass the pointer (`ln-selgesture`) and never starts a drag or drop; a long press that starts on a picture keeps its menu and drag. Edge auto-scroll only while a selection is being extended.
- Settings › Advanced › Pencil writes text (Scribble) stays as an override. Settings › Tool bar › Pencil picks the Pen tool (off by default). Settings › Advanced › Pencil can scroll.

## Round 6 fixes (7 Nov)

- **Drag-only grips:** the mini keyboard strip, mini bar, options pills and floating bar call `startGripDrag` on the grip: it captures the pointer, the page's editable parts turn read-only until the lift, and the ink and Lasso ignore all pointers. Restored on pointer up, cancel or lost capture.
- **The page does not move when a tool is chosen:** nothing reserves room for the pill any more. The top gap is always there and every other edge floats, so the old hold-and-settle code (`pageAnchor.ts`, `gestureHold.ts`, `pillReserve`) was removed. `e2e/toolBand.spec.ts`, `e2e/pillFloat.spec.ts`.
- **Pencil and finger on bars (option C):** both tap bar buttons. `penTap.ts` ignores a palm on bars (a touch under 400 ms after a Pencil touch or 500 ms after it lifts; `palmGuard.barPalm`), and with Settings › Tool bar › "Toolbar: finger only" (`toolbar.fingerOnly`, off by default) ignores Pencil taps on bars and pills ([data-bar], [data-pill-root]); menus and dialogs stay reachable. On the page the Pencil writes, draws and lassos and the finger scrolls, places the caret and selects text.
- **No iOS callout on our surfaces:** `-webkit-touch-callout:none` and `user-select:none` on bars, pills, menus and the ink layer (typing fields excepted) and no system context menu on them; limits in LIMITATIONS.

## Round 7 (8 Nov): layout, Edit toolbar, pins, search, scroll cue, mini bar

- **Layout kept (R7-10).** `toolbar.main`, `toolbar.pills`, `toolbar.extras` and `toolbar.order` are cleaned when read (`cleanStore`): an id this build does not know drops out, every other choice stays; a pill left with nothing falls back to its defaults. New tools are never forced onto a saved bar; they are listed under "More tools". The layout syncs as one `secrets` record (`toolbarLayout`, newer edit wins, `layoutSync.ts`).
- **Edit toolbar (R7-11).** ⋯ › Edit toolbar… opens `EditListSheet` (lazy, modal, in the body): preview strip, the list on the bar and "More tools" (with a find box; two columns when 700 px wide or more). Drag a row's ⠿ with finger, Pencil or mouse to move it, drop a tool from More tools into the list to add it, drop a row on More tools to remove it; every row also has ↑ ↓ and − / +. Done and ✕ keep the changes, Cancel and Esc revert; Reset puts the standard bar back. At least one main tool stays. ⋯ › Bar settings… keeps the old panel (size, position, auto-hide, tabs). The same sheet arranges a pill's options.
- **One order (R7-12).** `toolbar.order` lists tokens `m:<main tool>` and `x:<pinned tool>`; a pinned tool can sit between main tools. A newly pinned tool goes first (or where dropped). Tokens that are no longer on the bar are ignored and tools the order does not know go last.
- **Tool search (R7-13).** With nothing typed, Recent tools, Favourites (pinned) and Recommended come first, one tap runs a tool.
- **Scrollable bar (R7-14, R7-17).** While the main bar overflows: edge fade, a chevron with the count of tools out of sight (tap = slide), and a thin track whose handle slides the bar (own pointer events, `data-pen-own`; it never taps a tool). Nothing shows while the bar fits.
- **Panel scroll handle and edge stretch (9 Nov).** Lists and panels use one thin handle from src/app/scrollHints.ts (3 px, 7 px dragged, 44 px touch area, 1:1 drag, fades after 1 s); src/app/edgeStretch.ts gives the pull-past-the-end spring. Test: e2e/scrollHints.spec.ts.
- **Mini bar (R7-7).** Clamped inside the page area (`main`) on all four edges from its measured size.

## Polish pass 2 (8 Nov)

- **⇄ Last tool.** `lastTool` (mainTools.ts) is the mode tool selected before the current one, never Reading mode; `swapToLastTool()` selects it again. The registry tool `lastTool` is pinnable and is pinned once in Pencil mode. Eraser card › "Go back to the previous tool after one erase" (`ink.eraser.returnAfter`, off).
- **Favourites.** Pen and Highlighter pills have a ★ and up to six saved pens each (type, colour, size); tap applies, press and hold removes with Undo. Saved in `toolbar.favourites` and in the layout sync record.
- **Lasso menu order.** Lasso card › Arrange the menu… opens `EditListSheet`; `ink.lasso.row` is the ordered row, the rest sit under ⋯ More. The text and picture selection menu is ordered the same way.
- **Options pill scroll.** A horizontal pill wraps its options in `BarScroll` (cue, count, handle).

## Contextual strips (9 Nov)

What is selected decides an extra tab, like Word's contextual tabs. `context/contextStore.ts` keeps which kinds are active (picture, video, table, ink, text; the first in that order wins). Sources: `PictureHandles` (picture), `ContextWatcher` (embed, table, words, a Lasso drawing selection). The full bar (`Ribbon.tsx`) shows the extra tab, opens on it when a selection starts or when All tools is opened, and returns to the tab it had when the selection clears. The compact bar has a row under the main bar (`ContextBar`, floats over the page so nothing moves): the first three actions and More. Words keep the mini toolbar in the compact bar. Buttons are 44 px with names; strips are built in `context/stripItems.ts`. Test: e2e/pictureStrip.spec.ts.

## Edge cases

- A saved list or value that is invalid reads as its default (`isMainList`, `isPillMap`, `isPillPlace`, ink field clamps).
- The pill is clamped into the visible screen and follows the keyboard; rotation re-places it.
- A tool that is "coming" can be tapped and says so; it is never hidden. Today only Print and PDF is one (`coming: 'print'` in `toolRegistry.ts`).

## Security check

Only device preferences are stored (tool lists, pill place, ink settings, hold times). Every stored value is validated on read. No data leaves the device. No deletes except what the user asks (Lasso Delete, with Undo).

## Tests

- Unit: `mainTools`, `pillPlace`, `inkSettings`, `migrate`, `newLineGesture`, `textOps`, `tapSelect` (tap counts, ranges, tolerant hit-testing, keyboard policy, edge scroll), `penGuard`, `lineActions`.
- Browser: `mainBar`, `inkPills`, `pillMove`, `editMainBar`, `newLineHold`, `mainBarLayout`, `penTools`, `pictureSelect` (Chromium and WebKit).
- Only a real iPad can confirm the Pencil, Scribble, keyboard and callout behaviour: see HANDOFF owner checks and LIMITATIONS.
