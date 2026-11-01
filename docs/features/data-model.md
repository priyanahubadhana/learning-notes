# Data model

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

How everything is stored on the device: one local database, the same shape for every record, and safe upgrades.

## How it works

- `src/core/db.ts`: `LearningNotesDB` (Dexie over IndexedDB, name `learning-notes`). Tables include workspaces, notebooks, pages, blocks, cards, reviewLogs, settings, tags, savedSearches, searchEntries, links, blockTags, meta, databases, dbColumns, dbViews, rowRefs, pageVersions and images. Only listed fields are indexed. Top-level items have `parentId` null, which IndexedDB cannot index, so they are found by `notebookId` / `pageId`.
- Versions 1 to 12. A schema change must add a new version, never edit an old one. Upgrades are plain steps (add default tabs, add Dashboard/Board/Revise views, copy last answer onto cards, add Card levels, add the history and pictures tables) tested from each older version.
- `records.ts`: every record has `id`, `createdAt`, `updatedAt`, `deletedAt` (`newRecordFields`). `softDeleteMany` sets one shared `deletedAt`, so Trash restores things deleted together (`restoreMany`); `purgeMany` blanks content and sets `purgedAt`, keeping an empty marker. `isLive`, `isInTrash`, `getLive`, `descendantIds` are shared helpers.
- `ids.ts`: `createId` is a random UUID v4 made on the device. Times are UTC milliseconds.
- `order.ts`: fractional ordering keys (`orderBetween`, `ordersBetween`, `orderAtIndex`, `assignOrders`) so moving an item changes one record.
- `time.ts`: study days roll over at a chosen local hour (default 4 am).
- `storage.ts`: asks the browser to keep data permanently; never throws.
- `upgradeBackup.ts`: copy of the old data before an upgrade (see backup-and-files.md). `workspaceService.ts`: gets or creates the default workspace.
- Blocks: `blockService.ts`, `blockTypes.ts`. The search index is updated in the same transaction as each page/block save (`search/indexMiddleware.ts`).

## Edge cases

- Persistent storage can be refused (for example in private browsing); the app still works.
- Day boundaries use local calendar dates, so daylight saving changes stay correct.
- Many inserts at the same spot still produce valid order keys.

## Security check

- No outside input reaches this layer directly; imported files are checked first (see backup-and-files.md).
- Everything stays on the device; there is no server or sync.
- Deletes: soft delete (Trash) first; "Delete forever" blanks content and keeps a `purgedAt` marker, not a removed row.

## Tests

`src/core/db.test.ts`, `helpers.test.ts` (ids, records, order, descendants), `migration.test.ts`, `time.test.ts`, `storage.test.ts`, `blockService.test.ts`, `upgradeBackup.test.ts`.
