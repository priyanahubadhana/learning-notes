# Box grid plan (bug batch item 26, owner decision 10 Nov)

**Status (10 Nov): built, including the Layout picker (not later). Notes on what differs are in DECISIONS ("Box grid replaces").**

Research: [research/box-grid-2026-11.md](../research/box-grid-2026-11.md). This replaces free x/y boxes and the `clearOfBoxes`/`dropPlan` push-down. Boxes never overlap. Ink can still go over text (ink layer).

## Terms (data model)

- **Row** (= one "area"): a horizontal band on a sheet that spans the writable width. It holds 1, 2 or 3 **columns**.
- **Column**: holds 1 or 2 boxes stacked. So the largest area is 3 columns x 2 = **6 boxes** (2x3). 2 columns x 2 = quadrants.
- `Page.rows?: { id, y /*mm, page top*/, cols: { w /*fraction, sum 1*/, boxIds /*1-2*/ }[] }[]`, optional with no Dexie version (same pattern as `Page.boxes`). Box x/y/w become derived from the row, but the fields are kept and written so old clients still render.
- The row height is the tallest column (auto from text). The row gap is 3 mm and the column gap 4 mm (tokens). The minimum column width is 25 % of the row. Limits: 3 columns, 2 per column. Validate in `share/checkRows.ts` (fractions 0.25-1, sum 1 ± 0.01, ids exist, each box in exactly one place).
- Pure module `paper/grid.ts`: `layoutRows(rows, boxes, sheet) -> rects`, `insertAt(rows, targetBox, zone, boxId)`, `removeBox`, `resizeCols`. Unit-tested.

## Drag: Notion targets + Windows live preview

- Drag a box by ⠿ (one drag controller that owns all input, as in item 25). Over another box, the zones are: **left / right third**, which adds a column beside it; **top / bottom quarter**, which stacks it in that column (if the column has fewer than 2) or otherwise adds a new row above/below; **the gap between rows**, which adds a new full-width row. Over blank paper you get a new row at that y, snapped to the line spacing.
- Live preview: the other boxes slide (160 ms, transform only) into the resulting layout, and an accent ghost outline marks the landing cell. If the target is full, the zone shows "Row is full" and falls back to a new row below. Esc/✕ cancels. Release = one write, one Undo.
- Later (not v1): a Windows-style layout strip (1, 1:1, 1:2, 2:1, 1:1:1, 2x2, 2x3) in box ⋯ › Layout.

## Resize

- The divider between columns has a 44 px hit area and shows a thin line on hover/selection. Dragging it changes the two neighbouring fractions and snaps to 1/3, 1/2, 2/3 within 3 %. Double tap = equal widths. It replaces the box left/right width handles. A single-column row is full width. Row height is auto in v1.

## Migration (on open, no data loss)

- After `repairBoxes`, `migrateToRows` sorts the boxes by y and groups boxes whose vertical ranges overlap at least 30 % into one row (up to 3, ordered by x, fractions from their widths, clamped to 0.25 or more). Extras go to the next row. Every block stays in its box. Write only on the first edit, after the History copy. Unit fixtures: overlapping, stacked, 5 side by side, tiny stray boxes.

## Interactions

- **Sheet gaps**: a row never crosses a gap. If it doesn't fit, the whole row starts on the next sheet. A row taller than a sheet: each box paginates inside as today (`paginate.ts`, `sheetSegments`).
- **Lasso**: a loop picks the boxes it covers. A group move drops them into the target zone in reading order. Line-linked ink moves with its lines. Free ink stays on the page.
- **Tap model (item 11)**: unchanged. The 1st tap with a non-Text tool selects the box (frame, ⠿, dividers). The Text tool on blank paper inside a row adds the box to that row if there's room, otherwise it starts a new row. The safe edge margin (item 6) stays.
- **Phones (stacked mode, < 600 px)**: rows flatten to one column in reading order (row, column, stack). Dragging only reorders. No dividers.
- Reading order, Paper PDF export, search and sync use the `layoutRows` rects.

## Steps (Sonnet builder, each with tests)

1. `grid.ts` + types + checkRows + unit tests (layout, every zone, limits, resize snapping).
2. `migrateToRows` + tests; wire into page open; remove the push-down calls.
3. Render rows in `PaperFrame` (CSS grid per row, tokens); sheet-gap rule for rows.
4. Drag zones + live preview + one-write drop + Undo. e2e `paperGrid.spec.ts`: beside → 2 cols, third → 3 cols, 4th → "full" → new row, stack → 2x2, cancel restores.
5. Divider resize + snap + double-tap reset (e2e).
6. Lasso group move, Text-tool add into a row, phone stacking at 390 px (e2e).
7. Docs: paper-page.md, DECISIONS (supersedes the 9 Nov push-down and the item-26 overlap idea), CHANGELOG, mirror.

## Owner questions

1. Max 2 boxes stacked per column (6 per area): OK? (Recommend yes.)
2. Row heights auto from the text in v1? (Recommend yes. Add a min height later if you miss it.)
3. The Windows-style layout strip (⋯ › Layout): v1 or later? (Recommend later.)
