# Pictures

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Lets the user add pictures from the device into notes and database cells, stored inside the app (never as web addresses or file paths).

## How it works

- `src/images/imageService.ts`: `saveImage` checks the type and size, optionally shrinks the picture, and stores a `StoredImage` (name cut to 200 characters) in the `images` table (database version 12).
- `shrinkImage.ts` (browser only): longest side at most 1600 px, stored as WebP (quality 0.86) if that is smaller than the original; GIFs are kept as they are; if the browser cannot decode the file, the original is kept.
- In notes and cells a picture is the text `lnimg:<uuid>` (`imageRef.ts`); `parseImageRef` accepts only that exact form. `imageObjectUrl` makes a browser object URL to show it, cached for the page's life.
- Files: `bundle.ts` exports the pictures a notebook uses as base64; `importBundle` stores them as new images and `remapImageRefs` updates the references.

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
