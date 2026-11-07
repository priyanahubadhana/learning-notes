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

## Not yet

- Tapping to make new boxes, and moving, resizing and locking them (step 3).
- Ink at a zoom other than 100 % (step 4, on hold for the owner).
- The Lasso over boxes, reading order, export and print (step 5).
- Fit width on phones (step 6).
- Sheet thumbnails in the left panel, and a menu to choose the paper size.
