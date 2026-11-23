# Part card: Size selection bar

| Status | Stage | Code                                             | Used by                           | Replaces                                        | Last change     |
| ------ | ----- | ------------------------------------------------ | --------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/SizePicker.tsx` (the one file) | [action-bar.md](../action-bar.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

Name: the brief said "Size strip" and AB-06 says "slider strip"; the owner's names rule (Q15) says "selection bars", never "strip", so the card uses "Size selection bar" as in docs/FEATURES.md F-024.

## Job (the one job; no other code may do it)

Opens from the Action bar's Size button and sets the text size of the selection with a slider (AB-06).

## Looks and numbers

- Card glass, radius of selection bars (system.md §3, §5); `elev-2`; slider thumb and focus in `accent`.
- Opens like a card (system.md §6 "card open"); the thumb moves at `--dur-1`; reduced motion: no slide.
- Range, steps and the sample: see SP-OPEN-1.

## Rules

- **SP-01** Size opens the slider selection bar (AB-06); one control only, no separate More (Q18).
- **SP-02** The selection shows the new size live while the slider moves (F-028 "live samples").
- **SP-03** Arrow keys move the slider one step; Esc closes with no change.
- **SP-04** Opens next to Size, inside the page area, never across the frame (PR:15).
- **SP-N1** One drag of the slider leaves more than one Undo step.
- **SP-N2** The selection bar covers the words whose size it changes.

## Scenarios

- **SP-S1, the plain case.** Given words selected, when I drag the slider and let go, then the words take the size and one Undo restores it.
- **SP-S2, by key.** Given the selection bar open, when I press Arrow Up twice, then the size goes up two steps, live.
- **SP-S3, the thing that goes wrong.** Given I am dragging, when I press Esc, then the size goes back and nothing is recorded.
- Tests: one per scenario in `src/design/parts/SizePicker.test.tsx`.

## On the iPad later: what changes, what does not

- **Changes:** the slider is dragged by finger or Pencil.
- **Does not change:** the range, the steps, the 44 px thumb target, one Undo per drag.

## Design and quality check

Tokens: card glass, selection bars radius, `elev-2`, `accent`, `--dur-1`; 44 px thumb target; mouse drag, click on the track, and arrows; i18n `actionBar.size` plus the slider's label; one Undo per finished drag.

## Builds on

[action-bar.md](../action-bar.md) (AB-06; Size on the caret, words and box rows); [editor-and-blocks.md](../editor-and-blocks.md) (sizes today, F-008).

## Private copies to retire

None named: inventory section 3 names no code file.

## Open points

- **SP-OPEN-1** Range, steps, and a sample line or only the live text: not in the spec.
- **SP-OPEN-2** Does this selection bar also serve Thickness (drawing and mixed rows, stage 2), or does Thickness get its own card? F-028 lists a thickness selection bar.
- **SP-OPEN-3** Close after a pick ("simple selection bar closes", system.md §6) or stay open for more steps?

## Fable attack read

> Fable, 23 Nov 2026. (1) SP-02 live size while dragging re-lays the editor on every step; without a budget this is the slow part of the bar. Add: steps are coalesced to one layout per frame, and the whole drag is one editor transaction (which is what makes SP-N1 true). (2) SP-S3 "Esc during a drag restores" needs the transaction to be cancelable; say it is applied only on release and previewed before. (3) SP-OPEN-3: pick "stays open while the pointer is down, closes on release" and log it; a slider that closes on the first pick is unusable.

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
