# Part card: Customiser

| Status | Stage | Code                                             | Used by                                                              | Replaces                                        | Last change     |
| ------ | ----- | ------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/Customiser.tsx` (the one file) | [action-bar.md](../action-bar.md), [toolbar-v8.md](../toolbar-v8.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

## Job (the one job; no other code may do it)

The Customise bar sheet: per selection state, which tools sit on the bar, in what order, which go under ⋯, and Reset. One sheet for the Action bar and the Tool bar (action-bar.md check 9).

## Looks and numbers

- Sheet: solid sheet surface, radius of sheets, width from the shell-spec.md frame table (Q9); ✕ top left, ✓ top right (Q8).
- Opens at `--dur-3` with `--ease-out`; reorder drop on `--spring` (system.md §6); reduced motion: fades only.
- Rows 44 px; the approved 20 Nov reference: docs/design/refs/selection-bar-presets-mock.png.

## Rules

- **CU-01** Opens from Customise bar…, the last row of ⋯, on the state I am in (AB-S9).
- **CU-02** A set per state: on the bar, under ⋯, order; Reset brings back the default.
- **CU-03** The ending is editable like the rest; the default keeps it (OPEN-6 B, sheet row 19).
- **CU-04** Sets are stored on the device (action-bar.md security check).
- **CU-05** ✓ saves and closes; ✕ closes and keeps the old set.
- **CU-N1** A tool from the tool table that the sheet cannot place anywhere (AB-N1).
- **CU-N2** A reorder that only a mouse drag can do (AB-N7).

## Scenarios

- **CU-S1, the plain case.** Given words selected, when I choose Customise bar… and move Font under ⋯, then ✓ shows the words bar without Font and Font sits in ⋯.
- **CU-S2, by key.** Given the sheet open, when I move a tool with the keys, then it changes place without a mouse.
- **CU-S3, the thing that goes wrong.** Given a changed set, when I press Reset, then the default set returns and `check:bar-inventory` passes on it.
- Tests: one per scenario in `src/design/parts/Customiser.test.tsx`.

## On the iPad later: what changes, what does not

- **Changes:** drag by finger; presets Edit, Study and Auto get one set per kind each (stage 2, inventory D8).
- **Does not change:** the sheet, ✕ and ✓, Reset, the default sets.

## Design and quality check

Sheet radius and width tokens, `--dur-3`, `--spring`; 44 px rows and handles; click, drag and keys; i18n `actionBar.customise` plus the sheet's own keys; Undo: see CU-OPEN-1.

## Builds on

[action-bar.md](../action-bar.md) (Edit is Customise, AB-05, S9, check 9); the Customise bar sheet approved 20 Nov, reused from the Tool bar ([toolbar-v8.md](../toolbar-v8.md)); [settings.md](../settings.md) (Settings › Bars and menus, F-031).

## Private copies to retire

None named: inventory section 3 names no code file.

## Open points

- **CU-OPEN-1** One Undo per change: action-bar.md check 6 says layout is undone by Reset in the sheet, not by Undo. Does one sheet save count as one Undo?
- **CU-OPEN-2** The key to move a tool in the sheet: not in the spec.
- **CU-OPEN-3** The Tool bar's customiser today: same code or a second copy? T1 of action-bar.md to find it.

## Fable attack read

> waiting for Fable's attack read

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
