# Paper page: plan (8 Nov 2026, draft for the owner)

Status: **plan only, nothing built.** The owner approved the idea on 8 Nov 2026. Building waits for answers to the open questions in section 6.
Research: [research/paper-page-2026-11.md](../research/paper-page-2026-11.md). Related specs: [ink.md](../features/ink.md), [sync.md](../features/sync.md), [editor-and-blocks.md](../features/editor-and-blocks.md).

**In one line:** a new page type. Fixed sheets (A4 or Letter) scroll down the screen. You write on them with the Pencil, and you type in "block boxes": small copies of our normal block editor placed anywhere on the sheet. Block pages do not change at all.

## 1. Feature inventory: how each feature behaves on a Paper page

Key:
- **Box** = works as it is inside a block box, because a box is a real block editor.
- **Adapt** = works, but needs some paper-specific work (listed).
- **Not on paper** = not offered on paper in the MVP.

| Feature | Verdict | What happens / what is needed |
|---|---|---|
| Blocks (text, headings, lists, quote, code, toggle, callout) | Box | The same editor. Enter adds a line and the box grows downwards. The page never grows. |
| Copy and paste inside a box | Box | Same rules as today ([copy-paste.md](../features/copy-paste.md)). |
| Copy and paste of whole boxes | Adapt | New: the Lasso's Copy/Duplicate takes boxes as well as ink. Pasting a box creates a new box with copied blocks (new ids). |
| Pasting from a block page onto empty paper | Adapt | Creates a new box at the tap point with the pasted blocks. |
| Block drag handle (⋮⋮ menu, move blocks) | Box | Works inside one box. Dragging a block from one box to another is not in the MVP. |
| Slash commands `/` | Box | All of them, with two exceptions: New sub-page and Insert database open as a link chip inside the box (as they do today), and `/paper` is hidden inside a box (no paper page inside paper). |
| Tables (simple table block) | Box | Works as it does. A wide table scrolls inside its box. |
| Databases (inline /database block: Table, Board, Gallery, List, Calendar layouts, dashboards) | Adapt | They render inside a box. A database needs room, so the box gets a minimum width of 60 % of the sheet, and the views scroll sideways inside it. Board drag-and-drop inside a zoomed box is an iPad check. Database row pages stay block pages. |
| A Paper page as a database row | Not on paper | Rows stay block pages (MVP). |
| Templates (new page from a template, Save as template) | Adapt | MVP: "Blank paper page" only. Saving a paper page as a template comes later (it needs sheets, boxes and ink copied). Inserting a block template inside a box works (Box). |
| New-page start (Study first) | Not on paper | Paper pages open on an empty sheet. |
| Summary: Add to Summary | Box + adapt | The button works inside a box. The line must go to the **paper page's** Summary (it gets the paper page id, not the box's), so the line still opens the right box. |
| Summary tab (Summary · Notes · Review) | Adapt | The same three tabs; Notes = the paper. Lasso › Add to Summary of ink adds a picture line (later, as for block pages today). |
| Recall cards (Make card, Card blocks, one-tap recall) | Box | Cards keep their block id; Review shows the card's text. "Open source" opens the paper page at the box. |
| Revise marks | Box | Same as today, inside the box. |
| Links `[[` and page links | Box | Same. A link **to** a paper page opens it. A link to a block inside a box opens the paper page and scrolls to the box. |
| Linked from (backlinks) | Adapt | Shown under the last sheet, the same list. |
| Box "link" (owner list: boxes can be linked) | Adapt | New: a box can point to another page or box (a chip on the box corner). Needs your meaning (Q5). |
| Tags `#` | Box | Same. Page tags show above the first sheet. |
| Privacy lock (page lock) | Adapt | The page lock covers the whole paper page: all sheets, boxes and ink. No per-box lock. |
| Box "lock against moving" (owner list) | Adapt | New: a locked box cannot be dragged or resized, but you can still type in it. This is not the privacy lock. |
| Ink layers (Layers card: hide, lock, order) | Adapt | Same layers. Boxes sit above all ink layers in the MVP (Q4). |
| Layer gallery (notebook packs) | Not on paper | Packs make block pages and databases. Nothing changes. |
| Lined / grid / dots paper behind ink (`page.inkBg`, `paperGrid.ts`, index.css `[data-ink-paper]`) | Adapt (reuse) | See section 4. The same three choices and the same CSS. The spacing is fixed in sheet points instead of following the text line height. |
| Pen, highlighter, eraser, shapes, tape, labels | Adapt | Same engine and tools. Ink is stored per **sheet** (fixed sheet coordinates), not per block (section 2.3). |
| Lasso (ink, eight handles, twist, row menu, filters) | Adapt | Selects ink and boxes together. Moving moves both. Scaling a box changes its width only (text is not stretched). The T filter selects whole boxes. |
| Ruler, Magnifier | Adapt | They map through the zoom. Magnifier writing lands on the sheet. |
| Write pad | Adapt | Typed mode: inserts into the box you are in, as today. Canvas mode: strokes land on the sheet at the pad's cursor; Next line follows the sheet's line spacing. |
| Convert to text (AI, Lasso) | Adapt | "Insert below" creates a new box under the ink. |
| Pictures (picture block, crop, corner resize, picture editor) | Box | A picture is a block in a box. Corner resize works inside the box width. |
| Camera, File block (PDF opens in the reader) | Box | Same. |
| Embeds (YouTube, links, timestamps) | Box | Same, inside a box. |
| Mind map block | Box | Same. It is wide, so it gets the same minimum width as databases. |
| Formula block (KaTeX) | Box | Same. |
| Audio recording, ink replay from audio | Adapt | Recording works (it belongs to the page). Replay: ink strokes keep their `at` times, so replay works per sheet. The left panel's Pages tab shows sheet thumbnails. |
| Reading mode (Aa, Read with, page flip) | Adapt | MVP: Reading mode on a paper page = view only, no editing, same zoom. Aa text styles do not change paper text (paper keeps its look, like printed paper). Read with (text-to-speech) reads the boxes in reading order. |
| Book reader (PDF/EPUB) | Not on paper | Unrelated. PDF import as sheets is later. |
| Page history (versions, restore) | Adapt | A version must hold sheets, box geometry and every box's blocks plus ink. The MVP saves them in the paper page's version. |
| Trash, restore, delete forever | Adapt | Boxes are hidden child pages (section 2.2), so they follow their paper page into the Trash and back, as sub-pages already do. |
| Move page, page tree, sub-pages | Adapt | A paper page sits in the tree like any page and can have block sub-pages. Its box pages never show in the tree, in Gallery/Table/Board layouts or in Next page. |
| Search | Adapt | The text in boxes is found as normal blocks. A hit opens the paper page at the box. Drawing labels are found as today. Handwriting search needs AI (Phase P, cost approval). |
| Export (PDF, Word, Markdown, Text, Save, Share) and print | Adapt | PDF and print: one printed page per sheet, real size, ink as vectors, boxes as real text (browser print with page CSS: no new library). Word/Markdown/Text: box text in reading order, then the ink as a picture. Notebook files (Save) carry everything. |
| Backups and Replace | Adapt | New table `paperSheets` is added to the backup. Box pages and their blocks are already pages and blocks. |
| Sync | Adapt | One line in `sync/tables.ts` (`paperSheets: 'record'`). Box geometry lives on the box page record, which already syncs. Two devices moving the same box: the newer move wins. |
| Real-time live edits from another device | Box | Each box is a page editor, so live apply works per box. |
| Anki export | Adapt | Cards in boxes are exported like any card. |
| Home tasks (Send to Home), Calendar | Box | Task blocks in a box work as today. |
| Device modes, toolbar, ribbon, options pill | Adapt | Same bars. The text tools act on the box with the caret. One new button group on paper: Sheet (size, background, add/delete sheet) and Zoom. |
| Keyboard shortcuts | Adapt | Inside a box: all text shortcuts. On the paper: Ctrl + / Ctrl − / Ctrl 0 zoom, Delete removes selected boxes. |
| Languages, help tips | Adapt | New strings go in enO/esO/hiO, with help tips and no `title=`. |
| Spaces, Control panel | Adapt | Control panel lists "New paper page" and the sheet actions. |
| Journal day pages | Not on paper | Journal pages stay block pages (MVP). |
| Collaboration, native apps | Not on paper | Out of scope (CLAUDE.md). |

## 2. Design

### 2.1 Data model (Dexie: the next free version after rebasing; 23 today)

- `Page.kind?: 'paper'` (unset = block page, so existing pages are unchanged) and `Page.paper?: { size: 'A4' | 'Letter', orient: 'portrait' | 'landscape', bg: 'blank' | 'lined' | 'grid' | 'dots', spacing: number }`. These are the page defaults; each sheet keeps its own copy.
- New table **`paperSheets`**: `id, pageId` (indexes), plus `order` (fractional key), `size`, `orient`, `bg`, `spacing` (pt), and the usual `createdAt/updatedAt` (UTC ms) and `deleted`. Sync rule `record`. `checkRows` limits: at most 500 sheets per page, sizes from a fixed list, finite numbers.
- **Box** = a hidden child page: a `Page` with `parentId = <paper page>` and `box: { sheetId, x, y, w, z, locked?, colour?, link? }` (x, y, w in sheet points; height is not stored, the content decides it).

### 2.2 How boxes store their blocks (chosen: hidden child page per box)

| Option | For | Against |
|---|---|---|
| **A. Box = hidden child page (chosen)** | The full block editor, autosave, page lock, real-time apply, history, cards, links, tags and search all work unchanged, because they are keyed on a page id. Trash and move already cascade to sub-pages. | Box pages must be hidden in the tree, the layouts, Next page and page pickers (one filter in `listNotePages`, plus pickers). A search hit or link to a box page redirects to the paper page. Summary lines are re-pointed to the paper page. |
| B. Blocks table + `boxId` | One page | Every editor service (load, diff save, delete of missing blocks, lock, live apply, history) would need a box scope. If the diff save misses that scope, it can delete the other boxes' blocks. High risk. |
| C. One container block per box | Fits the tree | BlockNote has no free-positioned nested editors. It is a second editor in practice. |

### 2.3 Ink in paper coordinates without touching block pages

- One engine with an **anchor mode**. Block pages use `blocks` (today's code path, the default). Paper pages use `sheets`: `PageLayout.measure()` measures the `[data-paper-sheet]` elements instead of `.bn-block-content`. A chunk's `blockId` holds the sheet id, and points are stored in sheet widths, so they do not change with zoom.
- Zoom changes the real width of the sheets, with no CSS transform on the ink canvases, so pointer maths, the Lasso and the Ruler need no change. Box text is scaled with CSS `zoom`, which keeps the caret and Scribble native. If Safari misbehaves, the fallback is a re-laid-out font size.
- **Proof that block pages are unchanged:** unit tests on `PageLayout` and anchoring in both modes. All existing ink tests and e2e tests (including the 500-stroke budget) stay green with no edits.

### 2.4 Gesture rules

1. **The Pencil always writes** (or erases or lassos, depending on the tool). It never pans or zooms.
2. **Two fingers** pinch-zoom (fit width up to 4x) and pan. The browser's own pinch is blocked on the paper.
3. **One finger:** scrolls the sheets, unless Settings › finger drawing is on.
4. **Tap or click** on empty paper with no ink tool active places a new box at that point (default width: 60 % of the sheet). Tapping a box puts the caret in it.
5. **A box** moves by its top grip and resizes from its right edge, unless it is locked. Its ⋯ menu offers Duplicate, Colour, Lock, Link and Delete.
6. **With an ink tool active,** a tap on a box still writes ink over it. To type, choose the text tool (or press Esc).
7. **Desktop:** Ctrl + wheel zooms, and the wheel scrolls.

### 2.5 Steps (each tested in chromium and ipad-webkit, pushed separately)

1. Page type, sheets, background, zoom and pan, thumbnails strip, New paper page.
2. Ink on paper (anchor mode with unit tests).
3. Block boxes (place, type, drag, resize, lock, duplicate, colour, link).
4. Lasso across ink and boxes.
5. Search, Summary and cards; sync and backup; history; PDF export and print.
6. A Paper sheet embed block in block pages: a read-only preview that opens the page on a tap.

The paper code is all in one lazy `src/paper/` chunk, so the first load grows only by the menu item, under the 320,000-byte cap.

## 3. How nothing existing is lost

- Block pages: no data or behaviour change. `kind` is unset on every existing page. The only shared code paths are the ink anchor mode (default = today) and one hidden-page filter.
- The Dexie version only adds a table, so the upgrade is safe and old backups stay valid.
- Box pages are real pages, so if the paper code ever failed, their text would still be in the database, in search and in backups.
- Conversion between page types is later, and always as a copy (never in place).

## 4. Reuse of the existing lined, grid and dots paper

- Same three options and names (`lined`, `grid`, `dots`, plus `blank`) as `Page.inkBg`, and the same CSS (`[data-ink-paper]` in index.css), applied to each sheet element.
- The difference is that on paper `--paper-step` is a fixed spacing in sheet points scaled by the zoom (default 8 mm lined, 5 mm grid and dots). It does not follow the text line height (`watchPaperStep`), because paper text sits in boxes.
- The same picker in the ink detail card sets the background. On a paper page it changes the current sheet or all sheets.

## 5. Risks

- Gestures and Scribble in zoomed boxes on the real iPad (most of the time will go here).
- Many editors on one page: mount the box editors only for the sheets near the screen; the others show static HTML.
- Hidden box pages leaking into lists: one helper `isBoxPage`, and tests for the tree, layouts, pickers and Next page.

## 6. Open questions for the owner

1. **Box storage:** OK for each box to be a hidden sub-page? It keeps every block feature working, and the box pages never show anywhere.
2. **Typing on paper:** typing happens only in boxes (tap empty paper to make one). Should a keyboard user also get one box that is already open at the top of each new sheet?
3. **Paper text and Aa:** should box text keep a fixed paper look (recommended), or follow the Aa font and size settings like block pages?
4. **Boxes vs ink order:** boxes always above the ink (MVP, simpler), or can ink be drawn over boxes, with layers ordering them?
5. **"Linked" boxes:** does it mean (a) a box links to another page or box (a chip), or (b) the text flows from one box into the next (like a magazine)? (b) is much harder.
6. **Wide blocks** (databases, mind maps, tables) in a box: is a minimum box width of 60 % of the sheet with sideways scroll OK?
7. **Templates:** "Save paper page as template" in the MVP, or later?
8. **Default sheet spacing:** lined 8 mm, grid and dots 5 mm. OK?
9. **Thumbnails strip place:** the left panel's Pages tab (recommended, it already exists), or a strip at the bottom?
10. **Journal and database rows** stay block pages for now: OK?
