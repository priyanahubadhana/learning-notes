# Testing and Reports

- Test everything yourself and fix failures without asking:
  - Vitest for core logic (data model, storage, block operations); add tests with every logic change.
  - Editor behaviour (keys, slash menu) is tested with a real BlockNote editor via jsdom (`// @vitest-environment jsdom`).
  - Playwright end-to-end tests (`e2e/`, `npm run test:e2e`) for user flows; add one for every new UI feature. Shared steps live in `e2e/helpers.ts`.
  - Screenshots in all three themes (Day, Night, Sepia) and at phone width; fix what you find.
- All tests must pass before a change is called done — and before a phase is done.
- Owner checks: only for what tests cannot check (look, feel, layout, ease of use). No fixed number: as many as genuinely needed, none if tests cover everything. Say briefly why each needs human eyes and explain any term the owner may not know.
- **Report at the end of a step:** short summary, brief self-review (better option, risk, or early fix), the owner's checks, and a "Quick summary" of 3–5 keyword bullets.
