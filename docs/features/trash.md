# Trash

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Deleted notebooks, databases and pages go to Trash first. The user can restore them or delete them forever.

## How it works

- `src/trash/trashService.ts`: `listTrash`, `restoreNotebook`, `restoreDatabase`, `restorePage`, `purgeNotebook`, `purgeDatabase`, `purgePage`.
- Things deleted together share one `deletedAt` time. Trash lists only what was deleted directly (newest first); Restore brings back everything deleted at that moment.
- Purge erases the content (titles, tags, cell values, block content) but keeps small markers (id plus `purgedAt`) for a future sync.
- `purgeCardsOf` erases cards of purged blocks and their review logs. Logs keep rating, kind and time so review counts stay right; cards get a far-future due date.

## Edge cases

- Restoring a page whose notebook is in Trash brings back only the notebook, not its other pages.
- Restoring a page whose parent is still deleted puts it at the notebook's top level.
- Restoring a database row also restores its database; a database whose notebook no longer exists cannot be restored (throws).
- Anything not in Trash throws (`getTrashed`).
- Each operation is one transaction (all or nothing).
- Earlier deletes are not brought back by restoring a later one.

## Security check

- Validated: the record must be in Trash before restore or purge.
- Data leaving the device: none.
- Deletes: normal deletes are soft; Delete forever is the only real erase, and it blanks content in place rather than removing the rows. No automatic emptying of Trash was found in this folder.

## Tests

- `src/trash/trashService.test.ts`
