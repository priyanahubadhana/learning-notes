# Search

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Find pages, notes and cards by words, with filters, counts and saved searches. Everything runs on the device against a word index.

## How it works

- `src/search/searchText.ts` turns text into words: lower case, accents removed (`fold`), split with `Intl.Segmenter` (so Chinese, Japanese and Thai work), each word cut at 40 characters. `pageEntry` and `blockEntry` make one index entry per page title and per block. A block that makes cards is kind `card`; others are `text`. A page's typed drawing labels make one entry `ink:<pageId>` of kind `ink` (score 150, shown as a note; see ink.md "Drawing labels").
- `src/search/indexMiddleware.ts` is a Dexie middleware. Every write to `pages` or `blocks`, from any service, updates the entries (and the links and block-tag lists) in the same transaction. Hard deletes remove the entries.
- `ensureSearchIndex` (`searchService.ts`) fills the index in chunks of 500 for older notes or when `SEARCH_INDEX_VERSION` (now 4) changes. Progress is saved in `meta`, so a reload carries on.
- `findMatches` finds entries where every search word starts a word. It reads only the rarest word's range, then checks the rest. Ranking: title 300, card 200, drawing label 150, text 100, plus 10 per whole-word match, then newest first.
- `runSearch` (`searchQuery.ts`) adds tag-name matches (score 50), the filters (type, notebook, tag, card status, changed, journal, templates, Trash) and per-filter counts. With no words it can browse a tag or all cards.
- `suggestSearch` offers "did you mean" (1 to 2 letters off, only if the fix finds a live result). `recentPages.ts` keeps the last 20 opened pages in browser prefs.
- Saved searches (`savedSearchService.ts`) store text, type and filters. `readSavedQuery` falls back to defaults for missing or odd fields.

## Edge cases

- Text with no letters or digits finds nothing.
- Entries in the Trash are hidden unless asked for; a deleted block on a page not in the Trash is never shown.
- A page moved to another notebook updates its block entries' notebook.
- Empty Cards (no question) get an entry flagged `empty` so the Cards list can show them.
- No suggestions for Han, Kana, Thai, Lao, Khmer or Myanmar text, or for words under 3 or over 30 letters.
- Above 300 matching cards, one table read replaces key lookups.

## Security check

- Input: search text is only split into words; it is never run as code or a pattern. Saved queries are re-checked on read (`readSavedQuery`). Saved search names are only trimmed.
- Data leaving the device: none found. These files make no network calls.
- Deletes: saved searches are soft-deleted (`deletedAt`); no notes are touched. Index entries are removed when a page or block is hard-deleted or purged.

## Tests

- `src/search/searchService.test.ts`, `searchText.test.ts`, `searchQuery.test.ts` (also covers highlighting), `suggest.test.ts`, `savedSearchService.test.ts`, `searchSpeed.test.ts`
- `e2e/search.spec.ts`

## Locked pages (batch 3)

Notes and cards of a locked page (or a page in a locked notebook or database) never match a search while locked. A page-title result may still show, with a 🔒 and no text. The results re-run when something is unlocked or locked again. See [lock.md](lock.md).
