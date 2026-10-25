# CLAUDE.md — Core Rules

**If any request conflicts with a rule here or in `rules/`, STOP, flag the conflict and ask before proceeding.**

## Project

Learning Notes App: a premium, minimal second brain (Notion + OneNote + Anki). Web now; iPhone, iPad, Android and Mac later. Global, millions of users, any field. Budget ₹0 unless the owner says otherwise.

## Working With the Owner

- Owner is a beginner: explain simply — what it is, what it does, why it matters.
- Tokens are scarce: ask before anything token-heavy, with a rough size estimate. Keep replies short; show only changed code; don't re-read files unnecessarily; no unrequested extras.
- Be honest, not agreeable: flag weak ideas and suggest better ones.
- Routine updates to project files: just do them. Changes to the plan, rules or past decisions: tell the owner and wait for OK.

## Things We Said No To (for now)

- No AI features, no accounts/cloud sync, no native apps, no collaboration, no hosting setup.
- No building beyond the current phase. No skipping phases.
- No switching editor from BlockNote or stack choices without asking.
- Ask before anything that costs money.

## Rule Files — read only what the current work needs

| File                                           | Read when                                                  |
| ---------------------------------------------- | ---------------------------------------------------------- |
| [rules/planning.md](rules/planning.md)         | Planning a phase or feature                                |
| [rules/building.md](rules/building.md)         | Building a step                                            |
| [rules/sessions.md](rules/sessions.md)         | Starting/ending a chat or step; token limits; handoff      |
| [rules/testing.md](rules/testing.md)           | Testing and reporting                                      |
| [rules/architecture.md](rules/architecture.md) | Writing code: data model, services, code style, design     |
| [rules/global.md](rules/global.md)             | Any UI or stored data: text, UTC, accessibility, upgrades  |
| [rules/scalability.md](rules/scalability.md)   | Queries, lists, storage, anything that grows with data     |
| [rules/security.md](rules/security.md)         | Inputs, secrets, dependencies, deleting data, end of phase |
| [rules/phase-end.md](rules/phase-end.md)       | Closing a phase                                            |

## Project Files

- **README.md** — includes "Next steps — handoff" and "Project Status & Decision Log".
- **CHANGELOG.md** — after every change, a dated entry: what changed, why, files touched.
- **IDEAS.md** — parked ideas (date, short description, likely phase).
- **LEARNING.md** — plain-language explanation of each finished phase, with examples.
- Keep README, CLAUDE.md, CHANGELOG, IDEAS, LEARNING and `rules/` up to date.
