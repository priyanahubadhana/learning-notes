# Part card: Keys and shortcuts

| Status | Stage | Code                                                  | Used by                                                                              | Replaces                                        | Last change     |
| ------ | ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/KeysAndShortcuts.ts` (the one file) | [action-bar.md](../action-bar.md), [keyboard-shortcuts.md](../keyboard-shortcuts.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

## Job (the one job; no other code may do it)

The one key map for the bar parts: which key runs which bar action, how focus enters and moves along the bar, and what Esc closes. Other parts ask it; none listens to keys on its own.

## Looks and numbers

- Focus ring: 2 px `accent` ring with offset, on every control (system.md §8).
- Shortcuts shown in menus at the right in `muted` (system.md §8 "Menus"); key caps use the `micro` size and the chips-inside-rows radius (§3, §4).

## Rules

- **KS-01** Ctrl+X, Ctrl+C, Ctrl+V and Delete act as Cut, Copy, Paste and Delete (AB-09).
- **KS-02** Alt+F10 moves focus to the bar (Fable's pick, logged; AB-09).
- **KS-03** Arrow keys move focus along the bar (AB-09); Enter: see KS-OPEN-1.
- **KS-04** Esc closes ⋯ first, then ends the selection (AB-09).
- **KS-N1** A bar action with no key path (AB-N7, PC rule "every action also by key").
- **KS-N2** A bar shortcut that steals a key while typing in the page.

## Scenarios

- **KS-S1, the plain case.** Given words selected, when I press Ctrl+C, then they are copied as by the Copy button (AB-S7).
- **KS-S2, into the bar.** Given words selected, when I press Alt+F10 then Arrow Right twice, then focus sits on the third button with its ring.
- **KS-S3, the thing that goes wrong.** Given ⋯ open, when I press Esc twice, then ⋯ closes, then the selection ends; nothing else changes.
- Tests: one per scenario in `src/design/parts/KeysAndShortcuts.test.ts`.

## On the iPad later: what changes, what does not

- **Changes:** a hardware keyboard on the iPad uses the same map; Cmd in place of Ctrl there (see KS-OPEN-2).
- **Does not change:** the map, Alt+F10 entry, the Esc order.

## Design and quality check

Token `accent` ring, `muted`, `micro`; 44 px targets kept; every bar action by click and by key; i18n: key names through `actionBar.*` labels, no hard-coded key text; keys run the same actions, so each keeps that action's one Undo.

## Builds on

[action-bar.md](../action-bar.md) (AB-09, S7); [keyboard-shortcuts.md](../keyboard-shortcuts.md) (the app's shortcuts and the shortcuts sheet, F-061, stage 2).

## Private copies to retire

None named: inventory section 3 names no code file; keyboard-shortcuts.md's current handlers are reviewed by T1.

## Open points

- **KS-OPEN-1** Enter on a focused button with a ▾ (Paste ▾, B/I ▾): press, or open the list? Marked open in the PC picture (23 Nov).
- **KS-OPEN-2** Mac and iPad keyboards: Cmd in place of Ctrl, and is Alt+F10 kept there? Not in the spec.
- **KS-OPEN-3** Keys for the format tools (Ctrl+B, Ctrl+I, …) and for dock, Hold menu, Customise: not in AB-09.
- **KS-OPEN-4** Where focus goes when the bar is left (back to the text?), and Esc inside an open picker: not in AB-09.

## Fable attack read

> Fable, 23 Nov 2026. (1) KS-01 is wrong for Delete with the caret: Delete removes a character in the text, never the box; the key acts as the bar button only when the selection is a box or a picture. Fix the rule. (2) KS-N2 needs a stronger promise for the editor: the bar never calls preventDefault on Ctrl+X, Ctrl+C, Ctrl+V or Delete; the editor does the work and the bar only mirrors (or BlockNote clipboard behaviour breaks). (3) KS-OPEN-1: pick "Enter presses, Alt+Down (and Space) opens the list", the platform standard for split buttons; log it. (4) KS-OPEN-2: Cmd on Mac and iPad, Alt+F10 stays, both standard; log it rather than ask. (5) Add the move-mode keys from the Drag and dock read (DD-06) to this map.

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
