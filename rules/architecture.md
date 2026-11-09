# Architecture, Code Style and Design

## Design Principles

- Premium yet minimal: Apple/Notion/GoodNotes-level polish, calm typography, generous spacing, subtle motion.
- Everything needed, nothing extra, each thing in the right place.
- Universal second brain: must adapt to any field (writer, vlogger, blogger, learner, philosopher, technician, doctor, etc.) through general building blocks and templates, never hard-coded profession features.

## Architecture Decisions

- Data model: Workspace → Notebooks → Pages → Blocks. Pages can nest.
- Every block is its own record: id, pageId, type, content (JSON), parentId, order, createdAt, updatedAt, deletedAt. Never store a page as one text blob.
- IDs are UUIDs generated on the device (`core/ids.ts`). `order` uses fractional-index string keys (`core/order.ts`). Deletes are soft (set `deletedAt`, cascade to children with the same timestamp). Never remove records: "Delete forever" (Trash) erases the content and sets `purgedAt`, keeping an empty marker (id + times) for future sync. Exception: helper lists built from the notes (search index, links, block tags) are rebuildable copies; their rows are replaced or removed directly and never synced.
- All reads/writes go through services (`core/*Service.ts`, `notebooks/`, `pages/`), not direct DB calls from UI.
- Block data lives in our database (Dexie), not inside the editor, so the editor can be swapped.
- Block types are pluggable: new types must not require core changes.
- Business logic separate from UI (reusable for future iOS app).
- Service layer as extension points for sync, AI and semantic search.
- Scalability is a core goal: design so the app could grow to many users like Notion.
- Runs on localhost now; must be deployable to hosting later without rewrites.
- BlockNote's data format is known only by `editor/mapping.ts`. While a page is open, data flows editor → database only.
- Blocks the editor can't show are hidden, never deleted. `reviewLogs` are append-only. Links and tags store ids, never names.
- New code adds no new direct links between features; shared things go through shared code (see docs/CODE-MAP.md). A change to shared code runs the full tests.

## Coding Conventions

- TypeScript strict mode; no `any` unless justified.
- Prettier formatting.
- Folders grouped by feature (e.g. `core/`, `notebooks/`, `pages/`, `editor/`, `blocks/`, `trash/`, `journal/`, `templates/`, `app/`; see docs/CODE-MAP.md).
- Clear, commented, production-quality code.
- No hard-coded user-facing text (from Phase 3): use `t("key")` backed by one English strings file; dates/numbers via `Intl`. Phase 1–2 text is converted later (see docs/IDEAS.md).
- New screens are responsive and touch-friendly (large tap targets, no hover-only actions).

## Design System (owner-approved 9 Nov 2026)

- The design system is docs/design/system.md; screens follow docs/design/screens.md.
- Use tokens only: colours, spacing (4-pt), radius, type, shadow, motion come from `src/index.css` tokens. No raw hex, no arbitrary px values in components.
- Glass is for the frame only (bars, sidebar, menus, pop-ups, palette, floating panels), at most 3 blurred layers on screen, with a solid fallback for no support, reduced transparency and `data-glass='lite'`. The paper is always solid.
- Every text and colour pair passes WCAG AA (4.5:1 text, 3:1 large text and controls) in light and dark; dark uses near-black and lighter surfaces for elevation.
- Accent (violet) only for primary actions, selection and focus. Colour is never the only signal.
- Every control has default, hover, active, focus, disabled and (if async) loading states; 44 px hit areas; visible focus ring.
- Motion 120-240 ms with the shared easings; under reduced motion, fades only; no animation while typing or drawing.
- One icon set, one stroke, labelled icon buttons.
- Each screen is checked against the quality audit list (screens.md) in light and dark, on phone, tablet and desktop, before it is called done.
