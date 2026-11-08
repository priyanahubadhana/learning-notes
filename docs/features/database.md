# Database pages (Notion-like)

Security rules: [rules/security.md](../../rules/security.md). Check them before building. Builds on [databases.md](databases.md) (engine) and [database-views.md](database-views.md) (views). Plan: [../plans/database-pages-plan.md](../plans/database-pages-plan.md).

## Purpose

A database is a page-like thing with properties (columns). Every row is a page, so a row can hold notes, cards, links and drawings. It can be a full page in a notebook or an inline block inside a note, and it is shown as Table, Board, Gallery, Calendar or List.

## How it works

- **Data model (part 1):** unchanged Dexie version. Tables `databases`, `dbColumns`, `dbViews`, `rowRefs` and the row `pages` are already synced (`sync/tables.ts`), backed up and exported (share bundle). Property types: text, number (plain, percent, currency, stars 0-10 via `config.max`), date, checkbox, choice (select), choices (multi-select), url, tag (tags), noteLink, relation, rollup, formula (own parser, no `eval`).
- **Prompt library fit:** a database with Text, tag columns (Subject, Purpose, Input, Output), a 1-10 stars Rating, a Provider choice, relation to a Skills database and a rollup works today (`databaseSchema.test.ts`). The library itself is a later queue item.

- **Views (part 2):** Table, Board, Gallery, Calendar, Dashboard and the new **List** (`views/ListView.tsx`). Filters, sorts and hidden columns are saved per view (`viewConfig.ts`); views are saved records, added with "+ View". **Group by** (Table and List): `config.groupBy` = a column id; groups are the cell's shown text (choice groups in option order, no value last), collapsible (`rowGroups.ts`). A multi-value cell (choices, tags) groups by its joined text.
- **Many rows:** Table and List draw all rows up to 200; above that only the rows near the screen plus 12 either side, with empty spacer rows for the rest (`rowWindow.ts`, `useRowWindow.ts`). Row height is measured from what is drawn. Board and Gallery page their cards ("Show more").
- **Relations, rollups, formulas (part 3):** a Relation column opens a searchable picker (first 50 matches shown, so a 10,000-row target is fine); two-way relations add the partner column. A Rollup picks a relation (Through), a column of the related rows (Show) and a function (Calculate). A Formula is edited as a sentence (If … write … otherwise …) or, under Advanced, as text with a live preview, a plain-words "Means:" line and the **Columns and functions** helper (`FormulaHelper.tsx`).
- **Insert (part 4):** as a full page: the last row of the new-page list, "Database page" (`makeDatabasePage`: full-width database block + empty line; the page is named after the database; blank starter, columns added after). As an inline block: "/database" (pick or start one; Table, List, Dashboard, Board, Calendar, Gallery switcher). Opening the database from either goes to the full screen.
- **Search (part 4):** a row's title search entry also holds the words of its text, link, date, number, chosen option names and tag names (`rowValueText`, `rowContext` in the index middleware; backfill does the same). Not searched: checkboxes and computed columns (formula, rollup, relation).

## Edge cases

- A saved `groupBy` column that no longer exists is ignored (no grouping).
- Renaming an option or tag does not re-index rows that use it until the row is saved again or the index is rebuilt (version bump).
- Stars above the column maximum are cut to it, not refused.

## Security check

Same as databases.md: values checked per type, formulas never run as code, links limited to http, https, mailto.

## Tests

- `src/databases/databaseSchema.test.ts`
- `src/databases/views/rowWindow.test.ts`, `rowGroups.test.ts`
- `src/databases/databasePage.test.ts`, `src/search/rowSearch.test.ts`
- `e2e/databasePages.spec.ts` (3,000 rows windowed, group by, List view)
