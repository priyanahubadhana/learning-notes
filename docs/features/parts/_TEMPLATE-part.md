# Part card: <Part name>

| Status | Code                                         | Used by                  | Replaces                                               | Last change       |
| ------ | -------------------------------------------- | ------------------------ | ------------------------------------------------------ | ----------------- |
| Draft  | `src/design/parts/<File>.tsx` (the one file) | `<spec>.md`, `<spec>.md` | `<old file>`, `<old file>` (removed after the swap-in) | `<date>`, `<who>` |

<!-- One screen long. A part card owns one job for the whole app. Every feature that needs the job points here and never restates these numbers. A change to the job is a change to this card first. -->

## Job

One or two sentences: what this part does for every feature that uses it.

## Looks and numbers

The sizes, spacing, radii, colours, motion and timings, each with its source (design system, approved picture, owner's word and date). This is the only place they are written.

## Behaviour

- **Always true:** …
- **Must never happen:** **PC-N1** …
- **States:** default, hover, pressed, disabled, … (as apply).
- **Keyboard and mouse:** every action reachable by click and by key; focus rules.
- **Touch (later phases):** 44 px targets kept now; Pencil behaviour added in the Pencil phase without changing the card's contract.

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
