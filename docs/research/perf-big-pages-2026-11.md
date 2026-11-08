# Big pages: speed measurements (9 Nov 2026)

Owner report: pasting a big document lags; scrolling and typing stutter on big pages.

## How it was measured

`e2e/bigPageBudget.spec.ts` (Chromium, 1024x900). It seeds one page with 2,000 blocks (paragraphs, a heading every 25, a 4x3 table every 100), which the paper makes 156 A4 sheets (156,000 px tall). It then:

1. scrolls top to bottom to top (long tasks, frame times, and Chrome's layout, style and script counters from CDP `Performance.getMetrics`);
2. pastes 400 paragraphs of HTML;
3. types 54 keys in a block near the top.

A second run slows the CPU 4x (`BIGPAGE_THROTTLE=4`) to stand in for an old PC or an iPad. `BIGPAGE_PROFILE=1` prints the CPU profile (self time, inclusive time) and `BIGPAGE_CHAIN=name` prints the callers of one function.

## Causes found (from the profile of typing)

| Cost per key (4x CPU) | Cause                                                                                                                                                                  | Fix                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| about 20 ms           | Sheet-gap pass (`applyPagination`) asked the DOM for the document position of every block twice (`posAtDOM` walks all siblings: 2,000 x 2 x 2,000 steps) on every key. | Positions read from the document in one pass (`blockStarts`).                 |
| about 13 ms           | Table row heights (`tableResize`) looked up every table by id (`getBlock` walks the whole page) and read 200 CSS variables per table on every key.                     | Run once per typing burst (150 ms quiet); only as many rows as the table has. |
| about 8 ms            | Pen guard (`penGuard`) joined the text of the whole page (`doc.textContent`) on every key to spot big deletions.                                                       | `doc.content.size` (falls by the same amount; no string).                     |
| about 4 ms            | The sheet-gap decorations were rebuilt by walking every block on every key, and ProseMirror then compared 2,000 block views.                                           | Built only when the pushes change; mapped through the edit while typing.      |
| left                  | React redraw of the bars on each change (about 3 ms real), ProseMirror's own view update and the browser's layout of 2,000 blocks. Not touched.                        |                                                                               |

Scrolling was already cheap here: 0.2 ms scripting per frame, 1 layout and 2 style recalcs per frame (0.1 ms real; 0.9 ms at 4x), median and 95th-percentile frame 16.7 / 16.8 ms, even at 4x. The page has no ink or pictures, so the ink layer re-placing was not in this trace.

## Numbers

| Metric                                | Before (1x)     | After (1x)      | Before (4x)     | After (4x)               |
| ------------------------------------- | --------------- | --------------- | --------------- | ------------------------ |
| Typing, script per key                | 11.3-14.9 ms    | 6.6-7.8 ms      | 45.5 ms         | 31.3 ms                  |
| Typing, long tasks (>50 ms)           | 2-3 (max 72 ms) | 0-2 (max 63 ms) | 50 (max 369 ms) | 39 (max 336 ms)          |
| Paste of 400 paragraphs, longest task | 160 ms          | 126-133 ms      | 1,012 ms        | 667 ms                   |
| Scroll pass, long tasks               | 0               | 0               | 0               | 0-1 (max 92 ms, one-off) |
| Scroll, script per frame              | 0.2 ms          | 0.2 ms          | 1.0 ms          | 1.0 ms                   |
| Scroll, 95th-percentile frame         | 16.8 ms         | 16.8 ms         | 16.8 ms         | 16.8 ms                  |

## Not done (and why)

- `content-visibility: auto` on blocks: the sheet-gap pass measures every block; the browser's guessed heights for skipped blocks would make the pushes wrong and the page jump while scrolling. Revisit only with a stored height per block.
- The ink layer, pictures and boxes were not in the generated page; the existing `paperBudget` spec covers 50 boxes and 2,000 strokes.
- Paste is one synchronous edit inside ProseMirror and BlockNote (the browser then lays out 400 new blocks); splitting it would change undo.

## CI budget

`bigPageBudget.spec.ts` asserts (Chromium): no long task over 100 ms in the scroll pass or while typing, script per scroll frame under 6 ms, script per key under 25 ms, paste longest task under 1 s.
