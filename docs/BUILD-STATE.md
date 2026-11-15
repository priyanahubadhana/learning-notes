# Build state (rewritten in place, never appended)

**RUNNING, full team for Phase 2A (owner answer 4A, 15 Nov):** one `phase-manager` (Opus, medium) runs up to 3 Sonnet builders; lean again after the phase. Rewritten 15 Nov, evening.

**Now:** Phase 1 fixes are done and merged into `build/next` (P1.8 update screens 8523d22d, P1.9 frame covers 8105fcba). No helper is running. **Next:** the owner's Phase 1 re-test, then task 0.7 and Phase 1 live; then the 2A tool bar rebuild to mock v9. The ordered list with sizes and likely times: [plans/phase-plan.md](plans/phase-plan.md) section 0. Waiting for the owner: [plans/questions-2026-11-15.md](plans/questions-2026-11-15.md) (8 questions) and PENDING "Needs you".

## The order (details in phase-plan.md section 0)

| #   | Step                                       | State                                                       | Likely time   |
| --- | ------------------------------------------ | ----------------------------------------------------------- | ------------- |
| 1   | Phase 1 re-test, fixes, task 0.7, live     | waiting for the owner's re-test                             | 1 day         |
| 1a  | Journal merge (H), backup first            | owner said yes; how: question 6                             | 2 hours       |
| 2   | Phase 2A: tool bar rebuilt to v9 (2A.4–16) | full team (phase-manager, 4A); see the 2A table below       | 3 to 4 days   |
| 3   | Phase 2B: 2B.12, 2B.13 and 6 bugs, live    | 2B.1–2B.11 merged behind `textbox.v2`                       | 2 to 3 days   |
| 4   | Phase 1S: Settings v5 (S.1–S.11)           | picture approved 15 Nov; recount 169 switches first         | 3 to 5 days   |
| 5   | Your layouts                               | after the owner's Settings and tool bar test; picture first | not known yet |
| 6–7 | Phases 3 to 8, then 9 and 10               | 3–8 mostly built; 9–10 need pictures                        | not known yet |

## Phase 2A tasks (phase-manager, from 15 Nov; webkit turn handed out by the manager)

**HOLD (main chat, 15 Nov):** no merge or push to `build/next` until "owner test done" (owner's Phase 1 re-test). Webkit lent to the Journal repair (H) until the main chat says done.

| Task  | Branch @ head (working copy)         | State                                                                                     |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| 2A.4  | `slice/2a4` merged b7ba4ede (ln-2a4) | MERGED, CI green (run 43707918937); ipad-webkit config does not list its spec             |
| 2A.5  | `slice/2a5` d0dcb56e (ln-2a5)        | review PASS (after 2 FAILs; Opus builder took over); next webkit, then merge              |
| 2A.14 | `slice/2a14` 8722dcc1 (ln-2a14)      | Layout row added (owner); FAIL: match approved settings-rows pictures; fixes with builder |
| rule  | 2A.14's settings rows + Layout       | pictures owner-approved 15 Nov (docs/mockups/toolbar-v9/settings-rows/)                   |
| wheel | `slice/tb2-phone-wheel`              | merged b2872d53, CI green (run 43704785412)                                               |
| rest  | 2A.6–2A.13, 2A.15, 2A.16             | not started; next after the first three merge (shared tool bar files)                     |

## Waiting (each has its step)

- **Phase 2B (step 3):** 2B.12, 2B.13; T25 Scribble space after "/"; T26 write over a selected word; R15 one redo step (red "50 random steps" on ipad-webkit, stops the 2B release); R18 phone dots near the page end; R17 Shadow card tile; the narrow-box line overlap (`--box-line`); the wheel test move: merged into `build/next` b2872d53 (15 Nov).
- **Phase 2A (step 2):** T10 eraser lag with highlights only (in 2A.8).
- **Phase 1 polish (step 1.3):** 7 shell/leftPanel e2e fail on ipad-webkit (desktop-only specs, not on its list; make them size-aware or mark desktop-only); F7 freeze recorder; remove the Pencil check recorder.
- **Settings v5 (step 4):** recount the 169 v3 switches (mock shows 113); keep the per-setting "this device / everywhere" menu and "Turn on all in this group"; "Reset to Simple starter".

## Fixed facts

- **Live app:** `main`. No new app code since 12 Nov (b5b0bc74); every new part is OFF. A push of app code to `main` deploys by itself; docs-only pushes do not.
- **Code line until task 0.7:** `build/next` 8105fcba, pull request #5 (never merge it by hand), working copy `C:\Users\pc\Downloads\ln-buildnext`. It runs the tests and publishes the preview.
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

Done: 0.1 to 0.6, 0.8, 0.11, 0.12, 0.14 (14 Nov; details in docs/ARCHIVE.md headings and CHANGELOG). Open: **0.7** one code line (owner's yes; at the end of Phase 1; set `NIGHTLY_REF` in ci.yml to `main` in the same step; until then a hand-started run on `main` must tick "full"); **0.9** (now in 2B.1, merged) and **0.10** pulse script when there is a free hour; **0.13** try `isolation: worktree` on one task after 0.7.

## In the code line (`build/next` 8105fcba), by phase

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

Settings v5 (Phase 1S); tool bar v9 cards (2A.4–2A.16); things inside a page and media (Phase 9); safety and system layer (Phase 10); AI framework steps 7 and 8 (Phase 8).

## Tests to know about

- R15: undoHistory "50 random steps" red on ipad-webkit about 1 run in 5 (step 3).
- The phone wheel test is red on ipad-webkit until it moves (question 7).
- 7 desktop-only shell/leftPanel specs fail on ipad-webkit (step 1.3).
- `e2e/bigPageBudget.spec.ts` on CI counts only late frames caused by the app's own work, plus a median-frame check (owner-approved 14 Nov).
