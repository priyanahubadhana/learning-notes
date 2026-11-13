# Economy mode for the build (in force from 13 Nov 2026, owner-approved)

Goal: the same features, speed, quality and design at a much lower usage cost. Quality is protected by keeping the same 3 gates, the same tests and the same Definition of Done (rules/quality.md). Only who does which job changes.

Status: IN FORCE. CLAUDE.md "How Work Runs" carries the rule. Start with 4 parallel builders; go up to 6 only while rework stays under 2 rounds (owner, 13 Nov). Speed rules added 13 Nov (section 11) raise the cap to 8 and batch CI; where they differ from an older line, section 11 wins.

## 1. What the measurements say

Source: 63 helper transcripts of this session (tokens per turn, per model). Cost is shown as "price-weighted units" (tokens x the published API price of that model), the closest public stand-in for how the plan counts usage. The plan's real weighting is not published, so treat every figure as a ratio, not as money.

| Finding                                                                                                                                                                           | Evidence                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| The `subagent_tokens` number in helper reports is the helper's last context size, not what it used. Real use is 20 to 100 times larger.                                           | Library v2 builder: reported about 0.3 M, real 36 M cache-read + 0.6 M cache-write + 0.16 M output           |
| Sonnet builders are about 60% of the build cost.                                                                                                                                  | 12 build-night builders: 38 units, average 3.2 each, 95 turns, context growing to 180-340 k                  |
| Builder cost is about 0.035 units per turn, whatever the size. Fewer turns = lower cost.                                                                                          | 41 Sonnet helpers, three size groups: 0.036 / 0.037 / 0.034                                                  |
| The Fable orchestrator was about 30% of the sampled cost, and 71% of that was waste: each time it woke after a wait, its whole 100-270 k context was written again at full price. | 7 wake-ups rewrote 96 k, 124 k, 147 k, 169 k, 195 k, 225 k, 263 k tokens = 1.22 M of its 1.34 M cache writes |
| Opus sub-managers are cheap (about 9%).                                                                                                                                           | 6 sampled: 0.9 units each, 17 turns                                                                          |
| Haiku is almost free.                                                                                                                                                             | 0.03 units per job                                                                                           |
| Rework is real: most slices needed 3 rounds of sub-manager + builder, and local iPad tests are unreliable under load.                                                             | 51 sub-manager launches for about 17 slices; flake-fix commits; HANDOFF note                                 |

Limits of the data: only about a third of the build night's helpers have transcripts here, the main chat is not included, and the old week mixed design work with building.

## 2. Recommended setup

| Role                 | Old                                | Economy                                                                                                                         | Why                                                                               |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Top (main chat)      | Fable                              | Fable, but thin: starts the orchestrator, relays, nothing else                                                                  | owner rule: Fable at most half the plan                                           |
| Orchestrator         | Fable, one long chat               | **Opus**, `economy-orchestrator`, small context, restarted about every 6 waves (section 11); state lives in docs/BUILD-STATE.md | half the price per token and a quarter of the context: about 80% less per wake-up |
| Sub-managers         | 3 Opus relays per slice round      | **removed as a relay**; the orchestrator briefs builders directly                                                               | one less layer to pay and wait for                                                |
| Builders             | Sonnet, whole slice, 100-170 turns | **Sonnet**, `economy-builder`, one sub-slice of about 60 turns, targeted tests only                                             | cost follows turns                                                                |
| Mechanical work      | mostly done by Sonnet builders     | **Haiku**, `economy-mechanic`: es/hi texts, formatting, docs lines, clean merges, watching CI                                   | about 20 times cheaper than Sonnet                                                |
| Gate 2 (QA)          | Opus sub-manager                   | **Opus**, `economy-gate2`, read-only, once per finished slice                                                                   | same check, same model                                                            |
| Gate 3 (screenshots) | Fable                              | **Fable**, `economy-gate3`, 2 to 4 slices per visit                                                                             | same check, fewer cold starts                                                     |
| Hard cases           | Opus then Fable                    | Sonnet twice, then an Opus builder, then Fable; a new visual pattern goes to Fable                                              | unchanged rule                                                                    |

The old agent files are untouched (`fable-manager`, `opus-submanager-*`, `sonnet-executor`, `haiku-executor`), so rollback is just using them again.

## 3. Rules for every helper

- **Briefs point to files, never paste them.** Under 250 words, every field of the section 4 template filled.
- **Design + quality checklist:** builders tick the 17 lines in .claude/agents/economy-builder.md with proof; gate 2 and gate 3 reject a slice on any ✗.
- **Worktrees:** one per slice (they exist: `../ln-s*`), reused by each new builder of that slice. A new worktree only for a new slice. Docs-only and read-only jobs need none.
- **Tests:** locally run only the spec files of the sub-slice (chromium; ipad-webkit for touch code) plus lint, tsc and the size check. The full matrix runs once per merge in CI on the `build/next` pull request (free, public repo). A Haiku helper runs `gh run watch <id> --exit-status`, then lists the failed test names from `gh run view <id> --log-failed`. No local full suites. The push guard (section 12) runs the quick checks on every push.
- **Output:** long command output goes to a file; read the tail or search the failures.
- **Batching:** up to 8 builders at once on files that do not overlap (section 11; owner, 13 Nov: Sonnet builders are cheap on the Max plan); gate 3 in batches; one docs commit per wave for BUILD-STATE, the PENDING board and CHANGELOG; one CI run per batch of up to 3 gated slices (section 11), never per commit.
- **Status messages:** helpers report in under 150 words (Haiku 80). The orchestrator writes state to docs/BUILD-STATE.md instead of long messages. The owner's "Status / Needs you" lines are written by Haiku from that file.
- **No polling.** Wait for reports; do not check on running helpers.
- **Work in bursts.** A helper that waits more than 5 minutes pays for its context again, so builders do not wait for CI; they report and end.

## 4. Brief templates

Every brief has: objective, exact spec IDs, output format, scope limits, done criteria. Point to files; never paste them. Why: cheaper models follow briefs literally, so what is missing from the brief is missing from the work (docs/design/guiding-cheaper-models.md).

Builder:

```
Objective: slice <id> sub-slice <id>: <one line, user-visible result>.
Where: worktree C:\Users\pc\Downloads\<folder>, branch slice/<name>, flag <flag>.
Spec: docs/features/<file>.md IDs <IDs>. Won't do: <IDs or lines>.
Rules to read: rules/global.md, rules/security.md (always); architecture / scalability as the slice needs.
Files to change: <paths>. Not yours: <hot files / other lanes>.
Copy this pattern: <existing file:line that does the same kind of thing>.
[PLAN FIRST - only if more than 3 files or new stored data]
Tests first: <spec files to write>, seen red, then green.
Done = green: own spec files (chromium[, ipad-webkit]), lint, tsc, check:size, check:dod, check:ratchet; checklist ticked with proof.
Done already: <SHAs>. Follow .claude/agents/economy-builder.md.
```

Size: one surface group, at most about 60 turns and about 5 files. Bigger: split before briefing.

Gate 2: `Gate 2 for slice <id>: worktree <folder>, branch slice/<name> at <SHA>, spec docs/features/<file>.md. Builder report + checklist: <paste report>.`

Gate 3: `Gate 3 for slices <ids>: screenshots in <folders>; mock-ups docs/mockups/<names>; builder checklists: <lines>.`

Mechanic: `Job: <one job>. Worktree <absolute path>. Command: <exact>. Done when: <result>. Stop if it needs judgement.`

Escalation: builder stops after 2 failed tries -> Opus builder (same brief + both logs) -> Fable (`economy-gate3` hard case) -> after 3 failures undo the slice and write docs/FAILED.md. A new visual pattern goes to Fable first. Sooner for repeat gate-3 fails: a slice that has failed gate 3 twice gets an Opus builder on its very next fix round (section 11).

## 5. Estimates (honest ranges)

A "slice" = one master-plan area brought to merged on `build/next` after gate 2.

| Per slice                 | Old setup             | Economy               | Basis                                                                                                                                                   |
| ------------------------- | --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator              | 1.4                   | 0.3                   | measured 18.8 units over about 14 slices; Opus at a quarter of the context                                                                              |
| Sub-manager / gate 2      | 2.8                   | 1.0                   | 3 rounds x 0.93 measured; one gate-2 run                                                                                                                |
| Builders                  | 14                    | 8 to 10               | 3 rounds x 1.5 builders x 3.2 measured; minus local full-suite runs, mechanical work moved to Haiku, smaller contexts (25-40% saving, not yet measured) |
| Integration + CI watching | 2                     | 0.7                   | Opus integrators with 80-113 tool calls; Haiku watcher                                                                                                  |
| Gate 3 (Fable)            | 0.5                   | 0.5                   | small, batched                                                                                                                                          |
| **Total**                 | **about 21** (17-25)  | **about 11.5** (9-15) | **about 45% less (30-55%)**                                                                                                                             |
| Fable share of the spend  | about 30% + main chat | under 10% + main chat |                                                                                                                                                         |

**Remaining work:** about 18 slice-equivalents (range 14-24): finish 1, 3, 4, 7, 8, 12, 0g step 2, AI 5d (about 5); new 2, 13, 14, 15, 16, 17, 0g step 3, AI 6-8 (about 10); fixes after owner tests and releases (about 3).

| To finish the master plan     | Old setup                                      | Economy                              |
| ----------------------------- | ---------------------------------------------- | ------------------------------------ |
| Units                         | about 380 (290-600)                            | about 205 (130-360)                  |
| Share of ONE week's allowance | about 60-75%                                   | **about 30-40% (range 20-60%)**      |
| Weeks of quota needed         | 1, with little room for anything else          | **1, with about half the week left** |
| Running time                  | about 3 to 4 build nights (30-45 h of running) | **the same, within 20%**             |

How the share was worked out, and why it is rough: this week's measured helpers add up to about 250 units and the unmeasured build helpers to about 290 more; that, plus the main chat, roughly used up one weekly allowance, so one week is taken as about 550-650 units. That is an inference, not a reading. **Calibrate on day 1:** note `/usage` before and after the first economy slice; that weekly share x 18 is the real figure. If one slice uses more than 3% of the week, stop and review.

### With the builder count from Owner settings (CLAUDE.md, 13 Nov)

The tables above assume 3 builders. With 6:

| To finish the master plan     | Economy, 3 builders     | **Economy, 6 builders**                                                                       |
| ----------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| Units                         | about 205 (130-360)     | about 225 (140-400): the same work, plus about 10% for more merges, conflicts and gate visits |
| Share of ONE week's allowance | about 30-40%            | **about 35-45% (range 20-65%)**                                                               |
| Fable + Opus part of that     | under 20%               | under 20% (builders are about 75% of the spend, Haiku under 1%)                               |
| Running time                  | 30-45 h (3 to 4 nights) | **about 18-26 h (about 2 nights)**                                                            |
| Weeks                         | 1                       | **1**                                                                                         |

Why not twice as fast again: (1) lane P is strictly one after another (toolbar → text box → page menus → page objects → media: 5 big slices, about 3 to 4 h each), so it sets the floor at about 15-20 h; (2) merges go one at a time and each needs a CI run of about 30 minutes; (3) this PC's iPad (WebKit) tests get unreliable under load, so builders must keep to their own spec files; (4) the 5-hour window is reached about twice as fast, and a pause there costs time, not quota. The old build night already ran 6 to 9 lanes at once and did about 1.3 slices an hour; 6 economy builders should match that pace at a little over half its cost.

Speed depends on the number of parallel builders and the CI time (about 30 min per merge) set the pace, not the manager's model. The risk to speed is the 5-hour window, as before.

## 6. Risks and how quality is protected

| Risk                                               | Guard                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| An Opus orchestrator plans less well than Fable    | the plan and the specs already exist (Fable wrote them); Fable still does gate 3 and the hard cases                    |
| No sub-manager reads each diff as it lands         | gate 2 by Opus is kept for every slice before the merge; CI full matrix on every merge                                 |
| Fewer local test runs let a break through          | it cannot reach a green `build/next` or `main`: CI is the judge, red blocks the merge and the release; flags start OFF |
| Smaller builder tasks lose context between helpers | commits, spec IDs and BUILD-STATE carry it; each brief lists the "done already" SHAs                                   |
| Haiku does a judgement job badly                   | it must stop and say so; it never edits tests                                                                          |
| Savings are smaller than estimated                 | measured on day 1 with `/usage`; rollback is one prompt                                                                |

Unchanged: rules/quality.md, the Definition of Done, tests never weakened, 3 attempts then FAILED.md, and money / Supabase / switching a part ON wait for the owner.

## 7. CLAUDE.md wording

Applied 13 Nov; the live wording is CLAUDE.md "How Work Runs".

## 8. Switch and rollback

Switch: let the Fable build orchestrator finish and merge its current slice (or stop it once its helpers have pushed), make sure docs/BUILD-STATE.md is current, then start the agent `economy-orchestrator` with the prompt: `Continue the build. Read docs/BUILD-STATE.md and follow your agent file.` When it ends with "RESTART economy-orchestrator", start it again with the same prompt.

Rollback (any time, nothing to undo in code): stop it and start `fable-manager` with `Continue the build from docs/BUILD-STATE.md per docs/plans/build-master-plan.md`. Delete nothing.

## 9. Brief template (short form for every helper)

This short form applies to search, mechanic and docs helpers only. Builders keep the section 4 template and checklist.

Fable sends six lines, in this order:

1. **Goal:** one sentence on what must exist at the end.
2. **Where:** the worktree and the exact file paths, with line numbers if known.
3. **Spec:** a file path plus a heading. Point to it; never paste it.
4. **Done when:** the exact targeted tests that must pass, and what to commit.
5. **Do not touch:** files or behaviour that are off limits.
6. **Report:** at most 5 lines: done or not, commit id, test result, open problems.

Leave out:

- the history of the task and the reasons behind it;
- pasted file contents or pasted spec text;
- rules the helper's own agent file already holds;
- full test-suite runs (those belong to CI);
- greetings and thanks.

For Haiku, name every step. Sonnet needs less detail.

## 10. Weekly housekeeping

Once a week (owner or Fable):

1. Run `/usage` and note which helper, skill or connector uses the most of the limit.
2. Keep the 8-builder cap (section 11). Every parallel helper sends its own requests against the same limit.
3. Lower the effort setting for mechanical jobs.
4. Clear the chat between unrelated tasks, and avoid idle waiting loops. After a pause the saved context expires and is processed again in full.
5. Keep Haiku prompts under 100,000 tokens. Above that, Haiku 5.5 charges more.
6. Confirm Monday's `webkit` run happened and read its warnings (`gh run list --workflow ci.yml --event schedule --limit 1`).

Unused connectors: switching off connectors the build never uses may cut overhead on every turn. How much that saves here is **unverified**; check `/usage` before switching anything off.

## 11. Speed rules (13 Nov 2026, decided by Fable for the owner)

Goal: a little more speed with no loss of quality or design. Nothing here changes a test, the 3 gates, the Definition of Done, the design rules or Fable's two checks per slice (brief check before building, gate 3 before merge). Source: docs/plans/orchestration-review-2026-11-13.md.

1. **Up to 8 builders at once** (was 6), only on files that do not overlap, hot files still one at a time. At most 2 builders run ipad-webkit tests locally at the same moment (this PC's WebKit tests get unreliable under load). Back to 6 if rework reaches 2 rounds per slice or local tests start to flake. Use the spare seats for the idle main lane (toolbar 1d onwards).
2. **Gates in parallel.** Gate 2 and gate 3 may run at the same time, for different slices or for the same slice at the same commit. A slice merges only when both have passed on the commit being merged; a later commit re-opens the gates exactly as before. Gate 3 stays batched at 2 to 4 slices per visit.
3. **Pictures while CI runs.** Builders shoot the flag-on gate-3 pictures, and gate 3 reviews them, while a CI run is in progress. Nobody waits for CI to start a gate.
4. **Batch CI** (owner approved): up to 3 slices that have each passed gate 2 and gate 3 are merged into `build/next` one after another, each with its own targeted tests, tsc, lint and the combined size check run locally, then ONE full CI run for the batch. Never batch a slice that touches a hot file: it gets its own run. If the run is red, the failing test names its slice; if that is unclear, bisect (take the last merge out and run again). Fix the cause; never re-run until green.
5. **Automatic CI back on.** Merge `main` into `build/next` and resolve docs/DECISIONS.md by keeping both sides (docs only). To stop the conflict returning: build-time docs (DECISIONS, CHANGELOG, BUILD-STATE, PENDING) are written on `main` only, and `main` is merged into `build/next` before each CI batch. The pull-request run is the judge again, publishes the preview and does not start the weekly `webkit` job.
6. **One run at a time per branch.** Do not push to `build/next` or start a run while one is in progress; queue the next batch. A run labelled "cancelled" is read job by job before anyone reacts.
7. **Weekly `webkit` job on hand-started runs:** a hand-started run (Run workflow) skips the `webkit` job unless the `full_webkit` box is ticked. The Monday schedule still runs it. Judge a hand-started run as soon as every required job has finished (`gh run view <id> --json jobs`); do not wait for the warning-only `webkit` job. Green = every job except `webkit` passed.
8. **Repeat-fault list in every builder brief** that makes or changes a screen (one line: "Check ECONOMY-MODE section 11 rule 8 before you shoot pictures"):
   - a thin scroll track under any row that is cut off;
   - a toast sits above the phone tab bar, never on it;
   - the sidebar is closed on iPad portrait;
   - shared parts only: no browser drop-downs, radio dots or resize grips; Lucide icons only;
   - no key names on touch screens;
   - pictures in Light, Dark and Sepia, with real data (not only the empty screen), tips and toasts closed;
   - both levels (Beginner, Professional); iPad landscape and portrait, phone, PC.
9. **Opus sooner for repeat gate-3 fails.** A slice that has already failed gate 3 twice gets an Opus builder on its next fix round (after the first failed try, not the second), with the full fix history in the brief. Three gate-3 fails still means a Fable-written brief.
10. **Fewer orchestrator restarts:** about every 6 waves (was 3), or sooner when its context is heavy. The tables of docs/BUILD-STATE.md are kept current after every merge, so a restart stays cheap.

Expected gain (an estimate, not measured): about 10 to 15 minutes per CI run from rules 5 and 7, 1 to 2 hours per batch of 3 from rule 4, about one gate round (1 to 2 hours) per screen slice from rules 8 and 9. Roughly 25 to 35% less running time to the first full preview.

## 12. Test guard and batch CI (13 Nov 2026, owner approved)

**Test guard hook** (`.claude/hooks/guard-tests.mjs`). Nothing here loosens a test; the hook now blocks more:

- Always blocked: new `.only`, fewer `expect()` calls, emptied test files.
- Blocked unless a reason is given: raising `timeout`, `actionTimeout`, `navigationTimeout`, expect timeout, `test.setTimeout` or `retries`; adding `test.slow`, `grepInvert` or `testIgnore`; new `.skip(` / `.fixme(`; deleting a test file (`rm`, `git rm`, `Remove-Item`) in a Bash command.
- Reason channel (the hook cannot see commit messages): the same added line, or the line just above it, carries a comment `test-guard-reason: <at least 5 words>`. For a Bash delete the comment goes inside the command. The commit message must repeat the reason. A builder only uses this when the owner or Fable has approved the exception; otherwise stop and report.
- Lowering a timeout is allowed.
- The Bash branch (file deletes) only works once settings.json has a Bash entry that runs this file; that settings change is not made yet (open owner decision).

**Batch CI** (owner decision): one full CI run may cover up to 3 slices that have each passed gate 2 and gate 3. A red run is bisected one slice at a time (take the last merge out, run again). Tests are never skipped, and nothing reaches `main` without a green run.

**Push guard** (`scripts/push-guard.mjs`, run by `.githooks/pre-push` in every worktree; owner approved 13 Nov 2026). Before a `git push` it checks only the files the push changes, cheapest first, and stops at the first failure:

- Every branch: Prettier on the changed files, `check:links`. About 3 seconds.
- `build/next` and `slice/*` also: ESLint errors on changed code, `tsc -b`, `check:ratchet`, Vitest tests related to changed `src` files, Playwright chromium on changed e2e specs (at most 6; the rest are named and left to CI), plus the `foundationInput` smoke on `build/next`. About 20 to 40 seconds (measured 19 s and 35 s).
- A block prints `PUSH BLOCKED by the push guard: <step>`, the last lines of output and the command to re-run. Fix the cause; never `--no-verify` (a Claude hook blocks it and hooks-path changes).
- Escape only with an approved reason: a line `push-guard-skip: <at least 5 words>` in the tip commit message. It is loud and logged in `.git/push-guard-skips.log`; every run is logged in `.git/push-guard.log`.
- It only runs existing commands: it never weakens or skips a test, and CI stays the judge.

## 13. Automatic escalation and stall checks (owner, 13 Nov 2026; wanted from the start)

The build escalates by itself; the owner never has to ask.

- **Ladder:** Sonnet builder → Opus builder → Fable. Move up when the same test is red in 2 CI runs, a builder stops twice, or gate 2 or gate 3 fails twice on one slice. If the Opus attempt fails too, Fable works out the exact fix.
- **Stall checks every wave:** act at once when build/next is green and nothing has merged for 30 minutes, when a slice that passed its gates is waiting, or when lanes are idle while free non-overlapping slices exist.
- **Watchdog (hourly, main chat):** checks for stalls as well as whether the orchestrator is alive, and nudges it.
- Log every escalation in docs/BUILD-STATE.md. Quality rules, tests and gates are unchanged.
