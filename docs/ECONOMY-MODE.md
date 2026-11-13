# Economy mode for the build (in force from 13 Nov 2026, owner-approved)

Goal: the same features, speed, quality and design at a much lower usage cost. Quality is protected by keeping the same 3 gates, the same tests and the same Definition of Done (rules/quality.md). Only who does which job changes.

Status: IN FORCE. CLAUDE.md "How Work Runs" carries the rule. Start with 4 parallel builders; go up to 6 only while rework stays under 2 rounds (owner, 13 Nov).

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

| Role                 | Old                                | Economy                                                                                                      | Why                                                                               |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Top (main chat)      | Fable                              | Fable, but thin: starts the orchestrator, relays, nothing else                                               | owner rule: Fable at most half the plan                                           |
| Orchestrator         | Fable, one long chat               | **Opus**, `economy-orchestrator`, small context, restarted every 3 waves; state lives in docs/BUILD-STATE.md | half the price per token and a quarter of the context: about 80% less per wake-up |
| Sub-managers         | 3 Opus relays per slice round      | **removed as a relay**; the orchestrator briefs builders directly                                            | one less layer to pay and wait for                                                |
| Builders             | Sonnet, whole slice, 100-170 turns | **Sonnet**, `economy-builder`, one sub-slice of about 60 turns, targeted tests only                          | cost follows turns                                                                |
| Mechanical work      | mostly done by Sonnet builders     | **Haiku**, `economy-mechanic`: es/hi texts, formatting, docs lines, clean merges, watching CI                | about 20 times cheaper than Sonnet                                                |
| Gate 2 (QA)          | Opus sub-manager                   | **Opus**, `economy-gate2`, read-only, once per finished slice                                                | same check, same model                                                            |
| Gate 3 (screenshots) | Fable                              | **Fable**, `economy-gate3`, 2 to 4 slices per visit                                                          | same check, fewer cold starts                                                     |
| Hard cases           | Opus then Fable                    | Sonnet twice, then an Opus builder, then Fable; a new visual pattern goes to Fable                           | unchanged rule                                                                    |

The old agent files are untouched (`fable-manager`, `opus-submanager-*`, `sonnet-executor`, `haiku-executor`), so rollback is just using them again.

## 3. Rules for every helper

- **Briefs point to files, never paste them.** Under 250 words, every field of the section 4 template filled.
- **Design + quality checklist:** builders tick the 17 lines in .claude/agents/economy-builder.md with proof; gate 2 and gate 3 reject a slice on any ✗.
- **Worktrees:** one per slice (they exist: `../ln-s*`), reused by each new builder of that slice. A new worktree only for a new slice. Docs-only and read-only jobs need none.
- **Tests:** locally run only the spec files of the sub-slice (chromium; ipad-webkit for touch code) plus lint, tsc and the size check. The full matrix runs once per merge in CI on the `build/next` pull request (free, public repo). A Haiku helper runs `gh run watch <id> --exit-status`, then lists the failed test names from `gh run view <id> --log-failed`. No local full suites.
- **Output:** long command output goes to a file; read the tail or search the failures.
- **Batching:** up to 6 builders at once on files that do not overlap (owner, 13 Nov: Sonnet builders are cheap on the Max plan); gate 3 in batches; one docs commit per wave for BUILD-STATE, the PENDING board and CHANGELOG; one CI run per merge, not per commit.
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

Escalation: builder stops after 2 failed tries -> Opus builder (same brief + both logs) -> Fable (`economy-gate3` hard case) -> after 3 failures undo the slice and write docs/FAILED.md. A new visual pattern goes to Fable first.

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

### With up to 6 builders at once (owner's choice, 13 Nov)

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
2. Keep the 6-builder cap. Every parallel helper sends its own requests against the same limit.
3. Lower the effort setting for mechanical jobs.
4. Clear the chat between unrelated tasks, and avoid idle waiting loops. After a pause the saved context expires and is processed again in full.
5. Keep Haiku prompts under 100,000 tokens. Above that, Haiku 5.5 charges more.

Unused connectors: switching off connectors the build never uses may cut overhead on every turn. How much that saves here is **unverified**; check `/usage` before switching anything off.
