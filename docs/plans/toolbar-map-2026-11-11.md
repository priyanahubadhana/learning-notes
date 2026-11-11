# Toolbar map (from the code, 11 Nov 2026)

All paths are relative to `C:\Users\pc\Downloads\learning-notes\`. Line numbers are from the working copy on `main`.
"Dup" = the same action is also reachable from another place.

## 0. How the pieces fit (one paragraph)

`DockedBar.tsx` draws everything. `barLayout()` (`src/app/tools/barLayout.ts:16-27`) decides which of two bars show: the **short bar** (called "main bar" in code, `MainBarRow`) and the **ribbon** (`Ribbon.tsx`). Inputs: "Formatting bar position" (`advanced.barPlacement`; the value `floating` means the bar is OFF), `ribbonOpen`, `ribbonMode` (replace / both) and `ribbonPlace`. Around the bars sit: the options pill + detail card, the contextual row, three floating text bars (mini toolbar, micro bar, BlockNote's own toolbar), the keyboard bar, the mini keyboard strip, the box bar, and three trays (⋯ menu, More, Bar settings) plus the Edit toolbar sheet.

## 1. Defaults (a fresh device)

| Thing | Default | Where |
| --- | --- | --- |
| Tool bar | On, docked at the top, in all three device modes | `src/app/deviceMode.ts:41-63` |
| Bar size | Computer = Compact (36 px), Touch = Normal (44), Pencil = Large (54) | `src/app/deviceMode.ts:41-70` |
| Layout | Short bar (ribbon closed) | `src/app/tools/toolbarState.ts:59` |
| Ribbon display / size / position | Replaces short bar / Full / Same as short bar | `toolbarState.ts:210-231` |
| Ribbon tools | Close after use | `toolbarState.ts:66` |
| Ribbon tabs hidden | None (all six show) | `toolbarState.ts:74-78` |
| Main bar tools | Text, Pen, Highlighter, Eraser, New line, Backspace, Lasso, Insert, Read (9) | `src/app/tools/main/mainTools.ts:16-26, 181-183` |
| Selected tool at start | Text; Lasso in Pencil mode (plus "Last tool" pinned once) | `mainTools.ts:106`; `src/settings/deviceModeSettings.ts:62-66` |
| Options pill | Closed; opens on tool tap; not pinned | `mainTools.ts:109-112` |
| Show names under icons | Off | `mainTools.ts:149` |
| Mini keyboard strip | Off | `src/app/tools/main/miniKeys.ts:13` |
| Button tips / Shortcut hints | On in Computer, off in Touch and Pencil | `deviceMode.ts:41-63` |
| Hide the bar when idle | Off | `deviceMode.ts:41-63` |
| Toolbar: finger only / Pencil picks Pen | Off / Off | `mainTools.ts:345-348` |
| New line extras | Press and hold, 0.6 s | `mainTools.ts:321-336` |
| Auto switch (device mode) | Pencil only | `src/settings/builtinSettings.ts:589-597` |

Count on the default bar: Undo, Redo + 9 tools + Keyboard + Mini keyboard + ⋯ = **14 buttons** (15 in Pencil mode).

## 2. Surfaces

### 2.1 Main tool bar (code: "short bar" / "main bar"; screen-reader name "Formatting")

File: `src/app/tools/main/MainBar.tsx`. Drawn by `DockedBar.tsx:283-308`.

| Item (name shown) | What it really does | Line | Dup |
| --- | --- | --- | --- |
| Undo, Redo (own small pill, left) | `runHistory` on the page editor | `MainBar.tsx:146-174`; `toolRegistry.ts:318-335` | Ribbon left edge; reader ink bar; keyboard |
| Text | Becomes the mode, opens the Text options pill | `MainBar.tsx:83-131`; `selectTool.ts:25-54` | Ribbon Home tab |
| Pen | Mode + Pen pill | same | Ribbon Draw › Pens (5 pen types) |
| Highlighter | Mode + pill | same | Ribbon Draw › Tools; Home › Colors › Highlight (text highlight, a different thing with a similar name) |
| Eraser | Mode + pill | same | Ribbon Draw › Tools |
| New line | Tap adds a line; hold opens Heading / Checklist / Divider | `MainBar.tsx:227-310` | Ribbon Home › Lists; ⋯ menu list; mini keyboard ↵; keyboard Enter |
| Backspace | Deletes a character, hold repeats | `MainBar.tsx:314-380` | Mini keyboard ⌫ |
| Lasso | Mode + pill | `MainBar.tsx:83-131` | Ribbon Draw › Tools |
| Insert | Opens the Insert pill only (not a mode) | `selectTool.ts:31-38` | Ribbon Insert tab; press-and-hold menu › Insert |
| Read | Turns Reading mode on (no pill) | `selectTool.ts:47-51` | Ribbon View › Reading mode / Exit reading |
| (pinned tools) | Any registry tool pinned from search or Edit toolbar | `MainBar.tsx:176-189` | By definition |
| Keyboard (⌨) | Shows/hides the on-screen keyboard; switches to Text first | `MainBar.tsx:399-452` | Keyboard bar ✕ (hide) |
| Mini keyboard (mic icon) | Shows/hides the mini keyboard strip | `MainBar.tsx:455-473` | none |
| Toolbar menu (⋯) | Opens the ⋯ tray | `MainBar.tsx:193-214` | none |

Notes:
- New line and Backspace sit between Eraser and Lasso, in the middle of the drawing tools (`mainTools.ts:16-26`).
- Bar size: the main bar forces at least 44 px (`MainBar.tsx:80`), so **Compact and Normal look the same on the main bar**; only Large changes it. Compact only shrinks ribbon tool buttons.
- Phone: wraps to two rows (`MainBar.tsx:149, 175`).

### 2.2 Toolbar menu (⋯ on the main bar)

File: `src/editor/DockedBar.tsx:369-459`.

| Item | Does | Line | Dup |
| --- | --- | --- | --- |
| Edit toolbar… | Opens the Edit toolbar sheet (arrange main bar + pinned tools) | `:376-378` | Also at the bottom of the More tray (`:349-357`) |
| All tools | Opens the ribbon (saved: the app now starts with the ribbon) | `:379-383`, `:174-180` | Settings › Tool bar layout = Ribbon |
| Search all features | Opens the control panel (tool + settings search) | `:384-392` | Ribbon search icon; tool `controlPanel` |
| Done | Clears the selection and closes the tray | `:393-395`, `:232-235` | Tap on empty page |
| Bar settings… | Opens the OLD Edit bar panel (2.4) | `:396-398` | Settings › "Edit bar…" button |
| Copy as plain text / Copy as Markdown / Paste as plain text / Copy page with pictures | Clipboard helpers | `:400-436` | Page ⋯ menu; Home › Copy & paste (which just opens this menu, `toolRegistry.ts:173-179`) |
| Reset bar position | Only when a bar floats | `:437-447` | Double-click on the ⠿ handle |
| Then the whole formatting list: Bold, Italic, Underline, Strike, Code, each Revise mark, Make blank, Make card, New line, Align left/center/right, Colors ▸, Indent, Outdent, Link | Same actions as everywhere else | `:449-457`; list in `barActions.tsx:93-106` | Text pill, ribbon Home, More tray (identical list), mini toolbar, micro bar, keyboard bar |

### 2.3 "More" tray (More formatting)

`DockedBar.tsx:319-359`. Opened by ribbon Home › More formatting and Insert › Link (`toolRegistry.ts:254-260, 398-404`). Holds: block type select, **the same formatting list as the ⋯ menu**, picture file buttons, and Edit toolbar… again. Fully duplicated.

### 2.4 Bar settings panel (title on screen: "Edit bar")

`src/editor/EditBarPanel.tsx:169-383`. Three names for one thing: menu says "Bar settings…", the panel title says "Edit bar", Settings says "Edit bar (tools and options)".

| Section | Does | Line | Dup |
| --- | --- | --- | --- |
| Main bar (tick, drag, ↑↓) | Shows/hides/reorders the 9 main tools | `:197-204` | Edit toolbar sheet |
| Options of [tool] + "Arrange these options…" | Shows/hides/reorders a pill's options | `:205-238` | Edit pill sheet (opened from here) |
| Pinned tools | Unpin / reorder | `:239-287` | Edit toolbar sheet |
| Ribbon tabs to show | Hides ribbon tabs | `:289-316` | **Only place** |
| Size | Compact / Normal / Large | `:318-333` | Settings › Formatting bar size |
| Position | Top / Bottom / Floating | `:334-351` | Settings › Formatting bar position |
| Hide while not selecting or typing | Auto-hide | `:352-360` | Settings › Advanced › Hide the bar when idle |
| Reset | Main bar, pill place, mode preset | `:361-372` | Settings › Reset tool bar (wider) |

### 2.5 Edit toolbar sheet

`src/app/tools/main/EditToolbarSheet.tsx:41-58` (+ `EditListSheet.tsx`). One list: main tools and pinned tools together; every other tool of the app under "More tools" with a find box; drag, ↑↓, +/−; Done / Cancel / Reset. Same sheet arranges one pill's options (`:62-85`) and the Lasso menu row.

### 2.6 Options pill + detail card

`src/app/tools/main/OptionsPill.tsx:57-71`, contents `PillContent.tsx`, card `DetailCard.tsx`. Only exists while the short bar shows (`DockedBar.tsx:507-511`).

| Pill | Options (default order) | Line |
| --- | --- | --- |
| Text | Style, Font, Size, Line spacing, Bold, Italic, Underline, Text colour, Highlight colour, List, Alignment, Key point | `mainTools.ts:68-81` |
| Pen | Pen type, Thickness, Colour, Favourite pens | `:82` |
| Highlighter | Thickness, Colour, Favourites | `:83` |
| Eraser | Mode, Size, Erase highlights only | `:84` |
| Lasso | Shape, What the lasso picks | `:85` |
| Insert | Table, Shape, Picture, Camera, File or PDF, Write pad, Handwriting, Callout, Audio, Recall card, Tape, Magnifier, Ruler | `:86-100` |

Pill chrome: ⠿ grip (drag, snaps to 4 edges), 📌 "Keep these options open" (`OptionsPill.tsx:268-274`, saved `toolbar.pillPinned`), ✕. Dup: every Text option is also in the ribbon Home tab; every ink option is also in ribbon Draw › Style.

### 2.7 Ribbon (shown to the user as "All tools"; Settings calls it "Ribbon")

`src/app/tools/Ribbon.tsx`. Tabs in `tabs.ts:2-9`, groups in `toolRegistry.ts:728-744`, tools in `toolRegistry.ts:110-683`.

Ribbon chrome:

| Item | Does | Line | Dup |
| --- | --- | --- | --- |
| Undo, Redo (pinned left) | as main bar | `Ribbon.tsx:193-221` | Main bar |
| Tabs File, Home, Insert, Draw, View, Review | Tap shows that tab's tools; tap again closes them | `:241-267`, `:94-101` | – |
| Extra coloured tab (Picture / Video / Table / Drawing / Text) | Appears when that thing is selected | `:268-291` | Contextual row (2.8) |
| Pin icon ("Tools close after use" / "Tools stay open") | Toggles stay-open | `:297-310` | Settings › Ribbon tools; View › Keep tools open; Ctrl/Cmd+F1 (4 ways) |
| Search icon | Search all features | `:313-324` | ⋯ menu; tool `controlPanel` |
| ⋯ "Ribbon options" | How it shows / Size / Position / Reset ribbon | `RibbonOptions.tsx:81-112` | Settings › Ribbon display, size, position (exact copy) |
| "Short bar" (or "Hide ribbon" when both show) | Closes the ribbon | `Ribbon.tsx:326-341` | Settings › Tool bar layout |

Tabs and their tools:

| Tab | Groups → tools | Notes / Dup |
| --- | --- | --- |
| **File** | Save & restore; Share: Share, Print / PDF (coming); Import: Anki import; Protect: Lock page, Lock notebook, Lock settings; App: Settings | Save & restore, Share and Anki import all open the same Data screen (`toolRegistry.ts:112-139`). Lock settings and Settings both open Settings (`:154-167`) |
| **Home** | (Undo & redo: hidden, pinned left); Text style: Heading 1-3, Quote; Font & size: Font, Text size; Format: Bold, Italic, Underline, Strikethrough, Code; Colors: Colors, Highlight; Lists & alignment: Bulleted, Numbered, Checklist, Align left/center/right, Indent, Outdent, New line; More formatting: More formatting, Make blank, Layout; Copy & paste | Revise marks (Key point, Keyword …) are registered under Home › Study but that group is not in the Home tab list (`toolRegistry.ts:688-695, 730-739`), so they are reachable only from search, pinning, the ⋯ list and the selection bars. Font and Text size open the Reading settings panel (`:238-253`) and show again in View. Copy & paste only opens the ⋯ menu. Whole tab duplicates the Text pill |
| **Insert** | Media: Picture, Write pad, Handwriting to text, Audio, File, Camera; Blocks: Table, Database, Callout, Divider, Link, Link to a page; Templates: Insert template, Save page as template; Visual: Mind map; Study: Send to Home, Make card, Summary | Duplicates the Insert pill (pill has 13, tab has 18; Database, Divider, Link, templates, Mind map, Send to Home, Summary are tab-only; Shape, Tape, Magnifier, Ruler are pill + Draw tab) |
| **Draw** | Pens: Ball pen, Fountain pen, Marker, Brush, Pencil; Tools: Last tool, Highlighter, Eraser, Lasso, Shapes, Tape, Magnifier, Ruler, Ink layers; Style: Ink color, Thickness, Opacity, Pressure effect, Smoothing, Tapered ends; Paper: Blank, Lined, Grid, Dot; Pencil: Only the Pencil draws | Duplicates main bar tools + Pen/Highlighter pills and cards |
| **View** | Reading: Reading mode, Full-screen reader, Line focus, Read aloud, Contents and bookmarks, Self-test (hide blanks), Find, Lock, Exit reading; Views: Audio list, Databases, All cards, Calendar; Text: Font, Text size; Look: Theme, Zoom; Tool bar: "Tool bar on or off", Keep tools open | Font, Text size and Zoom all open the same panel (`:238-253, 572-578`). Find = Search (`:530-536, 637-644`). "Tool bar on or off" has the id `shortBar` but hides the WHOLE bar (`:579-586`), while the ribbon's "Short bar" button only closes the ribbon |
| **Review** | Cards: Study now, Due today, All cards, Make card; Summary: Summary; Stats: Card stats | Study now and Due today do the same thing when no page is open (`:597-611`). Make card and Summary also in Insert. All cards also in View |
| (Go to: not on the ribbon) | Today, Search, Calendar, Favourite this page, Show the menu, Search all features, Choose device type | Search-only (`:628-682`) |

### 2.8 Contextual strips

`src/app/tools/context/`. Kinds and priority: picture, video, table, ink, text (`contextStore.ts:10-16`).

| Where | What shows | Line | Dup |
| --- | --- | --- | --- |
| Ribbon: extra tab | Full strip, text buttons 44 px with names | `ContextStrip.tsx:45-78` | – |
| Short bar: a row floating under the bar ("compact bar" in code) | Kind name + first 3 actions + **More** | `ContextStrip.tsx:84-124` | Ribbon tab |
| **Picture** | Smaller, Bigger, Fit, Fit page, Natural size, Resize handles; Crop/rotate, Replace; Align left/center/right; Copy, Cut, Duplicate, Delete, Deselect; caption field | `stripItems.ts:68-101` | Picture handles; BlockNote file buttons in More tray |
| **Video** | Open link, Copy link; Duplicate, Delete | `:102-122` | – |
| **Table** | Copy as Markdown, Duplicate, Delete | `:123-125` | – |
| **Drawing** (Lasso selection) | Copy, Cut, Duplicate, Delete, Deselect | `:126-150` | Lasso's own selection menu (`SelectionMenu.tsx`, ink menu) |
| **Text** | Bold, Italic, Underline, Colors, Link (ribbon only; the short bar shows no row for text) | `:151`; `ContextStrip.tsx:89-90` | Mini toolbar and 6 other places |

Side effect worth knowing: **More** on the compact row calls `openFullOnContext()` which sets `ribbonOpen = true` (`stripItems.ts:171-175`), and `ribbonOpen` is a saved preference (`toolbarState.ts:59`). So one tap on More permanently switches the app's layout to the ribbon until the user taps "Short bar".

### 2.9 Floating bars for text (five of them)

| Surface | When it shows | Buttons | File:line | Dup |
| --- | --- | --- | --- | --- |
| **Mini toolbar** ("Selection tools") | Text selected by double/triple tap, hold or Lasso | Colour, Size, Style, B, I, Align, List, Highlight, Link, Cut, Copy, Delete, ⋯ (Paste, Make card, Summary, Key point, Save to notes); ⠿ grip, 📌 pin, ✕ | `MiniToolbar.tsx:226-362, 440-503`; prefs `miniBarPrefs.ts:22-27` | Text pill, Home tab |
| **Micro bar** ("Text formatting") | After typing a character with the Text tool, when the Text pill is closed and the on-screen keyboard is down | ⠿, Colour dot, Size number, Aa style, B, I, Align, List, Highlight, ⋯ (opens the Text pill) | `MicroBar.tsx:84-91, 194-314` | Subset of the Text pill |
| **Keyboard bar** | On-screen keyboard is up (inset > 150 px); replaces the micro bar | Outdent, Indent, Bullets, Numbers, Checklist, Align, B, I, U, S, Hide keyboard | `KeyboardBar.tsx:70-98`; mount `DockedBar.tsx:499-503` | Home tab, Text pill |
| **BlockNote floating toolbar** | Only when the tool bar is off, or in Computer mode (as an extra) | BlockNote's default formatting items + Edit picture + one button per Revise mark + Make blank + Make card + Add to Summary | `PageEditor.tsx:922-926`; `SelectionToolbar.tsx:112-124` | Everything |
| **Box bar** | Under a tapped text box | Text colour, size, font, B, I, align, list, Cut, Duplicate, Delete, ⋯ (applies to the whole box) | `src/paper/BoxBar.tsx:38` | Text pill |

No Settings option turns any of these on or off. Three separate pins exist: options pill 📌, mini toolbar 📌, ribbon pin.

### 2.10 Mini keyboard strip

`MiniKeysStrip.tsx`, state `miniKeys.ts:13-20`. Mic (speak to type), ↵ New line, ⌫ Backspace; ⠿ grip, snaps to an edge (default: right side). Toggled only by the mic button on the main bar. Dup: New line and Backspace are also on the main bar by default.

### 2.11 Show-toolbar control and on/off

| Control | Does | Line |
| --- | --- | --- |
| Top-bar accent pill "Show tool bar" | Only while the bar is off; turns it back on where it last sat | `src/app/TopBar.tsx:126-135`; `toolbarVisibility.ts:38-41, 85-91` |
| Page ⋯ menu › Show tool bar / Hide tool bar | Toggle (hiding asks first, then offers Undo) | `src/pages/PageView.tsx:391-395`; `toolbarVisibility.ts:55-79` |
| Ribbon View › "Tool bar on or off" | Same toggle | `toolRegistry.ts:579-586` |
| Settings › Show tool bar | Same | `toolbarSettings.ts:61-78` |
| Settings › Formatting bar position = "Off" | Legacy value `floating`; only listed when already chosen | `EditBarPanel.tsx:343-345`; `deviceMode.ts:12-17` |

"Off" is stored as placement `floating`, while a bar that really floats is placement `free` (`deviceMode.ts:12-18`). Confusing in code, and the label "Floating" is used for `free`.

### 2.12 Other small bars (not part of this reorganisation, listed for completeness)

Press-and-hold menu (`src/editor/HoldMenu.tsx`: Paste, Select, Select all, Cut, Copy, Insert ▸), Lasso selection menu (`SelectionMenu.tsx`), reader ink bar (`src/reader/ReaderInkBar.tsx`), Layout mode strip (`src/paper/LayoutModeBar.tsx`), "changed on two devices" bars (`ClashBars.tsx`), hover names (`HoverName.tsx:24`), Device mode button in the top bar (`DeviceModeMenu.tsx`).

## 3. Settings that control the toolbar

Settings › **Tool bar** shows 18 rows (14 of its own, 4 shared).

| # | Label shown | Choices (default first in bold) | What it really writes | File:line | Dup / issue |
| --- | --- | --- | --- | --- | --- |
| 1 | Show tool bar | **On** / Off | Placement ↔ `floating`; asks before Off | `toolbarSettings.ts:61-78` | 4 other ways (2.11) |
| 2 | Tool bar layout | **Short bar** / Ribbon | `ribbonOpen` | `:83-106` | ⋯ › All tools; ribbon "Short bar" button; context More |
| 3 | Ribbon tools | **Tools close after use** / Tools stay open | `stayOpen` | `:111-131` | Ribbon pin; View › Keep tools open; Ctrl+F1 |
| 4 | Ribbon display | **Ribbon replaces short bar** / Ribbon + short bar | `ribbonMode` | `:134-154` | Ribbon options menu |
| 5 | Ribbon size | **Full (icons and names)** / Slim (one row of icons) | `ribbonSize` | `:157-177` | Ribbon options menu |
| 6 | Ribbon position | **Same as short bar** / Top / Bottom / Floating | `ribbonPlace` | `:180-203` | Ribbon options menu |
| 7 | Edit bar (tools and options) [Edit bar…] | button | Opens the Bar settings panel (2.4), needs an open page | `:206-225` | ⋯ › Bar settings…; comment still says "Write · Draw · Read sets" |
| 8 | New line extras | **Press and hold** / Double-tap / Off | `newLineExtras` | `:227-249` | – |
| 9 | New line hold time | 0.4 / **0.6** / 0.8 / 1 s | `newLineHoldMs` | `:251-272` | – |
| 10 | Pencil picks the Pen tool | On / **Off** | `penPicksPen` | `:274-288` | – |
| 11 | Toolbar: finger only | On / **Off** | `fingerOnlyBars` | `:290-305` | – |
| 12 | Show names under icons | On / **Off** | `showNames` | `:307-321` | Overlaps Ribbon size Full (names) |
| 13 | Options pill position [Reset position] | button | Clears `pillPlace` | `:323-340` | Part of Reset tool bar |
| 14 | Reset tool bar | button | Mode preset, main bar, pills, pins, tabs, ribbon, positions; bar back on | `:343-379` | 5 smaller resets elsewhere |
| 15 | Device mode (shared from General) | Computer / Touch / Pencil | Applies a preset of size, tips, hints, auto-hide | `builtinSettings.ts:342-366` | Top bar button; page ⋯ menu. (Owner: leave as is) |
| 16 | Formatting bar position (shared from Advanced) | **Top** / Bottom / Floating | `advanced.barPlacement` | `builtinSettings.ts:368-392` | Bar settings panel |
| 17 | Formatting bar size (shared from Advanced) | Compact / Normal / Large (default by mode) | `advanced.barSize` | `builtinSettings.ts:394-411` | Bar settings panel. No visible effect on the main bar between Compact and Normal |
| 18 | Auto switch (shared from Advanced) | **Pencil only** / Both ways / Off | Device mode auto switch | `builtinSettings.ts:589-610` | (Owner: leave as is) |

Toolbar options that live ONLY in Settings › Advanced (not listed under Tool bar):

| Label | Default | File:line |
| --- | --- | --- |
| Button tips | On in Computer mode | `builtinSettings.ts:413-422` |
| Shortcut hints | On in Computer mode (also on once a real keyboard is used) | `builtinSettings.ts:424-433` |
| Hide the bar when idle | Off | `builtinSettings.ts:474-487` |

Toolbar options with NO Settings row at all (only a button on the surface itself): ribbon tabs to show (Bar settings panel), keep options pill open (📌), keep mini toolbar in place (📌), mini keyboard strip on/off (mic button), positions of the pill / mini toolbar / micro bar / mini keys / floating bars (drag).

## 4. Naming problems found

- One bar, six names: "Tool bar" (Settings), "Toolbar" (⋯ menu "Edit toolbar", "Toolbar menu", "Toolbar: finger only"), "Formatting bar" (position, size), "Formatting" (its screen-reader name), "Short bar" (layout, ribbon button), "Main bar" (Bar settings panel), "compact bar" (code).
- One bar, three names: "Ribbon" (Settings), "All tools" (⋯ menu), "full tool bar" (docs/code).
- "Compact" means a bar size; "Slim" means a ribbon size; "Short bar" means the non-ribbon layout. The owner's "Compact view" could be any of the three.
- "Edit bar…", "Edit toolbar…", "Bar settings…" are three entries for two overlapping editors.
- "Floating" = a bar that floats (new) and, in old stored values, "Off".
- "Highlight" (text background) vs "Highlighter" (ink tool); "Pencil" (a pen type) vs "Pencil" (Apple Pencil group in Draw).
- "Tool bar on or off" has the id `shortBar`; the ribbon's "Short bar" button does something else.

## 5. Duplicate count for common actions

| Action | Places |
| --- | --- |
| Bold / Italic | Text pill, ribbon Home, ⋯ menu list, More tray, mini toolbar, micro bar, keyboard bar, BlockNote toolbar, Text context tab, box bar (10) |
| New line | Main bar, ribbon Home, ⋯ menu list, More tray, mini keyboard, keyboard bar via Enter (6) |
| Tool bar on/off | 5 (see 2.11) |
| Keep ribbon tools open | 4 |
| Ribbon display/size/position | 2 each (Settings + ribbon ⋯) |
| Bar size / position / auto-hide | 2 each (Settings + Bar settings panel) |
| Reset | 6: Settings Reset tool bar, Bar settings Reset, Edit toolbar Reset, Reset ribbon, Options pill Reset position, Reset bar position |
| Arrange the main bar | 2 (Edit toolbar sheet, Bar settings panel) |

## 6. What a "layout" is today (matters for presets)

Already saved and synced as one record (`src/app/tools/main/layoutSync.ts`, `LayoutValue`): main bar tools, each pill's options, pinned tools, the combined order, pen favourites. NOT in that record (each is a separate per-device preference): ribbon open/mode/size/position, stay open, hidden tabs, show names, bar size, bar position, auto-hide, pill pinned, pill position, mini keyboard on, button tips, shortcut hints. A preset system would need to bundle these.

Old storage still present but unused by the screen: the Write/Draw/Read tool sets (`toolbarState.ts:18-106`, keys `formatBar.pinned.draw/read`), kept only for a one-time migration.
