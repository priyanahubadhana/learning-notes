# Page history

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Keeps earlier copies of each page so the user can look back and bring one back, including after a mistake.

## How it works

- `src/history/versionService.ts`. A copy (`PageVersion`) stores the page title and its blocks (id, parent, type, content, order).
- `recordVersion` is skipped when nothing changed since the newest copy, and (unless `force`) when that copy is under 5 minutes old (`VERSION_GAP_MS`). A first copy of an empty page is not made.
- At most 30 copies per page (`KEEP_VERSIONS`); older ones are deleted in the same transaction.
- `restoreVersion` first saves the current page as a copy (forced), writes back only blocks that differ, deletes blocks not in the copy, renames the page, then re-syncs card records. So a restore can itself be undone.
- Copies are taken by the editor (`editor/pageSync.ts`) and when a page is left (`pages/PageView.tsx`). `listVersions` returns newest first; `HistoryDialog.tsx` is the screen.
- The table `pageVersions` was added in database version 11.

## Edge cases

- Restoring a copy that no longer exists throws "That copy no longer exists".
- A restored Card block gets its review record again.
- Large pages: tested with 10,000 notes copied and 2,000 restored.

## Security check

- Input: only internal ids; no files or user text are parsed.
- Nothing leaves the device.
- Deletes: "Delete forever" in Trash (`trash/trashService.ts`) erases the page's copies. Copies beyond the newest 30 are removed for good.
- Not confirmed from code: history copies are not read by the export code in `bundle.ts`, so they appear not to travel in files.

## Tests

`src/history/versionService.test.ts`; e2e: `history.spec.ts`.
