# Undo and Redo (one history per page)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Every change a person makes to a page can be taken back from one Undo button, in the order it happened, across text in every box, drawings, boxes and grid, pictures, tables, tags, databases, page settings and a version restore. Research: [research/undo-history-2026-11.md](../research/undo-history-2026-11.md). Version history (copies over time) is separate: [page-history.md](page-history.md).

## How it works

- **The API** (`src/core/historySteps.ts`, small, in the first download): `pushStep({ kind, label, undo?, redo?, data?, merge?, owner? })`, `group(label, fn)` (everything inside, even after an `await`, is one step), `transaction(label, fn)` (a group taken back if it throws), `undo()`, `redo()`, `undoSince(t)` (a toast's Undo: only if its action is the newest step), `quietly` / `quietAsync` (a write that is not a step: Undo itself, the editor's autosave, automatic repairs), `registerKind(kind, { undo, redo, join? })` (steps saved with `data`), `attachEditor`, `releaseOwner`, `setActiveScope`, `historyState` (what the buttons read). Calls made before the journal has loaded wait in a queue, in order.
- **The journal** (`src/history/pageHistory.ts`, lazy): one list per scope (`page:<id>`, 200 steps, redo list beside it). `undo()` takes the newest step, runs it and moves it to the redo list; a new step clears Redo. Calls are queued one after another. A step that cannot be applied (the row was removed, an unknown kind) is dropped and a toast says why; an empty list says "Nothing left to undo"; no page open says so too.
- **Text:** each box's editor is attached (`attachEditor`, from `PageEditor`). The box keeps its own ProseMirror history (`editor/historyExtension.ts`: depth 300, 800 ms pause, registered as `yUndo` so `editor.undo()`, Ctrl+Z, the edit menu and the iOS shake go to the journal, never to one box). Every new typing group pushes a marker step; Undo runs that box's own undo. Before any non-text step the open typing groups are closed, so the order across boxes and kinds stays right.
- **Ink:** `InkController.commit` pushes a step per gesture (stroke, erase, Lasso move, resize, delete); `undoStep`/`redoStep` do the ink part. A delete of drawings and text together is one step (`chainLast`).
- **Database writes:** `src/core/rowCapture.ts` listens on the tables (Dexie hooks) and turns a finished transaction into one `rows` step with before/after of the changed fields: `pages` (title, paper style and size, locks, tabs, boxes, grid rows, tags, values), `cards`, `blockTags`, `tags`, `databases`, `dbColumns`, `dbViews`, `decks`; `blocks` only inside a transaction that also changes the page (box removed or copied). Only the open page is recorded; sync writes and quiet writes never are. Quick repeats of the same field within 800 ms merge. A box that goes away takes its lines with it and gets them back (`followBoxes`). Steps with data are saved per page in the `meta` table (`hist:<scope>`) and come back after a reload.
- **Version restore:** `restoreVersion` is one step (`restore` kind): Undo restores the copy kept just before, Redo restores the copy again; the page redraws from the database (`setPageReloader`).
- **Buttons:** `app/tools/HistoryButtons.tsx` is the icon pair at the far left of the PDF/EPUB reader bar and the reading-mode bar; the main bar and ribbon pin their own pair at the far left (same state). Notes, paper, reading mode, books and the Write pad all show the pair first. The Write pad keeps its pad-only steps (`padHistory.ts`) and hands page steps to the journal.

## Edge cases

- Text and ink steps last the session; after a reload only steps with data (page settings, boxes, tags, databases, restores) can be undone, and a new text history starts.
- Changing page throws away the closures of the old page's editors (`release`); data steps stay.
- A click below the last line that adds an empty line is a real change and a real step.
- `HISTORY_TABLES` (rowCapture) lists what is recorded; every other table must be listed as "not an action" in `pageHistory.test.ts`, so a new table cannot be forgotten.
- First download budget: only the facade and the hooks are in the first load.

## Security check

No new network, no secrets. The saved list is in the local `meta` table (not synced) and holds field values already in the page.

## Tests

Unit: `src/history/pageHistory.test.ts` (every table classified, rows undo/redo, no step from bookkeeping fields, redo cleared, groups and order, 200 limit, error steps skipped with a toast, saved over reload, box lines), `src/history/bypass.test.ts` (no code outside the journal imports `prosemirror-history`, calls the ink's raw undo or keeps another undo stack). E2E `e2e/undoHistory.spec.ts` (typing, paper style, size, box add / text / lock, delete box, drawing, "never silent", 50 random steps back and forward; chromium and ipad-webkit), `e2e/bookInk.spec.ts` (the pair at the far left of the reader), `e2e/barsCrisp.spec.ts`.
