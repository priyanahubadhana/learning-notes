# The rule changes of 26 Nov 2026 (step 2b): the list for your review

**What this is.** You said yes on 26 Nov to [the plan after 1A](plan-after-1a.md), with a review afterwards. Step 2b brings the rule files in line with section 9 of that plan. This page lists every change, so that you can say "ok" or "put back" for each one. Made by Opus on branch `docs/rules-2b`. Nothing here is on main yet.

**State tonight (the PC was switched off):** two files of nine are done (CLAUDE.md and METHOD-v2). The rest is listed at the end under "Still to do". Nothing in them was changed.

**How each change was chosen.** Only the lines that section 9 of the plan names. A rule that came from your decision changes only where a later decision of yours replaces it; both are named below. Where I was not sure, the line stays and becomes a question.

## 1. CLAUDE.md (the project rules) — commit 2d5c4c51

A head line at the top now says: these lines were changed in step 2b, the plan wins where they differ, and this list holds the changes.

**1.1 The one loop with a confirm sheet**

- Old words: "In one line: your words → "what I heard" → plan → main questionnaire with options → spec page in two layers → confirm sheet → plan and tasks → build, tests first → analyze → review once → the owner's test by scenario → issues → fix loop → switch ON."
- New words: "From phase 1B the work runs in two modes (owner, 25 Nov): planning mode, where the owner and Fable write the specs together and the owner approves them; execution mode, where Opus builds from the specs and decides by itself (plan section 4)."
- Your old decision: 22 Nov, the method of METHOD-v2 (all 11 rows yes). Your later decision: 25 Nov, the two modes (Fable review 0.2 and 0.9), and your yes of 26 Nov to plan section 9.

**1.2 The size of a phase**

- Old words: "A stage holds phases of at most two weeks, each ending with a train release (...); a phase holds 10 to 20 parts; a part is under a day for one builder."
- New words: "A stage holds phase parts (1A, 1B, …); a phase part keeps its full size and is divided into day parts of 3 to 5 parts of work (owner, 25 Nov; plan section 3), each phase part ending with a train release (preview every Friday, live every second Friday on the owner's yes); a part is under a day for one builder."
- The release train words are kept as they were (see question Q1).
- Your old decision: 22 Nov, "at most two weeks, 10 to 20 parts". Your later decision: 25 Nov, "a phase keeps its full size ... divided into parts of one working day, 3 to 5 parts" (Fable review 0.1, answer 1), and your yes of 26 Nov.

**1.3 Outside auditors at two gates**

- Old words: "Outside auditors (owner, 22 Nov 2026): Codex, Cursor and Antigravity are read-only auditors at the analyze gate and the fresh-checker layer; rules in AGENTS.md, how-to in docs/qa/README.md; Claude Code merges their reports, the owner decides, only a yes becomes work; Claude Code is the only tool that changes the project."
- New words: "Outside auditors at two gates: no longer hold (the owner's yes of 26 Nov to plan section 9). Claude Code is the only tool that changes the project."
- Your old decision: 22 Nov (narrowed the same day to Antigravity only). Your later decision: only your yes of 26 Nov to section 9. The plan gives nothing in its place; I added nothing.

**1.4 "Opus drafts specs"**

- Old words: "drafts ordinary specs with the lenses"
- New words: "builds from the specs that the owner and Fable write in planning mode (plan section 4)"
- Your old decision: 21 Nov, "Opus builds and drafts ordinary specs". Your later decision: 25 Nov, the two modes (planning mode is you and Fable).

**1.5 20 of 20 before a merge**

- Old words: "Tests: chromium on each merge; ipad-webkit nightly and before each release; 20 of 20 before a merge."
- New words: the first half is kept; then: ""20 of 20 before a merge" no longer holds: "done" is said by a program, and "ready" is written only when the full set is green (plan F6); a proof with many repeats runs on the hosted machines for the risky parts (plan section 3)."
- Your old decisions: 20 Nov (20 of 20 repeats), 23 Nov (20 of 20 once at merge), 24 Nov ("keep the repeat bar"; the proof on the hosted machines). Your later decision: your yes of 26 Nov to section 9, which names this line. Please look at this one with care: on 25 Nov you put the "repeat bar" row of the review on hold, and on 26 Nov the plan named it as no longer holding.

**1.6 The weekly card**

- Old words: "Weekly card: Saturday evening, eight computed numbers and the owner's one line (METHOD-v2 M-05). Rules change only at a phase end, from the numbers."
- New words: "The numbers: one line for each day part, written by Opus from git and CI (plan section 8); the weekly card no longer holds. Rules change only at a phase end, from the numbers."
- "Rules change only at a phase end" is your standing rule and stays.
- Your old decision: 22 Nov, the weekly card on Saturday. Your later decision: your yes of 26 Nov to sections 8 and 9.

**1.7 Windows of 100K and four gate layers**

- Old words: "one task, one fresh builder window planned under 100K tokens, safety compaction at 120K never relied on; the manager chat is cleared at each part boundary; a normal task passes four gate layers (...), a tiny task (...) the first two."
- New words: "one task, one fresh builder window; the manager chat is cleared at each part boundary. The window plan of 100K tokens and the four gate layers no longer hold: the owner accepted the audit of the build machine on 25 Nov (plan sections 2 to 4)."
- Your old decision: 22 Nov, D1 to D4 of the build machine. Your later decision: 25 Nov, you accepted the audit (Fable review 0.9 and 14.7, pick A). "The manager chat is cleared at each part boundary" is not named, so it stays (question Q2).

**1.8 "Five tries for Opus"**

- Old words: "failures (the same thing three times for Sonnet, five for Opus) and questions go Sonnet → Opus → Fable; the owner comes last."
- New words: "failures go up the owner's ladder of 24 Nov (Sonnet 3 tries → Opus at medium effort 2 → Opus at high effort 1 → Fable → the owner; plan section 4), and questions go Sonnet → Opus → Fable; the owner comes last."
- Your old decision: 20 Nov, "Opus five fails → Fable". Your later decision: 24 Nov, the ladder (DECISIONS, 24 Nov evening, answer 1).

**Not changed in CLAUDE.md:** "never call Fable by itself". The only such words are in the replan trigger ("it never escalates to Fable by itself for this trigger"), which is your own rule of 22 Nov for replanning, and the plan keeps the replan counter. So it stays (question Q3). "Fable ... used as little as possible" stays.

## 2. docs/METHOD-v2.md (the method) — commit 16044920

A head line at the top, as in CLAUDE.md. The confirm sheet, the scenarios, the steps table and the changes log are records of what you said yes to; they were not touched (question Q4).

**2.1 The one loop** — old: "One loop for everything (picture 1): your words, ... confirm sheet, ... switch ON." New: "Two modes (owner, 25 Nov; replaces the one loop with a confirm sheet for every part): planning mode ...; execution mode ... (plan section 4)." Decisions: as 1.1.

**2.2 One spec size with a bottom layer for builders** — old: "Two layers, one file. Every spec has a top layer for the owner (...) and a bottom layer for builders (...). The top layer stands on its own." New: "A big spec and a small brief (owner, 25 Nov; replaces the one spec size with a bottom layer for builders). Each helper sees only what it needs: a small brief, with the big spec at hand to check a fact; the spec lines in a brief are equal to the lines in the spec (plan F3 and section 3)." Your old decision: 21 Nov, the two-layer spec. Your later decision: 25 Nov, "two briefs" (Fable review 0.2), and your yes of 26 Nov. (The review's "card" of 300 words was a proposal you put on hold, so it is not used.)

**2.3 20 of 20 before a merge** — old: "20 of 20 before a merge." New: ""Done" is said by a program; "ready" only when the full set is green (plan F6)." Decisions: as 1.5.

**2.4 The size of a phase** — the same change as 1.2; the train words are kept.

**2.5 The weekly numbers** — old: "Eight numbers a week, computed; the owner's one line; rules change only at a phase end, from the numbers." New: "One numbers line for each day part, written by Opus from git and CI (plan section 8); rules change only at a phase end, from the numbers." Decisions: as 1.6.

**2.6 Fable reached only by the ladder** — old: "otherwise it is reached only by the ladder." New: "otherwise it is reached by the ladder, or by Opus's own short questions, three a day at most (owner, 25 Nov; plan section 4)." Your old decision: 21 Nov, "the owner opens Fable sessions by hand; Fable used as little as possible". Your later decision: 25 Nov, Opus asks Fable by itself, three questions a day (Fable review 13.7).

**2.7 Opus drafts specs** — old: "drafts ordinary specs with the lenses; runs the questionnaire and the confirm sheet;" New: "builds from the specs that the owner and Fable write in planning mode (plan section 4);" Decisions: as 1.4. "Runs the questionnaire and the confirm sheet" went with it, because in planning mode you and Fable do that; please check.

**2.8 "Built"** — old: "every scenario test green 20 of 20 and analyze clean". New: "the full set green after the merge (plan section 9) and analyze clean". I kept "and analyze clean" because the plan does not name it; today analyze passes almost no page, so it may need your word later.

## 3. Questions for you (my pick first)

- **Q1. The release train** ("preview every Friday, live every second Friday"). What: an old rule of yours (22 Nov). Why it matters: the plan says the live app changes often, on your yes, when the full set is green; it does not name the train. Options: A (my pick) keep the train words until you decide; B take them out, so "live often on your yes" is the only rule. Case against A: the two can be read as a clash.
- **Q2. "The manager chat is cleared at each part boundary"** (22 Nov). The plan now has a fresh part manager for each part, so this may no longer matter. A (my pick) keep it until you say; B take it out.
- **Q3. "Never call Fable by itself" in the replan trigger.** A (my pick) keep it: replanning is a planning talk, and you open those. B take it out. Case against A: it may be read as a limit on the three questions a day (it is not).
- **Q4. Old words left in METHOD-v2's records** (the weekly card in S7, M-05 and the tools; "tests first" for Sonnet; the ladder without its counts). A (my pick) leave them, because the head line says the plan wins; B correct them too.
- **Q5. Which model writes the tests (the test-writer)?** The plan does not say. A (my pick) Sonnet at medium effort, the cheapest that can do it; B Opus.

## 4. Proposals for your own global files (under `~/.claude`; not touched)

- `~/.claude/CLAUDE.md` and `playbook.md`: old words "takes a task over when Sonnet failed it twice"; proposed new words "takes a task over when Sonnet failed the same thing 3 times (the ladder of 24 Nov: Sonnet 3 → Opus medium 2 → Opus high 1 → Fable → the owner)".
- The old state file name (`docs/BUILD-STATE.md`, playbook line 66): proposed new name `docs/STATE.md` (your decision of 24 Nov).

## 5. Still to do (not changed yet)

These files are exactly as they were. The plan for each:

- `docs/plans/phases/phase-1m-build-machine.md`: its status "Confirmed" becomes "replaced on 25 Nov by the audit you accepted, except part 1M-14 (the proof on the hosted machines)"; its parts table stays as a record.
- `docs/plans/stage-1-plan.md`: "1B starts on the machine" (no longer, 25 Nov); the sizes of 1B (not known, plan section 6); "diagrams rendered to pictures" (diagrams made of shapes and arrows that can be changed, your words of 25 Nov); the notebook front page with its Dashboard and the phone for cards in 1B (25 Nov).
- `.claude/agents/builder.md`: "2 tries" becomes 3 (ladder); the fixed 20-minute run limit becomes the measured length plus a margin, 60 minutes at most (24 Nov); the tests are written by the test-writer, not the builder (F4); the main chat merges into the code line.
- `.claude/agents/reviewer.md`: the check against the old bottom layer becomes the check against the big spec's lines and the tests against the lines.
- `.claude/agents/phase-manager.md`: "not used" head line; `docs/BUILD-STATE.md` and `docs/PENDING.md` become `docs/STATE.md`.
- New files `.claude/agents/part-manager.md` and `.claude/agents/test-writer.md` (plan section 4).
- `docs/STATE.md` fixed facts: "pull request #5" (now: no pull request to main open; #70 was merged on 26 Nov) and "no new code live since 12 Nov" (now: 1A live since 26 Nov, 01:31 IST, 7e53ae5d).
- After all: one check by a fresh helper that did not make the changes (plan step 2b).

## 6. How to put everything back

- Everything at once: `git checkout rules-before-2b-2026-11-26 -- CLAUDE.md docs/METHOD-v2.md`, then commit. (When the other files are done, add them to the same line; the two new helper files are removed with `git rm .claude/agents/part-manager.md .claude/agents/test-writer.md`.)
- One file: `git checkout rules-before-2b-2026-11-26 -- <file>`, then commit.
- One change: the old words are above; Opus writes them back.
- A "put back" is done the same day, and the work done under that rule since then is looked at again.
