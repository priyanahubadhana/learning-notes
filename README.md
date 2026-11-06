# Learning Notes App

A premium, minimal second brain: Notion's flexibility, OneNote's notebooks and Anki's spaced repetition, in one calm, offline-first app for anyone in any field.

## Stack

React + TypeScript (strict), Vite, Tailwind, BlockNote, IndexedDB through Dexie. Tests: Vitest and Playwright. Web now; iPhone, iPad, Android and Mac later.

## How to run

1. Install Node.js (LTS).
2. `npm install`
3. `npm run dev`, then open the address shown.

| Check               | Command                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Unit tests          | `npm test`                                                                                                  |
| Browser tests       | `npm run test:e2e` (first time: `npx playwright install chromium`); Safari-style: `npm run test:e2e:webkit` |
| Lint, format, build | `npm run lint`, `npm run format:check`, `npm run build`                                                     |

## Status

**Current phase:** the master plan ([docs/plans/master-plan-2026-11.md](docs/plans/master-plan-2026-11.md)), Phase A (Trustworthy Pencil). Phases 1–8 and most of Phase 9 are complete; the live app is at https://learning-notes-app.pages.dev.

**Next step:** see [docs/HANDOFF.md](docs/HANDOFF.md).

## Rules that must never break

See "Architecture Decisions" in [rules/architecture.md](rules/architecture.md). Every other document is listed in [docs/INDEX.md](docs/INDEX.md).
