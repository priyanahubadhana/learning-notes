# Paper page: research (8 Nov 2026)

Question: should the app get a fixed "paper page" (GoodNotes, Notability, Noteshelf, OneNote style) next to block pages, and how?
Method: two web searches today plus prior knowledge of these apps. Points marked **[unverified]** come from memory or third-party pages, not official docs, and need a check before building. Related: [ink.md](../features/ink.md), [lasso-pencil-goodnotes.md](lasso-pencil-goodnotes.md), [write-pad-2026-11.md](write-pad-2026-11.md).

## 1. How the apps model a page

| App                                            | Page model                                                                                                   | Templates                                                                                                                                   | Typed text                                                                             | Infinite mode                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GoodNotes 6 (iPad, Mac, Windows, Android, web) | Fixed pages in a notebook. Sizes: A4, Letter, A5, GoodNotes Standard, custom. Portrait or landscape per page | Blank, lined, grid, dotted, planners, a PDF as a page. "Dynamic templates" change size, colour and spacing in the app (third-party listing) | Text box tool: a floating box you place, resize and move. No text flowing across pages | Vertical or horizontal page scroll (a setting). No real infinite canvas; whiteboards are separate **[unverified]** |
| Notability                                     | Paper pages that grow as you write: continuous vertical scroll **[unverified]**                              | Lined, grid, dotted, colours                                                                                                                | Typing flows as a text area at the top; text boxes float                               | Continuous scroll is its signature feature; GoodNotes users ask for it (GoodNotes forum)                           |
| Noteshelf 3                                    | Fixed pages, like GoodNotes                                                                                  | Large template library                                                                                                                      | Text box tool                                                                          | Vertical or horizontal page scroll **[unverified]**                                                                |
| OneNote                                        | Infinite canvas per page, growing right and down; an optional paper-size view for printing                   | Rule lines and grid (View tab)                                                                                                              | Click anywhere: a "note container", a positioned box of flowing text                   | The whole page is the canvas                                                                                       |

The common pattern is that **a page is a fixed rectangle (in points, 72 per inch) with a background template, and everything on it (ink, text boxes, images, shapes) sits at an absolute x,y.** Ink never re-flows. A text box keeps its own wrap width, and an image is a box you can crop and turn. Layers mostly mean z-order.

## 2. Zoom, pan, navigation, typed text

- **Zoom:** pinch from about 50 % to 400-800 %, fit-to-width by default, double-tap to reset **[unverified ranges]**. Ink is redrawn as vectors at the new scale, with a quick bitmap stretch during the pinch.
- **Pan:** two fingers, or one finger in Pencil-only mode. The Pencil never pans.
- **Navigation:** a thumbnails sidebar or grid (a bottom strip on a phone), go-to-page, add a page before or after (the new page copies the template), drag thumbnails to reorder, bookmarks and an outline. Swiping past the last page, or tapping "+", adds a page.
- **Typed text:** **text boxes, not flowing text.** You tap with the Text tool and type; the box grows down and has a width handle. Text never moves on to the next page. This is the key trade-off: paper is handwriting-first, and long typed notes stay in block pages.

## 3. Export, print, search

- **Export:** PDF (vector ink, page size kept), an image per page, and the app's own format. Print is that PDF at the real paper size. A fixed size prints exactly, which is a strong reason to prefer fixed pages over an infinite canvas.
- **Search:** typed and PDF text are searched directly. Handwriting is recognised in the background on the device (Apple's frameworks, or MyScript in some apps) and hits show as boxes over the ink **[unverified per app]**. GoodNotes 6 added AI handwriting spellcheck and autocomplete (MacRumors, 9 Aug 2023).
- **For us:** the web has no free on-device handwriting recognition. Search covers text boxes and drawing labels now. Handwriting search waits for Phase P (AI, needs cost approval).

## 4. Web feasibility (libraries)

| Library          | What it is                  | Licence                                                                                                                                                                                        | Size (min+gz, approx)   | Fit                                                                                      |
| ---------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| tldraw SDK 4     | Full infinite-canvas editor | **Production needs a licence key**: a 100-day trial, then a paid commercial licence (price on request); the hobby licence keeps the "made with tldraw" watermark (tldraw.dev, read 8 Nov 2026) | ~1 MB+ **[unverified]** | No: it costs money, brings a second ink engine, and its own store clashes with E2EE sync |
| Excalidraw       | Hand-drawn-style whiteboard | MIT                                                                                                                                                                                            | ~1 MB+ **[unverified]** | No: sketchy look, weak pen, its own data model                                           |
| Konva            | 2D canvas scene graph       | MIT                                                                                                                                                                                            | ~55 kB **[unverified]** | Possible for boxes, but we already render ink ourselves                                  |
| Fabric.js        | Canvas objects with handles | MIT                                                                                                                                                                                            | ~90 kB **[unverified]** | Duplicates our Lasso handles                                                             |
| perfect-freehand | Pressure stroke outlines    | MIT                                                                                                                                                                                            | ~2 kB                   | **Already used**                                                                         |

**iPad Safari:** the limits that matter are a maximum area per canvas (about 16.7 M pixels) and a total canvas memory cap on older iPads **[unverified figures]**, plus slow full repaints. Our engine already uses screen-sized canvases, a cached bitmap per layer, and redraws only the live stroke. For example, A4 (595 x 842 pt) at DPR 2 and 2x zoom is 2380 x 3368 px (about 8 M px), which fits. At 4x zoom we must paint only the visible part, which is the rule we already follow.

**Conclusion: no new library.** Build paper pages on our own ink engine, and draw text boxes and images as plain positioned DOM elements over the canvas. That keeps text crisp, accessible and selectable, keeps IME and Scribble working, and costs ₹0 with almost no bundle growth.

## 5. Recommended design: a "Paper page" type

### 5.1 Data model (a sketch; final names at planning)

- `Page.kind`: `'blocks'` (today) or `'paper'`. A paper page is an ordinary page in the tree, so title, notebook, Trash, History and sharing are reused.
- `PaperSheet` rows, one per sheet, ordered by a fractional `order` key: `id, pageId, order, size ('A4'|'Letter'|'A5'|'custom'), w, h (pt), orientation, template ('blank'|'lined'|'grid'|'dots'), spacing (pt), paperColour, updatedAt (UTC ms), deleted`.
- `PaperItem` rows: `id, sheetId, kind ('text'|'image'|'shape'), x, y, w, h, rot, z, data`. For text, `data` is a small BlockNote/ProseMirror JSON doc; for an image, a media id. Units are sheet points, so nothing anchors or re-flows.
- **Ink:** reuse `inkLayers` and `inkChunks` with a new anchor `sheet:<sheetId>`, in sheet points instead of page widths plus block offsets. Chunks per sheet also give lazy loading for free (load only the sheets on screen).
- **Sync and backups:** these are just new Dexie tables (a version bump) under the same row rules: UTC times, soft delete, last writer wins per row, and the whole row encrypted in the E2EE pipeline like other note content. `checkRows.ts` checks the limits (items per sheet, sheets per page, finite numbers, bounds). History copies hold sheets, items and ink. **[Check against the sync design when it lands; sync waits on the deep research.]**

### 5.2 Working with block pages

- **Embed:** a "Paper sheet" block in a block page shows a sheet as a read-only preview, and a tap opens it. Cheap and very useful.
- **Convert:** both ways, always as a one-way copy (never a live link).
  - Blocks to paper puts each text block in a text box down the sheet. This loses layout, so it makes a copy and keeps the original.
  - Paper to blocks turns the text boxes into paragraphs in reading order (top to bottom, then left to right). Ink becomes an embedded sheet picture.
- **Summary and cards:** reuse the Lasso's Make card and Add to Summary. A Summary line can point to `sheet:<id>#rect`. The notebook Summary stays a block page.
- **Search:** text boxes are indexed like blocks; ink labels work as today.

### 5.3 What we reuse

| Piece                                                 | Reuse                                                                                          | Change needed                                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Ink engine (pens, eraser, shapes, tape, layers, undo) | Yes                                                                                            | A "sheet" coordinate mode: fixed points under a zoom/pan transform instead of block anchoring (a second path in `ink/layout.ts`) |
| Lasso                                                 | Yes                                                                                            | Also select `PaperItem`s and move, resize and turn them (real positions now)                                                     |
| Ruler, Magnifier                                      | Yes                                                                                            | Map through the zoom transform                                                                                                   |
| Write pad                                             | Yes                                                                                            | Lands strokes on the sheet; Next line follows the sheet's ruled spacing exactly                                                  |
| Paper behind ink (`paperGrid.ts`)                     | Yes                                                                                            | Spacing in pt, drawn per sheet                                                                                                   |
| Text                                                  | BlockNote/ProseMirror in each box: an editor mounted only while editing, static HTML otherwise | New: box tool, auto-grow, width handle                                                                                           |

### 5.4 MVP vs later

**MVP (one phase):**

- New paper page: A4 or Letter, portrait or landscape, blank, lined, grid or dots.
- Sheets scroll vertically; add, delete and reorder them.
- Zoom (pinch, fit width to 4x) and pan (two fingers).
- All existing ink tools.
- Text boxes (plain, bold, italic, lists) and images.
- Thumbnails sidebar.
- PDF export and print.
- Backups, History and Trash.
- Embed block.
- Lasso on items.

**Later:**

- Horizontal flow, custom sizes, and planner or PDF templates.
- Infinite canvas mode (OneNote style).
- Converting either way.
- Handwriting search and convert-to-text (Phase P, AI cost).
- Stickers.
- Audio replay.
- Sheet sharing.
- PDF import as sheets (overlaps the reader step).

**Recommendation: fixed sheets for the MVP, not an infinite canvas.** They print exactly and give the page feel the owner asked for. Canvas sizes stay bounded (safe on iPad), and loading works sheet by sheet. Infinite canvas can come later as an "endless" sheet size.

### 5.5 Risks

- **Scope:** this is close to a second editor. Gesture conflicts on iPad Safari (zoom, pan, Pencil, text box focus, Scribble) will take the most time. Prototype the gestures first.
- **Two ink coordinate models in one engine:** this could break block pages. Keep anchoring behind one interface and unit-test both paths.
- **Text editing inside a CSS-transformed (zoomed) layer:** caret, selection and IME bugs in Safari are a known pain **[unverified]**. The fallback is to keep the boxes outside the transform and position them by maths.
- **PDF export with vector ink and real fonts:** needs a library (for example pdf-lib, MIT) or the browser's print to PDF. Check its size and licence at planning.
- **Memory with many sheets and images:** load sheet by sheet and cache small thumbnail images.
- **Rules:** this is new scope. CLAUDE.md says no building beyond the current phase, so it needs its own ROADMAP phase with the owner's OK.

### 5.6 Owner checks

1. Fixed sheets first (recommended), or a Notability-style long continuous page?
2. Default size: A4 worldwide, with Letter for US locales?
3. Typed text on paper as text boxes only (like GoodNotes): OK?
4. Which phase does this go into? It is not in the current redesign plan.
5. Anything to cut from or add to the MVP list (horizontal flow, PDF import)?
6. Later, on the real iPad: zoom and pan feel, writing at 2x and 4x, typing in text boxes with Scribble.

## Sources

- GoodNotes feedback forum, "Scroll PDF vertically" (user requests citing Notability; read 8 Nov 2026): https://feedback.goodnotes.com/forums/191274-goodnotes-ideas/suggestions/3573150-scroll-pdf-vertically?page=12
- MacRumors, "GoodNotes 6 brings AI-powered handwriting spellcheck" (9 Aug 2023): https://www.macrumors.com/2023/08/09/goodnotes-6-ai-powered-handwriting-spellcheck/
- Goodnotes 6 App Store listing (read 8 Nov 2026): https://apps.apple.com/ie/app/goodnotes-6/id1444383602
- Goodnotes Marketplace (templates for Apple, Android, Windows and web; read 8 Nov 2026): https://marketplace.goodnotes.com/product/6724756bff5ddf53d0962bcc
- Dynamic templates, third-party (read 8 Nov 2026): https://discovernotes.gumroad.com/l/dynamicsquared
- tldraw pricing and licence key (read 8 Nov 2026): https://tldraw.dev/pricing , https://tldraw.dev/sdk-features/license-key
- App Developer Magazine, tldraw SDK 4.0 licensing: https://appdevelopermagazine.com/tldraw-sdk-4.0-release-new-starter-kits-and-licensing-model/
- From memory, all marked unverified: the OneNote, Notability and Noteshelf details, the library sizes, and the Safari canvas limits.
