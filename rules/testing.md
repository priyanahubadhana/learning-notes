# Testing and Reports

- Test everything yourself and fix failures without asking:
  - Vitest for core logic (data model, storage, block operations); add tests with every logic change.
  - Editor behaviour (keys, slash menu) is tested with a real BlockNote editor via jsdom (`// @vitest-environment jsdom`).
  - Playwright end-to-end tests (`e2e/`, `npm run test:e2e`) for user flows; add one for every new UI feature. Shared steps live in `e2e/helpers.ts`.
  - Screenshots: light and dark, iPad upright and sideways and phone for the owner's first look; all three themes (Day, Night, Sepia) and PC as well before a release. Fix what you find.
  - Real use: before reporting a task done, use it on an iPad-sized Safari (ipad-webkit): sign in, reload, turn the screen, scroll every list, open and close every pop-up.
- **Rhythm:** after every sub-step, silently run that feature's tests; add the full unit tests if data, security or shared code changed.
- **Two test sets (owner, 14 Nov 2026):**
  - **Fast set, on every merge:** the unit tests and the key flows (about 10 minutes). A red fast set blocks the merge.
  - **Full set, every night and before each release:** every end-to-end test on Chromium and iPad WebKit. A red full set blocks the release (a phase being switched ON in the live app) and is the first job the next morning.
  - Until Phase 0 task 0.4 is built, the full set still runs on every push to the code line.
- Related tests (that feature's spec files) run locally before any push. If a test fails, fix the cause before moving on. Never weaken, skip or delete a test. Never push failing code.
- Owner checks (collected for the phase's first look and its phase-end check-in): only for what tests cannot check (look, feel, layout, ease of use). No fixed number: as many as genuinely needed. Say briefly why each needs human eyes and explain any term the owner may not know.
- **End of a step:** write a short summary and self-review into docs/CHANGELOG.md and add owner checks to the phase page; then go on to the next step.
- **End-of-work report:** 3 to 5 lines: what was done, test results, choices made alone, and things only the owner can check. Full details go in docs/CHANGELOG.md. One new thing learned goes in docs/LEARNING.md.
