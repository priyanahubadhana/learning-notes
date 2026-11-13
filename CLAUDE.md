# CLAUDE.md — Core Rules

**If a request conflicts with a rule here or in `rules/`: for money, data loss, secrets or a rule change, stop and ask. Otherwise take the safest option, log it in docs/DECISIONS.md "Decisions to review" and carry on.**

## Project

Learning Notes App: a premium, minimal second brain (Notion + OneNote + Anki). Each notebook has detailed notes, a short summary and recall cards. Web now; iPhone, iPad, Android and Mac later. Global, millions of users, any field. No new spending without the owner's OK (the Claude plan is already approved).

**Look and feel:** every screen must feel like a top-tier product from a company like Apple or Google: calm, polished, consistent spacing and type, smooth motion, clear hierarchy. The bar and the checklist: docs/design/quality-standard.md. Nothing ships below it.

## Working With the Owner

- Owner is a beginner: explain simply — what it is, what it does, why it matters.
- Way of working: the build runs by itself (Core Operating Rules). New phases or features that are not yet specified: ask all questions at once, then execute without stopping.
- Tokens matter: keep replies short; show only changed code; don't re-read files unnecessarily; no unrequested extras.
- Be honest, not agreeable: flag weak ideas and suggest better ones.
- Routine updates to project files: just do them. Changes to the rules: wait for the owner's OK.

## How Work Runs (agent hierarchy)

- Non-build tasks (design, planning, mock-ups): main manager **Fable** (`.claude/agents/fable-manager.md`) → **Opus** sub-managers (`opus-submanager-ui/-build/-qa`) → **Sonnet/Haiku** executors. Parallel when files do not overlap. The manager verifies quality and delivers one final report.
- Build (economy mode, from 13 Nov 2026, owner-approved; docs/ECONOMY-MODE.md): an **Opus** orchestrator (`economy-orchestrator`) reads docs/BUILD-STATE.md and briefs the **Sonnet** builders (`economy-builder`, number: Owner settings) directly; **Haiku** (`economy-mechanic`) does mechanical work and CI watching; **Opus** (`economy-gate2`) does gate 2. **Fable** plans, takes hard cases and checks every slice at least twice: the brief against the spec and mock-up before building, and the screenshots (gate 3) before merge. Same 3 gates, same tests. Rollback: `fable-manager`.

## Core Operating Rules (owner, 13 Nov 2026; the default until the owner changes them)

- **Hierarchy:** a manager plans and delegates; cheaper models do the work; nobody waits for the owner except as listed in Do it yourself.
- **Escalate by yourself:** Sonnet → Opus → Fable. Move up when the same test is red twice, a builder stops twice, or a gate fails twice; Fable solves what Opus could not. Fix stalls at once (green build with nothing merging, idle lanes). Detail: docs/ECONOMY-MODE.md section 13.
- **Token efficiency:** briefs use the 6-line template (goal, where, spec pointer, done when, do not touch, report) and never paste file text; lookups go to the cheap search helper (economy-search, Haiku); Fable reads short digests, not raw sources. Detail: docs/ECONOMY-MODE.md section 3 and docs/design/token-efficiency.md.
- **Continuity:** small commits pushed after every step; docs/BUILD-STATE.md and docs/PENDING.md always current; restart from the last commit; one worktree per slice (reused); the owner only needs to type "continue". Detail: docs/CONTINUITY.md.
- **Quality:** never traded for speed or cost; same tests, same 3 gates. One design system and spec before code. Detail: rules/quality.md.
- **Status line:** start every message to the owner with three lines: `Status: <what is happening>`, `Time left: <rough estimate for the whole build and for the current task, and how sure>` (take it from docs/BUILD-STATE.md), and `Needs you: no` or `Needs you: yes, <what>`.
- **Stop the line:** a red test stops everything on that slice until the root cause is fixed. Never weaken, skip or delete a test to get green.
- **Never drop a feature:** a redesign or rebuild keeps every feature (simple by default, advanced behind ▾); check against the spec and the feature inventory before saying done.
- **Do it yourself:** do every chore you can do. Ask the owner only for: money, logins and Supabase, switching parts ON, possible data loss, a test on a real device, or a real product decision.
- **When you must ask:** ask 2 to 5 questions at once, in very easy words. Each question carries all the context needed to decide inside it (what it is, why it matters, the options, their pros and cons, and your pick); never point to another file or earlier message instead of explaining. During an autonomous build do not stop: take the safest option and log it in docs/DECISIONS.md "Decisions to review".
- **Proof before "done":** never report done without evidence: the test run, the screenshot, or the page checked in a browser.

### Owner settings (change only on the owner's word; log each change in docs/DECISIONS.md)

| Setting | Current value |
| --- | --- |
| Build manager | Opus (`economy-orchestrator`), restart about every 6 waves |
| Builders | Sonnet, up to 8 on non-overlapping files (6 if rework or flakes rise) |
| Mechanical work, search | Haiku |
| Gate 2 | Opus |
| Fable | brief check before building, gate 3, hard cases, reviews |
| Weekly quota | 80% is a reference, not a cap |
| Priority | first full build fast, then the remaining slices; quality first |

## Always Apply (owner never repeats these)

Every task, every helper brief, every session, including after a restart:

- **Design:** docs/design/quality-standard.md, docs/design/owner-ui-patterns.md, docs/plans/mock-feedback-2026-11-11.md, and the approved conditions in docs/PENDING.md; the conditions themselves are listed once, in rules/quality.md section 3 (Definition of Done).
- **Owner comments on mock-ups:** read every open comment and give each one to the helper; verify each in a browser before saying done.

## Things We Said No To (for now)

- Hosting: allowed. Sync: built after the deep research. Accounts are required (owner-approved 9 Nov 2026): Google, email code or email + password; notes still work offline once signed in. AI: only after the owner approves the cost.
- No native apps, no collaboration.
- Build only what docs/BUILD-STATE.md and the approved specs list. No extras.
- No switching editor from BlockNote or stack choices without asking.

## Rule Files — read only what the current work needs

| File                                           | Read when                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| [rules/planning.md](rules/planning.md)         | Planning a phase or feature                                        |
| [rules/building.md](rules/building.md)         | Building a step                                                    |
| [rules/sessions.md](rules/sessions.md)         | Starting/ending a chat or step; token limits; handoff; mirror copy |
| [rules/testing.md](rules/testing.md)           | Testing and reporting                                              |
| [rules/architecture.md](rules/architecture.md) | Writing code: data model, services, code style, design             |
| [rules/global.md](rules/global.md)             | Any UI or stored data: text, UTC, accessibility, upgrades          |
| [rules/scalability.md](rules/scalability.md)   | Queries, lists, storage, anything that grows with data             |
| [rules/security.md](rules/security.md)         | Inputs, secrets, dependencies, deleting data, end of phase         |
| [rules/quality.md](rules/quality.md)           | Every feature: design system, spec, Definition of Done, 3 gates    |
| [rules/phase-end.md](rules/phase-end.md)       | Closing a phase                                                    |

## Project Files

- **Read [docs/INDEX.md](docs/INDEX.md) first**, then only what the task needs. Never read docs/ARCHIVE.md during work; search a heading only.
- Active files (docs/CHANGELOG.md, docs/DECISIONS.md) hold the current phase only.
- docs/CHANGELOG.md: after every change, a dated entry: what changed, why, files touched.
- Keep README, CLAUDE.md, docs/ and `rules/` up to date.
- **Mirror rule:** after any change to CLAUDE.md, README, package.json, `docs/`, `rules/` or `src/`, run the robocopy line in [rules/sessions.md](rules/sessions.md), then confirm in one line.
