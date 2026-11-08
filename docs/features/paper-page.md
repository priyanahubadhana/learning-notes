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

- **Step 4: ink.** Each box has its own ink, linked to its lines (rules 1, 2). The Pencil on empty paper makes a box with lines under the stroke (rule 4). A Lasso move re-links to the line under the drop (5); a faint line shows the link (8). A deleted line hands its ink to the next line (7). A drawing over 3+ lines belongs to its top line and moves as one piece (10). New pages open with the cursor in the top box.

- **Step 5.** Lasso on empty paper picks boxes; moving one moves all picked (with their ink). Reading order (top to bottom, then left to right) for read aloud, Tab and export. Search, sync and backups carry boxes through the page and block rows.

- **Step 6.** Fit width below a 480 px column: no sheets, boxes stacked in reading order, column wide.

## Not yet

- Ink rules 6 (Lasso ink + text as one piece) and 9 (copy a line with its ink); ink at a zoom other than 100 %.
- PDF/print laid out as the paper (sheets, box places, ink in place).
- New boxes by tapping on a phone; paper-size menu; sheet thumbnails in the left panel.
