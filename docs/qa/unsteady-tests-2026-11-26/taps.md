# Unsteady tests, 26 Nov 2026: the timed Pencil tap tests (c45 C14, C19)

Read-only diagnosis from the recordings of CI run 45650751735, by a helper for Fable. Nothing here is proven by a test run yet; the report says how to prove it.

## Report from taps: the timed Pencil tap tests on the iPad engine (c45 C14 x2, C14 "already selected", C19 triple), run 45650751735, shard 3

**Verdict: TEST FAULT, in the driver.** The hosted machine made it show, but the machine did not cause it. The fault is in `e2e/realPen.ts`, function `realPenTaps`, the WebKit branch (lines 191-204). Before each next press the driver waits for the browser to answer the "way back" mouse move it sent after the previous lift (line 204, awaited at 192-195). WebKit only answered that move at its next paint, and on this machine the next paint came about 490 ms after any tap that left text selected. So the next press always went out at least about 510 ms after the lift, whatever lead the driver used. The driver's own comment (lines 116-118) says the opposite: "the way back ... sent alongside, so their answers never hold a down or an up back." The recordings are the artifact playwright-results-ipad-3 of that run (kept by GitHub for 7 days).

### 1. How late, and was the whole machine slow?

- **Press lengths arrived on time.** Each press arrived at (asked − lead) plus 0-5 ms. Example, C14 double, repeat 12: asked 190, lead 2, arrived 189. The lead the driver learned for presses fell to 1-5 ms, so the browser itself delivers events precisely.
- **Gaps after a selecting tap were late, and fixed in size.** They arrived 496-553 ms apart whatever was asked:
  - C14 double, first try: asked 405-491, arrived 496-545 (+41 to +133 ms over the asked value).
  - C14 triple: second gap 530-550 every run.
  - C14 "already selected": asked 400, arrived 511-552.
  - C19 triple: second gap 742-763 against a limit of 700. That gap waits for the slow move answer (about 490 ms) plus the next move to the new spot (190-198 ms).
- **The recording's time stamps show why.** The move after a lift took 462-541 ms (median about 490) in every recording: 131 slow moves in total. The next press went out 4-6 ms (median) after that answer. From the start of a lift to the next press: median 511-529 ms.
- **The wait is tied to paints.** During those 131 slow moves the page painted 0 frames. A frame always followed 22-33 ms after each answer. Moves made while the tip was down answered in 2-17 ms. Moves made while a blinking cursor was showing (the first tap of a C19 run) answered in 3-20 ms.
- **The page was idle.** Its own handlers ran 0-3 ms after each event's time stamp.
- **Steady, not bursts.** The slow answers sit tightly around 490 ms in every run of all 8 recordings, from the second run on. This is not a stall.
- **The machine was only a little slower.**

|                                | Failed run 45650751735 | Green runs           |
| ------------------------------ | ---------------------- | -------------------- |
| Shard 3, main step (2 workers) | 23.2 min               | 19.4, 19.7, 19.8 min |
| TB-04                          | 15.9 s                 | 14.8-14.9 s          |
| C19 double (passed in both)    | 3.5 min                | 3.4 min              |

- **Same code, same image.** Run 45640317263 shard 3 used the same commit (c10bc24) and the same runner image (20261116.376.1) and passed. Its gaps went as low as 286-296 ms, so on that machine the way-back answer must have come faster.
- **Not proven yet:** why this machine painted only about every 500 ms while text was selected. The one measurement that decides it is a recording of this step from a green run, comparing how long the move after each lift takes there.

### 2. Why the lead could not make up for it

None of the suspects is the cause: not the 120 ms cap, not the 6-sample window, not the start value 30, not the retry starting over at 30. The press is held back by the move's answer, and the lead only moves the time the driver aims for (`until(next + gap − lead)`), which had already passed.

The arithmetic, C14 double, first try:

- The gap lead was 30 for runs 0-5 and hit the cap of 120 from run 6.
- In run 12 the driver aimed to send the press 405 − 120 = 285 ms after the lift. It was really sent about 511 ms after, so it arrived 538 ms after. The Lead then "learns" a delay of 253 ms and caps it at 120.
- Even with no cap, the gap cannot go below: lift answer (4-12 ms) + about 15 ms + move answer (462-541 ms), which is about 500-550 ms.
- Only 2 of 13 runs came in on time: run 0 (that move answered in 87 ms) and run 9 (496 ms). The triple test had 0 of 11 on time, because its second gap was always at least 530 ms.
- At 2 runs in 13, getting 50 good runs needs about 325 runs, so about 275 late ones against the cap of 10. A driver that first measures the machine and then sends earlier would still fail, with the cap unchanged. The retries failed the same way.

### 3. Exact time stamps on WebKit

- **Not available.** In Playwright (playwright-core 1.65.1 from the npx cache), WebKit's `Input.dispatchMouseEvent` takes only type, button, buttons, x, y, modifiers and clickCount. Its tap event takes only x, y and modifiers. There is no time stamp field, and `controlledStamps` returns null on WebKit.
- **How the app reads time.** It uses the event's own time stamp: `stampOf(e)`, which is `e.timeStamp`, compared with `stampNow()`, which is `performance.now()` (`src/app/tapTiming.ts`). It also runs real timers: in `src/editor/tapSelect.ts`, a setTimeout(0) that sets the selection, the cursor fix-up at about 720 ms, the 350 ms click hold-back (line 566), and `boxTapUntil = Date.now()+500` (line 817).
- **Faking it changes the proof.** A test script could fake the time stamp the way it already fakes `pointerType`. But then the time stamps the app sees and its real timers disagree, so the test would no longer prove what a real iPad does. So: not possible without changing what the test proves.

### Fix (in the test driver, nothing weakened)

- **(a)** Send each press at its planned time and stop waiting for the way-back move before it. Only `until(...)` holds the press; wait for the move afterwards. Playwright sets the pointer position before it waits for the move's answer (`Mouse.move` in coreBundle.js), so the press still lands on the right spot, and WebKit keeps the events in order. **Open point:** a press queued behind an unanswered move may get its time stamp when it is sent or only when it is delivered. One probe settles it: on ipad-webkit with a word selected, send a move and then a press without waiting, and compare the press's `timeStamp` with the time it was sent.
- **(b)** If (a) does not help, keep the page painting during a run, for example a 1 px fixed test element with a CSS animation while `__realPen` is on. The recordings show the move's answer waits for a paint, and this changes no app code path and no time stamp.
- **In both cases,** record when each event was really sent. Then the test can tell "the driver held it back" (a test fault, which should fail loudly) apart from "the browser stamped it late" (the machine). Today the Lead assumes the press went out on time (`sent = asked − lead`), so it reports the driver's own wait as lateness of the PC.

**How to prove it:** run the six TIMED_TAPS tests on ipad-webkit, `--workers=1 --repeat-each=5`, in the hosted pencil-webkit job with tracing on. Pass means:

- every move after a lift answers in under 30 ms;
- every press is sent within 5 ms of plan;
- at most 4 late runs per test, as in the green runs.

**How sure I am:**

- High that the press waited on the move's answer (131 of 131 slow moves, press sent 4-6 ms after the answer).
- Medium that the answer waits for a paint (strong correlation, WebKit internals not read).
- Unknown why this machine painted about every 500 ms.
- **Not an app race:** every event arrived with a correct time stamp, and every "nothing deleted" check passed. The tests failed only on the late-run cap.

**Shared pattern:** the same driver wait affects only the callers that use drift or a sideways offset, which is just the c45 C14, C19 and C19far tests. I checked the other callers (iosSelect tapRun, tb2-taps, firstBoxTap, tb2-bar-fix) and found no drift or offset, so they do not use the way-back move.

### 4. Other tests that measure real milliseconds on the hosted machine

- About 22 hard speed limits in 14 files.
- 11 waits or clicks with a timeout under 1 s.
- `waitForTimeout`: 1262 uses in 301 files. Most are settling pauses, not timings; I did not sort them one by one.
- I did not check which of these run in the ipad-webkit project.

The ten riskiest:

1. `e2e/tb2-bar-firsttap.spec.ts:256` must be under 150 ms (and line 202: under 350 ms).
2. `e2e/tb2-bar.spec.ts:414-415`: a click with an 800 ms timeout.
3. `e2e/toolbarV8Tuck.spec.ts:100`: under 200 ms (used by the TB-74 tests at 117 and 139).
4. `e2e/paperBudget.spec.ts:189`: median under 150 ms.
5. `e2e/bigPageBudget.spec.ts:642` (median frame under 25 ms) and 644 (under 10 % late frames).
6. `e2e/inkLayers.spec.ts:283`: frame under 80 ms.
7. `e2e/toolbarV8Eraser.spec.ts:346` (p95 under 8 ms) and 347 (under 600 ms).
8. `e2e/iosSelect.spec.ts:385, 450, 459, 675, 686`: polls with an 800 ms timeout (also `iosSelectShots.spec.ts:171`).
9. `e2e/homeBigData.spec.ts:73`: under 300 ms; `e2e/pillSpeed.spec.ts:53`: under 400 ms.
10. `e2e/tb2-move.spec.ts:114`: 600 ms timeout; `steps/lasso.steps.ts:351`, `storageSafety.spec.ts:418` and `updateV2.spec.ts:628`: 500 ms timeouts.

Lower risk: `startSpeed.spec.ts:45` (under 4 s), `readerControls.spec.ts:206`, `firstScreenTexts.spec.ts:191`, `p1-speed.spec.ts:275-277` (has a slow-machine factor), and `lazyTapPaint.spec.ts:173` (only a warning on the hosted iPad engine).
