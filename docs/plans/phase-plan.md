# Phase plan (in force from 14 Nov 2026)

This is the plan the build follows. It replaces the order and the roles of `build-master-plan.md` (12 Nov), which stays as the catalogue of what each part contains. Why the change: [build-diagnosis-2026-11-14.md](build-diagnosis-2026-11-14.md).

**State:** see [../BUILD-STATE.md](../BUILD-STATE.md), the only file that says running or paused (running, lean, since the owner's restart of 14 Nov).

The phase numbers here (0 to 10) are new. Older files use other numberings (ROADMAP "Phase 7 to 15", an older plan "Phases A to Q"); those mean something else.

## 0. What's next (rewritten 15 Nov 2026, evening)

After the 15 Nov decisions (docs/design/owner-decisions.md, end; docs/plans/contradictions-2026-11-15.md). Open owner questions: [questions-2026-11-15.md](questions-2026-11-15.md); the order below assumes Claude's picks and changes only if an answer changes it.

**Measured pace** (docs/metrics/tasks.csv, 28 merged tasks, 14 and 15 Nov): a small fix takes about 1 hour from start to merged (median of 10); a text box task about 3 hours (median of 8); a task that rebuilds a screen to an approved picture 6 to 10 hours (P1.8 9 h, P1.9 10 h, 2A.2 6.5 h, 2B.8 6 h). With up to four builders, 17 tasks merged on 15 Nov. Limits: one iPad test run at a time on this PC; about 1.6 review rounds per task; the owner's test time is not measured. Every time below is "likely", from these numbers; a phase's owner test and its fixes are counted as about one more day.

| #   | Phase or step                    | What you get                                                                                                      | Approved picture                                                 | Size and likely time                                                                          |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | **Phase 1: re-test and go live** | the new frame, update screens, storage safety notice in your real app (Settings stays the old screen: question 1) | shell spec; Phase 1 fixes mock (15 Nov)                          | re-test (you, about 20 min), 2 to 4 small fixes, task 0.7: likely 1 day (2 with question 3 B) |
| 1a  | Journal merge (H)                | one "November 2026" page instead of two, nothing lost                                                             | none needed (data task)                                          | one small task: likely 2 hours, any time after the re-test (question 6)                       |
| 2   | **Phase 2A: tool bar v9**        | the tool bar exactly as the approved picture, Undo and Redo in the page top bar, "+" and ☰ favourites working    | tool bar mock v9 (15 Nov; replaces v8); favourites mock (12 Nov) | 13 tasks, most screen-sized: likely 3 to 4 days with the full team, about 6 lean              |
| 3   | **Phase 2B: finish text box**    | the new text box and Pencil, switched on                                                                          | Box card in v9 and textbox-2b/states.html                        | 2B.12, 2B.13 and 6 bug tasks (about 3 h each): likely 2 to 3 days with your look              |
| 4   | **Phase 1S: Settings v5**        | the new Settings (starters, groups with Advanced, search that changes in place, per-device tags, Undo at the top) | Settings v5 (15 Nov; replaces v3)                                | 11 tasks, most screen-sized, hot settings file: likely 3 to 5 days                            |
| 5   | Your layouts (up to 3 tool bars) | saved tool bars and setups                                                                                        | none yet: a picture first                                        | only after you pass the Settings and tool bar test; not known yet                             |
| 6   | Phases 3 to 8                    | Notebooks, Search, Home and Library, Review and Study, Reader, AI (all mostly built)                              | their 12 Nov mocks                                               | each: the new side-by-side check, fixes, your test: estimate 1 to 3 days each; not measured   |
| 7   | Phases 9 and 10                  | things inside a page, media; safety and system layer, welcome and tours                                           | none yet: pictures first                                         | not known yet                                                                                 |

**Time left:** steps 1 to 4 (Phases 1, 2A, 2B and Settings v5): likely 9 to 13 days, estimate from the measured pace. The whole project: not known yet (Phases 9 and 10 have no picture; Phases 3 to 8 have not had the side-by-side check).

Why this order: the owner's order of 15 Nov (Phase 1 live, then the 2A tool bar); 2B before Settings v5 because the text box is the top priority and its Box card sits in the v9 tool bar; Settings v5 after both because its Writing group holds the tool bar settings that 2A defines.

### Step 1: Phase 1 re-test and go live

- **1.1** The owner re-tests on the iPad: P1.8 update screens (L13, P1-3; T1 to T3 slow download, timer, "slow connection"), P1.9 frame covers (T4 side list with its own bar, sheets below the top bar, T21 ✓/✕ at the top, T22 folded Page options, no jump between Computer and Pencil mode). Page: phases/phase-1.md (test steps to rewrite for this round; step 4 "the back arrow" stays true in Phase 1).
- **1.2** Fixes from the re-test (small, about 1 hour each).
- **1.3** Polish to the release bar (or after go-live, question 3): sepia and PC pictures; the 7 desktop-only shell/leftPanel specs that fail on ipad-webkit (make them size-aware, or list them as desktop-only on purpose); F7 freeze recorder result; the Pencil check recorder removed.
- **1.4** Task 0.7: one code line, every new part OFF; `NIGHTLY_REF` to `main`. The Phase 1 preset no longer includes `settings.v3` (question 1 A).
- **1.5** The owner switches Phase 1 on, on each device.

### Step 2: Phase 2A, tool bar rebuilt to v9

Reference: docs/mockups/toolbar-v9/toolbar-v9.html; the gaps: docs/plans/audit-toolbar-2026-11-15.md; the answers: contradictions-2026-11-15.md. Already merged and kept: 2A.1 (parked tool bar parts), 2A.2 (⋯ menus, owner pass), 2A.3 (page menus rest, BUG-002, arrow slot), P1.9's fixed 64 px bar.

| #     | Task (what the user gets)                                                                                                                                                      | Size (likely) |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| 2A.4  | Undo and Redo in the page top bar (top left, before the path); the < > arrows go; back stays through the path and swipe back; Undo and Redo leave the tool bar (same switch)   | 6 h           |
| 2A.5  | Dark mode looks premium: light default ink in dark (A), tonal wells with raised thumbs, white switch knobs (shared parts)                                                      | 3 h           |
| 2A.6  | Pen row: colour as a dot, size as a dot of that size, pen-type pictures with sample stroke; Favourites on the row                                                              | 6 h           |
| 2A.7  | Pen › Feel card: Professional Feel set, Page with four paper pictures (no double paper choice), Aids segmented with icons, Math row pictures                                   | 6 h           |
| 2A.8  | Eraser: one choice Highlighter / Text / Pen (replaces the "highlights only" tile and switch), can erase typed text (B), Mode / Size / Options; T10 lag and gaps in words       | 6 h           |
| 2A.9  | Format card: 3 tabs Beginner, 4 Professional; colours, fonts and sizes inside the tabs, never a card on a card (T16, T17); the Text size control                               | 8 h           |
| 2A.10 | Format "on" states on every state option (T15); actions (Indent, Divider) stay plain                                                                                           | 4 h           |
| 2A.11 | Lasso reworked from today's live lasso with the new rules (v9)                                                                                                                 | 6 h           |
| 2A.12 | ⋯ More card as v9: New line and Backspace always on the bar, Keyword option, Back to pen stays Professional on the bar (C no); no Shift K label on touch (G, R3)               | 4 h           |
| 2A.13 | "+" Add favourite and ☰ Organise sheet working (T13, T18); placeholders never shown unwired                                                                                   | 2 × 6 h       |
| 2A.14 | Tool names by mode (question 2), upright Pencil mode icons only with names on a long press (E); Box card hangs under its ▾                                                     | 4 h           |
| 2A.15 | Edit the tool bar on the tool bar itself, with locked tools (Settings v5 S5-22, S5-23); "Your layouts" hidden, not dropped                                                     | 6 h           |
| 2A.16 | Side-by-side check of every bar and card with v9, light and dark, Beginner and Professional (owner rule of 15 Nov), and fixes; then the owner's test (checklist parts 7 and 8) | 4 h + test    |

### Step 3: Phase 2B, finish the text box

2B.1 to 2B.11 merged (no 2B.6), behind `textbox.v2`. Left: **2B.12** prove nothing was lost, tidy the switch-ON path; **2B.13** pictures (with the v9 bar) and the owner's test list; bugs **T25** Scribble space after "/", **T26** write over a selected word, **R15** one redo step on ipad-webkit (its red test stops the 2B release), **R18** phone dots lose a resize near the page end, **R17** white-on-white Shadow card tile, the narrow-box line overlap (`--box-line`); the wheel test move (question 7). Optional early 10-minute look (question 5). Then the owner's first look, fixes, release.

### Step 4: Phase 1S, Settings v5

Reference: docs/mockups/settings-v5/ (shots 1 to 16), docs/features/settings-v5-stories.md (S5-01 to S5-34). Before the first task: recount all 169 v3 feature switches into v5 (the mock shows 113); every one gets a place, none dropped. Tasks (likely 4 to 8 h each): S.1 the recount and the "nothing lost" test; S.2 first page and starter cards with Undo (S5-04 to S5-06); S.3 groups, common rows, Advanced, Feature switches, Turn on all in this group; S.4 search that changes settings in place, old names (S5-13, S5-14); S.5 Changed by me and Reset (Reset to Simple starter, S5-15 to S5-19a); S.6 first-launch Welcome and My experience (S5-01 to S5-03); S.7 This device tags and menu, What syncs (S5-25 to S5-27); S.8 Undo and Redo at the top, ✓/✕ at the top of sheets, phone; S.9 a tiny preview per row and the big live preview (contradiction 8: now, not Phase 10); S.10 one AI section, Help & tour, test tools under Advanced (Try new features, Test a phase, Pretend update); S.11 side-by-side check and the owner's test.

### What changes because of the 15 Nov decisions (nothing is dropped)

**Tasks to redo:**

- Tool bar steps 1a to 1f and 2A.1 (built to v8): the cards are rebuilt to v9 (step 2 above); the frame and colours stay.
- Settings v3 (`settings.v3`, built to mock v3): replaced by the v5 rebuild; v3 never goes live (question 1 A); its 169 switches carry over.
- The page top bar's Back · Forward (built in `foundation.shell`) and the tool bar's Undo / Redo (`HistoryButtons.tsx`): moved in 2A.4.
- The eraser's "Erase highlights only" Mode tile and Options switch: replaced by the target choice (2A.8).
- The Phase 1 test preset row "Phase 1" drops `settings.v3`; a Settings v5 switch is added to the table when S.1 starts.
- Old test steps that name the < > arrows or v3 places: rewritten with each phase page.

**Specs out of date** (each is updated by the task that rebuilds it, before its builder starts):

- docs/features/toolbar-v8.md: v8 throughout; TB-01 puts Undo and Redo on the tool bar; 52 px bar; Beginner icons only / Professional names; Layouts; eraser, lasso, ⋯ More. → becomes the v9 spec (2A.4 onward).
- docs/features/settings-v3.md: the v3 screen. Stays as the inventory of the 169 switches; the build follows settings-v5-stories.md.
- docs/design/shell-spec.md: §3 top bar item 3 "Back · Forward"; the sheet footer "hint · Cancel · ✓ Done" (now ✓/✕ at the top, owner yes, contradiction 2); right sheets 440 px in both specs (contradiction 7); the side list moves the page aside (line 77).
- docs/features/page-menus.md: 376 px full-height sheet (now 440, below the top bar); points to toolbar-v8.md.
- docs/features/device-modes.md: Pencil mode "Large (54 px)" buttons (now the fixed 64 px bar, no jump; R19).
- docs/features/textbox-v2.md and docs/plans/phases/phase-2b.md: the Box card from toolbar-v8 (now v9).
- docs/features/shared-parts.md: v8 recipes and the Sheet footer ✓ (check against v9 and the top ✓/✕).
- docs/features/toolbar.md and toolbar-ribbon.md: older bars, already replaced; history only.
- docs/plans/phases/phase-1.md: artifact line (v3), switches list (`settings.v3`), test steps.
- Still correct: docs/features/navigation.md (browser Back and Forward and addresses stay); docs/design/owner-ui-patterns.md (already says ✓/✕ at the top).

**Pictures superseded:**

- Tool bar mock v8 (docs/mockups/toolbar-v8/, claude.ai/artifact/UNS1UzPv4wb6errBrtpv4h) → v9. v8's design-study.md stays the card system.
- Settings mock v3 (docs/mockups/settings-mock-v3.html) → v5. Settings v4 and v3-plus: not approved, not used.
- Any older picture that shows the < > arrows in the page top bar, an old tool bar or old pen icons: not a reference (owner: all mock-ups show the same shared parts).

## 1. The method (the owner's way, which worked before)

Every phase goes through the same six steps, in this order.

1. **Artifact.** The picture of the phase: a mock-up the owner has approved. No approved picture, no building.
2. **Plan with Fable.** One short phase page: what is in, what is already built, the tasks (each small enough for one builder in one day), the test list for the owner, and what will not be done. All questions go to the owner at once. The owner says yes once.
3. **Build.** Only what the plan lists. During the build the only new work is fixing bugs and reworking things that do not behave as planned. New ideas go to docs/IDEAS.md.
4. **First look.** As soon as the phase works, the owner tests it on the iPad at the preview address, with the phase switched on by the test preset. Findings are written down, one by one.
5. **Fix and polish.** The findings are fixed, then the phase is brought to the full bar (section 4).
6. **Release.** The owner says yes, and the phase is switched ON in the live app. A short look back records the pace and what to do better.

Only one phase is in steps 3 to 6 at a time. The next phase may be in steps 1 and 2 meanwhile.

## 2. Who does what (owner, 14 Nov 2026)

The cheapest model that can do the job does it. Work moves up only when it fails.

| Who                     | Does                                                                                                                                                                            | When                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Sonnet** (`builder`)  | builds: one planned task each, from the first test to merged                                                                                                                    | always                                        |
| **Opus, medium effort** | manages the build and reviews each task once (`reviewer`): the code against the plan, and the look against the approved picture. Takes a task over when Sonnet failed it twice. | while a phase is being built                  |
| **Fable**               | plans each phase with the owner (steps 1 and 2); solves what Opus could not                                                                                                     | planning sessions, and when Opus failed twice |

Fable does no routine reviews. A look check compares the screen with the approved picture, and Opus does it in the same visit as the code review. Fable is called for a look only when there is no approved picture to compare with, or Opus failed.

**Two ways to run the build:**

- **Lean (the default, and the way the build restarts).** The main chat runs on Opus at medium effort and manages directly: no manager helper, one or two builders, each task reviewed once. The owner tests; builders fix only what the owner found, plus the reset tasks in section 6.
- **Full team (only when the owner says so; approved by the owner on 14 Nov for Phase 2B, the text box, because it is the foundation of the app).** An Opus `phase-manager` helper runs the phase with as many builders as the phase has separate tasks, and the main chat checks the hourly pulse. Used for a large new piece such as Phase 2B.

How the helpers work day to day: [docs/HOW-WE-BUILD.md](../HOW-WE-BUILD.md).

## 3. Speed

The diagnosis showed that building was never the slow part; getting work merged, tested and in front of the owner was. So speed comes from these, in order of effect:

1. **Most of the app is already built.** Phases 1 to 7 mostly need the owner's test and fixes, not building.
2. **The owner's test comes early**, so the costly polish is done once, on the right thing.
3. **Small tasks.** A task is one screen or one behaviour, a day at most. Builders understood small tasks; they did not understand whole areas.
4. **No queue.** A task is merged as soon as it is reviewed. Builders are added only while reviewed work is not waiting to merge.
5. **One code line** from the end of Phase 1: small tasks merge into `main` behind switches that are OFF in the live app.
6. **A fast test set per merge** (about 10 minutes; today 33 to 43), with the full set nightly and before each release. This is built when the owner moves to the full team.
7. **Preparing ahead by one phase only.** While the owner tests phase N, builders may fix the known problems of phase N+1. Nothing further ahead.

Pace is measured, not promised. Each merged task adds a row to docs/metrics/tasks.csv, and each phase ends with its real numbers in docs/metrics/phase-results.md, next to the numbers of the two ways that failed. If the phased way proves better, it stays the standard in the owner's global playbook for every project.

## 4. Quality: two bars, the second one unchanged

- **First-look bar** (before the owner's first test of a phase): it works; Beginner and Professional; light and dark; iPad upright and sideways, and phone; the key flows have tests; ten minutes of real use in Safari on an iPad size shows no break (sign-in stays, turning the device, scrolling, no freeze).
- **Release bar** (before a phase is switched ON in the live app): the full Definition of Done in rules/quality.md, as it is today: sepia and PC as well, every screen pictured and compared with the approved picture, accessibility, size budget, nothing lost against the inventory, the full test set green.

The reviewer fails a task for gaps against the plan and for things that break. Style notes are listed separately and do not fail a task unless they break the design rules. No test is weakened, skipped or deleted. No feature is dropped. The design rules do not change.

## 5. Phase order

Three orders were compared.

|                                                    | Order A (Fable, first proposal)                     | Order B (owner, first message)           | Order C (owner, second message)                                      |
| -------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Order                                              | frame + notebooks + search + settings, then writing | frame, toolbar, settings, notebook, rest | frame, Pencil + text box + toolbar, notebook, search, settings, rest |
| Top priority (writing on the page) arrives         | third or later                                      | second                                   | second                                                               |
| First release                                      | slower (four areas at once)                         | fast                                     | fast                                                                 |
| Settings in time for the toolbar's unlock switches | yes                                                 | no (settings after toolbar)              | no (settings last)                                                   |
| Builders get small, clear phases                   | no                                                  | yes                                      | yes                                                                  |

**Chosen: Order C, with one change the owner agreed to on 14 Nov: Settings travels with the frame.** Settings holds the "Professional features" switches and the "Try new features" list that every later phase needs, and it is already built. The writing phase is split in two so its built half reaches the owner while its new half is being built.

| Phase | What the owner gets, switched ON in the live app                                                                                               | State today                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 0     | Reset: clean rules, the real app's check green, the test preset. No features.                                                                  | section 6                                                                    |
| 1     | **The frame and Settings**: sidebar, top bar, scrolling, turning, staying signed in, storage safety, the update flow, new Settings with search | fixes done (P1.1 to P1.9); re-test, then live; Settings moves to 1S (15 Nov) |
| 1S    | **Settings v5** (split from Phase 1, 15 Nov)                                                                                                   | approved picture 15 Nov; not built                                           |
| 2A    | **Writing tools**: the tool bar, favourites, page menus, the format bar                                                                        | built to v8; to rebuild to v9 (15 Nov)                                       |
| 2B    | **Text box and Pencil**                                                                                                                        | 2B.1 to 2B.11 merged, behind its switch; 2B.12, 2B.13 left                   |
| 3     | **Notebooks**                                                                                                                                  | built                                                                        |
| 4     | **Search**                                                                                                                                     | built                                                                        |
| 5     | **Home and Library**                                                                                                                           | built                                                                        |
| 6     | **Review and Study**                                                                                                                           | mostly built; two parts parked                                               |
| 7     | **Reader**                                                                                                                                     | built, parked, not yet seen by the owner                                     |
| 8     | **AI and the Claude connector**                                                                                                                | partly built; online part needs Supabase steps                               |
| 9     | **Things inside a page; pictures, PDF, audio**                                                                                                 | not built; needs its artifact first                                          |
| 10    | **Safety and data; system layer; welcome and tours**                                                                                           | not built; needs its artifact first                                          |

## 6. Phase 0: reset (no features)

In the order they run after the restart.

| #    | Task                                                                                                                                                                                                                                                                                                                                                                                                                          | Who               | State                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------- |
| 0.1  | Rules, helper files, memory notes, PENDING, HANDOFF and BUILD-STATE rewritten so they agree; the method saved in the owner's global files                                                                                                                                                                                                                                                                                     | Fable             | done 14 Nov                   |
| 0.2  | Opus thinking effort from low to medium                                                                                                                                                                                                                                                                                                                                                                                       | Fable             | done 14 Nov                   |
| 0.3  | The real app's own check green again (one lint line in the connector setup tool, red since 13 Nov)                                                                                                                                                                                                                                                                                                                            | Fable             | fixed 14 Nov; confirm the run |
| 0.4  | Clear the paperwork clash: merge `main` into `build/next` (PENDING: take main's; CHANGELOG and DECISIONS: keep both sides)                                                                                                                                                                                                                                                                                                    | builder           | first task                    |
| 0.5  | Merge the reviewed scrolling fix (F2, F3, F4, F6, F8; `slice/fix-scroll-frame` 5e2c80f7; merges cleanly, checked 14 Nov)                                                                                                                                                                                                                                                                                                      | builder           | second task                   |
| 0.6  | **Test preset** (owner, 14 Nov): at the top of Settings › Try new features, pick a phase ("Phase 1", "up to Phase 2A", … "Everything") and flip one On/Off switch. On switches on every part up to that phase; Off switches all new parts off. Removed when the redesign is finished.                                                                                                                                         | builder, reviewer | third task                    |
| 0.14 | **Security updates** (owner's yes, 14 Nov, Fable audit; scope corrected by Opus the same evening): update `eslint` 10.14.0 to 10.15.0, which clears 2 of the 14 `npm audit` findings. Never downgrade: the audit's "fix" versions (`typescript-eslint` 8.36, `vite-plugin-pwa` 1.1.0) are older than ours (8.72, 2.0). The other 12 have no fixed version published yet (build-time tools only); re-checked at each phase end | manager           | after 0.6                     |
| 0.7  | **One code line** (owner's yes, 14 Nov): at the end of Phase 1, after the owner's test, the preview's code goes into `main` with every new part OFF; `build/next` is retired; the preview address then shows `main`. The owner switches Phase 1 on with the preset, on each device.                                                                                                                                           | builder, reviewer | end of Phase 1                |

Waiting until the owner moves to the full team (they cost builder time and are not needed for the lean start):

| #    | Task                                                                                                                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.8  | Fast test set for each merge; full set nightly and before a release; docs formatting checked apart from the app                                                                                                                                          |
| 0.9  | Find the cause of the three iPad tests that fail on this PC every time (textBoxFree:461, toolsRefresh:60, undoHistory:210); at the latest with Phase 2B, where they belong                                                                               |
| 0.10 | The hourly pulse script reads the phase board                                                                                                                                                                                                            |
| 0.11 | List the unused working copies for removal, one by one (the owner approves removals); find out why the full lint in the main working copy reports thousands of errors while the test computer reports none                                               |
| 0.13 | After 0.7 and 0.11: try Claude Code's own "separate copy" setting for the builder (`isolation: worktree` in the builder file) on one task; keep it only if that task went as well as with a named working copy (owner, 14 Nov, from the agents research) |

## 7. The phases in detail

Each phase gets its own page (`docs/plans/phases/phase-<n>.md`) in step 2, written by Fable just before it starts. This section fixes what belongs where, so nothing is lost.

### Phase 1: the frame and Settings

- **15 Nov:** the Phase 1 fixes mock (approved 15 Nov) is the frame's picture; Settings moves to Phase 1S with Settings v5 (section 0). The lines below are from 14 Nov.
- **Artifact:** shell spec (docs/design/shell-spec.md), Settings mock v3 (approved 12 Nov; **superseded by v5, 15 Nov**). Not yet seen by the owner as a picture: the storage safety notice and the right-docked "More" sheet; the first look is where the owner approves or changes them.
- **Built and in the preview:** the frame (`foundation.shell`), shared parts steps 1 and 2, Settings v3 (`settings.v3`), storage safety (`storage.safety`), the update flow (`update.v2`), security upgrade (`security.m1`), fixes F1, F7 recorder, F9, BUG-006.
- **To do:** tasks 0.4 to 0.6; the freeze (F7): cause still unknown, a recorder is running on the preview; the calm redo of the Settings preview picture (mock condition); shared parts step 3 (parked, `slice/0g-parts-3` 9840315e) when a later phase needs it.
- **Owner's test:** the first-preview checklist parts 1, 2, 6, 10 and steps 43, 44; re-check F1 to F9; the "More" sheet docked on the right.

### Phase 2A: writing tools

- **Artifact:** **tool bar mock v9 (approved 15 Nov; replaces v8)**, favourites and long-press strip (approved 12 Nov). Rebuild tasks: section 0, step 2.
- **Built and in the preview:** tool bar steps 1a to 1f and BUG-003 (`toolbar.v8`, 2A.1), ⋯ menus (2A.2), page menus 12a, 12b and rest (2A.3, `page.menus`).
- **Open problems:** BUG-002 (format bar leaves the screen), BUG-003 (hide the bar while writing), the "more tools" arrow over Backspace.
- **Owner's test:** checklist parts 7 and 8.

### Phase 2B: text box and Pencil

- **15 Nov:** 2B.1 to 2B.11 merged; what is left is in section 0, step 3. The Box card's reference is now tool bar mock v9.
- **Artifact:** the Box card in toolbar mock v8 (now v9) and the owner's text box decisions of 11 Nov (docs/design/owner-decisions.md). Step 2 first checks that these are a complete picture; if a part is missing, a small mock-up is made and approved before building.
- **Decided (12 Nov):** keep the layout engine and the saved pages; rebuild only the touch, select and drag layer on the new foundation (`textbox.v2`).
- **Open problems to solve here:** the cursor lands in the wrong place or jumps; Pencil double-tap does not select; only the whole box shows as selected (solid 1.5 px border, corner dots); the ≡ grab tab; drag is exclusive; handles (44 pt, nearest handle wins, dots outside the box, a short hold before the drag); never wrap letter by letter; minimum width is the longest word; the glide into place after a drop; two writing hints overlapping; BUG-001 (checklist shows "Not saved yet"); Scribble on a real iPad; the three iPad tests of task 0.9.
- **Open questions for step 2:** boxes side by side at the same height; rotation (parked with layers).
- **Way to run:** the full team (owner, 14 Nov). At step 2 Fable gives the owner a rough size before it starts. Any other phase asks the owner first.

### Phase 3: Notebooks

- **Artifact:** Notebooks mock (approved 12 Nov). **Built:** `notebooks.v2`, in the preview. **To do:** F4 (remove Review, All cards, All summaries rows; in the scrolling fix), the owner's findings. **Owner's test:** checklist steps 15 to 19 and 36.

### Phase 4: Search

- **Artifact:** Search mock (approved 12 Nov). **Built:** `search.v2`, with F5. **Owner's test:** steps 20, 21.

### Phase 5: Home and Library

- **Artifact:** Home dashboard mock and Library mock v2 (approved 12 Nov, with conditions). **Built:** `home.v2`, `library.v2`, in the preview. **Owner's test:** checklist parts 3 and 4.

### Phase 6: Review and Study

- **Artifact:** Review mock (approved). Study tabs were built from Fable's own picks, which the owner has not seen: the first look is where the owner approves or changes them. **Built:** Review 8a, 8c. **Parked, reviewed:** Review rest (`slice/8b-review-rest` bfb6298d), Study tabs (`slice/15-study-v2` c1180092). **Owner's test:** steps 38, 39, 45.

### Phase 7: Reader

- **Artifact:** Book annotations and Reader mock (approved 12 Nov, six conditions). **Parked, reviewed:** `slice/7-reader-v2` 2f78926f (8 follow-ups). **Open problems:** the sidebar covers the reader's ✕; the top bar looks blurry; the two bars must hide and return on their own; Listen long-press. The reader presets (Read, Light study, Deep study) stay under Later.

### Phase 8: AI and the Claude connector

- **Artifact:** AI mode mock v4 (approved 12 Nov), docs/design/ai-tool-framework.md. **Built:** framework steps 1 to 5c, the Build screen, connector A (tested by the owner 13 Nov). **Parked, reviewed:** framework step 6 (`slice/9-ai-framework-6` 0d94407d), cost additions (`slice/9-ai-cost` 14b9e748). **Not built:** framework steps 7 and 8. **Needs the owner:** the online connector's Supabase steps; a test key typed into Settings by the owner.

### Phases 9 and 10

Not built. Their pictures were Fable's own picks (batches 2, 3, 5, 6), which the owner has not seen. Step 1 comes first: the owner sees and approves an artifact for each before any building.

## 8. The restart, step by step

Done (14 to 15 Nov). What comes next is section 0.
