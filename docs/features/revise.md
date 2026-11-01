# Revise

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Build a revision sheet per lesson from words marked in notes as Key point, Keyword, Must know or Formula, plus a short summary the user writes.

## How it works

- A mark is an inline style named `mark` whose value is a label id (`MARK_STYLE` in `src/revise/reviseMarks.ts`), stored in the note like a blank.
- `marksOfBlock` collects marks from a block's text. Neighbouring runs with the same label join into one mark; empty marks are dropped. `groupMarks` groups them in Settings label order, with marks of deleted labels after.
- Labels: four built-in (`key`, `keyword`, `must`, `formula`) that cannot be removed, plus user labels (up to 24). `isLabelList` validates a list; `setMarkLabels` applies it and writes one small style element for label colours.
- `listLessonMarks` (`src/revise/reviseService.ts`) returns a notebook's live top-level pages that are not database rows, in page order. Each has the marks of its own blocks and all its sub-pages' blocks.
- `setLessonSummary` saves a lesson's own summary on the page, cut to 20,000 characters. Empty or blank text removes it.
- The tab is `ReviseTab.tsx`. The summary saves when the user clicks away.

## Edge cases

- Deleted pages and deleted blocks are skipped.
- Marks of a removed label still show, in their own group, with the name "other".
- Blocks without text runs give no marks.
- `setLessonSummary` throws "Not a lesson" if the page is missing or deleted.
- The summary is updated through `db.pages.update`, so the search index is refreshed by the normal middleware.

## Security check

- Input: label ids must match `^[a-z0-9-]{1,40}$` and be unique; names are at most 40 characters; colours must come from `LABEL_COLORS`. Summaries are length-capped. Only validated ids and palette colours go into the style element.
- Data leaving the device: none found in `src/revise`.
- Deletes: Revise deletes nothing. Marks are read from notes, so they go away with their blocks and pages. Clearing a summary removes only that field.

## Tests

- `src/revise/reviseMarks.test.ts`, `reviseService.test.ts`
- `e2e/revise.spec.ts`, `e2e/reviseLabels.spec.ts`
