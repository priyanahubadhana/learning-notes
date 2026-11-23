# Cost and quality additions (proposal, 13 Nov 2026)

Eight additions, ranked by value for the effort. Nothing here weakens rules/quality.md or the 3 gates.

How to read this:

- Size: S = under an hour, M = about half a day, L = several days. These sizes are my estimates.
- "Quota" means the Max plan limit. "Money" means real API spend, which always needs the owner's OK.
- Each "Source" line says where the fact comes from. "Our setup" = the check of this repo done today. "Anthropic docs" = the official guidance read today.
- **Unverified** marks anything I could not trace to those two sources. Nobody has measured any saving yet, so no percentages are given.

## Ranked list

**1. One short brief template for every helper (build system)** — DONE (13 Nov)

- Purpose: Fable sends the same small message shape every time (template at the end).
- Pros: fewer tokens per helper. Shorter context also gives better answers, because accuracy drops as context grows.
- Cons: Fable must point to files instead of explaining, so the spec files must be right.
- Cost: S. Saves quota on every brief.
- Who: Haiku adds it to docs/ECONOMY-MODE.md.
- Recommendation: **DONE (13 Nov).**
- Source: Anthropic docs (context windows: curate what is in context; every turn re-sends history).

**2. Fix the "continue" command (build system)** — DONE (13 Nov)

- Purpose: `/next` does four jobs (git status, npm audit, handoff, continue), has no clear "use when" line, and never reads docs/BUILD-STATE.md, where the build state lives in economy mode.
- Pros: a restart finds its place from the state file instead of re-reading the project.
- Cons: none found.
- Cost: S. Saves quota on every restart.
- Who: Haiku.
- Recommendation: **DONE (13 Nov).**
- Source: our setup (.claude/commands/next.md); Anthropic docs (keep state in files so a new session recovers fast; descriptions should say what and when).

**3. Add the missing cheap search helper (build system)** — DONE (13 Nov)

- Purpose: docs/design/token-efficiency.md line 12 asks for a Haiku search agent file, .claude/agents/Explore.md. It does not exist.
- Pros: helpers use the session's model unless one is set, so an Opus session runs Opus helpers. A file pins search to Haiku. Search results also stay out of the main chat.
- Cons: Haiku needs more detailed instructions than Opus. Claude Code has a built-in search helper with the same name; which model it uses, and how our file would interact with it, is **unverified** and must be checked first.
- Cost: S. Saves quota.
- Who: Haiku writes it, after Fable checks the point above.
- Recommendation: **DONE (13 Nov).**
- Source: our setup; Anthropic docs (sub-agents: set model per agent).

**4. Weekly usage check and housekeeping (build system)** — DONE (13 Nov)

- Purpose: five habits, no building.
  - Run `/usage` weekly to see which helper, skill or connector uses the most of the limit.
  - Keep the 6-builder cap. Every parallel helper sends its own requests against the same limit.
  - Lower the effort setting for mechanical jobs.
  - Clear the chat between unrelated tasks, and avoid idle waiting loops. After a pause the saved context expires and is processed again in full.
  - Keep Haiku prompts under 100,000 tokens. Above that, Haiku 5.5 charges more.
- Pros: shows where to cut instead of guessing.
- Cons: a few minutes a week. Today's restart rule (near 120,000 tokens or 3 waves) is a rule of thumb; nothing measures context size, and this item does not fix that.
- Cost: S. Saves quota.
- Who: Fable.
- Recommendation: **DONE (13 Nov).**
- Also worth a look: switching off connectors the build never uses (Anthropic docs say unused ones add overhead each turn). How much it would save here is **unverified**.
- Source: Anthropic docs (costs page; sub-agents; context windows); our setup (economy-orchestrator.md line 21).

**5. Switch on prompt caching (app AI)** — APPROVED (13 Nov)

- Purpose: the app can already mark the fixed part of a prompt for reuse (src/ai/providers.ts lines 51-58, src/ai/provider.ts line 63), but no caller in the main code sets it. So caching is wired and unused.
- Pros: Anthropic docs say caching lowers the price of the repeated part. Answers do not change.
- Cons: the cache expires after a short time, so it only helps when the same fixed part is reused soon. The cached tokens still fill the context window. The exact discount, the lifetime and any minimum prompt size are **unverified**; measure before relying on it.
- Cost: S. Lowers money per AI run.
- Who: Sonnet.
- Recommendation: **APPROVED (13 Nov)**, first task of the AI slice.
- Source: our setup; Anthropic docs (context windows; costs page).

**6. Real token count for the cost preview (app AI)** — APPROVED (13 Nov)

- Purpose: today the app guesses size as about 4 letters per token (src/ai/provider.ts line 126) and blocks prompts over 20,000 guessed tokens (src/ai/aiRun.ts line 109). The "Show what will be sent" preview (docs/features/ai.md line 27) uses that guess. The addition asks the provider for the true count before a run.
- Pros: a more honest "most this can cost" figure. Likely fewer prompts blocked or allowed by mistake (**unverified**; depends on how far the guess is off, which nobody has measured).
- Cons: one extra network call per preview. Needs today's guess as the fallback when offline. Whether the count call is free, and its limits, are **unverified**.
- Cost: M. Small effect on money; raises trust.
- Who: Sonnet.
- Recommendation: **APPROVED (13 Nov)**, first task of the AI slice.
- Source: our setup.

**7. Scripts for repeat chores (build system)**

- Purpose: fixed steps run as scripts. Candidates: watching a CI run, merging build/next into a slice branch, the mirror copy.
- Pros: only the script's result enters the chat, not the steps. Fewer slips.
- Cons: scripts need upkeep. Which of these chores are already scripted is **unverified**.
- Cost: M. Saves quota each wave.
- Who: Haiku writes, Sonnet reviews.
- Recommendation: **later**, after the first full build.
- Source: Anthropic docs (skill authoring: put deterministic steps in scripts).

**8. Memory tool for the app's AI**

- Purpose: let the app's AI remember facts about a user's notes between runs.
- Pros: more personal answers (**unverified**).
- Cons: neither source covered this tool, so how it works, what it costs and where it stores data are all **unverified**. It would touch privacy and deletion rules (rules/security.md).
- Cost: L (rough guess). Likely raises money.
- Who: Sonnet builds, Opus reviews.
- Recommendation: **skip for now.** Read the official page first; decide when the owner approves AI cost.

## Brief template (Fable to a cheap model)

Six lines, in this order:

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

For Haiku, name every step. Sonnet needs less detail (Anthropic docs: Haiku needs more detail than Opus; where Sonnet sits is my judgement).

## Needs the owner

- OK to do items 1 to 4 now. Items 1 to 3 change rule, command or agent files, which need your approval.
- Items 5 and 6 approved (13 Nov, see docs/DECISIONS.md). Item 8 stays skipped.
