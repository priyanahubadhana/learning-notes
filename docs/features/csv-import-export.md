# CSV import and export

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Moves a database's rows in and out as CSV files that spreadsheets can open.

## How it works

- Export (`csvTransfer.ts`, `exportDatabaseCsv`): writes the title column and every column as plain text: dates as days, ticks as true/false, lists joined with "; ". Formula errors export as empty. The file name comes from the database title with unsafe characters removed. The download starts from the Databases hub (`downloadFile`).
- Reading (`csv.ts`, `parseCsv`): follows RFC 4180 (quotes, doubled quotes, line breaks inside quotes), ignores a BOM and blank lines, and detects comma, semicolon or tab from the first line.
- Import (`CsvImportDialog.tsx`, `importCsvRows`): each CSV column is mapped to the title, an existing column, a new column (`IMPORTABLE_TYPES`) or skipped. `guessType` and `guessMapping` suggest this.
- Modes: add (default), replace (old rows go to Trash, with Undo) and update (same title, ignoring case, changes that row; empty CSV cells leave values alone).
- `importCsvAsNewDatabase` makes a new database from the CSV next to the source and leaves the source untouched.
- Choice and tag values create missing options or tags. Rows import in chunks of 500. Rows with no title and no value are skipped.

## Edge cases

- Numbers accept commas and a % sign; unreadable numbers and dates are left empty.
- Checkbox accepts true, yes, y, 1, x, checked.
- Blank column headers become "Column N".
- Limits: 30,000,000 characters, 100,000 rows, 200 columns; extra data is dropped and the parse is marked truncated.
- Study tracker databases cannot be imported into.

## Security check

- Spreadsheet formula injection: on export, any cell starting with = + - @ tab or return gets a leading apostrophe (`protectCell`); import removes it (`unprotectCell`).
- Imported cells are written through `addRows` / `setCells`, the same path as typed values, so the per-type checks apply.
- CSV text is never run as a formula or code; formula columns cannot be created from CSV (`IMPORTABLE_TYPES`).
- Size limits above stop huge files. The file is read on the device; nothing is uploaded. Export only creates a local download.
- Replace mode moves old rows to Trash (soft delete) so they can be restored; nothing is erased.

## Tests

- `src/databases/csv.test.ts`
- `src/databases/csvTransfer.test.ts` (includes a 10,000-row import)
