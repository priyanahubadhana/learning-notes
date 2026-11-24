# Issue #68: quick Pencil taps on a word act at random (trace digest)

Owner, 25 Nov 2026 03:13 to 03:14 IST, iPad upright (820 x 1180), preview build ad3bee94, Apple Pencil, Lasso recorder ON. Four traces (pasted in the chat; spans 69 to 99 s, 114 to 143 s, 152 to 179 s, 186 to 211 s of the session) and four photos: [1](../shots/2026-11-25-issue68-1.png), [2](../shots/2026-11-25-issue68-2.png), [3](../shots/2026-11-25-issue68-3.png), [4](../shots/2026-11-25-issue68-4.png). Digest by Opus; the raw JSON stays in the chat (too large for the repo).

## What the owner saw

- Photo 1 (trace 1, tool = Lasso): taps on a word picked the whole box (frame and dots), no word selected.
- Photos 2 and 3 (traces 2 and 3, tool = Text): instead of the app's bar, the **iOS edit menu** (Paste, Select, Select All, AutoFill, Format) showed; in photo 3 the whole paragraph is selected with iOS handles.
- Photo 4: the iOS edit menu showed over another box; the selection did not show (it came and went).

## What the traces show (facts)

1. **The Pencil's pointerup often never comes for a quick tap.** In traces 2 to 4 a tap has pointerdown + touchstart, then nothing until the NEXT tap begins: the old touch's `touchend` arrives right before the new `pointerdown` (e.g. trace 2, n 4629 to 4632: touchend of the previous stylus touch at 117268, new pointerdown at the same time, 1.1 s after the first down; no pointerup for the earlier tap at all). The app's machine stays in `pressing` / `selecting` the whole time.
2. **The next tap is then reported as `isPrimary: false`** (`pri: 0`) because iOS still counts the earlier touch as down. Trace 1 n 1705 and trace 2 n 4567, 4588, 4630, 4657 and onward: every quick tap after the first is pri 0. Any code that ignores non-primary pointers drops these taps.
3. **iOS's own text gestures run at the same time.** In Text mode the trace shows the native word selection then paragraph selection (`selectionchange` to a word, then `[0, 86]` / `sl 109` = the whole paragraph) roughly 300 to 500 ms after a tap, then the app puts the caret back (`selectionchange` to a collapsed caret). That is the owner's "a selection comes and disappears", and the native edit menu in photos 2 and 3.
4. **Native mouse events still fire** (`mousedown`, `mouseup`, `click` with detail 2, `dblclick`) about 70 to 100 ms after some taps (trace 3 n 5224 to 5227, 5426 to 5429), so WebKit is treating the taps as a native double tap on the text.
5. **Trace 4, n 5735 to 5736:** `focusout editable` then `focusin other` during a tap series: focus left the editor for another element; likely how the Drive banner or another control got "selected" in earlier sessions.
6. **Lasso tool (trace 1):** each tap goes pressing → selecting → idle with `sel: box` and no `selectionchange`; with the Lasso tool a tap on text picks the box, never a word. Whether that is right is an owner rule question (the Lasso is for loops).

## Likely causes (to prove with a red test first)

- A. The tap logic waits for pointerup (or treats a pointerdown while "pressing" as part of the old gesture) and does not finish a tap on `touchend` / on the next `pointerdown`. Fix idea: end a pen tap on whichever comes first: pointerup, touchend, or a new pointerdown of the same pointer type.
- B. Non-primary pen pointers are ignored. Fix idea: for `pointerType: pen`, never filter on isPrimary.
- C. The app does not stop WebKit's own double-tap and triple-tap text selection and its edit menu on Pencil taps over the editor (`-webkit-touch-callout`, `user-select` during a pen gesture, `preventDefault` on the touchstart / touchend of a stylus tap that the app handles itself, or the `selectionchange` fight). Limits: Safari decides some of this; what cannot be stopped must at least not fight the app (do not collapse a selection iOS just made if the app made the same one).

## Ladder (owner, 25 Nov)

Builder tries (each try needs new evidence: a red test built from these sequences), then Opus, then Fable; only then the stage-2 refinement.

## Trace 5 (owner, 25 Nov 03:22, Lasso tool, photo [5](../shots/2026-11-25-issue68-5.png))

- Owner: double taps on words did not select them in any box except the box that already had the caret; there a double tap worked (native iOS selection, since that box's editor had focus).
- Trace: every tap in Lasso mode goes pressing → selecting → idle with `sel: box`; pointerup arrives normally here (the Lasso captures the pointer), and the app makes no word selection. This is by design for the Lasso (see the owner's rule below), not part of the fault.
- **Owner's rule, 25 Nov:** the Lasso selects only by circling. Taps on words do not select words in Lasso mode; mixing tap-to-select into the Lasso brings back the bugs the Lasso was made to avoid.
- **Owner, 25 Nov: do nothing on #68 now; the owner takes it to Fable** (it has been happening for a long time).
