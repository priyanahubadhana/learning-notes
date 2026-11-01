# Study tracker

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

A special database per notebook that shows how well each lesson (top-level page) is learnt, worked out from its flashcards.

## How it works

- `ensureStudyTracker` creates it once per notebook, at an id taken from the notebook id (`studyTrackerId`). Its kind is `studyTracker`. It has Status, Last revised, Cards due, Correct, Confidence (1 to 5 stars) and Levels columns, and the same three views as any database.
- Its rows are the notebook's top-level pages, not row pages. Sub-pages count towards their lesson.
- `trackerLoad.ts` and `trackerStats.ts` work out each lesson from its cards (each card keeps its newest answer). Cards in Trash, other notebooks, Templates pages and unusable cards are left out.
- Card level from the review gap: New (never reviewed), Learning (under 1 day), Familiar (1 to 20 days), Mastered (21+ days) (`cardLevel`).
- Automatic Status (`autoStatus`): Not started (nothing answered); Learning (under 75% correct); Mastered (90%+ correct, nothing due, no new cards, 80%+ of cards at Mastered); otherwise Review.
- The user can pin a Status; clearing it returns to Auto (`trackerService.ts`, `setLessonStatus`).
- `trackerHistory.ts` counts answers per day (up to 366 days) and the study streak; a day not yet over does not break the streak.

## Edge cases

- A lesson moved to Trash drops out with its cards.
- No answered cards gives no "% correct".
- Lessons can be reordered; this changes their order in Notes (`placeRow`).
- The tracker goes away and comes back with its notebook.

## Security check

- `setLessonStatus` accepts only a live top-level page that is not a database row, and needs the notebook's tracker Status column.
- `deleteDatabase`, `trashRows` and CSV import all refuse a Study tracker.
- Numbers come from local cards and reviews; nothing leaves the device.

## Tests

- `src/databases/trackerStats.test.ts` (includes a 10,000-card speed test)
- `src/databases/trackerHistory.test.ts`
- `src/databases/databaseService.test.ts` (Study tracker group)
- `e2e/tracker.spec.ts`
