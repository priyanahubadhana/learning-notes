# Database pages plan (9 Nov 2026, queue item 3a)

Owner approved: full Notion-like databases. Most of the engine already exists (see [databases.md](../features/databases.md), [database-views.md](../features/database-views.md)). This plan covers only the gaps. New spec: [database.md](../features/database.md).

## What exists

Rows are pages (`Page.databaseId`, `Page.values`); columns, views, trash, sync, backup and layer packs all cover `databases`, `dbColumns`, `dbViews`. Types: text, number (plain, percent, currency, stars up to 10), date, checkbox, choice, choices, url, tag, noteLink, relation (one or two way), rollup, formula (own parser, no eval). Views: Table, Dashboard, Board, Calendar, Gallery. `/database` block. Saved views.

## Gaps and parts (one commit each)

1. **Data model check.** No new Dexie version needed (all tables and types exist, sync and export already list them). Pin it with a test that builds a prompt-library shaped database (name, text, subject/purpose/input/output tags, stars 1-10, relation, rollup, formula) and round-trips it through the share bundle. Spec file.
2. **Views.** New List view; group-by for Table and List; windowed (virtual) rows so 10,000+ rows scroll smoothly in Table and List; Board columns and Gallery show rows in pages with "Show more".
3. **Relations, rollups, formulas UI.** Checked against the existing column dialog; gaps closed (rollup and formula help, relation cell picker search) and covered by an e2e test.
4. **Insert and search.** A database can be inserted as a full page (a Database page in a notebook, from the new-page menu) and as an inline block (exists). Search finds rows by their property values (text, numbers, urls, dates, choice and tag names).

## Out of scope

The prompt library itself (next queue item). Only its schema must fit.
