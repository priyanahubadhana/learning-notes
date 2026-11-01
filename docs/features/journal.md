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

## Security check

- Validated: nothing user-typed; dates come from the clock or the caller.
- Data leaving the device: none.
- Deletes: none in this service. Journal pages are normal pages and use the page soft delete (see notebooks-and-pages.md and trash.md).

## Tests

- `src/journal/journalService.test.ts`
