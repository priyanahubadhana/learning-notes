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
- When a card, menu or sheet is open and I tap outside it (pen, touch or mouse) → the tap only
  closes it: its pointerdown, pointerup and click are swallowed, so no tool, box or page reacts
  (option `swallowOutsideTap`, on by default for menu/card/sheet, off for dialogs; toolbar TB-06).
  The next tap works normally. A keyboard click, a scroll (pointercancel) or a click more than
  0.7 s after the pointerup is never swallowed. Code: `src/app/overlay/swallow.ts`.
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

Kind — file:line — what (found 12 Nov 2026):

- text — `src/editor/ownSelection.ts:49-51` — module variables (`lastInputAt`, `pointerDown`, `keptUntil`) around the ProseMirror selection; the real text selection lives in the editor view (`PageEditor.tsx`, `HoldMenu.tsx:34`, `dragSelect.ts:140`, `lassoWords.ts:156`).
- text — `src/reader/BookReader.tsx:204` — `useState<ReaderSelection>` for a selection inside a book (quote, anchor, rect); fits `text` with owner `reader` (the anchor stays with the reader).
- box — `src/paper/boxState.ts:18` — reducer state `{kind:'selected', ids}` (also `typing`), held in `PaperFrame.tsx:598` via `useReducer`.
- ink — `src/ink/controller.ts:360` — `selection: string[]` (lasso-picked stroke ids), plus mixed page blocks at `:361`.
- picture — `src/app/tools/context/contextStore.ts:26` — only a "something is selected" flag (`setContextActive('picture', on)`), the picture itself is a ProseMirror node selection.
- cells — `src/editor/selectAllSteps.ts:2,45-100` — ProseMirror `CellSelection` of table cells (no own state).
- rows — none found today (no row selection in `src/databases`); kind reserved for database rows.
- Union covers every kind found; no kind added. Context strip flags (`contextStore.ts`) become a read of the store later.
