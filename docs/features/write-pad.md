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
- **Engines:** `WritePadEngine` (`engine.ts`) is the seam for later engines (Chromebook Handwriting API, a pen-pressure canvas, the user's own AI key). Only Scribble exists; `hasHandwritingApi()` just detects. The AI engine is **not built** (needs the owner's approval).

## Edge cases

- Read-only page: Insert and Replace are off. Stale positions are clamped. A selection across blocks is removed, then the text is written at its start.
- Caveat has no weight lighter than regular, so Light looks like Normal in Caveat (Kalam has a real Light).
- The pad covers the lower part of the page; scroll the page up to see the last lines.
- Hindi: Scribble has no known Hindi (research); Hindi text can come from the Hindi keyboard, shown in Kalam.

## Security check

No network, no new dependency. Text goes in as plain text with marks; the `hand` value is validated when drawn (unknown values draw as plain text).

## Tests

`src/editor/writePad/apply.test.ts` (insert, replace, selection saved then moved, one Undo each, cursor after text, empty and stale input); `e2e/writePad.spec.ts` (chromium and ipad-webkit: type, Insert, Replace, resize, zoom, keys); real iPad checks in [plans/owner-checks-pending.md](../plans/owner-checks-pending.md).
