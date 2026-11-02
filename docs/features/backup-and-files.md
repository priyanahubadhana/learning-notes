# Backup and files

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Notes live only in this browser, so the app lets the user save them as files and bring them back. Three kinds: a whole-workspace file, a single-notebook file, and a safety copy made before a database upgrade.

## How it works

- Files are plain JSON, ending `.learningnotes.json` (`src/share/bundle.ts`). `exportNotebookBundle` takes one normal notebook (optionally with the Journal and Templates); `exportWorkspaceBundle` takes every table. Only live (not deleted) rows go in; pictures and the tags used are included.
- `bundleFile` writes the file row by row so a big notebook never becomes one giant string.
- `readImportFile` (`fileIO.ts`) reads a chosen file; a locked file needs its password (see encryption.md).
- `importBundle` (`importBundle.ts`) always adds NEW COPIES with fresh ids (`remapJson` re-points links). Nothing existing is changed. Copies are titled with `import.copyName`. Tags match by name; templates already present (same id, or same name and content) are not added again.
- Restore: the browser backup (below) is turned into a bundle by `bundleFromSnapshot` and imported the same way, as copies (`DataScreen.tsx`).
- Upgrade backup (`src/core/upgradeBackup.ts`, `app/UpgradeGate.tsx`): if the saved database is older than the code, every table is read raw, copied into a separate `learning-notes-backup` database (replacing the previous one) and offered as a download (`backupFileName`: name, version, UTC date). If the browser copy fails, the file is still offered.
- Reminder (`backupReminder.ts`): after 7 days with no saved workspace file, and only if a page exists; "Remind me later" snoozes 24 hours. Kept in the `meta` table.
- `sampleNotebook.ts` adds one sample notebook; it only adds.
- The upgrade backup file writes picture bytes as base64 text (`withBytes` in `upgradeBackup.ts`); `bundleImages` accepts bytes and base64. Files saved before this fix hold no pictures, and the browser copy always kept them.

## Edge cases

- Journal and Templates notebooks cannot be exported alone; journal days import as an ordinary notebook, not a second journal.
- Rows of loose databases go into a hidden "Databases" notebook on import.
- An import with no notebooks and no databases shows "nothing to import".
- Cards and review logs are kept only if their note/card is also in the file.
- Save everything and Restore do not carry page history, settings, saved searches or the Trash, and journal days arrive as an ordinary notebook; the screen says so. A file over `MAX_BUNDLE_BYTES` still saves, with a warning.

## Security check

- Validated on import (`checkBundle`): size at most 200 MB; app is `learning-notes`; known format version; kind is notebook or backup; every table is a list of objects with a non-empty text id; at most 2,000,000 rows; pages need a notebookId, blocks a pageId and object content; tags need a path.
- Pictures: allowed type (no SVG), base64 text only, under 60 million characters; name cut to 200.
- `remapJson` skips `__proto__` keys.
- Nothing leaves the device: files are only downloaded or read from a chosen file.
- Deletes: import never deletes or overwrites. Replacing the browser backup deletes only the old backup database.
- Every row is checked and rebuilt from known fields (`checkRows.ts`, typed so a new field cannot be forgotten): field kinds, valid order keys, showable text, unique ids; `purgedAt` is never kept. The browser backup goes through the same check. One bad row refuses the whole file, which is never changed, and the import runs in one transaction, so a failure leaves nothing.

## Tests

`src/share/bundle.test.ts`, `workspaceFile.test.ts`, `fileIO.test.ts`, `backupReminder.test.ts`, `sampleNotebook.test.ts`, `src/core/upgradeBackup.test.ts`; e2e: `sharing.spec.ts`, `upgradeBackup.spec.ts`, `backupReminder.spec.ts`, `sample.spec.ts`.
