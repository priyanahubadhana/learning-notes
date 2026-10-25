# Architecture, Code Style and Design

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

## Coding Conventions

- TypeScript strict mode; no `any` unless justified.
- Prettier formatting.
- Folders grouped by feature (e.g. `core/`, `notebooks/`, `pages/`, `editor/`, `blocks/`, `trash/`, `journal/`, `templates/`, `app/`; see README "Project Structure").
- Clear, commented, production-quality code.
- No hard-coded user-facing text (from Phase 3): use `t("key")` backed by one English strings file; dates/numbers via `Intl`. Phase 1–2 text is converted later (see IDEAS.md).
- New screens are responsive and touch-friendly (large tap targets, no hover-only actions).
