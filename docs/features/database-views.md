# Database views

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Shows one database in different ways: Table, Board, Calendar, Gallery, List (and Dashboard, see dashboards.md). Each view keeps its own sorts, filters and settings.

## How it works

- Views are saved records (`DbView`) with a name, a type and a `config`. `addView`, `updateView`, `deleteView`, `restoreView` live in `databaseService.ts`.
- `views/viewTypes.ts` is a registry: table, dashboard, calendar, gallery and board are registered there, so a new view type needs no change to the database screen.
- `views/viewConfig.ts` reads a view's sorts, filters, match (all/any) and hidden columns (`readRowQuery`, `readHidden`). The table sorts by one column at a time and keeps one filter per column.
- `databaseQuery.ts` (`queryRows`) does the sorting and filtering for every view.
- Board (`boardGroups.ts`): groups rows by a Choice or tracker Status column (`groupBy`); dropping a card changes the value and the order in one step; `cardColumns` picks the values shown on cards (3 by default).
- Calendar (`calendarData.ts`, `calendarSpans.ts`, `calendarMove.ts`): places rows by a date column (`dateColumnId`) in Month, Week or Year range (`mode`). An optional `endColumnId` (another Date column) makes multi-day spans, laid out in lanes per week (`weekLanes`); each day draws at most 3 rows (12 in Week) and "+ N more" opens the full list (windowed). Year shows 12 mini months with dots (`yearMonths`, `dayCounts`). The screen is loaded lazily (`LazyCalendar.tsx`).
- Moving a row's date: drag a chip to another day (`useDragGesture.ts`: mouse and pen after a few pixels, a finger after a 0.35 s hold) or Space, arrows, Space (left/right a day, up/down a week, Escape cancels). `shiftCells` moves the start and end by the same days (UTC-safe; a time keeps its local clock time) and one `setCells` call writes them; the toast Undo writes the old cells back (one step).
- Re-ordering (`useRowReorder.tsx`, `reorderRows.ts`): Table and List rows have a grip; drag it, or Space, Up / Down, Space. Only while the view has no sort; rows stay inside their group. One `placeRow` per move; Undo places the row back next to its old neighbour.
- Gallery (`galleryTiles.ts`): tiles with an image column (`imageColumnId`) and `cardColumns`.
- A database opens on a chosen view, or automatically on Dashboard once it has rows and Table while empty (`setOpenView`).
- Table extras: column filters (`columnFilters.ts`), a formula preview (`formulaPreview.ts`, `formulaSentence.ts`).

## Edge cases

- Anything in a view's config that is not the expected shape is skipped, so an old or damaged view still opens.
- If the saved board group column no longer exists, the first Choice column is used; the calendar likewise falls back to its first date column.
- Rows with no date are not drawn and are counted under the calendar. A span longer than a year is cut at a year. A date that would leave the years 1000-9999 is not moved (a message says so).
- Rows with no value fall into a "No value" board group.
- Deleting a view is soft and can be undone; the last view of a database cannot be deleted (unless the view belongs to a block).

## Security check

- View names are trimmed and capped at 200 characters; filter operators are checked against a fixed list (`FILTER_OPS`); unknown ones are dropped.
- Gallery pictures are used only if the text is an http(s) address or a local image reference, never script or file links (`imageUrl`). An http(s) picture is loaded by the browser from that site when shown.
- No data is sent anywhere by the view logic itself.
- Deleting a view is a soft delete; the database data is untouched.

## Tests

- `src/databases/views/viewConfig.test.ts`
- `src/databases/views/boardGroups.test.ts`
- `src/databases/views/calendarData.test.ts`
- `src/databases/views/calendarSpans.test.ts`, `calendarMove.test.ts`, `reorderRows.test.ts`
- `src/databases/views/galleryTiles.test.ts`
- `src/databases/views/columnFilters.test.ts`
- `src/databases/views/formulaSentence.test.ts`
- `src/databases/views/numberTyping.test.ts`
- `src/databases/databaseQuery.test.ts`
- `e2e/databaseTable.spec.ts`, `e2e/databases.spec.ts`, `e2e/databaseCalendar.spec.ts`, `e2e/rowReorder.spec.ts`

See [database.md](database.md) for the List view, grouping and windowed rows.
