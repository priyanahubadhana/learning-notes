# Layout Assist plan (owner bug batch 2, item 7) — 10 Nov 2026

Research: [research/snap-assist-2026-11.md](../research/snap-assist-2026-11.md). Replaces "preset creates empty boxes". Builds on `paper/grid.ts` (rows of 1-3 columns, up to 2 stacked).

## Flow

1. **Open**: a Layout button (grid icon) in the tool bar, for the selected box (or the box with the caret); also box ⋯ › Layout. Shortcut Ctrl/Cmd+Alt+L. Hidden on phones (< 600 px, stacked mode).
2. **Pick layout + zone** (like Snap Layouts): a popover with the 7 presets (1, 1:1, 1:2, 2:1, 1:1:1, 2x2, 2x3) as thumbnails; each zone is its own button. Clicking a zone means "my box goes here". Hover/focus on a zone gives a live preview on the page (other boxes slide, accent outline, 160 ms transform).
3. **Snap Assist step**: the row redraws in the chosen layout. Each empty zone shows a dashed accent slot. A tray lists the page's **other boxes** as thumbnails (first line + word count, reading order, virtualised above 50). The **active zone** (next empty, reading order) is highlighted. Tap a thumbnail to fill the active zone; focus moves on. Or drag a thumbnail onto any slot (live preview). Each slot has a small "+ New box" and "Leave empty".
4. **Finish**: Done (or all zones filled) writes once. **Skip / Esc / tap outside**: unfilled zones are dropped; no boxes are created; the columns collapse (1:1 with one filled goes back to 1). Cancel restores the original layout exactly.
5. **Undo**: the whole change (moves from other rows + any new boxes) is one history entry; toast "Layout applied · Undo".

## Rules and edge cases

- A box pulled in leaves its old row (`removeBox`); emptied rows vanish; its text and line-linked ink move with it.
- **More boxes than zones**: the tray scrolls; unchosen boxes stay where they are.
- **Fewer boxes than zones** (or none): the tray says "No other boxes on this page"; slots offer "+ New box" or collapse.
- Smaller layout than the current row (1:1:1 to 1:1): extra boxes move to a new row right below, never deleted; the preview shows it.
- Same layout as now: the step opens with boxes in place; dropping on a filled slot swaps.
- Boxes on other sheets: listed under "Other sheets"; the sheet-gap rule applies.
- Read-only page: button disabled with a tooltip.
- Result validated by `checkRows`; on failure, abort with a toast and no write.

## Devices

- **Mouse/keyboard**: arrows move between zones and thumbnails, Enter picks, Esc skips; aria-live says "Zone 2 of 3: choose a box".
- **iPad touch**: tap-to-pick first (44 px targets); drag a thumbnail after a 150 ms hold. The tray is a bottom sheet in portrait, a side panel in landscape.
- **Pencil**: taps act like a finger on the popover and tray (reuse the item 3 fix); ink is paused while the step is open (reuse the item 2 dialog guard).
- **Phone**: no Layout button (rows stack); ⋯ › Layout shows "Layouts appear on larger screens". Data is unchanged.

## Steps (Sonnet builder, each with tests)

1. Pure `paper/layoutAssist.ts`: `startLayout(rows, boxId, preset, zone)` returns a draft with empty slots; `fillSlot(draft, slot, boxId | "new")`; `finish(draft)` collapses empties, moves extras down, swaps. Unit tests: every preset, more/fewer boxes, shrink, swap, cross-sheet, `checkRows` passes.
2. Remove the old preset path that creates empty boxes; ⋯ › Layout opens the new popover.
3. Tool-bar Layout button + popover with zone buttons + hover preview (tokens, i18n en/hi).
4. Assist tray + slots: tap-to-fill, active zone, + New box, Leave empty, Done/Skip/Cancel, one write and one Undo.
5. Drag thumbnails to slots with live preview; swap on filled slots; keyboard and aria-live.
6. iPad bottom sheet / side panel, Pencil guards, phone hiding.
7. e2e `layoutAssist.spec.ts`: (a) 3 boxes, 1:1:1 zone 1, tap 2 thumbnails gives one row of 3; (b) 1:1 then Skip creates no box; (c) + New box creates exactly 1; (d) Cancel restores; (e) one Undo reverts all; (f) drag fills a slot; (g) shrink 1:1:1 to 1:1 keeps all boxes; (h) 390 px hides the button; (i) touch emulation tap-to-fill.
8. Docs: paper-page.md, DECISIONS, CHANGELOG, mirror.

## Owner questions

1. After Skip, should empty zones collapse (recommended) or stay as visible empty slots to fill later?
2. Should the tray list boxes from other sheets too, or only the same sheet (simpler)?
3. Remember layouts like Snap Groups (a "recent layouts" row)? Recommend later.

## Owner answers (10 Nov)
- Skipped zones collapse. Box list: same sheet by default, with a "Whole page" toggle. Recent layouts: NOW (owner changed mind 10 Nov: remember recently used layouts, shown first). Approved; build with batch 2.
