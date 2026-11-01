# Notebooks and pages

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Notebooks hold pages; pages nest under other pages. This is the main structure of the user's notes.

## How it works

- `src/notebooks/notebookService.ts`: `createNotebook` (added at the end), `renameNotebook`, `moveNotebook`, `deleteNotebook`, `listNotebooks`, `updateNotebookTab`.
- `listNotebooks` hides the special Templates and databases-home notebooks. Journal and Templates are created with a `kind` and have no tabs; normal notebooks get default tabs.
- `src/pages/pageService.ts`: `createPage`, `renamePage`, `movePage`, `movePageToTopLevel`, `deletePage`, `listPages`, `listChildPages`, `getPagePath` (breadcrumb), `listNotePages` (hides database row pages).
- Order uses order keys (`core/order`), so moving one item rewrites only that item.
- `titleSaver.ts` saves the title 300 ms after typing stops, using the shared autosaver.
- `sections.ts`: `pageSections` gives jump chips from the page's top-level headings of the largest size; needs at least 3.

## Edge cases

- A parent page must exist and be in the same notebook.
- A page cannot move inside itself or its own sub-pages.
- The Daily journal template page (or a parent of it) cannot be deleted.
- A notebook must keep one visible tab; an unknown tab id throws.
- Tab titles are trimmed and cut to 100 characters; an empty title restores the default name.
- `getPagePath` returns an empty list for a missing, deleted or looping page.
- Changing a deleted or missing record throws (`getLive`).

## Security check

- Validated: parent/notebook match, move loops, tab id, last visible tab, tab title length. Page and notebook titles are not length-limited in the service.
- Data leaving the device: none in this code.
- Deletes: soft. `deleteNotebook` marks the notebook, its pages, blocks and databases (with columns and views) deleted at one shared time; `deletePage` does the same for the page, sub-pages and blocks. Restore and erase are in trash.md.

## Tests

- `src/notebooks/notebookService.test.ts`
- `src/pages/pageService.test.ts`, `sections.test.ts`, `titleSaver.test.ts`
