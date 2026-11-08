# Import a Notion export

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Bring a whole Notion workspace or database across with Notion's free export, no Notion account, API or token (₹0).

## Behaviour

- Settings › Save & restore › More › **Notion**: pick the .zip made by Notion (Settings › Export › "Markdown & CSV", include sub-pages), choose "A new notebook" (named after the zip) or an existing notebook. A box shows the counts (pages, databases and rows, pictures, other files) and where they go; Import runs, then a toast with **Undo** moves everything to Trash.
- Pages and nested folders become pages and sub-pages. Each CSV becomes a Database; column types are guessed (date incl. "November 9, 2026", number, select, multi-select, checkbox, url, else text); the first column is the title. Each row's .md fills the row's page (the "Name: value" lines under its title are dropped, the database holds them). Pages under a row become its sub-pages.
- Markdown: headings, lists, check items, quotes, code, dividers, tables, `<details>` toggles (nested) as Toggle list, `<aside>` as Callout, pictures as Picture blocks (stored in the image store), other files in a page's folder as File blocks. Links between pages become note links; links to unknown targets keep their words.
- Not read: a zip that holds other zips (message asks to unzip first), Notion's `_all.csv` twin, formulas, relations (stay text), comments, page icons and covers.

## Technical

- `src/share/notionImport.ts` (`planNotionZip`, `notionMarkdownToBlocks`, `runNotionImport`, `undoNotionImport`), `NotionImportSection.tsx`; the importer is loaded only when a file is chosen. Reuses `importCsvRows`, `createDatabase`, `addBlocks`, `saveImage`, `saveAttachment`, `markdownToBlocks`.
- The zip is read as a stream (`planNotionStream`: the file in chunks, one entry inflated at a time, entries over their limit never inflated, entries with an unknown size cut off when they grow past it), so the whole zip never sits in memory beside its contents; `planNotionZip` (whole-file) stays for tests and small zips.
- Limits: zip 400 MB, 20 000 entries, 800 MB expanded, .md 2 MB, .csv 30 MB (rows and columns by `parseCsv`), other files 50 MB (pictures 25 MB, told by their first bytes), 5 000 pages. Names that climb out of the zip, start with "/" or hold a backslash are never read; files over their limit are skipped before they are inflated (`filter` on `originalSize`); nothing in the zip is run. A failure half-way moves what was made to Trash.

## Tests

Unit: `src/share/notionImport.test.ts`. E2E: `e2e/notionImport.spec.ts`.
