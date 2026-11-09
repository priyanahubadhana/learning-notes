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

## Second pass: a mixed paper page, scrolling (9 Nov, evening)

Owner saw stutter while scrolling a big pasted document. `e2e/bigPageBudget.spec.ts` now also seeds a mixed paper page: 300 main blocks (20 pictures of 1200 x 800, 5 embeds, 5 tables, text), 12 boxes (14 blocks each, 4 with a picture) and 600 ink strokes spread over 12 blocks (27 sheets at fit, 38 at 150 %). It scrolls top to bottom to top at 100 %, at the paper held at 73 % (Ctrl+wheel kept coming so it does not spring back) and at 150 %, at normal CPU and at 4x.

| Metric (scroll pass)    | 1x CPU, all three zooms | 4x CPU, 73 % | 4x, 100 % | 4x, 150 % |
| ----------------------- | ----------------------- | ------------ | --------- | --------- |
| Median frame            | 16.7 ms                 | 16.7 ms      | 16.7 ms   | 16.7 ms   |
| Frames later than 25 ms | 0 %                     | 16-17 %      | 15 %      | 9 %       |
| Script per frame        | 0.3-0.4 ms              | 2.9 ms       | 2.5 ms    | 1.9 ms    |
| Style recalc per frame  | 0.1-0.2 ms              | 1.2-1.3 ms   | 0.7 ms    | 0.8 ms    |
| Long tasks over 50 ms   | 0                       | 0            | 0         | 0         |

Findings (CPU profile, 4x, 100 %):

- **The ink layer is the whole cost.** With the ink scroll listener switched off for a test run the same pass gave 0 % late frames and 0.47 ms script per frame; with it on, 13 s of a 19 s profile was `InkSurface.redraw` (`getBoundingClientRect` 1.9 s, `placeOverlay`, then the canvas `draw` / `clearRect` / `drawImage` / `setView`). Every scroll event schedules one redraw: the overlay is measured, re-placed (left/top written), re-clipped, and the canvases are cleared and painted again for the new strip.
- Pictures (decoding), embeds, box frames per sheet, snap guides and the calm-handle listeners did not show in the profile (no listener of theirs above 0.1 ms per frame); 24 images were in the DOM and decode off the main thread.
- Zoom changes the load only through the number of sheets and boxes in view; 73 % is the worst (more of the page on screen).

Tried and reverted: (1) writing the overlay's style only when it changed, and reading all geometry before writing; (2) reusing the measured geometry shifted by the scroll distance on scroll-only frames; (3) painting the canvases for 1.7 screens and repainting only when the screen leaves them. Together they cut the ink redraw's CPU in the profile by about half (3,978 to 1,931 ms), but the share of late frames did not move (about 16 % at 4x, within noise), and the change broke four ink e2e specs (`inkLayers` 500-stroke budget, `inkTools` highlight eraser, two `paperInk` rules). A safe fix needs the ink overlay to scroll with the page (inside the scroller, moved by the compositor) instead of being re-placed from JavaScript on every scroll event; that is a redesign of `ink/controller.ts` (overlay parent, clip, pointer mapping) and is left for its own step with the owner's iPad check.

The harness could not scroll with the mouse wheel or a synthesized touch gesture (nothing moved the page scroller with the Pen tool's ink layer present), so the pass scrolls with `scrollTop` writes, 60 px a frame. Numbers are comparable between runs, not a promise of a real finger's frame rate.

CI budget for the mixed page (Chromium, 1x CPU, each zoom): no long task over 150 ms, 95th-percentile frame under 34 ms, under 10 % late frames, under 3 ms script per frame.
