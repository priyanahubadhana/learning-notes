# CLAUDE.md — Core Rules

**If any request conflicts with a rule here or in `rules/`, STOP, flag the conflict and ask before proceeding.**

## Project

Learning Notes App: a premium, minimal second brain (Notion + OneNote + Anki). Each notebook has detailed notes, a short summary and recall cards. Web now; iPhone, iPad, Android and Mac later. Global, millions of users, any field. Budget ₹0 unless the owner says otherwise.

## Working With the Owner

- Owner is a beginner: explain simply — what it is, what it does, why it matters.
- Way of working: Plan each phase together (all its questions at once), then Execute the whole plan without stopping. Interrupt the owner only when truly needed. Details in rules/sessions.md and rules/building.md.
- Tokens matter: keep replies short; show only changed code; don't re-read files unnecessarily; no unrequested extras.
- Be honest, not agreeable: flag weak ideas and suggest better ones.
- Routine updates to project files: just do them. Mid-phase questions the plan doesn't cover: pick the safest option and log it in docs/DECISIONS.md "Decisions to review". Changes to the rules: wait for the owner's OK.

## Things We Said No To (for now)

- Hosting: allowed. Sync and accounts: only after the deep research. AI: only after the owner approves the cost.
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
| [rules/phase-end.md](rules/phase-end.md)       | Closing a phase                                                    |

## Project Files

- **Read [docs/INDEX.md](docs/INDEX.md) first**, then only what the task needs. Never read docs/ARCHIVE.md during work; search a heading only.
- Active files (docs/CHANGELOG.md, docs/DECISIONS.md) hold the current phase only.
- docs/CHANGELOG.md: after every change, a dated entry: what changed, why, files touched.
- Keep README, CLAUDE.md, docs/ and `rules/` up to date.
- **Mirror rule:** after any change to CLAUDE.md, README, package.json, `docs/`, `rules/` or `src/`, run the robocopy line in [rules/sessions.md](rules/sessions.md), then confirm in one line.
