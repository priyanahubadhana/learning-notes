# CLAUDE.md — Binding Project Rules

**If any request conflicts with these rules, STOP, flag the conflict and ask before proceeding.**

## Token Budget (high priority — tokens are scarce)

- ASK before any task likely to use a lot of tokens (large files, many files, big refactors, long explanations). Give a rough size estimate.
- Keep replies short. No repeating code that hasn't changed; show only diffs/changed sections.
- Don't re-read files unnecessarily; read only what the task needs.
- No unrequested extras, features or long commentary.
- Owner is a beginner: explain briefly in plain language, one step at a time.

## Working Style

- **Planning a phase:** ask open-ended questions one at a time (never yes/no); for each decision explain the options simply, give pros/cons and a recommendation; challenge ideas when there is a better way; give each phase a Definition of Done; end planning with ONE checklist of decisions for the owner to approve.
- **Start of a build step:** ask all questions for the step together, up front, each with a recommendation.
- **During the step:** build, then test everything yourself (Vitest unit tests + Playwright end-to-end tests) and fix failures without asking.
- **Self-testing:** test everything possible yourself with Playwright, including screenshots in all three themes (Day, Night, Sepia) and at phone width; fix what you find.
- **End of the step:** report only when it is done: a short summary, a brief self-review (better option, risk, or early fix), at most 2–3 visual checks that truly need human eyes (explain any term the owner may not know), and finish with a "Quick summary" of 3–5 keyword bullets.
- Still ask before big token-heavy work or anything irreversible.
- Explain in simple, practical terms: what it is, what it does, why, and the alternatives, with a recommendation.
- Collect small issues the owner finds during testing into a polish list and fix them in the next step.

## Prototype First

- Before building any new feature or phase, offer a quick clickable prototype (e.g. a Claude artifact) so the owner can see and test the look and flow. Build the real version only after approval.

## Design Principles

- Premium yet minimal: Apple/Notion/GoodNotes-level polish, calm typography, generous spacing, subtle motion.
- Everything needed, nothing extra, each thing in the right place.
- Universal second brain: must adapt to any field (writer, vlogger, blogger, learner, philosopher, technician, doctor, etc.) through general building blocks and templates, never hard-coded profession features.

## Architecture Decisions

- Data model: Workspace → Notebooks → Pages → Blocks. Pages can nest.
- Every block is its own record: id, pageId, type, content (JSON), parentId, order, createdAt, updatedAt, deletedAt. Never store a page as one text blob.
- IDs are UUIDs generated on the device (`core/ids.ts`). `order` uses fractional-index string keys (`core/order.ts`). Deletes are soft (set `deletedAt`, cascade to children with the same timestamp). Never remove records: "Delete forever" (Trash) erases the content and sets `purgedAt`, keeping an empty marker (id + times) for future sync.
- All reads/writes go through services (`core/*Service.ts`, `notebooks/`, `pages/`), not direct DB calls from UI.
- Block data lives in our database (Dexie), not inside the editor, so the editor can be swapped.
- Block types are pluggable: new types must not require core changes.
- Business logic separate from UI (reusable for future iOS app).
- Service layer as extension points for sync, AI and semantic search.
- Scalability is a core goal: design so the app could grow to many users like Notion.
- Runs on localhost now; must be deployable to hosting later without rewrites.

## Things We Said No To (for now)

- No AI features, no accounts/cloud sync, no iOS, no collaboration, no hosting setup.
- Login, hosting, HTTPS and deployment rules apply only from Phase 6–7, when sync/hosting are planned.
- Monthly budget: ₹0 (free tools, runs locally). Ask before anything that costs money.
- No building beyond the current phase. No skipping phases.
- No switching editor from BlockNote or stack choices without asking.

## Coding Conventions

- TypeScript strict mode; no `any` unless justified.
- Prettier formatting.
- Folders grouped by feature (e.g. `core/`, `notebooks/`, `pages/`, `editor/`, `blocks/`, `trash/`, `journal/`, `templates/`, `app/`; see README "Project Structure").
- Clear, commented, production-quality code.
- No hard-coded user-facing text (from Phase 3): use `t("key")` backed by one English strings file; dates/numbers via `Intl`. Phase 1–2 text is converted later (see IDEAS.md).
- New screens are responsive and touch-friendly (large tap targets, no hover-only actions).

## Testing Requirements

- Vitest for core logic (data model, storage, block operations). Add tests with every logic change.
- Editor behaviour (keys, slash menu) is tested with a real BlockNote editor via jsdom (`// @vitest-environment jsdom`).
- All tests must pass before a change is called done.
- Playwright end-to-end tests (`e2e/`, `npm run test:e2e`) for user flows; add one for every new UI feature. Shared steps live in `e2e/helpers.ts`.

## Documentation

- Keep README.md, CLAUDE.md, CHANGELOG.md and IDEAS.md updated.
- New ideas that come up mid-build go into IDEAS.md (date, short description, likely phase), not into the current phase. Check IDEAS.md before each phase.
- After every change, add a dated CHANGELOG entry: what changed, why, files touched.
