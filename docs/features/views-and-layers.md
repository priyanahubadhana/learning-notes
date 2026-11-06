# Notebook views and the Layer gallery (Phase I)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

I1: a notebook can show its pages the way the person thinks (a shelf of covers, coloured section tabs, a gallery, a table, a board). I2: a ready-made set of notebooks (Finance tracker, Memory techniques kit, Study kit) can be added, removed cleanly, and shared as one file with a friend.

## How it works

**Views (I1).** Notes tab, two buttons:

- **View ▾** (the whole notebook): Default, **Shelf** (a cover plus a text thumbnail of every top-level page), **Tabs** (top-level pages as coloured section tabs; the open one lists its sub-pages; six colour dots set the tab colour). Saved as `Notebook.view` (unset = Default).
- **Layout ▾** (Default only, per tab): List, Gallery, Table, Board (columns by section colour). Saved as `Notebook.tabViews[tabId]` (list is not stored). `Page.tabColour` is one of the six tag colours.
- Code: `src/notebooks/NotesViews.tsx` (screens), `notebookViews.ts` (saving, grouping). Only the Notes tab has views; the other tabs keep their own (Database has its own table/board/calendar views).
- Text previews are read for the first 60 top-level pages only (`PREVIEW_LIMIT`).

**Layers (I2).** Quiet corner › **Layer gallery** (`src/layers/LayerGallery.tsx`).

- A layer file is a normal notebook file with one extra key `layer` (`{ id, version, name, description, adds[] }`, `manifest.ts`; id `a-z0-9-` up to 64, name up to 80, text up to 400, up to 12 "adds" lines). `readLayerFile` checks the manifest and then the bundle (`checkBundle`) before anything is written.
- **Add** (`installLayer`): the same import as "Add as copies" (`importBundle` with `keepNames`, so no "Copy of"), then one `layerInstalls` row (Dexie **20**: `{ packId, version, name, installedAt, createdIds: [{ table: notebooks|pages|databases, id, hash }] }`). A layer cannot be added twice until it is removed.
- **Remove** (`planRemoval` / `removeLayer`): an item goes only if its hash still equals the one taken when it was added (pages: title, cells and the words of its notes, ignoring the empty last line the editor adds; databases: title and columns; notebooks: title). A notebook goes only if everything in it is removable. Changed items stay; the dialog names them first ("asks otherwise"). Removed items go to the Trash (soft delete), so they can be restored.
- **Starters** (`packs.ts`): built with the app's own services in a short-lived scratch database (`layer-scratch-<uuid>`, deleted afterwards), then exported as a notebook. Page text is English; gallery names, descriptions and "what it adds" lines follow the chosen language.
- **Share as layer file**: notebook ⋯ menu; downloads `<id>.learningnotes-layer.json` that a friend opens with Layer gallery › Add a layer file.
- Sync: `layerInstalls` is a `record` table. Backups carry it (checked in `checkRows.ts`; `TABLE_ONLY_VERSIONS` includes 20).

## Edge cases

- A page or database that was already deleted is skipped on Remove. A layer whose items you all changed removes only its install record.
- Layer files from a newer app are refused by `checkBundle` (format version). Files over 200 MB are refused before reading.
- Templates inside a layer file merge into the Templates notebook like any imported file (starter packs have none).
- Hash collisions are not a security matter (they only decide what stays).

## Security check

Layer files are untrusted input: manifest sizes capped and id pattern checked; the bundle goes through `checkBundle` (known fields only, sizes, unique ids); `tabColour` must be `#rrggbb` (it is used in a style, so nothing else is accepted); `view` and `tabViews` are fixed lists. No network, no secrets, no new permissions.

## Tests

Unit: `src/layers/layers.test.ts` (manifest limits, each starter builds and adds, finance database rows, add twice refused, remove untouched, changed page and renamed notebook stay, editor empty line is not a change, share round trip, scratch database deleted), `src/notebooks/notebookViews.test.ts` (saving, grouping, row checks), `src/core/migration.test.ts` (19 to 20). E2E: `e2e/views.spec.ts` (all views remembered after reload, Layer gallery add and remove).
