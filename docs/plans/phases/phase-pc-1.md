# Phase PC-1: the PC product (plan draft, Fable with the owner, 21 Nov 2026, night)

**Now the detail page of phase 1A of [stage-1-plan.md](../stage-1-plan.md) (22 Nov 2026).** Sections 5 and 18 list the 1A parts; later stages of this page are re-planned there.

**Status: confirmed by the owner on 22 Nov 2026 (answers in section 17); this is the live plan and replaces docs/plans/phases/phase-2-finish.md.** Open: the bar's name (Q4). Method: docs/plans/method-v2/ (pictures 1 to 3, approved 21 Nov). Decisions behind it: docs/DECISIONS.md, 21 Nov rounds 1 to 5. Audit behind it: docs/archive/plans/uniformity-and-specs-2026-11-21.md.

## 1. Goal and the two non-negotiables

**Goal.** On the PC, with mouse and keyboard, the owner can make a notebook, write notes, lay them out exactly as they like with boxes, columns, fonts and colours, customise the tool bar and Settings, make a summary and recall cards, and review them, with no bug in that path, and it is switched ON in the live app.

**Non-negotiable 1.** The spec is the only contract: nothing is built that a confirmed spec does not say, and a finding changes the spec before the code.

**Non-negotiable 2.** Nothing is "done" without proof: green tests, the analyze check, the picture side by side, the owner's yes by scenario.

## 2. What I heard (the owner, 21 Nov)

1. PC first with four conditions: device-neutral foundation, Pencil work parked not dropped, an iPad reading check at each release, one usable slice as the whole phase.
2. Customisation of layout and tools before anything else; no AI notes in this phase.
3. One method for everything: spec, confirm sheet, build on shared parts, proof, the owner's test by scenario, bugs as GitHub Issues, one source with a visual face.
4. Reuse is checked by a program, in specs and in code, never by habit.
5. Fable plans; Opus runs; Sonnet builds; raise effort before changing the model; Fable as little as possible.

## 3. What changes against the phase-2-finish plan

| Was                                                               | Now                                                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lane A: Lasso fixes, text selection with Pencil handles, Scribble | A0 to A3 are merged and stay. A4 to A9, the Hold menu tremor rework, A10-1, A10-2, A10-4 are **parked** behind their switches with their branch names (section 9). |
| Lane B: the Action bar B3 to B9, built as new code                | The one bar built **on shared part cards made first** (stages 1 and 2), for mouse and keyboard; the same bar serves touch later.                                   |
| Stage 5: Settings v5, S.1 to S.11                                 | Stays; it is the customisation the owner asked for first. Scope choice in Q5.                                                                                      |
| B10 leftovers, B11 test health                                    | The device-neutral ones stay (stage 4); the Pencil-only ones are parked.                                                                                           |
| E-stage: the owner's full iPad test                               | The owner's full **PC** test, plus a 10-minute iPad reading check.                                                                                                 |
| Phase 1S Settings, 2A, 2B going live together                     | Everything that passes goes live at the end of this phase on the owner's yes (Q8).                                                                                 |

## 4. Measured pace, and how the times below were made

From docs/metrics/tasks.csv: a small fix 1 h, a text box part 3 h, a screen 6 to 10 h; on 19 Nov one builder merged five parts of 1 to 3 h in a day; review rounds 1 to 3 per part. So one lane does about 6 to 8 sized hours a day, two lanes about 13 to 15. The owner's own time is never counted. The first three merged parts of this phase correct the numbers.

## 5. Stage 0: the set-up (about 3 days, estimate; Opus with one Sonnet)

| #   | What it gives                                                                                                                                                                                                     | Who           | Size | Owner                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---- | -------------------- |
| M0  | **The method as a spec** (docs/METHOD-v2.md): goal, the two non-negotiables, rules, scenarios, must-never lines, the weekly card; its confirm sheet                                                               | Fable (short) | 2 h  | confirm sheet        |
| M1  | **Docs archive and one STATE file:** everything not live moves to docs/archive with a one-line index; PENDING, BUILD-STATE and HANDOFF become STATE.md; DECISIONS entries of finished phases archived             | Opus          | 3 h  | no                   |
| M2  | **Spec Kit installed and adapted:** `.specify` with our two-layer spec template, the part card template, the constitution pointing at CLAUDE.md and rules; version pinned; the implement command not used         | Opus          | 3 h  | no                   |
| M3  | **GitHub Issues as the bug source:** labels (part, state, found-by), the bug form (saw, expected, where, screenshot), the open problems and C1A, C0, PP1 items moved in with their old ids in brackets            | Sonnet        | 3 h  | no                   |
| M4  | **The site and the board on GitHub Pages:** a generator that renders specs with pictures and status badges, the confirm sheets read-only, decisions, changelog, state, and the bug board; a GitHub Action on push | Sonnet        | 6 h  | opens it once        |
| M5  | **Analyze v1:** every rule has a scenario, every scenario a test, every detail line a task; "builds on" present; shared-part imports checked; the bar-component ratchet. Sets the status badges                   | Sonnet        | 5 h  | no                   |
| M6  | **Weekly card v1:** the eight numbers computed from git, issues and test runs, plus the owner's line; shown on the site                                                                                           | Sonnet        | 3 h  | no                   |
| M7  | **Short research pass** on current agent practice (Anthropic, Google), one standard web pass, findings folded into M0                                                                                             | Opus          | 1 h  | no                   |
| M8  | **Rules updated with the owner's 21 Nov decisions:** honesty rules, the Opus-high rung, the reuse gate in builder and reviewer, PC-first conditions, the "builds on" rule                                         | Opus          | 2 h  | no                   |
| M9  | **The part cards** (specs only, one screen each, from the audit): Bar shell, Bar place, Hover names, Colour picker, Size picker, Font picker, More menu, Customiser, Hold menu, Drag and dock, Keys and shortcuts | Opus          | 5 h  | reads the names (Q4) |

About 33 sized hours. M1 to M3 first, since every later part depends on them; M6 and M7 may run beside stage 1.

## 6. Stage 1: the shared parts, built (about 3 days, one lane)

One lane on purpose: one design, one set of numbers. The second lane starts Settings v5 (stage 3) at the same time.

| #   | Part card          | What it gives                                                                                                                 | Size | Replaces                                                          |
| --- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| P1  | Bar shell          | The one floating bar: buttons, 44 px targets, states, danger button, roving keyboard focus, show and hide motion              | 4 h  | the button code of Mini, Micro, OneBar, SelectionBarV8, MixedMenu |
| P2  | Bar place          | The five-place order (below, above, right, left, under the tool bar), one clamp, the safe zones, the drag preview             | 4 h  | the five placement files and three clamps                         |
| P3  | Hover names        | Every bar button marked for the one app-wide hover name; the private tip removed                                              | 2 h  | NameTip                                                           |
| P4  | Colour picker      | One picker; one palette source per kind (text, pen, box) in one file                                                          | 3 h  | five pickers, three palette files                                 |
| P5  | Size picker        | The existing picker with one scale; the percent scale mapped onto it                                                          | 2 h  | NOTE_SIZES                                                        |
| P6  | Font picker        | The existing tiles, quick fonts list moved to one place                                                                       | 1 h  | FONT_QUICK in oneBarModel                                         |
| P7  | More menu          | One ⋯ that folds by measured width; the one list of Cut, Copy, Duplicate, Delete with one set of words                        | 3 h  | four overflow codes, six action lists                             |
| P8  | Customiser         | The tool bar's customiser made general: a set for each kind of selection, presets, live preview, reorder, reset               | 6 h  | EditListSheet, EditBarPanel                                       |
| P9  | Drag and dock      | One grip drag and one docking model for every bar                                                                             | 4 h  | oneBarGrip, oneBarDockModel, pillPlace                            |
| P10 | Keys and shortcuts | One helper: every bar action has a shortcut; a shortcut list the Settings page can show (docs/features/keyboard-shortcuts.md) | 3 h  | none today                                                        |
| P11 | Hold menu          | The existing ContextStrip adopted as the one; the two older Hold menus marked for removal                                     | 1 h  | HoldMenu, the old ContextStrip                                    |

About 33 sized hours. Each part has its own scenarios, is built behind the phase switch, and the ratchet count goes down with each merge.

## 7. Stage 2: the one bar (about 3 days, one lane)

Spec: docs/features/selection-bar.md, rewritten onto the template v2 with "builds on" P1 to P11, for mouse and keyboard; the approved pictures 1 to 22 stay the look. Name: Q4.

| #   | What it gives                                                                                      | Size |
| --- | -------------------------------------------------------------------------------------------------- | ---- |
| R1  | The bar's frame on the shell, the cursor and words states, Cut, Copy, Delete joining at the end    | 5 h  |
| R2  | Box state with Edit Text; the box ⋯ tab removed, its menu in the bar's ⋯                           | 3 h  |
| R3  | Drawing state: Colour and Thickness on the bar (Q6)                                                | 6 h  |
| R4  | Picture and mixed states                                                                           | 3 h  |
| R5  | Presets Edit and Study, Auto, Customise bar… through P8; the Settings part inside Settings v5      | 5 h  |
| R6  | The swap-in: behind the switch the one bar replaces the six old pieces; with it off, today exactly | 3 h  |
| R7  | The "nothing lost" test of B1 extended to the six pieces; side by side with the pictures on PC     | 2 h  |

About 27 sized hours. Owner's test **T1** when R7 is merged: the bar on the PC preview by scenario.

## 8. Stage 3: Settings v5 (one lane, beside stages 1 and 2)

As in phase-2-finish stage 5: S.1 to S.11 and B7b, about 62 h, pictures approved 15 Nov, stories S5-01 to S5-34. Scope choice in Q5. Owner's test **T2** after S.11 on the PC, about 20 minutes.

## 9. Stage 4: the PC path, bug-free (about 3 days, two lanes)

| #   | What it gives                                                                                                                                                                                                     | Size |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| F1  | **The slice spec:** the goal line as scenarios S1 to S8 across notebook, page, writing, layout, customisation, summary, cards, review; each a test through the real screen on chromium                            | 4 h  |
| F2  | The leftovers that are device-neutral: R15 Redo one step, R17 Shadow tile, TB23-DIV, TB-24 red on a clean copy, the toast-position branch, the Handwritten font licence, "Keep look" wording                      | 8 h  |
| F3  | Keyboard: every action in the slice reachable by a shortcut; the shortcut sheet; focus never lost after a dialog                                                                                                  | 5 h  |
| F4  | **Install and update** (owner, 21 Nov: Restart does nothing, downloads again): its own spec once the owner's six facts arrive; a visible version line in Settings; a real update tested end to end on PC and iPad | 6 h  |
| F5  | Test health, PC first: the fast set is chromium on each merge; ipad-webkit nightly; the shaky tests of B11 get their cause or are marked `@ipad` with the reason; the Today page anyOf query checked              | 6 h  |
| F6  | The reading path on touch: open, read, review cards, navigate, at iPad size, as tests                                                                                                                             | 3 h  |

About 32 sized hours. The parked Pencil items: A4 to A9 (text-select.md), slice/b11-hold-pen 3aff0fdd and HOLD-MOVE, A10-1, A10-2, A10-4, A10-5, B8 phone presets, C1A-1 to C1A-3, checks C1b and the hold checks. Each keeps its switch, branch and spec; they return in the Pencil phase.

## 10. Stage 5: the end (about 3 days plus the owner's test)

E1 nothing lost against the inventory; E2 the owner's full PC test list as numbered scenarios with pictures; E3 side by side with every approved picture on PC, light, dark, sepia, plus iPad both ways for the reading path; E4 security review (paste first); E5 the owner's full PC test, about an hour, and its fixes; E6 the release bar; E7 go live on the owner's yes, backup of the owner's notes first, parts switched on over two or three days; E8 old bar files removed on the owner's word after a week live; E9 the working-copy list for the owner's approval. About 30 sized hours.

## 11. Time, and the faster ways

| Stage          | Sized hours | Days (two lanes where possible)    |
| -------------- | ----------- | ---------------------------------- |
| 0 set-up       | 33          | 3                                  |
| 1 shared parts | 33          | 3 (one lane)                       |
| 2 the one bar  | 27          | 3 (one lane)                       |
| 3 Settings v5  | 62          | 5 (the other lane, beside 1 and 2) |
| 4 the PC path  | 32          | 2.5                                |
| 5 the end      | 30          | 3 plus the owner's hour            |
| **Total**      | about 217   | **about 17 to 20 days, estimate**  |

Faster ways that lose no function, only move it later (the owner chooses):

- **Settings v5 core first** (Q5 B): S.1 to S.5, S.8 and B7b now, about 34 h; S.6 welcome, S.7 device tags, S.9 big live preview, S.10 AI section and tours in the next phase. Saves about 2 days on the long lane. Case against: the phase goes live with a Settings page missing its welcome and its big preview.
- **Drawing state later** (Q6 B): R3 moves to the Pencil phase, since drawing with a mouse is rare. Saves about a day on the bar lane. Case against: a drawing selected with the mouse shows the old bar until then; the "one bar" promise is not complete.
- **Set-up beside the build** (Q2 B): only M1, M2, M3, M8 before the first part; M4 to M7 beside stage 1. Saves about a day and a half at the start. Case against: the first parts are built before the analyze program and the site exist, so their proof is by hand once.

## 12. The main questionnaire (answer in chat, by number; A is my pick)

**Q1. The phase and its goal line.** A: "Phase PC-1: the PC product", goal as in section 1. B: a narrower goal without summary, cards and review, only writing and layout. Other.
Case against A: a wider slice means a longer phase before anything is live.

**Q2. The set-up.** A: all of M0 to M9 before the first build, about 3 days. B: M1, M2, M3, M8 first, the rest beside stage 1. Other.
Case against A: three days with nothing of the product built.

**Q3. Shared parts first, then the bar.** A: stage 1 then stage 2, one lane. B: build the bar directly and carve the parts out of it after. Other.
Case against A: about a day slower before the bar is visible. Case against B: it is how the six copies happened.

**Q4. Names.** The one bar: A "Action bar" (switch `bar.action`, code ActionBar). B "Selection bar" as the spec says today. Other. The parts as in section 6: Bar shell, Bar place, Hover names, Colour picker, Size picker, Font picker, More menu, Customiser, Hold menu, Drag and dock, Keys and shortcuts. Yes, or rename which?
Case against A: "Selection bar" says what triggers it; "Action bar" says what it does; both are fine, and the one you choose is used everywhere, including Settings.

**Q5. Settings v5 scope in this phase.** A: all of S.1 to S.11 and B7b. B: the core now, the rest next phase (section 11). Other.
My pick here is **B**, against my own rule of thumb, because the goal line is reached two days sooner and nothing is dropped. Case against B: stated in section 11.

**Q6. The drawing state of the bar on PC.** A: build R3 now, 6 h. B: later, with the Pencil phase. Other.
Case against A: mouse drawing is rare; a day spent on a rare path.

**Q7. Test runs.** A: chromium on each merge, ipad-webkit nightly and before a release. B: both on each merge as today. Other.
Case against A: a touch regression is seen a day later, never at merge.

**Q8. Going live.** A: everything that passes goes live at the end of this phase on your yes. B: preview only; live after the Pencil phase. Other.
Case against A: the live app changes while the Pencil parts are still parked; with the switches off they are invisible, but the code ships.

**Q9. Old bar code.** A: removed a week after go-live on your word. B: kept behind the switch. Other.
Case against A: no way back except git. Case against B: six dead copies stay for every builder to trip on.

**Q10. Install and update.** A: its own part in this phase (F4) once your six facts arrive. B: next phase. Other.
Case against A: without your facts the part cannot start; it waits in the plan.

**Q11. Weekly card day.** A: Sunday evening. B: Friday evening. Other.

**Q12. The Pencil phase.** A: planned right after this phase goes live, as the next phase. B: after a phone phase. Other.
Case against A: the owner said tablet as an option, then phone; A keeps the Pencil work warm while the code is fresh.

## 13. The owner's checkpoints

Confirm sheets: M0 the method; the one bar spec (template v2) before R1; the slice spec F1 before stage 4; the Settings v5 scenarios per part are taken from the approved stories without a new sheet. Tests: T1 the bar, T2 Settings, T3 the full PC slice (E5), each when complete, on the PC preview, by scenario; one iPad reading check at E7. Bugs through the form or in chat.

## 14. Assumptions to check

- Spec Kit's current version works with our Claude Code set-up and lets us replace its templates. If not: our templates alone, same flow.
- GitHub Pages serves the site from the public repo with no secret. If the owner later wants the repo private, GitHub Pages still works on a paid plan or the site moves to the preview host with one token.
- The update bug is in the app's update code, not in the host's caching. The facts decide; F4 tests both.
- The owner tests within a day of each build report; otherwise the estimate slips a day per day.
- The old Lasso fixes stay green on chromium with the Pencil parts parked.

## 15. Done when

Every scenario of the method spec, the part cards, the one bar, Settings v5 (chosen scope), the slice spec and F4 has a green test on chromium; analyze is clean; the ratchet is at its lowest; the site and board are live and current; the owner has said yes by scenario at T1, T2 and T3; the iPad reading check passed; E6 passed; the owner said yes at E7 and the parts are ON in the live app; the first weekly cards exist; one line in docs/metrics/phase-results.md and in the owner's playbook results.

## 16. Brief for Opus (stage 0, after the owner's answers)

- **Goal:** M1 to M9 of section 5 proved as docs/METHOD-v2.md "How we get there" says; one Sonnet builder; small commits pushed after each part; STATE.md current.
- **Where:** main for docs and tooling; build/next for app code. Working copy for the builder: reuse an existing ln-* folder (never delete one).
- **Spec pointers:** docs/METHOD-v2.md (the contract for the method itself), docs/features/_TEMPLATE.md and docs/features/parts/_TEMPLATE-part.md (the shapes), docs/archive/plans/uniformity-and-specs-2026-11-21.md section 1 (the part cards come from this table), docs/features/shared-parts.md SP-09 (the one bar that was specified and never used).
- **Order:** M1, M2, M3, M8 first (everything later depends on them); then M4, M5, M9; M6 and M7 beside stage 1.
- **Done when:** each row of the M table has its proof linked in the changelog; the site opens on the owner's iPad; analyze fails a planted bad spec once on purpose and the run is linked.
- **Do not touch:** app behaviour (stage 0 is docs and tooling only); the parked Pencil branches; any test.
- **Report:** the status line morning and evening; a build report when stage 0 is complete; questions to the owner only through options, batched.
- **Fable's reads:** send the eleven part cards and the rewritten selection-bar spec to a Fable session for the attack read before the owner's confirm sheet; not before.

## 17. The owner's answers (22 Nov 2026, 00:10, on the site's questionnaire)

| Q   | Answer                                                                                                                        | What it changes                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Other: A, and the install-and-update bug first, as the most troublesome thing                                                 | New part **U0** at the front (section 18). Goal line unchanged.                                                                                                                                                  |
| 2   | A                                                                                                                             | Set-up first, about 3 days; U0 runs beside it in lane 2 from day 1.                                                                                                                                              |
| 3   | A                                                                                                                             | Shared parts, then the one bar.                                                                                                                                                                                  |
| 4   | Other: "one bar on screen with presets to choose by task, also an option to auto by rules, and one fixed tool bar at the top" | That is the behaviour already in the spec (presets Edit and Study, Auto by rules, the top tool bar fixed). The **name** is still open; default "Action bar" until the owner says otherwise.                      |
| 5   | A                                                                                                                             | Settings v5 in full, S.1 to S.11 and B7b, about 5 days on lane 2.                                                                                                                                                |
| 6   | A                                                                                                                             | Drawing state of the bar built now (R3).                                                                                                                                                                         |
| 7   | A                                                                                                                             | Chromium on each merge; iPad size nightly and before a release.                                                                                                                                                  |
| 8   | A                                                                                                                             | Everything that passes goes live at the end of this phase on the owner's yes.                                                                                                                                    |
| 9   | **B** (override)                                                                                                              | Old bar code stays behind the switch. Fable's reason against, logged: six dead copies stay for builders to trip on; the private-copy ratchet still counts them, so it can only fall when they are removed later. |
| 10  | Other: "no, first"                                                                                                            | Same as Q1: the update bug is first.                                                                                                                                                                             |
| 11  | Other: Saturday evening                                                                                                       | Weekly card on Saturday evening.                                                                                                                                                                                 |
| 12  | A                                                                                                                             | The Pencil phase right after this one goes live.                                                                                                                                                                 |

## 18. Part U0: install and update, first (added 22 Nov on the owner's answer)

Owner's words (21 Nov): download and update is laggy; sometimes Restart does nothing; sometimes it downloads again. Spec: docs/features/update-v2.md gets the template v2 header, a "builds on" line and new scenarios from the owner's six facts; docs/LIMITATIONS.md says the update flow was only ever unit-tested.

| #   | What it gives                                                                                                                                                                                                                                                          | Who                  | Size     | Needs                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------- | ---------------------- |
| U0a | Reproduce by test: a real update end to end on the PC preview and at iPad size (two builds, the pill, Restart, the version after); the host's caching of version.json and the service worker checked; a trace of each state change; a visible version line in Settings | Opus with one Sonnet | 4 h      | nothing from the owner |
| U0b | The owner's six facts (device, app, what "download" means, what was seen in order, how often and when last, the version) turned into scenarios S1 to S4 with one going wrong; confirm sheet                                                                            | Opus                 | 1 h      | the owner's facts      |
| U0c | The fix behind the switch, tests red then green, 20 of 20; the owner's check on the real device (PC first, then the iPad)                                                                                                                                              | Sonnet               | 4 to 8 h | U0a, U0b               |

U0a starts on day 1 in lane 2, beside M1. U0b and U0c start the moment the facts arrive. Picture 4 updated.

### The owner's facts for U0 (22 Nov 2026, 00:40, in the owner's words, lightly ordered)

1. **Device:** the iPad (the installed app on the home screen is assumed; the owner did not say Safari tab). The PC was not mentioned.
2. **Which app:** every release, so the live app at least; the preview is assumed to behave the same (to check in U0a).
3. **"Download" means:** the app's own update: an automatic download starts after a release.
4. **What happens, in order:** the download fills to full and says "Restarting", and never restarts; it sticks there. The owner opens Settings, finds Check for update, which says an update is available; a restart starts again and sticks again on "Restarting", again and again. After some time it does restart, and then a download starts again, and the loop repeats. Removing the app from the screen and opening it again starts the download again, many times, same loop. After five to ten minutes of this it is somehow updated and works.
5. **How often, when last:** every single time there is an update.
6. **Version:** not mentioned; assume none is visible. U0a adds a visible version line.

**A second finding inside the same report (a spec change for update-v2.md, goes through its confirm sheet):** updating is far too hard to reach: Settings › Help and tools › Update is too deep. The owner wants it like an app store: one obvious place, one tap: download, install, update. Rule to propose: the update pill is the one place during normal use; Settings shows Update on its first page, never buried; the version and "up to date" are visible there.

**Owner instructions for Opus (22 Nov):** remind the owner for reference screenshots whenever a spec could use one, again and again if needed; share every test list by scenario number, in the same format as the site's sheets, so the owner can answer "S3 fails, saw X, expected Y"; the owner answers sheets and reports within the day.
