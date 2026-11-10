# Custom views plan (9 Nov 2026, for owner approval)

Research: [../research/custom-views-2026-11.md](../research/custom-views-2026-11.md). Replaces the All / Starred / Recent tabs on the Notebooks home (dropped by the owner).

## Recommendation: one word, "Views", two kinds

Users see one word, **Views**, made with one "+ New view" button. A view is either:

- **Collection** (manual): pin anything into it: notebooks, pages, cards, databases, decks, later prompts/skills. Like GoodNotes Favorites or a Craft collection. **Starred** is simply the first collection, made on first use (the star adds to it).
- **Smart view** (rules): saved filters like Apple smart folders: type (notebooks, pages, cards, databases), notebooks, pages (with sub-pages), tags, created or edited within N days, card state (new, due, learning, mastered). Match All or Any.

**Study sets are not a third kind.** A smart view of Cards shows a **Study** button that opens Review on exactly those cards, reusing Decks ("exam: chapters 3-5 due cards" = notebook + pages or tags + due). Two concepts, not three.

Views reference items; they never move or copy them. No nesting (one level, like Things areas).

## Placement

- **Notebooks home:** a "Views" row of small glass tiles (name, colour dot, count, "+ New view"); below it the cover shelf of all notebooks with a sort menu (Last opened, Name, Created). A view opens in the same space.
- **Sidebar:** a "Views" group under the notebook tiles, only views marked "Show in sidebar" (Starred on by default). Hidden when empty.
- **Tool bar:** "Pin to tool bar" in a view's ⋯ menu (max 3).
- **Command palette:** every view ("View: Exam 3-5"), plus "New view" and "Add to view…" for the current item.
- **Add to view:** ⋯ menu on notebook, page, card, database, deck; plus the star.

## Data model (no new Dexie version)

Reuse `savedSearches` (already a synced `record` table, backed up, checked in `checkRows.ts`). Its `query: JsonObject` is free-form, so a view is a SavedSearch whose query is:

```
{
  view: 1,                                   // marks a view; plain saved searches lack it
  kind: 'collection' | 'smart',
  colour?: '#rrggbb', icon?: string,
  showIn: { sidebar: boolean, toolbar: boolean },
  items?: { type: 'notebook'|'page'|'card'|'database'|'deck'|'prompt', id: string, addedAt: number }[], // cap 500
  rules?: { match: 'all'|'any', type: 'notebook'|'page'|'card'|'database',
            notebookIds?, pageIds?, withSubpages?, tagIds?,
            createdWithinDays?, editedWithinDays?, cardStates?: ('new'|'due'|'learning'|'mastered')[] }
}
```

- Study: extend `recall/deckFromSearch.ts` to build a Deck draft from a card smart view.
- Plain saved searches stay as they are; the search screen must ignore rows with `view: 1`.
- Validation in the service and `checkRows.ts`: fixed enums, id pattern, caps (500 items, 50 ids per rule list, name 80 chars), colour `#rrggbb`.
- Deleted items are skipped on read and pruned on the next edit; deleting a view never touches its items (soft delete).
- Smart views use existing indexes (pages and cards by notebook, tag joins) and page results (first 60, "Show more") per rules/scalability.md.
- A fast "which views contain this item" lookup would need a new table (Dexie 23). Not needed now.

## Sync

Nothing new. Known risk: the whole `query` is one field, so two devices adding to the same collection at the same moment keep only the newer edit. Accepted for now; log in DECISIONS; per-item merge later if it bites.

## Wireframe in words

Notebooks home: heading "Notebooks" and "+ New notebook". Row "Views": [★ Starred 4] [Exam 3-5 · 32 due] [Reading 12] [+ New view]. Then the cover shelf, sort menu on the right. Open a view: header with name, colour, count and ⋯ (Rename, Colour, Edit rules, Show in sidebar, Pin to tool bar, Delete); body groups items by type (notebook covers, pages list, cards list, databases), 6 each then "Show all". Card views: a violet **Study 32** button top right. New view sheet: two big choices (Collection, Smart view); a smart view's rules read as one sentence ("Cards in Biology, tagged chapter-3 or chapter-4, that are due") with a live count.

## Steps for the builder (Sonnet)

1. **Service** `src/views/viewService.ts`: create, rename, delete (soft), add and remove item, read collection (skip deleted), evaluate rules with paging, validation. Tests `viewService.test.ts`: shapes and caps, deleted items skipped, all/any, each rule, 10,000 pages within the speed budget; `checkRows` refuses a bad view on import; saved-search list ignores views.
2. **Notebooks home**: no filter tabs; Views row, view screen, New view sheet; star = Starred. i18n in all 9 language files. E2E `customViews.spec.ts`: make a collection, add notebook, page and card, reload keeps it; smart view count changes after tagging.
3. **Add to view** in ⋯ menus; palette entries. E2E: palette opens a view.
4. **Study** from a card view into Review. Tests: due cards only; empty state.
5. **Sidebar group and tool bar pin** (max 3). E2E: pin survives reload; accessible names.
6. Docs: `docs/features/custom-views.md`, CHANGELOG, owner checks.

## Defer

Nested views, shared views, AI prompts/skills in views (type reserved until the prompt library exists), per-item sync merge, drag to reorder inside a collection (newest first for now), more rule fields, views inside a single notebook.

## Owner decision (10 Nov)

- Approved as recommended: one word "Views" (Collections + Smart views), Study = one-off session. Build after the bug fixes.
