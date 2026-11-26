# State

The one live state file. Rewritten in place, never appended; short on purpose. Rewritten 26 Nov 2026 (phase 1A close-out, step 2a of [plans/plan-after-1a.md](plans/plan-after-1a.md)). The dated history of 22 to 25 Nov (handoffs, resume lists, fix rounds, run numbers) is in git history and docs/CHANGELOG.md; old state files are in docs/archive/ (PENDING-until-22-nov.md, BUILD-STATE-until-22-nov.md, HANDOFF-until-22-nov.md).

The plan: [plans/plan-after-1a.md](plans/plan-after-1a.md) (third version); older: [plans/stage-1-plan.md](plans/stage-1-plan.md); phase 1A detail: [plans/phases/phase-pc-1.md](plans/phases/phase-pc-1.md). Features: [FEATURES.md](FEATURES.md). The method: [METHOD-v2.md](METHOD-v2.md). What the owner decided: [design/owner-decisions.md](design/owner-decisions.md) and [DECISIONS.md](DECISIONS.md). Old docs: [archive/INDEX.md](archive/INDEX.md).

## Now (26 Nov 2026)

- **PHASE 1A IS LIVE** since 26 Nov, 01:31 IST: main 7e53ae5d (the merge of pull request #70), live `version.json` = 7e53ae5d (checked by the run and by hand). The owner's iPad reading check on the live app passed (26 Nov, "Reading, okay").
- **The plan to follow:** docs/plans/plan-after-1a.md (third version). **The owner said yes on 26 Nov, with a review afterwards.** To go on with the planning: a new Fable chat reads [plans/fable-handoff-2026-11-26.md](plans/fable-handoff-2026-11-26.md).
- **A release from now on:** a full run by hand on build/next ("full" ticked) is green → the owner's yes → merge the pull request → the run on main finds that proof and publishes in about 10 minutes → check the live `version.json`.
- **The unsteady tests are diagnosed, not fixed yet:** docs/qa/unsteady-tests-2026-11-26/README.md. Issues #71, #72, #73. Do not add waits to these tests; read the reports.
- **The red nightly of 26 Nov (run 45745749741):** main 336c79fd (the app code of 1A, live), started 26 Nov 02:56 UTC, red in two iPad-engine jobs. Red: `e2e/tb2-select.spec.ts:465` (turning the device with a box selected; seen CI-only on 25 Nov); `e2e/pageMenusPlaceC23.spec.ts:172` C25 (the sidebar page menu); `e2e/c45-symbols-scribble.spec.ts` C14 and C19 timed taps (cause 4; the driver fix is on slice/g1-test-causes). Passed only on retry (a retry pass counts as red, F9): `e2e/toolbarV8Ninth.spec.ts:156` TB-33 colour card; `e2e/paperInk.spec.ts:174` rule 4. The full run of slice/g1-test-causes (45747467400) had none of these red; its two reds are in DECISIONS (26 Nov, the test gate).
- **Branches:** build/next is ahead of main with the #71 and #72 fixes (15c8f878, not live). No pull request is open; the next one is opened with the next change.

## Resume here (next chat, after the PC restart of 26 Nov night)

1. **Test gate (plan section 5, step 3).** build/next 15c8f878 holds the #71 and #72 app fixes (each with a test that failed first; 20/20 on chromium and ipad-webkit). Branch slice/g1-test-causes (ln-g1-tests, not merged, not reviewed): causes 2, 3, 4 (frame-time note in every iPad-engine result), 6 and tb2-bar:407 by position. Not done there: the 20/20 proofs, the blur frame-time numbers (probe.yml cannot be dispatched until it is on the default branch), the audit of other tests with the same pattern. Its full CI run 45747467400: read the result first. Review it once before merging; look hard at cause 2 (a pen touch repeated until the mode is Pencil: make sure it is a wait for a state, not a retry that hides a fault; F9).
2. **Step 2b (rule files), part done, NOT in force.** Branch docs/rules-2b (ln-rules, 447eed76): CLAUDE.md and docs/METHOD-v2.md changed, the owner's list docs/plans/rule-changes-2026-11-26.md (on that branch) with 5 questions. Left: phase-1m-build-machine.md, stage-1-plan.md, builder.md, reviewer.md, phase-manager.md, the new part-manager.md and test-writer.md, the two STATE fixed facts; then a CHANGELOG entry and a DECISIONS line per Owner-settings change; then the check by a fresh helper; then merge to main. The undo mark: tag rules-before-2b-2026-11-26. Until the fresh check, work by the old rules. The list waits for the owner's review (say so in each daily message).
3. **The advisor** (/advisor opus) was turned on by the owner on 26 Nov; counting tries and usage per part starts at the first 1B day part.
   **Test gate, 26 Nov day (pc-96):** run 45747467400 red in pencil-webkit (8). TB-42 (toolbarV8Text:390): the machine drew one frame in 464 ms (cause 4, the frame-time note worked). TB-33 (toolbarV8Tools:442, lassoInk): the machine drew normally; the first pen touch switched the app to Pencil mode (toast seen) and the stroke was never saved: test fault or real app fault, a builder is proving which in ln-g1-tests. One review done: merge after four fixes (intoPencilMode in tb2-bar-fix is a retry: back to starting in Pencil mode; poll --dock-top after the switch; the frame fixture gets its own 5 s limit; `running` counts only animations not finished). The same builder does them after TB-33.
   **Second full run, 26 Nov evening (45812836044 on slice/g1-test-causes 079de630, after TB-33 and the four review fixes, all 20/20 local): red, every machine drew normally (16-22 ms per frame).** Failed twice: cBoxes.spec.ts:404 C11 (one tap outside a typed-in box does not pick it: the #71 case, passed in 45747467400), tb2-select.spec.ts:465 (turning: box width fraction off by 0.43; also red in nightly 45745749741), toolbarV8Ninth.spec.ts:254 (drawAndLoop: no selection bar; the pen-switch pattern suspected). Passed only on retry (count as red): toolbarV8Ninth.spec.ts:146, parts-gallery-feedback.spec.ts:484 SP-56, tb2-card.spec.ts:602 TB-28, board.spec.ts:226 (chromium, phone swipe), lassoFreeze.spec.ts:778 LS-07 (chromium). Two builders: C11 and the turn in ln-g1-c11 (branch slice/g1-c11 from the test branch); toolbarV8Ninth and the pen-switch pattern files in ln-g1-tests. They share the one local ipad-webkit run through the file C:/Users/pc/Downloads/webkit.lock. The four other retry-passes are not assigned yet. **Correction (26 Nov evening): slice/g1-test-causes was cut from 2743c26e, BEFORE build/next 15c8f878 (#71, #72); both full runs tested the old app code, and "on top of build/next" above was wrong.** C11 red = the #71 fault itself; with 13f32911 C11 is 20/20 on both engines (proof on slice/g1-c11, c0a2b85f and 4372e8b3: cherry-picks, left unmerged). Toolbar Ninth and Tenth: the pen-switch pattern, fixed in 2e8d65e5 (ipad 100/100); toolbarV8TenthCrops and toolbarV8ToolsGate3Shots have the pattern but run only with SHOTS=1 and make approved pictures: left as they are (Opus). Next: build/next merged into the test branch, the turn test fixed (likely two reads across a late relayout), the four retry-passes read; then the review and a new full run.
   **Third full run (45836624275, 1575796d, the first with #71/#72 inside): one red, TB-42** (toolbarV8Text:390, red in all three runs). **Root cause found by Opus at high effort (owner's word), on probe/g1-frames (never merge; worktree ln-g1-frames), runs 45848740421, 45852413395, 45856027295:** not the blur (blur off or glass lite measured slower); box-shadow painting at 2x pixel density with software drawing costs 230-350 ms per frame after each action; each click waits for 2 still frames, TB-42 has 58 clicks, so it sits at 45-50 s of 60 and crosses on slower runners. Every shadow off: TB-42 31-35 s instead of 48-52. The real iPad draws on its GPU: not affected. The frame-time note measures an idle page and misses it (to change). Side finding: the auto-lite switch in src/design/glass.ts can never trip at 2x. Next: one more probe run names the shadow (sheet, handles, scroller or the rest), then an app fix that keeps the look, built against a test written separately. Retry-passes of that run: TB-37 (fixed: driver too slow for the 400 ms hold; the Opus test-writer added order and gap checks and the other side of the rule, 3e87848a; Sonnet proofs running), TB-75 (same shadow cause). New bug #89: with the Text tool, writing in the 700 ms after a shape becomes Pen ink.
   **Night of 26-27 Nov, where the test gate stands (pc-96; the owner restarts the PC; a new session continues from here):**
   - **slice/g1-test-causes** (ln-g1-tests): head cc10b036 or later. Holds #71/#72 (merged build/next in 785d7756), all test-cause fixes, the TB-37 tests by the Opus test-writer, and the #90 app fix (textPenMove reads coalesced points, 282e7fc7; red-first: quick rectangle 0/20 without, 160/160 TB-37 with, both engines). Review of #90: merge after one fix, the penGuard.ts change is being reverted (no proof, could weaken a data-loss guard); check that commit landed and its runs passed. Repeat-11 ring failure = penGuard tap grace (test fixed, cc10b036), not coalescing (#90 corrected).
   - **slice/g1-shadow** (ln-g1-shadow, from 3e87848a): sheet and page-area shadows on their own static layers (root cause of TB-42 timeouts: box-shadow repaint at 2x without GPU; Opus high, probe/g1-frames, never merge). Look kept (max 3/255 on rims; owner shown pictures). Review: merge after fixes, done: names data-paper-shadow / data-page-shadow (93dfacc0) and e2e/shadowLayers.spec.ts by the Opus test-writer (a412c455, b625573c; ipad-webkit list line added). Sonnet 20/20 proof of shadowLayers was running; check its result.
   - **Next:** C25 redone and proven (see below), then a new full CI run by hand (full=true) on slice/g1-test-causes; if green, open the pull request into build/next (also merge main into build/next then), its full run, then 1A follow-ups.
   - **The owner's new design piece: the shadow look.** The owner finds the paper and page shadows outdated. Research (sources in the chat report, summary): the paper and page area are both white, so no edge shows; modern apps (Apple HIG 2025, Linear 2026) keep content flat, use a canvas a few % darker than the paper, a faint tinted hairline, and in Night a lighter paper instead of a shadow; a plain grey shadow reads as dated. Options being rendered (worktree ln-look, detached, scratchpad shadow-looks-2): Today, A Soft lift, B Calm edge (research pick and Opus pick), C Floating paper (toned down), on phone, tablet and PC, light, dark, sepia, with corner close-ups. The owner picks by looking; then it is built on the new shadow layers (picture first, then plan, then build). The scratchpad is lost on a restart: re-render from the brief if needed.
   - Rules in force from 26 Nov (owner): tests are written by Opus, Sonnet builds and runs them; the rule-change list review is closed, all ok; step 2b rule files still to be changed, then a fresh-helper check.
   - Open bugs from this gate: #89 (700 ms Pen window after a shape), #90 follow-up (lasso loop and ink replay without coalesced points), the frame-time note measures an idle page (change it), the auto-lite switch in src/design/glass.ts cannot trip at 2x. Shots files toolbarV8TenthCrops and toolbarV8ToolsGate3Shots keep the pen-switch pattern (SHOTS=1 only, left as they are).
   - The local ipad-webkit runs share C:/Users/pc/Downloads/webkit.lock (create with noclobber, delete after).
   - **Done in the night of 26-27 Nov:** the penGuard.ts revert (#90 review) landed: 263285c6 on slice/g1-test-causes; src/editor/penGuard.ts is again identical to 9966b356; the PaperFrame textPenMove fix stays; one line on #90. slice/g1-shadow (b625573c, shadowLayers.spec.ts 80/80) is merged into slice/g1-test-causes (708d1204).
   - **Full run by hand 45895918940 on 708d1204 (full=true): red only on C25,** `e2e/pageMenusPlaceC23.spec.ts:172` (the sidebar page ⋯ menu above every scroll bar), ipad-webkit shard 3, timeout in both tries (also red in nightly 45745749741). Every other job green, TB-42 included.
   - **C25 (27 Nov):** a Sonnet fix (slice/g1-c25, ca8d16ac: window 1180x520, 4 pages) was REJECTED in review (weaker: drops the owner's iPad size 1180x820, the `.sbar` check matches any bar, no proof the card overlaps the sidebar bar; slowness not proven as the cause: 471 ms per frame after 15 pages vs 17 ms in a green test, so the app may slow down as pages are added). Do not merge ca8d16ac. An Opus helper redoes it on slice/g1-c25b (ln-g1-c25b): first measures frame time after 1, 5 and 15 pages and reads the CI trace; then rewrites C25 at 1180x820 with pages from stored test data, a sidebar-only bar check and an overlap check. If the app really slows, a red-first test and an app fix follow.
   - **Shadow look: the owner picked B Calm edge (27 Nov),** from the redrawn pictures in C:/Users/pc/Downloads/learning-notes-shadow-looks-2026-11-27/v2/ (paper keeps its own colour; Night has a lighter paper; colours in v2/colours-used.txt; script in render/render.mjs). Phone unchanged (the paper fills the screen). Built behind the switch `look.calmEdge` (off by default, on in the preview only) on slice/look-calm-edge (be929e11, from 708d1204; worktree ln-look-b). Not reviewed yet, not merged. Changed approved baseline pictures are NOT updated without the owner's yes. Next for the owner: a look on the preview on the iPad, light and Night.
   - **Obsidian (owner, 27 Nov), separate from the app:** vault C:/Users/pc/Downloads/Priyanshu Test (Obsidian CLI on). (1) For each video note (folder Videos, e.g. the AI second brain note with its canvas map) add a short summary, a mind map, review cards, and full notes laid out like the app's own Notes / Summary / Review (the owner: use the app's features as the model, the app takes time to build). (2) Set up the Local REST API plugin (now with built-in MCP) so Claude can work inside Obsidian: the owner installs it and gives the key; trust the self-signed certificate at https://127.0.0.1:27124/obsidian-local-rest-api.crt. (3) Google Drive: backup plus the same notes on all devices (owner pick), plugin GSync (works on iPad); ASK the owner for the Gmail address of the Drive (not given yet; Obsidian uses a different account). Back up the vault before the first sync.
4. Then the #68 Pencil taps (step 4), then 1B (section 6). **From the Fable chat (26 Nov, docs/plans/phases/phase-1b-proofs/README.md):** Opus owns its section 4 (eight read-only looks on the preview; first: does a pen mark stay on its words when the box narrows or the page zooms, src/ink/anchor.ts:56-65), the sized estimate for 1B (four pieces larger than planned); with it Opus decides NB-99 (owner, 26 Nov, talk notes 5O): the full import for every user may wait for stage 3; in stage 1 only the owner imports, the most direct way that works (the app's own notebook file and "Add as copies") unless the full import is little work; owner answered A (26 Nov): a notebook file the owner brings in by hand, no connector in stage 1 (NB-46). **The spec has the owner's yes (26 Nov, with Fable's marked readings, section 8) and is now docs/features/claude-notebook.md; the planning of 1B is closed.** The yes does not cover the two daily-list points, the time, or the look (section 7: a real chapter first); a look that goes against a line goes to the owner. For the daily list, each asked with the real thing on the preview, no test merged before the answer (F12): what a shape with text does at the width of its text box (NB-81); words around such a shape, or above and below it (NB-96), the facts on issues #74, #75, #82, #83, #87, and the unproven "Fit paper size refuses Add as copies" (checkRows.ts:163). **The owner's yes came before Opus's looks in the running app** (proofs README section 4): make those looks before building any spec line they touch; a look that goes against a line goes to the owner. main moved: merge main into build/next with the next change. To go on with the planning: a new Fable chat reads plans/fable-handoff-2026-11-26.md.
5. Leftovers after the restart: the git notes in the main clone's .git/worktrees for the 45 removed copies, and some left node_modules folders (Permission denied on 26 Nov); try `git worktree prune` once.

## Close-out of 1A (step 2a), 26 Nov

Done:

- Issues: the 12 fixed ones and #45 are closed. Stage labels are on the open issues (the stage-1 label was made; #7, #39, #46 to #49 have none: tests and docs site). New issues #74 to #87 from the real-app page and the owner's taller-box fault (#87). #68 is labelled stage-2 by the owner's line in it.
- The phase row is in docs/metrics/phase-results.md.
- The five raw #68 recordings are in docs/qa/traces/.
- The working-copy list: docs/qa/working-copies-2026-11-26.md. On the owner's yes (26 Nov), 45 merged and clean copies were removed (no branch deleted).
- The picks list for the owner: docs/qa/picks-1a-closeout.md.
- The main clone was fast-forwarded to main on the owner's yes (26 Nov), after its 123 clashing untracked pictures were copied to C:/Users/pc/Downloads/learning-notes-untracked-backup-2026-11-26/; `npm ci` done.

All of 2a is done. The owner kept the six product picks; AB-05 wins over the picture (issue #88).

## Owner decisions of 24 and 25 Nov, as notes (no rule file changed before step 2b)

- The ladder: Sonnet 3 → Opus medium 2 → Opus high 1 → Fable.
- Two builders.
- A time limit from the measured length, 60 minutes at most.
- The state file is `docs/STATE.md`.
- The replan counter is 0.
- The idea "a tap on text switches to the Lasso" is dropped (the Lasso selects only by circling).

## Kept word for word

Lines that protect unsaved work:

- **Never `git commit -a` in ln-buildnext**: it holds 37 old uncommitted screenshot edits (screenshots/box-bar-frame/), which a commit took by mistake on 24 Nov; undone before any push. Reset it with `git reset --keep origin/build/next` (never `--hard`: old screenshot edits).
- ln-bbar (slice/box-bar-frame, merged; its git stash holds "popped by mistake 24 Nov 04:53, old screenshot changes", 124 old screenshot edits of unknown origin, kept for the owner's decision).
- Extra worktree ln-fix-pencil-base: remove only with the owner.
- The working copy `C:\Users\pc\Downloads\ln-rel-gate` (branch `slice/release-proven`, merged) holds nothing unsaved; it is removed only with the owner, like the others.
- Both slice worktrees ln-barfix and ln-inkbox, ln-u0d: do not delete (the owner decides).
- **Never without the owner:** the live app (a push to main with a non-docs file deploys), any other test change, worktree deletes, spending, /code-review ultra.
- **Never let a run on main deploy without the owner's yes:** a push to main that carries a non-docs file starts CI with a deploy; cancel that run (DECISIONS 24 Nov).

Working copies: ln-m1, ln-m2, ln-u0b are worktrees whose node_modules is a junction to the main copy (never npm install there); ln-2a13 is detached. ln-buildnext has its own packages (marked added 22 Nov).

- **Hot files** (one builder at a time, merged alone): `src/App.tsx`, `src/core/db.ts`, `src/core/types.ts`, `src/settings/builtinSettings.ts`, `src/app/flags.ts`, `package.json`, `playwright.config.ts`.
- **Local tests:** set `PW_PORT` to a free port; **one** ipad-webkit suite at a time on this PC (measured 14 Nov: two at once, 9 of 20 repeats failed; alone 20/20); the manager hands out the turn ("webkit free").
- **Always waits for the owner:** money, logins and Supabase, switching a part ON in the live app, possible data loss, a test on a real device, a real product decision.
- What waits for the owner: the section "Needs you" below, unchanged.

## Carried over from the old close-out list (none dropped)

- **Test-method proposals from the six faults of 24 Nov** (for the phase end, in DECISIONS): real Pencil input in every box, bar and ink test; a situations list in each spec; an always-on "must never happen" check; no unproven fix on the preview; widen the iPad-engine rule to Pencil, box, bar and ink parts. Also: a red nightly is a stop-the-line item in the morning report (plan-after-1a, step 3 holds it).
- **Open point S1 of the selection bar spec:** fix the S1 line of docs/features/selection-bar.md (the unpinned bar stays hidden while the caret blinks; the #63 rule A or B was the owner's to decide).
- **Phone-shot tests as an issue:** the two old failing phone-shot tests (e2e/tb2-bar-a-shots.spec.ts phone light/dark).
- **The LEARNING lines** of phase 1A (with the phase row in docs/metrics/phase-results.md, and the proposals in DECISIONS for the phase end).
- **Master instructions pack** (`C:\Users\pc\Downloads\master-instructions`, outside the repo, the owner syncs it): nothing in this project changes from it until the owner confirms it; it applies at the phase end. Owner rules to keep now: messages in Simplified Technical English; "How you can help" on every message; PNG pictures first when the owner does not understand, an HTML file only when asked, never a hosted artifact.
- **Open lanes:** the old-names doc pass; Undo and Redo out of tool bar v8 (planned with 1B); part 1M-14 (the proof on the hosted CI machines); the deploy-only-on-app-change proposal.
- **Three facts from the proofs of the notebook spec** ([phase-1b-proofs/](plans/phases/phase-1b-proofs/README.md), section 3 "Found on the way" and section 4). (1) "Add as copies" loses the Summary lines (and the annotations): the full zip is turned into the notebook file first, and that file has no `summaryItems` ([import-and-summary.md](plans/phases/phase-1b-proofs/import-and-summary.md)). (2) No test changes the words of a card that exists; each NB-60 test is new work ([locks-and-faults.md](plans/phases/phase-1b-proofs/locks-and-faults.md), point 3). (3) Which box the owner made taller on 25 Nov (#87) is not known: the first box of the page or a later one. The #64 fix leaves out the first box (`controller.ts:1063`), so drawing fails there; typing at the tapped place is new behaviour ([shapes-ink-boxes.md](plans/phases/phase-1b-proofs/shapes-ink-boxes.md), point 4; the question is in the README, section 4).

## QA checkpoints

- **qa/2026-11-22-baseline** (aac21364, 2026-11-22): worktrees ln-qa-codex, ln-qa-cursor, ln-qa-antigravity; reports in learning-notes-qa/qa-2026-11-22-baseline/; merged sheet: ANSWERED 22 Nov (Antigravity 14; Codex, Cursor none): 10 accepted, 3 next phase, 1 rejected; doc fixes applied; issues #50 Sign in after Escape (test first), #51 44 px targets, #52 guest mode for now (owner, 1B boundary), #53 device-mode button, #54 CORS at E6; 1 security item, handled at E6. Replan count 2 of 10. Owner, 22 Nov: #50, #51, #52 are NOT built in 1A; they wait for the 1B planning (scope freeze)

## Phase 1A parts (table of 22 Nov; later state: git history and CHANGELOG)

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

## Fixed facts

- **Live app:** `main`. No new app code since 12 Nov (b5b0bc74); every new part is OFF. A push of app code to `main` deploys by itself; docs-only pushes do not.
- **Code line until go-live (E7):** `build/next` a6e50fab, pull request #5 (never merge it by hand), working copy `C:\Users\pc\Downloads\ln-buildnext`. It runs the tests and publishes the preview.
- **Bookkeeping files** (this file, PENDING, CHANGELOG, DECISIONS) are written on `main`. Until task 0.7, merge `main` into `build/next` right after any such push, or the pull request clashes and no test run starts.
- **Preview address:** https://build-next.learning-notes-app.pages.dev . The parts the owner tests start ON there (build-next host only); the live address keeps them OFF.
- **Dexie:** highest version on `build/next` is 24 (checked 15 Nov); the manager gives out the next number, one task at a time.

## Refresh command

```bash
git fetch -q origin && for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/slice); do echo "$b $(git rev-parse --short $b) ahead $(git rev-list --count origin/build/next..$b) behind $(git rev-list --count $b..origin/build/next)"; done; gh run list --branch build/next --limit 3
```

"ahead 0" = fully merged into `build/next`.

## Needs you

The full list is section 10 of [plans/plan-after-1a.md](plans/plan-after-1a.md); it is repeated here in short.

- **The review of the list of rule changes, when the owner chooses.** The rule files themselves are not changed yet; the list waits for the owner's review (ok or put back for each item). Read it here: [plans/rule-changes-2026-11-26.md](plans/rule-changes-2026-11-26.md). Opus says in each daily message that it waits.
- **Two points of the notebook spec, asked with the real thing on the preview** (spec section 8): what a shape does when it reaches the width of its text box (NB-81); whether words run around a shape or stand above and below it (NB-96).
- **The kinds of action Opus may do without a click,** allowed once.
- **The changes to the owner's own `~/.claude` files** (Opus only proposes them).
- **The checks on the real device:** each day part, about 15 minutes; the 10-minute Pencil session (#68); the look of one real chapter; signing in on the phone for the cards.
- **The checks on the owner's own devices that the proofs name:** pen marks with the iPad upright and then sideways; the due cards on the phone (after the sign-in a new device asks once for the passphrase or the recovery code); which box was made taller in the owner's try of 25 Nov, the first box of the page or a later one (#87).
- **Opening the planning talk with Fable** for the phase part after 1B.
- **At the end of stage 1:** Opus reminds the owner of the deep review in the cloud (`/code-review ultra`), and the owner decides.
- **Answered or done on 26 Nov (kept in the plan, nothing to do):** how a failed test in a release run is treated (F9); the five small questions of the notebook spec; the owner's reading check of the live app; the yes to the plan and to the spec; the product picks and the list of working copies; the tests' sign-in switch on the preview for read-only proofs; `/advisor opus`.

Older items that the plan's list does not hold (kept, none dropped):

- **The catch-up check C0 on the iPad, items 4 to 11** (about 15 minutes; the eleven items are in docs/plans/phases/phase-2-finish.md section 6; "Circle recorder" off). Items 1 to 3 answered 22 Nov evening (#55, #56, #57). Reply with the numbers that felt wrong, or "rest fine".
- **C1a, the Lasso session, 5 minutes:** Settings, Try new features, Lasso recorder on; "Copy last trace" when an outline stays or a loop acts on the old selection. A trace of a wrong circle pick unlocks #57.
- **Names (owner, 24 Nov): Tool bar, Action bar, Selection bar (the former "picker"), Hold menu.** Applied in the live pages and merged (66 mentions; part-card file names kept). Tell me if "Selection bar" should name another part. Left for a later doc pass: older pages that still say "selection bar" for the old bars (now the Action bar), and a few unsure "picker" lines listed in the builder report (tool bar v8 lines 60 and 68, uniformity.md).
- **Nothing to do: the Action bar pictures are all approved (owner, 24 Nov):** PC (18 frames) and iPad sideways, iPad upright, phone (17 frames); conditions in docs/design/owner-decisions.md. The build is planned with phase 1B.
- **Small, not urgent:** Decisions to review in docs/DECISIONS.md; the security-header check E6 (#54); developer-tool warnings (glob, minimatch; the fix breaks the offline plugin, re-checked at each phase end); old working copies you may delete when you like.
- **Later, in this order:** the Notion mirror only on your word (docs/IDEAS.md).

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
