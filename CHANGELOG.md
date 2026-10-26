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
