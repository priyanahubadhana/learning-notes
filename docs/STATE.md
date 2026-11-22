# State

The one live state file (22 Nov 2026, part M1). It replaces PENDING.md, BUILD-STATE.md and HANDOFF.md; the full old texts are kept in docs/archive/ (PENDING-until-22-nov.md, BUILD-STATE-until-22-nov.md, HANDOFF-until-22-nov.md). Rewritten in place, never appended. Sections: Now, Needs you, Next, Parked.

The plan: [plans/stage-1-plan.md](plans/stage-1-plan.md) (stage 1, phases 1A to 1D); phase 1A detail: [plans/phases/phase-pc-1.md](plans/phases/phase-pc-1.md). Features: [FEATURES.md](FEATURES.md). The method: [METHOD-v2.md](METHOD-v2.md). What the owner decided: [design/owner-decisions.md](design/owner-decisions.md) and [DECISIONS.md](DECISIONS.md). Old docs: [archive/INDEX.md](archive/INDEX.md).

## Now

STOPPED cleanly 22 Nov 07:30 IST (the owner ended the session). A new phase-manager starts from this section. Replan count since Fable last planned (22 Nov): 1 of 10 (drag and dock of the Action bar moved to stage 1).

**Resume steps (morning, in order):**

0. **Red first:** e2e/firstBoxTap.spec.ts on build/next fails to load ("duplicate test title", line 335, 4 titles); the push guard blocks every slice push that runs it. Find the cause (possibly the main merge 8306ab77) and fix it before anything else.
1. **U0a** (`slice/u0a-update-repro`, working copy ln-2a16b; head 3f088e40 is LOCAL ONLY in ln-2a16b, not pushed because the push guard hit the red above; fix items 1 to 6 done, last full run 28 of 30 with the 2 reds fixed, repeat set not re-run). Finish the review fix list (real preview-host Cache-Control in U0a-2; U0a-11 must check something on WebKit; U0a-8 title; no empty box when the switch is off; version shown once; dark checked), then 20 of 20 on chromium and ipad-webkit, re-review, merge into build/next from ln-buildnext.
   1b. **Phase 1M, the build machine** (owner's yes on the plan, 22 Nov): after U0a merges, Opus runs docs/plans/phases/phase-1m-build-machine.md from 1M-02 (1M-01, the documents, done by Fable 22 Nov). Confirm sheet rows 1 to 11 all Yes (owner, 22 Nov, after the artifact read); 1M-02 may start as soon as U0a merges. U0c + S0 run beside it as the first tasks of the dry run if they are still open.
2. **U0c + S0** (from U0a's branch): the loop fix of docs/features/update-v2.md (Confirmed, all 22 rows) and the Update card at the top of today's Settings page in the v5 card style; tests red first, 20 of 20, one review.
   2b. **Design numbers fold (Opus, doc task, tiny):** fold the 18 "Decided 22 Nov" lines of docs/design/principles.md into system.md, the shell spec, quality-standard.md and tool bar v8 so one table holds the numbers; then draw the ten principle pictures (the owner confirmed the page; the clashes are settled).
3. **Found-wishes sweep** (Opus builder): docs/plans/found-wishes-2026-11-22.md as a confirm sheet (DECISIONS 22 Nov 06:00).
4. **M5** analyze v1, then **M9** the eleven part cards (stop for Fable's attack read), then **M6** the weekly card (Saturday evening), **M7** the research page.
5. After the owner's pass on found wishes: archive the old plan pages; ROADMAP.md becomes a pointer to MASTER-PLAN.md.
6. Site: home order (MASTER-PLAN first), Stage badge, pillar letters, the red Must-never box. The ten principle pictures stay on hold until the owner confirms principles.md.

Working copies: ln-m1, ln-m2, ln-u0b are worktrees whose node_modules is a junction to the main copy (never npm install there); ln-2a13 is detached. ln-buildnext has its own packages (marked added 22 Nov).

### Phase 1A

| Part                                                                  | Branch (working copy)               | State                                                                                                            |
| --------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| M4                                                                    | main                                | DONE 22 Nov (site live)                                                                                          |
| M1                                                                    | `tool/m1-archive`, `tool/m1-fix2`   | MERGED 1d250d96 (3 review rounds); CLAUDE.md, .claude paths done by Fable; rules/ and next.md in M8              |
| U0a                                                                   | `slice/u0a-update-repro` (ln-2a16b) | built c692dc2c, loop reproduced on WebKit slow line; review FAIL, 6 fixes with builder a2de4da29ebff2aa9         |
| U0b                                                                   | main 436a36f8                       | MERGED; update-v2.md Confirmed 22 Nov, all 22 rows; row 14 pictures approved by the owner 22 Nov (artifact read) |
| M2                                                                    | `tool/m2-spec-kit`                  | MERGED 22 Nov (Spec Kit v1.4.3, template synced and checked in CI; implement, converge off)                      |
| U0c + S0                                                              | -                                   | after U0a merges (same builder); update-v2 fully Confirmed, S0 card allowed                                      |
| M3                                                                    | `tool/m3-issues`                    | MERGED 22 Nov: 43 issues #7 to #49 with old ids, labels, phone bug form                                          |
| Ideas sort + Pillar column                                            | `tool/1a-ideas-pillars`             | MERGED 22 Nov (F-200 to F-351, 14/82/56 by stage; Pillar column)                                                 |
| M8 (rules/, HOW-WE-BUILD, next.md)                                    | `tool/m8-rules`                     | MERGED 22 Nov after 2 reviews (last item, the reuse-gate pointer, done by the manager)                           |
| Found wishes, M5, M9, M6, M7, old plans archive, site home and badges | -                                   | planned, in this order; principle pictures held (owner)                                                          |

### Phase 2-finish lanes (history, 20 to 21 Nov)

| Part                       | Lane | Branch (working copy)                            | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ---- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D0                         | Opus | main + build/next                                | done 20 Nov (this file, PENDING, merge)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A0                         | A    | `slice/a0-lasso-freeze`                          | MERGED 512663cd (18 tests; bug A0-B1: Lasso menu width grip covers Thickness, test.fail until fixed)                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| B0                         | B    | `slice/b0-scenarios`                             | MERGED c1e6aa25 + fix 2ff99365 (npx --no); report at /scenarios/ after the next CI preview                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| A2                         | A    | `slice/a2-quiet-recorder` (ln-2a16), port 5183   | MERGED b6cbea7f (20 Nov); 20/20 clean: lassoFreeze with recorder 380/380 both browsers, own specs 420/420 both, bdd-ipad-webkit 200/200                                                                                                                                                                                                                                                                                                                                                                                               |
| B1                         | B    | `slice/b1-button-list` (ln-2a16)                 | MERGED 4b825720 (21 Nov); 115 buttons (94 work, 15 partly, 6 no), 156 tests; 20/20 chromium and ipad-webkit                                                                                                                                                                                                                                                                                                                                                                                                                           |
| B2                         | Opus | main: docs/mockups/smart-bar/ (index.html, png/) | C3 FAILED 22 Nov (owner): pin missing, Edit missing, Delete and Copy inconsistent, not clean; the owner answered the inventory doubts and four questionnaire rounds (DECISIONS 22 Nov); next: the Action bar spec on template v2 (docs/features/action-bar.md, from selection-bar.md) with the tool list per state and a confirm sheet; pictures PC, iPad sideways, iPad upright, phone only after the sheet; a script checks every picture against the inventory table                                                               |
| B10-1                      | B    | `slice/b10-1-redo-one-step` (ln-2a16)            | MERGED 4a85e8b0 (21 Nov); R15 cause: Undo stayed on until a slow step ended, a quick extra click counted; fix in pageHistory.ts; 20/20 both                                                                                                                                                                                                                                                                                                                                                                                           |
| B10-2, B10-11, B10-10      | B    | three slices (ln-2a16)                           | MERGED f46e89ea (21 Nov): Shadow card tile visible (BoxCard.tsx); Keep look and Patrick Hand licence were already right, tests now lock them; 20/20 both                                                                                                                                                                                                                                                                                                                                                                              |
| B10-3, B10-6, B10-8        | B    | three slices (ln-2a16)                           | MERGED 94b19191 (21 Nov): R18 not reproduced, locked by tests (very low box under the tab bar not driven); R20 fixed (two taps in 0.5 s rename, touch devices); P-18 line icons in page and lock menus; 20/20 both                                                                                                                                                                                                                                                                                                                    |
| B10-4, B10-5, B10-7, B10-9 | B    | four slices (ln-2a16)                            | MERGED fb3d7eec (21 Nov): divider test; TB-24 closed (test was fixed by e0a07699); More arrow never over Backspace, locked; toast 24 px above the tab bar (port of slice/shell-fixes, which can be closed); 20/20 both                                                                                                                                                                                                                                                                                                                |
| B11 test health            | B    | ln-2a16                                          | IN PROGRESS (21 Nov): microBar, miniBar, TB-09, presetPhases MERGED cc964db5; F6 + HOLD-MOVE MERGED; LB-PERF MERGED; drawer jump + b10-6 MERGED 28c9a8ad; aiPicker drag race MERGED 0c864054; part 1 MERGED 8d41a2e8 (desktop-only specs size-aware, toolsRefresh checked, 20/20 both); full ipad-webkit run x2 measured: 2218 tests, real failures: aiPicker, LB-PERF, b10-6 pictures in both runs; 11 in one run only (timing). The 13 SB and LS-33 hits were expected-fail tests (known bugs), miscounted at first; fix order sent |
| C0-1                       | B    | `slice/c0-1-box-style`                           | MERGED b8ddaf81 (first box and phone adds get the new-box style; 7 tests)                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| C0-paste                   | B    | `slice/c0-paste`                                 | MERGED (C0-2 to C0-6: Pencil Paste, hover, iPad hint and refusal words, in-app copy until the window blurs, box-bar paste)                                                                                                                                                                                                                                                                                                                                                                                                            |
| C0-7                       | B    | `slice/c0-7-hold`                                | MERGED (hold 0.5 s, 10 px, Pencil anywhere; Apple magnifier may still flash: owner check)                                                                                                                                                                                                                                                                                                                                                                                                                                             |

Next: owner checks C3 (smart bar pictures) and C1a (one Lasso trace, now on the preview) (one Lasso trace), A1a/A1b/A1c, A3, then the ten-minute route choice with the owner before A4. Owner meanwhile: catch-up check C0 (plan section 6).

### Done before this plan (proof in docs/archive/plans/open-items-sweep-2026-11-20.md section 2)

Phase 1 re-test (16 Nov); 2A.4 to 2A.16 all merged (owner passed Part A, 16 Nov); C28 to C30b, C4 comma, C11/C18, C22, BUG-004, R21, B7 to B12 and the combined-test bugs merged; the wheel test moved (b2872d53); T10 eraser lag fixed in code (owner's feel not checked); BUG-001 one cause fixed (owner's case unconfirmed, recorder stays until E5); last merge before this plan `slice/ci-reds-4` f65b1fa6.

### Fixed facts

- **Live app:** `main`. No new app code since 12 Nov (b5b0bc74); every new part is OFF. A push of app code to `main` deploys by itself; docs-only pushes do not.
- **Code line until go-live (E7):** `build/next` a6e50fab, pull request #5 (never merge it by hand), working copy `C:\Users\pc\Downloads\ln-buildnext`. It runs the tests and publishes the preview.
- **Bookkeeping files** (this file, PENDING, CHANGELOG, DECISIONS) are written on `main`. Until task 0.7, merge `main` into `build/next` right after any such push, or the pull request clashes and no test run starts.
- **Preview address:** https://build-next.learning-notes-app.pages.dev . The parts the owner tests start ON there (build-next host only); the live address keeps them OFF.
- **Dexie:** highest version on `build/next` is 24 (checked 15 Nov); the manager gives out the next number, one task at a time.
- **Hot files** (one builder at a time, merged alone): `src/App.tsx`, `src/core/db.ts`, `src/core/types.ts`, `src/settings/builtinSettings.ts`, `src/app/flags.ts`, `package.json`, `playwright.config.ts`.
- **Local tests:** set `PW_PORT` to a free port; **one** ipad-webkit suite at a time on this PC (measured 14 Nov: two at once, 9 of 20 repeats failed; alone 20/20); the manager hands out the turn ("webkit free").
- **Always waits for the owner:** money, logins and Supabase, switching a part ON in the live app, possible data loss, a test on a real device, a real product decision.

### Refresh command

```bash
git fetch -q origin && for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/slice); do echo "$b $(git rev-parse --short $b) ahead $(git rev-list --count origin/build/next..$b) behind $(git rev-list --count $b..origin/build/next)"; done; gh run list --branch build/next --limit 3
```

"ahead 0" = fully merged into `build/next`.

## Needs you

- **Read it formatted:** https://priyanahubadhana.github.io/learning-notes/ (the method page has tappable sheet rows and a Copy-my-answers button; paste the result in the chat).
- **Now (22 Nov):** the method and the plan are confirmed. Needs you: (1) the six install-and-update facts (device and browser; live or preview; what "download" means; what you saw in order; how often and when last; the version shown), since you chose that bug first; (2) the one bar's name, "Action bar" unless you say otherwise. Plan: docs/plans/phases/phase-pc-1.md sections 17 and 18.

Older items (20 Nov, part D0). The old plan: [plans/phases/phase-2-finish.md](plans/phases/phase-2-finish.md).

- **Now:** the 20-minute catch-up check **C0** on the preview, with "Circle recorder" off (plan section 6 lists the 11 items). Do it in a calm window, morning or evening.
- **Reminder (owner asked, 21 Nov):** set up Notion in a new chat (the tools did not load in the old one), then the Notion mirror of plan, specs and bugs (docs/IDEAS.md).
- **Due:** check **C1a**, one five-minute Lasso session with the quiet recorder on (Settings › Try new features › Lasso recorder); A2 merged 20 Nov.
- **Due:** check **C3**, approve the smart bar pictures (docs/mockups/smart-bar/, 14 pictures, 3 questions): yes, or "picture N: change X". Nothing after B2 in lane B is built before this yes.
- **Sign-offs later:** docs/features/text-select.md (before A4) and docs/features/selection-bar.md (after the B2 pictures).
- **Leftovers you may delete when you like:** the old working copies and power-cut leftovers (list comes in part E9). The permission check blocks new working copies with a link, so old ones are reused.
- **Small, not urgent:** Decisions to review in docs/DECISIONS.md; the security-header check (Google sign-in, Drive, fonts; part E6); the AI test key shows masked and Test passes (never paste it in chat); Supabase Phase 8 connector job tools (needs your OK then).
- **Developer-tool warnings (20 Nov audit):** glob and minimatch, moderate, build tools only (the app itself has none). The offered fix downgrades the offline plugin (breaking), so it is not applied; re-checked at each phase end.

Preview address: https://build-next.learning-notes-app.pages.dev (the parts you test start ON there). The live app has had no new code since 12 Nov.

## Next

Stage 0 order (plan section 16): M1 and U0a now, then U0b, M2, M3, M8, M5, M9, M6, M7. U0a starts on day 1 in lane 2; U0b and U0c start the moment the owner's facts arrive.

### Phase 0 (reset), open parts

Done: 0.1 to 0.6, 0.8, 0.12, 0.14; 0.11 (clean-up) only partly: many old working copies remain (list in E9) (14 Nov; details in docs/ARCHIVE.md headings and CHANGELOG). Open: **0.7** one code line (owner's yes; at the end of Phase 1; set `NIGHTLY_REF` in ci.yml to `main` in the same step; until then a hand-started run on `main` must tick "full"); **0.9** (now in 2B.1, merged) and **0.10** pulse script when there is a free hour; **0.13** try `isolation: worktree` on one task after 0.7.

### Not built

Settings v5 (stage 5 of the plan); text-level selection and the smart bar (stages 2 and 3); things inside a page and media (Phase 9); safety and system layer (Phase 10); AI framework steps 7 and 8 (Phase 8).

### After the build (from HANDOFF 16 Nov, still true)

1. Restart the four helpers above (one task each; Sonnet builds, Opus for C21, Fable for C19). Each one: tests first, real Pencil input (e2e/realPen.ts), `--global-timeout=1200000`, its own PW_PORT, only one ipad-webkit run at a time (check `tasklist | findstr /i webkit`).
2. Review each slice once (`reviewer`). The main chat then merges it into build/next in C:\Users\pc\Downloads\ln-buildnext, because helpers can't push to build/next. Merge `origin/main` in each time; in DECISIONS.md clashes, keep both sides. Add each new spec to the ipad-webkit testMatch in playwright.config.ts (manager-approved), and run it there once.
3. Wait for CI (`gh run watch <id>`; `node scripts/ci-sort.mjs --run <id>` sorts failures).
4. Send the owner a short re-test list of just the open items (C18, C19, C20, C21, C22, and the Tap speed choice).
5. When everything passes: ask the owner's yes for go-live (task 0.7 with the live-check fix `slice/live-check-sha` af19a586).
6. After that: Phase 2B finish (2B.12, 2B.13, R15, T25, T26, R18, R20), then the Settings v5 rebuild.

### Your tests waiting

- **First preview checklist:** [archive/plans/ipad-checklist-first-preview.md](archive/plans/ipad-checklist-first-preview.md). Parts 1 and 2 done on 14 Nov. Each phase page will carry only its own steps.
- **Older tests (9 to 12 Nov):** [plans/owner-checks-pending.md](plans/owner-checks-pending.md). Owner, 14 Nov: tests for screens the redesign replaces are dropped when that phase is planned; tests for things that stay are folded into the test list of their phase (most are text box and Pencil, so Phase 2B).

### Decide before public launch

- Supabase paid plan (about US$25 a month). No cost now.

## Parked

### Rules and re-test list of 16 Nov (superseded where the PC-1 plan replaces them)

- **Owner's rule (16 Nov):** nothing goes into the live app (`main`, task 0.7) until every bug is fixed and the owner has tested it all; then Phase 1, the tool bar and the text box go live together, on the owner's yes. SUPERSEDED in part: PC-1 works on the PC first and the Pencil work is parked (plan section 9); the live-app rule itself stands.
- **Owner has passed (16 Nov):** combined test parts A to D; on re-test: C2 eraser, the tool bar fixes (C3, C6, C7, C9), Delete box, one selected box at a time, resize never types, the mic strip (C17).
- **Merged into build/next, waiting for the owner's re-test (16 Nov):** C4, C5, C14 (Scribble, symbols, tap timing), C12, C13, C15, C16, C8, C10, C11 (box group), C17, C18 (strip part), C20 (first part); then C18b/C20b, C19, C21, C22 merged after one review each. Re-test list: docs/archive/plans/combined-test-2026-11-16.md. SUPERSEDED where the PC-1 plan or checks C0 to C3 replace them (Pencil items are parked).

### Phase board

| Phase | What                                                    | State                                                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Reset: clean rules, the real app check, the test preset | rules cleaned, the clash cleared (0.4), the fast test set (0.8), the two safety programs (0.12) and the clean-up (0.11) done 14 Nov; the scroll fix (0.5) merged and green; 0.6 (test preset) and 0.14 (eslint update) merged and green; Phase 0 tasks before the first look are done |
| 1     | The frame and Settings                                  | fixes merged; re-test passed 16 Nov; goes live with 2A and 2B (E7)                                                                                                                                                                                                                    |
| 1S    | Settings v5                                             | picture approved 15 Nov; stage 5 of phase-2-finish (rides along only if passed)                                                                                                                                                                                                       |
| 2A    | Writing tools: tool bar, page menus                     | v9 rebuild 2A.4 to 2A.16 merged; owner passed Part A 16 Nov                                                                                                                                                                                                                           |
| 2B    | Text box and Pencil                                     | merged behind its switch; finishing in phase-2-finish (Lasso, text selection, smart bar)                                                                                                                                                                                              |
| 3     | Notebooks                                               | built                                                                                                                                                                                                                                                                                 |
| 4     | Search                                                  | built                                                                                                                                                                                                                                                                                 |
| 5     | Home and Library                                        | built                                                                                                                                                                                                                                                                                 |
| 6     | Review and Study                                        | mostly built; two parts parked                                                                                                                                                                                                                                                        |
| 7     | Reader                                                  | built, parked                                                                                                                                                                                                                                                                         |
| 8     | AI and the Claude connector                             | partly built                                                                                                                                                                                                                                                                          |
| 9     | Things inside a page; pictures, PDF, audio              | needs its artifact                                                                                                                                                                                                                                                                    |
| 10    | Safety and data; system layer; welcome and tours        | needs its artifact                                                                                                                                                                                                                                                                    |

Branches and commit ids of every parked part: the tables below.

- **Connector upgrade (owner, 16 Nov):** the connector must write everything the app has: toggles, text colours, pictures, mind map blocks, databases and rows, tags, page tabs, Summary tab, notebook covers, the four levels; one shared action list for the connector, in-app AI and API keys. Keep each Gemini answer + frames to rebuild test notebooks in full later. Plan before build.
- **Gemini prompt v3 test (owner, 16 Nov):** later; docs/recipes/gemini-youtube-prompt-v3.md.

- **After the 20 Nov limit reset (owner OK 16 Nov):** make the "App user stories" notebook in the app via the connector: epics first (about 15 pages, one line + status ✅/🔄/🆕 each), owner checks, then stories per epic. Base: docs/archive/plans/user-story-study-pack.md. Then pictures and the plan with Fable. Do not use the owner's API credit.

### In the code line (build/next), by phase

| Phase | Merged                                                                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | frame, shared parts 1 and 2, Settings v3 (not going live, question 1), storage safety, update flow; F1–F10, P1.1–P1.9, R5, R6, R8, R12, R13, R14, F8, BUG-006, test preset |
| 2A    | tool bar 1a–1f + BUG-003 (2A.1), ⋯ menus (2A.2), page menus 12a, 12b and rest + BUG-002 (2A.3)                                                                             |
| 2B    | 2B.1–2B.5, 2B.5b, 2B.7–2B.11, TB-17 (no 2B.6), all behind `textbox.v2`                                                                                                     |
| 3, 4  | Notebooks and Search v2                                                                                                                                                    |
| 5     | Home v2, Library v2                                                                                                                                                        |
| 6     | Review v2 (8a, 8c)                                                                                                                                                         |
| 8     | AI framework steps 1 to 5c and the Build screen                                                                                                                            |

### Parked parts: finished and reviewed, merged in their phase

| Part                      | Phase | Branch @ commit (working copy)                            | At the merge                                                           |
| ------------------------- | ----- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Shell fix: toast position | 1     | `slice/shell-fixes` e8f5b6a0 (ln-sshell), on this PC only | never reviewed; Opus checks it in step 1.3; keep the working copy      |
| Shared parts step 3       | 1     | `slice/0g-parts-3` 9840315e (ln-s0g3)                     | two gallery follow-ups                                                 |
| Review rest (8b)          | 6     | `slice/8b-review-rest` bfb6298d (ln-s8b)                  | four follow-ups                                                        |
| Study tabs (15)           | 6     | `slice/15-study-v2` c1180092 (ln-s15)                     | ST27 + ST11 wiring in App.tsx: alone                                   |
| Reader v2                 | 7     | `slice/7-reader-v2` 2f78926f (ln-s7)                      | eight follow-ups; touches playwright.config.ts: alone                  |
| AI framework step 6       | 8     | `slice/9-ai-framework-6` 0d94407d (ln-s9)                 | hot test list                                                          |
| AI cost additions         | 8     | `slice/9-ai-cost` 14b9e748 (ln-s9cost)                    | after step 6; drop its EpubView guard (the Reader's ada7d1c5 fixes it) |

Parked parts fall behind the code line: merge the code line into each before merging it. Each still gets the new side-by-side check against its approved picture and the owner's first look in its phase.

### Open problems

One source: [GitHub Issues](https://github.com/priyanahubadhana/learning-notes/issues). Every old id is in the issue title in brackets, for example "[C1A-3]". New bugs: [file one with the form](https://github.com/priyanahubadhana/learning-notes/issues/new?template=bug.yml).

### Later (in no phase yet)

- Reader presets (Read, Light study, Deep study) and the cross-book Highlights database.
- Study modes (summary layers, theme pages, links between notes, quiz and teach-back).
- TB-58 Pro unlock (more than six colours per tool): no task plans Pro gating yet; six is the cap for everyone (2A.13 review, 16 Nov). Tool-chip order moved out of 2A.13 (DECISIONS).
- Custom Views (parked 12 Nov). Layers, rotation, shrink a box to scale its text, snapshot Lasso (with Phase 9's artifact).
- Old carried-over items from HANDOFF (archived 14 Nov): looked at when the phase they belong to is planned.
- Voice replies (the "voicemode" add-on): switched off on 14 Nov because it fails to start on this PC. The owner wants it working, with its on/off switch, as a small job after Phase 1 on a day when no build runs. Likely cause to check first: Windows blocks the unsigned Python it needs.

- **Noted (15 Nov, P1.9):** 7 shell/leftPanel e2e fail on ipad-webkit on plain build/next too: these specs are not on the ipad-webkit list and assume a desktop-width window. Not on the code line; to sort out in the polish sweep (make them size-aware or keep them desktop-only by design).

- **Power cut (15 Nov, night):** git repaired from GitHub (main and slice/2a4 refs, two indexes, zeroed files restored); nothing pushed was lost. Leftovers you may delete when you like: `.git/index.corrupt-2026-11-15`, `.git/worktrees/ln-2a4/index.corrupt`, and the scratchpad `powercut` folder.

  Owner deleted one 'November 2026' page by hand on 16 Nov; the Journal repair (journal.monthRepair, preview only) stays as a guard against new duplicates.

- **Live site check fix ready (16 Nov):** slice/live-check-sha af19a586 (the check compares live with the newest commit that changes what ships; passes now). Not merged on purpose: a push to main with non-docs files redeploys the live app (same app, new version number), which needs the owner's yes. Merge it together with task 0.7 (Phase 1 go-live).

### Tests to know about

- CI-only (pass locally on both engines, 17 Nov run 43923017272; note, do not edit): ipad-webkit tb2-move TB-11/TB-14/TB-16, tb2-taps TB-04 (also chromium :176/:204/:220), tb2-pencil TB-37 shape cancel, paperInk rule 9, pageMenusSheet PM-64 (also chromium, passed on retry).
- CI-only, run 43947701514 (17 Nov; all pass here, do not edit): ipad-webkit c45-symbols-scribble timed taps :560/:623/:665/:741 (gaps asked 448 ms arrived 1000-1600 ms); cBoxesC21:73; eraserShapes:186 (both); lassoWords:206; lazyTapPaint:124 (paint within 150 ms); tb2-resize:405; tb2-taps:204; toolbarV8Favs:301; toolbarV9Polish:169 (5); tb2-move :98/:207/:247; tb2-pencil TB-37; chromium tb2-taps :176/:204/:220.
- CI-only, run 44139788125 (18 Nov; pass locally, not reproduced): ipad-webkit cBoxes C10b :328, toolbarV9LassoUse :7 (v8-row-more not stable), plus the same timing family as above (line numbers shifted).
- R15: undoHistory "50 random steps" red on ipad-webkit about 1 run in 5 (step 3).
- The phone wheel test is red on ipad-webkit until it moves (question 7).
- 7 desktop-only shell/leftPanel specs fail on ipad-webkit (step 1.3).
- `e2e/bigPageBudget.spec.ts` on CI counts only late frames caused by the app's own work, plus a median-frame check (owner-approved 14 Nov).

### Known loose ends (HANDOFF)

- TB-24 (e2e/tb2-bar.spec.ts) fails on a clean build/next checkout on this PC but passes in CI: find out why before the release.
- Under heavy local load, cBoxes C12 and c45 C14 failed once each, then passed alone. Watch CI.
- Stray working copies to tidy later (deletes need the owner): `ln-c21-base/` inside this repo (untracked, made by the C21 helper; not committed), the scratchpad worktree `wtcb`, ../ln-c45x (branch esc/c45-fix), ../ln-c45, ../ln-cboxes, ../ln-c36, ../ln-c2, and the power-cut leftovers listed in docs/PENDING.md.

### Files and restart

`npm run dev` serves https on the Wi-Fi for the iPad. Browser tests run on the built app (`npm run test:e2e` builds first). Never upload to Cloudflare by hand. Never run npm ci or npm install in a linked working copy.
