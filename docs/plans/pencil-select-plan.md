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
