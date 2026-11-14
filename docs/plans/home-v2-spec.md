# Home v2 spec (slice 5, flag `home.v2`)

Source: docs/PENDING.md "Home dashboard mock: APPROVED" (conditions 1-7), docs/mockups/settings-home-open-comments.md H-a..H-p, build-master-plan row 5. With the flag OFF nothing changes. With it ON, Home > Today becomes a board of widgets you can arrange.

Widgets (first set): Cards due, Briefing, Top 3, Timer, Pending items, Day count. Sizes: S = 1 of 4 columns, M = 2, L = 4 (full row). On a phone the grid drops to fewer columns (shared drag part).

## When I do X -> Y

- Home > Today, flag on -> I see the widgets as a board, plus an "Edit layout" button. Flag off -> the old stacked Today, unchanged.
- I tap "Edit layout" -> an edit bar sticks to the top of the board with Done, Cancel and Reset; every widget shows a grip, its S / M / L control, ▲▼ and "Where this comes from". Text inside widgets cannot be selected while editing.
- I drag a widget by its grip -> the other widgets slide out of the way live, so the final layout shows before I let go (shared grid drag, `ReorderList`).
- I drop a wide widget (M or L) between small ones -> it lands exactly there; the small ones wrap to the next row.
- I drop a widget where it cannot fit (it would leave a hole in a row, e.g. a full-row L after one S) -> it snaps to the nearest spot that fits, and that spot is what the live preview shows.
- I use ▲ / ▼ or Alt+arrows on a widget -> it moves to the next spot that fits (same rule as drag).
- I pick S, M or L on a widget -> its size changes with a short animation; the chosen size is marked (selected); the widget never disappears and keeps its place.
- I tap "Where this comes from" on a widget -> a separate pop-up opens (top layer) with where the numbers come from, in plain words, and a "How to build this" line. The widget behind stays unchanged. I close it with ✕, Esc or a tap outside.
- I tap Done -> the layout is saved on this device and edit mode ends. Cancel -> every change since I started editing is dropped. Reset -> the default order and sizes (still inside edit mode, so Cancel can undo it).
- I reload the page -> my saved layout is back.
- A widget with nothing to show (e.g. no cards due) -> still shown, with a calm one-line empty text. A widget is never hidden by size or data.
- The Pending items widget -> lists overdue tasks first (planned before today, still open), then other open tasks, at most 5, with "N more" when there are more; the title shows the count; tapping a row's tick completes it. Dropped and done tasks are never listed. Nothing pending -> "Nothing pending."
- Wording: every "Period" becomes "Time range"; "Built from" becomes "Where this comes from". Same words in Beginner and Professional.
- There is no Done button in the top bar of Home (only the one on the edit bar).

## Won't do (this slice)

- No new widget types beyond the six above (no charts, KPI tiles, templates, tabs: later slices of the dashboard plan).
- No app-wide Undo/Redo bar, no hide-on-PC setting (belongs to the top-bar slice); inside edit mode, Cancel and Reset are the undo.
- No time-range bar widget yet (only the wording rule is applied to any text we add).
- Tasks / Plan / Routines / Reports tabs are not changed.
- No private drag copy: all reordering uses `src/design/parts/drag`.
- No sync of the layout (kept per device in the usual preferences).
- No changes to the flag-off screens, no new baselines for them.
