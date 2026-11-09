# Tools robustness: why Lasso and Text stop after a few uses and after an app switch (9 Nov 2026)

Planner audit (Opus). No app code changed. Plan: [../plans/tools-robustness-plan.md](../plans/tools-robustness-plan.md).

## In one paragraph

The app already has a gesture watchdog (`src/app/gestureReset.ts`) that clears short-lived flags. It only fires on `visibilitychange`, `pageshow`, `pagehide`, `focus`, `blur` or a manual call. While the app stays in front, nothing clears a stuck flag, and no flag has a time limit. Gesture state is spread over about 10 modules (ink controller, penSelect, holdSelect, tapSelect, dragSelect, ownSelection, penGuard, selectGesture, palmGuard, gripDrag, penTap). Each keeps its own idea of whether a pointer is down. Two modules also write the editor's `contenteditable` and later put back a value they _remembered_, so one can put back the other's stale value. iPadOS often drops `pointerup` and `pointercancel` (see Sources). So one lost lift blocks every later Lasso until the app goes to the background. And the reset that runs on resume can itself leave the page non-editable.

## Top root causes (ranked)

1. **A stale `this.gesture` blocks every new Lasso. There is no timeout and no reset while the app stays in front.** `src/ink/controller.ts:1864-1879` `lassoDown`: `if (g) { ...; return }`. A lasso or transform gesture can miss its `pointerup` in several ways: another capture listener eats the event, the pointer capture moves to a pill or handle, iPadOS drops it, or the `pointerId` does not match (`:1993`). After that, every Lasso touch returns early. Only the watchdog (an app switch) clears it. This matches "works 2-3 times, then stops".
2. **`contenteditable` is put back from an old snapshot, and two modules do this.** `controller.ts:1418-1433` (`holdEditing`/`releaseEditing`) saves the attribute and later writes it back. `src/editor/penSelect.ts:78-82,118-121` does the same. `src/editor/editPolicy.ts:55` sets `editor.isEditable` on every tool change. Some orders of events write an old `false` back:
   - a tool switch while a Lasso gesture holds the page;
   - a penSelect hold that is active when the Lasso takes its snapshot;
   - the watchdog's `resetGestures` calling `releaseEditing` (`controller.ts:575`) after a tool change.

   After that the Text tool, tapSelect (`tapSelect.ts:200` refuses `contenteditable="false"`) and penSelect (`penSelect.ts:68`) all stop without any error. This matches "after switching apps many features stop until reopen".

3. **A stuck `selectGesture.active` cancels every loop.** `controller.ts:1963-1966` cancels the Lasso while `selectGesture.active` is true. holdSelect's timer sets it (`holdSelect.ts:109-118`). Only that pointer's lift or the watchdog (`gesture.ts:14`) clears it. If the lift goes to the pad (the pad holds pointer capture) or is lost, it stays true while the app is in front.
4. **tapSelect does not listen for `pointercancel`.** `src/editor/tapSelect.ts:275-277` listens for pointerdown, pointerup and touchstart only. A cancelled tap leaves `down` set. Later taps are counted wrong, so double-tap and triple-tap selection fail until an app switch.
5. **The watchdog only runs on lifecycle events.** `gestureReset.ts:74-95`. There is no document-level `lostpointercapture`, no sweep while idle, and no age limit on the "pointer is down" flags. Those flags are: ownSelection `pointerDown` (`ownSelection.ts:145-152`), penGuard `penState.down` (`penGuard.ts:45`), palmGuard, penTap, gripDrag and the useAutoDeviceMode counter. Each one recovers only on resume.
6. **Ink canvases can lose their content on resume.** `src/ink/render.ts:220` uses a `desynchronized` 2D context. Under memory pressure, iOS can drop or blank what a backgrounded home-screen app has drawn. WebKit 231452 shows blank media after resume. The controller does not handle `contextlost`/`contextrestored` and does not repaint on `visible`. So ink tiles can stay blank, or the live canvas can stop drawing, until a reload. (Not confirmed on a device; the health check in the plan detects it.)
7. **Listeners live as long as the editor, not the gesture.** The good part: every `doc.addEventListener` in penSelect, holdSelect, tapSelect, dragSelect and ownSelection has a matching removal. The risk: `ownSelection.ts:154` adds its listeners once per ProseMirror view. Paper pages mount one editor per box, so N boxes give N copies of each document capture listener (5 modules x N). This is not a leak. But each pointerdown runs 5N handlers, and this does not show up anywhere. The health check should count these listeners.
8. **The pill and handles sit over the pad.** This was fixed on 9 Nov with `pointer-events: none` on the pill's gaps (see CHANGELOG). Still true, by design: the pill's buttons and `[data-ink-handles]` (`controller.ts:1885`) take a loop that starts on them. A test should prove that 20 loops in a row that start next to them all work.
9. **Timers pause in the background.** holdSelect `timer` (`holdSelect.ts:109`), controller `holdTimer` (`:1205`) and `settleTimer` (`:832`). iOS freezes timers while the app is hidden. On resume they fire late, against a gesture that has already ended. Each checks `if (!press)` first. But if `press` survived, holdSelect's timer still calls `beginSelectGesture`, which leads to cause 3.
10. **Version and settings on resume.** `src/app/updates.ts:51` checks for a new version on visibility. The settings mirror is not read again on resume, so an old tool or setting can survive a long time in the background.

## iOS and PWA facts that matter (2024-26)

- iPadOS can send neither `pointerup` nor `pointercancel` when the app goes to the background mid-touch, or during system gestures (Back swipe, Slide Over). Touch events can stop after a home-screen app is backgrounded. Never assume the lift will arrive.
- With some `touch-action` values (`manipulation`), `pointercancel` does not fire. With `pan-x pan-y pinch-zoom` it does (WebKit 240917).
- Timers are frozen while hidden. Under memory pressure iOS can kill a home-screen app and start it again from scratch, which looks like a reload. `pageshow` with `persisted` set means the page came back from the back-forward cache.
- Page Lifecycle: `visibilitychange` to hidden is the last moment you can count on to save. `freeze` and `resume` exist only in Chromium, so on iOS use visibility plus `pageshow`.

## How robust canvases do it

- **tldraw:** one state chart. Every tool state has `onCancel` and `onInterrupt`. The editor sends an interrupt on window blur and a cancel on Escape, and returns to `idle` from any depth. One object owns pointer state (`editor.inputs`).
- **Excalidraw:** one pointer state for the whole app. On `blur`, `pointercancel` or `lostpointercapture` it finishes or throws away the element being drawn and clears its pointer flags.
- Lesson: one state machine owns "is a pointer down". Every way out (lift, cancel, lost capture, blur, hidden, timeout) goes back to `idle` through one function. Other modules read that state instead of keeping their own flags.

## Sources

- [WebKit 240917: pointercancel not fired with touch-action: manipulation](https://bugs.webkit.org/show_bug.cgi?id=240917)
- [WebKit 193962: pointercancel not fired on pan](https://bugs.webkit.org/show_bug.cgi?id=193962)
- [WebKit 194173: pointercancel needs another pointer listener](https://bugs.webkit.org/show_bug.cgi?id=194173)
- [WebKit 239014: no pointerup/cancel during back-forward swipe](https://bugs.webkit.org/show_bug.cgi?id=239014)
- [WebKit 226848: touch events lost when a PWA goes to the background](https://bugs.webkit.org/show_bug.cgi?id=226848)
- [WebKit 231452: blank media after resuming a home-screen app](https://bugs.webkit.org/show_bug.cgi?id=231452)
- [MDN: pointercancel](https://developer.mozilla.org/docs/Web/API/Document/pointercancel_event)
- [Chrome: Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [tldraw docs: Tools and state chart](https://tldraw.dev/docs/tools)
- [Excalidraw source (App.tsx pointer handling)](https://github.com/excalidraw/excalidraw)
