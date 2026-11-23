# Part card: Colour picker

| Status | Stage | Code                                               | Used by                           | Replaces                                        | Last change     |
| ------ | ----- | -------------------------------------------------- | --------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/ColourPicker.tsx` (the one file) | [action-bar.md](../action-bar.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

Name: the brief said "Colour strip"; the owner's names rule (Q15, inventory section 5) says "pickers", never "strip", so the card uses "Colour picker" as in docs/FEATURES.md F-024.

## Job (the one job; no other code may do it)

Opens from the Action bar's Colour button and applies one colour to what is selected (words, a box; ink in stage 2).

## Looks and numbers

- Card glass, radius of pickers (system.md §3, §5); `elev-2`; the chosen colour marked with the `accent` ring, not by colour alone.
- Opens like a card (system.md §6 "card open"); closes at "simple picker closes" after a pick.
- Swatches, their number and order: see CP-OPEN-1.

## Rules

- **CP-01** One click on a swatch applies it to the selection and closes the picker.
- **CP-02** Opens next to the Colour button, inside the page area, never across the frame (PR:15).
- **CP-03** Esc or a click elsewhere closes it with no change.
- **CP-04** Every colour pair passes contrast in Day, Night and Sepia (system.md §1).
- **CP-N1** A colour shown only by its fill, with no name for a screen reader.
- **CP-N2** Two colour pickers for the same job (words and box share this one).

## Scenarios

- **CP-S1, the plain case.** Given words selected, when I pick a colour, then the words take it and one Undo brings back the old colour.
- **CP-S2, by key.** Given the picker open, when I arrow to a swatch and press Enter, then it applies.
- **CP-S3, the thing that goes wrong.** Given the picker open, when I press Esc, then nothing changes and focus returns to Colour.
- Tests: one per scenario in `src/design/parts/ColourPicker.test.tsx`.

## On the iPad later: what changes, what does not

- **Changes:** ink colour for drawings and mixed selections (stage 2, AB rows "A drawing", "Mixed").
- **Does not change:** the swatches, their order, 44 px, one Undo per pick.

## Design and quality check

Tokens: card glass, pickers radius, `elev-2`, `accent` ring; every swatch 44 px; click and arrows plus Enter; i18n `actionBar.colour` plus one key per colour name; one Undo per applied colour.

## Builds on

[action-bar.md](../action-bar.md) (Colour on the caret, words and box rows); [editor-and-blocks.md](../editor-and-blocks.md) (text colours today, F-008).

## Private copies to retire

None named: inventory section 3 names no code file; T1 of action-bar.md maps today's colour lists in the old bars.

## Open points

- **CP-OPEN-1** The swatch set (how many, which, recent colours, a custom colour): not in the spec or the inventory.
- **CP-OPEN-2** Highlight: does it use this picker with its own set, or its own part? The caret row lists Highlight both on the bar and in B/I ▾.

## Fable attack read

> Fable, 23 Nov 2026. (1) CP-04 as written cannot be tested: a user can pick any swatch for text on any paper. Restate: the swatch set is chosen so each swatch passes contrast on the default paper in Day, Night and Sepia; a user's pick is never blocked, and a failing pair shows a small warning mark. (2) CP-S1 says "one Undo brings back the old colour": the Undo belongs to the editor change, not the picker; say so, or two Undo entries appear (editor plus picker). (3) CP-OPEN-2 (Highlight) decides whether this part has two sets or two parts; it blocks the build of the words row and must be answered before that work starts.

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
