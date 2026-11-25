# Unsteady tests, 26 Nov 2026: the ink and shape tests (TB-32, TB-37)

Read-only diagnosis from the recordings of CI run 45640317263, by a helper for Fable. Nothing here is proven by a test run yet; each part says how to prove it.

ink report. The recordings are the artifact playwright-results-ipad-6 of that run (kept by GitHub for 7 days). I read the code from origin/build/next. Times below are the trace clock in seconds.

## What the machine did in this shard (applies to both tests)

- The page was barely redrawing, which is worse than just running slowly. Evidence:
  - The test helper `frames(page, 2)` waits for two screen frames. It took 2.01 s (group r0, 1980.71→1982.72) and 1.49 s (r1). That is about 1 frame per second instead of 60.
  - `lassoAround` waits for about 40 frames. It took 7.55 s (r0) and 7.19 s (r1).
  - The screen recording only saves a picture when the page repaints. In both group tries the last picture is from just before the drag (1992.00 in r0, 2029.80 in r1), and none came after it, even though the boxes moved 60 px.
- Whole-run numbers, counted in the logs/*.txt files over the 4 runs:
  - pencil:171 passed in 3 runs (17.6–18.2 s) and failed only in run 45640317263 (23.5 s, which includes the 8 s poll).
  - group:293 passed in 3 runs (24.7–25.7 s) and failed here (38.9 s and 35.6 s).
- A 40 % slower processor alone explains neither failure. Both need this stall: anything that waits for the next frame or for an animation stops moving, while timed waits (900 ms, 8 s) keep counting.

## 1. tb2-group.spec.ts:293 (TB-32 ink moves with the boxes)

**(1) Time line, r0 (r1 is the same, with identical numbers):**

- 1991.98: first ink read gives x0 542, y0 567.203125.
- 1992.07: mouse down on box b's grip. 1992.37–1992.41: the 10 move steps all arrive in 41 ms. 1992.42: mouse up.
- Page snapshot at 1992.418 (after the moves, before the lift): boxes a and b still at their old spot. The live preview (`frameOrTimer`, which waits for a frame or 40 ms) never drew before the lift.
- Snapshot at 1992.533: box a's left changes 50.67→110.66, top 118.22→135.11, width 608→598.68. In the same render, every box gets the class `transition-[left,top,width] duration-150` (BoxFrame.tsx:216, `pushed={!!preview || !!heldRows}` at PaperFrame.tsx:2421).
- 1993.45: that class is gone (heldRows released).
- 1993.45–1993.47: second ink read (line 319). All four numbers are identical to the first read, to 1/64 px. x1 577.5 also unchanged.
- 1993.48–1993.50: second box read (line 320, Playwright boundingBox) shows the box moved 59.98 px.

The ink canvas sits inside box a; I checked its parents in the snapshot (data-paper-box 8320fb06 > bn-root > data-ink-overlay). So the ink cannot stay put unless box a itself was read at its old place. The app wrote the right end state.

**(2) Root cause: TEST FAULT, set off by the stalled machine.**

- The test reads the ink while box a's 150 ms slide on left/top is still waiting for its first frame. In WebKit a CSS slide only starts at the next redraw and shows its start value until then. A slide that started at the start value puts box a, and the canvas inside it, exactly at the old place. That matches the identical numbers. Removing the class later does not cancel it, because the default transition-property is `all`.
- Line 318 `waitForTimeout(900)` is wall time. It does not move the animation clock.
- One part is not proven: why the box read 15 ms later shows the end place. Most likely one redraw happened between the two reads and the slide jumped to its end. Then reads of the ink and the box taken at two moments disagree.
- The measurement that would decide it: in the same evaluate as the line-319 read, log `getComputedStyle(a).left` and `a.getAnimations().map(x => [x.playState, x.pending, x.currentTime])`.

**(3) Fix, in the test only.**

- Replace line 318 with waiting for box a's own animations to end: `await a.evaluate(el => Promise.all(el.getAnimations().map(x => x.finished)))`. This waits for an event, not for a number of milliseconds.
- Read the ink box and a's rect in ONE `page.evaluate`, for both the before and after pairs. For example, add a helper `inkAndRect(page, boxSel)` to e2e/inkHelpers.ts next to `inkClientBox`.
- Keep all three checks as they are.

Side note for the app (not the cause here): the dropped boxes themselves get the `pushed` slide. PaperFrame.tsx:1291 then measures the landing spot during that slide (it reads the start value), so the TB-14 glide gets a near-zero distance. This only shows when the preview had not drawn before the lift.

**(4) How to prove the fix:**

- Run tb2-group.spec.ts:293 with `--repeat-each=30 --project=ipad-webkit` on a CI shard, and a stress run with `--workers=4` on one runner.
- Log the measured frame time (for example `frames(page, 10)` duration) next to each result, to show it holds when frames are slow.

**(5) How sure I am:** high that it is a read made mid-slide, not an app fault. The exact identity of the numbers rules out wrong ink and the 200 ms glide (the glide's 1.02 scale would change x1-x0, and no `data-gliding` appears in any snapshot). Medium on why the second read saw the end place.

## 2. tb2-pencil.spec.ts:171 (TB-37 rectangle becomes a shape)

**(1) Time line, r0:**

- 2280.82: pen lift. The shape was recognised: the 400 ms hold ran and `data-shape-making` was set.
- 2281.27: the new box appears.
- Its ink pad is present by 2282.83 (not yet at 2281.80).
- Pen tool shown at 2284.88 (still Text at 2283.86). So the per-frame polling `waitFor` (penOnPaper.ts:40) plus the one frame wait at PaperFrame.tsx:2026 lost about 2 s.
- By 2285.95: the stroke is in memory (aria "Strokes: 1") and Text is back, so the stroke was replayed before 2285.25.
- Database polls at 2285.9, 2286.97 and 2288.0 all return 0. The poll gives up at 2288.03.

r1 shows the same picture: lift 2305.20, box 2305.75, pad by 2308.34, Pen 2309.36, stroke in memory by 2310.38, last poll 2312.42 = 0.

**(2) Root cause: APP RACE in the save timer, made visible by the stall.**

- Shape recognition does not depend on point timing or speed. It worked both times: box made, stroke drawn.
- The stroke was not written to the database in time:
  - `InkDoc.finish` asks for a save in 400 ms (src/ink/inkDoc.ts:283).
  - The first redraw after the stroke calls `noteBlock` (controller.ts:1137) for the new box's line. That line has no saved position yet, so inkDoc.ts:203 calls `schedule(3000)`.
  - `schedule` (inkDoc.ts:340–342) does `clearTimeout` and starts the new wait, so the pending 400 ms save is pushed to 3 s.
- This happens to every first stroke in a new box, on any machine. On a normal machine the whole chain fits in 8 s. Here the frame-paced steps added about 5 s, the 3 s push added the rest, and 8 s ran out.
- In r0 the stroke would have been seen by the poll at 2285.9 with the 400 ms save.
- A real user is affected too: any line measurement keeps postponing the save of fresh ink.

**(3) Fix, in the app.** In `InkDoc.schedule`, never move a pending save later:

```ts
private due = Infinity
private schedule(wait: number): void {
  const at = this.now() + wait
  if (this.timer !== undefined && this.due <= at) return
  clearTimeout(this.timer); this.due = at
  this.timer = setTimeout(() => { this.timer = undefined; this.due = Infinity; void this.flush() }, wait)
}
```

- `flush()` must also reset `timer` and `due`.
- Second fix, so a page that is not redrawing does not hold up the shape:
  - `waitFor` (penOnPaper.ts:40) should also check on a timer or a MutationObserver, not only once per frame.
  - PaperFrame.tsx:2026 should use the existing `frameOrTimer` (src/paper/v2/frameOrTimer.ts).
- The test itself is right as it is.

**(4) How to prove the fix:**

- Add a unit test in the inkDoc tests: apply an edit, call `noteBlock` for a new block, advance fake timers by 400 ms, and expect `save` to have been called.
- Run tb2-pencil.spec.ts:171 with `--repeat-each=30 --project=ipad-webkit` on a CI shard, logging the time from "Strokes: 1" to the stroke being saved (should be about 0.4 s, not 3 s).

**(5) How sure I am:** high. The order of steps is proven by snapshots in both tries, and the 3 s replacement follows directly from reading the code. I did not see the noteBlock call itself in the trace (no console log), but nothing else postpones the save.

## Shared pattern and other tests with the same fault

- **One cause behind both:** on this runner the WebKit page was redrawing about once a second. Waits paced by frames or by animations stall, while timed waits and polls run out. The frameOrTimer.ts comment already records this ("the CI's headless WebKit", run 45565136359).
- **How a test can tell the machine apart by itself:** measure the frame time with `frames(page, 10)` at test start and before the failing step, and attach it to the result. Above about 200 ms per frame, the page was not redrawing, and the report should say so next to the failure.
- **Same save delay (first stroke in a new box, then polling saved ink for 8 s; found by grep, not checked one by one):**
  - tb2-pencil.spec.ts:129 (TB-36)
  - paperInk.spec.ts
  - c33c34-inkbox.spec.ts
  - any `expectStrokes` call after handwriting on empty paper
- **Same read-during-slide risk (a box rect read after a timed wait following a drop):**
  - tb2-move.spec.ts lines 109, 146, 184, 324, 359, 378, 470, 599
  - tb2-bar-b.spec.ts:237
  - tb2-group.spec.ts:130
- Only tb2-group:319 combines that read with `inkClientBox`.
- **Something else I noticed:** the group test's Pen stroke was saved with a 10 px jump between its 5th and 6th points (time 12→330 ms in the saved points). The box's layout moved during the stroke because the stroke started too soon after choosing the Pen. It did not cause this failure.
