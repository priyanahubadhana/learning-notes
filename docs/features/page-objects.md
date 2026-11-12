# Things inside a page (slice 13, flag `page.objects`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Sources: `docs/plans/app-audit-2026-11-12.md` §3.3 (O1–O16) and §5 batch 2; build-master-plan §2.3 row 2, §3.4 row 13, "Running principles" 2; [database](database.md), [databases](databases.md), [database-views](database-views.md), [mind-map](mind-map.md), [calendar-day](calendar-day.md), [embeds](embeds.md). Design system: `docs/mockups/toolbar-v8/design-study.md` §3.

## Purpose

In plain words: a page can hold more than text: a simple table, a database (a table that can also show as a board, calendar, gallery, list or dashboard), a mind map, a maths formula, a web or video embed, a file, and small blocks such as callouts and toggles. Today each one has its own look and its own menus. This slice gives them one look and one set of controls, adds the missing basics (select several rows, reorder columns, search rows), and lets a simple table grow into a database. Nothing is removed; data stays as it is.

## How it works

### Shared parts used (plan 3.2 row 0g)

| Part                                           | Used for                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| Card / ▾ frame 304 px (picker), 376 px (panel) | Filter, Sort, Group, Search, ⋯, column header card, view picker, node menu |
| Tab row                                        | database view tabs with "+"                                                |
| Object bar                                     | selected table, selected rows, selected mind-map node, selected embed/file |
| Drag with drop-line and ▲▼                     | rows, columns, view tabs, board cards, mind-map nodes                      |
| ✕ field                                        | row search, column name, formula field, embed link                         |
| Tag picker                                     | Choice / Tags columns                                                      |
| Empty state                                    | empty database, empty view, empty calendar day, empty mind map             |
| Time range bar                                 | Calendar screen (Day · Week · Month · Year)                                |
| Sheet (step 2)                                 | Column editor, Chart builder (live chart on top, choices below)            |
| Wizard steps (step 3)                          | CSV import (File · Match columns · Check · Done)                           |
| Context menu strip (step 2)                    | long-press on a row, card, node                                            |
| Dialog set, Toast queue (step 2)               | delete confirmations, Undo                                                 |

No new visual pattern is needed: every surface is a card, sheet, bar or tab row above.

### Sizes, spacing, motion

- Table and database Table share one grid: row height 44 px minimum (touch), cell padding 8 × 12 px, header 13 px semibold soft ink, hairline rules, selected cell 1.5 px accent ring.
- Row and column grips: 20 px visual, 44 pt target, show on hover / when the table is selected.
- Database header: view tabs (tab row), then Filter · Sort · Group · Search · ⋯ as ▾ buttons, 8 px gaps, wraps to "⋯ more" on narrow widths (never sideways scroll).
- Row peek (Pro): side panel 420 px (iPad / PC), full sheet on phone; slides in 240 ms cubic-bezier(.2,.8,.2,1).
- Chart redraw within 150 ms of a change. Mind map zoom 25–400 %, spring back as paper zoom.
- Cards, glow on change (700 ms), press scale .96, reduced motion: as design-study §3.6.

### Unlock switches (new ids to add to `docs/mockups/pro-features.md`, section "Things inside a page")

| id                | Name               | What it does                                                    |
| ----------------- | ------------------ | --------------------------------------------------------------- |
| `obj.tablePlus`   | Table extras       | Header row/column, cell colour, merge, sort, Turn into database |
| `db.moreViews`    | More views         | Gallery, List, Dashboard as tabs; saved views; default view     |
| `db.filtersPlus`  | Filters and groups | Groups, "match any", "is not", several sorts, row search        |
| `db.columnsPlus`  | All column types   | Every column type, formula, rollup, the Column editor           |
| `db.rowTools`     | Row tools          | Peek, select several, duplicate, row menu                       |
| `db.chartBuilder` | Chart builder      | Full chart choices and chart presets                            |
| `cal.morePlus`    | Calendar extras    | Week, Year, choose which databases show                         |
| `mind.plus`       | Mind map extras    | Colours, fold, layouts, export, from headings, style presets    |
| `db.csvPlus`      | CSV options        | Column matching, import modes, export options                   |

Already existing ids used: `tb.insertMore` (Insert › database, mind map, file), `nb.extraTabs` (Database and Mind map page tabs).

### When I do X → Y (one e2e test each)

**Table block (O1)**

- PO-01 When I tap a table → the Object bar shows: Add row, Add column, Delete, ⋯; grips appear on rows and columns.
- PO-02 When I hold a row or column grip → it lifts and a drop-line shows; ▲▼ (or ◀▶) in its menu does the same without dragging.
- PO-03 When I drag a column edge or row edge → it resizes live within 60–600 px (columns) / 24–800 px (rows).
- PO-04 When I type "/" inside a table cell → the "/" menu does not open (audit §8 bug); a toast-free no-op.
- PO-05 **Pro `obj.tablePlus`** When I tap ⋯ › Turn into database → a database with the same rows and columns replaces the table; one Undo turns it back.
- PO-06 **Pro `obj.tablePlus`** ⋯ also offers Header row, Header column, Cell colour, Merge cells, Sort by this column.

**Database block and header (O2, O3)**

- PO-07 When I insert a database (Insert › Database, `tb.insertMore` in Beginner) → the Database picker opens: New, or pick an existing one; the block shows the chosen database.
- PO-08 Beginner → view tabs show Table, Board, Calendar; the other views sit under "More views ▾". **Pro `db.moreViews`** shows all six as tabs.
- PO-09 When I tap "+" after the last view tab → a picker card shows view types as tiles; picking one adds the tab and opens it.
- PO-10 When I hold a view tab → it lifts and can be reordered (drop-line); its menu has Rename, Duplicate, Delete, Move left / right.
- PO-11 When I tap Filter → one filter row in Beginner; **Pro `db.filtersPlus`** adds more rows, "match any / all", "is not".
- PO-12 When I tap Sort → one sort in Beginner; **Pro `db.filtersPlus`** adds several sorts and Group by.
- PO-13 **Pro `db.filtersPlus`** When I type in Search → rows filter as I type (✕ clears); the count shows "N of M".
- PO-14 When a database is empty → the empty state offers "Add a row" and "Import CSV".

**Table view, columns, cells (O4, O5)**

- PO-15 When I tap a column header → a ▾ card opens with Rename, Type, Sort, Filter by this, Hide, Delete; changes show at once and glow.
- PO-16 When I tap "+" at the end of the header → a new Text column is added and its name field is focused.
- PO-17 Beginner column types: Text, Number, Date, Choice, Tick. **Pro `db.columnsPlus`** adds every other type, Formula and Rollup, and "Edit column…" opens the Column editor sheet with a live preview of the column.
- PO-18 When I type a formula → plain-word examples show under the field; an error says what is wrong in plain words, the column keeps its last good value.
- PO-19 When I hold a column header → it lifts and reorders with a drop-line (uses `moveColumn`).
- PO-20 When I tap a cell → its editor opens in place (text field, date card, choice picker, tick toggles at once).
- PO-21 When I show hidden columns (⋯ › Hidden columns) → a list with switches.

**Rows (O9)**

- PO-22 When I tap a row's open button → Beginner opens the row as a full page; **Pro `db.rowTools`** slides it in as a side peek with "Open as page" one tap away.
- PO-23 **Pro `db.rowTools`** When I select several rows (tick column) → an Object bar shows Delete, Duplicate, Set value; one Undo restores all.
- PO-24 When I long-press a row → the Context menu strip: Open, Duplicate (Pro), Delete, Move up, Move down.
- PO-25 When I delete a row → a toast offers Undo.

**Other views (O6, O7, O8)**

- PO-26 Board → cards in columns by a Choice column; drag a card across columns changes its value; ▲▼◀▶ in its menu do the same.
- PO-27 Gallery and List (**Pro `db.moreViews`**) → the same Filter / Sort / Search as Table (fixes "almost no filter or sort").
- PO-28 Database Calendar view → Week / Month / Year with the Time range bar; tap a day → that day's rows.
- PO-29 Dashboard (**Pro `db.moreViews`**) → charts; Beginner picks one of 3 preset charts; **Pro `db.chartBuilder`** opens the Chart builder: live chart on top, choices below; a change redraws within 150 ms.

**Calendar screen (A16, A17)**

- PO-30 When I open Calendar → one screen with journal days and every database's dates, Beginner Month and Day; **Pro `cal.morePlus`** adds Week, Year and "Which databases show".
- PO-31 When I swipe left / right on the Day card → next / previous day; ◀▶ buttons do the same.
- PO-32 An empty day → the empty state with "Write today's note" and "Add a row".

**CSV (O10)**

- PO-33 When I import a CSV → wizard: File → Check → Done, with guessed column types; **Pro `db.csvPlus`** adds Match columns and Add / Replace / Update.
- PO-34 When I export a CSV → it downloads at once (Beginner); **Pro `db.csvPlus`** asks which columns and date format first.

**Page and notebook Database tabs (O11)**

- PO-35 When I open the page or notebook Database tab → the same database header and views as the block.

**Mind map (O12)**

- PO-36 When I tap a node → it is selected with a small Object bar; Tab adds a child, Enter a sibling, Delete or Backspace removes it, and the hint names both keys.
- PO-37 When I drag a node → it moves with a drop-line onto a new parent; one Undo.
- PO-38 When I pinch or use the zoom pill → the map zooms 25–400 %; "Fit" brings it all into view.
- PO-39 **Pro `mind.plus`** Fold a branch (▸ on the node), branch colours, layouts (right, both sides, down), export as picture (the toast says where it went), build from the page's headings.

**Maths, embeds, files, small blocks (O13–O16)**

- PO-40 When I edit a maths block → a live preview shows while I type, with a symbol strip and recent formulas; ✕ cancels, ✓ saves.
- PO-41 When I paste a web or video link as an embed → a preview card shows; if blocked or offline → a plain line "Can't show this here. Open link" with the link.
- PO-42 When I tap a file block → Open, Download, Rename, Delete in the Object bar; an inline video plays in place.
- PO-43 When I add a code block → a language picker ▾ sits on its top bar (fixes the missing picker).
- PO-44 Callout, toggle, quote, divider, day record → same Object bar style; callout colour and icon in a 304 px picker card.

### States

- **Empty:** PO-14, PO-32, empty mind map shows one central node "Main idea".
- **Error:** a failed save keeps the screen as is and shows the shared save notice; a bad formula keeps the last value (PO-18); a broken CSV row is listed in the Check step, never silently dropped.
- **Offline:** all local; embeds show the offline line (PO-41).
- **Phone:** database header collapses to view tabs + one "Filter & sort ▾"; peek becomes a full sheet; tables scroll sideways inside their own frame only (page never scrolls sideways).
- **Dark / sepia:** chart colours from the tokens; grid rules and accent rings keep 3:1 contrast.

### Pencil / touch rules

- Every grip, header, cell, tab and node: 44 pt target.
- A Pencil stroke over a table or database never draws ink inside cells (cells are text targets); handwriting in a cell goes through Scribble only.
- A tap selects; only a hold (300 ms with grow feedback) starts a drag. Scrolling inside a database never selects rows.
- While any row, column, card or node is dragged, the gesture router locks everything else (as slice 0).

## Nothing lost (inventory)

| Today's feature                                                           | Where now (file:line)                                                                     | Where in the new design           |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- |
| Table grips, add / remove rows and columns                                | `src/editor/schema.tsx:217-243`                                                           | PO-01, PO-02                      |
| Table row / column resize, limits                                         | `src/editor/tableResize.ts:10-13, 83`                                                     | PO-03                             |
| Database block                                                            | `src/databases/DatabaseBlockView.tsx:29`, `schema.tsx:73`                                 | PO-07                             |
| Database picker                                                           | `src/databases/DatabasePicker.tsx:26`                                                     | PO-07                             |
| Databases hub, starter databases, database screen                         | `src/databases/DatabasesHub.tsx:32, 138`                                                  | kept; header as PO-08–PO-14       |
| View switcher, Add view, View options, Group by                           | `src/databases/views/DatabaseView.tsx:29`, `GroupSelect.tsx:6`                            | PO-08–PO-12                       |
| Table view, inline editor, tick, star, pills, option picker, picture cell | `src/databases/views/TableView.tsx:121`, `TableCells.tsx:28-350`                          | PO-15–PO-20                       |
| Column menu, resizer, hidden columns                                      | `src/databases/views/ColumnMenu.tsx:26`, `ColumnResizer.tsx:16`                           | PO-15, PO-21                      |
| Column editor, formula helper                                             | `src/databases/views/ColumnDialog.tsx:137`, `FormulaHelper.tsx:11`                        | PO-17, PO-18                      |
| Row grip and drag ghost                                                   | `src/databases/views/RowGrip.tsx:23`, `DragGhost.tsx:8`                                   | PO-24 + shared drag               |
| Board, Gallery, List views                                                | `BoardView.tsx:107`, `GalleryView.tsx:33`, `ListView.tsx:33`                              | PO-26, PO-27                      |
| Calendar view Week / Month / Year, day list                               | `CalendarView.tsx:110`, `CalendarYear.tsx:15`, `CalendarDayList.tsx:13`                   | PO-28                             |
| Dashboard, chart dialog, chart body                                       | `src/databases/dashboard/DashboardView.tsx:38`, `ChartDialog.tsx:112`, `ChartBody.tsx:21` | PO-29                             |
| Row page and properties panel                                             | `src/databases/RowProperties.tsx:48`                                                      | PO-22                             |
| CSV import dialog, export, modes, mapping                                 | `src/databases/CsvImportDialog.tsx:41`, `csvTransfer.ts:48-356`                           | PO-33, PO-34                      |
| Tracker cells (status, pin, levels)                                       | `src/databases/views/TrackerCells.tsx:26-118`                                             | kept inside Table cells           |
| Page / notebook Database tab                                              | `src/pages/tabs/DatabaseTab.tsx:14`                                                       | PO-35                             |
| Calendar screen and Day card with swipe                                   | `src/databases/CalendarScreen.tsx:51`, `CalendarDayCard.tsx:20`                           | PO-30–PO-32                       |
| Mind map block, host, toolbar, keys                                       | `src/editor/mindMap/MindMapView.tsx:59`, `MindMapHost.tsx:17`                             | PO-36–PO-39                       |
| Mind map tab                                                              | `src/pages/tabs/MindMapTab.tsx:22`                                                        | PO-36–PO-39                       |
| Maths block and editor                                                    | `src/editor/math/MathEditor.tsx:48`, `MathHost.tsx:18`, `MathView.tsx:9`                  | PO-40                             |
| Embed block, stamp watcher                                                | `src/editor/embed/EmbedView.tsx:115`, `StampWatcher.tsx:24`                               | PO-41                             |
| File block, inline video                                                  | `src/editor/fileBlock/FileView.tsx:36`, `InlineVideo.tsx:8`                               | PO-42                             |
| Callout, page link, card, card list blocks                                | `src/editor/schema.tsx:34-130`                                                            | PO-44                             |
| Database pop-over primitives                                              | `src/databases/views/Popover.tsx:10-99`                                                   | replaced by the shared card frame |
| Service `moveColumn` (no UI today)                                        | `src/databases/databaseService.ts:588`                                                    | PO-19                             |

## Won't do

Sharing a database with other people, live links to outside spreadsheets, a timeline (Gantt) view, real-time collaboration, AI inside cells.

## Build order (sub-slices, one commit each, behind `page.objects`)

| #   | Sub-slice (audit ids)                      | Files it owns                                                                                             |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 13a | O1 table block + Turn into database        | `src/editor/schema.tsx` (table part), `tableResize.ts`, new `src/editor/table/TableBar.tsx`               |
| 13b | O2, O3 database header, view tabs, picker  | `src/databases/views/DatabaseView.tsx`, `GroupSelect.tsx`, `DatabasePicker.tsx`, new `DatabaseHeader.tsx` |
| 13c | O4, O5 table view, columns, cells          | `TableView.tsx`, `TableCells.tsx`, `ColumnMenu.tsx`, `ColumnDialog.tsx`, `FormulaHelper.tsx`              |
| 13d | O9 rows: peek, bulk select, row menu       | `RowProperties.tsx`, `RowGrip.tsx`, new `RowPeek.tsx`                                                     |
| 13e | O6, O7 board, gallery, list, calendar view | `BoardView.tsx`, `GalleryView.tsx`, `ListView.tsx`, `CalendarView.tsx`, `CalendarYear.tsx`                |
| 13f | O8 dashboard and chart builder             | `src/databases/dashboard/*`                                                                               |
| 13g | O10, O11 CSV wizard, Database tabs         | `CsvImportDialog.tsx`, `src/pages/tabs/DatabaseTab.tsx`                                                   |
| 13h | A16, A17 Calendar screen                   | `CalendarScreen.tsx`, `CalendarDayCard.tsx`                                                               |
| 13i | O12 mind map                               | `src/editor/mindMap/*`, `src/pages/tabs/MindMapTab.tsx`                                                   |
| 13j | O13–O16 maths, embed, file, small blocks   | `src/editor/math/*`, `embed/*`, `fileBlock/*`, `schema.tsx` (callout/code part)                           |

13a and 13j both touch `schema.tsx`: run them one after the other, never side by side.

## Security check

CSV and pasted links are untrusted: CSV size cap and cell length cap kept (`csvTransfer.ts`); embed links only `https:`, shown in a sandboxed frame from the allow-list in `embeds.md`; formula text never runs as code (existing parser only). No new storage tables; Turn into database uses the existing database service.

## Tests

- Unit: Turn into database (and back) keeps every cell; bulk delete Undo; column reorder; formula error keeps last value; CSV wizard mapping.
- e2e (Chromium and `ipad-webkit`): one per line PO-01 to PO-44.
- Screenshots: Beginner / Professional × light / dark × iPad landscape / portrait / phone / PC for table, each database view, peek, chart builder, Calendar screen, mind map.
- "Nothing lost" probe: every inventory row. Flag OFF = today's screenshots.
- Accessibility: grid roles for tables, labelled grips, keyboard row/column move (Alt+arrows), focus kept in sheets.
- Performance: a 5,000-row database scrolls at 60 fps (virtual rows kept).

## Owner iPad check (3 steps)

1. Make a table, hold a column grip and drag it; then ⋯ › Turn into database (turn on "Table extras" first in Beginner).
2. In the database, tap "+" after the view tabs, add a Board, drag a card to another column, then Undo.
3. Open a mind map, tap a node, press Tab and Enter on the keyboard, pinch to zoom, tap Fit.

## Decisions to review

1. **New unlock ids** (table above) because `pro-features.md` has none for these surfaces; total goes from 169 to 178. Needs adding to that file and to Settings › Professional features.
2. **Insert › Database is in Beginner** although `tb.insertMore` lists database under "more kinds": a Beginner can already reach databases from the hub, so hiding the insert would drop a path. Safest: show Database, Mind map in Beginner Insert; keep File, audio etc. behind `tb.insertMore`.
3. **Row search is Professional** (audit split) though the owner asked for "basics": Beginner gets it by unlocking `db.filtersPlus`.
4. **Phone tables scroll sideways inside their own frame** (no other way to show wide tables); the page itself never scrolls sideways.
5. **Calendar screen keeps the Day card swipe** and adds ◀▶ buttons for Pencil users.
6. **Code block language picker** added in 13j (fixes a promise the app makes today).
