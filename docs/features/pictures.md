# Pictures

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Lets the user add pictures from the device into notes and database cells, stored inside the app (never as web addresses or file paths).

## How it works

- `src/images/imageService.ts`: `saveImage` checks the type and size, optionally shrinks the picture, and stores a `StoredImage` (name cut to 200 characters) in the `images` table (database version 12).
- `shrinkImage.ts` (browser only): longest side at most 1600 px, stored as WebP (quality 0.86) if that is smaller than the original; GIFs are kept as they are; if the browser cannot decode the file, the original is kept.
- In notes and cells a picture is the text `lnimg:<uuid>` (`imageRef.ts`); `parseImageRef` accepts only that exact form. `imageObjectUrl` makes a browser object URL to show it, cached for the page's life.
- Files: `bundle.ts` exports the pictures a notebook uses as base64; `importBundle` stores them as new images and `remapImageRefs` updates the references.

## Picture editor (G0, wave 3)

Block menu (⋮⋮ › Edit picture) or the toolbar over a selected picture opens a sheet (`images/CropSheet.tsx`, host in `images/pictureEditor.tsx`): Turn left/right, Straighten (±45°), Zoom (buttons, Ctrl+wheel, pinch), four 44 px corner handles (arrow keys move the focused corner; the box itself moves too), shape chips (Free, Original, 1:1, 4:3, 3:4, 16:9), Reset. **Save** replaces the picture in the note (one Undo: the editor's own history); **Cut out as new picture** adds the result as a second picture below and leaves the first alone; **Restore original** (when the picture is an edit) goes back to the first picture. All maths is in `images/editImage.ts` (pure, tested); `saveEditedImage` stores a new row with `originalId`. No blur. Arrows and ink over a picture already work (ink anchors to the picture block); "Draw on picture" is the Shapes tool with the arrow ready (G1). Tests: `editImage.test.ts`, `e2e/pictureEditor.spec.ts`.

## Selecting across pictures (batch 2e)

A drag with the Apple Pencil or a mouse that starts on a picture, ends on one or passes over one selects whole blocks, pictures included, so Copy, Delete and Move act on the whole range; the pictures inside any selection get a visible mark. BlockNote's own selection is a text selection, which cannot start or end in a block without text, so `src/editor/dragSelect.ts` watches pen and mouse drags and, when a picture is involved, sets its own `BlockRangeSelection` (whole blocks from the first to the last at the level they share, children included; no cursor drawn). A text-only drag is left to the browser; a finger keeps scrolling (long-press selection and handles are the browser's). A picture is not dragged away by the pointer (the ⠿ side handle moves blocks). Tests: `dragSelect.test.ts` (range maths, delete, copy, marks) and `e2e/penSelect.spec.ts` (simulated pen from text over a picture, from a picture, to a picture, upwards, mouse, Copy, Delete, Move, text-only, finger).

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
