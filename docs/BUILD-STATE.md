# Build state (one table; rewritten in place, never appended)

**TRIAL since 13 Nov 19:40 IST; benchmark: docs/plans/system-trial-2026-11-13.md**

The file a build manager reads to continue. How the build runs: [ECONOMY-MODE.md](ECONOMY-MODE.md) (simple system, 13 Nov 2026 evening). Plan: [plans/build-master-plan.md](plans/build-master-plan.md) (read only the section of the slice you brief). Keep this file under 100 lines; history goes to CHANGELOG.md.

**Switch (13 Nov, 19:45 IST, owner request):** the 13-section economy mode is replaced by the simple system: Opus manager, Sonnet builders that own a whole slice, Opus gate 2, Fable for the design check and the final look only, no Haiku. Handover of run 5 folded in (run 6).

**Next result for the owner:** M2 = toolbar 1d and shell fixes merged (OFF), CI green, preview updated.

## Milestones (the main chat checks them with `bash scripts/build-pulse.sh` every hour)

| #   | By (IST)      | What must be true                                                                                                                          | State                                                      |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| M1  | 13 Nov, 21:00 | CI green on `build/next` (run 43437478460 on 87910c01, or one root-cause fix and a new run); owner told "preview ready" with the checklist | done: CI 43437478460 green on 87910c01; preview ready told |
| M2  | 13 Nov, 23:30 | toolbar 1d and the shell fixes merged (OFF), CI green, preview updated                                                                     | open                                                       |
| M3  | 14 Nov, 02:00 | storage safety merged (OFF); final looks done for 1d, shell and storage safety                                                             | open                                                       |
| M4+ | every 2 hours | at least 1 slice merged and at least 4 builders with new commits                                                                           | open                                                       |

Times are "likely" at the measured pace (one merge + CI = about 1 to 2.5 hours). If one passes, write the new time and the reason here.

## Refresh command

```bash
git fetch -q origin && for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/slice); do echo "$b $(git rev-parse --short $b) ahead $(git rev-list --count origin/build/next..$b) behind $(git rev-list --count $b..origin/build/next)"; done; gh run list --branch build/next --limit 3 --json databaseId,status,conclusion,headSha
```

"ahead 0" = fully merged into `build/next`.

## Fixed facts

- **Live app:** `main`; every new part is switched OFF. A push of app code to `main` deploys by itself; docs-only pushes do not. Release to `main` only from a green `build/next`, by the release flow in the master plan.
- **Integration branch:** `build/next` 87910c01 (green, CI 43437478460; has perf-start and the offline e2e fix), worktree `C:\Users\pc\Downloads\ln-buildnext`, draft pull request #5 (never merge by hand). Its CI run is the judge and publishes the preview: https://build-next.learning-notes-app.pages.dev (new parts under Settings › Try new features). Last green: 43412535492 on ff92ce2f.
- **Docs** (this file, PENDING, CHANGELOG, DECISIONS) are written on `main` only; merge `main` into `build/next` before a CI batch.
- **Dexie:** highest version on `build/next` is 24; the manager gives out the next number, one lane at a time.
- **Hot files** (one builder at a time, merged alone): `src/App.tsx`, `src/core/db.ts`, `src/core/types.ts`, `src/settings/builtinSettings.ts`, `src/app/flags.ts`, `package.json`, `playwright.config.ts`.
- **Worktrees:** `C:\Users\pc\Downloads\ln-s<slice>`, one per slice, reused. Never delete folders. Old helper branches are already in `main`; leave them.
- **iPad WebKit tests** get unreliable on this PC under load: at most 2 builders run them at once.
- **Always waits for the owner:** money, Supabase changes, switching a part ON for daily use, anything that could delete or lose the owner's data. Everything else: safest choice, log in DECISIONS "Decisions to review", continue.

## Slices

Specs: `docs/features/<file>.md` on `build/next`. Gate 3 notes so far: docs/plans/gate3-2026-11-13.md (read only the last entry of a slice).

### In `build/next`, final look passed (ready for the owner in the first preview)

0a to 0f foundation, 0i tool registry, 10 update flow, 11 security mediums (all live on `main`, OFF); 0g shared parts steps 1 and 2; 3 Settings v3; 4 Notebooks + Search v2; 5 Home v2; 6 Library v2; 8 Review v2 (8a, 8c); 9 AI framework 1 to 5c and Build screen; 12 Page menus (12b); 1 Toolbar v8 1a to 1c; perf-start (WebKit start 15 s to 1.2 s). 0h shell is merged, but its final look was never recorded: it goes with the shell fixes below.

### In work (one Sonnet builder owns each until merged)

| Slice                                  | Branch @ SHA (folder)                               | State (?)                                                                                                                                                                              | Next step                                                                                                                |
| -------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1 Toolbar v8, 1d                       | slice/1-toolbar-v8 4d6a4006 (ln-s1), 14 ahead       | gate 2 PASS, gate 3 PASS at 4d6a4006; touches playwright.config.ts (hot)                                                                                                               | merge alone, OFF; CI                                                                                                     |
| 0h shell + shell fixes                 | slice/0h-shell a95fd16c (ln-s0h), 14 ahead          | toast + iPad portrait sidebar fix in; gate 2 PASS, gate 3 PASS; touches App.tsx (hot)                                                                                                  | merge alone after toolbar; CI                                                                                            |
| iPad storage safety (`storage.safety`) | slice/storage-safety 5bffea05 (ln-sstore), 11 ahead | SS-01..09 built; flags.ts one line (hot); spec storage-safety.md, mock storage-safety-mock.html                                                                                        | gate 2 (extra care) + ipad-webkit run + gate 3                                                                           |
| 7 Reader v2                            | slice/7-reader-v2 771650e3 (ln-s7), 61 ahead        | out of the first preview; failed the final look 3 times (6 fixes left, tenth visit); gate 2 found that `frame-ancestors 'none'` blanks EPUB on iPad (fix: `'self'`); 7g and 7h unbuilt | Fable writes the exact fix brief; an Opus builder does it; 7g and 7h become their own run after the finished part merges |
| 1 Toolbar v8, 1e and 1f; BUG-003       | slice/1-toolbar-v8 (ln-s1)                          | not started                                                                                                                                                                            | after 1d merges (same lane, same builder)                                                                                |

### Not started (spec ready)

| Slice                                                                         | Flag           | Spec                        | Starts after                        |
| ----------------------------------------------------------------------------- | -------------- | --------------------------- | ----------------------------------- |
| 2 Text box v2 (BUG-001, BUG-002 if on this screen)                            | `textbox.v2`   | textbox-v2.md               | slice 1 (lane P, one after another) |
| 0g step 3 (Tool frame, Wizard steps, Status pill stack, Before/after)         | -              | shared-parts.md             | free now                            |
| 9 AI framework 6, 7, 8; AI cost additions first (5d: check that it is merged) | `ai.framework` | ai-framework.md, ai.md      | free now                            |
| 15 Study tabs                                                                 | `study.v2`     | study-v2.md                 | free now (slice 8 is in)            |
| 8b Review rest; 12 rest (context strip, Paste ▾, page ⋯ sheet)                | as merged      | review-v2.md, page-menus.md | free now                            |
| 13 Things inside a page                                                       | `page.objects` | page-objects.md             | slice 12 rest (lane P)              |
| 14 Pictures, PDF, audio, reading                                              | `media.v2`     | media-v2.md                 | slice 13                            |
| 16 Safety and data                                                            | `safety.v2`    | safety-v2.md                | slice 7                             |
| 17 System layer                                                               | `system.v2`    | system-v2.md                | 0g step 3, slice 16                 |

Lanes (master plan 4.1): P = 1 → 2 → 12 rest → 13 → 14; S = 15, 8b; R = 7 → 16 → 17; A = AI 6 → 7 → 8; parts = 0g step 3. After M1, fill every lane whose files do not overlap (up to 8 builders).

## Open faults and notes

- `e2e/shell.spec.ts:224` offline test fixed in 87910c01. Decision to review: going offline before the Home chunk loads is not covered.
- docs/IPAD-CHECKLIST.md retired; the iPad checklist lives in docs/PENDING.md.
- Follow-ups from final looks (not blocking): gate3 file, "follow-ups" lines of 3, 4, 5, 6, 9b and the shell.
- The test guard's Bash delete check still needs a settings.json hook entry (owner decision, in PENDING).
- ln-s3 has an old popped stash with conflicts; leave it (slice 3 worked in ln-s3b).

## Waiting for the owner (nothing here blocks the build)

1. **Supabase sync for device-only data.** Library v2 and AI v4 data added by the build (for example saved filters, the `aiJobs` table) are stored on the device only. Syncing them needs an online database change, so the code stays behind its interface until the owner says yes. Exact schema needs are in the slice reports and `docs/features/library-v2.md`, `ai-framework.md` ("Needs the owner"). Not verified line by line in this snapshot.
2. **Claude connector setup.** Connector A: run `supabase/migrations/20261113000002_connector_devices.sql`, then on the PC `git pull`, `npm run mcp:build`, `node mcp/dist/index.js setup`. Connector B: two SQL files, the secret `CLAUDE_ESCROW_SECRET`, deploy the `mcp` function with `--no-verify-jwt`, publish, add the custom connector in claude.ai. The new AI job tools also need deploying. Steps: `docs/features/claude-connector.md`, top of `docs/plans/owner-checks-pending.md`.
3. **Supabase settings:** refresh-token rotation on; confirm email-code limits; restrict CORS on `drive-token`; redeploy `drive-token` once.
4. **One check before the strict security header blocks:** Google sign-in, Drive and fonts still work.
5. **iPad checklist** (docs/PENDING.md "Needs you", one pass): text box v2 steps 1 to 7, Text tool + Pencil (real Scribble), paper pages and ink rules, Write pad round 7, auto-update, Q7a Calendar drag, PDF menu, connector screens, plus every new part switched on in the preview (shell, Home v2, Library v2, Settings v3, toolbar v8 Pen cards, AI Build screen).
6. **BUG-002** (floating format toolbar grows or moves out of bounds): the owner still owes the screenshot; without it the bug cannot be reproduced. BUG-001 (checklist shows "Not saved yet") also needs a repro. Both are fixed inside the slice that owns the screen (text box v2 / page menus), each with a test.
7. Friday 13 Nov review of the HANDOFF carry-overs (owner asked for it).

## How to continue

1. Run the refresh command; fold in the old manager's Handover block if one is below; fix the (?) rows.
2. Deliver the next result for the owner (M1), then M2 and M3.
3. Fill the lanes; follow ECONOMY-MODE section 3 for each slice.
4. After every merge, gate result or CI result: rewrite the row here, one commit on `main`, push; CHANGELOG line; Build board in docs/PENDING.md; mirror copy (rules/sessions.md).
