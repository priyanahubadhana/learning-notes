# Foundation: selection store (0e) and overlay manager (0f)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Two new building blocks, nothing visible yet (root causes 3 and 4 in
[the master plan](../plans/build-master-plan.md)). Later slices move onto them behind the
flags `foundation.selection` and `foundation.overlay`.

- **Selection store** (`src/app/selection/`): one truth for "what is selected".
- **Overlay manager** (`src/app/overlay/`): one owner for everything that floats, using the
  card rule "open beside, never over" ([design study](../mockups/toolbar-v8/design-study.md)).

## How it works

### Selection store

- When I select a box → text, ink and picture selections clear; only the box is selected.
- When anything is selected → every other kind clears (only one kind at a time).
- When I select the same thing again → nothing changes and no change event fires.
- When the owner that made a selection clears it → it clears; when another owner calls
  `clear(owner)` → nothing happens.
- When the selection changes → each listener gets `(next, previous)` once; a React hook
  re-renders only when its picked part changes.

Kinds: `none`, `text`, `box`, `ink`, `picture`, `cells`, `rows`. Inventory of how selection is
held today (file:line) is listed in [Inventory](#inventory).

### Overlay manager

- Layers, bottom to top, one table (`LAYERS`, also CSS variables `--z-<layer>`):
  bar 100, pill 200, menu 300, card 400, sheet 500, dialog 600, toast 700.
- When a second pop-up opens on the same layer → the first closes.
- When a menu, card or sheet opens → any open menu, card or sheet closes (a pop-up opened
  from inside another stays: its parent).
- When I press Esc → only the top-most open overlay closes and focus returns to its opener.
- When I tap outside an open overlay → it closes (a tap on its own trigger does not).
- When a card opens → it sits beside its target (right, else left, else below, else above),
  never over it, and fully inside the screen with an 8 px margin; widths 304 or 376 px.
- When a dialog opens → Tab and Shift+Tab stay inside it; on close focus returns to the opener.
- When toasts arrive → up to 3 stack; a 4th waits; none covers a title rectangle.
- Esc / tap-outside come from an injected `OverlayEvents` (DOM default today; the event router
  from slice 0c later, one-line swap).

## Edge cases

- Target wider than the screen or screen smaller than the card: card is clamped inside, may
  overlap only then.
- iPad landscape 1180×820, portrait 820×1180, phone 390×844: tested at every edge.
- Closing an overlay that already closed does nothing.

## Won't do

- No moving existing bars, menus or `src/app/popups.ts` onto these yet; no visible change.
- No DOM inside the selection store; no animations in the overlay manager.

## Security check

No input from outside, no storage, no secrets. Pure in-memory state.

## Tests

- Unit (Vitest, jsdom, fake timers): `src/app/selection/*.test.ts`, `src/app/overlay/*.test.ts`,
  one test per line above.
- e2e `e2e/foundationSelectionOverlay.spec.ts` (chromium + ipad-webkit): app loads unchanged and
  the modules are not in the first-load bundle.

## Inventory
