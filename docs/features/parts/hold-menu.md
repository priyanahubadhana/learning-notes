# Part card: Hold menu

| Status | Stage | Code                                           | Used by                                                              | Replaces                                        | Last change     |
| ------ | ----- | ---------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/HoldMenu.tsx` (the one file) | [action-bar.md](../action-bar.md), [page-menus.md](../page-menus.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

Name: the brief said "Hold strip"; the owner's names rule (Q15) says "Hold menu", never "strip", so the card uses "Hold menu" as in docs/FEATURES.md F-024.

## Job (the one job; no other code may do it)

The small menu that a right-click (PC) or a hold (iPad) opens at the pointer: the selection state's ending, Cut, Copy, Paste ▾, Delete, ⋯ (AB-10, PM:7).

## Looks and numbers

- Menu: frame glass, radius of menus, 44 px targets, Delete in `danger` (system.md §1, §3, §8).
- Opens with a fade and a 4 px rise at `--dur-2`; reduced motion: fade only (system.md §6).

## Rules

- **HM-01** Right-click (PC) or hold (iPad) opens it at the pointer (AB "Hold menu").
- **HM-02** Its items are the state's ending; greyed where the bar greys them (AB-10, BS-03).
- **HM-03** While it is open, a pinned bar stays and an unpinned bar hides (AB-10).
- **HM-04** When it closes, the unpinned bar returns.
- **HM-05** Esc or a click elsewhere closes it with no change.
- **HM-N1** The browser's own right-click menu shows in its place on a selection.
- **HM-N2** Two bars for one selection (AB-N5; the Hold menu counts as one).

## Scenarios

- **HM-S1, the plain case.** Given words selected and the bar unpinned, when I right-click them, then the Hold menu opens and the bar hides until it closes (AB-S11).
- **HM-S2, pinned.** Given the bar pinned, when I right-click a box, then the Hold menu opens and the pinned bar stays.
- **HM-S3, the thing that goes wrong.** Given the Hold menu open, when I press Esc, then it closes, nothing changes and the unpinned bar returns.
- Tests: one per scenario in `src/design/parts/HoldMenu.test.tsx`.

## On the iPad later: what changes, what does not

- **Changes:** a finger hold opens it; the Pencil hold rules stay in text-select.md and lasso.md; the tremor rework is F-052 (stage 2).
- **Does not change:** the items, their order, the bar rules while it is open.

## Design and quality check

Tokens: frame glass, menus radius, `danger`, `--dur-2`; 44 px rows; right-click, the context-menu key (see HM-OPEN-2) and arrows; i18n reuses the `actionBar.*` keys of the ending; each item owns its one Undo.

## Builds on

[page-menus.md](../page-menus.md) (the Hold menu, reused, not rebuilt); [action-bar.md](../action-bar.md) (AB-10, S11); [text-select.md](../text-select.md) and [lasso.md](../lasso.md) (Pencil hold, later).

## Private copies to retire

None named: inventory section 3 names no code file; page-menus.md's current Hold menu code is the base, not a copy.

## Open points

- **HM-OPEN-1** What the Hold menu's ⋯ opens (the bar's ⋯ list at the pointer?): not in the spec.
- **HM-OPEN-2** The keyboard way to open it (Shift+F10 or the menu key): not in AB-09.
- **HM-OPEN-3** Right-click on empty paper (no selection, no caret): the Hold menu, or nothing? Not in the spec.

## Fable attack read

> Fable, 23 Nov 2026. (1) HM-N1 (suppress the browser menu on a selection) removes the browser's spelling suggestions on a right-click, which is exactly how the owner fixes wrong words in AI notes on the PC. This needs the owner: my pick is that a right-click on a single misspelled word (no selection) keeps the browser menu, and the Hold menu opens only on a selection, a box or a picture. Add HM-OPEN-4 and send it to the owner now. (2) HM-03 and HM-04 duplicate BP-06; keep them in one card (Bar place owns hide and return; this card only tells it "open" and "closed"). (3) HM-OPEN-2: pick Shift+F10 and the Menu key, the platform standard; log it.

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
