# Close ✕ on notices (I1)

Security rules: [rules/security.md](../../rules/security.md). Nothing stored, no network: a button on notices that already exist.

## Purpose

A notice with Undo or an action gets a small close ✕ on the leading edge (owner idea I1, approved 16 Nov 2026; pictures docs/mockups/toast-close/). Switch: `foundation.shell` (OFF live).

## How it works

- NC-1 When a toast with Undo is shown → a ✕ ("Close") sits on the leading edge, Undo on the trailing edge, and the toast does not get taller.
- NC-2 When the ✕ is tapped → the notice closes and the Undo or action is NOT run.
- NC-3 When a banner is shown → its ✕ is on the leading edge, the action sits right after the message; ✕ closes it without the action.
- NC-4 When a ✕ is shown → it is drawn 10 px in a faint 22 px circle with a 44 × 44 tap area, at least 44 px from Undo.
- Also applied to the storage-safety banner (design Banner) and the AI build toasts.
- The update notice keeps its "Later" button.

## Won't do

- No ✕ on notices without an action; no change to timing or the update code.

## Edge cases

Switch OFF: nothing changes. The focus ring shows for the keyboard only.

## Security check

No data, no network.

## Tests

e2e/noticeClose.spec.ts (NC-1, NC-2, NC-3, NC-4).
