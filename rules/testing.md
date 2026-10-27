# Testing and Reports

- Test everything yourself and fix failures without asking:
  - Vitest for core logic (data model, storage, block operations); add tests with every logic change.
  - Editor behaviour (keys, slash menu) is tested with a real BlockNote editor via jsdom (`// @vitest-environment jsdom`).
  - Playwright end-to-end tests (`e2e/`, `npm run test:e2e`) for user flows; add one for every new UI feature. Shared steps live in `e2e/helpers.ts`.
  - Screenshots in all three themes (Day, Night, Sepia) and at phone width; fix what you find.
- All tests must pass before a change is called done — and before a phase is done.
- Owner checks (collected for the phase-end check-in): only for what tests cannot check (look, feel, layout, ease of use). No fixed number: as many as genuinely needed, none if tests cover everything. Say briefly why each needs human eyes and explain any term the owner may not know.
- **End of a step:** write a short summary and self-review into the CHANGELOG entry and add owner checks to the phase's check list in the README handoff; then go on to the next step.
- **Report at the end of a phase:** short summary, self-review, the screens to check (with screenshot paths), the "Decisions to review" list, and a "Quick summary" of 3–5 keyword bullets.
