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
- Build (simple system, from 13 Nov 2026 evening, owner request; docs/ECONOMY-MODE.md): **Opus and Sonnet only.** An **Opus** manager (`economy-orchestrator`) follows the build plan in the order of docs/BUILD-STATE.md, keeps that file current and never builds; **Sonnet** builders (`economy-builder`, number: Owner settings) each own one whole slice from the first test to merged, including the mechanical work; **Opus** (`economy-gate2`) reviews each finished slice once. **Fable** looks at every slice twice and no more: the design check of the brief before building, and the final look at the pictures (gate 3) before the owner is offered the part. A part merges into `build/next` switched OFF after gate 2. The usable preview for the owner comes before any new slice. Same 3 gates, same tests. Rollback: `fable-manager`.

## Core Operating Rules (owner, 13 Nov 2026; the default until the owner changes them)

- **Hierarchy:** a manager plans and delegates; cheaper models do the work; nobody waits for the owner except as listed in Do it yourself.
- **Escalate by yourself:** Sonnet → Opus → Fable. Move up when the same test is red twice, a builder stops twice, or a gate fails twice; Fable solves what Opus could not. Fix stalls at once (green build with nothing merging, idle lanes). The main chat runs `bash scripts/build-pulse.sh` every hour and acts on `STALL`. Detail: docs/ECONOMY-MODE.md sections 4 and 5.
- **Token efficiency:** briefs point to files and never paste them (templates: docs/ECONOMY-MODE.md section 6); the manager reads short reports, not sources or logs; Fable reads short digests. Detail: docs/design/token-efficiency.md.
- **Continuity:** small commits pushed after every step; docs/BUILD-STATE.md and docs/PENDING.md always current; restart from the last commit; one worktree per slice (reused); the owner only needs to type "continue". Detail: docs/CONTINUITY.md.
- **Quality:** never traded for speed or cost; same tests, same 3 gates. One design system and spec before code. Detail: rules/quality.md.
- **Status line:** start every message to the owner with three lines: `Status: <what is happening>`, `Time left: <rough estimate for the whole build and for the current task, and how sure>` (take it from docs/BUILD-STATE.md), and `Needs you: no` or `Needs you: yes, <what>`.
- **Stop the line:** a red test stops everything on that slice until the root cause is fixed. Never weaken, skip or delete a test to get green.
- **Never drop a feature:** a redesign or rebuild keeps every feature (simple by default, advanced behind ▾); check against the spec and the feature inventory before saying done.
- **Do it yourself:** do every chore you can do. Ask the owner only for: money, logins and Supabase, switching parts ON, possible data loss, a test on a real device, or a real product decision.
- **When you must ask:** ask 2 to 5 questions at once, in very easy words. Each question carries all the context needed to decide inside it (what it is, why it matters, the options, their pros and cons, and your pick); never point to another file or earlier message instead of explaining. During an autonomous build do not stop: take the safest option and log it in docs/DECISIONS.md "Decisions to review".
- **Proof before "done":** never report done without evidence: the test run, the screenshot, or the page checked in a browser.

### Owner settings (change only on the owner's word; log each change in docs/DECISIONS.md)

| Setting                 | Current value                                                           |
| ----------------------- | ----------------------------------------------------------------------- |
| Build manager           | Opus (`economy-orchestrator`); follows the plan, never builds           |
| Builders                | Sonnet, up to 8, one whole slice each, on non-overlapping files         |
| Mechanical work, search | the slice's own Sonnet builder; no Haiku in the build                   |
| Gate 2                  | Opus, once per slice                                                    |
| Fable                   | design check before building, final look (gate 3), hard cases           |
| Weekly quota            | 80% is a reference, not a cap                                           |
| Priority                | a usable preview on the iPad first, then the next slices; quality first |

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
