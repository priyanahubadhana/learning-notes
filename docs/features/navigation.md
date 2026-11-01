# Navigation (addresses, Back and Forward)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Every screen has an address (the part after `#`), so refresh, Back, Forward and bookmarks return to the same place.

## How it works

- `src/app/router.ts`: `routeToHash` and `parseHash` convert between a `Route` and the hash. Routes: home, page, notebook, database, databases, cards, data, settings, search (saved id or a JSON query), review (all, wrong, notebook, page with optional `?sub=1`, custom).
- A notebook, database or settings route can carry up to 3 own levels (`parts`: tab, view, Revise lesson, category). `pushRouteParts` adds a history entry for a level; if the address had no level yet, it first writes the current one into the entry being left so Back returns to it. `useRouteParts` follows the address.
- `src/App.tsx`: the route is built from the screen state. A new screen calls `history.pushState`; the first write and the fix-up for a missing page use `replaceState`. On `popstate`, `applyRoute` shows the screen of the address, unless only the levels changed (`baseHash` equal), which those screens handle themselves.
- `useDiscardGuard.tsx` is separate: a click outside a dialog closes it only if nothing was changed, otherwise asks "Discard your changes?".

## Edge cases

- Empty, unknown or damaged addresses (including bad percent-encoding) become home.
- `#/review/custom` and unknown review paths cannot be reopened; custom shows nothing, other unknown ones go home.
- A damaged or non-object search query gives a plain search.
- An address to a missing page shows Home with a message (e2e).

## Security check

- Address parts are percent-decoded safely (a failure gives home) and used as ids only; the search query is JSON-parsed in a try block and accepted only if it is an object.
- Nothing leaves the device; addresses stay in the browser.
- Deletes: none from navigation itself.

## Tests

`src/app/router.test.ts` (round trips, damaged input, 3-level limit, `baseHash`); e2e: `navigation.spec.ts`, `discard.spec.ts`.
