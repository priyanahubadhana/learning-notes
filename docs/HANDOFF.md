# Handoff

**START HERE (20 Nov 2026, planning with Fable finished).** Read docs/METHOD.md (one page: how a part runs), then docs/plans/phases/phase-2-finish.md (the complete plan: about 50 small parts, stages 0 to 4, two lanes, the owner's checkpoints C0 to C13, five answered questions), then docs/plans/lasso-bugs-a-b-note.md. First parts: **D0** (make PENDING, BUILD-STATE and user-stories-2b true from docs/plans/open-items-sweep-2026-11-20.md; merge `main` into `build/next`), then **A0** (lane A) and **B0** (lane B) together, then A2, check C1a, A1, A3. Specs: docs/features/lasso.md (signed off), text-select.md and selection-bar.md (drafts: run the builder and tester lenses, then ask the owner to sign off, before A4 and B3). **Two standing rules from the owner:** name the iPad check that is due under "Needs you" and repeat the waiting checks at the end of every message; end every message with the Lasso reminder line until check C1 has passed. The owner does the catch-up check C0 while the first parts are built. The 16 Nov text below is older.

**START HERE (written 16 Nov 2026, 14:35 IST, just before the weekly Claude limit ran out; it resets 20 Nov, 00:30 IST).** Read this file, then docs/plans/combined-test-2026-11-16.md (every bug C2–C22 with its cause, fix and owner answers), then docs/BUILD-STATE.md. Only BUILD-STATE says whether the build is paused; this file never does.

Older notes are in docs/ARCHIVE.md under "HANDOFF entries archived 14 Nov 2026" (search that heading only).

## Where things stand

- **Owner's rule (16 Nov):** nothing goes into the live app (`main`, task 0.7) until every bug is fixed and the owner has tested it all. Then Phase 1, the tool bar and the text box go live together, on the owner's yes.
- **Test version:** `build/next` 00431173 (17 Nov; app same as 5aab1273/59533e16 preview; re-test list in docs/plans/combined-test-2026-11-16.md) (16 Nov 17:45: C18b/C20b, C19, C21, C22 merged after one review each and their fixes), preview https://build-next.learning-notes-app.pages.dev. The owner tests on the iPad with Settings › Try new features › Test a phase › "Up to Phase 2B".
- **Owner has passed:** combined test parts A–D; on re-test: C2 eraser, the tool bar fixes (C3, C6, C7, C9), Delete box, one selected box at a time, resize never types, and the mic strip (C17).
- **Merged into build/next, waiting for the owner's re-test:** C4, C5, C14 (Scribble, symbols, tap timing), C12, C13, C15, C16, C8, C10, C11 (box group), C17, C18 (strip part), C20 (first part).

## Unfinished helpers when the limit hit (they stopped; restart each from its branch)

Check each with `git fetch -q origin && git log --oneline origin/build/next..origin/slice/<name>`. "none" means it never pushed: start again from origin/build/next.

| Bug        | What                                                                                                                                                                         | Branch                                                          | Who  | Brief                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---- | ---------------------------------------- |
| C21        | Box move and resize on the iPad: hover starts a resize, snap guide shakes, can't move up into free space, can't shrink with the Pencil, the middle side handles don't resize | **MERGED into build/next 5aab1273** (16 Nov; ipad-webkit on CI) | done | plan file C21 + "C21 more"               |
| C19        | Double tap mid-word fails after the caret is placed; a pop-up flashes; bigger tap radius; Relaxed 700 ms as the default                                                      | **MERGED into build/next 5aab1273** (16 Nov; ipad-webkit on CI) | done | plan file C19                            |
| C18b, C20b | Scribble text must count as typing (no dots); a duplicate always goes below and is selected; grey ink left in a box (check)                                                  | **MERGED into build/next 5aab1273** (16 Nov; ipad-webkit on CI) | done | plan file "Re-test (owner, 14:27–14:28)" |
| C22        | Update must never get stuck: 15 s wait, "Restart now" after 5 s, a watchdog reload, never block the app                                                                      | **MERGED into build/next 5aab1273** (16 Nov; ipad-webkit on CI) | done | plan file C22                            |

## How to continue

1. Restart the four helpers above (one task each; Sonnet builds, Opus for C21, Fable for C19). Each one: tests first, real Pencil input (e2e/realPen.ts), `--global-timeout=1200000`, its own PW_PORT, only one ipad-webkit run at a time (check `tasklist | findstr /i webkit`).
2. Review each slice once (`reviewer`). The main chat then merges it into build/next in C:\Users\pc\Downloads\ln-buildnext, because helpers can't push to build/next. Merge `origin/main` in each time; in DECISIONS.md clashes, keep both sides. Add each new spec to the ipad-webkit testMatch in playwright.config.ts (manager-approved), and run it there once.
3. Wait for CI (`gh run watch <id>`; `node scripts/ci-sort.mjs --run <id>` sorts failures).
4. Send the owner a short re-test list of just the open items (C18, C19, C20, C21, C22, and the Tap speed choice).
5. When everything passes: ask the owner's yes for go-live (task 0.7 with the live-check fix `slice/live-check-sha` af19a586).
6. After that: Phase 2B finish (2B.12, 2B.13, R15, T25, T26, R18, R20), then the Settings v5 rebuild.

## Known loose ends

- TB-24 (e2e/tb2-bar.spec.ts) fails on a clean build/next checkout on this PC but passes in CI: find out why before the release.
- Under heavy local load, cBoxes C12 and c45 C14 failed once each, then passed alone. Watch CI.
- Stray working copies to tidy later (deletes need the owner): `ln-c21-base/` inside this repo (untracked, made by the C21 helper; not committed), the scratchpad worktree `wtcb`, ../ln-c45x (branch esc/c45-fix), ../ln-c45, ../ln-cboxes, ../ln-c36, ../ln-c2, and the power-cut leftovers listed in docs/PENDING.md.

## Owner preferences learned this week

- Start every message with Status, Time left and Needs you; use plain words.
- Pictures (PNG with tiny captions) for quick OKs; no build without an approved picture.
- Note test findings and discuss them at the end; park ideas in docs/IDEAS.md.

## Files and restart

`npm run dev` serves https on the Wi-Fi for the iPad. Browser tests run on the built app (`npm run test:e2e` builds first). Never upload to Cloudflare by hand. Never run npm ci or npm install in a linked working copy.
