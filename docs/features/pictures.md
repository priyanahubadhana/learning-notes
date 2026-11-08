# Pictures

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Lets the user add pictures from the device into notes and database cells, stored inside the app (never as web addresses or file paths).

## How it works

- `src/images/imageService.ts`: `saveImage` checks the type and size, optionally shrinks the picture, and stores a `StoredImage` (name cut to 200 characters) in the `images` table (database version 12).
- `shrinkImage.ts` (browser only): longest side at most 1600 px, stored as WebP (quality 0.86) if that is smaller than the original; GIFs are kept as they are; if the browser cannot decode the file, the original is kept.
- In notes and cells a picture is the text `lnimg:<uuid>` (`imageRef.ts`); `parseImageRef` accepts only that exact form. `imageObjectUrl` makes a browser object URL to show it, cached for the page's life.
- Files: `bundle.ts` exports the pictures a notebook uses as base64; `importBundle` stores them as new images and `remapImageRefs` updates the references.

## Adding a picture (fix #5)

Insert › Picture (ribbon, short bar), "/image" and the empty picture block's Add button all open one small sheet (`images/PictureChooser.tsx`, lazy; state in `pictureChooserStore.ts`): Photos (file input `image/*`; on iPad Photo Library, Take Photo, Choose File), Files, Camera (`capture`), Paste (`navigator.clipboard.read`; if blocked or empty, a hint "Press and hold → Paste" and a paste target), Cancel. The picture block is created only after a picture is chosen (`placePicture.ts`: `saveImage` + `shrinkImage`, so Dexie and Drive sync as before; with a block id it fills that block). No web-address (Link) choice: pictures are never kept as web addresses. Tests: `pictureChooser.test.ts`, `e2e/pictureChooser.spec.ts`. Owner (iPad): owner-checks-pending.md.

## Picture editor (G0, wave 3)

Block menu (⋮⋮ › Edit picture) or the toolbar over a selected picture opens a sheet (`images/CropSheet.tsx`, host in `images/pictureEditor.tsx`): Turn left/right, Straighten (±45°), Zoom (buttons, Ctrl+wheel, pinch), four 44 px corner handles (arrow keys move the focused corner; the box itself moves too), shape chips (Free, Original, 1:1, 4:3, 3:4, 16:9), Reset. **Save** replaces the picture in the note (one Undo: the editor's own history); **Cut out as new picture** adds the result as a second picture below and leaves the first alone; **Restore original** (when the picture is an edit) goes back to the first picture. All maths is in `images/editImage.ts` (pure, tested); `saveEditedImage` stores a new row with `originalId`. No blur. Arrows and ink over a picture already work (ink anchors to the picture block); "Draw on picture" is the Shapes tool with the arrow ready (G1). Tests: `editImage.test.ts`, `e2e/pictureEditor.spec.ts`.

## Picture resize (G3, wave 4)

Tap or click a picture in the page: four corner handles (44 px to grab) appear (`editor/PictureHandles.tsx`, pointer events, so a finger, the Pencil and a mouse all work; BlockNote's own side handles only react to a mouse hover). Dragging a corner away from the centre makes the picture bigger, towards it smaller (`editor/pictureResize.ts`: the stronger of the two moves counts, 64 px to the page width; a centred picture follows the finger on both sides). The width changes live; on release it is saved in the block as `previewWidth` (BlockNote's own prop), so it is the same after a reload and the height follows. Handles show only while the page is editable.

## Selecting across pictures (batch 2e)

A drag with the Apple Pencil or a mouse that starts on a picture, ends on one or passes over one selects whole blocks, pictures included, so Copy, Delete and Move act on the whole range; the pictures inside any selection get a visible mark. BlockNote's own selection is a text selection, which cannot start or end in a block without text, so `src/editor/dragSelect.ts` watches pen and mouse drags and, when a picture is involved, sets its own `BlockRangeSelection` (whole blocks from the first to the last at the level they share, children included; no cursor drawn). A text-only drag is left to the browser; a finger keeps scrolling (long-press selection and handles are the browser's). A picture is not dragged away by the pointer (the ⠿ side handle moves blocks). Tests: `dragSelect.test.ts` (range maths, delete, copy, marks) and `e2e/penSelect.spec.ts` (simulated pen from text over a picture, from a picture, to a picture, upwards, mouse, Copy, Delete, Move, text-only, finger).

## Selected picture look (9 Nov)

A selected picture (Lasso or tap) gets a dashed orange outline on the picture itself, not the box around it.

## Picture action bar (9 Nov)

A tapped or pressed picture shows an action bar above it (below when there is no room): Copy, Cut, Duplicate, Delete, Resize (shows or hides the corner handles), Deselect (`PictureHandles.tsx`). Test: e2e/pictureActions.spec.ts.

## Edge cases

- A missing or deleted picture gives `null` and nothing is shown.
- Big base64 is built in pieces (`base64.ts`) to avoid a stack overflow.

## Security check

- Allowed types only: png, jpeg, webp, gif. SVG is refused because it can carry scripts.
- At most 25,000,000 bytes per picture before shrinking.
- Pictures in imported files: type check, base64-only text, under 60 million characters.
- Reference lookalikes are rejected; a web-link cell accepts a picture reference but not other schemes (tested).
- Nothing leaves the device.
- Deletes: `imageObjectUrl` treats a soft-deleted picture as missing. The code read does not show pictures being erased when their note is deleted (not confirmed).

## Tests

`src/images/images.test.ts`; e2e: `pictures.spec.ts`.
