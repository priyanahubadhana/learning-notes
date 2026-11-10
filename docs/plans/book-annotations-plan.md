# Book annotations plan (item 43)

Research: [docs/research/book-annotations-2026-11.md](../research/book-annotations-2026-11.md). Status: waiting for owner OK and comparison with the owner's own research.

## Recommended model
- Book ink and highlights stay **on the book** (`annotations`, `inkLayers` keyed by book locator). The note page **never** gets raw strokes.
- The note page's "Highlights & notes" section shows one **annotation card** per item, rendered live from `annotations`: quote text **or** snapshot image of the area, colour bar, "p. 12 · Chapter 3" link (`#/read/<pageId>?at=...`, glow on arrival), user's note (editable), created date, type icon.
- New annotation kind `ink`: strokes drawn close in time (~3 s) and space on one page group into one annotation with a bounding box (`anchor.pdf` rects / `epub` paragraph). Snapshot = PNG of that box (page + ink), stored as an image row, made lazily, refreshed when strokes change.
- Grouped by chapter (outline / EPUB nav; fallback "Page N"); filter chips for colour and type (highlight, note, ink, area, bookmark).
- Per card: **Make card** (front = quote or image, back = note; sets `cardIds`), **Add to Summary** (linked quote block in Summary; sets `savedTo`), Open in book, Delete with Undo.
- Handwriting stays an image. "Convert to text" (AI) **hidden until the owner approves the cost** (CLAUDE.md).
- Nothing loose: the section is a read-only live block (`bookAnnotations`); typing goes into a card's note field.

## Migration (Dexie version bump, adds only)
1. Find ink on book note pages and copied highlight blocks in the section.
2. Strokes whose source locator is known move to the book's layer; unknown ones become one `ink` annotation "From before (no page)" with a snapshot, so nothing is lost.
3. Replace old copied blocks with the live block. Save a History version first (rollback).

## Sync and export
- `annotations` and snapshot images already travel in backup/sync; add `kind: ink`, `strokeIds`, `snapshotId`; update `TABLE_ONLY_VERSIONS`.
- Markdown export grouped by chapter: quote, note, link, snapshot image (images in the zip).
- Delete forever also blanks snapshots.

## Steps for the Sonnet builder (tests in each)
1. Model: `ink` kind, `strokeIds`, `snapshotId`; pure grouping function. Unit tests: grouping, locators.
2. BookInk writes create/update the `ink` annotation; remove any copy to the note page. Unit test: no stroke ever owned by the note page.
3. Snapshot service (pdf.js canvas + ink to PNG; EPUB paragraph), lazy, uses `canvasBudget`. Unit test bbox maths; E2E image appears.
4. `bookAnnotations` live block: chapter groups, filters, jump with glow, edit note, Undo delete, virtualised list (rules/scalability). E2E.
5. Make card / Add to Summary. E2E: card with image front; Summary gets linked quote.
6. Migration + History version. Unit test with old loose-ink fixture; E2E: no loose ink after reload.
7. Export, backup round-trip, Delete forever. Unit tests. Update docs/features/library.md and CHANGELOG.

## Owner questions
1. Group nearby ink into one card (recommended) or one card per stroke?
2. Old ink with no known page: keep as "From before" card (recommended) or delete?
3. Highlights only as cards, or also as quote blocks in the note text?
4. AI "Convert to text" for handwriting: keep hidden until cost is approved?

## Owner answers (10 Nov)
- Old loose ink with no known page: keep as a "From before" card.
- Highlight cards (owner idea): by default a card shows only the highlight; tapping it expands to show the whole book page with the highlight marked. Each card also has an adjustable "context frame": a crop window the user can drag/resize to choose how much of the page around the highlight the card shows (saved per card).
- AI "handwriting to text" button: build it (cost shown first), but only after the research is complete and validated.
- Status: WAIT — do not build until the owner confirms the remaining questions and finishes their own research.
- Handwriting: one card per phrase (nearby strokes grouped). Context frame: auto (paragraph), adjustable, saved per card. Colours: named colour meanings with filters.
- Tap vs hold (owner): tap a card = it expands in place to the whole page with the highlight marked; press-and-hold = a floating preview of the page/context window, and tapping inside that preview jumps to the spot in the reader (works like a link).
