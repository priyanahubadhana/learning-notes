# CLAUDE.md — Core Rules

**If any request conflicts with a rule here or in `rules/`, STOP, flag the conflict and ask before proceeding.**

## Project

Learning Notes App: a premium, minimal second brain (Notion + OneNote + Anki). Each notebook has detailed notes, a short summary and recall cards. Web now; iPhone, iPad, Android and Mac later. Global, millions of users, any field. Budget ₹0 unless the owner says otherwise.

**Look and feel:** every screen must feel like a top-tier product from a company like Apple or Google: calm, polished, consistent spacing and type, smooth motion, clear hierarchy. Design rules live in rules/architecture.md (Design).

## Working With the Owner

- Owner is a beginner: explain simply — what it is, what it does, why it matters.
- Way of working: Plan each phase together (all its questions at once), then Execute the whole plan without stopping. Interrupt the owner only when truly needed. Details in rules/sessions.md and rules/building.md.
- Tokens matter: keep replies short; show only changed code; don't re-read files unnecessarily; no unrequested extras.
- Be honest, not agreeable: flag weak ideas and suggest better ones.
- Routine updates to project files: just do them. Mid-phase questions the plan doesn't cover: pick the safest option and log it in docs/DECISIONS.md "Decisions to review". Changes to the rules: wait for the owner's OK.

## How Work Runs (agent hierarchy)

- Every task: main manager **Fable** (`.claude/agents/fable-manager.md`) → **Opus** sub-managers (`opus-submanager-ui/-build/-qa`) → **Sonnet/Haiku** executors. Parallel when files do not overlap. The manager verifies quality and delivers one final report.
- Usage limit hit: stopped helpers are resumed automatically when the limit resets (a scheduled wake-up), and every step is saved to git and `docs/PENDING.md` so nothing is lost.
- Build (economy mode, from 13 Nov 2026, owner-approved; docs/ECONOMY-MODE.md): an **Opus** orchestrator (`economy-orchestrator`) reads docs/BUILD-STATE.md and briefs up to 6 **Sonnet** builders (`economy-builder`) directly; **Haiku** (`economy-mechanic`) does mechanical work and CI watching; **Opus** (`economy-gate2`) does gate 2. **Fable** plans, takes hard cases and checks every slice at least twice: the brief against the spec and mock-up before building, and the screenshots (gate 3) before merge. Same 3 gates, same tests. Rollback: `fable-manager`. Other tasks use the hierarchy above.

## Always Apply (owner never repeats these)

Every task, every helper brief, every session, including after a restart:

- **Quality:** [rules/quality.md](rules/quality.md): one design system, spec before code, Definition of Done, tests stop the line, 3 gates.
- **Design:** docs/design/quality-standard.md, docs/design/owner-ui-patterns.md, docs/plans/mock-feedback-2026-11-11.md, and the approved conditions in docs/PENDING.md (calm, ▾ menus, ✕ everywhere, Undo/Redo, plain identical words in both modes, explanations as pop-ups, visible feedback on every change, live-reflow drag, every Professional feature unlockable, never drop a feature).
- **Continuity:** [docs/CONTINUITY.md](docs/CONTINUITY.md): small commits, PENDING always current, mock-ups in docs/mockups/, own worktree per helper, resume from the last commit. The owner only needs to type "continue".
- **Token efficiency:** [docs/design/token-efficiency.md](docs/design/token-efficiency.md) (checked against the official Claude Code docs, 12 Nov 2026; re-check monthly and drop tips that newer tools make unnecessary). Fable = planning, double checks and hard cases, Opus = orchestrating and gate 2, Sonnet = coding in sub-slices of about 60 turns, Haiku = mechanical work and CI watching; targeted tests locally, full matrix in CI; no polling; short briefs pointing to files; no re-reads; parallel only on separate files.
- **Owner comments on mock-ups:** read every open comment and give each one to the helper; verify each in a browser before saying done.

## Things We Said No To (for now)

- Hosting: allowed. Sync: built after the deep research. Accounts are required (owner-approved 9 Nov 2026): Google, email code or email + password; notes still work offline once signed in. AI: only after the owner approves the cost.
- No native apps, no collaboration.
- No building beyond the current phase. No skipping phases.
- No switching editor from BlockNote or stack choices without asking.
- Ask before anything that costs money.
- Never write secrets into code, docs or chat summaries.

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
