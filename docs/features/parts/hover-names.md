# Part card: Hover names

| Status | Stage | Code                                            | Used by                           | Replaces                                        | Last change     |
| ------ | ----- | ----------------------------------------------- | --------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/HoverName.tsx` (the one file) | [action-bar.md](../action-bar.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

## Job (the one job; no other code may do it)

Shows a button's name when the mouse (later the Pencil) rests on it. It is an extra: it never carries an action and never hides one.

## Looks and numbers

- Surface `surface-3` with `ink` text at the `small` type size (system.md §1, §4); radius of chips inside rows (§3).
- Appears with `--dur-2` (tooltips, system.md §6); under reduced motion an opacity fade only.
- Delay before showing and where it sits against the button: see HN-OPEN-1, HN-OPEN-2.

## Rules

- **HN-01** Every Action bar button shows its name on hover (AB "Hover names", OD:549).
- **HN-02** Greyed buttons name themselves too ("every button names itself on hover", tool table).
- **HN-03** The name is the button's accessible name (Bar shell BS-05); one text, one key.
- **HN-04** Never on a finger hold: a hold opens the Hold menu instead (OD:549).
- **HN-05** It never covers the button it names, nor the selected words.
- **HN-N1** An action that only a hover can reach (AB-N7).
- **HN-N2** A name that stays after the pointer has left.

## Scenarios

- **HN-S1, the plain case.** Given words selected on the PC, when I rest the mouse on Font, then "Font" shows (AB-S7).
- **HN-S2, greyed.** Given only the caret, when I rest the mouse on the greyed Cut, then "Cut" shows.
- **HN-S3, the thing that goes wrong.** Given a hover name showing, when I press the button, then the name goes and the action runs once.
- Tests: one per scenario in `src/design/parts/HoverName.test.tsx`.

## On the iPad later: what changes, what does not

- **Changes:** the Pencil hover (iPad Pro) shows the same name (inventory pictures 21, 22).
- **Does not change:** the text, the place against the button, no name on a finger hold.

## Design and quality check

Tokens `surface-3`, `ink`, `small`, `--dur-2`; the button's 44 px target is untouched; reached by mouse (keyboard focus: HN-OPEN-4), and every named action also runs by click and key; i18n: reuses each button's `actionBar.*` key, no new key; shows only, so no Undo.

## Builds on

[action-bar.md](../action-bar.md) ("Hover names", AB-N7, S7); [toolbar-v8.md](../toolbar-v8.md) (hover names on the Tool bar, Q12).

## Private copies to retire

None named: inventory section 3 names no code file.

## Open points

- **HN-OPEN-1** The delay before a name shows (and none on the second button in a row?): not in the spec.
- **HN-OPEN-2** Above or below the button, and on a bar docked left or right: not in the spec.
- **HN-OPEN-3** Does the name also show the key (for example "Copy Ctrl+C")? Not in the spec.
- **HN-OPEN-4** Does the name also show on keyboard focus (Alt+F10, arrows)? Not in the spec.

## Fable attack read

> Fable, 23 Nov 2026. (1) HN-05 "never covers the selected words" cannot always hold when the bar sits below the words and the name shows above the button. Replace with: the name shows on the side away from the selection; if neither side is free it shows below. (2) HN-OPEN-4 should not be open: the PC rule says nothing is hover-only, so the name must also show on keyboard focus after the same delay. Make it HN-06. (3) Add a must-never: a hover name never captures the pointer (no hover trap that keeps a button from being pressed).

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
