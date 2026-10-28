# Changelog

## 2026-10-25

- **What:** Created project documentation.
- **Why:** Set goals, stack, rules and roadmap before writing code.
- **Files:** README.md, CLAUDE.md, CHANGELOG.md

## 2026-10-25

- **What:** Added clickable Phase 1 prototype; added design principles (premium minimal, universal second brain).
- **Why:** Preview look and flow before building; capture design vision.
- **Files:** prototype.html, CLAUDE.md, README.md, CHANGELOG.md

## 2026-10-25

- **What:** README.md was accidentally overwritten by the Vite project template (`npm create vite`); the original was restored by the owner.
- **Why:** Keep a record of the incident so the project goals/roadmap are known to be intact.
- **Files:** README.md

## 2026-10-25

- **What:** Phase 1, step 1 (setup). Installed Dexie, BlockNote (core/react/mantine), Tailwind CSS v4, Vitest + fake-indexeddb, Prettier. Added `test`, `test:watch`, `format`, `format:check` scripts; Vitest config with an IndexedDB smoke test; Prettier config; feature folders (`core/`, `notebooks/`, `pages/`, `editor/`). Replaced the Vite demo page with a placeholder and removed unused template files (App.css, src/assets).
- **Why:** Foundation for the Phase 1 data model, services and editor.
- **Files:** package.json, package-lock.json, vite.config.ts, vitest.config.ts, .prettierrc.json, .prettierignore, src/index.css, src/App.tsx, src/core/setup.test.ts, src/notebooks/.gitkeep, src/pages/.gitkeep, src/editor/.gitkeep, README.md, CHANGELOG.md

## 2026-10-25

- **What:** Phase 1, step 2 (data model). Added TypeScript types for Workspace, Notebook, Page (nestable via `parentId`) and Block (own record with `pageId`, `parentId`, pluggable string `type`, JSON `content`, `order`, timestamps). Added the Dexie database (schema v1) with indexes for lookups by workspace, notebook, page and parent. Tests cover storing/querying each record type, nesting and JSON content. Removed the step-1 smoke test (superseded).
- **Why:** Foundation for the service layer (step 3); follows the Workspace → Notebooks → Pages → Blocks architecture.
- **Files:** src/core/types.ts, src/core/db.ts, src/core/db.test.ts, src/core/setup.test.ts (removed), CHANGELOG.md

## 2026-10-25

- **What:** Data model refinements. Added `deletedAt` (soft delete) to every record; `order` is now a fractional-index string key (`OrderKey`, via the `fractional-indexing` package wrapped in `core/order.ts`); IDs are device-generated UUID v4 (`core/ids.ts`). Added shared record helpers (`core/records.ts`) and a test DB helper. DB schema unchanged (no indexes affected).
- **Why:** Soft delete allows restore/trash and syncing deletions later; fractional keys let a reorder change only the moved record (sync-friendly); device UUIDs allow offline creation without ID clashes.
- **Files:** package.json, package-lock.json, src/core/types.ts, src/core/ids.ts, src/core/order.ts, src/core/records.ts, src/core/testing.ts, src/core/db.test.ts, src/core/helpers.test.ts, CLAUDE.md, CHANGELOG.md

## 2026-10-25

- **What:** Phase 1, step 3 (service layer). Added services: workspace (get/create default), notebooks (list, create, rename, move, soft-delete with pages and blocks), pages (list children, create nested, rename, move/re-parent with cycle check, soft-delete with sub-pages and blocks), blocks (list, create at index, update type/content, move/nest with cycle check, soft-delete with nested blocks). All writes run in transactions. 28 tests passing.
- **Why:** Keeps business logic out of the UI (reusable for iOS later) and gives one place to hook in sync later.
- **Files:** src/core/workspaceService.ts, src/core/blockService.ts, src/notebooks/notebookService.ts, src/pages/pageService.ts, and matching `*.test.ts` files, CHANGELOG.md

## 2026-10-25

- **What:** Verified cascade deletes run in a Dexie transaction (added a rollback test) and list functions exclude soft-deleted records. Added "Project Status" and "Decision Log" sections to README. Ran Prettier over the Markdown docs (formatting only).
- **Why:** Owner review; README was missing the status/decision log section.
- **Files:** README.md, CHANGELOG.md, CLAUDE.md (formatting), src/notebooks/notebookService.test.ts

## 2026-10-25

- **What:** Phase 1, step 4 (block type registry). Added `createBlockTypeRegistry` (register/get/has/list; rejects duplicates) and the 10 built-in Phase 1 block types (paragraph, heading, bulleted/numbered list, to-do, quote, divider, code, image, callout) with default content. Unregistered types are still stored as-is. 34 tests passing.
- **Why:** New block types can be added by registering a definition, with no core changes.
- **Files:** src/core/blockTypes.ts, src/blocks/builtinBlockTypes.ts, src/blocks/blockTypes.test.ts, README.md, CHANGELOG.md

## 2026-10-25

- **What:** Phase 1, step 5 (editor bridge). BlockNote ↔ database sync: `mapping.ts` (only file with BlockNote format knowledge; nested children ↔ `parentId`; unknown types hidden), `diff.ts` (saves only changed blocks; order keys kept unless moved, via `assignOrders`; never deletes blocks not shown in the editor), `autosave.ts` (500 ms debounce, no overlapping saves, flush on page leave / tab hidden), `pageSync.ts` (snapshot taken from the editor after load, so opening a page writes nothing), `saveBlockChanges` (one-transaction batch save, revives undone deletes), editor schema with a custom callout block, `PageEditor` component. Temporary App harness opens a first page so the editor can be tried (replaced in step 6). 62 tests passing.
- **Why:** Typing in the editor now saves each block as its own record, efficiently and safely.
- **Known limitation:** closing the tab within ~0.5 s of the last keystroke may lose that last edit (documented in README).

## 2026-10-25

- **What:** Phase 1, step 6a (UI: sidebar, page tree, titles). App shell matching prototype.html (design tokens in Tailwind theme, system font in editor too). Sidebar: notebooks with create, inline rename, delete (confirm dialog), drag to reorder with drop indicator, collapse. Nested page tree with expand/collapse, add sub-page, delete; open page highlighted. Page view: breadcrumb, large auto-growing title (debounced save), Enter jumps to editor. Empty state with "Create notebook" button. Remembered per device: open page, expanded notebooks/pages. Keyboard shortcuts Alt+N / Alt+Shift+N. New services `getPage`, `listPages`, `getPagePath`, `getNotebook`; title saver; preference helpers. Removed the step-5 temporary harness. Added `dexie-react-hooks`. 70 tests passing.
- **Why:** Usable notebook/page navigation and titles, in the approved prototype look.

## 2026-10-25

- **What:** 6a polish. New pages start with an empty title (placeholder "Untitled") and the cursor goes to the title (not for new notebooks, whose name field keeps focus). Double-click a page in the sidebar to rename it inline; the open page's title updates live when renamed elsewhere. Breadcrumb items aligned on one line. Shared `RenameInput` component.
- **Why:** Owner feedback after browser testing.
- **Files:** src/App.tsx, src/app/ui.tsx, src/notebooks/Sidebar.tsx, src/pages/{PageTree.tsx, PageView.tsx, pageService.ts}, CHANGELOG.md

## 2026-10-25

- **What:** Phase 1, step 6b (themes). Day/Night/Sepia using the prototype's colours; picker at the bottom of the sidebar; remembered per device; applied by a small script in index.html before first paint (no flash). The editor follows the theme: BlockNote colour variables (text, menus, tooltips, hover, borders) mapped to our tokens, dark editor mode for Night, code blocks/quotes/checkboxes themed. 73 tests passing.
- **Why:** Phase 1 feature; calm reading in any light.

## 2026-10-25

- **What:** Phase 1, step 6c (slash menu). Custom "/" menu: BlockNote defaults for our block types, plus 💡 Callout (after Quote) and 📄 New sub-page (creates a sub-page, inserts a link, saves, opens it with the title focused). New `pageLink` block type (registry + editor), showing the linked page's live title, opening it on click, "(deleted page)" if deleted. Fixes from browser testing: "/todo" (also to-do, task, checkbox) finds the checklist; leaving a code block with Enter on an empty last line or Ctrl/Cmd+Enter; Shift+Enter in a code block now inserts a new line (no longer exits/changes the block). Editor tests run a real BlockNote editor via jsdom (dev dependency). 81 tests passing.
- **Why:** Phase 1 slash-menu features and owner feedback.
- **Note:** the Shift+Enter → heading bug could not be reproduced in the test editor; our handler now takes over Shift+Enter in code blocks before BlockNote's, which should remove it. Please re-check in the browser.

## 2026-10-25

- **What:** Page links to deleted pages are now hidden (block stays saved, reappears if the page is restored) instead of showing "(deleted page)". Added "Working Style" rules to CLAUDE.md (self-review after each step, simple explanations with alternatives and a recommendation, one browser check at a time, polish list). README roadmap notes page version history in Phase 4.
- **Why:** Owner request.
- **Files:** src/editor/PageLinkView.tsx, src/index.css, CLAUDE.md, README.md, CHANGELOG.md

## 2026-10-25

- **What:** Phase 1, step 6d (Trash). Sidebar "Trash" section (collapsible, remembered) listing what was deleted directly, with Restore and Delete forever (confirm). Restore brings back everything deleted at the same moment; restoring a page whose notebook is in Trash restores only that notebook too; a page whose parent is still deleted goes to the top level. Delete forever erases content and sets `purgedAt`, keeping an empty marker for future sync. CLAUDE.md delete rule updated to match. 8 new tests (89 total).
- **Why:** Owner decisions (1A marker, added to Phase 1, no prototype).
- **Files:** src/core/{types.ts, records.ts}, src/trash/{trashService.ts, trashService.test.ts, TrashSection.tsx}, src/app/uiPrefs.ts, src/notebooks/Sidebar.tsx, src/App.tsx, CLAUDE.md, CHANGELOG.md

## 2026-10-25

- **What:** Phase 1, step 7 (final docs and checks). README reviewed and updated: Phase 1 marked complete, feature list (Trash, page links, autosave wording corrected: browser database, not local storage), tech stack, new Project Structure section, Trash decisions, more Known Limitations. CLAUDE.md folder list and editor-testing note updated. All checks run: tests, type check, lint, formatting, production build.
- **Why:** Close Phase 1 with accurate docs.
- **Files:** README.md, CLAUDE.md, CHANGELOG.md

## 2026-10-25

- **What:** Phase 1 signed off (Git snapshot `80f6bb9`). Owner passed all Trash browser checks (restore page with sub-pages, delete forever with confirm, restore whole notebook, restore a page whose notebook was in Trash). README status updated.
- **Why:** Record that Phase 1 is complete.
- **Files:** README.md, CHANGELOG.md
- **Files:** package.json, package-lock.json, src/editor/{codeBlockKeys.ts, codeBlockKeys.test.ts, slashMenu.tsx, slashMenu.test.ts, PageLinkView.tsx, editorContext.ts, schema.tsx, PageEditor.tsx}, src/blocks/{builtinBlockTypes.ts, blockTypes.test.ts}, src/pages/PageView.tsx, src/App.tsx, README.md, CHANGELOG.md
- **Files:** index.html, src/index.css, src/App.tsx, src/app/{theme.ts, theme.test.ts, themeContext.ts}, src/notebooks/Sidebar.tsx, src/editor/PageEditor.tsx, README.md, CHANGELOG.md
- **Files:** package.json, package-lock.json, index.html, src/index.css, src/App.tsx, src/app/{errors.ts, ui.tsx, uiPrefs.ts, uiPrefs.test.ts, usePref.ts, useTreeState.ts}, src/notebooks/{Sidebar.tsx, notebookService.ts, notebookService.test.ts}, src/pages/{PageTree.tsx, PageView.tsx, titleSaver.ts, titleSaver.test.ts, pageService.ts, pageService.test.ts}, src/editor/{PageEditor.tsx, schema.tsx}, README.md, CHANGELOG.md
- **Files:** src/core/order.ts, src/core/blockService.ts, src/editor/{mapping.ts, diff.ts, autosave.ts, pageSync.ts, schema.tsx, PageEditor.tsx} + tests, src/core/helpers.test.ts, src/core/blockService.test.ts, src/App.tsx, src/editor/.gitkeep (removed), README.md, CHANGELOG.md

## 2026-10-25

- **What:** Tooling and workflow. Installed Git; repository created with Phase 1 as the first commit; `.gitattributes` keeps LF line endings. Added Playwright end-to-end tests (Chromium) with shared helpers; the four Trash browser checks are now automated (`npm run test:e2e`). Trash toggle arrow hidden from screen readers (clean accessible name). Viewport meta updated as BlockNote recommends. CLAUDE.md workflow updated: questions up front, Claude builds and tests everything (unit + Playwright) and fixes failures, one final report with visual checks; still asks before token-heavy or irreversible work.
- **Why:** Owner request: safe snapshots, automated UI testing, faster steps.
- **Files:** .gitattributes, .gitignore, package.json, package-lock.json, playwright.config.ts, tsconfig.node.json, e2e/{helpers.ts, trash.spec.ts}, src/trash/TrashSection.tsx, index.html, CLAUDE.md, README.md, CHANGELOG.md

## 2026-10-25

- **What:** "Move to top level" (↰) hover action on sub-pages in the sidebar: the page becomes a normal page of its notebook, placed at the end, keeping its own sub-pages and content; breadcrumb updates live. New service `movePageToTopLevel`, unit test and Playwright test (90 unit + 5 e2e passing).
- **Why:** Owner request (before Phase 2); no drag-and-drop yet.
- **Files:** src/pages/{pageService.ts, pageService.test.ts, PageTree.tsx}, e2e/pages.spec.ts, README.md, CHANGELOG.md

## 2026-10-25

- **What:** Phase 2 (Learning Daily Journal + Templates). Today button + `Alt+T` open today's journal page (created from the protected "Daily journal" template) in an auto-created Journal notebook, grouped by month, newest first. Templates section: templates are pages in a hidden Templates notebook; five general starter templates created once. "+" menu (Blank page / From template…) with a template picker; "New page from this template" on template pages; "/" menu "Insert template…" and "Save page as template"; page action bar (Save as template; Import/Export disabled "coming soon", Phase 6). Toast messages. New services: `copyBlocks`, journal (`openJournalDay`), templates (`ensureTemplates`, `createPageFromTemplate`, `saveAsTemplate`, summaries); mapping helpers `plainText`/`toPlainText`/`withoutIds` (BlockNote format stays in mapping.ts). Prototype updated first (action bar) and approved. 105 unit + 13 e2e tests passing (e2e run twice, no flakiness).
- **Why:** Phase 2 as planned and approved by the owner.
- **Files:** src/core/{types.ts, blockService.ts}, src/notebooks/{notebookService.ts, Sidebar.tsx}, src/pages/{pageService.ts, PageTree.tsx, PageView.tsx}, src/editor/{mapping.ts, mapping.test.ts, PageEditor.tsx, editorContext.ts, slashMenu.tsx, slashMenu.test.ts}, src/journal/_, src/templates/_, src/app/{appUi.ts, ui.tsx}, src/App.tsx, e2e/{helpers.ts, journal.spec.ts, templates.spec.ts}, README.md, CLAUDE.md, CHANGELOG.md

## 2026-10-25

- **What:** Workflow update: planning questions one at a time, build-step questions all together; login/hosting/HTTPS rules deferred to Phase 6–7; monthly budget ₹0; added IDEAS.md for parked ideas.
- **Why:** Merge the owner's new project prompt with the existing rules (owner approved).
- **Files:** CLAUDE.md, README.md, IDEAS.md, CHANGELOG.md

## 2026-10-25

- **What:** Parked idea: AI learning companion (screen + voice → notes, keyword summary, flashcards).
- **Why:** Owner idea for Phase 7; kept out of the current phase.
- **Files:** IDEAS.md, CHANGELOG.md

## 2026-10-25

- **What:** Phase 2 owner visual checks passed; added polish item (name dialog for "Save as template") for Phase 3.
- **Why:** Record sign-off and owner feedback.
- **Files:** README.md, CHANGELOG.md

## 2026-10-25

- **What:** Parked ideas: handwriting ink block, Anki .apkg import/export, multiple languages.
- **Why:** Owner ideas for later phases; kept out of Phase 3.
- **Files:** IDEAS.md, CHANGELOG.md

## 2026-10-25

- **What:** New rules: `t()` translation keys for all new UI text; new screens responsive and touch-friendly. Parked: converting Phase 1–2 text, full phone/tablet layout (before hosting).
- **Why:** Owner approved; app is meant to be global and multi-platform.
- **Files:** CLAUDE.md, IDEAS.md, CHANGELOG.md

## 2026-10-25

- **What:** Parked: installable app (PWA), health/personal data privacy, device clock skew.
- **Why:** Global multi-platform review; owner chose IDEAS for these (time zones, migrations, scale, Unicode-safe blanks, plurals/RTL habits, accessibility, sync-safe log and "keep my data" go in Phase 3).
- **Files:** IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 plan approved (with owner's prototype fixes) and recorded in README. Step 1: database version 2 adds `cards` (scheduling state, `due` indexed), `reviewLogs` (append-only history) and `settings` tables; Block gets optional `source` and `derivedFrom`. Added study-day helpers (local calendar, 4 am rollover, UTC storage), a "keep my data" request at start-up, and an upgrade test proving Phase 1–2 data survives.
- **Why:** Foundation for cards, reviews, settings, FSRS and future sync/AI without later rebuilds.
- **Files:** src/core/types.ts, src/core/db.ts, src/core/time.ts, src/core/time.test.ts, src/core/storage.ts, src/core/storage.test.ts, src/core/migration.test.ts, src/main.tsx, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3, step 2. Added the `t()` text helper (placeholders, number formatting, plurals, English fallback) with `en.ts`; a pluggable settings registry (categories, multi-category settings, validators); a settings service (synced settings in the database, device settings in the browser; invalid values never saved, corrupt stored values read as defaults); and the Settings screen (All with search, General, Review, Journal, APIs; controls below labels; "Also in"; Reset; inline errors; chips on narrow screens). Sidebar gets a Settings button; the theme now goes through the registry (same storage key, so sidebar and Settings stay in step). Added a `danger` colour token.
- **Why:** Phase 3 needs editable review settings (limits, steps, day start); one registry keeps settings consistent and extendable.
- **Files:** src/i18n/en.ts, src/i18n/t.ts, src/i18n/t.test.ts, src/settings/registry.ts, src/settings/builtinSettings.ts, src/settings/settingsService.ts, src/settings/useSetting.ts, src/settings/SettingsScreen.tsx, src/settings/settings.test.ts, src/App.tsx, src/notebooks/Sidebar.tsx, src/index.css, e2e/settings.spec.ts, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3, step 3. New Card block (question = its text, answer = blocks nested inside; styled as one soft box with Q/A labels). "Make card" in the block menu (⋮⋮ handle) turns text blocks (paragraph, heading, lists, quote, callout) into a Card, keeping nested blocks as the answer or adding an empty answer line with the cursor on it; one editor change, so Ctrl+Z undoes it. "/card" inserts an empty Card. After each save, new Card blocks get a scheduling record (`recall/cardService.ts`); records are never deleted. Fixed during testing: the editor regains focus after "Make card" so the answer can be typed straight away.
- **Why:** Cards are the core of Recall & Spaced Repetition.
- **Files:** src/recall/cardService.ts, src/recall/cardService.test.ts, src/editor/cardActions.tsx, src/editor/cardActions.test.ts, src/editor/CardMenu.tsx, src/editor/schema.tsx, src/editor/slashMenu.tsx, src/editor/pageSync.ts, src/editor/PageEditor.tsx, src/blocks/builtinBlockTypes.ts, src/blocks/blockTypes.test.ts, src/i18n/en.ts, src/index.css, e2e/cards.spec.ts, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3, step 4. Fill-in-the-blank: select words and choose "Blank" in the selection toolbar; the selection snaps to whole words (any language, emoji-safe), the words get a dashed "blank" style, and each blank becomes its own card (part = blank id). Using it on a blank removes it; Ctrl+Z undoes it in one step. The selection toolbar also gets "Card" (Make card), so both work on touch screens. Card records now cover blanks. Fixed the Card box styling (it never matched BlockNote's React wrapper) and hid the nesting line inside cards. New rule in CLAUDE.md: self-test with Playwright and screenshots in all themes and at phone width; at most 2–3 owner checks; reports end with a Quick summary.
- **Why:** Fill-in-the-blank cards (approved plan, fix #4) and touch-friendly card creation.
- **Files:** src/editor/blankActions.ts, src/editor/blankActions.test.ts, src/editor/SelectionToolbar.tsx, src/editor/schema.tsx, src/editor/PageEditor.tsx, src/editor/mapping.ts, src/recall/cardService.ts, src/recall/cardService.test.ts, src/i18n/en.ts, src/index.css, e2e/blanks.spec.ts, e2e/cards.spec.ts, e2e/helpers.ts, CLAUDE.md, README.md, IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Night theme: the fill-in-the-blank highlight is stronger (owner feedback: too faint); Day and Sepia unchanged. Step 5 split into 5a (scheduler, review log, queue, speed test) and 5b (Review screen); README has handoff notes for the next session.
- **Why:** Readability in Night; keep each step under ~80k tokens and continue cleanly in a new session.
- **Files:** src/index.css, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 step 5a (logic only). Swappable scheduler interface with the fixed-steps scheduler (Again → minutes + step 0, Hard stays, Good +1, Easy +2, gaps from settings, due on study-day start) and a button preview. Review service: review queue (all / notebook / page / missed in last 7 days; skips suspended, deleted, no-longer-card and template cards; new-card limit and review cap count today's work), rating writes the review log and card together (not-due cards logged as cram, unchanged), card rebuild from log, suspend/unsuspend. Review log gains `stepAfter` and `isNew`. Pages from templates and new journal days now get card records. Tests incl. a 10,000-card speed test.
- **Why:** Approved Phase 3 plan (step 5a); data side of the Review screen (5b).
- **Files:** src/recall/scheduler.ts, src/recall/scheduler.test.ts, src/recall/reviewService.ts, src/recall/reviewService.test.ts, src/core/types.ts, src/templates/templateService.ts, src/journal/journalService.ts, README.md, CHANGELOG.md

## 2026-10-26

- **What:** New working rule: one full step per chat (e.g. all of Step 5 — 5a, 5b — in one chat); suggest `/compact` instead of a new chat when it gets long.
- **Why:** Owner request; avoids re-loading context for every sub-step.
- **Files:** CLAUDE.md, CHANGELOG.md

## 2026-10-26

- **What:** Restructured project rules: short core CLAUDE.md plus topic files in `rules/` (planning, building, sessions, testing, architecture, global, scalability, security, phase-end); added `/next` command; parked off-computer backup idea.
- **Why:** Owner request; load only the rules the current work needs to save tokens. All existing binding rules kept (stricter "tests pass before a change is done" kept).
- **Files:** CLAUDE.md, rules/*.md, .claude/commands/next.md, IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Rule additions: model choice reminder (Opus/Sonnet) and `/clear` + `/next` at step end (sessions), plan mode while planning (planning), LEARNING.md per phase (phase-end); parked "shuffle" for Practice anyway.
- **Why:** Owner approved.
- **Files:** rules/sessions.md, rules/planning.md, rules/phase-end.md, IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 Step 5b — Review screen: Show answer (Space/Enter), Again/Hard/Good/Easy (keys 1–4) with live intervals, blanks shown as "…" until revealed, Again cards hidden until due (countdown), Practice anyway, Suspend with Undo toast, Open note; sidebar "Review" with live due count, Review per notebook and per page, "Missed (7 days)" toggle; phone layout (portrait and landscape) with buttons pinned to the bottom.
- **Why:** Lets the owner actually study the cards made in steps 3–4 (approved Phase 3 plan; owner chose all recommended options).
- **Files:** src/recall/ReviewScreen.tsx, src/recall/reviewSession.ts (+ test), src/recall/reviewService.ts (+ test), src/App.tsx, src/notebooks/Sidebar.tsx, src/pages/PageView.tsx, src/app/ui.tsx, src/app/appUi.ts, src/i18n/en.ts, src/index.css, e2e/review.spec.ts, README.md, IDEAS.md

## 2026-10-26

- **What:** "Missed (7 days)" (overdue cards) became "Got wrong (7 days)" (cards rated Again in the last 7 study days, reviewed as practice). New cards beyond today's new-card limit are now practice when rated (schedule unchanged, they stay new); new `countsAsReview` decides review vs practice. Practice hint text updated.
- **Why:** Owner approved: "Missed" was misleading, and counting extra new cards defeated the daily limit.
- **Files:** src/recall/reviewService.ts (+ test), src/recall/ReviewScreen.tsx, src/App.tsx, src/i18n/en.ts, e2e/review.spec.ts, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 Step 6 — "Lesson" and "Lesson (large topic)" starter templates (added once to existing workspaces; deleted ones don't return); templates now copy sub-pages, with links re-pointed to the copies; "Card list" block (live list of the page's cards, optionally sub-pages, status per card, click jumps and highlights the card; also in the "/" menu); pinned section jump chips on pages with 3+ top-level headings.
- **Why:** Approved Phase 3 plan (step 6, owner chose all recommended options).
- **Files:** src/templates/starterTemplates.ts, src/templates/templateService.ts (+ test), src/core/blockService.ts, src/core/types.ts, src/recall/cardList.ts (+ test), src/recall/CardListView.tsx, src/editor/schema.tsx, src/editor/slashMenu.tsx, src/editor/editorContext.ts, src/editor/PageEditor.tsx, src/editor/revealBlock.ts, src/blocks/builtinBlockTypes.ts (+ test), src/pages/sections.ts (+ test), src/pages/PageView.tsx, src/i18n/en.ts, e2e/lesson.spec.ts, e2e/templates.spec.ts, README.md, IDEAS.md

## 2026-10-26

- **What:** Parked card-management ideas (tags, filters, table view, bulk actions, saved decks, most-failed, stats/streaks, empty-card cleanup).
- **Why:** Owner request after Step 6 checks; for Phases 4–5.
- **Files:** IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 Step 7a — "Save as template" asks for a name (prefilled with the page title); "Open note" in Review opens the page and scrolls to the card; Cards with no question are left out of reviews, the due count and card lists until a question is typed; "Review these cards" button on the Card list (covers sub-pages when the list does). Plan extended with 7b/7c (owner approved).
- **Why:** Step 7 polish plus owner requests after the Step 6 checks.
- **Files:** src/app/ui.tsx, src/pages/PageView.tsx, src/templates/templateService.ts (+ test), src/recall/cardService.ts, src/recall/cardList.ts (+ test), src/recall/CardListView.tsx, src/recall/reviewService.ts (+ test), src/recall/ReviewScreen.tsx, src/editor/editorContext.ts, src/editor/PageEditor.tsx, src/App.tsx, src/i18n/en.ts, e2e/helpers.ts, e2e/lesson.spec.ts, e2e/review.spec.ts, e2e/templates.spec.ts, README.md, IDEAS.md

## 2026-10-26

- **What:** Phase 3 Step 7b — typing "/card" inside a card's answer asks "Put the card inside this answer, or on the next line below the card?" (Next line is the default), with a "Change in Settings" link; new Review setting "New card inside an answer" (Ask every time · Always next line · Always inside). Settings can open at one setting, highlighted.
- **Why:** Owner request (approved Step 7 extension).
- **Files:** src/editor/cardActions.tsx (+ test), src/editor/slashMenu.tsx, src/editor/PageEditor.tsx, src/editor/revealBlock.ts, src/app/appUi.ts, src/app/ui.tsx, src/App.tsx, src/settings/builtinSettings.ts, src/settings/SettingsScreen.tsx, src/i18n/en.ts, e2e/nestedCard.spec.ts, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 Step 7c — "All cards" hub: a sidebar button opens one list of every card (question, notebook · page, status), with search and "Load more"; clicking a card opens its note and highlights the card. One `queryCards` service so tags, filters and a table view can plug in later. Step 7 complete.
- **Why:** Owner request (approved Step 7 extension).
- **Files:** src/recall/cardQuery.ts (+ test, incl. 10,000-card speed test), src/recall/AllCardsScreen.tsx, src/notebooks/Sidebar.tsx, src/App.tsx, src/i18n/en.ts, e2e/allCards.spec.ts, README.md, CHANGELOG.md

## 2026-10-26

- **What:** README Project Status table brought up to date (Phase 3 steps 5–7 done; step 8 next).
- **Why:** The table still said "next: 6".
- **Files:** README.md, CHANGELOG.md

## 2026-10-26

- **What:** All cards search ~8× faster (10,000-card full search 0.65 s → 0.08 s in tests): paging resumes from a cursor instead of an offset (Dexie's offset forced a slow card-by-card read), page/notebook names are read only for matching cards, search pause 250 → 150 ms. One due-date style in the Card list and All cards (shared `CardStatusLabel`, `dueLabel`, `useMinuteClock`). Speed test limit tightened 5 s → 1 s; new paging tests (same due time, search).
- **Why:** Owner request.
- **Files:** src/recall/cardQuery.ts (+ test), src/recall/cardList.ts (+ test), src/recall/CardStatusLabel.tsx, src/recall/useMinuteClock.ts, src/recall/CardListView.tsx, src/recall/AllCardsScreen.tsx, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 Step 8 — FSRS scheduler (ts-fsrs 5.4.2) as the default, with settings "Scheduler" (FSRS · Simple steps) and "Target memory" (70–97 %, default 90 %). New cards repeat after "Again" minutes before their first day gap (Anki style). Switching scheduler never moves cards: each card is taken over from its review history at its next review. Review session keeps cards in short steps; buttons show minutes for them (fixes "0 days"). Step 8 done.
- **Why:** Smarter review gaps — fewer reviews for the same memory (owner approved: FSRS default, target setting, short steps).
- **Files:** package.json, package-lock.json, src/recall/fsrsScheduler.ts, src/recall/scheduler.ts (+ test), src/recall/reviewService.ts (+ test), src/recall/reviewSession.ts (+ test), src/recall/ReviewScreen.tsx, src/settings/builtinSettings.ts, src/i18n/en.ts, e2e/review.spec.ts, README.md, IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Card due dates and the "day starts at" times now follow each user's regional style (e.g. "12 Nov" in India/UK, "Nov 12" in the US) via `dateLocale()` / `withRegion()`. "Duplicate block" added to the Phase 3 plan (owner approved).
- **Why:** Owner visual-check feedback.
- **Files:** src/i18n/t.ts (+ test), src/recall/cardList.ts (+ test), src/settings/builtinSettings.ts, README.md, CHANGELOG.md

## 2026-10-26

- **What:** "Duplicate" in the block menu (⋮⋮): copies a block and everything nested in it right below it (new ids, so a copied Card or blank is a new card with a fresh schedule); Ctrl+Z undoes it.
- **Why:** Owner request (approved Phase 3 addition).
- **Files:** src/editor/blockActions.ts, src/editor/CardMenu.tsx, src/i18n/en.ts, e2e/cards.spec.ts, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 end-check fixes: `.env` files are git-ignored (secrets never committed); stored FSRS data is checked before use (damaged data → the card restarts cleanly instead of getting a broken due date).
- **Why:** Phase 3 security review.
- **Files:** .gitignore, src/recall/fsrsScheduler.ts, src/recall/reviewService.test.ts, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 end checks: all tests pass (220 unit, 54 e2e), npm audit 0, focused code + security review (no bugs found beyond the fixes above). Created LEARNING.md (Phase 3 section). README status/handoff, CLAUDE.md project files and IDEAS (5 review notes) updated.
- **Why:** `rules/phase-end.md`.
- **Files:** LEARNING.md, README.md, CLAUDE.md, IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Fix: a duplicated Card or blank line could be saved without its card record, so it never showed in All cards or Review. Block saves and card records are now written in one transaction (both or neither), and opening a page adds any missing card records (repairs existing data). Tests: duplicated Card and blank line each get their own record, rollback when the card write fails (`pageSync.test.ts`); `e2e/duplicateCards.spec.ts` (All cards and Review after refresh).
- **Why:** Owner visual check found the bug.
- **Files:** src/editor/pageSync.ts (+ test), src/editor/PageEditor.tsx, e2e/duplicateCards.spec.ts, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 3 closed (owner visual checks passed, incl. the Duplicate fix). Phase 4 planning started.
- **Why:** `rules/phase-end.md` Definition of Done met.
- **Files:** README.md, LEARNING.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4 clickable mockup `prototype-phase4.html` (fake data): search popup + Search screen (chips with counts, filters, views, saved searches, Trash), tags (chips, # picker, nested tree, rename/move/merge/colour/delete, empty states), [[ links with headings, Linked from. Checked with a Playwright click-through (15 flows, no page errors); fixed an endless loop that froze the first version, wrong chip counts, and new page tags hidden behind "+N more".
- **Why:** Phase 4 planning, mockup first (`rules/planning.md`).
- **Files:** prototype-phase4.html, .prettierignore, CHANGELOG.md

## 2026-10-26

- **What:** Mockup fixes from owner testing: "Phone view" switch and "Try # and [[" button in the top bar; tag ⋯ always faintly visible and right-click opens it; text without letters (e.g. "[") counts as an empty search; one toast at a time; Merge example tag in use and clearer wording.
- **Why:** Owner couldn't find the dashed box, the ⋯ menu or the phone layout; "[" listed everything.
- **Files:** prototype-phase4.html, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4 plan approved and recorded: "Phase 4 Plan" section (search, links, tags, step-0 fixes, "Did you mean…?" spelling suggestion only when a search has no results), roadmap (page version history moved to Phase 6), status table with Phase 4 steps, Decision Log, handoff. IDEAS: 10 ideas marked "In Phase 4 plan"; parked unlinked mentions, create page from [[, typo-tolerant search.
- **Why:** Owner approved the plan checklist after testing the mockup.
- **Files:** README.md, IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4, Step 0a. "Delete forever" now also erases the cards of the deleted blocks (kept as markers with `purgedAt`, far-future `due` so due lookups skip them) and their review logs (details erased; rating, kind and time kept so today's review counts stay right; `purgedAt` added to `ReviewLog`). Page move: no fix needed (pages cannot change notebook and blocks cannot change page today); added a guard note in `movePage` for a future "move to another notebook".
- **Why:** Phase 4 plan, Step 0 fixes (risk notes from the Phase 3 review).
- **Files:** src/trash/trashService.ts, src/trash/trashService.test.ts, src/core/types.ts, src/pages/pageService.ts, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4, Step 0b (part 1). Settings can now be shown only while another setting has certain values (`shownWhen` in the settings registry; checked when registering). "Steps for Good" shows only with Simple steps, "Target memory" only with FSRS. Values are kept while hidden. Category counts follow what is shown.
- **Why:** Phase 4 plan, Step 0 polish: no settings that do nothing for the chosen scheduler.
- **Files:** src/settings/registry.ts, src/settings/builtinSettings.ts, src/settings/SettingsScreen.tsx, src/settings/settings.test.ts, e2e/settings.spec.ts, e2e/review.spec.ts, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4, Step 0b (part 2). New setting "Practice anyway order" (Settings › Review: Soonest due first · Shuffle; default Soonest due first). Shuffle keeps the same round (the 50 soonest-due cards) in random order.
- **Why:** Phase 4 plan, Step 0 polish (parked idea).
- **Files:** src/settings/builtinSettings.ts, src/i18n/en.ts, src/recall/reviewService.ts, src/recall/reviewService.test.ts, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4, Step 0b (part 3) and Step 0 close. Template sub-pages fold out under their template in the sidebar (`PageTree` gained `rootId` and an optional "+"); deleting a template while one of its sub-pages is open now closes it. README handoff, status, Decision Log; IDEAS: Step 0 ideas marked done, TypeScript 7 re-parked to Phase 5.
- **Why:** Phase 4 plan, Step 0 polish; owner choices at step start.
- **Files:** src/pages/PageTree.tsx, src/templates/TemplatesSection.tsx, src/notebooks/Sidebar.tsx, e2e/templates.spec.ts, e2e/helpers.ts, README.md, IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Rules updated (owner approved): owner checks have no fixed number, only what tests cannot check; whole steps are built without stopping, asking first only above ~150k tokens (was 80k per sub-step).
- **Why:** Owner's project prompt asks for larger chunks, fewer questions and only genuine hand checks.
- **Files:** rules/testing.md, rules/sessions.md, CLAUDE.md, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4 Step 1 (data model v3). New tables: `tags` (nesting via `parentId`, optional colour), `savedSearches`, `meta`, and rebuildable helper lists `searchEntries` (word list per title/block, multi-entry `*words` index for prefix search), `links` (block → page/heading/card) and `blockTags`. Pages get optional `tagIds` (multi-entry index). "Delete forever" also erases a page's tags. Upgrade tests for version 1 → 3 and version 2 → 3 (all Phase 1–3 data kept; new indexes work). Architecture rule: helper lists are rebuildable copies (owner approved).
- **Why:** Foundation for search, links and tags (Phase 4 Steps 2–6).
- **Files:** src/core/types.ts, src/core/db.ts, src/core/migration.test.ts, src/trash/trashService.ts, src/trash/trashService.test.ts, rules/architecture.md, README.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4 Step 2 (search index service). New `src/search/`: word splitting (`Intl.Segmenter`, case/accent folding that keeps letters of other scripts), a Dexie middleware that updates `searchEntries` inside every page/block save (titles, text, cards; Trash flag; Delete forever and emptied blocks removed; page moved to another notebook takes its entries along), `searchIndex` (all words as word starts, reads only the rarest word's entries, ranked title > card > text + whole-word bonus + newest), `ensureSearchIndex` (chunked, resumable backfill, started at app launch; rebuild on index version change). `SearchEntry` gained `updatedAt` and `deleted` (no database change). Tests incl. 10k notes and 100k entries speed tests.
- **Why:** Engine for the Search popup/screen, links and tags (Phase 4 Steps 3–6).
- **Files:** src/search/searchText.ts, src/search/indexMiddleware.ts, src/search/searchService.ts, src/search/*.test.ts, src/core/db.ts, src/core/types.ts, src/core/migration.test.ts, src/App.tsx, README.md, IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4 Step 3 (search UI: 3a popup, 3b Search screen, 3c saved searches).
  - **Popup** (Ctrl+K / ⌘K, or 🔍 Search in the sidebar): recent pages before typing, chips All · Pages · Notes · Cards, top results grouped (3 per type, 8 with one type), searched words marked, ↑ ↓ Enter Esc, a note/card opens its page scrolled to the block; full screen on phones.
  - **Search screen** ("See all" / Enter): chip counts, Notebook and Card status filters (with counts; status includes "Got wrong (7 days)"), More filters (changed any/week/month; include Journal days, Templates, Trash; sort Best match / Recently changed), views List · Compact · Grouped (remembered per device), "Show more" (50 at a time), "Did you mean…?" when nothing is found, Trash results ("In Trash" → toast with Restore), "Review these cards"; full screen on phones.
  - **Saved searches** (sidebar, shown once one exists): ☆ Save search (name dialog), open, Save changes, rename, delete (notes untouched), ⟳ to review a deck; counts in the sidebar.
  - **All cards hub removed:** Search with the Cards chip and nothing typed lists every card, soonest due first.
  - New review scope `blocks` (cards of given blocks, e.g. a search's results). Blocks deleted on a live page never show in search (they can't be restored).
  - Code: `searchQuery.ts` (filter registry, counts, card status), `highlight.ts`, `suggest.ts` (edit distance ≤ 1–2, same first letter, not for scripts without letter spelling), `savedSearchService.ts`, `findMatches` split out of `searchIndex`, `useDebounced` and `app/keys.ts` (shortcut labels) shared.
  - Tests: searchQuery, suggest, savedSearchService, 10k-card search speed test (browse ~0.15 s); e2e `search.spec.ts` (popup, screen, Trash/Restore, saved searches, screenshots in 3 themes + phone portrait/landscape); `duplicateCards.spec.ts` uses search instead of All cards. 262 unit + 61 e2e pass.
- **Why:** Phase 4 plan, Step 3.
- **Files:** src/search/{searchQuery,highlight,suggest,savedSearchService}.ts (+ tests), src/search/{SearchPopup,SearchScreen,SearchResults,TypeChips,SavedSearchesSection,SaveSearchActions}.tsx, src/search/{useSearch,recentPages}.ts, src/search/searchService.ts, src/search/searchSpeed.test.ts, src/app/{useDebounced,keys}.ts, src/recall/reviewService.ts, src/recall/ReviewScreen.tsx, src/notebooks/Sidebar.tsx, src/App.tsx, src/i18n/en.ts, e2e/{search,duplicateCards}.spec.ts, e2e/helpers.ts; removed src/recall/{AllCardsScreen.tsx,cardQuery.ts,cardQuery.test.ts}, e2e/allCards.spec.ts; README.md, IDEAS.md, CHANGELOG.md

## 2026-10-26

- **What:** Phase 4 Step 4 (links).
  - **[[ links:** typing "[[" (or "/ Link to page") opens a picker: find a page by its title (recent pages before typing), press → or tap › to link a heading or card on it. The link shows the page's current title (› heading), so renames and moves never break it; click or Ctrl+Enter (⌘+Enter) opens it at the heading/card. A deleted heading falls back to the page; a page in the Trash shows struck through and offers Restore. Esc leaves "[[" as plain text.
  - **Linked from:** at the end of each page (not templates): every block on other pages linking here, with the sentence around the link, recently changed pages first, "Show more" 20 at a time. Page-link blocks count.
  - **Links list:** rows kept up to date on every save by the index middleware, rebuilt by the backfill (search index version 2: link titles are also searchable words).
  - Review shows links with current titles; card lists and search snippets use the title saved with the link. Template copies re-point links to the copied pages.
  - Tests: `linkService.test.ts` (incl. 10,000 links), `linkActions.test.ts` (real editor), template link copy; e2e `links.spec.ts` (picker, heading link, rename, Esc, slash, keyboard, Trash/Restore, screenshots in 3 themes + phone). Review e2e locator narrowed (it matched the new section).
- **Why:** Phase 4 plan, Step 4.
- **Files:** src/links/{linkRows,linkService}.ts (+ test), src/links/{LinkPicker,LinkedFrom}.tsx, src/editor/{linkActions.ts (+ test), NoteLinkView.tsx, mapping.ts, schema.tsx, PageEditor.tsx, slashMenu.tsx}, src/search/{indexMiddleware,searchService,searchText}.ts, src/recall/{cardService,cardList,reviewService}.ts, src/recall/ReviewScreen.tsx, src/core/blockService.ts, src/templates/templateService.ts (+ test), src/pages/PageView.tsx, src/i18n/en.ts, src/index.css, e2e/links.spec.ts, e2e/review.spec.ts, tests updated (slashMenu, cardActions, searchService), README.md, CHANGELOG.md, IDEAS.md

## 2026-10-27

- **What:** Phase 4 Step 5a (tags).
  - **Page tags:** chips under the title (current names, parents shown faintly), "+N more", "+ Add tag" picker (find any level, "/" for levels, Create), chip menu: Show everything tagged · Remove from this page.
  - **"#" in text:** opens a tag menu (BlockNote suggestion menu) at a line start or after a space; picking puts a tag chip in the text, tagging that block or the Card it is in. "C#" never opens it; "#1" gets no Create; a space or Esc closes it; "# " still makes a heading. Tags are hidden in Review and in plain-text views.
  - **Names:** case kept as first typed, spaces → "-", same tag regardless of case/accents; nested with "/".
  - **Inheritance:** cards get their page's tags plus tags in their question and answer; a parent tag covers its sub-tags; sub-pages and plain notes do not inherit.
  - **Search:** Tag filter (step by step, with counts), browsing a tag with no words, clicking a tag opens Search filtered to it; saved searches keep the tag.
  - **Data:** `blockTags` list kept by the index middleware and backfill (index version 3, rebuilt once on launch). Template copies carry page tags.
  - **Fix found by tests:** pressing Enter in "Add tag" right after typing (before the list loaded) did nothing.
  - Tests: `tagService.test.ts` (names, dedupe, picker, page/block tags, backfill, inheritance, 10,000-card tag browse), `tagActions.test.ts` (real editor), `e2e/tags.spec.ts` (+ screenshots in 3 themes and phone). 291 unit + 76 e2e pass.
- **Why:** Phase 4 plan, Step 5a.
- **Files:** src/tags/{tagNames,tagService,tagRows,tagQuery,tagStyle}.ts, src/tags/{TagChip,TagPicker,PageTags}.tsx, src/tags/tagService.test.ts, src/editor/{mapping,tagActions,editorContext}.ts, src/editor/{TagView,schema,PageEditor}.tsx, src/editor/tagActions.test.ts, src/search/{indexMiddleware,searchService,searchText,searchQuery,savedSearchService}.ts, src/search/SearchScreen.tsx, src/pages/PageView.tsx, src/recall/ReviewScreen.tsx, src/templates/templateService.ts, src/App.tsx, src/i18n/en.ts, src/index.css, e2e/tags.spec.ts, README.md, IDEAS.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 4 Step 5b — tag tools.
  - **Sidebar "Tags":** tree of tags (sub-tags fold out), counts, "+" New tag, "No tags yet" note; a tag opens Search filtered to it.
  - **Tag tools (⋯ or right-click):** Rename, Move under… (or Top level), Merge into… (sub-tags move under the kept tag), Colour (6 colours or none), Delete tag (asks; notes and cards stay, sub-tags move up a level). Renaming, moving and colouring show everywhere at once; merge/delete also update tags typed in text and saved searches, and reload the open page.
  - **Search:** result rows show their tags; typed words also match tag names ("exam" finds what is tagged #exam).
  - Tests: `tagTools.test.ts` (rename/move rules, merge, delete, counts, tag words, 10,000-note count), `e2e/tagTools.spec.ts` (tree, tools, search rows, 10,000-note merge in real Chrome: 2.6 s), screenshots show the tree. 299 unit + 81 e2e pass.
- **Why:** Phase 4 plan, Step 5b.
- **Files:** src/tags/{tagTools,tagQuery}.ts, src/tags/{TagsSection,TagPicker}.tsx, src/tags/tagTools.test.ts, src/search/{searchQuery,SearchResults}.ts(x), src/search/searchQuery.test.ts, src/notebooks/Sidebar.tsx, src/App.tsx, src/i18n/en.ts, e2e/{tagTools,tags}.spec.ts, README.md, CHANGELOG.md, IDEAS.md

## 2026-10-27

- **What:** Phase 4 Step 6 — card tools in Search.
  - **Most failed cards** (More filters › Sort): cards rated Again most often come first, with "Wrong N×" on the row.
  - **Empty cards** (Card status › Empty (no question)): Cards with no question are listed (they were invisible to Search before) and can be removed with "Remove N empty cards"; their answer lines stay as normal notes; Undo.
  - **Fix:** merging or deleting a tag now also updates tags typed in notes on pages in the Trash, so a restored page shows the right tags.
  - Tests: `emptyCards.test.ts`, Trash test in `tagTools.test.ts`, Most failed speed test (10,000 cards, 50,000 reviews), `e2e/cardTools.spec.ts` with screenshots. 304 unit + 88 e2e pass.
- **Why:** Phase 4 plan, Step 6; Trash-tags idea from IDEAS.md (owner OK).
- **Files:** src/recall/{emptyCards,emptyCards.test,reviewService}.ts, src/search/{searchQuery,searchText,savedSearchService,searchSpeed.test}.ts, src/search/{SearchScreen,SearchResults}.tsx, src/tags/{tagTools,tagTools.test}.ts, src/core/{types,order}.ts, src/i18n/en.ts, e2e/cardTools.spec.ts, README.md, CHANGELOG.md, IDEAS.md

## 2026-10-27

- **What:** Phase 4 Step 7 — phase end checks.
  - All checks pass: 304 unit + 88 e2e tests (upgrade tests, 10k/100k speed tests, screenshots in 3 themes + phone), lint, format, build, `npm audit` 0 vulnerabilities.
  - Security + code review of Phase 4 (index middleware, tag merge/delete, empty-card removal, saved searches, search highlighting): no bugs found. Fix: tag colours are checked against the six app colours when set (`isTagColor`, `setTagColor` refuses others) and when shown (`tagColorStyle`), so a damaged or imported value is ignored.
  - Dependency patch: typescript-eslint 8.72.0 → 8.72.1.
  - LEARNING.md: Phase 4 section.
- **Why:** Phase 4 plan, Step 7 (Definition of Done).
- **Files:** src/tags/{tagTools,tagStyle,tagTools.test}.ts, package-lock.json, LEARNING.md, README.md, CHANGELOG.md, IDEAS.md

## 2026-10-27

- **What:** Two visual tweaks (owner request). Tag chips on pages and in text show their colour as a soft tint only (a bit stronger: 22%); the colour dot stays in the sidebar and the tag picker (`TagLabel` `dot` prop). Linked from sentences use a new in-between text colour `ink-soft` (darker than muted; one value per theme). The Linked from screenshot test now has words around the link. Checked in Day, Night, Sepia; screenshots updated.
- **Why:** Owner request: easier to read, calmer chips.
- **Files:** src/index.css, src/tags/{TagChip,TagPicker}.tsx, src/links/LinkedFrom.tsx, e2e/links.spec.ts, CHANGELOG.md

## 2026-10-27

- **What:** Sidebar Tags list shows each tag as a chip (soft colour tint, like on pages) instead of a coloured dot.
- **Why:** Owner wanted the sidebar to match the new chip look.
- **Files:** src/tags/TagsSection.tsx, src/tags/TagChip.tsx (comment), CHANGELOG.md

## 2026-10-27

- **What:** Phase 4 closed: owner visual checks passed (search, links, tags, saved searches, card tools). Roadmap, status and handoff updated; Phase 5 planning next.
- **Why:** Phase 4 Definition of Done met.
- **Files:** README.md, LEARNING.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 plan approved and recorded ("Phase 5 Plan" in README): notebook tabs (Notes · Database · Cards · Revise), Study tracker, universal databases with Formula/Relation/Rollup, Table/Dashboard/Board (5A) and Calendar/Gallery (5B), Revise tab, CSV + own-file import/export (moved from Phase 6). Roadmap, decision log, handoff and IDEAS updated.
- **Why:** Owner's vision: one app for all data, simple for beginners, deep for experts.
- **Files:** README.md, IDEAS.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 clickable mockup `prototype-phase5.html` (fake data): notebook tabs (Notes · Database · Cards · Revise preview), Study tracker as Dashboard (tiles, donut, line, bars, progress, heatmap), Table (auto columns, ★ confidence, Status auto or set by you, + Column with More types, Formula helper), Board (drag between statuses), row page, New database templates, All databases hub, "/database" block in a note. Self-tested in Chromium in 3 themes and at phone width (no errors, no sideways scroll).
- **Why:** Mockup first: the owner tries the look and flow before building.
- **Files:** prototype-phase5.html, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 mockup updated after owner feedback, then approved: Status menu is a real menu that stays open until a pick (Table and Board "Move to…"); column headers open a sort/filter menu (filters per column, active ones as removable chips, "Clear all"); "How Auto decides" hint in the Status menus and row page; new sidebar "All cards" page (all notebooks, Sort menu, "Review N due"). Phase 5 plan and decision log updated.
- **Why:** Owner mockup feedback; All cards reverses the 2026-10-26 decision (owner OK).
- **Files:** prototype-phase5.html, README.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 Step 5A-0: @types/node 24 → 26 (matches the installed Node 26). TypeScript 7 re-parked: typescript-eslint supports only TypeScript below 6.1, and TypeScript 7 no longer ships the JavaScript API it needs. 304 unit + 88 e2e pass; lint, build clean; npm audit 0.
- **Why:** Phase 5 plan Step 0; owner chose to park TypeScript 7 (small gain, would break lint).
- **Files:** package.json, package-lock.json, README.md, IDEAS.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 Step 5A-1: database version 4. New tables `databases`, `dbColumns`, `dbViews`, helper list `rowRefs`; pages can be database rows (`databaseId` index, cell `values`); notebooks get tabs (Notes · Database · Cards) on upgrade and when created; Study tracker id derived from the notebook id. Upgrade tests from versions 1, 2 and 3. 306 unit + 88 e2e pass; lint, format, build clean.
- **Why:** Phase 5 plan Step 1: the storage every later database step builds on.
- **Files:** src/core/types.ts, src/core/db.ts, src/core/migration.test.ts, src/databases/notebookTabs.ts, src/notebooks/notebookService.ts, src/notebooks/notebookService.test.ts, README.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 Step 5A-2: database service and engines. Own formula language (parser + evaluator, Excel-like functions, `[Column]` references, no code execution); column type registry with checked writes and lenient reads; databases, columns, views, rows and cells; two-way relations (editable from both sides); rollups; sorting and filtering; Study tracker creation; hidden "Databases" notebook for databases outside notebooks. Trash handles databases (list, restore, delete forever erases cell values too); row pages left out of the Notes tree; deleting a notebook takes its databases along. 10k-row speed test. 357 unit + 88 e2e pass.
- **Why:** Phase 5 plan Step 2: the engine every view (Table, Dashboard, Board) uses.
- **Files:** src/databases/formula/formulaValue.ts, src/databases/formula/formulaParser.ts, src/databases/formula/formulaEval.ts, src/databases/formula/formula.test.ts, src/databases/columnTypes.ts, src/databases/databaseService.ts, src/databases/databaseService.test.ts, src/databases/databaseParts.ts, src/databases/databaseQuery.ts, src/databases/databaseQuery.test.ts, src/databases/databaseSpeed.test.ts, src/core/types.ts, src/i18n/en.ts, src/notebooks/notebookService.ts, src/pages/pageService.ts, src/pages/PageTree.tsx, src/trash/trashService.ts, src/trash/TrashSection.tsx, README.md, IDEAS.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 Step 5A-3a: notebook screen with tabs. Clicking a notebook's name opens it (the arrow still folds); tabs Notes (top-level pages, sub-page counts, + New page) · Database (Study tracker, made on first open, in a first read-only Table) · Cards (this notebook's cards via the Search engine; Sort: Due first / Most failed / Recently changed; "Review N due" or "Practice"). Tabs can be renamed (empty = default name), hidden and shown again (one stays visible); arrow keys/Home/End move between tabs (RTL mirrored); open tab remembered per notebook. Full screen with a close button on phones. View-type registry (Table first), safe reader for saved view settings, shared cell formatting (number formats, ★, %, currency, dates, formula errors). 365 unit + 97 e2e pass.
- **Why:** Phase 5 plan Step 3 (first half): the place where databases and cards show up per notebook.
- **Files:** src/notebooks/NotebookScreen.tsx, src/notebooks/notebookService.ts, src/notebooks/notebookService.test.ts, src/notebooks/Sidebar.tsx, src/App.tsx, src/databases/notebookTabs.ts, src/databases/cellDisplay.ts, src/databases/cellDisplay.test.ts, src/databases/views/viewTypes.ts, src/databases/views/viewConfig.ts, src/databases/views/viewConfig.test.ts, src/databases/views/columnLook.ts, src/databases/views/TableView.tsx, src/databases/views/DatabaseView.tsx, src/recall/CardsTab.tsx, src/search/SearchResults.tsx, src/i18n/en.ts, e2e/notebookTabs.spec.ts, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 Step 5A-3b: the full Table view. Cells are edited in place (text, numbers incl. % and money, dates, web links; tick boxes and ★ ratings directly; Choice, Choices, Tag, Note link and Relation in a picker that can create options). Column header menus: sort, filter (per type), clear, hide, edit. Chips above the table show and remove the sort and filters ("Clear all", "N of M rows") and bring hidden columns back; all saved in the view. "+ Column" with every type (More types: Formula with live preview and examples, Relation with two-way option, Rollup); edit column (rename keeps formulas working, change type, options, number format) and delete with Undo. "+ New row" ("+ New lesson" in the Study tracker makes a page in the notebook); row name renames in place, "Open ↗" opens the row.
- **Why:** Phase 5 plan Step 3 (second half): the main way to work with a database.
- **Files:** src/databases/views/TableView.tsx, src/databases/views/TableCells.tsx, src/databases/views/ColumnMenu.tsx, src/databases/views/ColumnDialog.tsx, src/databases/views/Popover.tsx, src/databases/views/cellEditing.ts, src/databases/views/columnFilters.ts, src/databases/views/columnFilters.test.ts, src/databases/views/formulaPreview.ts, src/databases/views/viewConfig.ts, src/databases/views/viewConfig.test.ts, src/databases/views/columnLook.ts, src/i18n/en.ts, e2e/databaseTable.spec.ts, e2e/notebookTabs.spec.ts, README.md, IDEAS.md

## 2026-10-27

- **What:** Step 5A-3 fixes from the owner's checks, part 1. Filter menu: "Show only rows where [Column]…", simpler rule words ("more than", "at least", "has no rating", "has a rating"), a ★ picker for ratings, a live "N of M rows match" count before Apply, and Clear filter next to Apply. Formulas: a comparison with an empty cell now gives a blank answer (an unrated lesson no longer shows "OK"). Formula examples use a limit that fits the column (under 3 stars, under 75 %).
- **Why:** Owner checks of Step 5A-3: filters were hard to read for ratings; the example and the empty-cell answer were wrong.
- **Files:** src/databases/views/ColumnMenu.tsx, src/databases/views/columnFilters.ts, src/databases/views/columnFilters.test.ts, src/databases/views/TableView.tsx, src/databases/views/ColumnDialog.tsx, src/databases/formula/formulaEval.ts, src/databases/formula/formula.test.ts, src/i18n/en.ts, e2e/databaseTable.spec.ts, README.md

## 2026-10-27

- **What:** Step 5A-3 fixes, part 2. A new Formula column starts as a sentence: "If [column] [condition] [value], write [X], otherwise write [Y]" (column and condition are menus; ratings and percents work as shown, e.g. 75 for 75 %). "Advanced: write a custom formula" shows the formula as typed, with a plain "Means: …" line for common shapes, and "Back to the simple sentence" when it fits. Examples read as sentences. The column type list says Formula "writes an answer in each row".
- **Why:** Owner checks of Step 5A-3: typed formulas were too hard for beginners.
- **Files:** src/databases/views/formulaSentence.ts, src/databases/views/formulaSentence.test.ts, src/databases/views/ColumnDialog.tsx, src/i18n/en.ts, e2e/databaseTable.spec.ts, README.md, CHANGELOG.md

## 2026-10-27

- **What:** The formula preview is now a sentence that shows what the formula read: "For “Heart sounds”, Confidence is 2 stars, so it writes Redo." If an empty cell leaves the answer blank, it says "“Heart sounds” has no Confidence yet, so nothing is written." instead of a dash.
- **Why:** Owner: "Preview (keep me): —" didn't explain anything.
- **Files:** src/databases/views/formulaPreview.ts, src/databases/views/ColumnDialog.tsx, src/databases/views/columnFilters.test.ts, src/i18n/en.ts, e2e/databaseTable.spec.ts, README.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 Step 5A-4: Dashboard view. Every database now has a Dashboard (new databases at creation; existing ones through database upgrade v5) with charts drawn by the app itself: number tile, bars, line over time, donut, progress bar and calendar heatmap. A new dashboard shows starter charts picked from the columns; "+ Add chart" and "⋯ › Edit chart" open a dialog with chart type, what to show (number of rows, total / average / lowest / highest of a number column), group by, date column and period, "Only rows where", size, title and a live preview. Each chart can also be shown as a table, moved and deleted (with Undo). A database opens on Dashboard once it has rows (Table while empty), or on the view picked in "⋯ View options". Chart colours are themed and checked for colour-blind safety; Choice options keep their colour.
- **Why:** Phase 5 plan, Step 4 (Dashboard + charts).
- **Files:** src/databases/dashboard/ (chartSpec.ts, chartData.ts, chartData.test.ts, chartFormat.ts, chartColors.ts, ChartBody.tsx, ChartDialog.tsx, DashboardView.tsx), src/databases/views/viewTypes.ts, src/databases/views/DatabaseView.tsx, src/databases/views/openingView.ts, src/databases/databaseService.ts, src/databases/databaseService.test.ts, src/databases/databaseSpeed.test.ts, src/core/db.ts, src/core/migration.test.ts, src/i18n/en.ts, src/index.css, e2e/dashboard.spec.ts, e2e/databaseTable.spec.ts, e2e/notebookTabs.spec.ts, README.md, IDEAS.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5 Step 5A-5: Board view. Rows show as cards in columns, one per option of a Choice column ("Grouped by" picks which). Drag a card to another column, or use its ⋯ menu (Move to, Open, Rename) on phones and with the keyboard. "+ New row/lesson" at the foot of a column adds a row already in that column. "Card shows" picks which values cards show. With no Choice column the Board offers "+ Choice column". Every database now has a Board (new ones at creation; existing ones through database upgrade v6).
- **Why:** Phase 5 plan, Step 5 (Board).
- **Files:** src/databases/views/boardGroups.ts, boardGroups.test.ts, BoardView.tsx, viewTypes.ts; src/core/db.ts, src/core/migration.test.ts; src/databases/databaseService.ts, databaseService.test.ts; src/i18n/en.ts; e2e/board.spec.ts; README.md, IDEAS.md, CHANGELOG.md

## 2026-10-27

- **What:** New rule (approved by owner): mirror CLAUDE.md, README.md, IDEAS.md, LEARNING.md, package.json, `rules/` and `src/` to `C:\Users\pc\Downloads\gdrive notes` with a robocopy line after each change, and confirm in one line. Never copies node_modules, dist or test-results.
- **Why:** Owner keeps a copy of the key project files in a Google Drive folder, kept up to date automatically.
- **Files:** rules/sessions.md, CLAUDE.md, CHANGELOG.md

## 2026-10-27

- **What:** Step 5A-5 fixes from the owner's checks. (1) Board tab showed "database.view.board": repair upgrade v7 renames views saved with a raw text key. (2) "Edit “X” options" first in "Grouped by"; a "+ Add option" column ends the board, with a clear "Add options" button when the column has none. (3) Trello-like drag: solid lifted card, a gap that opens where it lands, stronger target outline; drops land exactly at the gap (new `placeRow`). (4) Phone: the board scrolls sideways again (hidden screen-reader text widened the page panel); touch: swipe scrolls, hold a card to drag it, edge auto-scroll. (5) View tabs and ⋯ stay on one line. (6) Idea parked: databases and views as blocks.
- **Why:** Owner testing feedback.
- **Files:** src/databases/views/BoardView.tsx, boardGroups.ts, boardGroups.test.ts, DatabaseView.tsx; src/databases/databaseService.ts, databaseService.test.ts; src/core/db.ts, src/core/migration.test.ts; src/i18n/en.ts; src/index.css; e2e/board.spec.ts; README.md, IDEAS.md, CHANGELOG.md

## 2026-10-27

- **What:** Step 5A-6, part 1 (database layer). Cards now keep `lastReviewAt` and `lastRating` (newest answer, review or Practice anyway), set by `rateCard` and `rebuildCard` (`withLastAnswer`). Database upgrade v8 fills them from the review history. New backup before any database upgrade (`core/upgradeBackup.ts`, `app/UpgradeGate.tsx`): the saved data is copied to the browser database `learning-notes-backup` (latest only), and a screen offers "Save backup file and update" (JSON download) or "Update without a file".
- **Why:** The Study tracker can read cards only, not the whole history, so it stays fast for heavy users. The owner asked for a backup before the upgrade (both kinds).
- **Files:** src/core/types.ts, src/core/db.ts, src/core/upgradeBackup.ts, src/core/upgradeBackup.test.ts, src/core/migration.test.ts, src/recall/reviewService.ts, src/recall/reviewService.test.ts, src/app/UpgradeGate.tsx, src/main.tsx, src/i18n/en.ts, e2e/upgradeBackup.spec.ts, CHANGELOG.md

## 2026-10-27

- **What:** Session rule: Claude no longer asks the owner to type `/compact`; auto-compact (already on) handles long chats.
- **Why:** Owner asked for work to carry on without their help.
- **Files:** rules/sessions.md, CHANGELOG.md

## 2026-10-27

- **What:** New way of working (owner). Each phase starts with one planning talk where all its questions are asked; then the whole phase is built without stopping (tests, fixes, docs, commits per step). Mid-phase questions: Claude picks the safest option and logs it in the new README section "Decisions to review". Still stops for money, possible data loss, the "said no to" list, rule conflicts, or Sonnet getting stuck. Owner checks at the end of each phase (Phase 5: end of 5A and 5B). Models: owner uses `opusplan`; plans are written for Sonnet to follow. Phase 5 plan: Step 6 now includes the "Show help" system; new Step 6b brings tooltips to the rest of the app; the lesson Mastered rule now also needs 80%+ of cards at card level Mastered.
- **Why:** Owner wants to check in less often; the project is already well planned.
- **Files:** CLAUDE.md, rules/sessions.md, rules/building.md, rules/planning.md, rules/testing.md, rules/phase-end.md, README.md, CHANGELOG.md

## 2026-10-27

- **What:** Step 5A-6, part 2a (tracker numbers). New `databases/trackerStats.ts` (card levels New < 1 day Learning · 1–20 days Familiar · 21+ days Mastered; lesson numbers; Status rule: Not started / Learning under 75% / Mastered = 90%+ correct, nothing due, no new cards, 80%+ cards at level Mastered / Review), `trackerLoad.ts` (reads a notebook's cards once, maps sub-pages to their lesson, skips Trash, suspended and empty cards), `trackerService.ts` (`setLessonStatus`: 📌 Status, null = back to Auto). `loadDatabaseData`/`resolveRows` now fill Status, Last revised, Cards due, % correct and the new auto column "Card levels" (`ResolvedRow.tracker`). Status is a fixed 4-option list (`choiceOptions`). Database upgrade v9 adds "Card levels" to every existing tracker. Tests: rules, levels, sub-pages, Trash, override, upgrade v8→9, 10,000 cards in 100 lessons.
- **Why:** The tracker columns were empty until now; owner chose the rules on 2026-10-27.
- **Files:** src/databases/trackerStats.ts, trackerLoad.ts, trackerService.ts, trackerStats.test.ts, databaseQuery.ts, columnTypes.ts, cellDisplay.ts, databaseService.ts (+test), views/columnLook.ts, src/core/db.ts, migration.test.ts, src/recall/reviewService.ts (export `reviewable`), src/i18n/en.ts, CHANGELOG.md

## 2026-10-27

- **What:** Step 5A-6, part 2b–2c (tracker screens). Table: Status shows as a coloured pill (📌 when set by the user); its menu offers "Auto (now: X)" ⟲ plus the four statuses, with the rule written under it; Cards due reads "5 due · 20 new" (`rowCellText`); "Card levels" column draws a bar split by New / Learning / Familiar / Mastered with the numbers (level meanings as hover text for now). Board: Status is groupable (`groupableColumns`, `groupKeyOf`); dragging sets Status 📌, dropping on the column of the lesson's Auto status hands it back to Auto (`moveValue`); the fixed Status options cannot be edited. Status filters/sorts work like a Choice column (option order), % correct filters in percent, charts group by Status in the status colours. Charts on a Study tracker say "from N lessons". Dashboard: new review-history charts (`trackerHistory.ts`, `dashboard/historyData.ts`): % correct per week (line), cards answered per day (heatmap), study streak (🔥 N days, best run); they are part of the starter charts of every tracker. Tracker views reload once a minute so "due" stays true (`views/useDatabaseData.ts`).
- **Why:** Step 5A-6 of the plan; owner's rules of 2026-10-27.
- **Files:** src/databases/views/TrackerCells.tsx, useDatabaseData.ts, TableView.tsx, BoardView.tsx, boardGroups.ts, columnFilters.ts (+test), src/databases/databaseQuery.ts, databaseService.ts, cellDisplay.ts, trackerHistory.ts (+test), dashboard/historyData.ts, chartData.ts, chartSpec.ts, chartFormat.ts, ChartBody.tsx, ChartDialog.tsx, DashboardView.tsx, src/i18n/en.ts, CHANGELOG.md

## 2026-10-27

- **What:** Step 5A-6, part 3 ("Show help") and step end. New setting Settings › General › Show help (On/Off, per device, default On). New `src/help/`: `Tip` (hover tip after 450 ms or on keyboard focus; ⓘ button on touch screens; one plain sentence plus an example, slot for a picture), `HelpLine` (marked `data-help-line`), `helpRegistry.ts` (every tip and line with where it shows), `useShowHelp`. 19 tips and 4 help lines for the Study tracker (column headers, statuses, 📌, card levels, + New lesson, history charts). `HELP-TEXTS.md` lists them all and a test keeps it equal to the code. Existing board e2e tests now start from Status (the tracker board groups by Status). Upgrade e2e expects database version 90. Full run: 437 unit + 128 e2e pass; lint and build clean.
- **Why:** Owner request 2026-10-27 ("Show help" tooltips, plain meaning + example, help lines under hard features, list to review); this step does the system and the Study tracker, the rest of the app is Step 5A-6b.
- **Self-review:** Tips inside buttons would nest buttons, so tips wrap the button instead (header, status pill). The Status menu items and chart bodies have no tips yet (a button inside a button is not allowed); the help line in the menu covers them. Mastered/Learning exist both as card levels and as lesson statuses (logged for the owner).
- **Files:** src/help/Help.tsx, helpRegistry.ts, useShowHelp.ts, helpRegistry.test.ts, HELP-TEXTS.md, src/settings/builtinSettings.ts, src/index.css, src/i18n/en.ts, src/databases/views/TrackerCells.tsx, trackerTips.ts, TableView.tsx, BoardView.tsx, dashboard/DashboardView.tsx, ChartBody.tsx, e2e/tracker.spec.ts, e2e/board.spec.ts, e2e/upgradeBackup.spec.ts, README.md, CLAUDE.md, IDEAS.md

## 2026-10-27

- **What:** Step 5A-6b, help across the whole app. 54 new tips and 4 help lines (81 tips and 8 lines in all) for the sidebar, notebook tabs, page actions, tags, Review screen, Search, Cards tab and the database views, all listed in `HELP-TEXTS.md`. `Tip` can leave out the ⓘ on touch (`touchInfo`); `IconButton` takes a `tip` (its `title` becomes its `aria-label`); tips open on Tab focus but not on a focus the app sets itself. Old native hover texts were replaced (so Show help Off hides every hover text); the Review "Practice anyway" explanation is now a help line. e2e tests use `getByLabel` for icon buttons; the Review button selectors skip "Review this notebook". New `e2e/help.spec.ts`; a unit test checks that every registered tip is used.
- **Why:** Owner request 2026-10-27 (every feature and label gets a tip; tooltips list for review).
- **Self-review:** Settings descriptions, dialogs, the editor's own menus and pickers have no tips yet (logged in Decisions to review). Tips are shown by a mouse after 450 ms, by Tab focus, and by ⓘ on touch.
- **Files:** src/help/_, src/app/ui.tsx, src/notebooks/Sidebar.tsx, NotebookScreen.tsx, src/pages/PageTree.tsx, PageView.tsx, src/tags/_, src/templates/TemplatesSection.tsx, src/trash/TrashSection.tsx, src/search/_, src/recall/ReviewScreen.tsx, CardsTab.tsx, src/databases/views/_, dashboard/DashboardView.tsx, src/i18n/en.ts, e2e/*, HELP-TEXTS.md, README.md

## 2026-10-27

- **What:** Step 5A-7 and 5A-8. Sidebar: "All cards" and "Databases". New: `recall/AllCardsScreen.tsx` (CardsTab for all notebooks), `databases/DatabasesHub.tsx` (hub + full-screen database), `starterDatabases.ts` (+test), `RowProperties.tsx` (properties of a row page or lesson), `DatabaseBlockView.tsx` + `blockViews.ts` (the "/database" block; block type `database`), slash-menu item "Database", breadcrumb shows the database for rows, Table forces automatic column widths. 8 new tips (87 in all). Phase-half end checks: 440 unit + 141 e2e, lint, format, build, npm audit 0; review fixes: parent-loop guard in `trackerLoad.ts`, null guard in `DatabaseBlockView.tsx`. LEARNING.md: Phase 5 (5A) section.
- **Why:** Plan of Phase 5 (rows as pages, "/database", All databases, All cards).
- **Self-review:** "+ View" and Calendar/Gallery are not built (5B). Opening a hub closes the open page. A "/database" typed inside a card's answer puts the table inside the answer (works, looks heavy).
- **Files:** src/recall/AllCardsScreen.tsx, CardsTab.tsx, src/databases/*, src/editor/schema.tsx, slashMenu.tsx, PageEditor.tsx, editorContext.ts, src/blocks/builtinBlockTypes.ts, src/pages/PageView.tsx, src/notebooks/Sidebar.tsx, src/App.tsx, src/i18n/en.ts, src/help/helpRegistry.ts, e2e/databases.spec.ts, HELP-TEXTS.md, LEARNING.md, README.md

## 2026-10-27

- **What:** Owner check-in fixes for Phase 5A (19 items). Backup screen: "Your notes need a quick one-time update." and "Skip the file, just update". Charts: "from N lessons/rows" counts only rows with a value; titles "Avg. / Min / Max / Total X"; no "Total" for percentage columns; the weekly chart is "Answers right per week"; the three review-history charts can be added from + Add chart › Review history. Notebook tabs: hidden the empty vertical scrollbar (the dead ▲▼). Settings › Date style (default 27 Oct 2026) drives `dateLocale()` for Table, Board, sidebar and journal. Board cards show 📌. Card levels show "No cards". Database screen: name shown once, Delete database in a ⋯ menu. Tip examples are neutral. A database keeps the view it opened on while rows are added. "/database" in one of its own rows shows a message; the cursor moves below an inserted block (no stray text toolbar); help lines keep their size inside the editor. Cards on Templates pages are left out of All cards, Cards tabs, due counts and reviews (`reviewable` checks the page's notebook). README: Known Limitations rewritten, tip counts fixed (86 tips, 8 help lines). New tests: "from N", date style, Templates cards, check-in e2e.
- **Why:** Owner check-in of 2026-10-27.
- **Self-review:** The date default overrides the browser's region (was already day-first in the sidebar). Two or three screenshot e2e tests fail once under load and pass on rerun (logged in IDEAS).
- **Files:** src/i18n/en.ts, t.ts, src/journal/dates.ts, src/settings/builtinSettings.ts, src/App.tsx, src/databases/* (DatabaseView, DatabasesHub, DatabaseBlockView, dashboard/_, views/_), src/recall/reviewService.ts, CardsTab.tsx, src/editor/PageEditor.tsx, src/index.css, src/notebooks/NotebookScreen.tsx, e2e/*, README.md, HELP-TEXTS.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5B planning talk done; the plan (Views, Revise tab, Sharing, End checks) is written in the README Phase 5 Plan. Owner answers: select text + toolbar label for Revise; CSV per database + whole-notebook own file (also restores the backup); Calendar by a Date column and Gallery as tiles; imports always add new copies.
- **Why:** Rule: plan each phase together, then build it without stopping.
- **Files:** README.md, CHANGELOG.md

## 2026-10-27

- **What:** Phase 5B, step 1 (views). New Calendar view (\`views/CalendarView.tsx\`, rules in \`calendarData.ts\`: month/week, Monday start, + on a day adds a row, date column choice) and Gallery view (\`GalleryView.tsx\`: tiles, picture from a Web link column, chosen values); "+ View" with any view type, "Rename this view…" and "Delete this view" (with Undo) in the view options; the "/database" block can switch to all five view types. 5 new tips. Tests: \`calendarData.test.ts\`, e2e in \`databases.spec.ts\` (+ screenshots calendar-_/gallery-_).
- **Why:** Phase 5B plan (owner, 2026-10-27).
- **Files:** src/databases/views/CalendarView.tsx, calendarData.ts (+test), GalleryView.tsx, DatabaseView.tsx, viewTypes.ts, src/databases/databaseService.ts (restoreView), DatabaseBlockView.tsx, dashboard/chartData.ts, src/i18n/en.ts, src/help/helpRegistry.ts, HELP-TEXTS.md, e2e/databases.spec.ts

## 2026-10-27

- **What:** Phase 5B, step 2 (Revise tab). Select words in a note and press Key point · Keyword · Must know · Formula in the toolbar (an inline style "mark", coloured per label in all themes; same button again removes it). New notebook tab "Revise" (\`revise/ReviseTab.tsx\`, \`reviseService.ts\`, \`reviseMarks.ts\`): lessons with mark counts; per lesson an own summary (saved on \`Page.summary\`), its marks (sub-pages included) grouped by label, "Open lesson" and "Practise this lesson". Database upgrade v10 adds the tab to every notebook with tabs. 2 new tips and 1 help line. Own labels in Settings are not built (see Decisions to review).
- **Why:** Phase 5B plan (owner).
- **Files:** src/revise/*, src/editor/markActions.ts, schema.tsx, SelectionToolbar.tsx, src/core/db.ts, types.ts, src/databases/notebookTabs.ts, src/notebooks/NotebookScreen.tsx, src/index.css, src/i18n/en.ts, helpRegistry.ts, e2e/revise.spec.ts, notebookTabs.spec.ts, migration and notebook tests

## 2026-10-27

- **What:** Phase 5B, step 3 (sharing) and step 4 (end checks). CSV: `databases/csv.ts` (reader/writer, ; and tab separators, formula protection), `csvTransfer.ts` (export; import with column mapping, type guessing, choices and tags created), `CsvImportDialog.tsx`; database ⋯ menu has Export as CSV / Import CSV…. Notebook files: `share/bundle.ts` (export, checks, backup → bundle), `importBundle.ts` (new copies with fresh ids, links re-pointed, tags matched by name, relation index rebuilt), `remapJson.ts`, `DataScreen.tsx` (sidebar "Backup & files": save a notebook, import a file or backup file, restore the browser backup); `app/download.ts`. 4 new tips. Tests: csv, csvTransfer (incl. 10,000 rows), bundle round trip, a 500-page/10,000-note/5,000-card notebook, hostile files; e2e `sharing.spec.ts` + screenshots. Review fix: `__proto__` keys dropped from imported JSON. README, LEARNING.md and IDEAS updated.
- **Why:** Phase 5B plan (owner, 2026-10-27).
- **Self-review:** Own Revise labels, journal/template export and tag colours are left for later (Decisions to review). On a phone the notebook screen covers the sidebar until it is closed.
- **Files:** src/share/*, src/databases/csv.ts, csvTransfer.ts, CsvImportDialog.tsx, DatabasesHub.tsx, databaseService.ts (rebuildRowRefs), src/app/download.ts, src/notebooks/Sidebar.tsx, src/App.tsx, src/i18n/en.ts, helpRegistry.ts, e2e/sharing.spec.ts, e2e/revise.spec.ts, README.md, LEARNING.md, IDEAS.md, HELP-TEXTS.md

## 2026-10-27

- **What:** The sidebar scrolls as a whole on short screens (the new buttons pushed Settings and the themes out of reach on a landscape phone); upgrade e2e expects database version 100.
- **Files:** src/notebooks/Sidebar.tsx, e2e/upgradeBackup.spec.ts

## 2026-10-28

- **What:** (1) "Load sample notebook" in Backup & files (for testing): one new notebook with two lessons and a sub-page, notes with Key point / Keyword / Must know / Formula marks, 4 cards, and a "Reading list" database with a Date and a Web link (picture) column; only adds. (2) Notebook files and backups now carry journal days, templates and tag colours: `exportNotebookBundle(db, id, { journal, templates })` (two ticks in the screen, on by default), the tag list includes parent levels and colours, backups include the journal and templates; import adds the journal as "Journal (imported)", templates as "(imported)" templates, and applies a colour only to tags created by the import. 1 new tip. Tests: `sampleNotebook.test.ts`, extended `bundle.test.ts`, `e2e/sample.spec.ts` (the five 5B checks on the sample + screenshots), updated `sharing.spec.ts`.
- **Why:** Owner request 2026-10-28.
- **Self-review:** The sample's pictures come from picsum.photos (internet needed). Restoring a backup re-adds the starter templates as copies. A file with journal/templates should not be shared by accident, hence the ticks.
- **Files:** src/share/sampleNotebook.ts (+test), bundle.ts, importBundle.ts, DataScreen.tsx, bundle.test.ts, src/i18n/en.ts, helpRegistry.ts, HELP-TEXTS.md, e2e/sample.spec.ts, e2e/sharing.spec.ts, README.md, LEARNING.md, IDEAS.md

## 2026-10-28

- **What:** Phase 5 check-in fixes. (1) Backup restore and notebook-file import skip templates the workspace already has (same id, or same name and content, page links compared without ids); sub-pages follow their template; links to a skipped template point at the existing one. (2) The notebook's Database tab shows every database of the notebook as buttons (`notebook.databasePicker` tip). (3) "Remove sample notebook" (`removeSampleNotebooks`): notebooks made by the sample carry `Notebook.sample`; removal asks first and moves them with their pages, notes and databases to the Trash; imported copies lose the flag. (4) Loading a second sample asks "You already have a sample notebook. Add another?". (5) Phase 6 plan: browser history and per-screen URLs (README Roadmap 6b), not built. Tests: template skip (same id, same content, changed and new templates), sample removal and flag handling, e2e for the picker, the warning, removal and no duplicate templates.
- **Why:** Owner check-in 2026-10-28.
- **Files:** src/share/importBundle.ts, sampleNotebook.ts, DataScreen.tsx, bundle.test.ts, sampleNotebook.test.ts, src/notebooks/NotebookScreen.tsx, src/core/types.ts, src/i18n/en.ts, helpRegistry.ts, HELP-TEXTS.md, e2e/sample.spec.ts, e2e/sharing.spec.ts, README.md

## 2026-10-28

- **What:** Phase 6 planning talk. Draft "Phase 6 Plan" added to the README (local-only scope, hash URLs, version history, encrypted files, Anki, languages, image upload, own Revise labels). Sync/accounts moved to Phase 7.
- **Why:** Owner answers 2026-10-28; Roadmap's sync item conflicted with CLAUDE.md "No" list.
- **Files:** README.md, CHANGELOG.md

## 2026-10-28

- **What:** Phase 5 closed (owner check-in for 5A and 5B passed; re-check at the end of Phase 6). Phase 6 plan approved with additions: Hindi + Spanish, lazy Anki readers (old + zstd; ask before installing), 7-day backup reminder, save-on-close, phone sliding sidebar, double-entry password with loss warning, handoff update after every step, running owner-check list (max 5–7 at the end), real-user week after Phase 6.
- **Why:** Owner decisions 2026-10-28.
- **Files:** README.md, IDEAS.md, CHANGELOG.md

## 2026-10-28

- **What:** Phase 6, step 1 (browser history + URLs). `app/router.ts` (hash addresses, pure + tested), App derives the address from its screen state, pushes history entries, restores the screen on Back/Forward and refresh; notebook tab, Revise lesson and full-screen database view are in the address. An address to a missing page/notebook shows Home with a message. `usePref` takes an optional start value.
- **Why:** Phase 6 plan (owner, 2026-10-28).
- **Self-review:** Search typing is not in the address; custom review lists are not reopenable. Flaky e2e seen once: links "Esc leaves [[ as text" (passed on rerun).
- **Files:** src/app/router.ts, router.test.ts, usePref.ts, src/App.tsx, src/notebooks/NotebookScreen.tsx, src/revise/ReviseTab.tsx, src/databases/DatabasesHub.tsx, src/databases/views/DatabaseView.tsx, src/i18n/en.ts, e2e/navigation.spec.ts, README.md

## 2026-10-28

- **What:** Phase 6, step 2 (page version history). New table `pageVersions` (database v11). Copies are kept while editing (at most one per 5 minutes), when leaving a page and when opening History; the last 30 per page stay. “History” button on a page: list of copies, text preview, “Restore this copy” (the page as it was is kept first, so a restore can be undone). “Delete forever” erases a page's copies.
- **Why:** Phase 6 plan (owner, 2026-10-28).
- **Self-review:** Saving 10k blocks, deleting blocks and the card sync (`syncCardRecords`) are slow on huge pages in the fake test database (about 4 ms per deleted block, ~13 s card sync for 10,000 notes); real Chrome is faster but this is worth measuring later. Restore only writes blocks that differ.
- **Files:** src/history/*, src/core/types.ts, db.ts, migration.test.ts, src/editor/pageSync.ts, PageEditor.tsx, src/pages/PageView.tsx, src/App.tsx, src/trash/trashService.ts, src/i18n/en.ts, src/help/helpRegistry.ts, HELP-TEXTS.md, e2e/history.spec.ts, e2e/upgradeBackup.spec.ts, README.md

## 2026-10-28

- **What:** Phase 6, step 3 and owner additions. Password-protected files (AES-GCM + PBKDF2, `.learningnotes.locked`, password typed twice, loss warning); “Save everything” whole-workspace file in Backup & files; gentle backup reminder after 7 days (Save backup now · Remind me later); unsaved changes are kept in localStorage when a tab closes and come back at the next start; on phones the sidebar is a sliding drawer opened by a ☰ button. e2e helpers got `showSidebar`/`openSidebar` for phone-size tests.
- **Why:** Phase 6 plan and the owner's additions (2026-10-28).
- **Self-review:** Locked files are processed fully in memory. The ☰ button is hidden behind full-screen phone screens (they have × buttons). The stash is applied once, on the next opening of that page; if the browser clears localStorage first, the last half second can still be lost.
- **Files:** src/share/crypto.ts, fileIO.ts, lockState.ts, PasswordFields.tsx, backupReminder.ts, ReminderBar.tsx, bundle.ts, DataScreen.tsx (+ tests), src/editor/pendingStash.ts, pageSync.ts, PageEditor.tsx, src/notebooks/Sidebar.tsx, src/App.tsx, src/i18n/en.ts, src/help/helpRegistry.ts, HELP-TEXTS.md, e2e/*.spec.ts, e2e/helpers.ts, README.md

## 2026-10-28

- **What:** Phase 6, step 4 (Anki import/export). New packages fflate, sql.js, fzstd (owner approved; loaded only when an Anki file is used). Backup & files › Anki: import an `.apkg` (old and new compressed formats) as a new notebook (Basic → Card blocks, Cloze → blanks, cards start New); save a notebook's cards and blanks as an `.apkg`.
- **Why:** Phase 6 plan (owner, 2026-10-28).
- **Self-review:** Export not tried in real Anki. Pictures, sounds, tags and Anki schedules are not imported. Imported HTML is reduced to text + bold/italic/underline, so no markup or script can arrive.
- **Files:** package.json, package-lock.json, src/anki/*, src/share/DataScreen.tsx, src/i18n/en.ts, src/help/helpRegistry.ts, HELP-TEXTS.md, e2e/anki.spec.ts, README.md

## 2026-10-28

- **What:** Phase 6, step 5 (languages). User-visible hard-coded text moved to `t()` keys; new device setting “Language” (English · हिन्दी · Español) that loads `hi.ts` / `es.ts` on demand, sets `<html lang>` and, for Spanish, the editor's own menus. Full Hindi and Spanish translations of every key (AI-translated; Spanish marked for native review), with a test that checks keys, placeholders and completeness.
- **Why:** Phase 6 plan and owner additions (Hindi + Spanish, 2026-10-28).
- **Self-review:** Hindi editor menus stay English (BlockNote has no Hindi). Date wording follows the Date style setting (English months). Starter templates and sample content are created in English. The slash-menu alias lookups use English titles, so the Spanish editor menu loses a few extra search words.
- **Files:** src/i18n/* (languages.ts, hi.ts, es.ts, hi1–7.ts, es1–7.ts, translations.test.ts, en.ts), src/settings/builtinSettings.ts, src/App.tsx, src/editor/PageEditor.tsx, slashMenu.tsx, src/notebooks/Sidebar.tsx, src/pages/_, src/trash/_, src/templates/_, src/share/_, src/anki/*, src/app/ui.tsx, e2e/language.spec.ts, README.md

## 2026-10-28

- **What:** Phase 6, step 6 (local picture upload). New `images` table (database v12); pictures from the device are shrunk and stored in the app, referenced as `lnimg:<id>`; the editor's Image block can upload; Web link cells get a 🖼 button; the Gallery shows them. Notebook files, workspace files and backups carry the pictures used (new copies on import). SVG and other types are refused.
- **Why:** Phase 6 plan (owner, 2026-10-28).
- **Self-review:** Unused pictures stay in storage until a clean-up exists. The upgrade backup _file_ (JSON) cannot hold picture bytes; the browser copy can.
- **Files:** src/images/_, src/core/types.ts, db.ts, migration.test.ts, src/databases/columnTypes.ts, views/TableCells.tsx, TableView.tsx, GalleryView.tsx, galleryTiles.ts, src/editor/PageEditor.tsx, src/share/bundle.ts, importBundle.ts, src/i18n/_, e2e/pictures.spec.ts, e2e/upgradeBackup.spec.ts, README.md

## 2026-10-28

- **What:** Phase 6, step 7 (own Revise labels). Labels are now a synced setting (Settings › Review › Revise labels): rename or recolour any, add your own, remove your own; the toolbar, the Revise sheet and a new ⠿ menu entry “Mark line: …” use them. Marks of a removed label stay and show under “Other”.
- **Why:** Phase 6 plan (owner, 2026-10-28).
- **Self-review:** Notebook files do not carry the label list. The Settings control keeps what you type while it saves.
- **Files:** src/revise/reviseMarks.ts, ReviseTab.tsx, src/editor/markActions.ts, SelectionToolbar.tsx, CardMenu.tsx, src/settings/registry.ts, builtinSettings.ts, SettingsScreen.tsx, src/App.tsx, src/i18n/*, tests, e2e/reviseLabels.spec.ts, README.md

## 2026-10-28

- **What:** Phase 6 end checks. Hardening: the Anki (zstd) collection is unpacked in pieces and stopped at 400 MB. LEARNING.md gets the Phase 6 section. All tests, lint, build and `npm audit` pass.
- **Why:** Phase 6 Definition of Done (security review reported, docs updated).
- **Files:** src/anki/readApkg.ts, LEARNING.md, README.md

## 2026-10-28

- **What:** `npm run dev` now runs `vite --host`, so the dev server can be opened from another device on the same Wi-Fi (e.g. the iPad).
- **Why:** Owner request.
- **Files:** package.json

## 2026-10-28

- **What:** The dev server now uses HTTPS with a self-signed certificate (`@vitejs/plugin-basic-ssl`, dev dependency, free), so the iPad gets a secure context (crypto.randomUUID, crypto.subtle). The end-to-end tests set `E2E=1` and keep plain http on localhost.
- **Why:** Owner request: the app showed a blank page on the iPad over http.
- **Files:** package.json, package-lock.json, vite.config.ts, playwright.config.ts

## 2026-10-28

- **What:** The "Import a file" picker no longer restricts file types, so a `.locked` file can be chosen on iPad (iPadOS greys out types it does not know). The file's content is still checked after picking, so a wrong file or wrong password is refused as before.
- **Why:** Owner check on iPad.
- **Files:** src/share/DataScreen.tsx, e2e/sharing.spec.ts

## 2026-10-28

- **What:** Narrow-screen fixes (iPad, ~500 px): the ☰ menu button is now a clear drawn icon with a border, sits above the full-screen phone screens, keeps clear of the browser bar and screen corners (safe-area insets) and is hidden only during Review (which has its own ×); full-screen phone screens and Settings leave room for it. The page action toolbar (Review, Save as template, History…) wraps instead of running off the right edge. New narrow-viewport test.
- **Why:** Owner check 4 on iPad.
- **Files:** src/App.tsx, src/pages/PageView.tsx, src/settings/SettingsScreen.tsx, src/databases/DatabasesHub.tsx, src/notebooks/NotebookScreen.tsx, src/recall/AllCardsScreen.tsx, src/search/SearchScreen.tsx, src/share/DataScreen.tsx, e2e/phoneSidebar.spec.ts

## 2026-10-28

- **What:** Five iPad bugs. (1, 2) On touch screens (`@media (hover: none)`) the icons that only appeared on hover (+, rename, delete, restore…) are always shown, with 44 px tap targets; a mouse still shows them on hover. (3) The app's own names (starter templates, “New notebook”, “My Notebook”) are shown in the chosen language (`i18n/defaultNames.ts`, display only; stored names stay English so backups still match; a title you wrote is never translated). (4) Restoring a backup/file no longer adds a copy of a template that only differs by an extra empty line or formatting: templates are compared by title, words and sub-pages. (5) History: Settings category (`#/settings/<category>`), a notebook's Database tab (`#/notebook/<id>/database/<database>/<view>`) and its view, and the Search words (kept in the address, replacing the entry while typing) are now in the address and history; an address step that never recorded the open level is now written into the entry being left, so Back returns to it. The Revise sheet, Backup & files and full-screen database views were already in history.
- **Why:** Owner bug list from iPad.
- **Self-review:** The 44 px targets make sidebar rows taller on touch screens. A user title exactly equal to an app name (e.g. a page called “Lesson” in a template list) shows translated. Template contents (headings inside) are still English. Calendar month and Search filters other than the words are not in the address. The missing-page and board-phone e2e tests failed once in the full run and passed alone (load).
- **Files:** src/index.css, src/i18n/defaultNames.ts (+test), en.ts, hi7.ts, es7.ts, src/share/importBundle.ts, src/app/router.ts (+test), src/App.tsx, src/settings/SettingsScreen.tsx, src/notebooks/NotebookScreen.tsx, Sidebar.tsx, src/databases/views/DatabaseView.tsx, DatabasesHub.tsx, src/templates/*, src/pages/PageTree.tsx, e2e/touchIcons.spec.ts, navigation.spec.ts, language.spec.ts, src/share/bundle.test.ts

## 2026-10-28

- **What:** Parked the owner's Phase 7 plan (page ⋯ menu, Summary/Notes/Review tabs, connected levels, new-page start, math formulas) and "AI auto-organise" in IDEAS.md.
- **Why:** Owner asked to record the plan before building.
- **Files:** IDEAS.md, CHANGELOG.md

## 2026-10-28

- **What:** Parked the owner's check-3 fixes (password box errors, eye icon, "Forgot password?", "Restore backup" naming and buttons) in IDEAS.md.
- **Why:** Owner asked to record them and build after the Phase 6 checks.
- **Files:** IDEAS.md, CHANGELOG.md

## 2026-10-28

- **What:** Parked "easier way to test on a real iPhone (certificate warning has no visit-anyway link)" in IDEAS.md.
- **Why:** Owner asked to record it for later.
- **Files:** IDEAS.md, CHANGELOG.md

## 2026-10-28

- **What:** Parked "labelled file buttons; Anki 'Import from Anki' / 'Save for Anki' side by side" in IDEAS.md.
- **Why:** Owner asked to record it, to build after the Phase 6 checks.
- **Files:** IDEAS.md, CHANGELOG.md

## 2026-10-28

- **What:** Parked the owner's check-7 notes (untranslated Today date, sample notebook names, Anki sub-deck "::" display, Hindi wording) in IDEAS.md. All 7 Phase 6 owner checks are done.
- **Why:** Owner asked to record them, to build after the Phase 6 checks.
- **Files:** IDEAS.md, CHANGELOG.md

## 2026-10-28

- **What:** README handoff: Phase 6 check-in passed; next steps updated.
- **Why:** All 7 owner checks passed.
- **Files:** README.md, CHANGELOG.md

## 2026-10-28

- **What:** Hindi wording made more everyday: उपकरण → डिवाइस, समीक्षा → रिवीज़न (plurals रिवीज़नों / रिवीज़नें), स्वतः → अपने-आप, प्रतिदिन → रोज़.
- **Why:** Owner feedback from Phase 6 check 7.
- **Files:** src/i18n/hi1.ts–hi7.ts, CHANGELOG.md

## 2026-10-28

- **What:** Anki import shows sub-decks as nesting in page titles ("Share::Tables" → "Share › Tables").
- **Why:** Owner feedback from Phase 6 check 7.
- **Files:** src/anki/importApkg.ts, src/anki/anki.test.ts, CHANGELOG.md

## 2026-10-28

- **What:** Dates next to "Today" and in the journal follow the app language (Hindi, Spanish); the Date style setting (day first / month first) now only forces the order for English.
- **Why:** Owner feedback from Phase 6 check 7 ("Wed 28 Oct" stayed English).
- **Files:** src/i18n/t.ts, src/i18n/dateStyle.test.ts, CHANGELOG.md

## 2026-10-28

- **What:** Plain "Choose File" boxes replaced by labelled buttons (new `FileButton`): "Import from Anki" (with hint "Pick an .apkg file") beside "Save for Anki", "Choose a file to import", "Choose a CSV file"; Hindi and Spanish texts.
- **Why:** Owner feedback from Phase 6 check 6.
- **Files:** src/share/FileButton.tsx, src/share/DataScreen.tsx, src/databases/CsvImportDialog.tsx, src/i18n/en.ts, es4.ts, hi4.ts, e2e/anki.spec.ts, e2e/sample.spec.ts, e2e/sharing.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** Password boxes: a wrong password gives a red border, a bold red "⚠ Wrong password. Try again." under the box, empties the box and puts the cursor back; an eye button shows/hides the password (also in the two "protect this file" fields); "Forgot password?" explains that it cannot be recovered. Hindi and Spanish texts.
- **Why:** Owner feedback from Phase 6 check 3 (the old error was at the top of the page and easy to miss).
- **Files:** src/share/PasswordInput.tsx (new), PasswordFields.tsx, DataScreen.tsx, crypto.ts (`WrongPasswordError`), fileIO.ts (`WrongPassword`), src/i18n/en.ts, es5.ts, es7.ts, hi5.ts, hi7.ts, e2e/sharing.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** Backup & files: "Save everything" and "Restore backup" are two equal buttons in a new top "Backup" section (with the password option, the protected-file password box and the line "This file only opens in Learning Notes. Use Restore backup to open it."). The old "Import a file" section became "Restore backup"; the "Save everything as one file" section was merged into the top one. Hindi and Spanish texts; help texts updated; "Restore backup" added to the parked Phase 7 ⋯ menu in IDEAS.md.
- **Why:** Owner feedback from Phase 6 check 3, so the backup button is not confused with the future "Import file".
- **Files:** src/share/DataScreen.tsx, src/share/FileButton.tsx, src/help/helpRegistry.ts, src/i18n/en.ts, es3–es5.ts, hi3–hi5.ts, HELP-TEXTS.md, IDEAS.md, e2e/sharing.spec.ts, e2e/sample.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** The sample notebook and its page names ("Sample notebook", "Heart sounds", "Lung volumes", "Volumes in detail") are stored in English, marked as sample (`Page.sample`), and shown in the chosen language (`sampleName` in `i18n/defaultNames.ts`) in the sidebar, notebook screen, breadcrumb and Revise tab. Only unchanged names of sample records are translated; a title the user typed or changed, or a user page with the same name, is never translated. The sample's cards, database name and note text are still written in the language chosen when it is loaded.
- **Why:** Owner feedback from Phase 6 check 7.
- **Files:** src/core/types.ts, src/i18n/defaultNames.ts (+test), src/share/sampleNotebook.ts (+test), Sidebar.tsx, PageTree.tsx, NotebookScreen.tsx, PageView.tsx, ReviseTab.tsx, DataScreen.tsx, e2e/sampleNames.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** README handoff: Phase 6 check-in fixes done; next is the Phase 7 planning talk.
- **Why:** Keep the handoff current.
- **Files:** README.md, CHANGELOG.md

## 2026-10-28

- **What:** README records that the 5A/5B re-check is done (passed list, findings and planned fixes); IDEAS.md parks CSV "skip duplicates", menu customisation and the Calendar Day/Week/Month plan.
- **Why:** Owner finished the re-check and asked to record it so it is not asked again.
- **Files:** README.md, IDEAS.md, CHANGELOG.md

## 2026-10-28

- **What:** README: 5A/5B re-check result updated (Drug list, /database, All cards, Show help passed; upgrade backup and screenshots skipped on purpose) and the findings list recorded.
- **Why:** Owner finished the re-check and asked that it is not asked again.
- **Files:** README.md, CHANGELOG.md

## 2026-10-28

- **What:** Tag columns show a 🏷 icon (Number keeps #).
- **Why:** Owner feedback from the 5A/5B re-check (item 13).
- **Files:** src/databases/views/columnLook.ts, CHANGELOG.md

## 2026-10-28

- **What:** Database row page: the breadcrumb stays on one line (long names shortened) and the database name is a link back to the database (item 3).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/pages/PageView.tsx, e2e/databases.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** With Show help Off the Tip wrapper stays (without the tip), so sidebar buttons keep their size and no sideways scrollbar appears (item 2).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/help/Help.tsx, e2e/help.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** Number cells (and the number boxes in the column filter and formula builder) drop letters and extra signs as you type; phones already get a number keypad (item 11).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/databases/views/columnFilters.ts, TableCells.tsx, ColumnMenu.tsx, ColumnDialog.tsx, numberTyping.test.ts, CHANGELOG.md

## 2026-10-28

- **What:** The Calendar message now has an "Add date column" button that adds a Date column and shows the calendar at once; Hindi and Spanish texts (item 14).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/databases/views/CalendarView.tsx, src/i18n/en.ts, es5.ts, hi5.ts, e2e/databases.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** Each Settings category page (General, Review, Journal, APIs) starts with a one-line description; Hindi and Spanish texts (item 17).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/settings/registry.ts, builtinSettings.ts, SettingsScreen.tsx, src/i18n/en.ts, es5.ts, hi5.ts, e2e/settings.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** Toast messages stay about 2.5 s when short and up to 8 s when long (6 s at least with an Undo button); hovering or tapping a message keeps it open, and it closes 1.5 s after the pointer leaves or another tap. They are not cleared by changing page (item 12).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/app/toastTiming.ts (+test), src/app/ui.tsx, src/App.tsx, e2e/toast.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** Each database screen has a visible "Import / Export" button beside the ⋯ menu (Export as CSV, Import CSV…); ⋯ now only holds Delete database (and is hidden on the Study tracker). Hindi and Spanish texts (item 8).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/databases/DatabasesHub.tsx, src/i18n/en.ts, es4.ts, hi4.ts, e2e/sample.spec.ts, e2e/sharing.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** "/database" opens a picker with a search box, ALL your databases (newest first, with their notebook) and the ready-made ones apart under "Create new"; keys ↑ ↓ Enter Esc. The old list showed only the first six, which is why the Drug list could be missing (items 4 and 9). Hindi and Spanish texts.
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/databases/DatabasePicker.tsx, src/editor/PageEditor.tsx, src/i18n/en.ts, es4.ts, hi4.ts, e2e/databases.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** Import CSV asks what to do with the rows already there: New database (default, nothing changes), Add rows, Replace rows (old rows to Trash after a question; Undo brings them back and removes the imported ones) or Update matching rows (same title, then add the rest). Importing the same file twice no longer duplicates by default. Hindi and Spanish texts (item 6; skip-duplicates stays parked).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/databases/csvTransfer.ts (+test), CsvImportDialog.tsx, databaseService.ts (trashRows, restoreTrashedRows), DatabasesHub.tsx, src/App.tsx, src/i18n/en.ts, es4.ts, hi4.ts, e2e/sharing.spec.ts, e2e/sample.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** All cards got a search box, a Notebook filter next to Sort (the Review button follows it) and a small "Notebook › Page" label on each card; the sample notebook's names show translated in search results too. Hindi and Spanish texts (item 16).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/recall/CardsTab.tsx, src/search/SearchResults.tsx, src/search/searchQuery.ts, src/i18n/en.ts, es4.ts, hi4.ts, e2e/allCards.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** One shared rule (useDiscardGuard) for the name, column, chart and CSV dialogs: a click on the dim background closes the dialog only if nothing was typed or chosen; otherwise it asks "Discard your changes?" (Keep editing / Discard). Esc still closes. Hindi and Spanish texts (item 10).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/app/useDiscardGuard.tsx, src/app/ui.tsx, src/databases/CsvImportDialog.tsx, src/databases/views/ColumnDialog.tsx, src/databases/dashboard/ChartDialog.tsx, src/i18n/en.ts, es4.ts, hi4.ts, e2e/discard.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** Table columns can be resized by dragging the edge of the header (or with ← → on the handle); widths are kept in the view (new ColumnResizer, readWidths/withWidth). The table now uses a fixed column layout (colgroup) so widths hold; long words wrap and long header names are shortened. A database inside a note has a "Full width" toggle that stretches it to the page width (kept per block). New tip db.blockWide; Hindi and Spanish texts (item 15).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/databases/views/ColumnResizer.tsx, TableView.tsx, viewConfig.ts, src/databases/DatabaseBlockView.tsx, src/help/helpRegistry.ts, HELP-TEXTS.md, src/i18n/en.ts, es3.ts, es4.ts, hi3.ts, hi4.ts, e2e/databases.spec.ts, CHANGELOG.md

## 2026-10-28

- **What:** Gallery tiles can be moved: drag with a mouse or pen, hold for 0.4 s with a finger, or press Alt + arrow keys on a tile; the new place is kept (placeRow). A sorted view first asks to remove the sort. Tiles ignore the click that ends a drag. Pure helpers dropPlace/stepPlace are unit-tested. Hindi and Spanish texts (item 5).
- **Why:** Owner feedback from the 5A/5B re-check.
- **Files:** src/databases/views/GalleryView.tsx, galleryTiles.ts (+test), src/i18n/en.ts, es4.ts, hi4.ts, e2e/databases.spec.ts, CHANGELOG.md
