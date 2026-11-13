# Quality system (owner-approved 12 Nov 2026)

Goal: Apple-level results, delivered with Toyota-level consistency: every feature, every time. Quality comes from this system, not from effort.

## 1. One design system

- Every screen uses the shared parts (shell, cards, ▾ menus, sheets, toasts, tag picker, drag, tab row). No screen gets a private copy.
- A new pattern becomes a shared part first, then is used.
- Design references: docs/design/quality-standard.md, owner-ui-patterns.md, the approved conditions in docs/PENDING.md, and the toolbar v7 design study.

## 2. Spec before code

- Each feature has a spec taken from its approved mock-up: "When I do X → Y happens" lines plus a "won't do" list.
- The spec lines become the acceptance tests. What the owner approved is what gets built.

## 3. Definition of Done (every feature, no exceptions)

- Works in Beginner and Professional; every Professional feature is individually unlockable.
- Works in light, dark and sepia themes; on iPad (landscape and portrait), phone and PC; and offline.
- Undo/Redo works; ✕ on fields and dialogs; plain words, identical in both modes; visible feedback on every change; explanations open as pop-ups.
- Calm (no colours, shadows or motion outside the design tokens); options in ▾ menus; drag reflows live; never drop a feature.
- Apple Pencil and touch: hit areas ≥ 44 pt; no accidental typing, selecting or drawing.
- Nothing lost: checked against the mock-up and the feature inventory (file:line).
- Accessible (labels, contrast, keyboard) and within the speed and size budgets (first load ≤ 320,000 B).

## 4. Tests stop the line (andon)

- Unit tests, full-flow e2e tests including iPad WebKit, screenshot comparison for visual changes, accessibility checks, and size/speed budgets.
- A red test blocks the release. Tests are never weakened to pass; the root cause is fixed.

## 5. Three gates before the owner sees it

1. The executor builds it and runs the tests.
2. The gate-2 reviewer (economy-gate2, Opus) checks the Definition of Done and the spec.
3. Fable (gate 3) looks at the screenshots personally.
   Only then does it go to the owner for one iPad test.

## 6. Safe release

- Small slices, each behind an on/off switch; the app updates only when all tests are green; a rollback path is always ready.

## 7. Learn from every bug

- Each bug gets a short "why it happened" note and a new test, so it never returns.
