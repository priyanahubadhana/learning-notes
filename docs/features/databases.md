# Databases

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

See also [database.md](database.md) (database pages, List view, search).

## Purpose

Lets a user keep structured lists (drugs, books, habits) as databases. Each row is a full page, so it can also hold notes, cards, links and tags. Everything is stored on the device.

## How it works

- `databaseService.ts` holds all changes: databases, columns, views, rows and cells. UI code calls it, not the database directly.
- A database has columns plus a built-in title column (`TITLE_COLUMN_ID`, default name "Name"). A new one gets three views: Table, Dashboard, Board (`createDatabase`).
- Rows are pages (`Page.databaseId`, values in `Page.values`). A database outside a notebook keeps its rows in a hidden "Databases" notebook.
- Column types are registered in `columnTypes.ts`: text, number, date, checkbox, choice, choices, url, relation, formula, rollup, plus tracker types. Each type cleans its input before storing (`normalize`).
- Changing a column type does not rewrite values; they are read as the new type, so changing back shows them again (`changeColumnType`). Relations cannot change type.
- Formulas: `formula/formulaParser.ts` makes a tree, `formulaEval.ts` walks it with a fixed function list (`FORMULA_FUNCTIONS`). Columns are written `[Name]`. Renaming a column rewrites formulas that use it (`renameReference`).
- Relations (`addRelationColumn`) can be one-way or two-way (`setRelationTwoWay`); a database may relate to itself.
- Rollups summarise related rows with one of `ROLLUP_FUNCTIONS` (count, sum, average, min, max, earliest, latest, and others).
- `databaseQuery.ts`: `loadDatabaseData` loads a database and the ones its relations reach, `resolveRows` works out every cell (formulas, relations both ways, rollups), `queryRows` filters (all/any) and sorts (blanks last, choices by option order).
- `starterDatabases.ts` offers blank, drugs, vocabulary, books and habits starters.

## Edge cases

- A formula loop gives a "cycle" error in the cell, not a crash. An unknown column also shows an error in the cell.
- A rollup not yet set up is blank; bad rollup settings are refused when saved.
- Column names are kept unique, ignoring case; restoring a column whose name is taken adds a number.
- A deleted related row drops out of relation cells.
- Choice options are created once per name; Text to Choice makes one option per different text (capped at 500).
- Rows can be placed before or after another row in one step (`placeRow`).

## Security check

- Cell values are checked per type and stored clean; text is capped at 100,000 characters and lists at 1,000 items (`columnTypes.ts`). Bad values are rejected.
- Links accept only http, https and mailto (or a local image reference); other schemes are refused (`normalizeUrl`).
- Formulas: max 2000 characters and nesting depth 64; text results capped at 100,000. Formulas are never run as code, only evaluated by a fixed function list.
- Relations accept only rows of the related database; rollups must point at a relation in the same database and a column in the related one.
- No network use in these services; data stays on the device.
- Deletes are soft: a database goes to Trash with its columns, views, rows and blocks at one time stamp, and Restore brings all back (`databaseParts.ts`). Deleting a column keeps the values. "Delete forever" erases names, settings and cell values. The last view of a database cannot be deleted.

## Tests

- `src/databases/databaseService.test.ts`
- `src/databases/databaseQuery.test.ts`
- `src/databases/formula/formula.test.ts`
- `src/databases/databaseSpeed.test.ts` (10,000 rows)
- `src/databases/starterDatabases.test.ts`
- `e2e/databases.spec.ts`
