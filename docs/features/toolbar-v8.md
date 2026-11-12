# Toolbar v8 (slice 1, flag `toolbar.v8`, with BUG-002 and BUG-003)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

In plain words: the bar at the top of a page where you pick Text, Pen, Eraser, Shapes, Lasso and Insert. Tap a tool once to use it; tap it again to open one small card with its options. Under the tools sits one row with that tool's main options and your **Favourites** (saved setups such as "Blue ball" or "Sticky note"). Beginner sees a calm, short bar; Professional sees everything, each extra unlocked by its own switch. Nothing the app does today is lost.

Sources (approved, in this order of weight): `docs/PENDING.md` "Favourites row + Organise + long-press strip + Paste: APPROVED" (newest; replaces the ★ custom tool) with `docs/mockups/favourites/`; "Toolbar mock v8: APPROVED"; "Toolbar mock v6: APPROVED" conditions; "Carry-over review" (BUG-003); `docs/mockups/toolbar-v8/design-study.md` (the card system); `docs/mockups/toolbar-open-comments.md` T1–T10; `docs/mockups/toolbar-v6-comments.md` V1–V3, M1–M3; `docs/plans/app-audit-2026-11-12.md` 3.8; `docs/plans/tool-inventory-2026-11-11.md`.

Owned here: the tool bar, tool row, tool cards, Favourites, layouts, the keyboard / mini / micro bars, the text-selection format bar (**BUG-002**), the selection bar, Minimise and **BUG-003**. The long-press strip, Paste and the shared Context menu strip live in [page-menus.md](page-menus.md).

## How it works

### Shared parts used

All from `src/design/parts/`, placed by the overlay manager `src/app/overlay/`, input from the event and gesture routers, selection from `src/app/selection/store.ts`, tools from `src/app/tools/toolRegistry.ts`:
Card / ▾ frame (304 / 376 px), Sheet (Organise, Add favourite, Layouts; from page-menus.md), Toast queue, Dialog set (Name, Delete layout), Drag with drop-line and ▲▼, Arrange sheet, Object bar (selection bar), Status pill (Show toolbar pill = Minimise chip), segmented control, switch row, swatch grid, size tiles, visual tiles, custom slider.

### Sizes, spacing, motion (design system, design-study.md 3)

- Tool bar: 52 px tall row of tools, 44 px targets, icon 20 px Lucide 1.6 stroke; Beginner icons only (names on hover / long-press), Professional icon + name.
- Tool row (second line): 44 px tall chips, 8 px gap, single line; never scrolls sideways. Order: tool options, then Favourites chips, then a hairline, then "+" and "☰" (both 44 px) at the right end.
- Cards: radius 20 px, padding 12 px, glass 88–92 % with 28 px blur, hairline edge, header title 15 px semibold, ✕ 30 px circle in a 44 px target, arrow pointing at its ▾. Picker 304 px, Panel 376 px. Hangs 8 px under the bar, left edge on its ▾, at least 12 px from every screen edge. Body scrolls with a bottom fade when too tall.
- Group labels 12.5 px semibold, sentence case; wells radius 14 px with hairlines.
- Motion: card open 200 ms cubic-bezier(.2,.8,.2,1) (fade, scale .96 → 1, rise 6 px); close 130 ms; section thumb 280 ms spring; press scale .96 in 120 ms; new pick pops .93 → 1 in 280 ms; changed ▾ glows 700 ms; simple picker closes 190 ms after a pick. Reduced motion = instant.
- Organise sheet: docked right, 376 px wide, full height on phone; rows 56 px.
- Show toolbar pill: 36 px tall (44 px target), accent chip with icon + "Show toolbar", 12 px from the top-right edge.

### Spec lines: Beginner and Professional ("When I do X → Y")

Each line is one end-to-end test (Chromium + `ipad-webkit`). "(Pro: `id`)" names the unlock switch from `docs/mockups/pro-features.md`; it is on for Professional and can be turned on by a Beginner in Settings › Professional features.

**Bar and tools**

- TB-01 When I open a page with the flag on → the bar shows Text, Pen, Eraser, Shapes, Lasso, Insert, then Undo, Redo, ⋯, Minimise; Beginner shows icons only.
- TB-02 When I hover (PC) or long-press (touch) a Beginner tool icon → its name shows in a tooltip; the tool is not chosen by the long-press.
- TB-03 When I tap a tool → it becomes active (accent tint) and its row shows below; nothing opens.
- TB-04 When I tap the active tool again → its card opens beside it (304 or 376 px by the picker/panel rule) and the ▾ looks pressed.
- TB-05 When a card is open and I tap another ▾ → the first card closes and the new one opens; never two cards, never a card from a card.
- TB-06 When I tap, drag or scroll inside a card → nothing reaches the page (T7); the first tap outside only closes the card.
- TB-07 When I tap a button inside a card while text is selected → the text selection stays (T7).
- TB-08 When the screen is narrower than the row → items first lose their names, then fold into "⋯ n" at the end; the row never scrolls sideways.
- TB-09 When I hold a tool button and slide onto another tool → releasing picks that tool (hold-and-slide, 350 ms, audit 3.8).
- TB-10 When I tap Backspace → one character is deleted; when I hold it → it repeats after 400 ms, characters first, then words (audit 3.8).
- TB-11 Backspace and New line stay on the Beginner bar next to each other; holding New line opens its extras (heading, checklist, divider) after the hold time.
- TB-12 When I tap Insert → its card hangs from the Insert button with Picture, Table, Shape, Camera, Callout, Card; Professional adds File, Audio, Write pad, Handwriting, Tape, Magnifier, Ruler, page links, database, mind map, templates (Pro: `tb.insertMore`).
- TB-13 When I tap Read in ⋯ → Reading mode turns on (Q3: Read lives under ⋯ as "Reading mode").
- TB-14 Professional: "Back to <tool>" shows the previous tool's icon; tapping it swaps back (Pro: `tb.layouts`).

**Pen (one tool, types inside)**

- TB-20 When I open Pen › Type ▾ → six tiles (Fountain pen, Ballpoint, Brush pen, Pencil, Marker, Highlighter) each with a sample stroke in my colour and a three-word hint; picking one closes the card after 190 ms and the chip glows.
- TB-21 Pen row order is Type ▾ → Size ▾ → Colour ▾ → Feel ▾ → Favourites (T2).
- TB-22 When I open Size ▾ → three size tiles drawn at real thickness; Professional adds a live preview and the wedge "Exact thickness" slider and Line style (Pro: `tb.penStroke`).
- TB-23 When I open Colour ▾ → six round swatches; the chip shows one dot of the current colour; Professional adds Colour picker and Custom colours, up to 6, newest first (Pro: `tb.customColours`).
- TB-24 When I open Feel ▾ → sections Feel · Aids · Math · Page; Beginner Feel = Pressure, Stabilisation, collapsed Fine-tune; Professional adds tip sharpness, flatness, tilt, speed thickness, latency (Pro: `tb.penFeel`), writing aids (Pro: `tb.penAids`), layers, paper size, zoom (Pro: `tb.layers`).
- TB-25 When I choose A4 in Page → the grid and paper style stay visible (T4).
- TB-26 Highlighter options: opacity, snap to lines, behind ink, highlight eraser, save to notes (Pro: `tb.highlighter`).

**Eraser, Shapes, Lasso**

- TB-30 Beginner Eraser card → simple eraser: Standard / Whole stroke tiles and three sizes; Professional brings back today's eraser with Precise, highlights only, "go back after one erase" and the size preview ring (Pro: `tb.eraserOptions`).
- TB-31 Shapes has its own top-bar slot; its card is grouped (Draw as, Shape help, Ruler, Magnifier, Colour picker) in sections, no single long scrolling strip (T1, T5) (Pro: `tb.shapesAids` for the aids).
- TB-32 Lasso card → shape tiles (free / rectangle) and action list; Professional adds what it picks, which actions sit in the menu row, layers (Pro: `tb.lassoOptions`).
- TB-33 When I lasso ink or text → the selection bar (Object bar) shows Cut, Copy, Paste, Duplicate, Colour, Resize, Delete, ⋯; Professional ⋯ adds Convert, Screenshot, Key point, Make card, Summary, Save, Move, Scale, Rotate (Pro: `tb.selectionMenu`).
- TB-34 When a picture is selected → Edit picture: crop, turn, straighten, resize presets, shapes (Pro: `tb.pictureEdit`).

**Text**

- TB-40 Text row order: Box ▾ (first, one setting with 1 / 2 / 3 styles, settings button in front, T3) → Format ▾ → B → I → Favourites.
- TB-41 When I open Format ▾ → sections Text · Style · Paragraph: H1–H3, bullet, star, numbered, checklist, B/I/U/S, indent, outdent, alignment, callout, divider, inline code (T6); styles drawn in their own look; Professional adds Advanced, fonts in their own face, line height (Pro: `tb.textFonts`) and more marks (Pro: `tb.textMarks`).
- TB-42 When I open Box ▾ with a box selected → the Box card opens right of the box, else left, else under, else above; it never covers the box (M1); box looks, fill, border, corners, padding, shadow, columns (Pro: `tb.textBox`).
- TB-43 The text box's own mini-bar has no second minimise (M2); the top bar has no Done (M3).

**Favourites row (replaces the ★ custom tool)**

- TB-50 Favourites show inside the tool row on every tab (Text, Pen, Eraser, Shapes, Lasso, Insert), Beginner and Professional.
- TB-51 When I tap a favourite → its whole setup applies (tool, type, size, colour, box look…) in one step, the chip shows a ring while its setup is active, and Undo restores the previous setup.
- TB-52 When I tap "+" → the Add form opens: pick a tool → "Current setup" or any preset → ticks for what to include → live preview → name → Save; the new chip slides in and glows.
- TB-53 When I tap "☰" → the Organise sheet opens with a live preview of the row, big rows with a drag handle, ▲ ▼ and ⋯ (Move to start, Move to end, Remove); Reset, Add favourite, Done.
- TB-54 When I drag a row in Organise → a drop-line shows and the preview reflows live; drop → the order changes, toast "Moved <name> · Undo".
- TB-55 When I remove a favourite → it disappears with a toast "Removed <name> · Undo"; Undo puts it back in the same place.
- TB-56 When I tap Reset in Organise → a confirm dialog; yes → the row returns to the default set, with Undo.
- TB-57 On a phone → Organise is full height; the "More favourites" (⋯ n) items open a list where every item is tappable (fix 2 of the approval).
- TB-58 A Beginner sees Favourites; Custom colours and per-tool favourites beyond 6 need (Pro: `tb.customColours`).

**Professional pins and layouts**

- TB-60 Professional: "+" also lists every setting from that tool's cards; a picked setting pins onto the row; overflow goes to "⋯ more pinned ▾", never sideways scroll (v6 condition 2) (Pro: `tb.layouts`).
- TB-61 Layouts card (in ⋯ and in Settings › Tool bar) → built-in Beginner and Professional, up to 3 own layouts (new from Blank, Beginner or Professional), rename, "Reset to original" per layout, "Reset all layouts" in Settings (Pro: `tb.layouts`).
- TB-62 When I change a layout on this device → a device copy is made; other devices keep theirs; a new device copies the closest device type's version.
- TB-63 Professional "Show all tools" opens the All tools card (the old Ribbon), never shown in Beginner (Pro: `tb.allTools`); the Professional map (Pro: `tb.proMap`).

**Feedback, keyboard, minimise, BUG-003**

- TB-70 When I change any setting → the changed part glows once (700 ms); a switch says "<X> turned on · Undo" in the toast queue; Undo puts it back even after the card closed; each switch row has a tiny live preview (V1).
- TB-71 When "Keyboard stays hidden" is on → our keyboard, mini and micro bars never pop up by themselves and the iPad keyboard stays down (inputmode none) until I tap the Keyboard button; Scribble still writes.
- TB-72 When I type with the iPad keyboard up → only ONE bar of ours shows (the keyboard bar); no other bar pops up (C9).
- TB-73 When I tap Minimise → the bar collapses into the "Show toolbar" pill high on the right; tapping the pill brings it back with a 200 ms slide.
- TB-74 (BUG-003) When "Hide toolbar while writing" is on (Settings › Tool bar, default off) and I start writing or typing → the bar tucks away within 200 ms and the same "Show toolbar" pill shows; tapping it shows the bar; after I use a tool and start writing again it hides again.
- TB-75 (BUG-003) When the tool bar is turned off in Settings and I tap "Show toolbar" → it shows; using a tool and writing hides it again; the pill is always visible.
- TB-76 Bars can be dragged and snap to edges; "Options pill position" resets them (Pro: `toolbar.pillReset`); "Reset tool bar" restores defaults (`toolbar.reset`).

**Selection bars and BUG-002**

- TB-80 When I select text → one Selection bar (B, I, U, Aa, Dictate, Minimise) shows; the micro bar stays separate (C8/Q2); Dictate needs (Pro: `tb.miniToolbar`).
- TB-81 (fix 1 of the approval) The B/I/U bar never covers the selection handles or the selected text: it sits 8 px above the selection, else 8 px below the handles, else beside it.
- TB-82 (BUG-002) **The bar always stays fully inside the screen: iPad landscape, portrait, phone, with the selection near every edge and corner.** It never stretches: its width is fixed by its content (max 100 vw − 24 px, extra items fold into ⋯), and it is clamped 12 px inside the visible viewport (including when the keyboard is up).
- TB-83 When the selection scrolls off screen → the bar hides; when it comes back → the bar returns next to it.

### States

- Empty: no favourites → the row shows only "+" with the hint "Save a setup"; no own layouts → "New layout" tile.
- Error: a favourite whose preset no longer exists → chip dimmed with "Fix" (opens Add form prefilled); missing tool icon → fallback icon + warning in the console and a failing unit test.
- Offline: everything works; layouts and favourites sync when back online.
- Phone: bar folds into "⋯ n"; cards become bottom sheets at full width minus 24 px; Organise full height.
- Dark / light / sepia: same tokens; ring and glow use the accent token.

## Nothing lost: today's features and their new home

| Today (file:line)                                                                                                                  | New home                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tool registry `src/app/tools/toolRegistry.ts:110`                                                                                  | Same list, gains level / unlock / favourite                                                                                        |
| Ribbon `src/app/tools/Ribbon.tsx:49`, tabs `tabs.ts:2`                                                                             | All tools card, Pro (`tb.allTools`) TB-63                                                                                          |
| Ribbon options `src/app/tools/RibbonOptions.tsx:24`                                                                                | Settings › Tool bar (`toolbar.ribbonMode`)                                                                                         |
| Main bar `src/app/tools/main/MainBar.tsx:57`                                                                                       | Tool bar TB-01                                                                                                                     |
| Main tools `src/app/tools/main/mainTools.ts:16-26`                                                                                 | Tool bar; Read → ⋯ Reading mode TB-13                                                                                              |
| Options pill `src/app/tools/main/OptionsPill.tsx:57`, `PillContent.tsx:52`                                                         | Tool row TB-21/40                                                                                                                  |
| Detail card `src/app/tools/main/DetailCard.tsx:99`                                                                                 | Tool cards TB-04                                                                                                                   |
| Edit toolbar sheet `src/app/tools/main/EditToolbarSheet.tsx:41`                                                                    | Organise sheet TB-53, Layouts TB-61                                                                                                |
| Edit list sheet `src/app/tools/EditListSheet.tsx:63`                                                                               | Arrange sheet (shared)                                                                                                             |
| Control rows `src/app/tools/controlRows.ts:44`                                                                                     | All tools card                                                                                                                     |
| Bar stack / free drag `src/editor/BarStack.tsx:68`, `freeBar.ts:27`                                                                | TB-76                                                                                                                              |
| Bar overflow `src/app/tools/BarScroll.tsx:27`                                                                                      | "⋯ n" fold TB-08 (no sideways scroll)                                                                                              |
| Pen types `src/app/tools/main/inkSettings.ts:136-143`                                                                              | Type tiles TB-20                                                                                                                   |
| Pen widths `inkSettings.ts:162`                                                                                                    | Size tiles TB-22                                                                                                                   |
| Pen colours / custom colours `inkSettings.ts:18`, `:40`                                                                            | Colour card TB-23                                                                                                                  |
| Highlighter `inkSettings.ts:28`, `:252`                                                                                            | Pen type + TB-26                                                                                                                   |
| Ink preview `src/app/tools/main/InkPreview.tsx:16`                                                                                 | Size / Feel live preview                                                                                                           |
| Pen favourites `src/app/tools/main/penFavourites.ts:16`                                                                            | Favourites row TB-50 (migrated)                                                                                                    |
| Favourites row `src/app/tools/main/FavouritesRow.tsx:77`                                                                           | Favourites row TB-50–57                                                                                                            |
| Pencil picks pen `src/app/tools/main/penPicks.ts:20`                                                                               | Feel › Aids                                                                                                                        |
| Eraser `mainTools.ts:84`, `inkSettings.ts:288-311`                                                                                 | TB-30                                                                                                                              |
| Lasso `mainTools.ts:85`, `inkSettings.ts:342`                                                                                      | TB-32                                                                                                                              |
| Selection menu `src/app/tools/main/SelectionMenu.tsx:65`                                                                           | Selection bar TB-33                                                                                                                |
| Context strip `src/app/tools/context/ContextStrip.tsx:45`                                                                          | Object bar / Context menu strip (page-menus)                                                                                       |
| Copy/paste menu `src/app/tools/CopyPasteMenu.tsx:13`                                                                               | Context menu strip (page-menus PM-20)                                                                                              |
| Text options `mainTools.ts:68-81`, `textOps.ts:8-83`                                                                               | Format card TB-41                                                                                                                  |
| Note sizes `src/app/tools/main/textStyle.ts:13`                                                                                    | Format › Text                                                                                                                      |
| Text box extras `src/app/tools/main/TextBoxExtras.tsx`                                                                             | Box card TB-42 (handles stay with textbox.v2)                                                                                      |
| Insert `mainTools.ts:86-100`, registry `toolRegistry.ts:338-444`                                                                   | Insert card TB-12                                                                                                                  |
| Keyboard bar `src/app/tools/main/KeyboardBar.tsx:28`                                                                               | TB-72                                                                                                                              |
| Keyboard hidden `MainBar.tsx:410`                                                                                                  | TB-71                                                                                                                              |
| Micro bar `src/app/tools/main/MicroBar.tsx:32`                                                                                     | TB-80                                                                                                                              |
| Mini toolbar `src/app/tools/main/MiniToolbar.tsx:85`                                                                               | Selection bar TB-80                                                                                                                |
| Mini keys `src/app/tools/main/MiniKeysStrip.tsx:41`, `miniKeys.ts:13`                                                              | Kept; obeys TB-71                                                                                                                  |
| Backspace hold `src/app/tools/main/backspaceHold.ts:6-14`                                                                          | TB-10                                                                                                                              |
| Hold-and-slide `src/app/tools/main/holdSlide.ts:20`                                                                                | TB-09                                                                                                                              |
| New line extras `mainTools.ts:315-332`, `newLineGesture.ts:17`                                                                     | TB-11, `toolbar.newLineHold`                                                                                                       |
| Minimise `src/app/tools/toolbarVisibility.ts:44`, `:55`, `:76`                                                                     | TB-73                                                                                                                              |
| Last tool `mainTools.ts:129`, `selectTool.ts:60`                                                                                   | "Back to <tool>" TB-14                                                                                                             |
| Layout button `src/app/tools/LayoutButton.tsx:11`, `layoutSync.ts:27`                                                              | Layouts TB-61/62                                                                                                                   |
| Favourite star `toolRegistry.ts:654`                                                                                               | Favourites "+" TB-52                                                                                                               |
| Reading tools `toolRegistry.ts:489-545`                                                                                            | ⋯ Reading mode (reader slice owns the bar)                                                                                         |
| Format bubble `src/editor/SelectionToolbar.tsx:112`                                                                                | Selection bar TB-80–83                                                                                                             |
| Undo / redo `src/app/tools/HistoryButtons.tsx:12`                                                                                  | Tool bar right end                                                                                                                 |
| Pencil mode `inkSettings.ts:147-148`, `penTap.ts:48`                                                                               | Feel › Aids; gesture router                                                                                                        |
| Settings tool bar `src/settings/builtinSettings.ts:81`, `:374-534`                                                                 | Settings › Tool bar (+ "Hide toolbar while writing")                                                                               |
| Audit 3.8: P12 layout pop-up, P14 box extras, P15 ink overlays, P16 Theme ▾ and 4 Copy & paste items, table / video context strips | Layouts card; Box card; Pen › Feel › Page (ruler, tape, eraser ring, hidden-layer chip); ⋯ Theme ▾; Context menu strip; Object bar |

The 878 kept probes (`docs/mockups/toolbar-v8/cov.mjs`, Text rows from `mapping.mjs`) and the 118 v8 probes (`cov_v8.mjs`; 996 total) run against the real build; the V4 probes (★ custom tools) are re-pointed to Favourites.

## Edge cases

- A favourite saved for a tool that is hidden in this layout still applies and switches to that tool.
- Two devices edit the same layout offline → each keeps its device copy; no merge loss.
- Fast double tap on a tool opens its card once.
- Keyboard appears while a card is open → the card stays inside the visible area (clamped like TB-82).

## Security check

Favourite names and layout names are plain text (escaped, max 40 characters). No new network calls. Layout sync uses the existing encrypted sync path.

## Won't do

- Names under icons in Beginner.
- Sideways-scrolling rows.
- The ★ custom tool (replaced by Favourites).
- Removing the iPadOS system shortcut bar (a web app cannot).
- Text box handles / move / layers (slice 2 `textbox.v2`), long-press strip and Paste (slice 12).

## Build order (one surface group per commit)

1. **1a Frame + registry fields**: `src/app/flags.ts` entry, registry level / unlock / favourite fields, missing-icon fallback test. Files: `src/app/tools/toolRegistry.ts`, `src/app/tools/v8/registryV8.ts`.
2. **1b Tool bar + tool row**: `src/app/tools/v8/ToolBar.tsx`, `ToolRow.tsx`, fold logic `rowFold.ts`.
3. **1c Pen cards** (Type, Size, Colour, Feel): `src/app/tools/v8/cards/pen/*`.
4. **1d Eraser, Shapes, Lasso cards + Selection bar**: `src/app/tools/v8/cards/{eraser,shapes,lasso}/*`, `src/app/tools/v8/SelectionBarV8.tsx`.
5. **1e Text cards** (Box, Format): `src/app/tools/v8/cards/text/*`.
6. **1f Insert card + ⋯ + All tools**: `src/app/tools/v8/cards/{insert,more,alltools}/*`.
7. **1g Favourites** (row, Add form, Organise sheet, migration of pen favourites): `src/app/tools/v8/favourites/*`.
8. **1h Pins + Layouts**: `src/app/tools/v8/layouts/*`, Settings rows in `src/settings/toolbarV8Settings.ts`.
9. **1i Feedback** (glow, toast with Undo, live previews): `src/app/tools/v8/feedback.ts`.
10. **1j Keyboard bars, Minimise, BUG-003**: `src/app/tools/v8/keyboard/*`, `src/app/tools/v8/minimise.ts`.
11. **1k Text format bar, BUG-002**: `src/app/tools/v8/FormatBar.tsx`, `src/app/overlay/clampToViewport.ts` (shared helper, owned here first).

## Tests

- Unit: fold logic, favourite apply / undo, layout device copy, clamp helper (every edge, corner, keyboard up), icon-exists.
- E2E: one per TB line, Chromium + `ipad-webkit`.
- BUG-002 test: viewports 1180×820, 820×1180, 390×844; select text at the 4 edges and 4 corners and the centre; assert the bar's rect is fully inside the visual viewport and its width is unchanged.
- BUG-003 test: setting on → type → bar hidden, pill visible → tap pill → bar shown → pick a tool, write → hidden again.
- Screenshots: Beginner / Professional × light / dark × iPad landscape / portrait / phone / PC.
- Nothing lost: 878 mapping probes + the table above.
- Accessibility check; size budget (first load ≤ 320,000 B; cards lazy-loaded).

## Owner iPad check (3 steps)

1. Tap Pen, tap it again, pick a pen type, size and colour; tap "+" and save a favourite; tap ☰, move it, remove it, Undo.
2. Select text near each corner of the screen in landscape and portrait: the format bar stays fully on screen and never covers the handles (BUG-002).
3. Turn on "Hide toolbar while writing", write with the Pencil: the bar tucks away, the "Show toolbar" pill brings it back (BUG-003).

## Decisions to review

1. "Fountain pen" kept as the name (alternative "Ink pen").
2. Simple pickers close 190 ms after a pick (alternative: stay open).
3. Favourites are in Beginner too (the approved mock shows them in Beginner); the limit of 6 per tool and custom colours stay behind `tb.customColours`.
4. Pen favourites from today migrate into the new Favourites row on first open (no data dropped; old field kept one release).
5. Professional pins (v6 condition 2) are kept alongside Favourites through the same "+", since the ★ removal did not remove pins.
6. "Hide toolbar while writing" starts off for everyone (optional setting, per the carry-over check).
7. BUG-002 fix: the bar's width is fixed by its content and clamped 12 px inside the visual viewport; extra items fold into ⋯ rather than shrinking.
8. Read moves under ⋯ as "Reading mode"; the reader slice owns the reading tools themselves.
