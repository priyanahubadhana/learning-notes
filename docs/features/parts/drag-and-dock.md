# Part card: Drag and dock

| Status | Stage | Code                                              | Used by                           | Replaces                                        | Last change     |
| ------ | ----- | ------------------------------------------------- | --------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/DragAndDock.tsx` (the one file) | [action-bar.md](../action-bar.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

## Job (the one job; no other code may do it)

Moves the bar by its grip ⠿: along its current line, or onto an edge (top, left, right, bottom) where it docks; hands the new place to Bar place to keep.

## Looks and numbers

- Grip ⠿ with a 44 px hit area (system.md §8); while dragging, `elev-3` (system.md §5, §8 "Drag").
- Drop settles on `--spring` (system.md §6 "drag drop"); reduced motion: no movement animation.
- Dock distance: within 24 px of an edge (AB-13); this card is the only place it is written.

## Rules

- **DD-01** ⠿ moves the bar along its current line (AB-13).
- **DD-02** Dropped within 24 px of an edge, it docks there: top, left, right or bottom (AB-13).
- **DD-03** The dock is stored like the pin, on the device, after a reload too (AB-08, AB-S14).
- **DD-04** Docked left or right, the bar stands upright (inventory D2: "vertical").
- **DD-05** A drag never leaves the bar off the screen or over the selection (AB-N3).
- **DD-N1** The bar moves without a drag by hand (AB-N4).
- **DD-N2** Moving and docking only a mouse can do (AB-N7; see DD-OPEN-1).

## Scenarios

- **DD-S1, the plain case.** Given a pinned bar, when I drag ⠿ to the top edge, then it docks there and stays after a reload (AB-S14).
- **DD-S2, along the line.** Given a bar docked top, when I drag ⠿ sideways, then it slides along the top and stays there.
- **DD-S3, the thing that goes wrong.** Given I drop the bar half off the screen, then it settles back fully inside.
- Tests: one per scenario in `src/design/parts/DragAndDock.test.tsx`.

## On the iPad later: what changes, what does not

- **Changes:** drag by finger (action-bar.md "On the iPad later").
- **Does not change:** the four edges, the 24 px dock distance, the stored place.

## Design and quality check

Tokens `elev-3`, `--spring`; 44 px grip; mouse drag and keys (DD-OPEN-1); i18n `actionBar.move`; Undo: see DD-OPEN-3.

## Builds on

[action-bar.md](../action-bar.md) (AB-13, S14, "Drag and dock"); Bar place (this folder, [bar-place.md](bar-place.md)) keeps the place.

## Private copies to retire

None named: inventory section 3 names no code file.

## Open points

- **DD-OPEN-1** The keyboard way to move and dock the bar: not in AB-09, yet nothing may be mouse-only.
- **DD-OPEN-2** Does dragging an unpinned bar pin it? AB-S14 starts from a pinned bar; not decided.
- **DD-OPEN-3** One Undo per move, or only Reset (action-bar.md check 6)?

## Fable attack read

> waiting for Fable's attack read

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
