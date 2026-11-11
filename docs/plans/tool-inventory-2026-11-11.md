# Tool inventory (verified in code, 11 Nov 2026)

Repo: C:\Users\pc\Downloads\learning-notes. Paths relative to src/ unless noted.
E = essential (used often), A = advanced.
Main bar default order (app/tools/main/mainTools.ts:16-26): Undo/Redo | Text, Pen, Highlighter, Eraser, New line, Backspace, Lasso, Insert, Read | pinned extras | Keyboard, Mic, More.
Pill option lists: mainTools.ts:67-101. Pills: app/tools/main/PillContent.tsx. Cards: app/tools/main/DetailCard.tsx. Settings model: app/tools/main/inkSettings.ts.

## 1. Pen

| Option                                                      | What it does                                                                            | Where                                                            | File:line                                                                                      | E/A |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --- |
| Pen tool                                                    | Draw ink with Pencil/finger/mouse                                                       | Main bar                                                         | mainTools.ts:18                                                                                | E   |
| Layer chip "Layer 1"                                        | Shows active ink layer, opens Layers card                                               | Pen/Highlighter/Eraser pill (first)                              | PillContent.tsx:332-347                                                                        | A   |
| Pen type: Fountain, Ball, Brush, Pencil, Marker             | Nib look/behaviour                                                                      | Pill type / Pen card / ribbon Draw > Pens                        | inkSettings.ts:136-142; DetailCard.tsx:479-490; toolRegistry.ts:461-465; ink/inkTools.ts:13-19 | E   |
| 3 thicknesses                                               | Thin/medium/thick per type (Fountain 1.5/3/5 px)                                        | Pen pill                                                         | PillContent.tsx:375-392; inkSettings.ts:162-168                                                | E   |
| Exact thickness 0.5-30 px + Use the 3 sizes                 | Precise width                                                                           | Pen card > Stroke (tap active thickness again; ribbon Thickness) | DetailCard.tsx:655-670                                                                         | A   |
| Line style: Solid, Dashed, Dotted                           | Stroke pattern                                                                          | Pen card > Stroke                                                | DetailCard.tsx:644-654                                                                         | A   |
| 6 colours (Black, Blue, Red, Green, Orange, Purple)         | Pen colour                                                                              | Pen pill swatches                                                | inkSettings.ts:18-25; PillContent.tsx:394-419                                                  | E   |
| + Custom colour (picker + Add)                              | Own colours, newest first, max 6                                                        | Pill + / tap active swatch = Colour card; ribbon Colour          | inkSettings.ts:37-55; DetailCard.tsx:692-751                                                   | A   |
| Favourites (up to 6)                                        | Save type+colour+size; tap applies, hold removes (Undo)                                 | Pen pill end                                                     | PillContent.tsx:420; FavouritesRow.tsx; penFavourites.ts                                       | A   |
| Live preview stroke                                         | Shows current pen                                                                       | Pen card, Stroke page                                            | DetailCard.tsx:478; InkPreview.tsx                                                             | A   |
| Draw as: Freehand, Line, Arrow, Box, Oval, Triangle, Tape   | Drag draws clean shape / tape                                                           | Pen card; ribbon Shapes; Insert > Shape / Tape                   | inkSettings.ts:150-158; DetailCard.tsx:491-501; inkTools.ts:45-57                              | A   |
| Tip sharpness 0-100                                         | Tapered ends                                                                            | Pen card; ribbon Tapered ends                                    | DetailCard.tsx:502-509; inkTools.ts:35                                                         | A   |
| Pressure 0-100                                              | Pressure effect on width                                                                | Pen card; ribbon Pressure                                        | DetailCard.tsx:510-517                                                                         | A   |
| Stabilisation 0-100                                         | Smoothing                                                                               | Pen card; ribbon Smoothing                                       | DetailCard.tsx:518-525                                                                         | A   |
| Flatness (Fountain only)                                    | Flat nib                                                                                | Pen card                                                         | DetailCard.tsx:526-535                                                                         | A   |
| Pen settings > Tilt                                         | Tilt widens line                                                                        | Pen card > Pen settings                                          | DetailCard.tsx:561-566                                                                         | A   |
| > Thickness by speed                                        | Faster = thinner                                                                        | same                                                             | DetailCard.tsx:567-572                                                                         | A   |
| > Reduce latency                                            | Low-latency canvas                                                                      | same                                                             | DetailCard.tsx:573-578                                                                         | A   |
| > Draw and hold for a perfect shape                         | Hold 0.6 s = line/rect/circle/triangle/arrow                                            | same                                                             | DetailCard.tsx:579-585; ink/shapes.ts                                                          | A   |
| > Snap shapes                                               | 45 deg lines, squares, circles                                                          | same                                                             | DetailCard.tsx:586-592                                                                         | A   |
| > Fill closed shapes                                        | 20 % tint                                                                               | same                                                             | DetailCard.tsx:593-599                                                                         | A   |
| > Finger can draw: Automatic / Always / Never               | Finger/palm policy; ribbon Only the Pencil draws toggles Never                          | same                                                             | DetailCard.tsx:600-612; inkTools.ts:71-74                                                      | A   |
| Pen gestures > Scribble to erase                            | Scribble over ink erases                                                                | Pen card > Pen gestures                                          | DetailCard.tsx:621-627                                                                         | A   |
| Pen gestures > Circle to lasso                              | Quick circle selects, switches to Lasso                                                 | same                                                             | DetailCard.tsx:628-634                                                                         | A   |
| Layers >                                                    | Layers card (count)                                                                     | Pen/Highlighter/Lasso cards                                      | DetailCard.tsx:676-688                                                                         | A   |
| Tape                                                        | Solid box hides ink/text; tap peels/sticks; eraser removes                              | Insert > Tape; ribbon                                            | inkTools.ts:54-56; docs/features/ink.md:38                                                     | A   |
| Ruler                                                       | 80 px bar, pen slides along edge, turn snaps 15 deg                                     | Insert > Ruler; ribbon                                           | ink/RulerView.tsx:206-222; ink/ruler.ts; inkTools.ts:57-58                                     | A   |
| Magnifier                                                   | Bottom pad writes small into target box; 2x/2.5x/3x/4x, Space, Next line, close, resize | Insert > Magnifier; ribbon                                       | ink/MagnifierView.tsx:289-380; inkTools.ts:59-60                                               | A   |
| Pencil picks the Pen                                        | Pencil touch selects Pen (off)                                                          | Settings > Tool bar                                              | mainTools.ts:345                                                                               | A   |
| Toolbar: finger only                                        | Ignore Pencil taps on bars                                                              | Settings > Tool bar                                              | mainTools.ts:348                                                                               | A   |
| Pencil writes text (Scribble), Pencil can scroll, hold time | iPad overrides                                                                          | Settings > Advanced                                              | docs/features/toolbar.md:175-179                                                               | A   |
| Last tool (swap)                                            | Back to previous tool                                                                   | Pinnable extra (auto-pinned once in Pencil mode)                 | toolRegistry.ts:350-358; mainTools.ts:378-384                                                  | A   |

## 2. Highlighter

| Option                                                         | What it does                                    | Where                         | File:line                                     | E/A |
| -------------------------------------------------------------- | ----------------------------------------------- | ----------------------------- | --------------------------------------------- | --- |
| Highlighter tool                                               | See-through ink                                 | Main bar                      | mainTools.ts:19                               | E   |
| 3 thicknesses (10/16/26 px)                                    | Width                                           | Pill                          | PillContent.tsx:440-457; inkSettings.ts:252   | E   |
| 6 colours (Yellow, Green, Blue, Pink, Orange, Purple) + custom | Colour                                          | Pill / Colour card            | inkSettings.ts:28-35; PillContent.tsx:459-489 | E   |
| Favourites                                                     | Saved highlighters                              | Pill                          | PillContent.tsx:491-493                       | A   |
| Snap to text lines                                             | Stroke over words becomes a text highlight mark | Highlighter card (pill caret) | DetailCard.tsx:765-771; ink/textSnap.ts       | A   |
| Draw behind ink                                                | Under pen ink                                   | card                          | DetailCard.tsx:772-777                        | A   |
| Opacity 20-90 %                                                | See-through amount (ribbon Opacity opens)       | card                          | DetailCard.tsx:778-786; inkTools.ts:33        | A   |
| Highlight eraser                                               | Selects Eraser limited to highlights            | card action                   | DetailCard.tsx:787-795                        | A   |
| Save to notes                                                  | Copies passage to notebook Highlights page      | card                          | DetailCard.tsx:796-802; ink/saveToNotes.ts    | A   |

## 3. Eraser

| Option                                   | What it does                                                     | Where                               | File:line                                                           | E/A |
| ---------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- | --- |
| Eraser tool                              | Erase ink, one Undo per gesture                                  | Main bar                            | mainTools.ts:20                                                     | E   |
| Precise / Standard / Whole stroke        | Split at touch / reach 35 % further + drop specks / whole stroke | Pill icons; card with one-line note | inkSettings.ts:288; PillContent.tsx:514-531; DetailCard.tsx:814-826 | E   |
| Size 8 / 18 / 32 px                      | Size; ring preview on page                                       | Pill; card                          | inkSettings.ts:290; PillContent.tsx:533-551; DetailCard.tsx:827-836 | E   |
| Erase highlights only                    | Only highlight strokes + text highlight marks                    | Pill toggle; card                   | PillContent.tsx:552-565; DetailCard.tsx:837-842                     | A   |
| Go back to previous tool after one erase | Auto-switch back (off)                                           | Eraser card                         | inkSettings.ts:296-297; DetailCard.tsx:843-848                      | A   |
| Eraser in Magnifier pad                  | Rub in pad erases on page                                        | Magnifier                           | ink/MagnifierView.tsx:380                                           | A   |

## 4. Lasso

| Option                                                                            | What it does                           | Where                             | File:line                                                               | E/A |
| --------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------- | ----------------------------------------------------------------------- | --- |
| Lasso tool                                                                        | Select ink/pictures/text/boxes         | Main bar (default in Pencil mode) | mainTools.ts:23                                                         | E   |
| Free-hand / Rectangle                                                             | Loop type                              | Pill; card                        | PillContent.tsx:579-596; DetailCard.tsx:859-869                         | E   |
| Filter Ink / Pictures / Text (default ink only)                                   | What a loop picks                      | Pill toggles; card                | inkSettings.ts:331-336; PillContent.tsx:598-618; DetailCard.tsx:870-880 | E   |
| Actions in the menu row                                                           | Per-action switch for drawing-menu row | Lasso card                        | DetailCard.tsx:888-904                                                  | A   |
| Arrange the menu...                                                               | Reorder row (EditListSheet)            | Lasso card                        | DetailCard.tsx:905-910; ink/LassoMenuSheet.tsx                          | A   |
| Handles: move, corner resize, side stretch, turn (snaps 90 deg), two-finger twist | Transform selection                    | On selection                      | ink/InkSurface.tsx:749,777; docs/features/ink.md:24                     | E   |

### 4a. Drawing selection menu (ink): ink/InkSurface.tsx:805-960, list ink/lassoMenu.ts:10-30

Default row: Copy, Cut, Duplicate, Convert to text, Colour (lassoMenu.ts:24-30). Always shown: stroke count + Deselect (InkSurface.tsx:898-906). The rest sit under More.

| Item                         | What it does                                 | File:line                           | E/A |
| ---------------------------- | -------------------------------------------- | ----------------------------------- | --- |
| Copy                         | In-app clipboard + PNG on system clipboard   | InkSurface.tsx:809-816              | E   |
| Cut                          | Copy then remove                             | 817-824                             | E   |
| Duplicate                    | Copy in place                                | 825-829                             | E   |
| Convert to text              | Selection PNG to AI ConvertInk sheet         | 830-834, 562-567; ai/ConvertInk.tsx | A   |
| Colour (recolour)            | Six pen colours sub-row                      | 835-842, 983-995                    | E   |
| Delete                       | Remove (Undo)                                | 843-847                             | E   |
| Thickness thin/medium/thick  | Re-width                                     | 848-855, 961-980                    | A   |
| Make card                    | Drawing picture to card                      | 856, 592; ink/cardFromInk.ts        | A   |
| Add to Summary               | Named drawing as Summary line (needs a name) | 857-861, 569-591                    | A   |
| Name this drawing            | Label up to 80 chars, searchable             | 862-866, 1071                       | A   |
| Paste (if copied)            | Paste 16 px offset                           | 921-928                             | A   |
| Play the recording from here | Audio replay (drawn while recording)         | 929-936                             | A   |
| Copy as picture              | PNG to clipboard                             | 937-942                             | A   |
| Save as picture              | Download PNG (screenshot)                    | 943-948                             | A   |

### 4b. Mixed menu (ink + text/pictures): ink/MixedMenu.tsx:81-127

Copy, Cut, Delete (one Undo), Screenshot of the selection (download PNG), Make card, Deselect. Drag/handles move ink only. A

### 4c. Text/picture selection menu: app/tools/main/SelectionMenu.tsx:114-149

Working: Copy, Cut, Duplicate, Delete, Colour, Key point, Make card, Add to Summary, Save to notes. Dimmed coming: Move, Scale, Rotate, Screenshot (128-131); Convert to text = later (143). Order follows the Lasso row (orderByRow, lassoMenu.ts:84-97).

Picture action bar (editor/PictureHandles.tsx): Copy, Cut, Duplicate, Delete, Resize, Deselect; Picture strip presets Smaller/Bigger/Fit width/Original/Fit to page; Edit picture (crop, turn, straighten, shapes): docs/features/pictures.md:336-384.

## 5. Text tool

| Option                                                                                                                | What it does                      | Where                        | File:line                                                                          | E/A |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- | --- |
| Text tool                                                                                                             | Type; tap blank paper makes a box | Main bar                     | mainTools.ts:17                                                                    | E   |
| Style: Title, Heading 1/2/3, Body                                                                                     | Block style                       | Text pill; Style card        | PillContent.tsx:122-139; textOps.ts:8; DetailCard.tsx:213-223                      | E   |
| Font (Aa): Default, Serif, Sans, Dyslexia, Literata, Source Serif, Atkinson, Lexend, Caveat, Kalam, Patrick, Shantell | Note font (device)                | Text pill; Style card > Font | PillContent.tsx:141-175; DetailCard.tsx:306-318; app/reading/readingPrefs.ts:86-98 | A   |
| Size 90/100/115/130/150 %                                                                                             | Note text size                    | Text pill; Style card        | textStyle.ts:13; DetailCard.tsx:263-277                                            | A   |
| Line height Default/Tight/Loose                                                                                       | Spacing                           | Text pill; Style card        | textStyle.ts:14; DetailCard.tsx:280-296                                            | A   |
| Text-box style: Plain, Quote, Callout, Code block                                                                     | Block type                        | Style card > Text-box style  | DetailCard.tsx:320-354                                                             | A   |
| Strikethrough, Code, Link                                                                                             | Marks                             | Style card                   | DetailCard.tsx:240-257                                                             | A   |
| B / I / U                                                                                                             | Bold/italic/underline             | Text pill                    | PillContent.tsx:177-189                                                            | E   |
| Text colour (+ all named colours card)                                                                                | Colour text                       | Text pill                    | PillContent.tsx:190-220; DetailCard.tsx:426-470                                    | E   |
| Highlight colour (+ card)                                                                                             | Background mark                   | Text pill                    | PillContent.tsx:221-250                                                            | E   |
| List: Bullets, Numbers, Checklist (Toggle = coming later)                                                             | Lists                             | Text pill / card             | PillContent.tsx:251-277; DetailCard.tsx:356-393                                    | E   |
| Align: Left, Centre, Right, Justify                                                                                   | Alignment                         | Text pill / card             | PillContent.tsx:278-305; DetailCard.tsx:395-423                                    | E   |
| Key point                                                                                                             | Key-point mark                    | Text pill                    | PillContent.tsx:306-317                                                            | A   |
| Box style / Layout                                                                                                    | Box style panel / Layout Assist   | Text pill end                | TextBoxExtras.tsx:37-55                                                            | A   |

Box style panel (paper/BoxStylePopover.tsx:156-357; core/boxStyle.ts), A: swatches None, Dark, Lime, Peach, White, Red, Yellow, Blue, Slate, Outlined (boxStyle.ts:132-147); presets Outline, Soft card, Note, Callout, Shadow card (149-161); My presets save/rename/delete, max 8, synced (BoxStylePopover.tsx:227-286; paper/boxPresets.ts:20-89); Background, Border, Border width 0-3, Radius 0-16, Padding 0-16, Shadow (293-333); Use for new boxes (350); Reset (357).

Box bar / box menu (paper/BoxBar.tsx:110-170; paper/usePaperBoxes.tsx:372-421), A: colour, size, font, B, I, align, list, cut, Box style, Layout, Duplicate box, Delete box, More (Copy, Cut, Colour dots / No colour). Layout: One box, Two columns, Narrow-wide, Wide-narrow, Three columns, 2x2, 2x3; Layout Assist Ctrl/Cmd+Alt+L (docs/features/paper-page.md:281,305). Grid dividers: drag, double tap = equal (paper/GridDividers.tsx).

Mini toolbar (double/triple tap or text Lasso; MiniToolbar.tsx:226-365), E: Colour, Size, Style, B, I, Align, List, Highlight, Link, Cut, Copy, Delete, More (Paste, Make card, Add to Summary, Key point, Save to notes = coming-later toast at 362-365); grip (455), pin (475), Deselect (489).

Micro bar (over the box with caret; MicroBar.tsx:182-312), E: grip, Text colour, Size, Style, B, I, Align, List, Highlight, More (opens Text pill).

iPad keyboard bar (KeyboardBar.tsx:63-96), E: Outdent, Indent, Bullets, Numbers, Checklist, Align (cycles), Underline, Strike, Hide keyboard.

Hold menu (hold still 1.5 s under Text; editor/HoldMenu.tsx:43-98), A: Paste, Select, Select all, Cut, Copy, Insert > Picture / Line.

## 6. Insert (pill order mainTools.ts:86-100; PillContent.tsx:628-670)

| Item                     | What it does                                                   | Code                                             | E/A |
| ------------------------ | -------------------------------------------------------------- | ------------------------------------------------ | --- |
| Table                    | Table block                                                    | editorCommands.ts:151                            | E   |
| Shape                    | Pen in shape mode + Pen card                                   | inkTools.ts:45-53                                | A   |
| Picture                  | Chooser (Photos, Files, Camera, Paste), then placement preview | editorCommands.ts:149; images/PictureChooser.tsx | E   |
| Camera                   | Take photo                                                     | editorCommands.ts:153                            | A   |
| File or PDF              | File block                                                     | editorCommands.ts:152                            | A   |
| Write pad                | Toggle handwriting pad                                         | toolRegistry.ts:339-348                          | A   |
| Handwriting              | Chooser: Write pad / Convert ink (Lasso) / Scribble            | HandwritingChooser.tsx:20-37                     | A   |
| Callout                  | Callout block                                                  | editorCommands.ts:150                            | E   |
| Audio                    | Start/stop recording                                           | toolRegistry.ts:366-374                          | A   |
| Recall card              | Card from selection                                            | editorCommands.ts:144                            | E   |
| Tape / Magnifier / Ruler | See Pen                                                        | inkTools.ts:54-60                                | A   |

No Insert item is coming in code (only print, toolRegistry.ts:131); docs/features/toolbar.md:142 is stale. Ribbon-only insert tools: Database, Divider, Link, Page link, Insert/Save template, Mind map, To Home, Summary.

## 7. New line / Backspace / Keyboard / Mic

| Option                                                                 | What it does                                  | Where                                  | File:line                                  | E/A |
| ---------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------- | ------------------------------------------ | --- |
| New line                                                               | Adds a line, repeatable                       | Main bar                               | MainBar.tsx:228-288; editorCommands.ts:138 | E   |
| Extras: Heading, Checklist, Divider                                    | Special line                                  | Hold 0.6 s (or double-tap) on New line | newLineGesture.ts:17; MainBar.tsx:289-305  | A   |
| Extras trigger hold/double-tap/off; hold 0.4-1 s                       | Setting                                       | Settings > Tool bar                    | mainTools.ts:315-336                       | A   |
| Backspace                                                              | Tap = 1 char; hold repeats, words after 1.5 s | Main bar; mini keys strip              | MainBar.tsx:322-377; backspaceHold.ts      | E   |
| Keyboard                                                               | Show/hide on-screen keyboard                  | Main bar                               | MainBar.tsx:398-449                        | E   |
| Mic                                                                    | Toggles mini keys strip                       | Main bar                               | MainBar.tsx:454-470                        | A   |
| Mini keys strip: Speak to type, Enter, Backspace, grip, snaps to edges | Pencil-friendly keys                          | Strip                                  | MiniKeysStrip.tsx:151-212                  | A   |

## 8. Layers, paper, Read, Undo

| Option                                                                                                     | What it does                                     | Where                                                     | File:line                                                                      | E/A |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------ | --- |
| Ink layers (max 2)                                                                                         | Choose drawing layer                             | Layer chip / Layers card / ribbon Ink layers              | ink/layers.ts; ink/LayersCard.tsx:104-201                                      | A   |
| Per layer: draw here, show/hide, lock, up, down, delete (Undo)                                             | Layer control                                    | Layers card                                               | LayersCard.tsx:118-190                                                         | A   |
| Add layer; Merge top into second (warns); Merge extras                                                     | Layer housekeeping                               | Layers card                                               | LayersCard.tsx:84-103, 202-225                                                 | A   |
| Paper: Blank, Lined, Grid, Dots                                                                            | Page background                                  | Layers card; ribbon Draw > Paper; Page menu > Paper style | LayersCard.tsx:227-234; inkTools.ts:21-26                                      | A   |
| View as drawn                                                                                              | Disabled (reader later)                          | Layers card                                               | LayersCard.tsx:235-241                                                         | A   |
| Paper size A4/Letter; zoom 100-400 %, pinch; page scroll bar                                               | Paper page                                       | Page menu; pill under paper                               | docs/features/paper-page.md:242,256,288                                        | A   |
| Read tool                                                                                                  | Reading mode, no pill                            | Main bar                                                  | selectTool.ts:48-51                                                            | E   |
| Read Aa card: Font, Layout (spacing, margin, width, flow), Themes, More (ruler, hide blanks, All settings) | Reading look                                     | Aa                                                        | DetailCard.tsx:917-1018                                                        | A   |
| Reader tools: Full reader, Line focus, Read aloud, Contents, Hide blanks, Find, Lock to reading, Exit      | Reading extras                                   | Ribbon View / More                                        | toolRegistry.ts (View section)                                                 | A   |
| Undo / Redo                                                                                                | One history for text + ink; Cmd/Ctrl+Z, +Shift+Z | Pinned left of bar                                        | app/tools/HistoryButtons.tsx:24-43; toolRegistry.ts:318-335; ink/inkHistory.ts | E   |

src/layers/ is NOT ink layers: it is the add-on Layers gallery of installable notebook packs (app/spaces/QuietCorner.tsx:13-205).

## Discrepancies

- toolbar.md:142 says Insert items are coming; code shows them all wired.
- Text selection menu: Move, Scale, Rotate, Screenshot dimmed; Convert = later.
- Mini toolbar Save to notes is a coming-later toast (MiniToolbar.tsx:365), while Save to notes in SelectionMenu works.
- Toggle list and View as drawn disabled.
