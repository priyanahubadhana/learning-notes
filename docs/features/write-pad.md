# Write pad

Security rules: [rules/security.md](../../rules/security.md). Research: [research/write-pad-2026-11.md](../research/write-pad-2026-11.md).

## Purpose

Write with Apple Pencil in a big pad; the words land in the note as typed text with a handwritten look. Free, on the device, offline. It uses iPad **Scribble**: the pad is one plain `<textarea>`, and iPadOS turns Pencil writing into text there.

## How it works

- **Open:** Insert › Write pad (main bar Insert pill, registry tool `writePad`, ribbon Insert › Media). A docked pad appears at the bottom of the page; the tool again, or ✕, closes it. It belongs to the open page; leaving the page closes it.
- **Pad:** a drag grip on the top edge (also ArrowUp/ArrowDown) sets the height (160 px up to 70 % of the window, remembered); **A− / A+** zoom the writing (100 to 300 %, display only, CSS font size, never a transform, so Scribble hit-testing is not disturbed). A one-line **preview** above the box shows the words as they will look.
- **Insert / Replace:** Insert puts the text at the page cursor; Replace swaps it for the words selected on the page (with nothing selected it acts as Insert). Each is **one transaction = one Undo step** (`apply.ts`, `editor.transact`). The page selection is saved when the pad opens and again when the box is tapped; at apply time the live selection is used if the page has focus, otherwise the saved one. After Insert the cursor sits after the new text, the box is emptied and the pad stays open.
- **Look:** text colour and highlight (BlockNote `textColor` / `backgroundColor` marks), size (100, 125, 150, 200 %), font (Caveat default, Kalam for Hindi, Normal) and weight (Light, Normal, Bold). Font, weight and size are one new text style `hand` with value `font.weight.size` (e.g. `caveat.bold.125`); the font files load only when such text is shown. Keys **␣ ↵ ⌫** edit the box (a line break becomes a line break inside the same block). Choices are remembered on the device (`writePad.prefs`).
- **Not an iPad:** the box is an ordinary text box; the line "On iPad, write here with Apple Pencil (Scribble)" shows.
- **Engines:** `WritePadEngine` (`engine.ts`) is the seam for later engines (Chromebook Handwriting API, a pen-pressure canvas, the user's own AI key). Only Scribble exists; `hasHandwritingApi()` just detects. The **AI engine** is built (Phase P): Read with Scribble / AI in the pad; AI is a pressure canvas, the model returns text and each word's weight follows the pen pressure (spec [ai.md](ai.md)).

## Round 6 changes (7 Nov)

- **Layout:** the action row (␣ ↵ ⌫, Replace, Insert) is the second row from the top, so the iPadOS floating bar cannot hide it; the pad also lifts by the `visualViewport` inset.
- **Undo:** the main bar ↶ ↷ undo the pad's text first (`padHistory.ts`: typing within 600 ms is one step, each key is a step, Ctrl/Cmd+Z in the box too); with no pad steps, or after Insert, they act on the page.
- **Enter:** the box keeps real newlines; a mirror layer behind it draws a ↵ mark at each line end; the keys focus the box so the caret shows.

## Never lose text, live writing (R6-15, R6-16)

- **Drafts:** the unsent text is saved per page in localStorage (`draft.ts`) on every change and restored when the pad opens; Insert clears it. Close, page change and reload keep it. Resize, zoom and font only change prefs.
- **Read with:** switching keeps the text. In AI mode the text shows above the canvas and Read adds to it. Unread canvas strokes (`strokeKeep.ts`) survive close and page change; switching away from them asks "Keep writing / Discard".
- **Live ghost:** the text is drawn at the page cursor as a widget decoration (`ghost.ts`, dashed underline, in the chosen look). It is not a document change (no Undo, no sync). Insert / Replace commits it as one step.
- **Insert automatically when I pause (2 s):** pad option, off by default (`autoInsert` pref).

## Edge cases

- Read-only page: Insert and Replace are off. Stale positions are clamped. A selection across blocks is removed, then the text is written at its start.
- Caveat has no weight lighter than regular, so Light looks like Normal in Caveat (Kalam has a real Light).
- The pad covers the lower part of the page; scroll the page up to see the last lines.
- Hindi: Scribble has no known Hindi (research); Hindi text can come from the Hindi keyboard, shown in Kalam.

## Security check

No network, no new dependency. Text goes in as plain text with marks; the `hand` value is validated when drawn (unknown values draw as plain text).

## Tests

`src/editor/writePad/apply.test.ts` (insert, replace, selection saved then moved, one Undo each, cursor after text, empty and stale input); `e2e/writePad.spec.ts` (chromium and ipad-webkit: type, Insert, Replace, resize, zoom, keys); real iPad checks in [plans/owner-checks-pending.md](../plans/owner-checks-pending.md).
