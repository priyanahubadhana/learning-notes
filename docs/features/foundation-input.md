# Foundation: input (event router, gesture router)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Root causes 1 and 2 of the Pencil / pointer bugs ([deep research](../research/deep-research-2026-11.md)): about ten modules each listen to the pointer themselves and each decides alone who owns a touch, so a lost "finger lifted" event leaves tools stuck and two features react to one touch. Slices 0c and 0d add one place that listens and one judge that decides. Nothing in the app uses them yet; later slices move onto them one area at a time.

## How it works

### Event router (`src/app/input/eventRouter.ts`)

- When a feature subscribes to a key, pointer, focus or background event → it gets each such event and an unsubscribe function.
- When the first feature subscribes to an event type → one real listener is added to the page; when the last one unsubscribes → it is removed.
- When nobody subscribes → the router adds no listeners at all.
- When several features subscribe → the highest priority gets the event first; equal priority → the earlier subscription first.
- When a handler returns "handled" → nobody after it gets that event.
- When a handler throws → the error is logged and the others still get the event.
- When a feature subscribes with a scope → it only gets events that happen inside that element.
- When a handler unsubscribes or subscribes during delivery → the current delivery is not disturbed; the change counts from the next event.
- When the app goes to the background (tab hidden, page hidden, window loses focus) → every "background" subscriber gets one event with the reason; coming back sends "foreground".

### Gesture router (`src/app/input/gestureRouter.ts`)

- When a pointer goes down → features asked in priority order; the first that claims it owns the gesture (draw, scroll, select, drag, long-press or tap); the others get nothing for that pointer.
- When a drag starts → no other pointer, tap or claim is accepted anywhere until the drop; Esc cancels the drag.
- When the iPad drops a "finger lifted" event → the gesture ends by itself within 4 s (no event for 4 s) and its owner is told "ended: timeout"; no tool stays stuck.
- When a pointercancel arrives mid-gesture → the owner is told "cancelled" and the router is free at once.
- When the app goes to the background mid-gesture → every gesture ends with "background".
- When the Pencil is down, or lifted under 500 ms ago → a finger touch is a palm and is ignored (same rule as `palmGuard.ts`); a Pencil "down" with no event for 3 s no longer counts.
- When a long-press is claimed → it starts only after the hold time without moving more than 12 px; moving earlier or lifting gives it up.
- When the Pencil taps twice within the double-tap time (same values as `penTap.ts` / the main tools) → the second tap is reported as a double tap.
- When two pointers are down (not during a drag) → each has its own owner and ends on its own.
- When an owner's handler throws → the gesture ends, the error is logged and the router stays free.

## Edge cases

Two pointers, pen + palm, lost pointerup, pointercancel mid-drag, app switch mid-gesture, a handler that throws, subscribing during delivery.

## Won't do

- Any change the user can see: nothing in the app is moved onto the routers in 0c/0d.
- No flag yet (the code is unused); not in the first-load bundle.
- No change to the behaviour of `palmGuard.ts`, `penTap.ts`, `inputMachine.ts`, `gestureReset.ts`.

## Security check

No user data, no storage, no network. Errors from handlers are logged, never shown with internals.

## Tests

Unit: `src/app/input/eventRouter.test.ts`, `src/app/input/gestureRouter.test.ts` (one test per line above, fake timers, synthetic pointer sequences, fault tests). e2e: `e2e/foundationInput.spec.ts` (chromium and ipad-webkit: the app loads as before and the routers attach no listeners while unused).
