# Questions for the owner (15 Nov 2026, evening)

Written after the day's decisions, to start the next phases without stopping. Each question says what it is, why it matters, the choices and Claude's pick. Answer with the number and a letter (for example "1A, 2A, 3B"). "Pick" is what happens if you say "your picks".

The plan these answer: [phase-plan.md](../../plans/phase-plan.md) section 0 ("What's next").

---

## 1. Does Phase 1 go live with the new Settings, or without it?

**What:** Phase 1 (the new frame, the update screens, the storage safety notice) is built and fixed. The new Settings that is in the preview today is the v3 build. This morning you said Settings must match its approved picture before Phase 1 goes live. Since then you approved a newer picture, Settings v5, which is a full rebuild (likely 3 to 5 days).

**Why it matters:** if Phase 1 waits for Settings v5, the frame reaches your real app about a week later, and the tool bar and text box work keeps piling up on the test line (more merge work, more risk).

- **A. Phase 1 goes live now without the new Settings.** Your real app gets the new frame; Settings stays the old screen you use today (it works, and it already has "Test a phase"). Settings v5 goes live later as its own step. The v3 build never goes live. _Pro:_ fast, and nothing below the approved picture reaches you. _Con:_ for a while the new frame shows the old Settings screen.
- **B. Phase 1 goes live with Settings v3 as it is now.** _Pro:_ search on every Settings page reaches you now. _Con:_ the audit found many differences from the approved picture; it would be replaced again within days.
- **C. Wait: Phase 1 goes live only with Settings v5.** _Pro:_ one change for you. _Con:_ about a week later, and more merge risk.

**Pick: A.**

## 2. The tool bar has a Beginner and a Professional look. Settings v5 has no Beginner/Professional switch. What decides the tool bar's look?

**What:** the approved tool bar (v9) differs between Beginner and Professional: icons only or icons with names, 3 or 4 Format tabs, "Back to pen" on the bar, the eraser's three ▾ menus, the bigger Lasso. The approved Settings v5 removes the Beginner/Professional switch: "My experience" is only a label and starter setups (Simple, Pencil first, Typing and study, Everything on) only set starting values.

**Why it matters:** the tool bar builder needs to know what to read. Without an answer, one of the two approved pictures cannot be followed.

- **A. Each difference becomes its own setting** in Writing › Tool bar (for example "Show tool names", "Format tabs: 3 or 4"). The Simple starter sets the Beginner values, Everything on sets the Professional ones. _Pro:_ matches Settings v5 ("nothing is hidden, a starter only sets values"); you can mix. _Con:_ a few more rows in Settings (they sit under Advanced).
- **B. Keep one hidden "Professional tool bar" switch** that the starter flips. _Pro:_ fewer rows. _Con:_ goes against the v5 rule "no switch that hides things"; you cannot mix.

**Pick: A.**

## 3. How polished must Phase 1 be before you use it in your real app?

**What:** our rule says a phase is switched ON in the live app only at the full release bar: every screen pictured in light, dark and sepia, on iPad, phone and PC, compared with the approved picture, plus accessibility checks. Phase 1 now meets the first-look bar (it works, light and dark, iPad and phone). The code goes into the live app with every new part OFF (task 0.7); only you switch it on, on your own devices, with "Test a phase".

**Why it matters:** the full bar adds about one day before you can use it. You said you want a working app for your own use first.

- **A. You may switch Phase 1 on for yourself after your re-test; the full release bar is done while the tool bar is being built, before it is ever ON for anyone else.** _Pro:_ you use it a day sooner; nothing changes for other people. _Con:_ you may see small look faults (sepia, PC) for a day or two.
- **B. Full release bar first, as the rule says today.** _Pro:_ nothing below the bar ever reaches the live app. _Con:_ about a day later.

**Pick: A.** (This is a rule change, so it needs your yes; it would be written into rules/phase-end.md after this phase, not in the middle of it.)

## 4. One or two builders, or the full team, for the tool bar and Settings rebuilds?

**What:** the tool bar rebuild (about 12 tasks) and the Settings v5 rebuild (about 11 tasks) are both large. Lean mode runs one or two builders. The full team runs one builder per separate task (you allowed it only for the text box). Measured last night: with up to four builders about 17 tasks merged in a day; the limit is that only one iPad test run can go at a time on this PC.

**Why it matters:** speed and how much of your weekly Claude limit is used.

- **A. Full team (up to 3 builders) for the tool bar, then for Settings.** _Pro:_ likely 3 to 4 days for the tool bar instead of about 6. _Con:_ uses the weekly limit faster; more to review.
- **B. Lean (one or two builders).** _Pro:_ calmer, cheaper. _Con:_ about twice as long.

**Pick: A.**

## 5. Try the new text box now for 10 minutes, or wait until it is finished?

**What:** the new text box and Pencil (Phase 2B) is built up to step 11 of 13, behind its own switch, OFF in your tests so far. Its last two steps (proof nothing is lost; its pictures and test list) are small, and a few bugs wait (T25 slash with Scribble, T26 writing over a selected word, R15 one redo step, R18 phone dots).

**Why it matters:** the text box is your top priority, and the Pencil only shows its real faults on your iPad (the scroll bar passed every automatic test but failed on your iPad).

- **A. A short 10-minute Pencil look now**, while the tool bar is being rebuilt; the full first look comes when 2B is finished. _Pro:_ the costly faults show early. _Con:_ 10 minutes of your time; you will see the old tool bar around it.
- **B. Wait for the finished text box.** _Pro:_ one clean test. _Con:_ faults found later cost more.

**Pick: A.**

## 6. Merging the two "November 2026" Journal pages: may Claude run it on its own?

**What:** you said yes to merging the two "November 2026" month pages into one, backup first. This changes your stored notes, which our rules count as possible data loss.

**Why it matters:** it can run now (it is not tied to any phase), but only with your OK on how.

- **A. Claude runs it alone:** saves a full backup file first, merges, then checks every line of both pages against the backup and tells you the result. You look at the Journal afterwards. _Pro:_ no time from you. _Con:_ you are not watching when it runs.
- **B. Claude runs it while you watch**, in a short session you pick. _Pro:_ you see each step. _Con:_ needs 10 minutes together.

**Pick: A.** (The old page goes to Trash, not deleted, so it can come back.)

## 7. The "wheel" test move: the safety check blocked it again

**What:** you said yes to moving one phone test (it uses a mouse wheel, which the iPad test browser cannot do, so it can never pass there) to a file that runs only on Chrome and desktop Safari. The builder made the move, but the safety check still refused the one-line change to the test setup, so the test stays red and waits on the working copy.

**Why it matters:** a red test stops the line; this one blocks the text box release.

- **A. You approve the change yourself** when Claude shows the permission prompt in chat (one tap, about 1 minute). _Pro:_ done today, the test is unchanged, only where it runs. _Con:_ one prompt for you.
- **B. Leave it red until the text box phase ends.** _Con:_ the red test hides real new faults in the same file.

**Pick: A.**

## 8. Builders stopping their own long test runs

**What:** last night a builder could not stop its own over-long test run (the safety check blocked stopping its test programs), so the shared iPad test runner was held for about an hour.

**Why it matters:** with the full team, one stuck run blocks every builder's iPad tests (only one can run at a time).

- **A. Allow builders to stop their own test programs** (only Playwright test runs they started). _Pro:_ no more hour-long blocks. _Con:_ one more allowed action.
- **B. Keep it blocked;** the manager waits. _Con:_ lost hours when it happens.

**Pick: A.**

---

Decided by Claude, no answer needed (logged in docs/DECISIONS.md, 15 Nov): the page top bar keeps its < > arrows in Phase 1 and loses them in the same step that adds Undo and Redo there (Phase 2A, under the tool bar's switch), so there is never a moment with neither; the tool bar edit-in-place of Settings v5 (S5-22) is built with the tool bar (Phase 2A); "Your layouts" stays hidden in the tool bar as in Settings (not dropped, docs/IDEAS.md).

## Owner's answers (15 Nov, evening)

1A, 3A (rule change: owner may switch Phase 1 on after the re-test; the full release bar before anyone else; written into rules/phase-end.md after this phase), 4A (full team, up to 3 builders, for the 2A and Settings rebuilds), 5A, 6A. Asked to explain: 2, 7, 8.
2A. 7: owner wants the ladder (Opus, then Fable, then the owner); the safety check itself can only be passed by the owner's tap. 8: instead of stopping runs, every manual Playwright run uses `--global-timeout` so it stops by itself (no permission change).
