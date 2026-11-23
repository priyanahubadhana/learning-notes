# Part card: Bar place

| Status | Stage | Code                                           | Used by                           | Replaces                                        | Last change     |
| ------ | ----- | ---------------------------------------------- | --------------------------------- | ----------------------------------------------- | --------------- |
| Draft  | `1`   | `src/design/parts/BarPlace.tsx` (the one file) | [action-bar.md](../action-bar.md) | none named yet (see "Private copies to retire") | 23 Nov 2026, M9 |

## Job (the one job; no other code may do it)

Decides where the Action bar sits: the first free of the five places while it floats, and the kept place once pinned or docked. It never draws buttons (Bar shell) and never handles the drag (Drag and dock).

## Looks and numbers

- Five places, in order: below, above, upright right, upright left, else under the Tool bar (action-bar.md "Five places").
- Appear and move with `--dur-2` and `--ease-out`; under reduced motion a fade only, no slide (system.md §6).
- Gap to the selection and to the screen edge: see BP-OPEN-1.

## Rules

- **BP-01** Unpinned: the first of the five places that is free (AB-07).
- **BP-02** Never over the selected words, never off the screen (AB-N3).
- **BP-03** Pinned: stays exactly where it is until moved by hand (AB-08, AB-N4).
- **BP-04** Pinned or docked, it joins the app frame; nothing covers it (inventory D8).
- **BP-05** The pinned place is stored on the device; kept on every page and after a restart.
- **BP-06** Hold menu open: a pinned bar stays, an unpinned bar hides, then returns (AB-10).
- **BP-N1** A pinned bar moves by itself (AB-N4).
- **BP-N2** The bar lands over the selection or past the screen edge.

## Scenarios

- **BP-S1, the plain case.** Given words near the top of the page, when there is no room below, then the bar shows above, not over them.
- **BP-S2, pinned keeps place.** Given the bar pinned top left, when I select a box on another page, then it stays top left with the box row (AB-S8).
- **BP-S3, the thing that goes wrong.** Given none of the first four places is free, then the bar sits under the Tool bar and covers nothing selected.
- Tests: one per scenario in `src/design/parts/BarPlace.test.tsx`.

## On the iPad later: what changes, what does not

- **Changes:** the Apple keyboard and the iPad's own menus take room; places are worked out with them (AB-N8).
- **Does not change:** the five places, their order, the pin rules, the stored place.

## Design and quality check

Tokens `--dur-2`, `--ease-out`, reduced-motion fade; 44 px targets kept wherever it lands; pinning by click and by key (Keys and shortcuts); no text of its own, so no new i18n key; the place is layout, undone by the pin or Reset in the Customiser (action-bar.md check 6).

## Builds on

[action-bar.md](../action-bar.md) (AB-07, AB-08, AB-10, S8, S11); [selection-bar.md](../selection-bar.md) (replaced; the 21 Nov place order); [text-select.md](../text-select.md) (what counts as selected).

## Private copies to retire

None named: inventory section 3 names no code file; T1 of action-bar.md finds today's placement code in the old bars.

## Open points

- **BP-OPEN-1** The gap to the selection and to the screen edge: AB-04 points at "SB numbers" not carried into the spec; confirm the numbers.
- **BP-OPEN-2** A pinned place that falls off a smaller window after a resize: not decided (BP-03 against BP-02).
- **BP-OPEN-3** Upright right and upright left: the trigger for an upright bar is not written.

## Fable attack read

> Fable, 23 Nov 2026. (1) BP-02 (never over the selection) and BP-03 (pinned stays exactly) clash the moment a pinned bar sits where the next selection lands. Decide: the pinned bar wins and the owner scrolls, or the bar steps aside once and returns. My pick: the bar wins; it is what "pinned" means. Write it as a rule, not an open point. (2) BP-04 "joins the app frame" means the page reflows when a bar docks; that is a layout change with a speed cost and a motion rule; name the budget (one layout pass, no scroll jump). (3) Upright places (BP-OPEN-3) need an upright Bar shell; see the Bar shell read. (4) BP-05 stores the place on the device: the owner uses a PC and an iPad; say plainly that in stage 1 the place is per device and is not synced.

## Changes

- 23 Nov 2026 · - · card drafted from action-bar.md and the inventory · M9
