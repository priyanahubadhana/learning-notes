# Keep the team small, let programs guard it

_Research report, 14 November 2026. Based on four research notes: official Anthropic documentation and blog posts read on 14 November 2026, plus outside reports from developers. Every suggestion below is a proposal for you to approve. Nothing has been changed._

## The answer in one minute

More agents would hurt this project, not help it. Anthropic's own guides say this kind of work (one app, many screens that share parts, tasks that come one after another) suits **one main chat plus a few helpers, not big teams** ([Agent teams](https://code.claude.com/docs/en/agent-teams)). Every extra helper uses your usage limit on top of the main chat, and running several at once burns the limit about that many times faster ([Agent view](https://code.claude.com/docs/en/agent-view)). Your 13–14 November experience matches the research exactly: lots of usage spent, nothing reached the live app. The lean setup you have now (one manager chat, one or two Sonnet builders, one Opus reviewer, rules enforced by programs) is very close to what Anthropic recommends today. The changes worth making are small: (1) give the builder its own copy of the code automatically (a setting called worktree isolation), (2) add one "stop" check so a builder cannot say "done" while checks are red, (3) once a phase, clean up the rule files and memory, and (4) decide whether to keep the daily cloud task. Do not turn on agent teams, do not build a big orchestrator again, and do not add more reviewers. The evidence on cost is decent. The evidence on _quality_ is thin: nobody has measured whether a separate reviewer catches more bugs. Experienced users believe it does, but they have only their own judgement as proof.

## The words, in plain language

These are the terms the rest of the report uses. Read this once, then skip back when needed.

**Agent / helper.** An agent is Claude working on a task with tools (reading files, running commands). Think of it as a worker.

**Main chat.** The conversation you type into in VS Code. It is the "manager at the desk."

**Context window.** Everything Claude can "see" at once: your messages, files it read, its own answers. Think of it as the worker's desk. A messy desk makes the worker slower and costs more, because Claude re-reads the whole desk with every message ([Costs](https://code.claude.com/docs/en/costs)).

**Subagent.** A helper the main chat sends off with one written note. It starts with an empty desk: it does **not** see your chat, only the note, the CLAUDE.md file and a snapshot of the code status. When done, it sends back only a short report ([Sub-agents](https://code.claude.com/docs/en/sub-agents)). Comparison: a temp worker who gets one instruction sheet and hands back one page. Your builder and reviewer are subagents.

**Fork.** A special subagent that gets a full copy of the main chat's desk. It is cheaper than a fresh helper when the job needs the same background, because it reuses what was already read ([Sub-agents](https://code.claude.com/docs/en/sub-agents)).

**Background agent.** A helper that works while the main chat keeps going, and pings back when finished. Since recent versions, helpers start in the background by default ([Sub-agents](https://code.claude.com/docs/en/sub-agents)). "Agent view" (`claude agents`) is a separate trial feature that runs whole sessions in the background on your PC; they stop if the PC shuts down ([Agent view](https://code.claude.com/docs/en/agent-view)).

**Agent team.** An experimental mode, off unless switched on, where several full Claude sessions talk to each other and share a to-do list ([Agent teams](https://code.claude.com/docs/en/agent-teams)). Comparison: a meeting room of workers instead of a manager handing out notes. Much more expensive.

**Cloud session.** Claude working on Anthropic's computers instead of yours, from a copy of your code on GitHub. It keeps going with your laptop closed and uses the same usage limit as everything else ([Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)).

**Scheduled cloud task (formerly "routines").** A cloud session that starts by itself on a timetable (for example, every morning). Still a trial feature; it cannot ask you questions ([Routines](https://code.claude.com/docs/en/routines)).

**Worktree.** A second copy of the project folder on the same PC, on its own branch (a separate line of changes), so two workers do not trip over each other's files ([Worktrees](https://code.claude.com/docs/en/worktrees)).

**CLAUDE.md.** A note Claude reads at the start of every chat. It is advice, not a lock: Claude can still miss it ([Memory](https://code.claude.com/docs/en/memory)).

**Auto memory.** Notes Claude writes for itself about the project, loaded at the start of each chat. Only the first 200 lines (or 25 KB) of its index are read ([Memory](https://code.claude.com/docs/en/memory)).

**Skill.** A saved recipe (a step-by-step procedure). Only its one-line description sits on the desk; the full recipe is opened only when used ([Skills](https://code.claude.com/docs/en/skills)). Your "next" skill is one.

**Hook.** A small program that runs automatically at a fixed moment (for example, before every command) and can block an action. Unlike CLAUDE.md, it always runs ([Hooks](https://code.claude.com/docs/en/hooks-guide)). Comparison: a door lock versus a "please knock" sign.

**Plan mode.** A mode where Claude may only read and propose, not change files, until you approve ([Permission modes](https://code.claude.com/docs/en/permission-modes)).

**Effort level.** How hard Claude thinks before answering: low, medium, high, xhigh, max. Current models default to medium ([Model config](https://code.claude.com/docs/en/model-config)).

**Usage limit.** Your Max plan's allowance, measured over a rolling 5-hour window and a weekly window. Every chat, helper, background session and cloud run draws from the **same pot** ([Costs](https://code.claude.com/docs/en/costs)).

## Anthropic now says the defaults do most of the work

The biggest change in Anthropic's advice this year is a shift toward simplicity. The current best-practices page says a plain request in a fresh chat "already does the right thing, without any setup," and that setup pays off only for four problems: Claude lacks facts it cannot find in the code, Claude cannot check its own work, a rule must _never_ be broken, or the work costs too much time or usage ([Best practices](https://code.claude.com/docs/en/best-practices)). The same page lists old advice to **stop** following: writing IMPORTANT in capital letters (it makes Claude over-apply rules), using helpers "for a better answer" (a helper on the same or a smaller model does not give a smarter answer; a fresh reviewer helps only because it has not seen the builder's reasoning), and describing the whole code layout in CLAUDE.md.

For **CLAUDE.md**, Anthropic says keep each file under about 200 lines and include only what Claude cannot work out by reading the code, for example the exact command to run the tests, which it calls "the single most useful line" ([Best practices](https://code.claude.com/docs/en/best-practices); [Memory](https://code.claude.com/docs/en/memory)). Longer files "reduce adherence," meaning lines get ignored. If a line keeps being ignored, Anthropic's answer is not more emphasis but turning it into a hook ([Best practices](https://code.claude.com/docs/en/best-practices)). An Anthropic staff blog post from June 2026 adds: give CLAUDE.md an owner and review changes to it like code ([Steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)).

For **hooks and rules**, the line is clear: "If something has to happen every time, make it a hook, a deny rule, or a managed setting." But keep that set small; having "forty of them" means most are only preferences ([Best practices](https://code.claude.com/docs/en/best-practices)). Outside developers agree: one public bug report says CLAUDE.md rules are "not reliably followed," which is why hard rules belong in programs ([GitHub issue](https://claudeissues.com/issue/70420-claude-md-rules-arent-reliably-followed-pretooluse-hooks-are-a-partial-hand-roll)).

For **context**, current models have a very large desk (about a million tokens, a token being roughly three-quarters of a word) and tidy it automatically when it fills up, a process called compaction ([Model config](https://code.claude.com/docs/en/model-config)). Anthropic still recommends `/clear` (wipe the desk) between unrelated tasks, because a chat holding three old tasks re-reads all three every turn ([Best practices](https://code.claude.com/docs/en/best-practices)). After two failed corrections, start fresh with a better request instead of a third correction.

For **proof**, Anthropic warns that without a check Claude "stops when the work looks done ... In practice that makes you the test suite." It suggests a ladder from weak to strong: say "keep going until tests pass," then `/goal` (a separate model checks after every turn), then a **Stop hook** (a program that sends Claude back to work if a check fails), then `/code-review` (a fresh reviewer) ([Best practices](https://code.claude.com/docs/en/best-practices)). It also warns that "a reviewer that's asked to find problems will always find something," and fixing every finding adds clutter.

For **models and effort**, the official advice is: Sonnet "handles most coding tasks well and costs less than Opus"; Opus for complex reasoning; Fable, which is never the default and must be chosen, for the hardest problems and big architecture decisions ([Costs](https://code.claude.com/docs/en/costs); [Model config](https://code.claude.com/docs/en/model-config)). Medium effort fits day-to-day feature work; high for bugs where edge cases matter; max "tends to overthink" on ordinary tasks. Switching model in the middle of a chat makes Claude re-read everything at full cost, so pick model and effort at the start of a chat ([Prompt caching](https://code.claude.com/docs/en/prompt-caching)). Anthropic never spells out a "Fable plans, Sonnet builds" split; its closest built-in mix is `opusplan` (Opus plans, Sonnet builds). Your split follows the same idea, but no one has measured whether it gives better code. The reason for it is cost, not proven quality.

**Plan mode** is recommended before big or unclear work to avoid costly rework ([Costs](https://code.claude.com/docs/en/costs)), and Anthropic suggests having Claude interview you until it can write a spec, then building in a fresh chat from that spec ([Best practices](https://code.claude.com/docs/en/best-practices)). Your "plan with Fable, all questions at once" phase is this same pattern.

## Many agents cost many times more and suit coding poorly

The cost facts are the most solid part of the research. Anthropic says each helper's work "still draw[s] on your usage" on top of the main chat ([Costs](https://code.claude.com/docs/en/costs)); that "running ten agents in parallel uses quota roughly ten times as fast as running one" ([Agent view](https://code.claude.com/docs/en/agent-view)); and that agent teams use "approximately 7x more tokens than standard sessions" when teammates plan first ([Costs](https://code.claude.com/docs/en/costs)). Anthropic's 2025 research system, with one lead and several helpers, beat a single agent by 90% on research questions but used **about 15 times** the tokens of a normal chat, and the same article says coding has "fewer truly parallelizable tasks than research" ([Anthropic Engineering](https://www.anthropic.com/engineering/multi-agent-research-system)). Note that the 15x figure comes from research work, not coding, so treat it as a sign of scale, not an exact price.

Anthropic's guidance on _when_ to use many agents is consistent. Agent teams are for research, reviews, separate modules and debugging with competing guesses; "for sequential tasks, same-file edits, or work with many dependencies, a single session or subagents are more effective" ([Agent teams](https://code.claude.com/docs/en/agent-teams)). The team docs also warn that "letting a team run unattended for too long increases the risk of wasted effort." A June 2026 post from the Claude Code team says "most traditional coding tasks do not need a panel of 5 reviewers" and that extra coordination must be "earned" ([Claude blog](https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code)). Anthropic's long-standing rule is "find the simplest solution possible, and only increas[e] complexity when needed" ([Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)).

Outside developers report the same failures you saw. A consultant running a full role pipeline found code that was built, tested, passed review and was never connected to the app, because "the reviewer checked the task, not the plan"; the lead agent also skipped its own steps ([codecentric](https://www.codecentric.de/en/knowledge-hub/blog/autonomous-development-workflows-with-claude-code)). A lead engineer running a nine-role pipeline on a real product saw about 10 review rounds per feature until he capped them, rule files that grew to thousands of lines, and two hours of work using a full Max 5x allowance ([HackerNoon](https://hackernoon.com/the-joining-tax-a-year-of-governing-claude-code)). Another reported a small "CSV export" task growing into 12 changed files with features nobody asked for ([DEV, Japhet](https://dev.to/javatarz/multi-agent-development-workflows-with-claude-code-n23)). One developer argues the opposite of all role setups: roles and orchestrators "usually make results worse," and four out of five problems come from a weak spec ([DEV, Nek.12](https://dev.to/nek12/claude-pilled-why-complex-agent-workflows-are-working-against-you-222j)).

Where sources disagree: a few people (the HackerNoon and codecentric authors) run big role setups on real products and say they work once capped and gated. They are experienced programmers who read code; you are not, which makes the gates even more important and the extra roles less useful. Outside cost estimates for multi-agent work range from 1.5x to 15x, mostly guesses ([Japhet](https://dev.to/javatarz/multi-agent-development-workflows-with-claude-code-n23); [ksred](https://www.ksred.com/claude-code-agents-and-subagents-what-they-actually-unlock/)). No one found has measured bug rates with and without a reviewer agent. That is the biggest hole in the evidence.

Your 13–14 November run fits this picture almost point for point. About a quarter of a week's limit, 13 manager restarts and 31 rule changes in 35 hours, and nothing shipped is what the research predicts when a tightly linked app is split across many coordinating agents. The lesson is not "agents are bad." It is that coordination costs more than it saves when tasks share files and come one after another.

## Your setup already matches most of the official advice

Checking your files confirms the facts you gave. Your CLAUDE.md is about 5 KB and points to a `rules/` folder read only when needed. Your `.claude/settings.json` has deny rules for force pushes, hard resets and reading `.env`, plus three hooks (guard tests, scan for secrets, block skipping push checks). Your three agent files set `model: sonnet` for builder and `model: opus` with `effort: medium` for reviewer and phase-manager, both supported settings ([Sub-agents](https://code.claude.com/docs/en/sub-agents)).

| Feature                                                 | You have it?             | How it compares with the research                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Short CLAUDE.md, details in files read only when needed | Yes                      | Matches the 200-line advice.                                                                                                                                                           |
| Hooks and deny rules for "never" rules                  | Yes (3 hooks, deny list) | Exactly what Anthropic recommends; the set is small, which is good.                                                                                                                    |
| Push guard and test runs before pushing                 | Yes                      | This is the "check it can run" Anthropic calls most useful.                                                                                                                            |
| Cheap builder (Sonnet), stronger reviewer (Opus)        | Yes                      | Matches "Sonnet for most coding"; quality gain not measured anywhere.                                                                                                                  |
| One reviewer, one visit per task                        | Yes                      | Matches the warning against endless review rounds.                                                                                                                                     |
| Reviewer checks against the plan, not just the task     | Yes                      | Fixes the exact "dead code" failure codecentric reported.                                                                                                                              |
| Spec and plan before building                           | Yes (Fable phase)        | Matches "interview me, write the spec, build fresh."                                                                                                                                   |
| State file and task record                              | Yes                      | Matches Anthropic's long-running agent advice to keep progress in a file ([Anthropic Engineering](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)). |
| Auto memory, one skill, auto-continue at limit          | Yes                      | All official features, used as intended.                                                                                                                                               |
| Agent teams, Agent SDK, headless mode, GitHub Action    | No                       | Right call for this project (see below).                                                                                                                                               |

## Some of it already works with no setup

Several things run on their own and need nothing from you ([Best practices](https://code.claude.com/docs/en/best-practices); [Prompt caching](https://code.claude.com/docs/en/prompt-caching)). **Prompt caching** (Claude reuses what it already read, at a much lower cost) is on by default and lasts about an hour on a subscription. **Auto-compaction** tidies the desk when it fills. **Auto mode** (a safety checker that reviews risky commands so you get fewer pop-ups) is the default in VS Code; Anthropic warns it "reduces prompts but does not guarantee safety," which is why your deny rules still matter ([Permission modes](https://code.claude.com/docs/en/permission-modes)). **Auto memory** is on. **Built-in helpers** (Explore for searching, Plan for research) are used by Claude by itself. **Built-in skills** such as `/code-review`, `/verify` (builds and looks at the running app), `/doctor` and `/usage` are ready to use. **Auto-continue** after a usage limit works only while the chat stays open in VS Code. It does not work in background or cloud sessions, it stops after three continuations, and it does not start if the reset is more than 24 hours away ([Interactive mode](https://code.claude.com/docs/en/interactive-mode)).

One automatic behaviour to know: when your main chat runs on Opus 5, Claude Code adds a line telling it not to start helpers unless asked, because Opus 5 "delegates to subagents more readily than earlier models" ([SDK subagents](https://code.claude.com/docs/en/agent-sdk/subagents)). That fits your lean mode well.

## Four small additions worth considering

### 1. Give each builder its own copy of the code automatically

**What it is.** A one-line setting in the builder file (`isolation: worktree`) that makes Claude Code create a fresh project copy for each builder and clean it up if nothing changed ([Sub-agents](https://code.claude.com/docs/en/sub-agents)). It also blocks the builder from accidentally running commands in your main folder.

**Why it matters here.** Your builder file tells the builder to work "in the working copy and branch the brief names." That depends on the brief being right every time. The setting turns a written instruction into an enforced one, which is the official advice for must-happen rules.

**Pros.** Fewer mix-ups between two builders; less work in each brief; cleanup is automatic.

**Cons.** The copy starts from the main branch on GitHub, not from your PC's latest local work, so unpushed changes would be missing ([Worktrees](https://code.claude.com/docs/en/worktrees)). Each copy needs its packages installed. It may clash with how your briefs set up branches today, so it needs one trial task.

**My pick.** Yes, try it on one task in the next phase. It must not be added in the middle of a phase, because your rules say rule changes wait for the phase to end.

### 2. Add a "stop" check so "done" means green

**What it is.** A Stop hook: a small program that runs when a helper says it is finished and sends it back to work if the quick checks (for example, type check and lint) fail ([Best practices](https://code.claude.com/docs/en/best-practices)). Hooks can be set for one agent only, inside its file ([Sub-agents](https://code.claude.com/docs/en/sub-agents)).

**Why it matters here.** Your push guard already blocks bad pushes. A Stop hook catches the earlier moment when the builder _reports_ done while something is red, before the reviewer is paid to look at it.

**Pros.** Saves reviewer visits; follows Anthropic's "proof, not promises" ladder; costs nothing in usage unless it fails.

**Cons.** It overlaps with the push guard; a slow check would make every finish slow; a badly written hook can loop (Claude Code caps it at 8 blocks in a row).

**My pick.** Yes, but only fast checks, and only on the builder. First check the task record: if builders rarely report "done" while red, skip it. Your own rule says measure before adding process.

### 3. Once per phase, tidy the rules and memory

**What it is.** Built-in commands: `/doctor` and `/doctor prompt-audit` point out stale or conflicting instructions; `/memory` lets you trim the auto memory; `/usage` shows how much each helper and skill used ([Best practices](https://code.claude.com/docs/en/best-practices); [Costs](https://code.claude.com/docs/en/costs)).

**Why it matters here.** Your memory index is short now, but only the first 200 lines are ever read, so a long index silently loses its end. 31 rule changes in two days shows how fast rule files can grow.

**Pros.** No new parts; uses tools you already have; matches "review CLAUDE.md like code."

**Cons.** A small amount of usage each time; a cut that goes too far could drop a rule you still need, so each cut needs your OK.

**My pick.** Yes, at each phase end, as part of the phase-end checklist, with a short list of proposed cuts for you to approve.

### 4. Decide about the daily cloud task

**What it is.** Your one scheduled cloud task. It runs on Anthropic's computers from your GitHub copy, uses your same usage pot, cannot ask questions, and is still a trial feature ([Routines](https://code.claude.com/docs/en/routines)).

**Why it matters here.** Cloud tasks cannot see anything not pushed to GitHub, and they act under your name. Anthropic says to watch the first few runs and protect important branches so the task cannot change them.

**Pros.** Works while your PC is off; good for read-only jobs such as a morning health report.

**Cons.** Uses usage every day whether or not it finds anything; trial feature that may change; a task that changes code without you watching is the riskiest kind of automation.

**My pick.** Keep it only if it is read-only (reports, no code changes) and the task record shows it found something useful in its first week. Otherwise switch it off.

## What to avoid, and why

**Agent teams.** Experimental, cost up to about 7x, do not give teammates separate copies of the code, and Anthropic says they fit poorly with same-file, step-by-step work ([Agent teams](https://code.claude.com/docs/en/agent-teams)). Auto-continue also does not start by itself in teammate sessions. One hidden risk: if teams are switched on, a helper Claude names can quietly become a teammate. Avoid.

**A big orchestrator again** (managers over managers, hourly watchdog). This is the 13–14 November setup. The research gives no reason to expect a different result. Avoid.

**Several reviewers or "opposing" review panels.** Anthropic says ordinary coding does not need a panel of five reviewers, and a reviewer "will always find something" ([Claude blog](https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code); [Best practices](https://code.claude.com/docs/en/best-practices)). Keep one.

**Dynamic workflows and `/batch`.** These start dozens of helpers for large, separate jobs such as moving hundreds of files ([Workflows](https://code.claude.com/docs/en/workflows)). Not your kind of work.

**Agent SDK, headless mode, GitHub Action.** The SDK is for building your own product on top of Claude ([Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)). Headless and the GitHub Action are for running Claude without a chat; neither gets auto-continue at a usage limit, and the Action also uses GitHub minutes ([GitHub Actions](https://code.claude.com/docs/en/github-actions)). Your push guard already covers what they would add. Not needed now.

**Haiku builders and max effort.** Anthropic suggests Haiku only for very simple helper jobs, and says max effort overthinks ordinary tasks ([Costs](https://code.claude.com/docs/en/costs); [Model config](https://code.claude.com/docs/en/model-config)). Your "no Haiku in the build" and "medium effort" rules match this.

## Would more agents help or hurt?

**Hurt, at least at today's size.** Your app's screens share parts, your tasks come one after another, and you are the only person who can test on the iPad. Outside developers report the same limit: agents can move faster than a person can check them ([search roundup](https://www.webpronews.com/from-solo-coder-to-command-center-how-developers-turn-claude-code-into-swarms-of-parallel-agents/)). A second builder helps only when two planned tasks touch completely separate files. Your current "one or two builders" limit already allows for that. A third adds cost and merge work faster than it adds speed. The one honest uncertainty: no one has measured bug rates for setups like yours, so the best proof will come from your own task record. If the numbers show builders often waiting on each other or on review, look at where they wait before adding anyone. That is your own rule, and the research supports it.

## Conclusion

The most useful finding is that Anthropic's own advice has moved toward what you did after the failure: fewer coordinating agents, more checks that run as programs, and short instructions. The gap between your setup and "using Claude Code to the fullest" is not missing features. It is a few written instructions that could become enforced settings (worktree isolation, a Stop check), plus a routine cleanup. From here on, "to the fullest" means using what you have more strictly, not adding more.

The second takeaway is about trust. The parts of your setup that rely on Claude reading and obeying (CLAUDE.md, memory, the manager's checklist) are the parts most likely to slip under pressure. The parts that run as programs (hooks, deny rules, push guard) cannot slip. As a non-programmer owner, every rule you truly care about should, over time, move from the first group to the second, one at a time, after a phase ends, and only when the task record shows it is needed.
