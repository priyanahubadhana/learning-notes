# Database pages (Notion-like)

Security rules: [rules/security.md](../../rules/security.md). Check them before building. Builds on [databases.md](databases.md) (engine) and [database-views.md](database-views.md) (views). Plan: [../plans/database-pages-plan.md](../plans/database-pages-plan.md).

## Purpose

A database is a page-like thing with properties (columns). Every row is a page, so a row can hold notes, cards, links and drawings. It can be a full page in a notebook or an inline block inside a note, and it is shown as Table, Board, Gallery, Calendar or List.

## How it works

- **Data model (part 1):** unchanged Dexie version. Tables `databases`, `dbColumns`, `dbViews`, `rowRefs` and the row `pages` are already synced (`sync/tables.ts`), backed up and exported (share bundle). Property types: text, number (plain, percent, currency, stars 0-10 via `config.max`), date, checkbox, choice (select), choices (multi-select), url, tag (tags), noteLink, relation, rollup, formula (own parser, no `eval`).
- **Prompt library fit:** a database with Text, tag columns (Subject, Purpose, Input, Output), a 1-10 stars Rating, a Provider choice, relation to a Skills database and a rollup works today (`databaseSchema.test.ts`). The library itself is a later queue item.

## Edge cases

- Stars above the column maximum are cut to it, not refused.

## Security check

Same as databases.md: values checked per type, formulas never run as code, links limited to http, https, mailto.

## Tests

- `src/databases/databaseSchema.test.ts`
