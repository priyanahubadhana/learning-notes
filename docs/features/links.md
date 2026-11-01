# Links

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Link notes together with "[[", and show "Linked from" on the target page.

## How it works

- A link is an inline `noteLink` in text, or a page link block. It points to a page and optionally a heading or card (`editor/mapping.ts`: `linkTargets`).
- `src/links/linkRows.ts`: `linkRows` builds one row per different target for each block in a `links` helper list, rebuilt on every save and by a backfill. Rows are never synced.
- `src/links/linkService.ts`: `resolveLink` (current title, "Page › heading"), `withCurrentLabels` (read-only views), `findLinkPages` (picker, uses the search index), `pagesByIds`, `linkAnchors`, `linkLabel`, `getBacklinks`, `sentenceAround`.
- Links store a target id plus the label at creation, but show the current title.

## Edge cases

- A deleted heading or card falls back to the page.
- Blocks in Trash or erased have no link rows, so they never appear under "Linked from".
- Links to deleted pages keep their old label in read-only views.
- Picker results leave out Trash.
- Backlinks load only the blocks shown, so pages with many links stay fast (a test covers 10,000 links).

## Security check

- Validated: lookups go through ids and indexes; typed text is only used to match titles.
- Data leaving the device: none.
- Deletes: links are never deleted directly; their rows are dropped when the block is deleted or erased, and return on restore.

## Tests

- `src/links/linkService.test.ts`
- `src/editor/linkActions.test.ts`
