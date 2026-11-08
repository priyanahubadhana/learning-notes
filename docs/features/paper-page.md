# Paper page (Phase Q)

Security rules: [rules/security.md](../../rules/security.md). Check them before building. Plan: [plans/paper-page-plan.md](../plans/paper-page-plan.md).

## What it is

Every page is paper. It shows as fixed sheets (A4, or Letter) with a border and the page's background (blank, lined, grid or dots), and the page's blocks sit in boxes on the sheets.

## Built

- **Step 1: box model.**
  - `Page.boxes` (mm), `Page.sheet` and `Block.boxId`, with no Dexie version.
  - A page with no boxes is one full-width default box holding every block, so nothing is converted.
  - Each editor loads, saves and live-applies only its own box (`editor/boxScope.ts`).
  - Backups and sync rows check the box fields (`share/checkRows.ts`).
- **Step 2: paper look.**
  - `paper/PaperFrame.tsx` draws the sheets, which stack as the default box grows.
  - The background reuses `Page.inkBg` and the `[data-ink-paper]` CSS, with a fixed spacing: 8 mm lined, 5 mm grid and dots.
  - Zoom runs from 50 % to 400 %: pinch with two fingers (the Pencil is ignored), Ctrl or ⌘ + wheel, or the − / % / + pill under the paper (% = fit width).
  - Zoomed in, the paper pans sideways inside its frame; at 100 % the page scrolls exactly as before.
  - The full-screen reader keeps flowing text (`flat`, with the same tree, so the editor never remounts).

- **Step 3: boxes.** A Text-tool tap on empty paper makes a box (caret in it). Grip = move (y snaps to the spacing), left/right edges = width, height follows the text. ⋯ menu: Lock in place, Duplicate box, Colour, Delete box (History copy + Undo). One toolbar follows the box with the caret. Each box is a block editor with every block feature.

- **Step 4: ink.** Each box has its own ink, linked to its lines (rules 1, 2). The Pencil on empty paper makes a box with lines under the stroke (rule 4). A Lasso move re-links to the line under the drop, or to a new box with lines when dropped on bare paper (5); ink and lines Lasso-selected together move as one piece, one Undo (6); copy, cut and paste of whole lines carry their ink (9); a faint line shows the link (8). A deleted line hands its ink to the next line (7). A drawing over 3+ lines belongs to its top line and moves as one piece (10). New pages open with the cursor in the top box.

- **Step 5.** Lasso on empty paper picks boxes; moving one moves all picked (with their ink). Reading order (top to bottom, then left to right) for read aloud, Tab and export. Search, sync and backups carry boxes through the page and block rows.

- **Step 6.** Fit width below a 480 px column: no sheets, boxes stacked in reading order, column wide.

- **Discoverability (Polish 2 item 8).** Empty page: faint tap hint on the first sheet (first 3 pages per device); Text tool + mouse/Pencil hover on empty paper: "+ box" tag; the default box outlines while it has the caret.

- **Paper style, size, thumbnails (Polish 2 item 9).** Page ⋯: Paper style and Paper size submenus; new-page start: Paper style row; left panel › Pages: sheet thumbnails of the open page (2+ sheets), tap = scroll to that sheet.
- **Speed (polish-2 item 15).** A box's editor is made when the box is within 800 px of the scrolling page; until then a three-line placeholder stands in (`LazyMount` in `PaperFrame.tsx`). Once made it stays. CI budget: `e2e/paperBudget.spec.ts`.

- **Phones: new boxes.** Stacked layout (under 600 px): "Add a box here" at the end, or a Text-tool tap in the gap under a box adds one after it (`placeInOrder`, `addBoxInOrder`).

- **PDF as paper.** Export › Paper layout (PDF): real-size sheets, background, boxes and ink in place (`share/export/paperLayout.ts`; spec [export.md](export.md)).

## Not yet

- Rule 6 across boxes (ink + lines dropped on another box or bare paper); ink at a zoom other than 100 %.
- a default paper style for new pages (Settings).
