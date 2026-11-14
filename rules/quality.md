# Quality system (owner-approved 12 Nov 2026; gate order changed by the owner 14 Nov 2026)

Goal: Apple-level results, delivered with Toyota-level consistency: every feature, every time. Quality comes from this system, not from effort.

## 1. One design system

- Every screen uses the shared parts (shell, cards, ▾ menus, sheets, toasts, tag picker, drag, tab row, scroll bar). No screen gets a private copy.
- A new pattern becomes a shared part first, then is used.
- Design references: docs/design/quality-standard.md, owner-ui-patterns.md, the approved mock-ups and conditions in docs/design/owner-decisions.md, and the toolbar design study (docs/mockups/toolbar-v8/design-study.md).

## 2. Spec before code

- Each feature has a spec taken from its approved mock-up: "When I do X → Y happens" lines plus a "won't do" list.
- The spec lines become the acceptance tests. What the owner approved is what gets built.

## 3. Definition of Done (the release bar: every feature, no exceptions, before it is switched ON in the live app)

- Works in Beginner and Professional; every Professional feature is individually unlockable.
- Works in light, dark and sepia themes; on iPad (landscape and portrait), phone and PC; and offline.
- Undo/Redo works; ✕ on fields and dialogs; plain words, identical in both modes; visible feedback on every change; explanations open as pop-ups.
- Calm (no colours, shadows or motion outside the design tokens); options in ▾ menus; drag reflows live; never drop a feature.
- Apple Pencil and touch: hit areas ≥ 44 pt; no accidental typing, selecting or drawing.
- Nothing lost: checked against the mock-up and the feature inventory (file:line).
- Accessible (labels, contrast, keyboard) and within the speed and size budgets (first load ≤ 320,000 B).
- Real use: ten minutes on an iPad in Safari without a break (sign-in stays, turning the device, scrolling, no freeze).

**First-look bar** (before the owner's first test of a phase; a step on the way, never a release): it works; Beginner and Professional; light and dark; iPad both ways and phone; the key flows have tests; the real-use line above holds.

## 4. Tests stop the line (andon)

- Unit tests, full-flow e2e tests including iPad WebKit, screenshot comparison for visual changes, accessibility checks, and size/speed budgets.
- A red fast set blocks the merge; a red full set blocks the release (rules/testing.md). Tests are never weakened to pass; the root cause is fixed.

## 5. Gates, in this order

1. The builder builds the task, runs the tests and uses it for real.
2. The reviewer (Opus) checks the task once: the code against its spec lines and the first-look bar, and the look against the approved picture.
3. **The owner's first look** on the iPad, as soon as the phase works.
4. Fixes, then polish to the Definition of Done; the reviewer checks the release bar.
5. The reviewer checks the full picture set of the phase against the approved pictures. Fable is called only when there is no approved picture or Opus failed.
   Only then, on the owner's yes, is the phase switched ON in the live app.

## 6. Safe release

- Small tasks, each behind an on/off switch that is OFF in the live app; a phase is switched ON only when the full test set is green and the owner said yes; a rollback path is always ready.

## 7. Learn from every bug

- Each bug gets a short "why it happened" note and a new test, so it never returns.
