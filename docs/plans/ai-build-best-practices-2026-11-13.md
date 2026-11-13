# Building an app with AI agents: best practices and where we went wrong (13 Nov 2026)

Asked by the owner: what are the best ways to build a real app with AI coding agents, how do we use AI to the fullest, and where did our setup go wrong?

Read-only research. Pages were read on 13 Nov 2026. "Not verified" means I only saw it in a search summary or a single blog, not on the original page. Practitioner blogs are one person's experience, not tests; treat their numbers as hints.

## Short answer

- The sources agree on one thing above all: **the agent needs a quick, trustworthy pass/fail check it can run itself, and a short plan written before building**. Parallel agents are second.
- Anthropic itself says multi-agent works best for research, and that **most coding tasks have fewer parts that can run in parallel** and need shared context. So "more agents" is not the goal. "Fewer hand-offs, clear briefs, fast checks" is.
- Our slowdown looks less like "wrong models" and more like **one sequential bottleneck (the orchestrator plus the gates), a slow and noisy judge (CI), and rules that kept changing**.

## 1. The best practices (10), with sources

**P1. Give the agent a pass/fail check it can run itself, and ask for the evidence.**
Claude Code's best-practices page: without a check, "looks done" is all the agent has, "that makes you the test suite". Options: tests, build exit code, linter, a screenshot next to the mock-up, a Stop hook that sends the agent back until the check passes, and a fresh reviewer that never saw the conversation. Ask for the command and its output, not "all tests pass".
Source: [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
Backed by: [Anthropic, long-running agents](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents): agents marked features done after unit tests or `curl` only; real browser testing "as a human user" found far more bugs.

**P2. Keep the check fast, local and in the builder's own loop.**
Builders should run a targeted test and fix before reporting. A practitioner running 3 to 5 agents says gating every merge on the test exit code cut "agent broke something" by about 80% (one blog, not verified elsewhere). The point is that the failing output goes straight back to the agent that wrote the code, not through a human or a slow remote run.
Source: [5 lessons from running agents in parallel](https://dev.to/battyterm/5-lessons-from-running-ai-coding-agents-in-parallel-53on); [Claude Code best practices](https://code.claude.com/docs/en/best-practices)

**P3. Write the spec and tests first; the brief is the highest-value work.**
"The architect prompt matters more than the number of engineers." A 4-month report calls spec and test writing the highest-leverage human work (30 to 60 minutes of spec for 10 to 20 minutes of agent work). A week-long 3-agent trial found a build without tests was "inconsistent and buggy" and test-first was "nearly everything right in one pass".
Sources: [5 lessons](https://dev.to/battyterm/5-lessons-from-running-ai-coding-agents-in-parallel-53on); [4 months of multi-agent workflows](https://tianpan.co/forum/t/4-months-running-multi-agent-coding-workflows-what-actually-works-and-what-does-not/742); [Software Mansion, 3 agents for a week](https://rec.swmansion.com/blog/what-i-learned-running-3-claude-agents-in-parallel-for-a-week)

**P4. Brief every worker completely: goal, output format, tools, boundaries.**
Anthropic's research team: vague briefs made workers duplicate each other. They also put effort rules in the lead's prompt (simple job = 1 worker, bigger job = a few), because the early lead started 50 workers for simple questions.
Source: [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)

**P5. Start simple. Add agents only when it measurably helps.**
"Use the simplest solution that works." Multi-agent systems used about 15 times the tokens of a chat (agents alone about 4 times). They beat one agent on research by 90.2% on Anthropic's own eval, but Anthropic names coding as a poor fit: fewer parallel parts, and agents coordinate badly in real time.
Sources: [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents); [multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
**Contradiction:** Cognition (Devin) argues parallel writing agents make conflicting hidden decisions and recommends one linear agent, with narrow read-only helpers that answer questions. Anthropic's research post takes the opposite side for research. Both agree on shared context and on coding being the hard case. [Cognition: Don't build multi-agents](https://cognition.com/blog/dont-build-multi-agents) (a vendor opinion, not a test).

**P6. Work in small steps, one feature at a time, and leave a clean state.**
Anthropic's long-running harness: an initial feature list (all "failing", the agent may only flip pass), a progress file, git commits, one feature per session, and a start-up routine (read progress and git log, run a basic end-to-end check, then work). This fixed "declares done too early" and "leaves half-built work".
Source: [Effective harnesses for long-running agents](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents). Note: this page is about one coding agent across many sessions; Anthropic lists "one general agent vs several specialised ones" as an open question.

**P7. Isolate parallel work in git worktrees, and keep it to about 3 to 5 agents.**
Two agents in one folder silently overwrote each other. Several practitioners put the useful ceiling at 3 to 5 agents because the human's review time and merge conflicts then dominate; tasks that "look independent" often are not. Claude Code has a built-in worktree option for subagents (`isolation: worktree`).
Sources: [Claude Code subagents](https://code.claude.com/docs/en/sub-agents); [4 months of multi-agent workflows](https://tianpan.co/forum/t/4-months-running-multi-agent-coding-workflows-what-actually-works-and-what-does-not/742); [5 lessons](https://dev.to/battyterm/5-lessons-from-running-ai-coding-agents-in-parallel-53on). The "3 to 5" figure is anecdotal.

**P8. Use a task board and keep state in files, not in one long chat.**
A plain Todo / In progress / Done file, one task per agent, stops two agents taking the same job. Anthropic's harness and research system both save state and resume from where they stopped instead of restarting. Our BUILD-STATE file is this idea; the problem is only that it went stale (see section 2).
Sources: [5 lessons](https://dev.to/battyterm/5-lessons-from-running-ai-coding-agents-in-parallel-53on); [harnesses](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents); [research system](https://www.anthropic.com/engineering/multi-agent-research-system)

**P9. Match the model to the job, and keep context small.**
Official cost page: Sonnet handles most coding; keep Opus for hard architecture and multi-step reasoning; Haiku for simple high-volume helpers; run noisy work (tests, logs, searches) in a subagent so only a summary returns; `/clear` between unrelated tasks; keep CLAUDE.md under about 200 lines and move workflow detail into skills. Each extra agent or teammate adds its own token use.
Source: [Manage costs](https://code.claude.com/docs/en/costs)

**P10. Enforce must-never-break rules with hooks, and review with a fresh pair of eyes that is told to skip style.**
"CLAUDE.md is for guidelines, and Claude is allowed to decide a guideline doesn't apply." Anything that must happen every time should be a hook or a deny rule. A reviewer asked to find problems "will always find something", so scope it ("against SPEC.md, report gaps that affect correctness and skip style").
Source: [Claude Code best practices](https://code.claude.com/docs/en/best-practices)

**P11. Keep the human in the loop where judgement matters, and use a small eval first.**
Anthropic started evaluating with about 20 test queries (early changes have big effects) and still needed human testing for edge cases. Practitioners say "fire and forget" did not hold: one agent spent an hour on a wrong path. Expect a 3 to 4 times gain, not 10 times (one report, not verified).
Sources: [research system](https://www.anthropic.com/engineering/multi-agent-research-system); [5 lessons](https://dev.to/battyterm/5-lessons-from-running-ai-coding-agents-in-parallel-53on); [4 months](https://tianpan.co/forum/t/4-months-running-multi-agent-coding-workflows-what-actually-works-and-what-does-not/742)

**P12. Do not keep changing the rules mid-run.** *(My synthesis, not a quoted source.)* Anthropic's harness works because the rules, feature list and start-up routine are fixed at the start and agents only update status. Every source that describes a working system describes a stable one. No source I found measured the cost of mid-run rule changes, so that cost on our build is **not verified**.

### Where sources disagree or are thin

| Topic | Disagreement or gap |
| --- | --- |
| Parallel writing agents | Anthropic's research setup uses them; Cognition says avoid them for code. Anthropic also says coding fits poorly. |
| Specialised agents (tester, reviewer) vs one generalist | Anthropic calls it an open question. |
| Number of agents | "3 to 5" is repeated by bloggers, with no controlled test found. |
| CI as the judge | I found **no detailed first-hand report** on CI as the only judge for parallel agents. The sources favour fast local test gating (P2). |
| Throughput gains | Claims range from 2.5 to 5 times; all anecdotal. A weaker team in one report had 35% more defects in month 1 and rolled back (secondhand, not verified). |
| Product names/versions | Blog posts disagree on when features such as agent teams shipped. Use the official docs, not blogs, for features. |

## 2. Where we went wrong, mapped to the practices

Our facts: one Opus orchestrator doing every brief, gate and merge in order, restarted 7 times in 19 h; Sonnet builders on 60-turn pieces; Haiku helpers; Fable screenshot gate holding merges, up to 10 visits per slice; CI as the only judge and red 9 of 15 runs; 24 rule changes during the build; output fell to a third of the day before, when an Opus sub-manager plus Sonnet executors worked well. Causes below are my reading of the facts and of docs/plans/orchestration-review-2026-11-13.md. The cause of the drop in output is **not proven**; no controlled comparison exists.

| # | What went wrong | Practice broken | How sure |
| --- | --- | --- | --- |
| 1 | **CI was the only judge.** A 24 to 40+ minute remote run, red 9 of 15, mostly timing and formatting, not app bugs. The builder does not see the failure while it still has the code in mind. A conflicted pull request even made runs slow and mislabelled "cancelled". | P1, P2 | High. It is in our own review. |
| 2 | **One orchestrator on the critical path.** Every brief, gate and merge went through one agent, one at a time (about 0.4 merges per hour against a plan of 1.3). Its context filled, so it restarted 7 times, and each restart re-learned a stale state file. | P5, P8, P9 | High on the facts; the link to the output drop is likely, not proven. |
| 3 | **Review gate as a queue.** Up to 10 Fable visits per slice; the same faults (scroll track, toast, sidebar) failed again and again because builders were not told them up front. Review became the bottleneck, which practitioners warn about. | P3, P4, P7 | High. Gate 3 gave 14 FAIL against 7 PASS and repeated faults. |
| 4 | **Pieces too big for cheap builders.** 60-turn Sonnet pieces drift and are hard to verify; the harness advice is one small feature per session with a start-up check. | P6, P3 | Medium. Turn counts are ours; I did not measure drift. |
| 5 | **Stale and contradictory state file.** Top half from 00:05, truth appended at the bottom. | P8 | High. |
| 6 | **24 rule changes during the build.** Each change reaches builders late and resets what they were told. | P12, P10 | Medium. Count is ours; the cost is a judgement. |
| 7 | **Rules in documents, not enforced.** The test-guard hook missed the Reader change (a raised wait on all iPad tests); a CI job was re-run until green. | P10 | High (our review, section 4). |
| 8 | **Haiku used for waiting jobs that stopped** (CI watching). Cheap model on a long wait is the wrong match. | P9 | Medium. |
| 9 | **Speed estimate was a best case** ("2 to 4 hours"), so every red run looked like a failure of the plan. | P11 | High. |

What worked and should be kept: Opus sub-manager plus Sonnet executors with small tasks (the day before), the 3 gates catching real problems, worktree per slice, state in git and files, no skipped tests.

## 3. What to change in the new system (Opus manager + Sonnet builders, on trial)

Ranked by likely impact. "Conflict" means it touches an owner quality rule and needs the owner's OK first. No item removes a gate or a test.

1. **Builders run the tests and the screenshots themselves before reporting, and fix what fails (P1, P2).** CI becomes the final confirmation, not the first feedback. Needs a short local command list per slice (targeted tests, lint, type check, screenshot script). *Conflict check:* ECONOMY-MODE says no local full suites. Targeted tests are already allowed; keep the full suite in CI. No conflict if limited to targeted tests.
2. **Put the known gate-3 faults into every builder brief, and write them into the shell once (P3, P4).** The 10-line pre-check list from the orchestration review (scroll track, toast position, sidebar default, no browser controls, Lucide icons, Light/Dark/Sepia, tips closed). Cheapest fix with the biggest cut in gate visits. No conflict.
3. **Make the manager do less: manager plans and briefs; a separate cheap job merges and watches CI (P5, P9).** Manager reads one short state table, briefs, reviews reports; mechanics do merge, rebase and CI watching (use Sonnet, not Haiku, for waits). Target: manager context stays small so restarts become rare. No conflict.
4. **Small pieces: one slice part per builder, finishable in about 20 to 30 turns, with tests written first (P3, P6).** Split anything bigger before briefing. No conflict.
5. **Run 3 builders at the same time on separate files, not 6 (P7).** Review time is the limit. Keep the idle main lane (toolbar) busy first. No conflict.
6. **Freeze the rules for the trial period (P12).** Collect rule ideas in one list and apply them once a day at a fixed time, not mid-slice. Exception: stop-the-line safety fixes. *Possible conflict:* CLAUDE.md says changes to the rules need the owner's OK anyway, so this fits; the owner decides the freeze.
7. **Turn the rules that must never break into hooks (P10).** Extend the test guard to catch `actionTimeout`, name-pattern exclusions, deleted test files and shell edits; add a Stop hook that runs the slice's targeted test and type check in the slice folder (the current one checks the wrong folder for builders).
8. **Cut gate 3 to the minimum that the owner's quality bar needs, without lowering it (P3, P10).** Keep Fable for new visual patterns and for a slice's final pictures; let Opus gate 2 plus the builder's own screenshot script catch the repeat faults. Tell reviewers "report only what breaks the spec or the design rules, skip taste". **Conflict:** the owner's quality rules (3 gates, Apple-level bar, "bug-free over speed"). Do not do this without the owner's OK. A safer version: keep Fable on every merge, but cap visits at 2 per slice by sending all faults in one list.
9. **Batch CI for up to 3 ready, switched-off slices (P2).** From the orchestration review, fix 2. **Conflict:** the written rule is one CI run per merge. Needs the owner's OK.
10. **Rewrite BUILD-STATE as one table and refresh it at every merge (P8).** One line per slice: state, owner, next step, last run. Haiku can do it. No conflict.
11. **Use Anthropic's start-up routine at every restart or new builder (P6):** read the table and git log, run one quick end-to-end check, then work. Fixes the cost of restarts. No conflict.
12. **Estimates in ranges with the red-run rate built in (P11).** Use measured merges per hour, not the best case. No conflict.

Reasonable to try later (not verified as helping us): a dedicated reviewer subagent with a fresh context for gate 2, as the docs describe (`/code-review`).

## 4. What to measure (cheap, from git and CI)

Check these each day and compare with the best day before:

| Measure | Why | How |
| --- | --- | --- |
| Merges per hour (and slices merged per day) | The real output; our baseline is about 0.4 per hour against the plan's 1.3 | `git log` on `build/next` |
| First-time CI pass rate | Shows if builders self-check (target above 60%; today 6 of 15 finished runs, about 40%) | `gh run list` |
| Gate visits per slice (gate 2 and gate 3 separately) | Shows if briefs carry the known faults (today up to 10; target 2) | gate files |
| Repeat faults per slice | Same fault twice means the brief or the shell is wrong | gate files |
| Orchestrator restarts per day (target 2 or fewer) | Shows context pressure | session log |
| Idle builder time | Shows if the manager is the bottleneck | time between merge and next brief |
| Rule changes per day | Shows if the freeze holds | git log on `rules/` and CLAUDE.md |
| Tokens or plan percent per merged slice | Shows cost against the weekly cap | `/usage` (Claude Code), Anthropic says it attributes use to subagents |
| Defects found after merge (owner tests) | Quality must not fall while speed rises | owner bug list |

Judge the trial on at least 6 merges, not 1 or 2, because slices differ in size (low confidence on any shorter comparison).

## 5. Not verified

- Dates and numbers from blogs (3 to 5 agents, 80% fewer breaks, 3 to 4 times gain, 35% more defects) are single-source anecdotes.
- The Anthropic pages were read through a summarising fetch tool, not word for word; the figures quoted (15 times tokens, 90.2%, 20 queries) came back consistently with the secondary write-ups.
- Why output fell to a third is not proven. It may be partly slice size or CI noise, not only the setup.
- Whether a Sonnet manager would hold a long run as well as Opus: no source tested it.
- I did not re-read docs/ECONOMY-MODE.md section 1 or the agent files; facts about our setup are the ones given in the brief plus the orchestration review.
