# Backup and files

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Notes live only in this browser, so the app lets the user save them as files and bring them back. Kinds: a full save (everything, or notes only) that can replace the notes in place; a single-notebook file; and a safety copy made before a database upgrade or before a restore.

## How it works

- **Full save (zip, format 2)** (`src/share/fullFile.ts`): `Learning Notes YYYY-MM-DD.learningnotes.zip` (notes only: `Learning Notes (notes only) …`). `manifest.json` (app, kind `full` or `notes`, formatVersion 2, dbVersion, createdAt in UTC, rows per table, counts, media yes/no), then `tables/<table>.jsonl` (one row per line, exactly as stored: same ids, order keys, times) for every table in `db.tables` (a table added later is saved with no change), then `media/<table>/<n>` for binary fields (picture bytes; any future blob field is found by type). Rows are read in one read transaction, written row by row, picture bytes fetched one at a time. Includes history (`pageVersions`), the Trash, settings, meta, saved searches and the journal as a journal. "Save notes only" has no media entries; the rows are still listed (marker `$bin: null`), so links stay valid, and pictures come back empty. Both record `recordBackupSaved`. Limit about 1 GB (`MAX_FULL_BYTES`); a bigger file still saves, with a warning. The error screen's "Save everything" writes this format too.
- **Opening** (`fileIO.ts` `openSavedFile`, `readFull.ts`): a locked file asks for its password; then the first bytes tell a zip from old JSON. A zip's manifest is read first (fast) to fill the dialog. Guards: at most 200,000 entries, 2.5 GB unzipped, 2,000,000 rows; only our entry names; the manifest must say our app, a known kind, format not newer, database version not newer; every table must exist in this app; every table's row count must match the manifest (a cut-off file is refused).
- **Restore dialog** (`RestoreDialog.tsx`): file name, saved date, notebooks/pages/cards, size. "Replace my notes" (full zips of this app's database version), "Add as copies" (every file), Cancel. Old `.learningnotes.json` files only offer copies.
- **Replace** (`restore.ts`): (1) the whole file is read and checked first (`readFullFile`; nothing written). (2) The whole current database is copied raw into a separate database `learning-notes-before-restore` (`readSnapshot` + `saveBrowserBackup`, same code as the upgrade backup but a different name; the upgrade backup is never touched). If that fails (device full) the restore stops and nothing changes. (3) One transaction clears every table and writes the file's rows; search, links and block-tag rows come from the file. A `restoreUndo` row in `meta` records the dates. (4) The page reloads on the Save & restore screen (the workspace may be another one) and shows the dark bar "Restored the file from {date}…" with Undo, plus an Undo row until the next restore.
- **Undo** (`undoRestore`): puts the safety copy back the same way (one transaction), removes the restore row and deletes the safety database (it equals the notes again). Refused, copy kept, if the app was updated in between (different database version).
- **Older files:** a zip whose database version is below this app's is refused for Replace (clear message; Add as copies still works). Bringing its rows up through the upgrade steps is not built yet (see LIMITATIONS and DECISIONS).
- **Old JSON** (`bundle.ts`, `importBundle.ts`): `exportNotebookBundle` still makes the single-notebook file (`.learningnotes.json`, Share one notebook). `importBundle` always adds NEW COPIES with fresh ids (`remapJson` re-points links); titled with `import.copyName`; tags match by name; templates already present are not added again. A full zip is turned into the same bundle for "Add as copies" (`fullToBundle`).
- **Upgrade backup** (`src/core/upgradeBackup.ts`, `app/UpgradeGate.tsx`): before a database upgrade every table is read raw into `learning-notes-backup` (replacing the previous one) and offered as a download. "Before last update › Bring back" adds its notebooks as copies.
- **Reminder** (`backupReminder.ts`): after 7 days with no saved file, only if a page exists; "Remind me later" snoozes 24 hours. Kept in `meta`.
- **Screen order** (`DataScreen.tsx`): Save (Save everything, Save notes only, password), Restore (Open saved file, undo row), Share one notebook, Before last update, More (Anki, Sample notebook; a collapsible area).

## Edge cases

- Journal and Templates notebooks cannot be exported alone as a notebook file; journal days import as an ordinary notebook in copies.
- An import with no notebooks and no databases shows "nothing to import".
- Cards and review logs are kept only if their note/card is also in the file (copies and old files).
- Replace writes every row of the file (including soft-deleted ones and purged markers), so Trash and history come back as they were.
- The Backup screen reads only the backup's notebook list; the whole backup is read when Bring back is pressed.
- A restore holds the whole file in memory while checking it; a very big file can fail on a small device, before anything is changed.

## Security check

- Validated on open: size (1 GB zip, 200 MB old JSON); manifest fields; entry names; entry and size caps; row count per table; every row a plain object with a non-empty, unique text id and no `__proto__` key anywhere; rows of notebooks, pages, blocks, cards, review logs, databases, columns and views also pass `checkRows.ts` (field kinds, order keys, showable text); picture rows need an allowed image type (no SVG) and bytes. One bad row refuses the whole file.
- Old files: `checkBundle` as before (SVG refused, base64 only, rows rebuilt from known fields).
- Nothing leaves the device: files are only downloaded or read from a chosen file.
- Deletes: copies never delete or overwrite. Replace overwrites the notes only after a safety copy is saved. Undo deletes only the safety database it just restored. Replacing the upgrade backup deletes only the old backup database.

## Tests

`src/share/fullFile.test.ts` (round trip of every table, notes only, safety copy and undo, device full, damaged and cut-off zips, size and entry caps, newer versions, bad rows, old JSON, locked files), `crypto.test.ts`, `bundle.test.ts`, `workspaceFile.test.ts`, `fileIO.test.ts`, `backupReminder.test.ts`, `sampleNotebook.test.ts`, `src/core/upgradeBackup.test.ts`; e2e: `backupRestore.spec.ts` (save, replace, undo, copies, notes only, old JSON, damaged zip, screenshots), `sharing.spec.ts`, `upgradeBackup.spec.ts`, `backupReminder.spec.ts`, `sample.spec.ts`.
