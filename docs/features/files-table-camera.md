# Table, Toggle list, File and Camera (G2)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Fill the rest of the Insert menu: a Table, a Toggle list (a line that folds the blocks nested under it), a File or PDF kept on the page, and a Camera photo.

## How it works

- **Table and Toggle list** are BlockNote's own blocks (`table`, `toggleListItem`), added to `editor/schema.tsx` and `blocks/builtinBlockTypes.ts`. `mapping.ts` needed no change: a table's rows travel in `content.text` as `{ type: 'tableContent', rows }` (already accepted by `isShowableText` and read by search). Insert › Table (`editorCommands.ts`) puts a 3 by 3 table under the cursor; "/table" and "/toggle" also work. The Database item no longer answers to "table" in "/".
- **Calm handles (9 Nov):** see `editor/calmHandles.ts`: grips and side-menu handles show only near the pointer and fade ~300 ms after it leaves (touch: 3 s after the last tap). Column borders show a grip pill and resize by drag. Not built: row-height drag (no row height in the table data) and double-click fit-to-content and touch drag on the pill (the resize engine is mouse/pen only); the pill hit area is the engine's 5 px.
- **Select all in steps (9 Nov):** `editor/selectAllSteps.ts`, see CHANGELOG. Across several paper boxes the last step is one browser selection (Copy works; Cut/Delete across boxes are not handled).
- **File** (`editor/fileBlock/`): our own block (BlockNote's upload panel is not used). Props `url` ("lnfile:<id>", see `core/fileRef.ts`), `name`, `size`, `caption`. An empty block shows "Choose a file"; a filled one shows a card with the name and size, **Save a copy** (always a download with the generic type, so the browser never opens or runs the file) and, for a name ending in .pdf, .epub or .docx, **Open in reader**.
- **Storage:** no new table. Files live in `bookFiles` (`pageId` = the page they are on; any safe MIME type; at most 50 MB), so backup, Trash, "Delete forever" and sync (rule `file`) already cover them. A book is told by its first bytes (`detectBookFormat`), never by the name or the claimed type. "Notes only" backups keep the row but not the bytes (the card says the file is not on this device).
- **Open in reader** (`library/attachmentReader.ts`, started from `App.tsx` so the editor never imports the Library; the file code is `core/attachments.ts`): the first time, the file is imported into Books like any book (`importBook`) and the new Library page is remembered in `BookFile.readerPageId`; later opens reuse it. Failing the book check shows a plain message.
- **Camera:** Insert › Camera and "/camera" open a file input with `accept="image/*" capture="environment"` (the back camera on a phone or iPad, a picker on a computer); the photo goes through `saveImage` + `shrinkImage` and is inserted as a picture block.

## Edge cases

- A file over 50 MB or an empty file is refused with a message. A deleted or missing file shows "not on this device".
- Two devices: the file bytes sync like pictures; until they arrive "Save a copy" says the file is missing.
- `readerPageId` pointing at a deleted Library page: the file is imported again.

## Security check

- Never navigated to or rendered: the bytes are only offered as a download (octet-stream). No scripts, no iframe, no object URL opened in the page. The row check (`checkRows.ts`) accepts only a plain `type/subtype` MIME string; `readFull.ts` checks the bytes of book types against their format.
- The camera needs the user's tap; nothing is read until a photo is chosen.

## Tests

- Unit: `src/library/attachments.test.ts` (reference parsing, any file kept, books told by bytes, import once and reuse, backup row check), `src/editor/insertBlocks.test.ts` (round trip of table, toggle with a child and file through our records; search finds table text), `slashMenu.test.ts`, `blockTypes.test.ts`.
- E2E: `e2e/insertBlocks.spec.ts` (table survives reload, toggle, file attach + save + reload + open in reader, non-book file, camera).
- Owner (iPad): Insert › Camera opens the iPad camera; a photo lands in the page. Attach a real PDF and tap Open in reader.
