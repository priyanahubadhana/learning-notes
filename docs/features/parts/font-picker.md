# Part card: Font selection bar

| Status | Stage | Code                                             | Used by                           | Replaces                                        | Last change     |
| ------ | ----- | ------------------------------------------------ | --------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/FontPicker.tsx` (the one file) | [action-bar.md](../action-bar.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

Name: the brief said "Font strip"; the owner's names rule (Q15) says "selection bars", never "strip", so the card uses "Font selection bar" as in docs/FEATURES.md F-024.

## Job (the one job; no other code may do it)

Opens from the Action bar's Font button: the three quick fonts and More fonts…, each shown in its own look (AB-06); applies the pick to the selection.

## Looks and numbers

- The quick fonts and the More fonts… list are named in system.md §4 (Q13); this card does not repeat them.
- Card glass, radius of selection bars (system.md §3, §5); `elev-2`; the current font marked with a tick and the `accent` ring.
- Opens like a card and closes at "simple selection bar closes" after a pick (system.md §6).

## Rules

- **FP-01** Three quick fonts first, each written in its own font; More fonts… last (AB-06).
- **FP-02** One click applies the font to the selection and closes the selection bar.
- **FP-03** The current font is marked by a tick, not by colour alone.
- **FP-04** Esc or a click elsewhere closes it with no change; focus returns to Font.
- **FP-N1** A font name falls back to another font without any sign.
- **FP-N2** A second font list for the same job elsewhere in the app.

## Scenarios

- **FP-S1, the plain case.** Given words selected, when I pick Classic, then the words show in Classic and one Undo restores the old font.
- **FP-S2, More fonts.** Given the selection bar open, when I choose More fonts…, then the longer list opens, each name in its look.
- **FP-S3, the thing that goes wrong.** Given a font is still loading, then its row still shows its name and the pick applies once it loads (see FP-OPEN-2).
- Tests: one per scenario in `src/design/parts/FontPicker.test.tsx`.

## On the iPad later: what changes, what does not

- **Changes:** touch rows; a font selection bar for ink labels is a stage 2 idea (F-312), not this card.
- **Does not change:** the three quick fonts, More fonts…, 44 px rows, one Undo per pick.

## Design and quality check

Tokens: card glass, selection bars radius, `elev-2`, `accent`; rows 44 px; click, arrows and Enter; i18n `actionBar.font` plus the font group labels; one Undo per applied font.

## Builds on

[action-bar.md](../action-bar.md) (AB-06; Font on the caret, words and box rows); [editor-and-blocks.md](../editor-and-blocks.md) (fonts today, F-008).

## Private copies to retire

None named: inventory section 3 names no code file.

## Open points

- **FP-OPEN-1** More fonts…: a longer list inside the same selection bar, or a sheet? Not in the spec.
- **FP-OPEN-2** What a slow-loading font shows meanwhile (FP-S3) is this card's guess; confirm.

## Fable attack read

> Fable, 23 Nov 2026. (1) FP-N1 (no silent fallback) contradicts FP-S3 (a loading font shows its name anyway) and the web: every font falls back while it loads. Pick: the row shows the name in the fallback font with a small loading mark, and the pick applies at once in the fallback, re-rendering when the font lands. (2) Offline is missing: the app works offline, so the three quick fonts must ship with the app, and More fonts… must say what happens with no network (greyed rows with "needs internet once"). This is the biggest gap on the card. (3) FP-N2 is already broken by the Tool bar's font control today; name the file to retire under Private copies once T1 finds it.

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
