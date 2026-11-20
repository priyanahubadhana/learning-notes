# The method: how one part goes from idea to live (owner and Fable, 20 Nov 2026)

One page. It joins what already worked for us (pictures first, phases, small parts, measured pace) with the spec-first way of the owner's article (story, rules, scenarios that run, three lenses). It applies from the Phase 2 finish as a measured trial; at the end of that phase the numbers in section 8 decide what stays. It does not change in the middle of a phase.

**The core, in the article's words:** "Write down how the system should behave in a precise, testable way, then build only what satisfies that behavior." A feature's spec is the single source of truth for what that feature does. docs/design/owner-decisions.md is the diary of how we got there: when the two differ, the spec is corrected first, and the spec wins.

## 1. A phase (unchanged)

Picture the owner approved → plan → build only what the plan lists → the owner's early look on the iPad → fix and polish → release on the owner's yes. One phase at a time.

## 2. One small part

1. **Understand, through three lenses.** Why: the owner (the story and the rules, in the owner's words). How: a builder (can it be built, sharp edges, size). Whether: a tester (can it be checked, what is missing, what if it goes wrong). The builder and tester write their own lists before they see the draft.
2. **Specify.** One spec per feature in docs/features/: the user story; the rules (always true, can never happen, limits); 3 to 5 scenarios in Given / When / Then with the owner's real values, one of them going wrong; "we assume (not proven yet)" with a check for each; "done when"; then detail lines with ids for the builders; "not in this part"; open points marked `OPEN:`. Every rule has a short name; every scenario has a number (S1, S2 …), the first one being the plain, happy case. Test 1 belongs to scenario 1: the tests are not invented, they check what was agreed, and the owner reports by number ("Text S3 fails").
3. **Sign off.** The owner reads the short top part (and a picture when anything new is visible) and answers yes or "missing X". No yes, no code.
4. **Code.** Tests first and seen failing. The scenarios themselves run as tests; the logic inside gets unit tests. New work sits behind a switch: off = today.
5. **Verify.** The checks, the tests on computer and iPad size, one review by Opus (code against the spec, look against the picture), then the owner's 5-minute iPad check, answered by scenario.
6. **Refine.** A finding changes the scenario first, then the test, then the code. An iPad finding becomes a replay test. The part's numbers are written down.

## 3. The right weight

| Kind of work                                          | What it gets                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| New or risky behaviour (selection, bars, data, paste) | all of section 2                                                                          |
| A small fix (about an hour)                           | one scenario or detail line and its failing test first; Opus covers the lenses            |
| Look only (spacing, colour, matching a picture)       | the approved picture and a side-by-side check; no scenario                                |
| A feature that is built and not being changed         | nothing now; it gets its story and scenarios when its phase comes up for the owner's test |
| Test health and tools                                 | a "done when" list                                                                        |

## 4. Scenario rules

Few (what the owner would care about). What happens, not where to tap; a gesture is named only when it is the feature. Plain words: if the owner cannot read it, rewrite it. Said as to a teammate. Real values. Written before the code (a record of what already exists says so). Short on top, details below.

## 5. Test rules

One scenario = one acceptance test through the real screen. Unit tests for the logic inside, never instead of it. Red first, then green, then break it once to see it fail. No waiting by time (time itself is tested with the test tool's own clock); 20 of 20 repeats before a merge; a shaky test is a fault to find. Every new test file is added to the iPad-size list. What no computer can prove is marked `@ipad` and decided by the owner's check. Never weaken, skip or delete a test.

## 6. Who does what

Sonnet builds, one planned part each. Opus (the main chat, medium effort) writes each part's spec with the lenses, hands out parts, reviews once and takes over after three Sonnet fails. Fable plans a phase with the owner and solves what Opus failed five times. All three work at medium effort. Two lanes at most on this PC (one iPad-size test run at a time). The helpers' working rules: [HOW-WE-BUILD.md](HOW-WE-BUILD.md).

## 7. What the owner does

Says why and what must never happen. Gives real examples ("saw → expected", exact words). Signs off each small spec within the day. Does the 5-minute iPad check after each selection part. Reports by scenario. Marks each wish must, nice or later. New ideas go to the ideas list, not into a running part.

## 8. What we measure (decided at the end of the phase)

Per part, in docs/metrics/tasks.csv: hours from start to merged, review rounds, minutes spent on the spec, faults the owner found after the merge, and how many of those a scenario should have caught. Per phase: shaky tests open, and the owner's own word on whether the scenarios and the report helped. Before this method: about 1.6 review rounds per part, a small fix 1 hour, a text box part 3 hours. Whatever did not pay for itself in these numbers is cut at the end of the phase (owner agreed, 20 Nov).
