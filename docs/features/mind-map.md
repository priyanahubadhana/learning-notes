# Mind map

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

A block that holds a tree of ideas the user can type, rearrange and keep. It is ordinary editable content (never a picture), so notes made by hand and notes made by the user's own AI (the Markdown importer, CR2) are the same thing.

## How it works

- Block type `mindMap` (`editor/mindMap/mindMapBlock.tsx`, registered in `builtinBlockTypes.ts` and `editor/schema.tsx`; slash menu "Mind map"). Props: `data` (the tree as JSON text) and `theme` (`calm`, `bold`, `paper`). No new database table: it is a block record like any other.
- Model (`model.ts`, pure and tested): `{ root, nodes[] }`, each node `{ id, text, parent }`; the order of siblings is the array order among nodes with the same parent. `parseMindMap` repairs damaged data (orphans and cycles hang under the root, at most 500 nodes, 200 characters per node, an unreadable value becomes a fresh map). Helpers: add child or sibling, remove branch, rename, move under, reorder, indent, outdent, `toOutline` and `fromOutline` (an indented bullet list; the CR2 importer uses `fromOutline`), `layoutMindMap` (left to right, parents centred beside their children), `mindMapText` (search).
- View (`MindMapView.tsx`): HTML boxes over SVG lines. Tap a branch to select, tap again to type. Keys: Tab adds a branch, Enter adds one beside, Delete removes, F2 types, arrows move the selection, Alt+arrows reorder and indent; Escape keeps the typed text. Drag a branch onto another to move it (mouse, Pencil, finger; the centre cannot be moved). Keys are caught natively so the editor underneath never sees them. 44 px toolbar buttons: + Branch, + Beside, Delete branch, Style, Save as picture.
- Save as picture (`toPicture.ts`): draws the map on a canvas (2x) with the page's real colours and adds it as a picture block below.
- Search: `searchText.blockText` adds the map's words (`content.data`).
- A closed "/" menu used to leave an invisible box over the block; `index.css` now lets taps through it.

## Edge cases

- A map with no data (an old or empty block) shows a fresh centre; nothing is saved until the user edits.
- Read-only pages and the reader show the map without the toolbar and without editing.
- Undo and Redo are the editor's own history (each change is one block update).

## Security check

- The text is shown as text (React), never as HTML. Limits above stop a huge file from freezing the page.
- Nothing leaves the device.

## Tests

`model.test.ts` (tree, moves, repair, outline, layout, search words); `e2e/mindMap.spec.ts` (keyboard build and reload, drag and delete, Save as picture).
