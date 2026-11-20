# Phase 2 finish: the complete plan (set 20 Nov 2026)

Written by Fable with the owner. It covers everything that is open for Phases 0, 1, 2A and 2B, the new Settings page (Settings v5, Phase 1S; added on the owner's word, 20 Nov) and their release together. Phase 3 and later are not planned here. Whether the build is running: only [../../BUILD-STATE.md](../../BUILD-STATE.md) says. Sources: the brief [../fable-brief-smart-select.md](../fable-brief-smart-select.md); the owner's answers in [../../design/owner-decisions.md](../../design/owner-decisions.md) ("Smart select plan", 20 Nov); the sweep of every open item [../open-items-sweep-2026-11-20.md](../open-items-sweep-2026-11-20.md).

## 1. What the owner gets, and where it ends

Select a word or a few letters with the Pencil, delete or paste, write over it with Scribble: reliably, with Scribble on. One smart bar for every selection. Today's Lasso unchanged. Every open fault of the frame, the tool bar and the text box closed. Then Phases 1, 1S (Settings v5), 2A and 2B go live together, on the owner's yes (part E7). That is the end of this plan. **Nothing optional holds the release (owner agreed, 20 Nov):** Settings v5 and the smart bar go live with the rest only if they have passed the owner's test by then; if not, they follow a few days later.

- **What success means to the owner (20 Nov), the six things that must work well by the end:** (1) the Settings page with the customisation the owner decided (Settings v5; stage 5 of this plan); it is Phase 1S, which this plan does not contain: `OPEN:` the owner decides whether it joins this release, see section 8); (2) the app frame; (3) the Text tool; (4) the Pen tool; (5) the Lasso tool; (6) the text box and everything about selecting, so that text can be edited in the best possible way. The owner's full test (E2, E5) has one chapter for each of the six.
- **Switches (new, off in the live app):** `select.textLevel`, `select.smartBar`. Off = today, exactly.
- **Already built:** see BUILD-STATE "In the code line".

## 2. How every part runs

The method is one page: [docs/METHOD.md](../../METHOD.md). Specs written this way: docs/features/lasso.md (A0, A1), docs/features/text-select.md (A4 to A9, draft), docs/features/selection-bar.md (B1 to B9, draft). Every other part gets its spec, at the right weight, just before it starts.

## 3. Who builds (owner, 20 Nov: two lanes)

- **Lane A, builder 1 (Sonnet):** selection. These parts share `src/ink/controller.ts`, `src/paper/PaperFrame.tsx` and `src/editor/tapSelect.ts`, so they run strictly one after another.
- **Lane B, builder 2 (Sonnet):** everything that does not touch those three files.
- **Opus (main chat, medium):** writes each part's spec with the lenses, hands out parts, gives the one ipad-webkit turn, reviews each part once, takes over after three Sonnet fails. **Fable:** only when Opus failed five times (owner, 20 Nov). All at medium effort.
- No third builder: this PC runs one ipad-webkit suite at a time (measured 14 Nov). When one lane is empty, its builder takes leftover parts that do not touch the other lane's files.
- Hot files (one builder, merged alone): `package.json` (B0), `src/app/flags.ts` (A4, B3), `src/settings/builtinSettings.ts` (B7), `playwright.config.ts`.

## 4. Every open item has one home

The sweep found about twenty open items the first version of this plan had missed, and about fifteen that the lists still showed as open although they are done. Each open item is now a part below, an owner check in section 6, or on the "later" list in section 10. Nothing is left without a home.

## 5. The parts, in order

Sizes are likely hours from the measured pace (small fix 1 h, text box task 3 h, screen 6 to 10 h).

### Stage 0: start (about half a day)

| #   | Who    | What it gives                                                                                                                                                    | Spec                              | Size     | Owner's check        |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------- | -------------------- |
| D0  | Opus   | The state files tell the truth again (PENDING, BUILD-STATE, user-stories-2b, the merges missing from CHANGELOG), from the sweep; `main` merged into `build/next` | sweep sections 2 and 6            | 1 h      | no                   |
| A0  | lane A | Tests hold today's Lasso still. No app change                                                                                                                    | lasso.md S1 to S5, LS-01 to LS-47 | 3 h      | no                   |
| B0  | lane B | The scenarios run as tests; a pass / fail report comes with every preview                                                                                        | SC-01 to SC-08 (appendix A)       | 4 to 6 h | open the report once |

### Stage 1: the Lasso safe, the tools ready (about a day and a half)

**Order in lane A, changed on 20 Nov after the owner's answer "my hand rests on the screen while I circle":** A0, then **A2** (the quiet recorder), then check **C1a** (the owner uses the Lasso as usual for five minutes with the quiet recorder on and taps "Copy last trace" when an outline stays or a loop acts on the old selection), then **A1** written from that real trace (lasso.md S6 to S10, LS-50 to LS-58), then A3. A2 must prove that the recorder changes nothing: every Lasso scenario passes with it on. The recorder never stores the words of a note: it records that text changed, never which letters.

**The choice after A3 (owner agreed, 20 Nov):** the build of A4 to A9 waits for a ten-minute choice with the owner. If the Scribble test shows that Scribble leaves a read-only box alone, selecting may work in the Text tool itself in two moves, and the text-selection parts are reshaped before they are built. If not, they are built as written (four moves).

| #   | Who    | What it gives                                                                                                                                                                               | Spec                                              | Size | Owner's check |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---- | ------------- |
| A1  | lane A | No left-over outline; a new loop always starts fresh                                                                                                                                        | lasso.md S6 to S9, LS-50 to LS-56, LS-N1 to LS-N6 | 3 h  | C1            |
| A2  | lane A | A quiet recorder (draws nothing; "Copy last trace") replaces the red-line Circle recorder                                                                                                   | to write                                          | 2 h  | no            |
| A3  | lane A | The Scribble test: is a box that cannot be typed in left alone by Scribble?                                                                                                                 | to write                                          | 1 h  | C2            |
| B1  | lane B | The list of every button of the three old bars, its place on the smart bar, whether it works today; a test that fails if one is lost                                                        | selection-bar.md                                  | 2 h  | no            |
| B2  | Opus   | Pictures of the smart bar: cursor, words, box, drawing, picture, mix; Edit and Study; iPad sideways first, upright, phone; light and dark; the buttons for a mix and the place of the box ⋯ | pictures                                          | 3 h  | C3            |

### Stage 2: text selection and the bar (about four days)

| #   | Who    | What it gives                                                                                        | Spec                              | Size | Owner's check |
| --- | ------ | ---------------------------------------------------------------------------------------------------- | --------------------------------- | ---- | ------------- |
| A4  | lane A | Our purple highlight with two round handles that drag                                                | text-select.md                    | 3 h  | C4            |
| A5  | lane A | Circle letters (S1, S2, S6)                                                                          | text-select.md                    | 3 h  | C5            |
| A6  | lane A | Double tap = word, triple = line, four = paragraph (S3, S8)                                          | text-select.md                    | 3 h  | C6            |
| A7  | lane A | Leaving: Delete → cursor in the gap; a tap → cursor; a loop outside → today's Lasso (S4, S5, S7, S9) | text-select.md                    | 3 h  | C7            |
| A8  | lane A | Paste ▾ and Delete on the bar for such a selection; paste safety check                               | text-select.md; one picture first | 2 h  | C8            |
| A9  | lane A | Scribble over selected words deletes them; write over a selected word (T26)                          | to write                          | 3 h  | C9            |
| B3  | lane B | The bar's frame and the two text states (S1, S2)                                                     | selection-bar.md                  | 6 h  | with C10      |
| B4  | lane B | Box state with Edit Text (S4)                                                                        | selection-bar.md                  | 3 h  | with C10      |
| B5  | lane B | Drawing state: every drawing action (S3)                                                             | selection-bar.md                  | 6 h  | with C10      |
| B6  | lane B | Picture and mixed states                                                                             | selection-bar.md                  | 3 h  | with C10      |
| B7  | lane B | Presets Edit and Study, Auto, Settings › Tool bar › Selection bar (S5)                               | selection-bar.md                  | 6 h  | with C10      |
| B8  | lane B | Phone: the same presets, fewer buttons                                                               | selection-bar.md                  | 3 h  | with C10      |

### Stage 3: swap-in and leftovers (about two to three days)

| #      | Who              | What it gives                                                                                                                                                                                                                                            | Size | Owner's check |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------- |
| B9     | lane B, after A8 | The smart bar replaces the three old bars behind its switch (S6, S7)                                                                                                                                                                                     | 3 h  | C10           |
| A10-1  | lane A           | T25: writing after "/" with Scribble no longer adds a space                                                                                                                                                                                              | 1 h  | C11           |
| A10-2  | lane A           | B8: with Scribble off, a Pencil tap selects a box                                                                                                                                                                                                        | 1 h  | C11           |
| A10-3  | lane A           | Lines never overlap in a narrow box                                                                                                                                                                                                                      | 1 h  | C11           |
| A10-4  | lane A           | P-15: the editor's small block button never floats over the words during Pencil taps                                                                                                                                                                     | 3 h  | C11           |
| A10-5  | lane A           | Equal boxes: the first box and a new box are the same height (owner's word, question 2)                                                                                                                                                                  | 3 h  | C11           |
| B10-1  | lane B           | R15: Redo always redoes exactly one step (red about 1 run in 5 at iPad size; stops the release)                                                                                                                                                          | 3 h  | no            |
| B10-2  | lane B           | R17: the Shadow card tile is visible (white on white today)                                                                                                                                                                                              | 1 h  | no            |
| B10-3  | lane B           | R18: on a phone the dots resize a box right to the page end                                                                                                                                                                                              | 1 h  | C11           |
| B10-4  | lane B           | TB23-DIV: a test presses the divider between two boxes itself                                                                                                                                                                                            | 1 h  | no            |
| B10-5  | lane B           | TB-24: find why one box-bar test is red on a clean copy while CI is green                                                                                                                                                                                | 1 h  | no            |
| B10-6  | lane B           | R20: renaming a Journal month by double tap works at iPad size                                                                                                                                                                                           | 1 h  | C11           |
| B10-7  | lane B           | TA: the "More tools" arrow never sits over Backspace (look first)                                                                                                                                                                                        | 1 h  | C11           |
| B10-8  | lane B           | P-18: the sidebar page menu uses line icons only; on a phone its list does not cover the title                                                                                                                                                           | 1 h  | no            |
| B10-9  | lane B           | The old toast-position fix (slice/shell-fixes): merge it or close it                                                                                                                                                                                     | 1 h  | no            |
| B10-10 | lane B           | The "Handwritten" quick font (Patrick Hand) is there; licence checked                                                                                                                                                                                    | 1 h  | C11           |
| B10-11 | lane B           | Settings says "Keep look", the same words as everywhere                                                                                                                                                                                                  | 1 h  | no            |
| B11    | lane B           | Test health: each of the about 21 shaky iPad-size tests gets its cause found (never a retry); the seven desktop-only tests made size-aware or marked desktop-only on purpose; toolsRefresh:60; the timing tests placed as the owner decides (question 1) | 8 h  | no            |

### Stage 4: the end (about three days, plus the owner's test)

| #   | What it gives                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Nothing lost (2B.12): the inventory against the app. The specs that are out of date (shell-spec, page-menus, device-modes, textbox-v2, shared-parts, phase-1) corrected or marked "replaced by"                                                                                                                      |
| E2  | The owner's full test list (2B.13), written as numbered scenarios by feature; the older checks that still apply and the "owner to confirm" items folded in; pictures                                                                                                                                                 |
| E3  | Side by side with every approved picture: light, dark and sepia; iPad both ways, phone and PC                                                                                                                                                                                                                        |
| E4  | Security review by Opus as a tester: paste first, then the whole phase; a bullet list discussed with the owner                                                                                                                                                                                                       |
| E5  | The owner's full test (about an hour, estimate) and its fixes. The freeze (F7) and "Not saved yet" (BUG-001) are closed here if not seen again, or get a part                                                                                                                                                        |
| E6  | The release bar (rules/quality.md); the preview-only recorders and the Tap speed row removed; the strict security header checked (sign-in, Drive, fonts); the full test set green                                                                                                                                    |
| E7  | **Go live on the owner's yes:** one code line (task 0.7), NIGHTLY_REF, the live-check fix; a backup of the owner's notes first; then the parts are switched on over two or three days (the frame and tool bar, then the text box and selection, then the smart bar and Settings if they have passed), on each device |
| E8  | After go-live, on the owner's word (question 4): the old text box files removed                                                                                                                                                                                                                                      |
| E9  | Any quiet hour: a list of the 61 working copies (clean or not, merged or not); the owner approves the removals once (question 5)                                                                                                                                                                                     |

### Stage 5: the new Settings page, Settings v5 (about four to five days of building; runs beside stages 2 and 3 in whichever lane is free)

Picture: docs/mockups/settings-v5/ (16 shots, approved 15 Nov). Stories: docs/features/settings-v5-stories.md (S5-01 to S5-34); each part gets its numbered scenarios from them before it starts. The settings file `src/settings/builtinSettings.ts` is a hot file: one part at a time. Every one of the 169 switches of the old screen gets a place; none is dropped.

| #    | What it gives                                                                                                                       | Size |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ---- |
| S.1  | The recount: all 169 switches placed in the new page (the picture shows 113), with a test that fails if one is lost                 | 4 h  |
| S.2  | The first page and the starter cards, with Undo                                                                                     | 6 h  |
| S.3  | Groups, common rows, Advanced, the feature switches, "Turn on all in this group"                                                    | 8 h  |
| S.4  | Search that changes a setting in place and finds old names                                                                          | 6 h  |
| S.5  | "Changed by me" and Reset (also "Reset to Simple starter")                                                                          | 4 h  |
| S.6  | The first-launch Welcome and "My experience"                                                                                        | 4 h  |
| S.7  | "This device" tags and menu; what syncs                                                                                             | 6 h  |
| S.8  | Undo and Redo at the top; ✓ and ✕ at the top of sheets; phone                                                                       | 4 h  |
| S.9  | A tiny preview on each row and the big live preview, calm (the "too loud" note S1 and the pill over the Format tabs, PP1, end here) | 8 h  |
| S.10 | One AI section, Help and tour, the test tools under Advanced                                                                        | 4 h  |
| B7b  | The Selection bar part (presets, order), built once, inside the new Settings                                                        | 4 h  |
| S.11 | Side by side with the 16 shots (light, dark, sepia; iPad both ways, phone, PC), then the owner's check C-S                          | 4 h  |

Owner's check **C-S** (after S.11, about 20 minutes): the new Settings on the iPad; it is also a chapter of the full test C12.

### Changes after the builder and tester lenses (20 Nov; docs/plans/lenses-2026-11-20.md)

Three assumptions were corrected before any code, and some parts are bigger than first written. The tables above keep their part names; these splits and sizes replace theirs:

| Part      | Now                                                                                                                                           | Why                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| A1        | A1a the nets (2 h), A1b the margin loop (1.5 h), A1c the palm (1.5 h)                                                                         | two separate code paths, and no palm guard exists                 |
| A2        | 3 h: the recorder **and** a replay that sends what a trace really holds                                                                       | today's replay makes up pressure and buttons                      |
| A4        | A4a the highlight (2 h), A4b the handles (4 h)                                                                                                | a highlight exists; the handles are new                           |
| A5        | 4 h                                                                                                                                           | its own letter geometry; a hook before the Lasso clears things    |
| A7b (new) | Drag selected words to another place (4 h); one small picture first: the lifted words and the landing mark                                    | owner, 20 Nov: a stroke on the selection may drag it where I want |
| A9        | A9a going over selected words again and again deletes them, under the Lasso (3 h), A9b write over a selected word in the Text tool, T26 (2 h) | Scribble is not active under the Lasso                            |
| B3        | B3a what-is-selected and the page-level place (4 h), B3b the text states (4 h)                                                                | the box bar is tied to boxes                                      |
| B5        | B5a move, copy, card (4 h), B5b colour and thickness (4 h)                                                                                    | six pieces of code to replace, not three                          |
| B6, B9    | 4 h each                                                                                                                                      |                                                                   |
| B7        | B7a order and storage (3 h), B7b the Settings part (4 h)                                                                                      |                                                                   |

Every new test file is added to the iPad-size list; time is tested with the test tool's own clock.

## 6. The owner's checkpoints

| #        | When                                         | What                                                                                         | Time         |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------ |
| C0       | now, on today's preview, Circle recorder off | the catch-up list below                                                                      | 20 min       |
| C1       | after A1                                     | 30 loops lifting fast: no outline stays; 15 loops one right after another: each starts fresh | 5 min        |
| C2       | after A3                                     | one circle and one double tap with the test switch on                                        | 5 min        |
| C3       | after B2                                     | approve the smart bar pictures (yes or "change X")                                           | 10 min       |
| C4 to C9 | after each of A4 to A9                       | that part's scenarios on the iPad, answered by number                                        | 5 min each   |
| C10      | after B9                                     | the smart bar on the iPad: every state, both presets, pinned and docked                      | 15 min       |
| C11      | after stage 3                                | the leftovers marked C11                                                                     | 15 min       |
| C12      | E5                                           | the full test                                                                                | about 1 hour |
| C13      | E7                                           | the yes to go live                                                                           | —            |

**The owner checks in two calm windows, morning and evening (agreed 20 Nov: a hurried check from work gives poor evidence; "keep reminding me when to check").** Opus names the check that is due at the top of its message under "Needs you", with the preview version and the steps, and repeats the list of checks still waiting at the end of every message until each one is done.

**Builders do not wait for a check.** The owner works 9 to 5, so checks come in a morning or an evening window and cover whatever landed since the last one. While a selection part waits for its check, the next one is built; at most two selection parts may be unchecked at a time, so a wrong turn costs two parts at the most. A failed check goes to the front of its lane.

**C0, the catch-up list** (merged since 17 Nov and never checked on the iPad):

1. Paste ▾ in the top row and in the floating bar pastes at the cursor and keeps the look; ▾ offers Plain text.
2. A hold in a box shows our strip with Paste.
3. With the Text tool, circle some words: no ink is left.
4. Your own top row shows Paste ▾.
5. Select a box: the one bar shows; move it, dock it on a side, pin it; try the fonts and Lock box.
6. Type near a corner of the page: the format bar stays on the screen, both ways up.
7. While you write, the tool bar hides and a "Show toolbar" pill shows.
8. After typing, touch ≡: the box does not grow. The middle side handles resize the box.
9. Reload: still signed in. The sidebar scrolls from empty space. The search has its ✕. The ⚙ gear is reachable upright. The Pencil can drag the scroll bar.
10. In the Journal, double tap a month name to rename it.
11. The Pen (on the owner's success list): draw with two pens and two colours, erase part of a stroke, draw a shape, rest your hand while drawing. All as you expect?

## 7. Pictures the owner approves before the build

- **B2:** the smart bar's states (set). Nothing after B2 in lane B is built before the owner's yes.
- **A7b:** one small picture of dragging selected words (the lifted words, the mark where they will land).
- **Settings v5:** approved already (docs/mockups/settings-v5/).
- **A8:** one picture of the bar for a text-level selection (today's word bar with Paste ▾ and Delete).
- Approved already: the highlight and handles (refs/lasso-text-mock.png frames 1 and 4, without its format bar); the one box bar (docs/mockups/box-bar/); Settings › Tool bar › Selection bar (refs/selection-bar-presets-mock.png).

## 8. Decisions

**Answered by the owner (20 Nov):** keep today's Lasso, letters only with the cursor in the box; the Scribble test early; the bar's button order as drawn; an iPad check after each selection part; two lanes; must-never lines 1, 2, 3, 4, 6, 10; the three first parts; the method on one page.

**Answered on 20 Nov, later: the owner chose the pick in all five:**

1. **Where the timing tests run.** Pick: tests that only fail on slow cloud computers are first rewritten to wait for what they can see; the few that are truly about time (taps within a second, paint within 150 ms) run on this PC every night and before a release, and still stop a release when red.
2. **Equal boxes.** Pick: fix the 5 px difference (the owner's own rule of 18 Nov: every new box is the same).
3. **Paste ▾ in Touch and Computer modes.** Pick: keep it in every mode; Backspace and Enter stay Pencil-only.
4. **When the old text box files go.** Pick: a week after go-live, on the owner's word, so there is a way back during the first week.
5. **The 61 working copies.** Pick: one list, one approval, removed the safe git way; nothing with unsaved work is touched.

**Settings v5 joins this release (owner, 20 Nov: "let Settings join it, just make sure it is there too").** It is stage 5 in section 5 and a chapter of the full test.

**Six points agreed on 20 Nov (Fable's disagreements; docs/DECISIONS.md):** the route is chosen after A3; nothing optional holds the release, the switch-on is staged and a backup comes first; a fault only the iPad shows gets no new try without a new trace; two calm checks a day; one double-tap rule in both tools; the method is cut where its numbers do not pay.

**Fable's picks, logged, no answer needed:** the tap rule of 18 Nov (every tap acts at once, about a second between taps) replaces the 700 ms of Q-4, and the Tap speed row goes in E6; builders reuse existing working copies (no new permission); the place of the box ⋯ is settled in the pictures of B2; the three Goodnotes extras stay "later" until the owner says otherwise.

## 9. Assumptions to check (what might not be true)

Each has a check; if a check fails, the plan changes before more is built.

| We assume                                                                                   | Check                                                                                                   | Where      |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| The left-over outline and the "old selection" both come from a lift the iPad never reported | the replay test reproduces both; the owner's answers; a real trace from the quiet recorder              | A1, A2     |
| A Pencil in the air is visible to the app (hover) on the owner's iPad                       | seen in the owner's trace of 19 Nov; on a device without hover LS-52 and the 4 second rule are the nets | A1         |
| Switching from the Text tool to the Lasso keeps the typing cursor in its box                | the first test of A4; if not, the text level uses "the box edited last"                                 | A4         |
| A box that cannot be typed in is left alone by Scribble                                     | the Scribble test on the real iPad                                                                      | A3         |
| The add-on that reads the scenarios fits our test setup                                     | 4 hours at most, then the fallback                                                                      | B0         |
| The two lanes never need the same file at the same time                                     | the hot-file list; Opus hands out one turn at a time                                                    | every part |
| The owner can check on the iPad within a day of each selection part                         | measured per part in docs/metrics/tasks.csv                                                             | every part |

Each spec carries its own list too ("We assume" in lasso.md, text-select.md, selection-bar.md).

## 10. Not in this plan, and where it lives

Your layouts (after the owner has used the new Settings and tool bar). Phases 3 to 10. AI and the connector upgrade. The "App user stories" notebook through the connector (after this phase). Selecting in the Text tool itself (decided at the choice after A3). The three Goodnotes extras (ideas list). Shared parts step 3 (when a phase needs it). Tasks 0.10 and 0.13 (after the release). The mixed-selection filter on the bar and a bottom keyboard bar (owner: no).

## 11. Done when

Every scenario and every detail line of every part has a green test; the owner has ticked every `@ipad` scenario; E1 to E6 pass; the full test set is green; the owner says yes at E7.

## 12. Time

About 67 small parts: lane A about 45 hours of building, lane B about 66, Settings v5 about 62, the end about 34 (after the lenses and with Settings). With two lanes, one review per part and one iPad-size test run at a time: **about 15 to 18 days, an estimate** from the measured pace. The owner's check time is not counted. The first three merged parts give the real pace; Opus corrects the number then.

## Appendix A: part B0

**B0, rewritten after the owner's article (about 4 to 6 h): make the scenarios run and publish the report.**

- **SC-01** Scenarios live in feature files (the words Feature, Scenario, Given, When, Then, And, But), one per feature. From B0 on the feature file is the only home of a scenario's words; the spec links to it.
- **SC-02** Our own test runner (Playwright) reads them through the free add-on `playwright-bdd` (developer tool only, never shipped to users); each sentence maps to one step in `e2e/steps/`; scenarios run on chromium and ipad-webkit like every other test. **Trial, 4 hours at most.** If it does not fit our setup (config, push guard, CI, Windows), fall back: the scenarios stay in the spec's gherkin block, each test repeats the sentences as its steps, and the checker fails when the words differ.
- **SC-03** A sentence with no step behind it, or a scenario that is not run, fails the check.
- **SC-04** A scenario tagged `@ipad` runs its computer stand-in and shows as "needs the owner's iPad check" until the owner's tick (date, build, pass or fail) is recorded in docs/metrics/ipad-checks.md.
- **SC-05** The report (every feature, scenario and sentence with pass or fail, plus the iPad ticks) is published with every preview at one fixed address and linked from Settings › Try new features. Nothing secret is in it.
- **SC-06** Detail lines keep the id rule: a line with no test named after it, an id used twice, or a line without an id fails the check. The list of specs under the check may only grow.
- **SC-07** `OPEN:` in a part that is being built fails the check.
- **SC-08** All of it runs in the push guard and in CI.

## Appendix B: must-never lines for the Lasso

Ten were offered on 20 Nov; the owner picked 1, 2, 3, 4, 6 and 10 (docs/features/lasso.md LS-N1 to LS-N6). The other four are covered by detail lines or earlier owner rules.

## Appendix C: Goodnotes screenshots check (Fable, 20 Nov; all 13 pictures in docs/design/refs/ and refs/goodnotes-bar/2-more-menu.png)

Every button and behaviour in the owner's screenshots, against the app and this plan. **B1's button list must contain every row of this table.**

| Seen in Goodnotes                                                                          | In our app or plan                                                                                            | Result                                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Box bar: colour, size, Resize, Edit Text, Cut, Duplicate, Delete, ⋯                        | the one box bar (approved 18 Nov) and Edit Text in B4                                                         | covered                                              |
| Text bar with only the cursor: colour, size, Aa, B/I, align, list, highlight, **Paste**, ⋯ | brief section 10 missed the Paste button; ours: Paste ▾ shows with only the cursor                            | **added to B3**                                      |
| Text bar with words selected: the same, plus link, cut, copy at the end                    | B3 (buttons added at the end; the bar keeps its place)                                                        | covered                                              |
| **Edit Text puts the cursor at the end of the text**; the bar turns into the text bar      | not written before                                                                                            | **added to B4**                                      |
| A held button shows its name ("Edit Text", "Resize")                                       | our rule: names on a long press                                                                               | **added to B3**, every bar button                    |
| Delete is the only red button                                                              | not written before                                                                                            | **added to B3**                                      |
| Resize mode: 4 square corners, a turn handle, a short bar (Cut, Copy, Duplicate, Delete)   | ours shows the handles at once (C11, LS-22); ink turns; a text box does not turn (parked)                     | handles covered; box turning later                   |
| A box and the ink on it resized and turned as one piece                                    | ours: they move together (TB-32); the handles resize the ink only (LS-17)                                     | **open: owner decides** (later by default)           |
| ⋯: Cut, Copy, Duplicate, Paste, Paste and Match Style                                      | Paste ▾: Keep look, Plain text, More: Match style                                                             | covered                                              |
| ⋯: Front, Back                                                                             | not in the app; owner 18 Nov: not chosen; needs layers                                                        | **open: owner decides** (later by default)           |
| ⋯: Lock Textbox                                                                            | Lock box in the box ⋯ (built 18 Nov)                                                                          | covered                                              |
| ⋯: Take Screenshot                                                                         | Screenshot in the mixed menu and the Professional ⋯; Copy and Save as picture for ink                         | covered; B1 checks it for a box                      |
| ⋯: Create Element (save a selection to reuse as a sticker)                                 | not in the app                                                                                                | **open: owner decides** (ideas list)                 |
| ⋯: Writing Tools, Add to Image Playground, Ask Siri; the AI ✦ button                       | Apple's own items: a web page cannot add them; our AI waits for the cost OK                                   | cannot, or later                                     |
| Bottom keyboard bar (indent, lists, align, B I U S, mic, return)                           | owner: no. Underline and Strike are in the B/I strip, Indent in the Format card, Mic and Enter in the top row | covered; B1 proves each is reachable with the Pencil |
| The dashed loop stays round the selection; the bar sits below it, never on it              | ours: the loop fades into a dashed box with handles (LS-21, LS-22); the bar never covers the words            | covered (our look kept)                              |
| Undo and Redo top left; the Lasso's ▾ "what it selects"                                    | page top bar (2A.4); Picks                                                                                    | covered                                              |

**B1 also records, for every button, whether it really works today** (the Professional ⋯ lists Move, Scale, Rotate, Screenshot, Convert; some were "coming later" on 11 Nov). A button that does nothing is not put on the smart bar.
