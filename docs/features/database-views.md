# Database views

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Shows one database in different ways: Table, Board, Calendar, Gallery (and Dashboard, see dashboards.md). Each view keeps its own sorts, filters and settings.

## How it works

- Views are saved records (`DbView`) with a name, a type and a `config`. `addView`, `updateView`, `deleteView`, `restoreView` live in `databaseService.ts`.
- `views/viewTypes.ts` is a registry: table, dashboard, calendar, gallery and board are registered there, so a new view type needs no change to the database screen.
- `views/viewConfig.ts` reads a view's sorts, filters, match (all/any) and hidden columns (`readRowQuery`, `readHidden`). The table sorts by one column at a time and keeps one filter per column.
- `databaseQuery.ts` (`queryRows`) does the sorting and filtering for every view.
- Board (`boardGroups.ts`): groups rows by a Choice or tracker Status column (`groupBy`); dropping a card changes the value and the order in one step; `cardColumns` picks the values shown on cards (3 by default).
- Calendar (`calendarData.ts`): places rows by a date column (`dateColumnId`) in month or week mode.
- Gallery (`galleryTiles.ts`): tiles with an image column (`imageColumnId`) and `cardColumns`.
- A database opens on a chosen view, or automatically on Dashboard once it has rows and Table while empty (`setOpenView`).
- Table extras: column filters (`columnFilters.ts`), a formula preview (`formulaPreview.ts`, `formulaSentence.ts`).

## Edge cases

- Anything in a view's config that is not the expected shape is skipped, so an old or damaged view still opens.
- If the saved board group column no longer exists, the first Choice column is used; the calendar likewise falls back to its first date column.
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
- `src/databases/views/galleryTiles.test.ts`
- `src/databases/views/columnFilters.test.ts`
- `src/databases/views/formulaSentence.test.ts`
- `src/databases/views/numberTyping.test.ts`
- `src/databases/databaseQuery.test.ts`
- `e2e/databaseTable.spec.ts`, `e2e/databases.spec.ts`
