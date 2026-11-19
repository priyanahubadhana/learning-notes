# Pencil select in the Text tool (plan, Opus, 19 Nov 2026)

Rules: docs/design/owner-decisions.md sections "The owner's main iPad flow", "Text tool selection borrows the Lasso's way" (+ round 1 and 2 answers), "Circle select is generous". Evidence: docs/plans/combined-test-2026-11-16.md (F5-F7, 19 Nov bullets), pictures retest-18nov/g-19nov-*.

## Goal

Select → (bar action) → back to text, with the Pencil or finger, Scribble ON, on the real iPad: Apple's bar never wins, the right letters are selected, the selection is easy to see.

## Two moments

1. **Text mode** (normal): Scribble writes, a tap places the cursor.
2. **Selected mode** (Lasso-like): from the moment a selection is complete until an action on our bar or a tap. Our own highlight (strong soft purple + 2 round handles), the native browser selection kept collapsed so iPadOS has nothing to show its bar for; our mini bar shown (never over text). Tap on the selection → cursor at that spot (text mode). Delete → cursor in the gap. Copy / Cut / Paste → back to text mode.

## Gestures

- Double tap = word, triple tap = line (finger and Pencil, 1 s window, same spot, acts at once).
- Circle (Pencil only) = letters with at least half inside; a dashed line follows the Pencil and fades; only inside the box it starts in.
- Hold = our bar with Paste (B10).

## Open fork (decided by the owner's recorder traces)

- **A. Take over Scribble's result:** let Scribble do its circle/double tap, then on the first selectionchange convert it into our selection (collapse the native one) and fix the left offset at its cause (suspect: CSS `zoom` on the box content, BoxFrame.tsx:368, or the paper frame's left edge with the sidebar open).
- **B. Keep Scribble away from select gestures:** our own reading of the gesture (pointer/touch events) before WebKit acts. Works only if the traces show we receive the whole stroke / both taps.
- The traces show which events reach us, which are cancelled, and where the offset comes from. Pick A, B or a mix from them; Fable only if neither works.

## Order (one slice each, Sonnet builds, Opus reviews)

1. Offset cause fixed (trace-driven) + replay test from the owner's trace.
2. Selected mode: our highlight + handles + native selection collapsed + bar; tap/Delete/Copy/Cut/Paste exits. Picture of the highlight first.
3. Double/triple tap and circle feed selected mode (A or B); dashed circle line.
4. Hold → our bar with Paste (B10); Paste in the Pencil bar with ▾ (owner 19 Nov); B9 (⋯ paste keeps the caret); B8 (Scribble off: Pencil tap selects a box).

## We will prove (owner checks on the iPad, Scribble ON)

1. Circle "rate-is", the date, "vi" in "Service": the right letters, purple highlight, our bar, never Apple's — 10 of 10.
2. Double tap a word at fast, normal and slow speed, also the cursor's word: our bar 10 of 10.
3. Select → Delete → write the new word with the Pencil: done in 3 moves.
4. Select, then tap anywhere in the text: cursor there, typing works.
5. Hold → Paste works with the Pencil; Paste button in the Pencil bar keeps formatting, ▾ gives plain text.

## Must never happen (owner, 19 Nov)

1. While the owner is writing with Scribble (strokes following each other), a letter loop must never be read as a circle: no selection, no bar pops up, the writing is never interrupted. (Rule: no circle-select while writing is in progress, e.g. within about 1 s of the last Scribble stroke or text input; and a circle needs to cover at least half of an existing letter.)
2. A circle drawn on top of words inside a box must never bring Apple's bar; our bar shows.
3. With words selected, scribbling over them (scratch-out) deletes them (as Scribble's scratch-out does; see scribbleDelete.ts, C4) — never selects or writes something else.

## Trace 1 findings (owner's iPad, 19 Nov 17:37, Scribble ON; trace text in the chat, summary here)

- **While the Pencil touches the screen, the page gets NO pointermove at all.** Each contact gives one pointerdown + one pointermove, then nothing until touchend 2-5 s later (Scribble takes the stroke). All other pointermoves (232) are Pencil HOVER moves (id 1, no button). So our own circle reader can never see a circle while Scribble is on: Fork B is impossible in the Text tool.
- Scribble's writing arrives as beforeinput insertText ("Service", "23-11", "- 2000"): writing works.
- No CSS transform, zoom or scale on any ancestor; visualViewport 0,0 scale 1. The one-word-left offset is inside Scribble's own geometry, which the page cannot correct.
- The recorder's red line in rec-1 is the HOVER path (the Pencil moving above the screen), drawn by the recorder; it is not ink and shows only with the recorder on.
- Conclusion: with Scribble ON, precise Pencil circle-select cannot happen in the Text tool. Precise selection needs a mode where Scribble is not active (the Lasso way, as the owner proposed). Taps (double/triple) do reach the page and can stay ours.
- Paste button not visible in the owner's top row (rec-1 shows the old row: no Paste, Mic not grouped): check the version and the page.menus switch.
