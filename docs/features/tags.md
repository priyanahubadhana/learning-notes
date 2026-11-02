# Tags

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Label pages and text with tags, including nested ones like medicine/cardio.

## How it works

- Tags are records with a name and optional parent. Pages keep `tagIds`; tags typed with "#" are inline in the block and listed in `blockTags`. Notes store ids, so rename, move and colour show everywhere at once.
- `src/tags/tagNames.ts`: names are cleaned (spaces become "-", "#" and "/" dropped, max 60 characters per level); the same name ignoring case and accents is the same tag.
- `src/tags/tagService.ts`: `listTags`, `findTagChoices` (picker), `findOrCreateTagPath`, `addPageTag`, `removePageTag`, `subTagIds`.
- `src/tags/tagTools.ts`: `renameTag`, `moveTag`, `setTagColor`, `mergeTag`, `deleteTag`, each one transaction. Merge and delete also rewrite pages, inline tags and saved searches.
- A card has its page's tags plus tags in its question or answer. Sub-pages do not inherit tags. A tag covers its sub-tags.

## Edge cases

- Rename or move onto a same-named neighbour returns 'taken' (merge instead); a move under itself returns 'loop'; an empty name returns 'empty'.
- Merging a tag into its own sub-tag throws. An empty tag path throws.
- Delete keeps the notes, lifts sub-tags one level, and saved searches use the parent.
- Pages in Trash are rewritten too, so tags come back on Restore.
- Adding an existing tag to a page does nothing.
- The # menu list can lag behind typing. It reads tags from memory (`tagChoicesIn`), and a pick from an older list follows the typed text (`tagFromTyped`), which is put back as text if it cannot be a tag.

## Security check

- Validated: names are cleaned and length-limited; colour must be in `TAG_COLORS` (stored colours are checked before use); parent loops are blocked.
- Data leaving the device: none.
- Deletes: `deleteTag` soft-deletes the tag (`deletedAt`) and removes it from pages, notes, cards and searches.

## Tests

- `src/tags/tagService.test.ts`, `src/tags/tagTools.test.ts`
- `src/editor/tagActions.test.ts`
