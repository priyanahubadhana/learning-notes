# Share and export

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Take notes out of the app: a page (or a whole notebook) as a PDF, a Word file, Markdown or plain text, saved to the device or sent through the share sheet. Notebook files ("Share one notebook", "Add as copies") now carry handwriting too.

## How it works

- **Where:** page ⋯ › **Export**, and the notebook ⋯ › **Export notebook**. Both open `share/export/ExportDialog` (lazy-loaded): pick a format, the file is made on the device, then **Save file**, **Share…** (only when `navigator.canShare({ files })` says yes: the iPad share sheet) or, for PDF, **Print or save as PDF**. A page with sub-pages offers **Include sub-pages**.
- **One model for every format (`share/export/model.ts`):** live blocks become `ExportNode`s (paragraph, heading, lists, to-do, toggle, quote, callout, code, divider, image, table, card question, mind map as an outline, embed link, file name). Note links and tags become their saved text. Databases and card lists are left out (they are views of other data). `markdown.ts` (Markdown and text), `docx.ts` and `printHtml.ts` read this one model.
- **Markdown:** headings are one level under the page title; sub-pages are deeper headings. A page with pictures becomes a **zip** (`Title/Title.md` + `Title/images/1.png`), otherwise a single `.md`.
- **Word (`docx.ts`):** a `.docx` written by hand with `fflate` (a zip of XML parts: document, styles, numbering, relationships, media). Real heading styles, bold/italic/underline/strike/colour/highlight runs, links, bullet and numbered lists (each numbered list restarts at 1), to-do boxes as ☐/☑, quotes, code, tables, pictures (webp is redrawn as PNG because Word cannot read it). Unit-tested by unzipping and parsing every part.
- **PDF (`printHtml.ts`, `exportService.printDocument`):** a self-contained HTML document with print CSS (A4, 18 mm margins) is shown in a hidden frame (a `blob:` URL, allowed by the CSP) and sent to `window.print()`; the user picks "Save as PDF" (iPad: Share, Save to Files). Text stays text, so it is selectable and searchable in the PDF.
- **Ink:** when the page being exported is open, `ink/pagePicture.ts` draws the page as it looks (words in the theme's colours, then all visible layers of ink on top, capped at 12 million pixels) and the picture is appended after the page's content in the **PDF and Word** files. Markdown and text have no ink. Notebook-wide export has no ink picture (only the open page has a layout).
- **Locked pages** are left out of a notebook export and of sub-page export, and counted ("2 locked pages were left out"); the page you are looking at is exported.
- **Notebook files carry ink:** `Bundle` has optional `inkLayers` and `inkChunks`. Export fills them for the notebook's pages; import gives them new ids and points them at the new page and note ids (strokes keep their ids; ids only need to be unique within a page). Older files simply have none. Rows are checked field by field by `checkRows.ts` like any other table. No Dexie version.

## Edge cases

- A note whose picture is missing from storage is exported without the picture.
- The print window is the browser's own: a test can only check that the frame exists. A browser that blocks `print()` in a hidden frame shows "Could not make the file."
- The ink picture uses the theme's page colour, so a PDF made in Night is dark. Switch to Day before exporting if you want white paper.
- File names are cleaned (`\ / : * ? " < > |` and control characters become spaces, 80 characters).
- Share can be cancelled: nothing happens.

## Security check

- Everything is made on the device; nothing is uploaded.
- Text is escaped for XML and HTML; link targets are kept only when they start with `http:`, `https:` or `mailto:` (no `javascript:`).
- The printable document is a `blob:` page in a frame with no scripts of its own.
- Deletes: none. Locked pages are not exported unless open.

## Tests

`src/share/export/export.test.ts` (Markdown, text, sub-pages and locked pages, docx structure and well-formed XML, print document escaping), `src/share/bundle.test.ts` (ink round trip), `e2e/export.spec.ts` (Markdown, Word, Text downloads; PDF print frame). Owner: PDF and Word from the installed iPad app through the share sheet (owner-checks-pending.md).
