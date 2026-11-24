# State

The one live state file (22 Nov 2026, part M1). It replaces PENDING.md, BUILD-STATE.md and HANDOFF.md; the full old texts are kept in docs/archive/ (PENDING-until-22-nov.md, BUILD-STATE-until-22-nov.md, HANDOFF-until-22-nov.md). Rewritten in place, never appended. Sections: Now, Needs you, Next, Parked.

The plan: [plans/stage-1-plan.md](plans/stage-1-plan.md) (stage 1, phases 1A to 1D); phase 1A detail: [plans/phases/phase-pc-1.md](plans/phases/phase-pc-1.md). Features: [FEATURES.md](FEATURES.md). The method: [METHOD-v2.md](METHOD-v2.md). What the owner decided: [design/owner-decisions.md](design/owner-decisions.md) and [DECISIONS.md](DECISIONS.md). Old docs: [archive/INDEX.md](archive/INDEX.md).

## QA checkpoints

- **qa/2026-11-22-baseline** (aac21364, 2026-11-22): worktrees ln-qa-codex, ln-qa-cursor, ln-qa-antigravity; reports in learning-notes-qa/qa-2026-11-22-baseline/; merged sheet: ANSWERED 22 Nov (Antigravity 14; Codex, Cursor none): 10 accepted, 3 next phase, 1 rejected; doc fixes applied; issues #50 Sign in after Escape (test first), #51 44 px targets, #52 guest mode for now (owner, 1B boundary), #53 device-mode button, #54 CORS at E6; 1 security item, handled at E6. Replan count 2 of 10. Owner, 22 Nov: #50, #51, #52 are NOT built in 1A; they wait for the 1B planning (scope freeze)

## Handoff 22 Nov 2026, late evening (main chat, Fable; window closed by the owner)

**Done in this window, all pushed (main a6b5b59e and later).** Baseline audit consolidated and answered (MERGED-SHEET in the reports folder; issues #50 to #54; doc fixes). Local unit-test red fixed: scripts/run-vitest.mjs (lowercase drive letter made Vitest load twice); 372 files green; QA tag pushed. Found-wishes page written, made tappable (https://claude.ai/artifact/KzhBJ8exaj9ki9jzXh11jt), answered: F-352 to F-386 in the register. Action bar spec Confirmed (21 rows Yes), the pin is the switch (no ✕), one press pastes (AB-12 rewritten, owner chose A over the preview). Guest profile defined (#52: a signed-out visitor gets a fresh empty profile, nothing frozen). Ten old plan pages archived, ROADMAP.md a pointer. AB-02 scripts/check-bar-inventory.mjs + 7 tests, `npm run check:bar-inventory`. C0 items 1 to 3 answered: #55 (hold strip near punctuation, trace in docs/qa/traces/), #56 (stray Pencil touch deletes a selection; rule in text-select.md), #57 (wrong word 1 in 10, trace needed). main merged into build/next (b0040cc2, CI green).

**Lessons recorded (DECISIONS, memory).** The owner decides by plain-word questionnaires, 2 to 5 questions, pick first, no ids or counts in chat. Nothing from an audit or a check is built inside 1A: tickets wait for the 1B planning (scope freeze). A page copy for the owner is made only when the file is final, and as a tappable page when the owner asks.

**Next for the manager, in order (owner, 22 Nov late: execute 1A first, the picture after).** (1) Red-first 0: e2e/firstBoxTap.spec.ts on build/next fails to load (duplicate test title, line 335); fix the cause before any slice push. (2) U0a (slice/u0a-update-repro, copy ln-2a16b, head 3f088e40 local only): finish the six review fixes, 20 of 20 on chromium and ipad-webkit, re-review, merge into build/next from ln-buildnext. (3) U0c + S0 from U0a's branch (update-v2.md Confirmed, all rows): tests red first, 20 of 20, one review. (4) Phase 1M from 1M-02 once U0a merges; M5 analyze, M9 part cards (stop for Fable's attack read), M6 weekly card Saturday, M7 research page. (5) Beside the build, when a window is free: the Action bar PC picture, docs/mockups/action-bar/index.html + png/ (five stage-1 states, light and dark, system.md tokens, 44 px, the pin filled when pinned, Paste one press with ▾, one ⋯▾ list open, one hover name), `npm run check:bar-inventory` green, then the owner's yes; then iPad sideways, upright, phone. (6) Each C0 answer becomes an issue the same day; the found-wishes stage-1 rows (F-356, F-357, F-367, F-370, F-372, F-373, F-376 to F-378) and #50 to #52 go into the 1B planning with Fable and the owner. (7) Every evening `node scripts/qa-checkpoint.mjs <day>` and `qa-brief.mjs`; every Saturday `npm run dashboard` with the weekly card. Replan count: 2 of 10.

## Now

**Resume here (24 Nov 2026, about 22:35 IST; phase 1A release to live, on the owner's yes).**

- **Done:** the owner passed #61 to #65 on the iPad; #60 to #65 closed with proof comments. Answers: the small bar over the tabs = issue #67 (label stage-3, later); box smaller than its ink: no change; fast set: **A** (keep, 45-minute limit stays); no "must never happen" lines now. Live switches: **option A** (live starts as the preview; src/app/flags.ts). CI tooling fix (ipad-webkit helper match). **PR #5 merged into main (88f2ded8).**
- **Running:** CI run 45443692412 on main (full set, then the deploy only if green). A new chat: `gh run view 45443692412`; when green, `node scripts/check-live.mjs <main sha>` and check https://learning-notes-app.pages.dev/version.json equals main. Any red: stop, root cause, fix on build/next, merge again; the live site keeps the old version meanwhile.
- **Also running:** the hand-started full set on build/next (45442656756, a rehearsal) and the preview runs 45442666182, 45443538728 (the preview gets b593dd71).
- **Next:** (1) when the preview serves b593dd71, write "ready" to the owner for the update test (S5, S1, S4 on the PC; S6, S1, S7, S4 on the iPad; steps in the chat of 24 Nov evening); (2) after the live deploy, tell the owner, and ask for the iPad reading check on the live app (the first live update still uses the old updater); (3) phase 1A close-out (step 5 below); (4) 1B planning with Fable and the owner.

**Resume here (24 Nov 2026, about 21:45 IST; final handoff of the fix session; the owner sleeps and opens a new chat with "continue").**

**State: the fix session is merged and pushed.** build/next a551b50b holds the five fixes of the owner's iPad check (#61, #62, #63, #64, #65) and main. CI run 45430735905 on PR #5 is green and the preview serves it (step 1). Details and proof numbers: CHANGELOG "24 Nov 2026, evening". Both slice branches (slice/box-bar-61-63 in ln-barfix, slice/ink-box-64-65 in ln-inkbox) are merged locally into build/next and were never pushed alone; do not delete the worktrees (the owner decides).

**Steps for the new chat, in order:**

1. **DONE 24 Nov, about 22:15 IST:** CI run 45430735905 is green (checks, all five fast-set shards, scenarios with a browser cache hit, preview); **the preview serves c506f8f5 = PR #5's merge commit, so the five fixes are on the preview.** A new chat only re-checks that nothing was pushed since (`gh run list --branch build/next --limit 1`).
2. **Send the owner the iPad test list** (preview, about 10 minutes, Pencil, recorder OFF):
   - a. #63: tap a box's border → the bar shows WITH the pin, not pressed. Tap the pin → pinned.
   - b. #61: drag a page-wide bar to the right, drop it about 2 cm from the right edge → it docks RIGHT (vertical). A drop straight down stays free.
   - c. #62: with the Pencil, tap the pin on a moved bar → the bar pins; nothing behind it is selected; the bar stays. Then open the notebooks drawer while a moved bar shows → the drawer lies on top (tests check only the layer numbers).
   - d. #64: make a box taller with the bottom dot → draw in the new lower part (ink shows, stops at the border); tap the empty lower part with the Text tool → the caret goes in. Shrink it again, twice → does the frame jump or lag? (a 150 ms lag was seen on the test engine under load).
   - e. #65: draw with the Pen in the FIRST box, also past its bottom → the box does not grow, the stroke ends at the border; other boxes stay outside it.
   - Then the 5-minute Lasso session (recorder ON only during it), then the 10-minute update check (S1 to S7 of docs/features/update-v2.md, PC first, then iPad).
3. **Close #61 to #65 only on the owner's yes or trace** (comments with the commit and the proof). #34: the setting works when on; the owner decides "Hide toolbar while writing" on by default at the phase end.
4. **Open questions for the owner (2 to 5 at once):** is the small format bar over the Notes / Summary / Review tabs a fault (picture of 13:47); does a resized first box keep its height (reviewer: its bottom handle may have no visible effect; possible own issue); should a box resized smaller than its saved ink spring back; the fast-set choice A/B/C (pick B); the owner's "must never happen" lines.
5. **Phase 1A close-out after the owner's check:** the phase row in docs/metrics/phase-results.md, LEARNING lines, and in DECISIONS for the phase end: (a) apply the master-pack answers of 24 Nov evening to CLAUDE.md (ladder Sonnet 3 → Opus medium 2 → Opus high 1 → Fable; two builders; iPad engine before start-up or update-path merges; time limits from the measured length, 60 min max; pictures by case); (b) the test-method proposals from today's six faults (real Pencil input in every box, bar and ink test; a situations list in each spec; an always-on "must never happen" check; no unproven fix on the preview; widen the iPad-engine rule to Pencil, box, bar and ink parts); (c) fix the S1 line of docs/features/selection-bar.md (the unpinned bar stays hidden while the caret blinks); (d) the two old failing phone-shot tests (e2e/tb2-bar-a-shots.spec.ts phone light/dark) as an issue; (e) "never `git commit -a` in ln-buildnext": it holds 37 old uncommitted screenshot edits (screenshots/box-bar-frame/), which a commit took by mistake tonight; undone before any push.
6. **Then 1B planning with Fable and the owner:** #66 (the "Show toolbar" pill covers buttons), #50 to #52, the found-wishes stage-1 rows, the management board (IDEAS, must, a small part: a program-made page on the docs site with diagrams), Undo/Redo out of tool bar v8.

**Master instructions pack** (`C:\Users\pc\Downloads\master-instructions`, outside the repo, the owner syncs it): all questions answered on 24 Nov evening (QUESTIONS.md); chapter 13 decided; today's lesson in chapter 11. Nothing open. It applies to this project only at the phase end (5a).

**Never without the owner:** the live app (a push to main with a non-docs file deploys), any other test change, worktree deletes, spending, /code-review ultra.

**Done at midday (24 Nov, all pushed):** the cut scenarios job of run 45299069262 was rerun by hand and is green (install 39 s, the mirror is normal). The S9 ✘ of the night was a misread: S6, S7 and S9 are `@notbuilt @fail` since 20 Nov and the total was "20 passed" (DECISIONS 24 Nov 12:35); nothing is flaky. The scenarios job got the browser cache (slice/scenarios-browser-cache 0bb6bb9e, worktree ln-scen-cache, merged into build/next as ed70da65 and pushed with main merged in). **Check in a new chat:** `gh run list --branch build/next --limit 1` must be green and the preview's version.json must equal the pull request's merge commit; the run after that must show a cache hit in the scenarios job. The morning message (step 2 below) was sent to the owner at 12:45; **the line now waits for the owner's answers and iPad tests (step 3).** Step 1 below is done.

**Done tonight (all pushed):**

- The update fix (U0c + S0) passed its 20 of 20: chromium all 49 tests at 20 or more clean passes; ipad-webkit all at 20 except U2 at 19 (one run cut) and S3b, which failed 3 of 19 on the old code: a real race, **issue #58, fixed** (e62003f5, root cause and proof on the issue), 20 of 20 on both engines on the new code. Numbers: docs/metrics/pace-2026-11-23.md "The proof's result".
- build/next = main merged in + #58 + the regenerated Professional-features texts (38eaf324, CI went red after the name pass on main changed docs/mockups/pro-features.md; DECISIONS 24 Nov) + the CI fast-set job limit 20 → 45 minutes (2a1c4476, measured; DECISIONS 24 Nov holds the phase-end choice A/B/C) + **the box-bar fixes #60 to #63** (slice/box-bar-frame, reviewed twice, PASS on round 2, merged 9bd649b1 at 06:10). The preview served the update fix from 05:30 (version commit = the PR's merge commit). **Check the CI run of 9bd649b1 on PR #5 and the preview's version.json before telling the owner the bar fix is there** (watcher in the chat; a new chat: `gh run list --branch build/next --limit 1`, then `curl https://build-next.learning-notes-app.pages.dev/version.json`, the commit must equal the PR's merge_commit_sha from `gh api repos/priyanahubadhana/learning-notes/pulls/5`).
- The owner's iPad check C0 tonight: items 4 and 5 yes; the bar faults became issues #59 (recorder button covers the bar), #60 (bar leaves the app frame; owner: fold to the pin, option A), #61 (no side docking), #62 (a press on the bar reaches the text; owner widened it to the whole bar and every menu), #63 (new box shows no bar until the grip moves). #60 and #62 are fixed with tests red-before. **#61 and #63 are hypotheses in the preview, not proven** (comments on the issues hold the owner's exact iPad steps). #63 is also a spec conflict: the approved box-bar picture (frame 15) and the tests hide the UNPINNED bar while the caret blinks; S1 of selection-bar.md says the bar shows with the cursor in the box; **the owner decides**.
- The master instructions pack (outside the repo, see 4b) is at draft 3 after a fact check.

**Next, in order (a new chat):**

1. **Done at 07:40:** the CI run of 9bd649b1 (45299069262): checks green, all five fast-set shards green (the iPad shard 2 of 2 inside 45 minutes this time), preview job green; **the preview serves e4bf4ac1, the merge commit of 9bd649b1, so the update fix and the four bar fixes are on the preview.** The run's conclusion reads "cancelled" only because the `scenarios` job was cut at its 25-minute limit while still installing browsers (a slow mirror on the hosted machine, 01:32 to 01:58 UTC; the earlier run's scenarios job also lost about 20 minutes to the install and then showed the Lasso scenario S9 ✘ on both engines once). **Morning:** rerun the scenarios job by hand once the mirror is normal (`gh run rerun <id> --job <scenarios job id>` or a workflow_dispatch), read S9 before anything is called flaky, and put the browser cache in front of the install in that job (it has no cache step; the other e2e jobs do) as a tooling task. No limit was raised twice.
2. Send the owner the morning message with: (a) the bar re-test on the iPad (items 5 again with the #61 and #63 steps from the issue comments, then C0 items 6 to 11, then the 5-minute Lasso session with the recorder on only during it); (b) the 10-minute update check (S1 to S7 of docs/features/update-v2.md on the preview, PC first then iPad); (c) the questions: the #63 rule (A: the unpinned bar also shows while the caret blinks; B: keep the picture, the bar shows when the box is picked by its border or when pinned); the fast-set choice A/B/C; the six contradictions in chapter 13 of the master pack's GUIDEBOOK; the next projects and the video link for the pack.
3. After the owner's answers: #63 as a spec change if A; close #60 and #62 on the owner's yes; #61 and #63 on the owner's trace; then the phase 1A close-out (phase row in docs/metrics/phase-results.md, the LEARNING lines, the proposals in DECISIONS for the phase end).
4. Open lanes unchanged: the old-names doc pass; Undo and Redo out of tool bar v8 (planned with 1B); part 1M-14; the deploy-only-on-app-change proposal.
5. Worktrees used tonight (do not delete; the owner decides deletes): ln-u0d (slice/u0d-prompt-race, merged), ln-bbar (slice/box-bar-frame, merged; its git stash holds "popped by mistake 24 Nov 04:53, old screenshot changes", 124 old screenshot edits of unknown origin, kept for the owner's decision).

**History of the night (kept for the record):**

0. **The red of issue #58 is fixed and proved; the line runs again.** The old proof ended 02:45 (ALLDONE): S3b failed 3 times in about 19 ipad-webkit runs, 0 of 23 on chromium; everything else green. Root cause and fix: see #58 (commit e62003f5, a phase re-check before every write of the download-progress poll; unit test red before, green after). The fix's own proof in ln-u0d: ipad-webkit S3b and S3 10 of 10 each, chromium 5 of 5 each, 0 red. Merged fast-forward into build/next in ln-buildnext at 03:28. **Running now in ln-buildnext (one chain, log `tasks/bwknl0bnq.output` in `C:\Users\pc\AppData\Local\Temp\claude\4d2a322303203713\d1372af7-85b2-4e5a-a745-8dbcb33ab04e`, reports in the `scratchpad` folder beside it):** push of build/next → ipad-webkit S3b and S3 x10 more (`pw3-webkit-s3.json`, about 25 min) → chromium x5 of both spec files (`pw3-chromium-5.json`, about 47 min) → the line `ALLDONE2`. Expected end about 04:45. **Then:** count per test (chromium: pw-chromium-20 + pw2-chromium-3 + pw3-chromium-5, all 49 must reach 20; ipad-webkit: pw2-webkit-1..4 + the two pw3 webkit files, S3b counted only from the new code = 20 if pw3 is clean); any red → stop, root cause; all green → step 3 (merge origin/main into build/next, push, CI, preview version check, the owner's 10-minute update check, numbers into docs/metrics/pace-2026-11-23.md). The owner's iPad checks tonight: C0 items 4 and 5 yes; a finding to log as an issue: the Lasso recorder's "Copy last trace" button sits on top of the box bar and blocks moving it (owner, 03:15). Old step 0 kept below for the record.

0-old. **THE LINE WAS STOPPED: a real red (issue #58).** S3b ("a restart that does not come") failed on ipad-webkit in batches 1 and 3 (2 of about 14 runs; 0 of 23 on chromium): "The update did not finish" never showed. Root cause (read-only review, confirmed in the code): the download-progress poll in src/app/updateProgress.ts re-checks nothing after `await cachedPaths()` and can overwrite the 3 s restart prompt, whose next tick then stops for good. A builder fixes it in the worktree `C:\Users\pc\Downloads\ln-u0d` (branch slice/u0d-prompt-race, from build/next): a phase re-check before every write in that poll, a unit test that is red before and green after, then S3b and S3 at 10 repeats x 2 workers on ipad-webkit and 5 on chromium. It waits for the file `ln-u0d\.proof-done` before any browser test: **create that file when the proof run below has printed ALLDONE** (the watcher in the chat does it; a new chat does it by hand after checking the task list for WebKit or Playwright). Then: review the diff once (Opus), merge the slice into build/next, and only then do steps 2 and 3 with S3b counted from zero. The earlier S3b counts do not carry over.

1. **The proof run of the update fix is still running by itself** (started 22:45 on 23 Nov by an earlier chat; it does not belong to any open chat). Its log is the file `tasks/bztnfjea9.output` in the folder `C:\Users\pc\AppData\Local\Temp\claude\4d2a322303203713\2994a73a-0ced-4a2f-84e7-2716ec95aef1` (it ends with the line ALLDONE); its reports are in the `scratchpad` folder beside `tasks` (pw-chromium-20.json, pw2-chromium-3.json, pw2-webkit-1.json to pw2-webkit-4.json). State at 01:33: chromium done (0 red), ipad-webkit batch 1 243 passed (2 runs missing, cut at one hour), batch 2 245 passed in 51 minutes, batch 3 running; batch 4 should end about 02:45. Never start a second test run in ln-buildnext while it runs (look for WebKit or Playwright in the task list first).
2. **When ALLDONE shows:** count clean first-try passes per test from the JSON files (chromium: pw-chromium-20 plus pw2-chromium-3; ipad-webkit: pw2-webkit-1 to 4 only). Known gaps: chromium has 12 tests at 15 to 19; ipad-webkit misses about 2 runs from batch 1. Top up, one browser at a time, in ln-buildnext, PW_PORT 5661, no retries, a JSON report each: chromium 5 more repeats of both spec files (about 47 minutes, limit 90), then ipad-webkit on the tests still under 20. Any real red (not a tooling fault): stop, root cause first.
3. **When every test has 20:** merge origin/main into build/next in ln-buildnext (clashes in DECISIONS or CHANGELOG: keep both), push build/next, wait for CI, check the preview serves the new version, then send the owner the 10-minute update check (the scenarios of docs/features/update-v2.md). Write the proof numbers into docs/metrics/.
4. **Never let a run on main deploy without the owner's yes:** a push to main that carries a non-docs file starts CI with a deploy; cancel that run (DECISIONS 24 Nov).
   4b. **The master instructions (owner, 24 Nov, 02:00 to 03:00):** the owner's universal pack (prompt, guidebook, owner guide, app-settings text, the ASD-STE100 standard and word lists, the helper definitions) lives OUTSIDE the repo in `C:\Users\pc\Downloads\master-instructions` (the owner syncs it to Drive themselves; no upload by a chat). Draft 3 after a fact check; chapter 13 of its GUIDEBOOK lists six contradictions between our own rule files for the owner's phase-end decision. Nothing in this project changes from it until the owner confirms the pack. Owner rules recorded there and to keep now: messages in Simplified Technical English (the standard is in the pack's `ste/` folder); "How you can help" on every message; PNG pictures first when the owner does not understand, an HTML file only when asked, never a hosted artifact.
5. **Owner decisions of 24 Nov to carry on with (all in DECISIONS and owner-decisions.md):** the Action bar pictures approved for every device (build planned with 1B); the names Tool bar, Action bar, Selection bar, Hold menu; the proof moves to the hosted CI machines in parallel with 20 repeats kept (a new part for phase 1M, to plan); the research report docs/research/long-autonomous-agent-builds-2026-11-24.md is written (its ranked list of what to copy is the input for the 1M and 1B planning; part 1M-14, the proof on the hosted CI machines, is in the 1M plan); /code-review ultra: owner, 24 Nov: once only, at the very end before going public, when all phases are done; never per phase; only the owner starts it. Replan count 4 of 10.

RUNNING 23 Nov (main chat, Fable coordinating only; the owner away 8 to 10 hours, said "execute what you can"). Done today: the design numbers fold (b582f3e0, fed23166; five open clashes in DECISIONS "to review"); the Action bar PC picture drawn, reviewed once, fixed, re-checked (ca52303b; waits for the owner's yes). The duplicate-title red of e2e/firstBoxTap.spec.ts lives only on the U0a branch (build/next loads 38 tests); the U0a builder merges build/next in. **Owner, 23 Nov 12:40 IST: phase 1A complete and usable by 20:00 IST today; plan files untouched, same rules, five lanes at once.** Merged to main by 13:10: M7 research (278b1f81), M9 eleven part cards + Fable's attack read (085cc0b3), M5 analyze v1 + M6 weekly card (9468dde7; `npm run analyze` warns only; `npm run weekly-card`; first card 2026-W47 found 10 skipped-or-only tests against a rule of zero, to clear in 1A's fix round), site home order + badges (da130c1b, 16dab9c4). **19:25 IST:** U0a on build/next, CI green (21b68713), the preview serves it. U0c + S0: reviewed once (three fixes, applied and checked by diff), the S2 iPad red root-caused and fixed in src/main.tsx (the restart after controllerchange was blocked while the "did not finish" note held; now a restart that was asked for always reloads, switch on only), pushed c8fd8fc8, merged fast-forward into build/next in ln-buildnext (local). **23:50 IST:** the 20 of 20 of e2e/updateV2 + e2e/u0aUpdateRepro is on its third run (the first two were cut by their time limits; every red was the shared test-results folder or double load, see metrics/pace-2026-11-23.md). Chromium: 3 more repeats green at 23:06, but 12 of 49 tests still have 15 to 19 clean passes, so 5 more chromium repeats run after webkit (about 47 minutes). Batch 1 of 4 ended 00:06 on 24 Nov: 243 passed, 0 red, but cut at its one-hour limit with 2 runs missing, so a short webkit top-up follows the four batches (count per test first; the batches end about 03:10). Running: ipad-webkit alone, 20 repeats in batches, started 23:07 in ln-buildnext (the earlier chat's background task; the new chat watches for its end; never start a second run beside it). Then: count per test from the JSON reports, the chromium top-up, merge main into build/next, push build/next, CI, the preview with update.v2 ON (already in the preview preset), the owner's 10-minute check. The 20:00 target was missed for U0c; U0a is on the preview. Replan count since Fable last planned (22 Nov): 3 of 10 (drag and dock of the Action bar moved to stage 1; guest mode added as a part for the 1B boundary, #52; the Action bar fold and "Keep bar open", 24 Nov). **Open doc lanes, 24 Nov:** the old-names rename (Q15) on tool/names-q15 in ../ln-names (a Sonnet builder; merge after a diff check); then Undo and Redo out of tool bar v8 TB-01, breakpoints 640 and 1180 and the title in system.md (DECISIONS 24 Nov).

**Resume steps (morning, in order):**

0a. DONE 22 Nov: the local unit-test red was the lowercase drive letter (c: vs C:); scripts/run-vitest.mjs fixes the spelling before Vitest starts; 372 files green from both spellings. 0. **Red first:** e2e/firstBoxTap.spec.ts on build/next fails to load ("duplicate test title", line 335, 4 titles); the push guard blocks every slice push that runs it. Find the cause (possibly the main merge 8306ab77) and fix it before anything else.

1. **U0a** (`slice/u0a-update-repro`, working copy ln-2a16b; head 3f088e40 is LOCAL ONLY in ln-2a16b, not pushed because the push guard hit the red above; fix items 1 to 6 done, last full run 28 of 30 with the 2 reds fixed, repeat set not re-run). Finish the review fix list (real preview-host Cache-Control in U0a-2; U0a-11 must check something on WebKit; U0a-8 title; no empty box when the switch is off; version shown once; dark checked), then 20 of 20 on chromium and ipad-webkit, re-review, merge into build/next from ln-buildnext.
   1b. **Phase 1M, the build machine** (owner's yes on the plan, 22 Nov): after U0a merges, Opus runs docs/plans/phases/phase-1m-build-machine.md from 1M-02 (1M-01, the documents, done by Fable 22 Nov). Confirm sheet rows 1 to 11 all Yes (owner, 22 Nov, after the artifact read); 1M-02 may start as soon as U0a merges. U0c + S0 run beside it as the first tasks of the dry run if they are still open.
2. **U0c + S0** (from U0a's branch): the loop fix of docs/features/update-v2.md (Confirmed, all 22 rows) and the Update card at the top of today's Settings page in the v5 card style; tests red first, 20 of 20, one review.
   2b. **Design numbers fold (Opus, doc task, tiny):** fold the 18 "Decided 22 Nov" lines of docs/design/principles.md into system.md, the shell spec, quality-standard.md and tool bar v8 so one table holds the numbers; then draw the ten principle pictures (the owner confirmed the page; the clashes are settled).
3. **Found-wishes sweep** DONE 22 Nov evening (Opus helper): docs/plans/found-wishes-2026-11-22.md, 31 rows, waiting for the owner's one-pass answer (row numbers to change; the rest counts as yes). After the answer: register rows from F-352, home.md into F-055, old plan pages to docs/archive/.
4. **M5** analyze v1, then **M9** the eleven part cards (stop for Fable's attack read), then **M6** the weekly card (Saturday evening), **M7** the research page.
5. DONE 22 Nov evening: ten old plan pages in docs/archive/plans/, ROADMAP.md a pointer, links updated (helper).
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

- **The catch-up check C0 on the iPad, items 4 to 11** (about 15 minutes; the eleven items are in docs/plans/phases/phase-2-finish.md section 6; "Circle recorder" off). Items 1 to 3 answered 22 Nov evening (#55, #56, #57). Reply with the numbers that felt wrong, or "rest fine".
- **C1a, the Lasso session, 5 minutes:** Settings, Try new features, Lasso recorder on; "Copy last trace" when an outline stays or a loop acts on the old selection. A trace of a wrong circle pick unlocks #57.
- **Names (owner, 24 Nov): Tool bar, Action bar, Selection bar (the former "picker"), Hold menu.** Applied in the live pages and merged (66 mentions; part-card file names kept). Tell me if "Selection bar" should name another part. Left for a later doc pass: older pages that still say "selection bar" for the old bars (now the Action bar), and a few unsure "picker" lines listed in the builder report (tool bar v8 lines 60 and 68, uniformity.md).
- **Nothing to do: the Action bar pictures are all approved (owner, 24 Nov):** PC (18 frames) and iPad sideways, iPad upright, phone (17 frames); conditions in docs/design/owner-decisions.md. The build is planned with phase 1B.
- **Later, in this order:** the phase 1B planning (one questionnaire); the Notion mirror only on your word (docs/IDEAS.md).
- **Small, not urgent:** Decisions to review in docs/DECISIONS.md; the security-header check E6 (#54); developer-tool warnings (glob, minimatch; the fix breaks the offline plugin, re-checked at each phase end); old working copies you may delete when you like.

Preview address: https://build-next.learning-notes-app.pages.dev (the parts you test start ON there). The live app has had no new code since 12 Nov. The formatted site: https://priyanahubadhana.github.io/learning-notes/

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

- **/code-review ultra, once, on the finished code line (owner, 24 Nov 2026):** only the owner starts it; 3 free runs for the account, then about US$5 to 25 a run; one run takes at most 500 files or 8,000 changed lines, so it may need a few runs split by area. Not before all phases are done.
- Supabase paid plan (about US$25 a month). No cost now.

## Parked

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
