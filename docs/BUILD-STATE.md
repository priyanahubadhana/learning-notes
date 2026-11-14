# Build state (rewritten in place, never appended)

**PAUSED by the owner, 14 Nov 2026, 11:10 IST. Do not start a phase manager or builders. Do not merge. Only the owner restarts the build.** Exception (owner, 14 Nov afternoon): one Fable helper is building the test set-up, tasks 0.4 and 0.8, in `ln-buildnext` and `ln-p0-fast`; no features.

Plan: [plans/phase-plan.md](plans/phase-plan.md). How helpers work: [HOW-WE-BUILD.md](HOW-WE-BUILD.md). Why the build was reset: [plans/build-diagnosis-2026-11-14.md](plans/build-diagnosis-2026-11-14.md). Numbers of the two old systems: plans/system-trial-2026-11-13.md.

**Next result for the owner:** after the restart (lean: the main chat on Opus, one or two builders), tasks 0.4 to 0.6; then the Phase 1 first look (the frame and Settings) with F1 to F9 re-checked.

## Fixed facts

- **Live app:** `main`. No new app code since 12 Nov (b5b0bc74); every new part is OFF. A push of app code to `main` deploys by itself; docs-only pushes do not.
- **Code line until Phase 0 task 0.7:** `build/next` 87969361, pull request #5 (never merge it by hand), working copy `C:\Users\pc\Downloads\ln-buildnext`. It runs the tests and publishes the preview. The test run on 87969361 (43562438919) was still going at the pause; check it with the refresh command.
- **Bookkeeping files** (this file, PENDING, CHANGELOG, DECISIONS) are written on `main`. Until task 0.7, merge `main` into `build/next` right after any such push, or the pull request clashes and no test run starts.
- **Preview address:** https://build-next.learning-notes-app.pages.dev . The parts the owner tests start ON there (build-next host only); the live address keeps them OFF.
- **Dexie:** highest version on `build/next` is 24; the phase manager gives out the next number, one task at a time.
- **Hot files** (one builder at a time, merged alone): `src/App.tsx`, `src/core/db.ts`, `src/core/types.ts`, `src/settings/builtinSettings.ts`, `src/app/flags.ts`, `package.json`, `playwright.config.ts`.
- **Local tests:** set `PW_PORT` to a free port for a hand-run Playwright; at most 2 iPad runs at once on this PC.
- **Always waits for the owner:** money, logins and Supabase, switching a part ON in the live app, possible data loss, a test on a real device, a real product decision.

## Refresh command

```bash
git fetch -q origin && for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/slice); do echo "$b $(git rev-parse --short $b) ahead $(git rev-list --count origin/build/next..$b) behind $(git rev-list --count $b..origin/build/next)"; done; gh run list --branch build/next --limit 3
```

"ahead 0" = fully merged into `build/next`.

## Phase 0 (reset), in the order of docs/plans/phase-plan.md section 6

| Task                                                                                                                 | State                                                                                                 | Next step                                                                                   |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 0.1 Rules, helper files, memory, PENDING, HANDOFF, this file; the method saved in the owner's global files           | done 14 Nov (Fable)                                                                                   | none                                                                                        |
| 0.2 Opus effort low to medium                                                                                        | done 14 Nov                                                                                           | none                                                                                        |
| 0.3 The real app's check green again (lint line in `mcp/src/setup.ts`, f6342473)                                     | fixed 14 Nov; run on `main` was going at the time of writing                                          | confirm green with `gh run list --branch main --limit 1`                                    |
| 0.4 Clear the paperwork clash: merge `main` into `build/next`                                                        | not started                                                                                           | first task after the restart: PENDING takes main's; CHANGELOG and DECISIONS keep both sides |
| 0.5 Merge the scrolling fix (F2, F3, F4, F6, F8)                                                                     | parked: `slice/fix-scroll-frame` 5e2c80f7 (ln-sfix-scroll), reviewed; merges cleanly (checked 14 Nov) | second task: merge alone, watch the test run                                                |
| 0.6 Test preset: pick a phase, one On/Off switch (Settings › Try new features)                                       | not started                                                                                           | third task: one builder, reviewed once; touches `src/app/flags.ts` (hot)                    |
| 0.7 One code line: `build/next` into `main`, parts OFF; retire `build/next`                                          | owner's yes given 14 Nov                                                                              | at the end of Phase 1, after the owner's test                                               |
| 0.8 Fast test set per merge, full set nightly                                                                        | in work since 14 Nov (Fable helper, owner asked for it now)                                           | main chat updates the docs when it reports                                                  |
| 0.12 Two safety programs: the same checks before every push on every branch; `npm run ci:sort` sorts each failed run | done 14 Nov: merged into `main` f4e90a93 (Sonnet builder; Opus review FAIL once, then PASS)           | none                                                                                        |
| 0.9 to 0.11 The three iPad tests, pulse script, unused working copies and the local lint count                       | waiting                                                                                               | when the owner moves to the full team                                                       |

## In the code line (`build/next`), by phase

| Phase | Parts already merged                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | foundation 0a to 0f, tool list 0i, update flow, security upgrade (these are also in the live app, OFF); shared parts steps 1 and 2; the frame with the BUG-006 fix; Settings v3; storage safety (cfebd3a4); owner fixes F1 + F7 recorder (b1aad3f8), F5 + F9 + preview defaults (1a8e0c66, test fix fe43d3dc) |
| 2A    | tool bar steps 1a to 1d; page menus 12a, 12b                                                                                                                                                                                                                                                                  |
| 3, 4  | Notebooks and Search v2                                                                                                                                                                                                                                                                                       |
| 5     | Home v2, Library v2                                                                                                                                                                                                                                                                                           |
| 6     | Review v2 (8a, 8c)                                                                                                                                                                                                                                                                                            |
| 8     | AI framework steps 1 to 5c and the Build screen                                                                                                                                                                                                                                                               |

## Parked: finished and reviewed, saved on GitHub, merged in their phase

| Part                     | Phase | Branch @ commit (working copy)                     | At the merge                                                                  |
| ------------------------ | ----- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Scrolling fix            | 0     | `slice/fix-scroll-frame` 5e2c80f7 (ln-sfix-scroll) | four small follow-ups                                                         |
| Shared parts step 3      | 1     | `slice/0g-parts-3` 9840315e (ln-s0g3)              | two gallery follow-ups                                                        |
| Tool bar 1e, 1f, BUG-003 | 2A    | `slice/1-toolbar-v8` 19e158cf (ln-s1)              | hot files: alone                                                              |
| Page menus rest          | 2A    | `slice/12-page-menus-rest` 627f07cf (ln-s12)       | hot files: alone                                                              |
| Review rest (8b)         | 6     | `slice/8b-review-rest` bfb6298d (ln-s8b)           | four follow-ups                                                               |
| Study tabs (15)          | 6     | `slice/15-study-v2` c1180092 (ln-s15)              | ST27 + ST11 wiring in App.tsx: alone                                          |
| Reader v2                | 7     | `slice/7-reader-v2` 2f78926f (ln-s7)               | eight follow-ups; touches playwright.config.ts: alone                         |
| AI framework step 6      | 8     | `slice/9-ai-framework-6` 0d94407d (ln-s9)          | hot test list                                                                 |
| AI cost additions        | 8     | `slice/9-ai-cost` 14b9e748 (ln-s9cost)             | after step 6; drop its EpubView guard (the Reader's ada7d1c5 fixes the cause) |

Parked parts fall behind the code line: merge the code line into each before merging it. They were reviewed under the old bar; each still gets the owner's first look in its phase.

## Not built

Text box v2 (`textbox.v2`, Phase 2B); things inside a page and media (`page.objects`, `media.v2`, Phase 9); safety and system layer (`safety.v2`, `system.v2`, Phase 10); AI framework steps 7 and 8 (Phase 8).

## Tests to know about

- Three iPad tests fail on this PC every time (task 0.9).
- `e2e/bigPageBudget.spec.ts` on CI counts only late frames caused by the app's own work, plus a median-frame check (owner-approved 14 Nov, b3f576b9).
- `paperBoxes:173` passed only on retry on 14 Nov.
