# Summary · Notes · Review (Phase M)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Three views of the same material, at three levels: **Summary** (short key points), **Notes** (the full notes) and **Review** (recall cards). Page level, notebook level and whole-app level. Nothing is copied: every note and card is stored once, every level is a view. "Add to Summary" on a line of a note keeps the line linked, so editing the note updates the Summary.

Designed by the builder (owner approved autonomous building, 7 Nov 2026); choices are in DECISIONS "Decisions to review" (Phase M rows).

## How it works

**Data.** One new table `summaryItems` (Dexie **21**, sync rule `record`), one row per Summary line: `pageId` (the page whose Summary holds the line), `notebookId`, `order` (fractional key), `text`, and optionally `sourceBlockId` (a linked note line), `href` + `where` (a link back, used by saved highlights). A typed summary text already exists (`Page.summary`, the Revise tab); it stays the page's own paragraph at the top of its Summary, so the Revise tab and this feature never disagree.

- **Linked line:** shown with the note's live text. If the note line is deleted, the stored snapshot (`text`) is shown, dimmed, with "note removed". The line is the note, so it is edited in the note; "Go to note" scrolls to it. Adding the same note line twice to the same page's Summary keeps one row.
- **Own line:** typed in the Summary, edited in place (saved when you click away), removed with Remove.
- **Saved highlight (C4):** "Save to…" gets a target **Summary of this page**: the highlight's quote (and note) becomes an own line of that page's Summary with an in-app link back to the exact spot (`href` = `#/read/<page>?at=…`, `where` = "p. 12" or the chapter). It works in the reader and in the daily highlight review.
- Service in `src/core/summaryService.ts` (shared, so editor, pages and notebooks use it without new feature links); UI in `src/app/summary/`.

**Add to Summary.** The text-selection toolbar button **Summary** (computer), the block ⋮⋮ menu item **Add to Summary**, the ribbon tool Insert › Summary, and the Add to Summary icon in the short bar's selection pop-up (iPad). It adds the whole line the selection (or cursor) is in; a selection over several lines adds each. A toast confirms; a line already in the Summary says so. With no page open, the ribbon tool opens the notebook's Summary tab.

**Page level.** A segmented control under the title: **Notes · Summary · Review**. Notes is the editor (kept mounted, only hidden, so no typing is lost). Summary: the page's own paragraph, then its lines (this page and its sub-pages, grouped by page when there is more than one), and an "Add a line" field. Review: this page's cards (due and new counts, from the same queue Review uses) with **Practise** (page and sub-pages).

**Notebook level.** The notebook's tabs gain **Summary** (kind `summary`): every page's own paragraph and lines, grouped by page. Notes is the existing Notes tab; Review is the existing Cards tab (it already has Practice).

**App level.** The "All cards" screen gets the same three segments **Notes · Summary · Review** (Review is the old screen unchanged). Summary: all lines, filter by notebook. Notes: the notebooks and recently edited pages. A sidebar entry **All summaries** opens it on Summary.

**Existing notebooks.** New notebooks get the tab from the default template. Older notebooks get it once, right after Notes, when they are opened (`ensureSummaryTab`; no Dexie upgrade step, so notebooks restored from older backups get it too). A tab the user hid stays hidden, because the tab then exists.

## Edge cases

- A page in the Trash or deleted forever: its lines are not shown. Delete forever clears the lines' text and link.
- A linked block moved to another page: the line keeps the block id; "Go to note" finds the block's current page.
- Two devices adding the same note line at once: both rows stay; removing one is one tap.
- Lines are cut to 2,000 characters; at most 500 lines per page.

## Security check

- Text is always rendered as text (React), never as HTML. `href` is accepted only if it starts with `https://` or `#/`, at most 2,000 characters (checked on write and in `checkRows.ts`).
- Backup files: the new table is checked field by field, sizes capped. No network, no secrets, no new permissions.

## Tests

- Unit: `src/core/summaryService.test.ts` (add, dedupe, live text follows edits, deleted note keeps the snapshot, page/notebook/app listings, remove, own line edit, href check, tab added once), `src/core/migration.test.ts` (20 to 21), `src/share/summaryRows.test.ts` (backup file checks).
- E2E: `e2e/summary.spec.ts` (select a line, Summary button, line in the page Summary, edit the note and the Summary follows, notebook tab and app screen).
- Owner (iPad): see [plans/owner-checks-pending.md](../plans/owner-checks-pending.md) "PHASE M CHECKS".
