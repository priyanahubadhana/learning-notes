# Library, book reader and highlights

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Books and other sources live in the app as ordinary pages. The Library space shows them as a gallery (cover, title, author, progress, Continue); a PDF or EPUB opens in a reader with highlights, notes, bookmarks and Contents; everything you highlight lands on the book's page and can become cards. Master plan phase C (C1, C2, C3, C4).

## How it works

- **Data (Dexie 17, only adds tables):** `bookFiles` (`pageId`; the file as an `ArrayBuffer`, `name`, `mime`, `size`) and `annotations` (`[pageId+kind]`, `updatedAt`). `Page.source` (`PageSource`: `kind` book/article/video/audio/file/paste, `url`, `capturedAt`, `videoId`, `startSec`, and for books `fileId`, `format`, `author`, `coverImageId`, `pageCount`, `progress` 0 to 1, `at`, `openedAt`) is an optional field with no index. `Notebook.kind` gains `books` and `sources`. `Annotation`: `kind` highlight/note/bookmark, `colour` (five), `anchor` (`block`, `pdf` with page and page-fraction rects, `epub` cfi, `time`), `quote` (exact, prefix, suffix), `note` (20,000 characters at most), `chapter`, `savedTo`, `cardIds`, `origin` (`user`/`ai`).
- **Import (`src/library/`):** `importBook` checks size (300 MB) and the kind by the file's first bytes (`core/bookFormat.ts`: `%PDF`, a zip with `mimetype` = `application/epub+zip`, a zip with `word/document.xml`), reads title, author, page count and a cover in the browser (`inspect.ts`: pdf.js renders page 1 at 300 px; the EPUB package gives the cover; a DOCX or coverless book gets a generated title cover), stores the file, makes the Books notebook once and a page with three sections (Highlights & notes, Summary, Cards). A DOCX becomes a page tree, one chapter page per Heading 1 (mammoth, cleaned by `sanitizePastedHtml`, then `editor/textBlocks.ts`), each opening in Reading mode.
- **Gallery:** `LibraryScreen` (Library space) with the filters All, Books, Videos, Articles, Pasted, drag and drop of files (links and text open Capture), `LibrarySidebar` for quick opening, `BookHeader` on every source page. Continue opens the reader at the saved spot; "Read again" when finished.
- **Reader (`src/reader/`):** route `#/read/<pageId>?at=<locator>`. `pdf/PdfView` draws the visible pages and one screen either side (canvas memory through `app/canvasBudget`, pages beyond released), a text layer for selection, saved highlights as coloured boxes, a drawn-box highlight on pages with no text, zoom 50 to 300 %, Contents from the PDF outline. Position is a locator `pdf:<page>:<y fraction>`; it is saved after 2 s of stillness, on hide and every 30 s, never per scroll event.
- **Highlights and notes (C4):** selecting text shows a bar with five colours, Note, Copy, Look up (dictionary, Wikipedia, translate: opens a web page for that word only), Pin (bookmark) and Save to… Every highlight is also copied to the book page's Highlights & notes section with a link back (`#/read/...` as a full app address, caught by `deepLink.ts` so it opens inside the app, no new tab). The annotations panel filters by type, colour and chapter, jumps to a spot (with a glow), edits notes, deletes with Undo, and exports Markdown (copy or file). `annotationService.reanchor` finds a quote again by its surroundings.
- **Backups:** both tables travel in "Everything"; "Notes only" keeps the book rows with empty bytes (like pictures) and all annotations. A file from an older version can Replace when every version after it only added tables (`TABLE_ONLY_VERSIONS` in `share/restore.ts`). Delete forever blanks the file bytes and the highlight text.

## Edge cases

- A book file missing on this device (notes-only backup): the reader says so; importing again restores reading.
- A PDF that the reader cannot show: "The book could not be shown."
- DOCX progress is not tracked (chapters are ordinary pages).
- Pinch zoom, ink on book pages, EPUB page curl and the Liquid mode are not built (see DECISIONS).

## Security check

- File type decided by bytes, never by name or the browser's claim; 300 MB cap; zip contents read by name only (no extraction to disk).
- No script from a book ever runs: PDFs are drawn by pdf.js on canvas; DOCX text goes through the sanitiser; EPUB (C3) is shown in a sandboxed frame without scripts.
- `PageSource.url` must be https and at most 2,000 characters; backup rows are checked field by field (`share/checkRows.ts`, `core/sourceCheck.ts`).
- Look up opens only the selected word, in a new tab with `noopener`.
- pdf.js and mammoth: licences Apache-2.0 and BSD-2-Clause, versions pinned (6.4.299, 1.13.0), loaded only when a book is imported or read.

## Tests

- Unit: `src/library/library.test.ts`, `src/reader/reader.test.ts`, `src/capture/capture.test.ts`, `src/share/bookBackup.test.ts`, `src/core/migration.test.ts` (16 to 17), `src/app/router.test.ts`.
- E2E: `e2e/library.spec.ts` (import PDF/EPUB/DOCX, refusal, progress and resume, Contents, zoom, bookmark, highlight survives reload and lands on the book page, note, Undo, Markdown copy, link back to the spot).
