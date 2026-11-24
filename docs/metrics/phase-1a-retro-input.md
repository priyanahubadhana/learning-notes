# Phase 1A: input for the Fable review (what went wrong, what to change)

Written for: Fable, at the review after phase 1A is live and the full test set is green. Kept by the manager (Opus) while the phase runs; one entry per event, facts first, then the proposal. The owner asked for this file on 25 Nov 2026.

How to read: each entry has **What happened** (facts, dates, numbers), **Cost** (time or risk), **Why** (the root cause, not the symptom) and **Proposal** (a rule or a tool, small). Fable decides; nothing here changes a rule by itself.

## Entries

### 1. The nightly full set was red for a week and nobody stopped

- **What happened:** the nightly full test set on build/next (NIGHTLY_REF) did not pass from at least 18 Nov to 24 Nov: runs 44223699930 (18 Nov, cancelled), 44440547513 (19 Nov, failed), 44656387951, 44851295318 (cancelled), 44967040327, 45091969248 (failed at `checks`, so no browser test ran), 45329345242 (24 Nov: pencil-webkit could not load). The release run of 24 Nov (45443692412) was the first full run in about a week; it found 26 failing tests.
- **Cost:** the live release of phase 1A was blocked on the owner's yes; a fix round of most of a day; the failures were older than the work that exposed them.
- **Why:** the nightly result went to nobody's morning list; the fast set on each merge was green, so the line looked healthy.
- **Proposal:** a red or cancelled nightly is a stop-the-line item in the first message of the morning (the morning report reads `gh run list --event schedule --limit 1`); no merge into build/next until it is green or a fix task is open.

### 2. A test helper file broke the iPad part of the full set

- **What happened:** the ipad-webkit match `/u0aUpdateRepro/` in playwright.config.ts also matched `e2e/u0aUpdateRepro.helper.ts`; Playwright refused to load (a test file may not import a test file), so every pencil-webkit shard failed before running. Fixed 24 Nov (c4ec28a5): `/u0aUpdateRepro[.]spec/`.
- **Why:** a project's testMatch used a bare name; no check lists the full set (`--list`) on each merge.
- **Proposal:** the fast-set job also runs `npx playwright test --list` for every project (seconds), so a load error is red on the merge that causes it; helper files in e2e/ end in `.helper.ts` and testMatch patterns always end in `[.]spec`.

### 3. A rule was put into the owner's mouth (#64)

- **What happened:** the owner reported a dead strip about one finger wide above a box's bottom border (no ink, no caret). The fix write-up turned this into "a tap in the empty part puts the caret in", and the owner's test list repeated it as the owner's rule. An older test (C30) said the empty part picks the box. The owner had chosen neither; on 25 Nov the owner set the real rule (the border picks the box within 3 to 4 mm; the inside takes ink and the caret).
- **Why:** a bug report was rewritten as a behaviour rule without the owner's words; no check against existing tests for the same spot.
- **Proposal:** a bug fix states only "the fault is gone"; any new behaviour rule needs the owner's own sentence, quoted in the test's comment; before a fix is planned, grep the tests for the same area and list conflicting ones as questions.

### 4. A test stayed "owner decision pending" for days

- **What happened:** e2e/iosSelect.spec.ts HOLD-MOVE carried "owner decision pending" in its title and failed on chromium; the owner decided on 25 Nov in minutes (hold = 3 mm for 0.8 s; a loop over text = circle select; else ink).
- **Proposal:** a test with a pending decision is not allowed in the full set; it becomes a question in the next owner message the same day.

### 5. A local proof run was cut and saved nothing

- **What happened:** the 24 Nov iPad triage ran 17 whole spec files x3 with a JSON reporter; it hit its 90-minute limit and the JSON (written only at the end) was lost. The rerun of only the 22 failing tests with a line reporter took 16 minutes.
- **Proposal:** triage runs only the failing tests (file:line) and always with a reporter that writes as it goes.

### 6. Tests pass locally but fail on the CI machines

- **What happened:** about 20 ipad-webkit tests failed in both CI full runs of 24 Nov and pass 3 of 3 on the PC (bar position after a turn, ink moving with a box, a 250 ms paint budget). Root causes: open (being worked on).
- **Proposal (to confirm with the root causes):** to be filled in when the fix round ends.

## Numbers of the phase

To be filled in at the phase end from docs/metrics/phase-results.md (days to the owner's first look, days to live, tasks merged, test runs green / all, owner findings).
