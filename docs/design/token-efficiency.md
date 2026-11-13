# Token efficiency: cheap, fast multi-agent setup

Researched 12 Nov 2026 from official Claude Code docs (costs, sub-agents, prompt caching, model-config pages).

## 10 rules

1. **Pick model and effort at the start; do not switch mid-task.** Each model has its own cache; a switch re-reads everything at full price. (Effort changes are cache-safe on the 5.x models.)
2. **Default to Sonnet 5.5 at medium effort for coding.** Docs: Sonnet is for "everyday implementation with a clear scope". Raise effort to high only for bugs or risky work.
3. **Use Fable and Opus only for hard thinking** (planning, architecture, design judgement, final review). They burn your 5-hour and weekly limit fastest.
4. **Give agents short briefs that point to files.** Write "read docs/design/X.md, do Y", not pasted text. Sub-agents start empty and see only the brief plus CLAUDE.md.
5. **Use sub-agents for noisy side jobs** (search, tests, logs, research). Only a summary returns, so the main chat stays small. Do quick edits and back-and-forth inline; a sub-agent starts cold and costs more.
6. **Make search run on Haiku.** Use `.claude/agents/economy-search.md` (`model: haiku`, read-only: Glob, Grep, Read). It is named economy-search, not Explore, to avoid clashing with the built-in Explore agent (whose model and interaction with our file are unverified).
7. **Never re-read files; batch independent tool calls in one message.** Fewer round trips means fewer re-sent contexts and faster work. Run agents in parallel only when files do not overlap.
8. **Keep CLAUDE.md under about 200 lines.** It loads on every request of every agent. Move workflow detail into rule files or skills that load on demand (we already do this). Use `omitClaudeMd: true` for pure-executor agents.
9. **`/clear` between unrelated tasks; `/compact` at natural breaks, not mid-task.** Stale context is re-paid on every message. After a break longer than the cache lifetime (1 hour on a subscription, 5 minutes for sub-agents), the next turn is a full-price re-read, so batch work in bursts.
10. **Checkpoint and measure.** Commit small, keep PENDING/HANDOFF notes. Run `/usage` to see which skills, agents and MCP servers use the most, plus the cache hit line; `/context` shows what fills the window. Limit gh/API calls (one `gh` call with `--json`, then reuse the result). When a limit hits, Claude Code can wait and continue automatically after reset (v2.1.234+).

## Model per role

Non-build tasks. The build: docs/ECONOMY-MODE.md section 2.

| Role                                   | Model                                 | Effort |
| -------------------------------------- | ------------------------------------- | ------ |
| Manager: plan, delegate, verify        | Fable 5.2 (or Opus 5.5 to save quota) | medium |
| Sub-managers: review, design decisions | Opus 5.5                              | medium |
| Coding executors                       | Sonnet 5.5                            | medium |
| Bug fixing / risky code                | Sonnet 5.5                            | high   |
| Mechanical edits, formatting, renames  | Haiku 5.5                             | low    |
| Search / Explore                       | Haiku 5.5                             | low    |
| Tests/log summarising                  | Haiku 5.5                             | low    |

Note: every sub-agent draws from the same 5-hour and weekly limit, and teams use about 7x tokens, so keep helpers few and short-lived. Fable may bill to usage credits (ask the owner first).

## Sources

- https://code.claude.com/docs/en/costs
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/prompt-caching
- https://code.claude.com/docs/en/model-config
- https://code.claude.com/docs/en/best-practices
