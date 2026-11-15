# Journal

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

One page per day, grouped under month pages, in a Journal notebook.

## How it works

- `src/journal/journalService.ts`: `ensureJournal` finds or creates the Journal notebook (kind `journal`). `openJournalDay` opens the page for a date (default today) or creates it.
- A new day goes under a month page, created if missing. The day page is filled by copying the Daily journal template's blocks (`copyBlocks`), leaving out page-link blocks; then card schedules are synced.
- `src/journal/dates.ts`: `dateKey` (YYYY-MM-DD), `monthKey`, `dayTitle`, `monthTitle`, `shortDayLabel`. Keys use the device's local date; titles use the app locale.
- Everything runs in one transaction.

## Edge cases

- Opening the same day again returns the existing page (`created: false`).
- If the day page was deleted, a fresh one is made.
- Changes to the Daily template apply to days created afterwards, not to old days.
- If the template is missing, the page is created empty.
- A renamed day or month has `customTitle` (optional, no upgrade needed), and shows its stored title; without it the sidebar shows the date in the current language. Restoring a history copy with the same title does not count as a rename.

## Month repair (task H, switch `journal.monthRepair`)

Two month pages of the same month can end up in the one Journal: sync's merge of two Journal notebooks made on two devices before fixed ids, or a month page restored from Trash after a new one was made (both shown by tests; an import does not do it, because imported days come in as a plain notebook). `src/journal/journalRepair.ts` joins them on the device; `src/app/attention/useJournalRepair.ts` runs it 3 s after start and after each sync.

- When the Journal holds two or more top-level month pages with the same `journalMonth`, the repair keeps the fixed-id page (else the oldest), the same choice on every device.
- When it is about to change anything, it first saves a backup of the month pages and their days on this device (`learning-notes:journalRepair:backup`); without a backup it changes nothing. The backup can be restored (`restoreJournalBackup`) or saved as a file (`journalRepairBackupFile`).
- When the backup is saved, every day moves into the kept month (`movePage`), in date order after its own days, and the emptied duplicate goes to Trash (`trashPageWithUndo`, never deleted).
- When the count of pages, lines or attachments after differs from before, a duplicate did not reach Trash, or a day arrived under a duplicate during the run (checked just before the Trash step), everything is put back with movePage and restorePage and the repair stops.
- When it joined pages, one quiet toast says "Journal tidied: two November 2026 pages joined" with Undo; Undo puts every page back (restorePage, movePage) and marks the duplicates `monthJoinDeclined` on the page, which syncs, so no device joins them again.
- When there is nothing to join (or it already ran, here or on another device that synced), it does nothing.

### Won't do

- No change to the server or any direct database write: only the app's own page actions on the device.
- A duplicate month page with its own lines, drawings or files is left alone (nothing hidden in Trash); empty or spaces-only lines do not count.
- No merging of an imported "Journal" copy notebook into the Journal.
- No new screen; the export is a function for now.

## Security check

- Validated: nothing user-typed; dates come from the clock or the caller.
- Data leaving the device: none.
- Deletes: none in this service. Journal pages are normal pages and use the page soft delete (see notebooks-and-pages.md and trash.md). The month repair only sends an emptied duplicate to Trash.

## Tests

- `src/journal/journalService.test.ts`
- `src/journal/journalRepair.test.ts` (causes, join, backup, count check, restore, Undo, idempotency, two devices)
- `e2e/journalMonthRepair.spec.ts`
