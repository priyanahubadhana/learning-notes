# CLAUDE.md review: what to add, fix and keep out (13 Nov 2026)

Proposal only. Nothing in CLAUDE.md, the global file, `rules/` or memory was changed. Changes to the rules wait for the owner's OK.

Files reviewed: project `CLAUDE.md` (86 lines) and global `C:\Users\pc\.claude\CLAUDE.md` (15 lines), against rules/quality.md, docs/ECONOMY-MODE.md (sections 3, 9, 11, 12), docs/CONTINUITY.md, docs/design/token-efficiency.md, docs/design/quality-standard.md and the memory index.

**Result:** 6 lines to add, 11 lines to fix or remove, 8 things to keep out. Net effect: the project file gets about 8 lines shorter, because the duplicates removed in B outweigh the lines added in A.

Line numbers below are from the files as they stand at commit 905083ea.

---

## A. ADD (6 short lines)

These are things the owner has said more than once that are today only in memory notes or deep in a rule file. Memory is loaded only in the main chat, so helpers never see it. Put all six in "Core Operating Rules".

| # | Proposed line (exact) | Why |
| --- | --- | --- |
| A1 | **Status line:** start every message to the owner with `Status: <what is happening>` and `Needs you: no` or `Needs you: yes, <what>`. | Memory only (status-line.md). The owner asked for it on every message; no helper or new session sees it. |
| A2 | **Stop the line:** a red test stops everything on that slice until the root cause is fixed. Never weaken, skip or delete a test to get green. | The andon rule is only a 4-word mention at line 49 and half a line at 31. It is the rule the owner repeats most (rules/quality.md section 4; quality-standard.md line 9). One clear line replaces both mentions. |
| A3 | **Never drop a feature:** a redesign or rebuild keeps every feature (simple by default, advanced behind ▾); check against the spec and the feature inventory before saying done. | Memory (never-drop-features.md) and rules/quality.md line 21 only. Builders working from a mock-up are the ones who drop features, and they do not read memory. |
| A4 | **Do it yourself:** do every chore you can do. Ask the owner only for: money, logins and Supabase, switching parts ON, possible data loss, a test on a real device, or a real product decision. | Memory (do-it-yourself.md). Also gives one single list of "when to ask"; today line 27 has a different, shorter list. Replaces the list in line 27 (see B4). |
| A5 | **When you must ask:** all questions at once, each with 2 to 5 options and your pick. During an autonomous build do not stop: take the safest option and log it in docs/DECISIONS.md "Decisions to review". | Memory (ask-and-suggest.md) says "ask many questions"; economy mode says "never stop". This line says when each applies, so they stop contradicting each other. Replaces line 17's middle sentence. |
| A6 | **Proof before "done":** never report done without evidence: the test run, the screenshot, or the page checked in a browser. | Repeated in three memory notes (pass-all-comments, dev-server-stale-files, quality bar) and in gate 3, but nowhere as a general rule. |

Considered and not added (already covered well enough): Apple-level calm design (line 9, see fix B6), autonomy and escalation (lines 27 to 28), plain words (line 13), token rules (line 29), continuity (line 30).

---

## B. REMOVE or FIX (11)

### Project CLAUDE.md

| # | Line today | Conflict | Proposed replacement |
| --- | --- | --- | --- |
| B1 | L3: "If any request conflicts with a rule here or in `rules/`, STOP, flag the conflict and ask before proceeding." | "STOP and ask" for everything contradicts L27 "nobody waits for the owner" and the autonomous build. | "If a request conflicts with a rule here or in `rules/`: for money, data loss, secrets or a rule change, stop and ask. Otherwise take the safest option, log it in docs/DECISIONS.md "Decisions to review" and carry on." |
| B2 | L7: "Budget ₹0 unless the owner says otherwise." | The owner pays for a Max plan, and memory mentions an approved AI credit. "₹0" is no longer true as written and reads as a ban on things already approved. | "No new spending without the owner's OK (the Claude plan is already approved)." Then delete L61, which says the same thing. |
| B3 | L14: "Way of working: Plan each phase together (all its questions at once), then Execute the whole plan without stopping. Interrupt the owner only when truly needed." | "Plan together" is the old model. Since 13 Nov the build runs by itself; the owner tests when free. | "Way of working: the build runs by itself (Core Operating Rules). New phases or features that are not yet specified: ask all questions at once, then execute without stopping." |
| B4 | L27: "...nobody waits for the owner except for money, Supabase, switching parts ON, or possible data loss." | A second, shorter "when to ask" list than A4 (no device tests, no logins, no product decisions). Two lists will drift. | Keep the first half ("a manager plans and delegates; cheaper models do the work") and end with "nobody waits for the owner except as listed in Do it yourself." |
| B5 | L23: "briefs up to 6 **Sonnet** builders" | The Owner settings table (L38) says up to 8. Same file, two numbers. ECONOMY-MODE.md has the same clash (section 3 and 11 say 8, the section 5 heading says 6). | "briefs the **Sonnet** builders (number: Owner settings)". Never repeat a setting outside the table. Also fix the ECONOMY-MODE section 5 heading. |
| B6 | L9: "Design rules live in rules/architecture.md (Design)." | Stale pointer. The Apple-level bar and checklist now live in docs/design/quality-standard.md and owner-ui-patterns.md (L50 says so). | "The bar and the checklist: docs/design/quality-standard.md. Nothing ships below it." |
| B7 | L49, L51, L52 (Always Apply: Quality, Continuity, Token efficiency) | Each repeats a Core Operating Rules line (L31, L30, L29) with slightly different words. Every helper pays for both copies every turn. | Delete these three bullets. Move their one unique fact each into the matching Core line: "one worktree per slice", "the owner only needs to type continue", and the pointer to ECONOMY-MODE section 3. Keep L50 (Design) and L53 (Owner comments). |
| B8 | L59: "No building beyond the current phase. No skipping phases." | Owner settings say "first full build fast, then the remaining slices". The build no longer goes phase by phase, so this line would stop the orchestrator. | "Build only what docs/BUILD-STATE.md and the approved specs list. No extras." |
| B9 | L22 (usage limit: auto-resume) and L62 (secrets) | Word-for-word duplicates of the global file (lines 13 and 14), which is loaded in every session anyway. | Delete both from the project file. |

### Global CLAUDE.md

| # | Line today | Conflict | Proposed replacement |
| --- | --- | --- | --- |
| B10 | L4: "For every task: main manager = Fable ... → Opus sub-managers ... → Sonnet/Haiku executors." | "Fable for every task" contradicts economy mode (Opus runs the build; Fable only plans, checks briefs, does gate 3 and hard cases) and the owner's "Fable at most about 50% of the limit". L9 already says the project wins, but L4 still reads as an order. | "Default: a manager plans, delegates, checks and delivers; cheaper models do the work, in parallel when files do not overlap. Use the most capable model only for planning, hard cases and final review. A project's "Owner settings" set the exact roles." Then L9 can be dropped. |
| B11 | L14: "Owner preferences: plain words for a beginner; ask before anything that costs money; never put secrets in chat or code." | Not wrong, but it sits under "Continuity" and misses the two preferences that apply to every project. | Move to its own heading "Owner" and add: "Start each message with Status and Needs you. Do what you can yourself; ask only for decisions, money, logins and device tests." |

### Also stale, outside the two files (for the record, no change proposed here)

- Memory note economy-mode-autonomy.md says 6 builders; the setting is 8.
- Memory note bugs-only-until-friday.md expires today (13 Nov); the HANDOFF carry-over review it asks for is due.
- Memory note autonomous-redesign-mode.md still says "stop at Phase L".
- rules/quality.md section 5 names the gates by the old roles ("QA sub-manager", "main manager"); in economy mode these are economy-gate2 and Fable gate 3.
- docs/ECONOMY-MODE.md has two sections numbered 12.

---

## C. KEEP OUT of CLAUDE.md (8)

Every line here is paid for by every helper on every turn. These belong behind a pointer.

1. **The 17-point design and quality checklist.** Stays in docs/design/quality-standard.md; only gate 2 and gate 3 need it.
2. **The 7 Definition of Done conditions.** Stay in rules/quality.md section 3; one pointer is enough.
3. **Escalation and stall detail** (30-minute stall check, hourly watchdog, 2-run rule). Stays in ECONOMY-MODE section 12; only the orchestrator needs the numbers.
4. **The 6-line brief template in full and CI batching rules** (3 slices per run, bisect on red). ECONOMY-MODE sections 9 and 11. L29 could even drop the bracketed field list.
5. **The 10 token-efficiency tips.** Stay in docs/design/token-efficiency.md. The "checked against the official docs, 12 Nov; re-check monthly" note (L52) is a maintenance note and belongs in that file, not here.
6. **Owner profile, schedule, plan and quota history.** Stay in memory. Only the current setting belongs in the Owner settings table.
7. **Dated or temporary rules** ("bugs only until Friday", "priority: text box and Pencil"). They go stale and then contradict the file. Keep them in docs/PENDING.md.
8. **Approval dates and history** ("owner-approved 9 Nov 2026", "from 13 Nov 2026"). The history is in docs/DECISIONS.md; CLAUDE.md should state only what is true now.

---

## Suggested order if the owner agrees

1. B first (removals and fixes), so the file gets shorter.
2. Then the six A lines into Core Operating Rules.
3. Fix the two ECONOMY-MODE items and the three memory notes in the same pass.
4. Run the mirror copy and add a CHANGELOG entry.
