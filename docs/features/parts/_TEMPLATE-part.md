# Part card: <Part name>

| Status | Stage           | Code                                         | Used by                  | Replaces                                               | Last change       |
| ------ | --------------- | -------------------------------------------- | ------------------------ | ------------------------------------------------------ | ----------------- |
| Draft  | `1`, `2` or `3` | `src/design/parts/<File>.tsx` (the one file) | `<spec>.md`, `<spec>.md` | `<old file>`, `<old file>` (removed after the swap-in) | `<date>`, `<who>` |

<!-- One screen long. A part card owns one job for the whole app. Every feature that needs the job points here and never restates these numbers. A change to the job is a change to this card first. -->

## Job

One or two sentences: what this part does for every feature that uses it.

## Looks and numbers

The sizes, spacing, radii, colours, motion and timings, each with its source (design system, approved picture, owner's word and date). This is the only place they are written.

## Behaviour

Each rule and each must-never line is one short line, about twelve words at most (owner, 22 Nov).

- **Always true:** …
- **Must never happen:** **PC-N1** …
- **States:** default, hover, pressed, disabled, … (as apply).
- **Keyboard and mouse:** every action reachable by click and by key; focus rules.
- **Touch (later phases):** 44 px targets kept now; Pencil behaviour added in the Pencil phase without changing the card's contract.

## Quality

Each line yes or no, with a pointer (owner, 22 Nov).

1. Looks like the approved picture: …
2. Meets docs/design/quality-standard.md: …
3. Follows docs/design/owner-ui-patterns.md: …
4. Accessible (keyboard path, labels, contrast, reduced motion): …
5. Every text through i18n keys: …
6. Every change undoable with one Undo: …
7. Speed budget stated and tested: …
8. Device-neutral (44 px, no hover-only, iPad later without redesign): …
9. Flexible (what is customisable, where in Settings): …

## On the iPad later: what changes, what does not

- **Changes:** … (Pencil, touch, screen size).
- **Does not change:** … (the contract and the numbers above). Nothing is designed PC-only.

## Scenarios

- **S1, the plain case.** Given …, when …, then ….
- **S2, the thing that goes wrong.** …

## Interface (for builders)

```ts
// The props or functions, short. The one file exports exactly this.
```

## Ratchet

The private copies this card replaces, by file; each one removed lowers `scripts/ratchet-baseline.json`.

## Tests

One test per scenario in `src/design/parts/<File>.test.tsx`; the parts gallery shows the part in every state.

## Changes

- `<date>` · `#<issue>` · what changed · who confirmed
