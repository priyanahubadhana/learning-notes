# Part card: Bar shell

| Status | Stage | Code                                           | Used by                           | Replaces                                        | Last change     |
| ------ | ----- | ---------------------------------------------- | --------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/BarShell.tsx` (the one file) | [action-bar.md](../action-bar.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

## Job (the one job; no other code may do it)

Draws the one Action bar: ⠿, the pin, the state's buttons in the master order, ⋯▾ last. It is handed the tools; it never decides which tools a state has (that is the tool table in action-bar.md).

## Looks and numbers

- Frame glass `.glass` (system.md §5), `elev-2`; Delete in `danger`, the only red (Q16); focus ring `accent`.
- Every target 44 px with `hit-grow` (system.md §8, Q17); Compact tightens spacing only (§10).
- Icons Lucide at the one stroke (system.md §7); press and hover at `--dur-1`; greyed buttons use the Disabled state (§8).
- Bar height, drawn button size and gaps: see BS-OPEN-1.

## Rules

- **BS-01** Order from left: ⠿, pin, the state's tools in AB-03 order, the ending, ⋯▾ last.
- **BS-02** Pin empty when floating, filled when pinned; the filled pin unpins and hides (AB-08).
- **BS-03** With the caret, Cut, Copy, Delete show greyed; nothing moves (AB-03, OPEN-2).
- **BS-04** A state change swaps tools in one frame; left edge and top stay within 1 px (AB-04).
- **BS-05** Every button carries one name, used by screen readers and by Hover names.
- **BS-N1** A button that does nothing is shown (AB-N6).
- **BS-N2** A button moves between states unless the user customised the bar (AB-N2).
- **BS-N3** A second bar draws for the same selection (AB-N5).

## Scenarios

- **BS-S1, caret to words.** Given the caret row, when words are selected, then Cut, Copy, Delete turn active and no button moves.
- **BS-S2, pin as switch.** Given a pinned bar, when I click the filled pin, then the bar hides until the next selection.
- **BS-S3, the thing that goes wrong.** Given a state whose tool list misses an element of the tool table, then `check:bar-inventory` fails (AB-02).
- Tests: one per scenario in `src/design/parts/BarShell.test.tsx`; the parts gallery shows every state.

## On the iPad later: what changes, what does not

- **Changes:** finger and Pencil presses; the Pencil hover name comes from Hover names.
- **Does not change:** the order, the pin as the switch, 44 px, the ending.

## Design and quality check

Tokens `.glass`, `elev-2`, `danger`, `accent`, `--dur-1`; 44 px always; every button by click and by key (Keys and shortcuts); i18n `actionBar.*` (the list in action-bar.md check 5); no content change here, so no Undo of its own (each action owns its one Undo).

## Builds on

[action-bar.md](../action-bar.md) (tool table, AB-03 to AB-05, AB-08); [selection-bar.md](../selection-bar.md) (replaced, history only).

## Private copies to retire

None named: inventory section 3 names no code file. T1 of action-bar.md maps the old text mini bar, box bar, Lasso bar, mixed menu and picture menu; their files join this list then.

## Open points

- **BS-OPEN-1** Bar height, drawn button size and gaps: not in the spec; to come from the PC picture after the owner's yes.
- **BS-OPEN-2** i18n key `actionBar.close` is still listed, though there is no ✕ (the pin is the switch): drop it or keep it?

## Fable attack read

> waiting for Fable's attack read

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
