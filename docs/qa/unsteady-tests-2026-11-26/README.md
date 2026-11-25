# Unsteady tests: the root causes (26 Nov 2026)

**What this is.** On 25 Nov the full test set failed in two release runs (45640317263 and 45650751735) on app code that had passed in full a few hours before (run 45610217196). Different tests failed each time. The owner, 26 Nov: "find root cause and fix it permanently." Three helpers read the recordings of every failed test, with the code beside them, and did not run anything. This folder holds their reports, word for word. The plan that uses them: [the plan after phase 1A](../../plans/plan-after-1a.md), section 5, step 3.

**Nothing here is proven by a test run yet.** Each report says how sure it is and how its fix is proved. A fix is built by a builder in the normal way: tests first, one review.

## The causes, in one view

| #   | The test that failed                                                   | Kind                           | The cause, in one line                                                                                                                                                                                     | Where the fix goes                                                                                             | Report            |
| --- | ---------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | `e2e/cBoxes.spec.ts` C11 (:404) and C10 (:322, :341)                   | **A real fault in the app**    | One mouse click outside a box that is being typed in can drop the selection: the page reads the box's state at the release, after the browser moved the focus at the press.                                | The app: `src/paper/PaperFrame.tsx`, `tapPaper` decides from the state at the press.                           | [boxes](boxes.md) |
| 2   | `e2e/tb2-pencil.spec.ts:171` TB-37                                     | **A real fault in the app**    | The save of the first pen stroke in a new box is pushed from 0.4 to 3 seconds by the next redraw.                                                                                                          | The app: `src/ink/inkDoc.ts`, `schedule` never moves a waiting save later. A unit test.                        | [ink](ink.md)     |
| 3   | `e2e/tb2-bar-fix.spec.ts:160` F63                                      | A test fault                   | The test reads a position and then makes its first Pencil touch; the app switches to Pencil mode on that touch only when the last key press is more than 1.5 seconds old, and the page then moves 10 px.   | The test: the mode is set before the position is read. Other tests with the same pattern are listed.           | [boxes](boxes.md) |
| 4   | `e2e/c45-symbols-scribble.spec.ts` C14 and C19 (the timed Pencil taps) | A fault in the test's driver   | `e2e/realPen.ts` waits for the browser's answer to a pointer move before each next press. On the failed machine that answer came about 490 ms later, with the next redraw. The app was right in every run. | The driver: a press goes out at its planned time; the driver records when it sent each event.                  | [taps](taps.md)   |
| 5   | `e2e/tb2-group.spec.ts:293` TB-32                                      | A test fault                   | The test reads the ink and its box at two moments while the box's 150 ms slide has not been drawn.                                                                                                         | The test: wait for the box's own animations to end; read both in one step.                                     | [ink](ink.md)     |
| 6   | `e2e/tb2-bar.spec.ts:407`                                              | The machine, and a strict test | A click with an 800 ms limit waited for a still button while the page drew no frame for about 800 ms.                                                                                                      | The test clicks by position (it still proves "the tap is not swallowed"). The drawing stall is measured below. | [boxes](boxes.md) |

## The one condition behind causes 2 to 6

On some hosted machines the page of the iPad test engine (WebKit on Linux, drawn without a graphics card) redraws about once a second instead of sixty times, mostly after the box bar appears or while text is selected. The page itself still answers in a few milliseconds. Every wait that counts frames or animations then stalls, while every wait counted in milliseconds runs out. Three reports found this from three sides. **Why it happens is not proven.** The first suspect is the blur behind the bars (`backdrop-filter: blur(28px)` with a 200 ms fade, at twice the pixel density).

To do first, before the single fixes are judged:

1. Measure the time between frames around the bar's first show on the hosted iPad engine, with the blur and with the app's own lighter look (`data-glass='lite'`).
2. Let each test of the iPad engine write its measured frame time into its result, so that a machine that is not drawing is seen next to a failure and is not taken for a fault of the app, or the other way round.

## What this changes in how unsteady tests are handled

- On 25 Nov these tests got longer waits and polls, and failed again. The recordings gave each cause within the hour. So: the recording is read first.
- Causes 1 and 2 are real faults that a person can meet. Their tests had shown them for days as "passed on the second try", which counted as green. So: a test that passed only on its second try is listed and treated as red.
- About 22 tests hold a hard speed limit in milliseconds and 11 use a wait under one second; the list is at the end of [taps](taps.md).
