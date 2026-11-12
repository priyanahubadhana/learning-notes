# Guiding cheaper models (Sonnet builders, Haiku helpers)

Researched 13 Nov 2026. Question: Sonnet and Haiku get work done but are not the smartest. How do strong teams make them reliable? Short answer: a tight brief, real examples to copy, checks a machine runs (not judgement), and a quick hand-up to a smarter model when stuck.

## What the sources say

1. **Every brief needs four things: objective, output format, tools/sources, boundaries.** Vague briefs made Anthropic's own subagents duplicate work or leave gaps. (Anthropic, multi-agent research system)
2. **Say how big the job is.** Effort guidance (how many tool calls, when to stop) keeps helpers from spiralling. (same)
3. **Right altitude.** Specific enough to steer, not a wall of rules. Show a few canonical examples instead of listing every edge case. (Anthropic, effective context engineering)
4. **Point, don't paste.** Give file paths and spec IDs; the helper loads them when needed. Ask for a short distilled report back. (same)
5. **Give it a check to run.** The single biggest lever: tests, typecheck, lint, screenshots. "A check that has to pass before anything counts as done." Rules that can never have exceptions belong in a script or hook, not in prose. (Claude Code best practices)
6. **Explore, plan, then code** for anything non-trivial; name existing patterns to copy. (Claude Code best practices)
7. **Ground truth at every step** (test and tool results), plus a stopping condition such as a maximum number of tries. (Anthropic, building effective agents)
8. **Error-proof the interface (poka-yoke):** e.g. absolute paths only. Fewer ways to go wrong beats more warnings. (same)
9. **Evaluator-optimizer:** one model builds, another checks against clear criteria. That is our gate 2. (same)
10. **Subagents get a focused prompt, limited tools and a clean context.** (Claude Code subagents docs)
11. **Claude follows instructions precisely**: say exactly what "done" looks like, and give the reason behind a rule so the model applies it well. (Claude prompt-engineering best practices)
12. **Spec-driven development:** spec, then plan, then small tasks, each tied to spec lines; acceptance tests from the spec first. (GitHub Spec Kit)
13. **Test-first for agents:** write the failing test from the spec, then make it pass; never edit the test to pass. (Anthropic Claude Code best practices; Kent Beck-style TDD as used by agent teams)

## Gaps found in our setup, and what was changed

| Gap | Fix (applied) |
| --- | --- |
| Builder brief had a goal but no output format, done criteria or file pointers | New template: objective, exact spec IDs + won't-do, files to touch, pattern to copy, tests first, done = commands green |
| No examples of existing patterns to copy | Brief names one existing file that does the same thing |
| No self-check before reporting | Builder ticks the Design + quality checklist and pastes command results |
| "Stop and ask" triggers vague | Explicit list in the builder file |
| Escalation after 2 tries was only in the orchestrator | Builder stops after 2 tries; orchestrator sends it to an Opus builder |
| Complex step went straight to code | Sub-slices touching more than 3 files or a new state shape: plan first (10 lines in the report), then build |
| Tests written alongside code | Tests written first from the spec lines and seen to fail |
| Judgement used where scripts exist | `check:dod`, `check:ratchet`, `check:size`, `check:links`, lint, tsc required in done criteria |
| Design principles could get lost in cheap runs | One checkable checklist in builder, gate 2 and gate 3; any fail = slice rejected |
| Haiku jobs unclear on done | Mechanic brief: one job, exact command, expected result |

Quality rules are unchanged (rules/quality.md); this only makes them easier to follow.

## Sources

- https://www.anthropic.com/engineering/multi-agent-research-system
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://www.anthropic.com/engineering/building-effective-agents
- https://www.anthropic.com/engineering/claude-code-best-practices
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/sub-agents
- https://docs.claude.com/en/docs/agent-sdk/overview
- https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices
- https://docs.claude.com/en/docs/about-claude/models/choosing-a-model
- https://github.com/github/spec-kit
- https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/
