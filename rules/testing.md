# Testing and Reports

- Test everything yourself and fix failures without asking:
  - Vitest for core logic (data model, storage, block operations); add tests with every logic change.
  - Editor behaviour (keys, slash menu) is tested with a real BlockNote editor via jsdom (`// @vitest-environment jsdom`).
  - Playwright end-to-end tests (`e2e/`, `npm run test:e2e`) for user flows; add one for every new UI feature. Shared steps live in `e2e/helpers.ts`.
  - Screenshots in all three themes (Day, Night, Sepia) and at phone width; fix what you find.
- **Rhythm:** after every sub-step, silently run that feature's tests; add the full unit tests if data, security or shared code changed. After a whole plan is executed, run the full suite plus Playwright and fix failures alone.
- **Before every GitHub push:** the full suite. If a test fails, fix it before moving on. Never push failing code.
- Owner checks (collected for the phase-end check-in): only for what tests cannot check (look, feel, layout, ease of use). No fixed number: as many as genuinely needed, none if tests cover everything. Say briefly why each needs human eyes and explain any term the owner may not know.
- **End of a step:** write a short summary and self-review into docs/CHANGELOG.md and add owner checks to docs/HANDOFF.md; then go on to the next step.
- **End-of-work report:** 3 to 5 lines: what was done, test results, choices made alone, and things only the owner can check. Full details go in docs/CHANGELOG.md. One new thing learned goes in docs/LEARNING.md.
