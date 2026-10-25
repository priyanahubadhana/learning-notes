# Learning Notes App

## Problem

Most note apps help you _write_ notes but not _learn_ from them. This app combines Notion's flexibility, OneNote's notebook organisation and Anki's spaced repetition into one calm, fast, offline-first tool for capturing, connecting and recalling what you learn.

For anyone in any field (writers, vloggers, learners, philosophers, technicians, doctors) as a premium, minimal second brain.

## Platform & Tech Stack

| Choice                                                          | Why                                                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Web app (runs on localhost now, hosted later on Vercel/Netlify) | Easiest to test and publish without rewrites                                                                |
| React + TypeScript (strict)                                     | Popular, safe, catches mistakes early                                                                       |
| Vite                                                            | Instant dev server (`npm run dev`)                                                                          |
| Tailwind CSS                                                    | Fast, consistent, minimal styling                                                                           |
| BlockNote (built on TipTap)                                     | Notion-style blocks, slash menu and drag handles out of the box; TipTap underneath for deeper control later |
| IndexedDB via Dexie (+ `dexie-react-hooks`)                     | Local-first, offline storage; the UI updates live when data changes                                         |
| `fractional-indexing`                                           | Order keys, so moving an item rewrites only that item                                                       |
| Vitest (+ jsdom for editor tests)                               | Fast tests for core logic and editor behaviour                                                              |
| Playwright (Chromium)                                           | End-to-end tests: a real browser clicks through the app                                                     |
| Git                                                             | Snapshots of the project after each step (local only)                                                       |

## Main Features (Phase 1 — complete)

- Notebooks: create, rename, delete, drag to reorder; sidebar with pages
- Pages with nested sub-pages; big title and breadcrumb; move a sub-page to the top level (↰)
- Block editor: text, headings, lists, to-do, quote, divider, code, image (by URL), callout; drag to reorder
- Slash (/) menu for blocks and new sub-pages (inserts a live link to the new page)
- Autosave on this device (browser database), only changed blocks
- Trash: restore deleted notebooks/pages (with everything deleted with them) or delete forever
- Themes: Day, Night, Sepia (remembered, editor included)
- Keyboard shortcuts (below)

## Phase 2 Features — Learning Daily Journal + Templates (complete)

- **Today** button (and `Alt+T`): opens today's journal page, creating it from the "Daily journal" template. Journal pages live in a "Journal" notebook, grouped by month, newest first.
- **Templates** section in the sidebar: templates are normal pages you edit like any page. Five starter templates (Daily journal, Study notes, Meeting notes, Reading notes, Project plan). "Daily journal" is protected (edit or rename, not delete).
- **New page from a template:** the notebook/page "+" opens a small menu (Blank page / From template…), or "New page from this template" on a template.
- **"/" menu:** "Insert template…" (adds a template's blocks at the cursor) and "Save page as template".
- **Page action bar** (top right): Save as template; Import and Export shown as "coming soon" (Phase 6).

## Roadmap (likely, not final — may change)

2. Learning Daily Journal + Templates — done
3. Recall & Spaced Repetition
4. Organisation & Connection (tags, links, search, history — including page version history)
5. Databases & interactive blocks
6. Data safety, export, encryption, sync
7. Future: AI, semantic search, website, iOS app, collaboration

## Out of Scope (for now)

Everything beyond Phase 1. In particular: AI features, accounts/cloud sync, iOS app, collaboration, hosting.

## How to Run

1. Install Node.js (LTS) and VS Code.
2. In the project folder: `npm install`
3. Start: `npm run dev` then open the localhost URL shown.
4. Test: `npm test` (or `npm run test:watch` while coding); end-to-end: `npm run test:e2e` (first time only: `npx playwright install chromium`)
5. Other checks: `npm run lint`, `npm run format:check`, `npm run build`
6. Format code: `npm run format`

## Project Structure

| Folder           | What's inside                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/`      | Data model, database, shared helpers (ids, order, records), workspace and block services, block type registry                           |
| `src/notebooks/` | Notebook service and the sidebar                                                                                                        |
| `src/pages/`     | Page service, page tree, page view (title, breadcrumb)                                                                                  |
| `src/editor/`    | BlockNote integration: mapping (only file that knows BlockNote's format), change detection, autosave, schema, slash menu, custom blocks |
| `src/blocks/`    | Built-in block type definitions                                                                                                         |
| `src/trash/`     | Trash service and sidebar section                                                                                                       |
| `src/journal/`   | Daily journal service and date helpers                                                                                                  |
| `src/templates/` | Template service, starter templates, template picker, Templates section                                                                 |
| `src/app/`       | App-wide pieces: preferences, themes, small UI components                                                                               |

Business logic (services) has no UI code, so it can be reused later (e.g. iOS). Tests sit next to the code as `*.test.ts`.

## Keyboard Shortcuts

| Shortcut                                            | Action                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `Alt+N` (`Option+N` on Mac)                         | New page in the current notebook                                 |
| `Alt+Shift+N`                                       | New sub-page of the open page                                    |
| `Alt+T` (`Option+T` on Mac)                         | Open today's journal page                                        |
| `Enter` in a page title                             | Jump into the page content                                       |
| Double-click a notebook or page name in the sidebar | Rename it (`Enter` saves, `Esc` cancels)                         |
| `/` in the editor                                   | Block menu (try `/todo`, `/callout`, `/page` for a new sub-page) |
| In a code block: `Enter`                            | New line                                                         |
| In a code block: `Enter` on an empty last line      | Leave the code block                                             |
| In a code block: `Ctrl+Enter` (`Cmd+Enter` on Mac)  | Leave the code block from anywhere                               |
| In a code block: `Shift+Enter`                      | New line                                                         |

## Project Status

**Current phase:** Phase 2 — complete (automated checks passed; owner visual checks pending). Phase 1 complete 2026-10-25.

| Step                                                    | Status |
| ------------------------------------------------------- | ------ |
| 1. Setup (Dexie, BlockNote, Tailwind, Vitest, Prettier) | Done   |
| 2. Data model (types + Dexie database)                  | Done   |
| 3. Service layer (notebooks, pages, blocks)             | Done   |
| 4. Block type registry                                  | Done   |
| 5. Editor bridge (BlockNote ↔ database)                 | Done   |
| 6a. UI: sidebar, page tree, titles                      | Done   |
| 6b. UI: Day/Night/Sepia themes                          | Done   |
| 6c. UI: slash menu (callout, new sub-page link)         | Done   |
| 6d. Trash (restore, delete forever)                     | Done   |
| 7. Docs + final checks                                  | Done   |
| Extra: Move a sub-page to the top level                 | Done   |
| Phase 2: Journal, templates, page action bar            | Done   |

## Decision Log

| Date       | Decision                                                                                                                                  | Why                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 2026-10-25 | Data model Workspace → Notebooks → Pages → Blocks; each block its own record                                                              | Flexible, editor-independent, sync-friendly                   |
| 2026-10-25 | Block data stored in Dexie, not inside the editor                                                                                         | Editor can be swapped later                                   |
| 2026-10-25 | IDs are UUIDs generated on the device                                                                                                     | Offline creation, no clashes when syncing later               |
| 2026-10-25 | `order` uses fractional-index string keys                                                                                                 | Reordering changes only the moved record                      |
| 2026-10-25 | Soft delete (`deletedAt`), cascading to children in one transaction                                                                       | Allows restore/trash and syncing deletions later              |
| 2026-10-25 | All reads/writes go through service functions                                                                                             | Business logic separate from UI (reusable for iOS)            |
| 2026-10-25 | Block types are a registry; unknown types are still stored                                                                                | New block types need no core changes; data is never lost      |
| 2026-10-25 | BlockNote's data format is known only by `editor/mapping.ts`                                                                              | Swapping the editor means rewriting one file                  |
| 2026-10-25 | While a page is open, data flows editor → database only; saves are debounced (~0.5 s) and write only changed blocks                       | No save loops; few writes                                     |
| 2026-10-25 | Blocks the editor can't show (unknown types) are hidden, never deleted                                                                    | No data loss when types are added/removed                     |
| 2026-10-25 | Sidebar/breadcrumb update live via `dexie-react-hooks` (reads still go through services)                                                  | UI always matches the data, no manual refresh                 |
| 2026-10-25 | Display preferences (open page, expanded items, theme) stored in localStorage, not the database                                           | Per-device conveniences, not notes data                       |
| 2026-10-25 | Sidebar "+" on a page only creates the sub-page; links come from the slash menu                                                           | Never edits a page while it is open elsewhere                 |
| 2026-10-25 | Own code-block keys (override BlockNote's): Enter on empty last line / Ctrl+Enter leave; Shift+Enter = new line                           | Easy, predictable way out of code; fixes Shift+Enter bug      |
| 2026-10-25 | Editor behaviour tested with a real BlockNote editor in Vitest (jsdom)                                                                    | Catches keyboard/menu regressions without a browser           |
| 2026-10-25 | Links to deleted pages are hidden but kept saved                                                                                          | They reappear if the page is restored                         |
| 2026-10-25 | Trash added to Phase 1; lists only what was deleted directly; Restore brings back everything deleted at the same moment                   | Completes soft delete; protects the owner's data              |
| 2026-10-25 | "Delete forever" erases content but keeps an empty marker (`purgedAt`)                                                                    | Gone for good, yet a future sync can still tell other devices |
| 2026-10-25 | Restoring a page whose notebook is in Trash restores only the notebook too; if its parent page is still deleted, it goes to the top level | Restore always works without bringing back unrelated pages    |
| 2026-10-25 | Git (local) with a commit after each step; LF line endings via `.gitattributes`                                                           | Any step can be undone; consistent files across systems       |
| 2026-10-25 | Playwright end-to-end tests (Chromium only) for user flows; Trash browser checks automated                                                | Claude tests the UI itself; fewer manual checks               |
| 2026-10-25 | Workflow: questions up front, Claude builds and tests everything, one final report with visual checks                                     | Faster steps, less back-and-forth                             |
| 2026-10-25 | Journal = a special notebook (`kind: 'journal'`); day pages under month pages, newest first                                               | Reuses pages; tidy after hundreds of days                     |
| 2026-10-25 | Templates = normal pages in a hidden "Templates" notebook, shown in their own section; using one copies its blocks (new ids)              | Edit templates like pages; no new storage                     |
| 2026-10-25 | Five general starter templates, created once; "Daily journal" protected                                                                   | Useful from day one for any field; Today always works         |
| 2026-10-25 | "+" opens Blank page / From template; page action bar with Save as template (Import/Export coming in Phase 6)                             | One tidy button; actions clearly visible                      |

## Known Limitations

- **Closing the tab:** edits are saved ~0.5 s after you stop typing, and immediately when you switch tabs, minimise or change page. If the tab is _closed_ within that half-second, the browser may stop the page before the save finishes, so the very last keystrokes can be lost.
- **Desktop only for now:** the sidebar has a fixed width; there is no phone layout yet.
- **Images by URL only:** there is no upload or image storage yet.
- **Pages can't be dragged** in the sidebar tree (notebooks can).
- **Journal titles are English** ("Sunday 25 October 2026"); other languages later.
- **End-to-end tests cover Trash, moving pages, journal and templates so far:** other UI flows are still checked by hand; new features get Playwright tests as they are built.
- **First load size:** the editor library makes the app about 1.3 MB (≈400 KB compressed). Fine on localhost; can be split up before hosting.
