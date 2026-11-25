# Unsteady tests, 26 Nov 2026: the box tests (C10, C11, tb2-bar:407, F63)

Read-only diagnosis from the recordings of CI runs 45640317263 and 45650751735, by a helper for Fable. Nothing here is proven by a test run yet; each part says how to prove it.

## boxes: report (read-only; scripts and unzipped traces in the recordings are the artifacts playwright-results-ipad-1, -3 and -6 of those two runs (kept by GitHub for 7 days), timeline printer tl.js there)

Times below are ms from the start of each test (test.trace monotonic).

### 1 + 2. C11 (cBoxes:404) and C10 (cBoxes:322, helper caretBox at line 61). Verdict: APP RACE

**What the recordings show** (C11 try 1; try 2 and C10 are the same):

- 12183: tapTextEnd click. 12524 snapshot: box has `data-picked` and `data-typing`. That means typing that is not "fresh", because pickedOf() gives picked only when typing is not fresh.
- 12622–12748: the one tapOut mouseClick (126 ms). 12756 snapshot: box `{}`, neither picked nor typing. It stayed that way until the 15 s failure at 28173.
- C11 retry: click 12945–13039, then `{}` at 13044. C10: click 12391–12457, then `{}` at 12470.
- No stall: every step around it took 3–30 ms. The state was already wrong one snapshot after the click.

**Root cause**

- From typing that is not fresh, only a `clear` (or `pick []`) can reach IDLE. `caretOut` gives "selected" (boxState.ts, case 'caretOut').
- The one `clear` a paper tap can send is in `tapPaper` (src/paper/PaperFrame.tsx ~2184–2199). It runs on **pointerup** (onPointerUp ~2586) and branches on `bsRef.current`:
  - typing → `caretOut` (the box stays selected)
  - anything else that is not idle → `clear`
- `bsRef` is updated only in a `useEffect` after the render (~676–679).
- With a mouse (Playwright's mouse, a desktop mouse, an iPad trackpad), WebKit moves focus on **mousedown**. Mousedown comes before pointerup.
- The race runs in this order:
  1. focusout listener (~721–729) → `setTimeout(0)` → `caretOut` → render → effect sets bsRef to "selected"
  2. pointerup → tapPaper sees "selected" → sends `clear` → IDLE
- So one tap acts as two: the blur is taken as the first tap outside and the pointerup as the second.
- Whether it fails depends only on whether the down→up gap is longer than timer(0) + render + effect, a few ms. Playwright's gap grows on a busy runner: these clicks took 66–126 ms against 42 ms for a normal one.
- Real users:
  - A mouse or trackpad press normally lasts 80–150 ms, so a mouse user should lose the selection on nearly every first click outside. I could not run it (read-only), so this is inferred, not measured.
  - A finger or Pencil on the iPad is safe, because WebKit sends the compatibility mousedown and focus change after touchend, so pointerup comes first.

**Fix (PaperFrame.tsx)**: decide from the state at pointerdown, not at pointerup.

- In `send` (~680): `const next = boxReducer(bsRef.current, e); if (next !== bsRef.current) { bsRef.current = next; dispatchBs(e) }`. The ref becomes exact at once; the effect can stay.
- In the sheets' `onPointerDown` (~2546): store `bs: bsRef.current` in `tapStart.current`. Pointerdown fires before mousedown, so this is before the blur.
- In `tapPaper`: use `down.bs` instead of `bsRef.current` in the deselect block:
  - typing, not fresh → `send({type:'pick', ids:[down.bs.id]})`, which is the same result whether or not the focusout's caretOut already ran
  - fresh typing → clear (unchanged)
  - selected → clear + forgetCaret (unchanged)

**Proof**

- Add one test (computer mode, webkit and chromium): type in a box, then `mouse.move`, `mouse.down`, `waitForTimeout(100)`, `mouse.up` on bare paper, and expect `data-picked`.
- Prediction: it fails every time on today's code and passes after the fix.
- Then run C11, C10 ×2 and the C10 card test with `--repeat-each=30 --project=ipad-webkit`, under CPU load (`--workers=4`).

**How sure**: high on the mechanism. The state proof (typing not fresh → `{}`) leaves `clear` from tapPaper as the only path. The order focusout-before-pointerup is inferred, not logged. The deciding measurement is the 100 ms hold test, or a page log of pointerdown / focusout / caretOut / pointerup with bsRef.kind.

### 3. tb2-bar:407 "a tap on the bar works at once". Verdict: MACHINE (the page stopped drawing), plus a test that measures drawing speed

**What the recording shows**:

- 13939: synthetic pick. By 14052 the snapshot has `data-picked` and the bar (translate 0 −12px).
- 14095–14882: click on "Box actions" waits for "visible, enabled and stable" and times out at 800 ms.
- 14888 snapshot: the same translate, so the bar did not move.
- The last screen frame was drawn at 14851. It still shows the box **unselected and no bar**, about 800 ms after the DOM changed. The frame before it was at 13564.
- Meanwhile the page answered every snapshot in 4–10 ms, so the main thread was free but no frame was drawn. Playwright's "stable" check needs two animation frames, so it cannot pass.
- The same shard (run 45640317263, pencil-webkit 6, job 139302106445) took 47 min against 26–30 min for its sibling shards. In F63 in that shard, the first two Pencil hovers after the bar appeared took 614 and 822 ms; WebKit answers a hover only after a repaint.
- Likely heavy part (not proven): the bar's `backdrop-filter: blur(28px)` plus the 200 ms fade (partsMisc.css `.pm-ob`) at deviceScaleFactor 2 on a machine that draws in software.

**Fix (test)**:

- The property is "the tap right after the selecting tap is not swallowed". The swallow window is swallowCaret's 350 ms in src/editor/tapSelect.ts, and it deliberately lets the bar through.
- Replace `.click({timeout: 800})` with: read the button's boundingBox, then `page.mouse.click(centre)` at once, then `expect(more(page)).toBeVisible()`.
- This still fails if the app swallows the tap, and it no longer depends on frame rate.
- Optional app check: run once with `[data-glass='lite']`; if the stall disappears, the blur is the cost.

**Proof**: `--repeat-each=50` on ipad-webkit with `--workers=4`.

**How sure**: medium-high. The frame at 14851 is direct proof that nothing was drawn. That the blur causes it is a guess; measure the gaps between animation frames in the page around the pick.

### 4. tb2-bar-fix:160 F63, failing at line 189. Verdict: TEST FAULT (depends on real milliseconds)

**What the recording shows** (both tries):

- 11547: `Escape`, pressed inside pick().
- 11790: `before` is read: bar at y 689.4.
- Pencil hovers: 11959–12573 and 12581–13403 (slow, see 3).
- 13417: the Pencil touches down. The snapshot after mousedown (13563) shows the toast **"Switched to Pencil mode"**, and the html style changes (`--dock-top: 86px`). Pencil mode's bar is "large", so the page moves down 10 px.
- 13564: lift, and the pin is set from the bar's position after the move.
- All 34 polls read pinned y 699.4 against before 689.4, steady for 15 s (log of job 139302106445).
- Retry: Escape 11526, Pencil down 13757.
- The rule (src/settings/deviceModeSettings.ts ~258–270): a Pencil pointerdown switches the mode unless a key was pressed in the last `AUTO_SWITCH_QUIET_MS = 1500` (src/app/deviceMode.ts:126).
  - Failed tries: 1870 ms and 2231 ms after Escape → switch.
  - Green runs: the hovers were fast → under 1500 ms → no switch → pinned 689.4 (logs 45610217196 and others). Some green runs show `back` 699.4 with an unchanged gap: the switch came on the second tap, and that poll compares against the box.
- The app pinned the bar where it stood when tapped, which is correct.

**Fix (test)**: make the mode fixed before `before` is read.

- Let `start()` take `'pencil'` (`startInMode(page,'pencil')`) and use it in `ready()` for F61–F63.
- Or keep computer mode and do one Pencil tap on bare paper first, then wait out the toast.
- Do not just compare against the box: that would hide the 1500 ms dependence.

**Proof**: `--repeat-each=30` on ipad-webkit, with and without load; `before` and `pinned` must be equal every time.

**How sure**: high (toast in the snapshot, measured gaps, the 1500 ms constant).

- Small app point: if the mode-switch render ever landed after the pin's read, the pinned bar would sit 10 px off its box. That is not seen here.

### Shared patterns

- **One app race behind C11, C10 resize and the C10 card test** (cBoxes:341, also flaky; it uses caretBox). Other users of tapOut-after-typing: cBoxesShots.spec.ts and tb2-resize-shots.spec.ts (one each). tb2-select.spec.ts:393 "C11 + TB-08" failed once in scan-out and should be checked against this cause (not verified).
- **3 and 4 come from the same slow shard.** After the box bar appears, WebKit draws nothing for 0.6–0.9 s. Test 3 hits Playwright's 800 ms limit. In test 4 the stall pushes the Pencil tap past the app's real-time 1500 ms key-quiet window.
- **Same fault as F63 elsewhere**: any test that presses a key, starts in computer or touch mode and then uses realPen* can switch mode, and move the page, depending on wall-clock time. Files with realPen and a non-pencil start include: b11TextNoInk, c0Paste (touch), iosSelect, lassoFreeze, tb2-bar-fix, and the cBoxesHelpers-based files (c28/c30 shots, cBoxesC21, freeSpaceC28, miniKeysPen, tb2-pencil, c45-symbols-scribble, which start in computer mode via `start`). Each needs a check that it reads positions or mode-dependent layout across its first Pencil touch.
