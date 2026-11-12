# Build state (snapshot 13 Nov 2026, 00:05 IST)

One file a new orchestrator reads to continue the build. Plan: [plans/build-master-plan.md](plans/build-master-plan.md) (read only the section of the slice you are working on). Economy setup: [ECONOMY-MODE.md](ECONOMY-MODE.md).

**Builders were still pushing when this was written.** Before acting, refresh the table with:

```bash
git fetch -q origin && for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/slice); do echo "$b $(git rev-parse --short $b) ahead $(git rev-list --count origin/build/next..$b) behind $(git rev-list --count $b..origin/build/next)"; done; gh run list --branch build/next --limit 3 --json databaseId,conclusion,headSha
```

"ahead 0" = fully merged into `build/next`. Update this file after every merge (one row, one commit, on `main`).

## Owner instructions (13 Nov, keep across restarts)

1. Fully autonomous: never stop and wait. Items for the owner (money, Supabase, switching a part ON for daily use, iPad tests) go to "Needs you" in docs/PENDING.md; keep working on everything else.
2. Budget: 80% of the week is a reference, not a cap. Speed matters more than saving quota; quality and design rules first, then the first full build fast.
3. Top priority: FIRST FULL BUILD fast: build/next green, merge waiting slices, release the preview with new parts ON in the preview (Settings › Try new features), write the owner's iPad checklist (BUG-002, connector, key flows). Then the remaining slices.

## Fixed facts

- **Live app:** `main` 9e2ec70d. App code last released at b5b0bc74 (CI run 43205383635), every new part switched OFF. A push of app code to `main` deploys by itself; docs-only pushes do not.
- **Integration branch:** `build/next` 25c3729c, worktree `../ln-buildnext`, draft pull request #5 (never merge by hand). 169 commits ahead of `main`. Preview: https://build-next.learning-notes-app.pages.dev (new parts under Settings › Try new features).
- **Latest CI on `build/next`:** run 43275508089 on 25c3729c = **RED** (see "Red and flaky tests"). Last green run: 43253663829.
- **Dexie:** next version to give out is **25** (24 = `aiJobs`). One lane at a time; the orchestrator gives out the number.
- **Hot files** (one integration builder, one change at a time): `src/App.tsx`, `src/core/db.ts`, `src/core/types.ts`, `src/settings/builtinSettings.ts`, `src/app/flags.ts`, `package.json`, `playwright.config.ts`.
- **Unlock switches:** 219 in `docs/mockups/pro-features.md`.
- **Always waits for the owner:** money, Supabase (online database or function) changes, turning a new part ON for daily use, or anything that could delete or lose the owner's data. Everything else: safest choice, log in DECISIONS "Decisions to review", continue.
- **Failures:** 3 fix attempts (about 1 hour), then undo the slice, write `docs/FAILED.md`, move on. FAILED.md is empty today.
- **iPad WebKit tests are not reliable on this PC under load.** The pull request's CI is the judge.

## Slices

Specs for every slice exist in `docs/features/` on `build/next` (file named in the table). Worktrees are `C:\Users\pc\Downloads\<folder>`.

### Merged into build/next (gate 2 passed)

| Slice                                  | Flag               | Branch @ SHA                                                     | Notes                                                                 |
| -------------------------------------- | ------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| 0a flags + level, 0b test tools        | `foundation.*`     | slice/0ab-flags-tests 30d6fee7                                   | live on main, off                                                     |
| 0c event router, 0d gesture router     | `foundation.*`     | slice/0cd-routers 60849037                                       | live on main, off                                                     |
| 0e selection store, 0f overlay manager | `foundation.*`     | slice/0ef-selection-overlay f2a27f56, slice/0f-overlay 0d38c9e9  | live on main, off; `persistent` overlay kind added da5187fe           |
| 0i tool registry + AI slice 0          | -                  | slice/0i-tool-registry 322ec0b9                                  | live on main                                                          |
| 10 update flow (BUG-004)               | `update.v2`        | slice/10-update-v2 95e66a93                                      | live on main, off                                                     |
| 11 security mediums                    | `security.m1`      | slice/11-security-m1 235a80fc                                    | live on main, off; strict header is report-only until the owner check |
| 0g step 1 shared parts + gallery       | -                  | (in build/next, up to fc0e4e9)                                   | spec shared-parts.md                                                  |
| 0h shell                               | `foundation.shell` | slice/0h-shell fbde80de (ln-s0h)                                 | merged 88624e40. Gate 3 (screenshots) not recorded                    |
| 5 Home v2                              | `home.v2`          | slice/5-home-v2 23d15e36 (ln-s5)                                 | merged 6fb8a08c; board made lazy in 25c3729c. Gate 3 not recorded     |
| 6 Library v2                           | `library.v2`       | slice/6-library-v2 e6f8953e (ln-s6)                              | merged 3d63ae22. Gate 3 not recorded                                  |
| 9 AI framework slices 1-3, 4, 5a-5c    | `ai.framework`     | slice/9-ai-framework-1 fd0339f4, slice/9-ai-framework-4 (ln-s9b) | merged c403b6d2 and 496a2336; spend gate at ₹0                        |

### Partly merged, work continues

| Slice             | Flag           | Branch @ SHA (folder)                    | State                                                                                         | What is left                                                                     |
| ----------------- | -------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1 Toolbar v8      | `toolbar.v8`   | slice/1-toolbar-v8 b3829852 (ln-s1)      | 1a, 1b, 1c (Pen cards) in build/next                                                          | 1d to 1f per toolbar-v8.md, BUG-003, the 878-probe check, gate 2 and 3           |
| 3 Settings v3     | `settings.v3`  | slice/3-settings-v3 0e0eb4ef (ln-s3)     | merged partial 4e05c8bf; **6 commits ahead** (section pictures, Turn all off text, badge fix) | merge the 6 commits, finish any open SET-B lines in settings-v3.md, gate 2 and 3 |
| 9 AI framework 5d | `ai.framework` | slice/9-ai-framework-4 831f4a6b (ln-s9b) | **4 commits ahead** (tags.add/remove/rename, library.pin)                                     | gate 2, merge; then framework slices 6, 7, 8 (ai-framework.md section 16 order)  |

### Built on its branch, not merged

| Slice                                                           | Flag                        | Branch @ SHA (folder)                     | State                                                                                           | What is left                                                                                                         |
| --------------------------------------------------------------- | --------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 0g step 2 (strip, command list, sheet, dialogs, toasts, banner) | -                           | slice/0g-parts 9b6c7f0d (ln-s0g)          | 24 ahead, behind 115; builder fixing flaky gallery tests at the root (data-ready, data-settled) | merge build/next in, **SP-54 on ipad-webkit**, gate 2, merge. Blocks nothing already merged; slice 12 and 17 need it |
| 4 Notebooks + Search v2                                         | `notebooks.v2`, `search.v2` | slice/4-notebooks-search ce2c28bc (ln-s4) | 37 ahead, behind 115; panel v2 (Pages, Outline, Resources) built with e2e                       | merge build/next in, CI, gate 2 and 3, merge                                                                         |
| 7 Reader v2                                                     | `reader.v2`                 | slice/7-reader-v2 5c72642e (ln-s7)        | 11 ahead, behind 1; 7a bars, 7b Listen built                                                    | remaining sub-slices in reader-v2.md (sticky read view, pages-grid Undo/Restore, sidebar vs Exit), gate 2 and 3      |
| 8 Review v2                                                     | `review.v2`                 | slice/8-review-v2 3a3f6ecb (ln-s8)        | 7 ahead, behind 115; 8a, 8c built with screenshots                                              | 8b if open in review-v2.md, merge build/next in, gate 2 and 3                                                        |
| 12 Page menus                                                   | `page.menus`                | slice/12-page-menus 89bb4194 (ln-s12)     | 16 ahead, behind 115; 12a spec check, 12b "/" menu on the Command list                          | context strip, Paste ▾, page ⋯ side sheet, stars / My blocks (page-menus.md); needs 0g step 2 merged                 |

### Not started (spec ready)

| Slice                                                                                | Flag           | Spec            | Starts after                                      |
| ------------------------------------------------------------------------------------ | -------------- | --------------- | ------------------------------------------------- |
| 2 Text box v2 (keep engine, rebuild touch layer; BUG-001, BUG-002 if on this screen) | `textbox.v2`   | textbox-v2.md   | slice 1 (same lane P, strictly one after another) |
| 0g step 3 (Tool frame, Wizard steps, Status pill stack, Before/after)                | -              | shared-parts.md | 0g step 2                                         |
| 13 Things inside a page                                                              | `page.objects` | page-objects.md | slice 12                                          |
| 14 Pictures, PDF, audio, reading                                                     | `media.v2`     | media-v2.md     | slice 13                                          |
| 15 Study tabs                                                                        | `study.v2`     | study-v2.md     | slice 8                                           |
| 16 Safety and data                                                                   | `safety.v2`    | safety-v2.md    | slice 7                                           |
| 17 System layer                                                                      | `system.v2`    | system-v2.md    | 0g step 3, slice 16                               |

Lane order (master plan 4.1): P = 1 → 2 → 12 → 13 → 14; S = 3, 4, 5, 6, 8, 15 (two at a time); R = 7 → 16 → 17; A = AI 5d → 6 → 7 → 8.

Old helper branches (`worktree-agent-*`, `connector-b*`, `mcp-writes`, `pdf-tools`, `feat-db-calendar` and others) are already in `main`; leave them alone. Never delete folders.

## Red and flaky tests (andon: fix the cause, never add retries, never weaken)

| Test                                                                                        | Where                                   | State                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `parts-gallery.spec.ts` **SP-54** toast stack                                               | ipad-webkit, all four sizes, under load | open on slice/0g-parts; cause unknown (builder's theory: the 2.5 s toast timer ends before the check). Do not merge 0g step 2 with it flaky |
| `parts-gallery.spec.ts:442` SP-10 edit tabs (rename, drag, ▲, remove, Undo)                 | chromium, run 43275508089               | **failed** on build/next                                                                                                                    |
| `parts-gallery.spec.ts:771` SP-22 dragging over text selects no text                        | chromium, run 43275508089               | flaky                                                                                                                                       |
| `parts-gallery.spec.ts:729` SP-20 grip drags with the mouse at once                         | chromium, run 43267846587               | flaky; the data-ready / data-settled work on slice/0g-parts targets these                                                                   |
| `undoHistory.spec.ts:210` 50 random steps back and forward                                  | ipad-webkit, run 43275508089            | **failed**; flag-on twins were added in 19701520, check that first                                                                          |
| `foundationInput.spec.ts:8` unused routers not in the first load; `homeV2.spec.ts:112` drag | chromium, run 43267846587               | fixed in 25c3729c (lazy board); confirm on the next green run                                                                               |
| `inkLayers:140`, `boxTaps:138`                                                              | ipad-webkit                             | fixed on main (0e7f9cd5, 016b5fdc); watch for a return                                                                                      |

Rule from the master plan: `build/next` red for two slices in a row = stop and find the basic cause. It is red now, so **the first job after the switch is a green `build/next`**.

## Decisions to review (owner reads when free; none block work)

Full text: `docs/DECISIONS.md` "Decisions to review" on `build/next`. Build-night items:

- New unlock switch `about.updateDetails` proposed (uses `about.version` until OK); 50 unlock switches added (169 → 219).
- AI v4: `tags.add` and `tags.rename` are app-only tools; spend gate fixed at ₹0.
- Overlay: new `persistent` kind for bars and pills (not closed by outside tap or Esc).
- Settings v3: Account, Sync, Lock, AI, Connections, Permissions, Claude, This device and About show today's screens inside the new frame; "Turn all off" keeps the new Settings on.
- Page menus keeps 7 `page.*` unlock ids in a local list until Settings v3 lands.
- Connector A (writes on by default, config file switches), connector B (30-day escrow, Inbox as an encrypted synced record), Q7a Calendar, PDF menu Undo, AI cost limit US$0.10 per unseen call.
- **`docs/DECISIONS.md` on build/next has leftover merge markers near line 84 (`=======`, `>>>>>>> connector-b-3-5`). Clean up (Haiku job).**

## Waiting for the owner (nothing here blocks the build)

1. **Supabase sync for device-only data.** Library v2 and AI v4 data added by the build (for example saved filters, the `aiJobs` table) are stored on the device only. Syncing them needs an online database change, so the code stays behind its interface until the owner says yes. Exact schema needs are in the slice reports and `docs/features/library-v2.md`, `ai-framework.md` ("Needs the owner"). Not verified line by line in this snapshot.
2. **Claude connector setup.** Connector A: run `supabase/migrations/20261113000002_connector_devices.sql`, then on the PC `git pull`, `npm run mcp:build`, `node mcp/dist/index.js setup`. Connector B: two SQL files, the secret `CLAUDE_ESCROW_SECRET`, deploy the `mcp` function with `--no-verify-jwt`, publish, add the custom connector in claude.ai. The new AI job tools also need deploying. Steps: `docs/features/claude-connector.md`, top of `docs/plans/owner-checks-pending.md`.
3. **Supabase settings:** refresh-token rotation on; confirm email-code limits; restrict CORS on `drive-token`; redeploy `drive-token` once.
4. **One check before the strict security header blocks:** Google sign-in, Drive and fonts still work.
5. **iPad checklist** (`docs/plans/owner-checks-pending.md`, one pass): text box v2 steps 1 to 7, Text tool + Pencil (real Scribble), paper pages and ink rules, Write pad round 7, auto-update, Q7a Calendar drag, PDF menu, connector screens, plus every new part switched on in the preview (shell, Home v2, Library v2, Settings v3, toolbar v8 Pen cards, AI Build screen).
6. **BUG-002** (floating format toolbar grows or moves out of bounds): the owner still owes the screenshot; without it the bug cannot be reproduced. BUG-001 (checklist shows "Not saved yet") also needs a repro. Both are fixed inside the slice that owns the screen (text box v2 / page menus), each with a test.
7. Friday 13 Nov review of the HANDOFF carry-overs (owner asked for it).

## How to continue

1. Run the refresh command. Read only the spec file of the slice you touch.
2. First: `build/next` green (the red tests above).
3. Then, 4 builders at once (up to 6 while rework stays under 2 rounds), in this order: finish and merge 3, 9 (5d), 4, 8, 7; 0g step 2 (SP-54); 1 (1d to 1f); 12; then 2, 0g step 3, 15, 16, 13, 14, 17; AI 6 to 8 beside them.
4. After each merge: update this file and the Build board in `docs/PENDING.md`, add the CHANGELOG line, run the mirror copy (rules/sessions.md).
5. Release to `main` only on a green `build/next`, flags off, as the master plan says.

## Wave 1 (economy orchestrator, 13 Nov)

- build/next: CI 43281718615 GREEN on 877fc57a. Then eeed0c2d (DECISIONS markers removed) and 3cbf6107 (gallery e2e wait, old lane); CI 43285941871 running.
- build/next merged into slices, pushed, builder checks green (tsc, lint, size, ratchet, own e2e chromium): 0g 40d08712 (also fixes SP-20/22/23 WebKit drag in useReorder.ts; ipad-webkit gallery green), 4 de761c3b (size 319,539 of 320,000!), 12 909b8288 (does NOT yet contain 0g; re-merge after 0g lands), 8 b64c7422 (8b open: MoreSheet, Chips, PickerRow), 3 1373c4a4, 9b 65a38e46.
- check:dod fails "0 When lines" on shared-parts, page-menus, review-v2, settings-v3, notebooks-search-v2 specs (table format). Safest fix: add When bullets to those specs (mechanic job), do not relax the checker.
- Gate 3 partial (docs/plans/gate3-2026-11-13.md): 0g PASS + 3 follow-ups; 4 FAIL 13 fixes; 12 FAIL 4; 7 FAIL 7. Not reviewed: 8, 3, 5, 6, 9b (5/6/9b need flag-on pictures).
- Next: gate 2 on 9b, 3, 0g, 8; 0g follow-ups builder; fix-list builders for 4, 12, 7; merge order 9b, 3, 0g, 8, then 4, 12, 7 after re-shot gate 3. New slice: iPad storage safety (owner 13 Nov).
- Pending docs jobs: docs/plans/docs-audit-2026-11-13.md SAFE list; research recs in docs/design/research-effectiveness-2026-11-13.md (gate 2 brief narrowing needs owner OK if it changes a rule).
- Gate 2 results (13 Nov): all four FAIL. Common: check:dod does not read table-format spec lines (| XX-Bnn |) and needs a flag; fix in scripts/check-dod on build/next (wave 2, one builder). 0g: only that. 9b: tools5d.test.ts:170 g46 must assert the job's tag is in Trash (deletedAt). 3: fix flaky SET-B39/B40/B45 at the root, label SET-B36 test, add Won't do section. 8: e2e for RV-B08/B10/B20/B23/B27/B28, Error and Loading states, spec file list (Extras inline).
- Decisions to review: runner.ts recover() runs jobs in parallel (9ebf1383); reviewService skips purgedAt logs also for flag-off users.
