# Paper page: plan (Phase Q; owner design of 8 Nov 2026)

Status: step 1 built. Steps 2–3 approved. Step 4 (ink) is unblocked: the owner's final ink rules are at the end of this file.
Research: [research/paper-page-2026-11.md](../research/paper-page-2026-11.md). Spec: [features/paper-page.md](../features/paper-page.md).

## 1. The design (owner, 8 Nov)

- **One page type.** Every page is paper: fixed sheets (A4 by default, Letter as an option) with a border and a background (blank, lined, grid, dots). The toolbar sits on top.
- **Boxes** (like OneNote containers). Tap anywhere on a sheet to make a box there. Each box holds our normal block editor, with every block feature. A box can be resized from its corners and edges, dragged, locked, duplicated and coloured. Enter grows the box, never the page.
- **Existing pages** are not converted. They show as ONE full-width box at the top of the paper, so no data changes.
- **New pages** open with one empty full-width box at the top, with the cursor ready.
- **Ink** (step 4, on hold): inside a box, ink moves with its text as it does today. On empty paper, ink anchors to the paper position.
- **Text sits on the paper lines:** the box's line height and baseline snap to the sheet's line or grid spacing.
- **Databases:** full database pages stay as they are. Small tables and database views can sit in a box, with sideways scroll.
- **Reading order** (read aloud, export, search): top to bottom, then left to right by box. Phones and narrow windows get "fit width", which stacks the boxes.

## 2. Data model (no new Dexie version)

- `Page.boxes?: PaperBox[]`, where `PaperBox = { id, x, y, w, locked?, colour? }` in millimetres from the top-left of the paper (the sheets stack top to bottom). There is no stored height: the text decides it.
- `Page.sheet?: 'A4' | 'Letter'` (unset = A4). The background reuses `Page.inkBg` (`lined | grid | dots`, unset = blank).
- `Block.boxId?: string` on top-level blocks; nested blocks follow their parent. **Unset, or an unknown box, = the default box `main`.**
- If there is no `boxes` field, the page is one default box (x 15, y 15, width = sheet width − 30 mm) holding every block. This is how every existing page reads, with nothing written.
- New fields only, with no index, so no version bump is needed. Backups and sync rows check them (`share/checkRows.ts`: finite mm, width > 0, at most 500 boxes, known colours). Sync is unchanged: pages and blocks are already `record` and `blocks` tables.

## 3. How a page's blocks are grouped by box

- `paper/boxes.ts` (pure): `boxesOf`, `groupBlocksByBox`, `readingOrder`, `mainBox`, sheet sizes.
- **One editor per box.** `PageEditor` takes `boxId` (unset = default box). It loads only its box's blocks (`editor/boxScope.ts` `blocksOfBox`), tags its top-level drafts with the box id (`tagDrafts`), and live sync passes only its own blocks to it. Its snapshot holds only its own blocks, so a save can never delete another box's blocks (a unit test proves this).
- Moving a block back to the default box removes its `boxId` (the upsert carries `boxId: null`).
- For a page with no boxes, every path returns the records unchanged and writes no `boxId`. The unit test "a page with no boxes" and the full existing suite prove this.

## 4. Steps

1. **Box model, existing pages as one box** (built): types, pure model, editor box scope, backup checks, tests.
2. Paper look: sheets with border and background, A4/Letter, zoom and pan (pinch with two fingers; the Pencil always writes; Ctrl + wheel), and sheet thumbnails in the left panel's Pages tab. The default box sits on the first sheet, and the sheets are added under it as it grows.
3. Tap empty paper to make a box (with the caret ready). Move by the box grip, resize from the corners and edges (width only; the height follows the text), lock, duplicate, colour and delete from the box menu. One shared toolbar follows the box that has the caret. Line height snaps to the sheet spacing.
4. _(On hold)_ Ink in and around boxes.
5. The Lasso over boxes, reading order in read aloud/export/search, PDF export and print, sync and backup checks.
6. Fit width on phones: the boxes stack in reading order.

## 5. How nothing is lost

- No conversion and no data written for existing pages; the full test suite stays green unchanged.
- An unknown or deleted box sends its blocks to the default box, so text is never hidden.
- Deleting a box moves its blocks into the Trash with the usual Undo (step 3). It never drops them silently.

## 6. Reuse of the existing paper options

The same `inkBg` values and the same `[data-ink-paper]` CSS go on each sheet element. On paper, `--paper-step` is a fixed spacing (8 mm lined, 5 mm grid and dots) scaled by the zoom, instead of following the text's line height. The box text's line height snaps to that step.

## 7. Feature inventory (summary; full table in git history `32ed4f7`)

- **Works as-is inside a box:** blocks, `/`, `[[` links, `#` tags, cards, Summary, revise, pictures, embeds, mind map, formula, tables, files and camera.
- **Needs adapting:**
  - one toolbar for many boxes;
  - wide databases (sideways scroll);
  - Lasso on boxes;
  - reading order in read aloud, export and search;
  - PDF/print per sheet;
  - history copies carry `boxes`, since they are part of the page record;
  - Write pad (inserts into the box with the caret).
- **Stays as it is:** full database pages, journal pages and database rows (they still show as paper with one box), the book reader.

## 8. Decisions to review (owner defaults, 8 Nov)

- No "Save as template" for paper layouts in the first version.
- Thumbnails go in the left panel.
- Journal pages and database rows stay as they are.
- Spacing: 8 mm for lined, 5 mm for grid and dots.

## Ink rules on paper (owner, final, 8 Nov 2026)

Each rule gets its own e2e test (chromium and ipad-webkit).

1. **Layers:** text blocks are the bottom layer and ink is a top layer. The Pen, highlighter and eraser change only ink.
2. **Linked to a line:** each stroke is linked to the text line under it (today's paragraph anchoring) and moves with it.
3. **Text tool:** a tap on empty space creates a new block or box there.
4. **Pencil on empty paper:** a new box is created under the ink, with an empty line, so the ink is always linked.
5. **Lasso, ink only:** the moved ink unlinks from its old line and re-links to the line under its drop spot. If there is no text there, an empty block is created to hold the link.
6. **Lasso, ink and text together:** both go to the new block as one piece, and the ink stays linked to that text.
7. **Deleting a line with linked ink:** the ink moves to the next line. Nothing is ever deleted silently.
8. **Link mark:** while ink is Lasso-selected, a thin, faint line shows the text line it is linked to.
9. **Copy and paste of a line** also copies its linked ink.
10. **Big drawings** that span many lines link to their top line and move as one piece.
