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
- `sections.ts`: `pageSections` (headings of the largest size, at least 3); the chip row that used it was removed on 9 Nov (the Outline does the job).

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

## Left panel and page order (D1)

- The Panel button (top bar) opens `app/panel/LeftPanel.tsx`: tabs Pages, Outline, Audio, remembered per device. Pages shows each page of the open notebook (title, first three text lines, loaded when the row scrolls into view, 200 at most; locked pages show the title only). Outline lists the headings from the page's blocks (`panelModel.ts`) and glides to the one tapped. Audio lists the page's recordings and opens the recorder panel.
- **Outline view options (9 Nov):** `outlineItems` / `visibleOutline` in `panelModel.ts`. A row above the list: Headings 1 only / 1–2 / All, Toggles (summaries of Toggle list blocks, nested ones deeper), numbers (1, 1.1, 1.2; headings only), and a fold arrow per line with deeper lines. Tapping a toggle line opens that toggle (and any toggle around a tapped heading) then scrolls. Remembered per device.
- Page tree: names wrap to two lines; rows 36 px high; pages drag before, after or inside another (`pages/pageDrag.ts`, pure and tested; `movePage` does the write), with one Undo toast; Move up and Move down buttons are the keyboard way. Journal and template trees do not move.
- Tests: `pageDrag.test.ts`, `panelModel.test.ts`, `e2e/leftPanel.spec.ts`.

## Delete with Undo (9 Nov)

- Page ⋯ menu: red "Delete page" just above Save & restore (`MenuItem.inPlace` keeps it there). It uses `pages/pageTrash.ts` `trashPageWithUndo`: refused with the "locked" message when the page, a sub-page or the notebook is edit-locked; otherwise moves the page and its sub-pages to Trash and toasts "Moved “X” and N sub-pages to Trash" with Undo (`restorePage`, then the page reopens). The old "Import - Coming soon" item now opens Save & restore (Import options live there).
- Sidebar rows: the ✕ (Delete page / Delete notebook, always last) is never clipped. When a row is narrower than 19 rem (a container query, the default 260 px sidebar included), ↑ ↓ ↰ ☆ (and a notebook's ⟳ ✎) fold into a ⋯ menu (`RowMenuButton narrowToo`); + and ✕ stay. On touch the 44 px ⋯ menu already has Delete.
- A page ✕ moves to Trash at once with the Undo toast (no confirm, because Undo is a better safety net). A notebook ✕ still asks, now with the page count ("Move “X” and its N pages to Trash? You can undo this."), then toasts with Undo (`restoreNotebook`).
- Tests: `src/pages/pageTrash.test.ts`, `e2e/deletePage.spec.ts`.
