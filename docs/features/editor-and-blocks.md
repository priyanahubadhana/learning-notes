# Editor and blocks

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

The BlockNote editor shows a page as blocks and saves every edit to the local database automatically.

## How it works

- Each block is its own record with a `type`, `content`, `parentId` and order key. `src/blocks/builtinBlockTypes.ts` registers 14 types (paragraph, heading, lists, to-do, quote, divider, code, image, callout, card, cardList, database, pageLink).
- `src/editor/mapping.ts` is the only file that knows BlockNote's format: `editorToDrafts` flattens nested blocks; `recordsToEditor` rebuilds them.
- `diff.ts`: `diffBlocks` compares the editor with the last saved snapshot and returns only real changes.
- `autosave.ts`: `createAutosaver` debounces (default 500 ms), never runs two saves at once, and runs one more if a change came during a save.
- `pageSync.ts`: `createPageSync` saves changes and syncs card records in one transaction, then records a history version. `leave` saves and keeps a final history copy.
- `pendingStash.ts`: on tab close, unsaved changes are kept in localStorage and applied by `recoverStash` when the page next opens.
- Other helpers: slash menu, card, blank (cloze), mark, tag and link actions, code block keys.

## Edge cases

- Opening a page writes nothing (the snapshot is taken from the editor after load).
- A failed save is logged and retried on the next edit or flush; the snapshot only advances after success.
- Blocks whose parent is missing show at top level. Blocks of types the editor cannot show are left out but stay in the database.
- Saving a block that belongs to another page throws.
- Saving a deleted block revives it (undo).
- Stash: storage errors are ignored; a stash with a wrong shape is dropped; applying it twice is harmless; if the page was deleted meanwhile, nothing is restored.
- A failed history copy does not fail the save.
- A block whose `content.text` has a shape the editor cannot draw (`isShowableText` in `mapping.ts`) shows as a plain placeholder line. The stored record is not changed unless the user edits that line. Unknown style names are not checked; the error screen catches those.

## Security check

- Validated: the stash is shape-checked before use (ids, types, content object, order strings). A block's parent must be on the same page.
- Data leaving the device: none. localStorage holds unsaved changes only until the next successful save.
- Deletes: blocks removed in the editor are soft-deleted by `saveBlockChanges`; erasing is in trash.md.

## Tests

- `src/editor/`: `autosave.test.ts`, `diff.test.ts`, `mapping.test.ts`, `pageSync.test.ts`, `pendingStash.test.ts`
- `src/editor/`: `blankActions.test.ts`, `cardActions.test.ts`, `codeBlockKeys.test.ts`, `linkActions.test.ts`, `markActions.test.ts`, `slashMenu.test.ts`, `tagActions.test.ts`
- `src/blocks/blockTypes.test.ts`
