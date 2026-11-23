# Part card: More menu

| Status | Stage | Code                                           | Used by                           | Replaces                                        | Last change     |
| ------ | ----- | ---------------------------------------------- | --------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/MoreMenu.tsx` (the one file) | [action-bar.md](../action-bar.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

## Job (the one job; no other code may do it)

The one ⋯ control, always last: its ▾ mark, its list (the tools that did not fit, then the state's ⋯ column), and Customise bar… as the last row.

## Looks and numbers

- Menu: frame glass, radius of menus, rows with a 44 px target, shortcut on the right in `muted` (system.md §3, §8).
- Opens with a fade and a 4 px rise at `--dur-2` (system.md §6); reduced motion: fade only.
- The ▾ is the small mark of Q18 (principles.md, shell-spec.md frame table).

## Rules

- **MM-01** One ⋯, always last on the bar (Q18); no separate More control.
- **MM-02** ⋯ shows ▾ only when its list holds more than Customise bar… (AB-05).
- **MM-03** Customise bar… is always the last row (AB-05, R1).
- **MM-04** Tools that do not fit the width move here first, in bar order; the ending stays (row 20).
- **MM-05** Esc closes ⋯ first; a second Esc ends the selection (AB-09).
- **MM-N1** A row that does nothing (AB-N6).
- **MM-N2** Folding by device instead of by the width the bar has (row 20).

## Scenarios

- **MM-S1, the plain case.** Given words selected, when I open ⋯, then Link, Make card, Add to summary, Revise mark, Customise bar… show in that order.
- **MM-S2, narrow window.** Given a narrow PC window and a box, then the leading tools that do not fit sit first under ⋯ and the ending stays on the bar.
- **MM-S3, the thing that goes wrong.** Given ⋯ open, when I click outside it, then it closes and nothing runs.
- Tests: one per scenario in `src/design/parts/MoreMenu.test.tsx`.

## On the iPad later: what changes, what does not

- **Changes:** the upright iPad folds more tools; the phone too (stage 3).
- **Does not change:** ⋯ last, the ▾ rule, Customise bar… last, the folding order.

## Design and quality check

Tokens: frame glass, menus radius, `muted`, `--dur-2`; 44 px rows; click, arrows, Enter and Esc; i18n `actionBar.more`, `actionBar.customise` and each row's key; each row's action owns its one Undo.

## Builds on

[action-bar.md](../action-bar.md) (tool table ⋯ column, AB-05, AB-09, sheet rows 20 and 21); [toolbar-v8.md](../toolbar-v8.md) (⋯ on the Tool bar, Q18).

## Private copies to retire

None named: inventory section 3 names no code file; T1 of action-bar.md maps the ⋯ lists of the old bars.

## Open points

- **MM-OPEN-1** The "Pinned, nothing selected" row shows ⋯▾ though its list holds only Customise bar…, which AB-05 says has no ▾. Which wins? (Already a DECISIONS review line, 23 Nov.)
- **MM-OPEN-2** Does the Hold menu's ⋯ open this same list at the pointer? Not in the spec.

## Fable attack read

> Fable, 23 Nov 2026. (1) MM-04 (fold by width) needs a measure after render, which clashes with BS-04 (swap in one frame) and flickers. Rule: measure in the same frame before paint (a layout effect), never after the first paint. (2) MM-01 vs MM-02 vs the Pinned row is already with the owner (MM-OPEN-1); until answered the builder follows AB-05 (the spec); the picture follows the table. (3) Upright bar (docked left or right): "does not fit the width" becomes "does not fit the height"; write "the bar's length" instead of width. (4) MM-S1 lists a fixed order; the order comes from the tool table row, so the test must read the table, not a hard-coded list.

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
