# Why the build is not delivering (diagnosis, 14 Nov 2026)

Written by Fable at the owner's request. The build is **paused** (owner, 14 Nov, 11:10 IST): every helper is stopped and the hourly check is off. Nothing here is applied. It is a diagnosis and a proposal to plan from.

Numbers come from git and the GitHub test runs, measured 14 Nov 11:10 IST. "Old system" = 13 Nov 00:30 to 19:40 IST (19.2 hours). "Trial" = the Opus + Sonnet system I designed, 13 Nov 19:40 to 14 Nov 11:10 IST (15.5 hours).

## 1. The short answer

The helpers are building fast. Almost nothing they build reaches you.

- Until 12 Nov, 50 to 90 app changes a day went into the **live app**, in small phases, and you tested each one.
- On 13 and 14 Nov, **zero** app changes reached the live app. All the work sits on a side branch (`build/next`): 445 commits and about 87,000 new lines, behind 26 switches that are all off.
- Nine more finished parts are waiting in a queue to get onto that branch.

So the quota is being spent on work that piles up in front of one narrow door.

## 2. Score for the trial (my plan)

**3 out of 10. It did not do what it was for.** The goal was a demo you can use and steady delivery. You got a preview on time, found 9 problems in the first 2 of 12 test parts, and 5 hours later the fixes are still not all in.

| Measure                                | Old system          | Trial                                   | Verdict              |
| -------------------------------------- | ------------------- | --------------------------------------- | -------------------- |
| Parts merged per hour                  | 0.99 (19 in 19.2 h) | 0.84 (13 in 15.5 h)                     | no better            |
| Of those, real new parts               | not counted         | 3 (toolbar step, frame, storage safety) | poor                 |
| Test runs green                        | 4 of 25 (16%)       | 7 of 14 (50%)                           | better               |
| Commits produced                       | 237                 | 341                                     | more work, same exit |
| Finished parts stuck waiting           | about 5             | 9                                       | worse                |
| Build managers used up                 | 7                   | 6                                       | no better            |
| App changes reaching the live app      | 0                   | 0                                       | failed               |
| Milestone 1 (preview by 21:00)         | n/a                 | hit (19:55)                             | good                 |
| Milestone 2 (toolbar + frame by 23:30) | n/a                 | about 1.5 h late (00:55)                | late                 |
| Milestone 3 (storage safety by 02:00)  | n/a                 | 3 h late (05:01)                        | late                 |
| Times you had to step in               | many                | at least 5                              | failed               |

What the trial got right: fewer red test runs, builders checking before they push, an honest hourly check. What it got wrong: it made building faster, and building was never the slow part.

## 3. The causes, with evidence

**Cause 1: one big hidden branch instead of phases.** This is the main one. The redesign was cut into about 20 parts that all build at once and all stay switched off until "everything" is ready. Nothing is finished from your side until all of it is. Before 13 Nov each phase ended in the live app and in your hands.

**Cause 2: the door is narrower than the workshop.** Parts go into `build/next` one at a time. Each merge needs a test run of 33 to 43 minutes (measured), and half of those runs fail. So one part takes 1 to 2.5 hours to get in. Builders finish parts faster than that. Nine finished, reviewed parts are waiting; at this pace that queue alone is 12 hours or more. Adding builders (I raised the cap to 8, then 5) made the queue longer, not the delivery faster.

**Cause 3: the test suite is too big and too shaky to guard every merge.** There are 344 end-to-end test files. Most red runs were test timing on the slow test computer, not app faults. Of the 12 merges in the trial, 4 were pure test repairs. Three iPad tests fail on this PC no matter what.

**Cause 4: the reviews check the wrong thing, many times.** Page menus had its 25th design visit; Study tabs its 15th. Each round re-shoots up to 192 pictures. All this polish was spent on parts that are switched off. Then you tested for ten minutes on a real iPad and found sign-in loops, broken scrolling, a broken turn and freezes. None of the review rounds had caught them. A real test by you, early, is worth more than many picture reviews.

**Cause 5: the management layer eats itself.** 13 build managers in 35 hours. Each fills its memory in 1 to 2 hours, hands over and loses the thread; some went idle. Builders then reported to this chat and I passed messages along. Safety checks blocked helpers three times (a push, a test edit, the backup copy), and each block waited for you.

**Cause 6: the rules kept moving.** 31 changes to rule, agent and guard files since 13 Nov 00:30, most at your request and all applied by me. Each one was reasonable alone. Together they meant the build never ran one settled way for a full day, and each new guard added a new way to get blocked.

**Cause 7: my own part.** I gave "2 to 4 hours" style estimates again and again without evidence. I answered every slowdown by adding process (more builders, more rules, more checks) when I should have stopped and measured. The trial I designed kept the narrow door and the big hidden branch, so it could not fix the real problem.

## 4. What worked before, and why

6 to 12 Nov: one phase at a time, planned with you, built by a small team, released to the live app, tested by you, then the next. Work in progress was small, so little could pile up, and your test was the real gate. That is also what delivery research recommends (small batches, few things in progress, merge to the main line often; see the "Accelerate"/DORA findings and docs/plans/ai-build-best-practices-2026-11-13.md, which puts the useful limit at 3 to 5 builders). I did not re-check those sources online today.

## 5. Proposal: back to phases

Nothing below is decided. It is the starting point for planning with the owner.

**Rules of the phased build**

1. One phase at a time. A phase is done only when the owner has tested it on the iPad and it is switched ON in the live app.
2. At most 3 builders, and only inside the current phase. No building ahead.
3. No separate build-manager helper. This chat manages the phase directly (Opus), so nothing is relayed and nothing goes idle unseen.
4. Reviews: Opus reviews each part once. Fable checks the phase plan before and looks once at the end. The owner's iPad test is the main gate.
5. Tests: a fast "must pass" set guards each merge (unit tests plus the key flows, about 10 minutes). The full suite runs every night and must be green before a phase goes live. No test is deleted or loosened; shaky ones get a ticket and a fix. (This changes how "tests stop the line" is applied, so it needs the owner's OK.)
6. Rules stay frozen for a whole phase.

**Phase 0: clear the door (about half a day)**

- Finish the owner's fix batch: merge the scrolling fix (already reviewed), confirm F1 to F9 on the preview.
- Set up the fast test set and the nightly full run.
- Decide what happens to the 9 waiting parts (see the questions).
- No new features.

**Phases 1 to 6 (one at a time; order to be agreed)**

| Phase | What you get, switched ON in the live app                  | Already built?                                 |
| ----- | ---------------------------------------------------------- | ---------------------------------------------- |
| 1     | New app frame, Notebooks, Search, Settings, storage safety | yes, in the preview; needs your test and fixes |
| 2     | Home and Library                                           | yes, in the preview                            |
| 3     | Toolbar and page menus                                     | mostly; 2 parts waiting                        |
| 4     | Review and Study                                           | mostly; 2 parts waiting                        |
| 5     | Reader                                                     | waiting, not yet in the preview                |
| 6     | AI parts and the online Claude connector                   | partly; needs Supabase steps                   |

Rough size: phases 1 and 2 are mostly testing and fixing what exists, about a day each including your tests. Later phases 1 to 2 days each. These are estimates, not promises; after phase 1 we will have a measured pace.

## 6. State at the pause

- Live app: unchanged since 12 Nov; safe.
- Preview (`build/next` 87969361): has everything merged so far plus owner fixes F1, F5, F7, F9; a test run was in progress at the pause.
- Not merged, all saved on GitHub: scrolling fix (F2, F3, F4, F6, F8; both reviews passed at 5e2c80f7), toolbar 1e/1f, page menus rest, Study tabs, Review rest, Reader, AI framework 6, AI cost additions, shared parts step 3.
- The scrolling builder was stopped mid-task; any unsaved edits are still in `C:\Users\pc\Downloads\ln-sfix-scroll`.
- Stopped: all helpers, the hourly check. Still on: the small daily cloud check at 13:00 IST (reads only, cheap).

## 7. Full audit: every file and setting that steers the build (14 Nov, second pass)

The owner asked for everything with a direct or indirect effect to be checked. Read in full: both CLAUDE.md files, all 10 rule files, the 4 build helper files, docs/ECONOMY-MODE.md, docs/BUILD-STATE.md, the master plan, the project and user settings, the 6 hooks, the push guard, the 20 memory notes, the test setup (`ci.yml`, `playwright.config.ts`, `package.json`), HANDOFF and the layout of PENDING. Nothing was changed.

### A. The plan and its order

| #   | Finding                                                                                                                                                                                                                                                                                                                          | Effect                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | The master plan of 12 Nov says: at most 3 builders, page parts strictly one after another, screens two at a time, about 11 nights or more, release area by area after each iPad test. On 13 Nov "first full build fast" and "maximum parallel" overrode it, and the plan was never rewritten. The builder limit went 3, 6, 8, 5. | Work planned for nights 7 to 11 started on day 2. The queue and the clashes come from here.                                                          |
| A2  | The order drifted. The owner's stated top priority is the text box, typing and Pencil (memory note, PENDING "Priority 1"). Text box v2 (planned for nights 4 to 6) has not been started. Study tabs and AI framework 6 (planned for night 11 onwards) are built.                                                                 | Quota went to low-priority parts while the top one waits.                                                                                            |
| A3  | On 12 Nov mock-ups were dropped for the remaining areas: parts are built from written lines.                                                                                                                                                                                                                                     | There is no approved picture to pass against, so design reviews repeat (25 and 15 visits), and the owner first sees a part when it is already built. |
| A4  | The owner's answer of 12 Nov: the live app updates every night when tests pass, new parts switched off. That happened once.                                                                                                                                                                                                      | Nothing has reached the live app since.                                                                                                              |

### B. Rules that contradict each other

| #   | Finding                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | rules/sessions.md, planning.md and phase-end.md still describe the phase way (plan together, mock-up first, build, the owner's check at the end, look back). CLAUDE.md says "the build runs by itself". Both are in force on paper.              |
| B2  | rules/testing.md: the full test set must be green before any merge. ECONOMY-MODE: up to 3 merges per test run.                                                                                                                                   |
| B3  | Who manages? Global CLAUDE.md, project CLAUDE.md (two hierarchies), the memory note "Fable manages every task" and ECONOMY-MODE ("main chat: Fable, thin") each say something different. In practice this chat was Sonnet, then Opus, now Fable. |
| B4  | Four memory notes are out of date: the old economy mode, "parallel waves", "Fable for every task", and the text-box priority that nobody is following.                                                                                           |
| B5  | CLAUDE.md says CHANGELOG and DECISIONS hold the current phase only. They are 1,805 and 1,194 lines. A rule check is due when CLAUDE.md passes 5 KB; it is 9.2 KB.                                                                                |
| B6  | HANDOFF.md still lists queues from 8 to 10 Nov and "bugs only until 13 Nov". PENDING.md is 530 lines in about 30 sections, with owner tests from 9 to 12 Nov that were never done.                                                               |
| B7  | The backup copy: a hook already does it by itself when a helper stops. CLAUDE.md, sessions.md and the manager file also tell every helper to run it by hand, and the safety system blocked those hand runs again and again.                      |
| B8  | "Fable looks twice and no more" (CLAUDE.md) against helper files that send every fix round back for another look.                                                                                                                                |

### C. The quality bar as written

| #   | Finding                                                                                                                                                                                                                                                                                                                      | Effect                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| C1  | The Definition of Done applies to every part, "no exceptions": 2 levels × 3 themes × 4 screen sizes = 24 pictures per screen, a test for every spec line on two browsers, a 17-point list and two reviews. Sepia was added mid-build on 13 Nov. All of this for parts that are switched off and that the owner has not seen. | Rounds of up to 192 pictures. The end-to-end tests grew from 269 to 341 files in two days. |
| C2  | Three gates come "before the owner sees it". The owner's test on the real iPad is last.                                                                                                                                                                                                                                      | Real problems are found last, after the costly polish.                                     |
| C3  | Nothing in the bar checks "ten minutes of real use on an iPad in Safari": staying signed in, turning the device, scroll feel, freezes.                                                                                                                                                                                       | These are exactly the 9 things the owner found.                                            |

### D. Tests and the test computer

| #   | Finding                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | One run is the full Chrome set in 4 parts plus an iPad list in 2 parts, on 2-core machines: 33 to 43 minutes. Every merge needs one.                                                                                                                                     |
| D2  | Docs formatting is part of the same check as the app. A badly formatted docs line turned the app's run red at least twice.                                                                                                                                               |
| D3  | The bookkeeping files (BUILD-STATE, CHANGELOG, DECISIONS, PENDING, the hourly numbers) are written on `main` while the code is on `build/next`. The two clashed at least 4 times; each time no test run started and the build sat idle (65 minutes, then about 2 hours). |
| D4  | On this PC every working copy uses the same port for its test server unless told otherwise. The push guard picks a free one; a builder's own run does not. Two builders testing at once: the second cannot start. Each run also rebuilds the app first.                  |
| D5  | Three iPad tests fail on this PC every time (textBoxFree:461, toolsRefresh:60, undoHistory:210). Nobody has found out why.                                                                                                                                               |

### E. Guards and settings

| #   | Finding                                                                                                                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Six hooks, the push guard and the app's own safety check. The intent is right. In two days they blocked wanted actions at least 6 times (an approved merge push, the approved test change, the backup copy, a guard fix), and each block waited for the owner.                                                                                                  |
| E2  | The user settings pin Opus to **low** thinking effort (`effortLevel: low`). Build managers, reviewers and the stronger builders all ran on Opus; the master plan asks for medium. Whether this setting reaches helpers could not be confirmed from here (unverified), but a manager that skips steps or goes idle fits it. Worth testing before the next build. |
| E3  | Plugins: the voice plugin fails to connect in every session (noise only). The effort guide is only a side pane. Neither steers the build.                                                                                                                                                                                                                       |

### F. Housekeeping

- 64 working copies and 53 branches on this PC. A copy with its packages is about 900 MB, so this may be tens of GB (not measured).
- docs/plans holds 42 files, docs/features 85 specs. docs/INDEX.md is the only map.

### G. What I would change (for planning; nothing is applied)

1. **One short page "How we build"** in place of ECONOMY-MODE and the manager file. The phase rules in rules/planning.md, sessions.md and phase-end.md become the single truth again. CLAUDE.md goes back under 5 KB.
2. **Rewrite the master plan as phases**, with the text box, typing and Pencil where the owner's priority puts them.
3. **Two bars instead of one.** A "first look" bar for the owner's first iPad test of a phase (works, both levels, light and dark, iPad both ways and phone, key flows tested). The full bar (sepia, PC, every picture, accessibility, size) before a phase is switched ON in the live app. The release bar is not lowered.
4. **The owner's iPad test moves forward**: after the first-look bar, before the polish.
5. **Tests:** a fast set per merge, the full set nightly and before each release; docs checked apart from the app; find the cause of the 3 iPad tests that always fail.
6. **Bookkeeping lives on the same branch as the code**, in one state file, so the two can no longer clash.
7. **Guards:** keep the secret scan, the test guard and the push guard. Drop the hand-run backup rule (the hook does it). Give the managing chat the pushes it needs so nothing waits on a block.
8. **Opus effort** set to medium or high for building and reviewing (the owner's setting; the owner changes it or approves the change).
9. **Tidy up:** retire the 4 stale memory notes; cut PENDING to "Needs you", "Your tests by phase" and "Later"; trim HANDOFF; remove unused working copies one by one (never a recursive delete).
