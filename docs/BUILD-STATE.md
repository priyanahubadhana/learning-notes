# Build state (rewritten in place, never appended)

BUILDING (20 Nov, Opus main chat, lean mode). Plan: docs/plans/phases/phase-2-finish.md (about 67 small parts, stages 0 to 5; estimate 15 to 18 days). Method: docs/METHOD.md. Code line `build/next` b8ddaf81. Owner check C0 under way: docs/plans/c0-findings-2026-11-20.md.

## Now

| Part     | Lane | Branch (working copy)                            | State                                                                                                                                   |
| -------- | ---- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| D0       | Opus | main + build/next                                | done 20 Nov (this file, PENDING, merge)                                                                                                 |
| A0       | A    | `slice/a0-lasso-freeze`                          | MERGED 512663cd (18 tests; bug A0-B1: Lasso menu width grip covers Thickness, test.fail until fixed)                                    |
| B0       | B    | `slice/b0-scenarios`                             | MERGED c1e6aa25 + fix 2ff99365 (npx --no); report at /scenarios/ after the next CI preview                                              |
| A2       | A    | `slice/a2-quiet-recorder` (ln-2a16), port 5183   | MERGED b6cbea7f (20 Nov); 20/20 clean: lassoFreeze with recorder 380/380 both browsers, own specs 420/420 both, bdd-ipad-webkit 200/200 |
| B1       | B    | `slice/b1-button-list` (ln-2a16)                 | MERGED 4b825720 (21 Nov); 115 buttons (94 work, 15 partly, 6 no), 156 tests; 20/20 chromium and ipad-webkit                             |
| B2       | Opus | main: docs/mockups/smart-bar/ (index.html, png/) | pictures ready 21 Nov; waiting for owner check C3 (3 questions in the page)                                                             |
| C0-1     | B    | `slice/c0-1-box-style`                           | MERGED b8ddaf81 (first box and phone adds get the new-box style; 7 tests)                                                               |
| C0-paste | B    | `slice/c0-paste`                                 | MERGED (C0-2 to C0-6: Pencil Paste, hover, iPad hint and refusal words, in-app copy until the window blurs, box-bar paste)              |
| C0-7     | B    | `slice/c0-7-hold`                                | MERGED (hold 0.5 s, 10 px, Pencil anywhere; Apple magnifier may still flash: owner check)                                               |

Next: owner checks C3 (smart bar pictures) and C1a (one Lasso trace, now on the preview) (one Lasso trace), A1a/A1b/A1c, A3, then the ten-minute route choice with the owner before A4. Owner meanwhile: catch-up check C0 (plan section 6).

## Done before this plan (proof in docs/plans/open-items-sweep-2026-11-20.md section 2)

Phase 1 re-test (16 Nov); 2A.4 to 2A.16 all merged (owner passed Part A, 16 Nov); C28 to C30b, C4 comma, C11/C18, C22, BUG-004, R21, B7 to B12 and the combined-test bugs merged; the wheel test moved (b2872d53); T10 eraser lag fixed in code (owner's feel not checked); BUG-001 one cause fixed (owner's case unconfirmed, recorder stays until E5); last merge before this plan `slice/ci-reds-4` f65b1fa6.

## Fixed facts

- **Live app:** `main`. No new app code since 12 Nov (b5b0bc74); every new part is OFF. A push of app code to `main` deploys by itself; docs-only pushes do not.
- **Code line until go-live (E7):** `build/next` a6e50fab, pull request #5 (never merge it by hand), working copy `C:\Users\pc\Downloads\ln-buildnext`. It runs the tests and publishes the preview.
- **Bookkeeping files** (this file, PENDING, CHANGELOG, DECISIONS) are written on `main`. Until task 0.7, merge `main` into `build/next` right after any such push, or the pull request clashes and no test run starts.
- **Preview address:** https://build-next.learning-notes-app.pages.dev . The parts the owner tests start ON there (build-next host only); the live address keeps them OFF.
- **Dexie:** highest version on `build/next` is 24 (checked 15 Nov); the manager gives out the next number, one task at a time.
- **Hot files** (one builder at a time, merged alone): `src/App.tsx`, `src/core/db.ts`, `src/core/types.ts`, `src/settings/builtinSettings.ts`, `src/app/flags.ts`, `package.json`, `playwright.config.ts`.
- **Local tests:** set `PW_PORT` to a free port; **one** ipad-webkit suite at a time on this PC (measured 14 Nov: two at once, 9 of 20 repeats failed; alone 20/20); the manager hands out the turn ("webkit free").
- **Always waits for the owner:** money, logins and Supabase, switching a part ON in the live app, possible data loss, a test on a real device, a real product decision.

## Refresh command

```bash
git fetch -q origin && for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/slice); do echo "$b $(git rev-parse --short $b) ahead $(git rev-list --count origin/build/next..$b) behind $(git rev-list --count $b..origin/build/next)"; done; gh run list --branch build/next --limit 3
```

"ahead 0" = fully merged into `build/next`.

## Phase 0 (reset)

Done: 0.1 to 0.6, 0.8, 0.12, 0.14; 0.11 (clean-up) only partly: many old working copies remain (list in E9) (14 Nov; details in docs/ARCHIVE.md headings and CHANGELOG). Open: **0.7** one code line (owner's yes; at the end of Phase 1; set `NIGHTLY_REF` in ci.yml to `main` in the same step; until then a hand-started run on `main` must tick "full"); **0.9** (now in 2B.1, merged) and **0.10** pulse script when there is a free hour; **0.13** try `isolation: worktree` on one task after 0.7.

## In the code line (`build/next`), by phase (summary; tasks.csv is the full record)

| Phase | Merged                                                                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | frame, shared parts 1 and 2, Settings v3 (not going live, question 1), storage safety, update flow; F1–F10, P1.1–P1.9, R5, R6, R8, R12, R13, R14, F8, BUG-006, test preset |
| 2A    | tool bar 1a–1f + BUG-003 (2A.1), ⋯ menus (2A.2), page menus 12a, 12b and rest + BUG-002 (2A.3)                                                                             |
| 2B    | 2B.1–2B.5, 2B.5b, 2B.7–2B.11, TB-17 (no 2B.6), all behind `textbox.v2`                                                                                                     |
| 3, 4  | Notebooks and Search v2                                                                                                                                                    |
| 5     | Home v2, Library v2                                                                                                                                                        |
| 6     | Review v2 (8a, 8c)                                                                                                                                                         |
| 8     | AI framework steps 1 to 5c and the Build screen                                                                                                                            |

## Parked: finished and reviewed, merged in their phase

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

## Not built

Settings v5 (stage 5 of the plan); text-level selection and the smart bar (stages 2 and 3); things inside a page and media (Phase 9); safety and system layer (Phase 10); AI framework steps 7 and 8 (Phase 8).

## Tests to know about

- CI-only (pass locally on both engines, 17 Nov run 43923017272; note, do not edit): ipad-webkit tb2-move TB-11/TB-14/TB-16, tb2-taps TB-04 (also chromium :176/:204/:220), tb2-pencil TB-37 shape cancel, paperInk rule 9, pageMenusSheet PM-64 (also chromium, passed on retry).
- CI-only, run 43947701514 (17 Nov; all pass here, do not edit): ipad-webkit c45-symbols-scribble timed taps :560/:623/:665/:741 (gaps asked 448 ms arrived 1000-1600 ms); cBoxesC21:73; eraserShapes:186 (both); lassoWords:206; lazyTapPaint:124 (paint within 150 ms); tb2-resize:405; tb2-taps:204; toolbarV8Favs:301; toolbarV9Polish:169 (5); tb2-move :98/:207/:247; tb2-pencil TB-37; chromium tb2-taps :176/:204/:220.
- CI-only, run 44139788125 (18 Nov; pass locally, not reproduced): ipad-webkit cBoxes C10b :328, toolbarV9LassoUse :7 (v8-row-more not stable), plus the same timing family as above (line numbers shifted).
- R15: undoHistory "50 random steps" red on ipad-webkit about 1 run in 5 (step 3).
- The phone wheel test is red on ipad-webkit until it moves (question 7).
- 7 desktop-only shell/leftPanel specs fail on ipad-webkit (step 1.3).
- `e2e/bigPageBudget.spec.ts` on CI counts only late frames caused by the app's own work, plus a median-frame check (owner-approved 14 Nov).
