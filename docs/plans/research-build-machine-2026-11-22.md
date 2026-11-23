# Research: context size, verification and the Claude team's own practice (22 Nov 2026)

Done by Fable with the owner before phase 1M. Plain words first, sources at the end. Decisions taken from it: docs/DECISIONS.md, 22 Nov "The build machine"; the plan: [phases/phase-1m-build-machine.md](phases/phase-1m-build-machine.md).

## 1. Where a window gets dumber

- There is no single number. Anthropic calls it "a performance gradient rather than a hard cliff" and an "attention budget" that every token spends. The independent Chroma study tested 18 models: every one got a little worse at each step; by about 113K tokens every model was clearly weaker. No verified 32K, 64K or 128K breakdown exists for the current Claude models.
- Anthropic's own rules: "when you start a new task, you should also start a new session"; one long session costs more than several short ones; "the model is at its least intelligent point when compacting"; `/clear` between unrelated tasks; after two failed corrections, clear and write a better prompt; carry the state in a file.
- Auto-compact fires near the top of a 1M window (about 967K) by default, so it does nothing for sharpness. The lowest window Anthropic allows is 100K (`autoCompactWindow`, `/autocompact`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW`).
- Our own tasks (docs/metrics/tasks.csv) used 81K, 152K and 209K tokens each.
- **Our bar (owner, 22 Nov):** a task is planned to finish under 100K; safety compaction at 120K, never relied on.

## 2. What the Claude Code team itself does

- Verify before done: tests, build and lint, a per-repo `verify` skill before each commit, then a second agent reviews the diff in a fresh window. First-pass approvals rose from 65% to 78%. A separate grader with a rubric improved task success by up to 10 points.
- Three rounds, then a human. Flaky tests are never skipped, slept or retried; fixed or deleted with a written reason.
- The judge cannot be edited by the change: review rules live on the base branch; a commit gate (off, observe, enforce) blocks commits whose session ran no review or verify.
- Lean context: over 80% of their system prompt removed with no loss; CLAUDE.md kept light; verify and review moved into skills loaded on demand.
- Parallel agents only with strong tests and a known-good oracle. The 16-agent C compiler run: fresh container per agent, task-lock files, about 2,000 sessions; "16 agents didn't help because each was stuck solving the same task".
- Planning just in time with prototypes, not long roadmaps.

## 3. The features, as the docs state them (Claude Code 2.1.316 here)

- `/verify`: a bundled skill that builds the app, runs it and watches the result; records a recipe in `.claude/skills/verify/SKILL.md`; a project recipe runs before each commit (v2.1.286+).
- Stop hook: runs when a helper tries to end its turn; exit 2 or `decision: block` sends it back with the reason; `stop_hook_active` guards loops; eight continuations in a row, then the turn ends (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`).
- Subagents: a fresh, empty window each; only the final message returns (often 1,000 to 2,000 tokens); `autoCompactWindow` per agent (100000 or more, v2.1.296+); per-agent model and effort.
- `/goal <condition>`: the chat keeps working across turns until a small fast model judges the condition met from the visible output only; billed extra; `/clear` removes it. Chat only, not for helpers.
- `/loop [interval] [prompt]`: minimum 1 minute, lives while the session is open, 50 tasks, expires after seven days. For watching, not for work.
- Agent teams: experimental, off by default, "significantly more tokens", interactive only. Not now.
- Plan mode: reads and proposes, edits nothing until approved.

## 4. Individual accounts (six read, four first-hand)

Agree on: a standing rules file; observable proof, never the model's word; a human checkpoint before big work; small single-goal tasks; hooks and tests as gates. Disagree on: how many agents (parallel reviewers, single agent, or only with a named trigger); how much runs unattended; how heavy planning is. Only one protects the checks from the agent being checked; the Claude team does too.

## 5. Gap between the research and this repo

- Have: push guard, CI fast and full sets, test-weakening guard, secret scan, short briefs, builder and reviewer agents, plan mode, a visual test against saved app pictures, one spec (update-v2) fully on template v2 with must-never lines mapped to scenarios.
- Lack: a done gate inside the builder's window; a fresh-window checker by program; the three-round cap by program; any window cap (the rule said one long chat); Analyze (M5); look compare against the mock-up; a seed for the Test notebook; numbers written by program; a judge the builder cannot edit.

## Sources

Official: [Best practices](https://code.claude.com/docs/en/best-practices) · [Context window](https://code.claude.com/docs/en/context-window) · [Sub-agents](https://code.claude.com/docs/en/sub-agents) · [Hooks](https://code.claude.com/docs/en/hooks) · [Commands](https://code.claude.com/docs/en/commands) · [Scheduled tasks](https://code.claude.com/docs/en/scheduled-tasks) · [Skills](https://code.claude.com/docs/en/skills) · [Agent teams](https://code.claude.com/docs/en/agent-teams) · [Session management and 1M context](https://claude.com/blog/using-claude-code-session-management-and-1m-context) · [Maximizing the value of sessions](https://claude.com/resources/articles/maximizing-the-value-of-your-claude-code-sessions) · [Subagents in Claude Code](https://claude.com/resources/articles/subagents-in-claude-code) · [Effective context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) · [How Anthropic teams use Claude Code](https://claude.com/blog/how-anthropic-teams-use-claude-code) · [Running an AI-native engineering org](https://claude.com/blog/running-an-ai-native-engineering-org) · [How the Claude Code team thinks about verification](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/) · [Solving code review](https://claude.dev/blog/solving-code-review-at-anthropic/) · [Context engineering for Claude 5](https://claude.dev/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models/) · [Building a C compiler with parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler) · [Verification loops with skills](https://claude.com/resources/articles/building-verification-loops-in-claude-code-with-skills)

Independent: [Chroma context rot, summary](https://www.zenml.io/llmops-database/context-rot-evaluating-llm-performance-degradation-with-increasing-input-tokens) · [Context rot notes](https://olegchursin.com/notes/context-rot) · [Harness with hooks and tests](https://blog.logrocket.com/build-claude-code-harness-hooks-and-tests/) · [Verification loops](https://www.greyscript.ai/blog/claude-code-verification-loop-verify-skill/) · [Damian Galarza](https://www.damiangalarza.com/posts/2025-11-25-how-i-use-claude-code/) · [Ran Isenberg](https://ranthebuilder.cloud/blog/claude-code-best-practices-lessons-from-real-projects/) · [Jose Parreño Garcia](https://joseparreogarcia.substack.com/p/claude-code-agent-teams) · [Avi Chawla on /goal](https://blog.dailydoseofds.com/p/claude-codes-goal-command)
