# Library v2 spec (slice 6, flag `library.v2`)

Short build spec. The full line list (LB-B01..B56, LB-P01..P22), sizes and edge cases stay in [../features/library-v2.md](../features/library-v2.md); the approved mock is `docs/mockups/library-mock-v2.html`. With the flag OFF nothing visible changes.

## When I do X, Y happens

- Open the Library: title, one `+ Add` button, one row `More | Books | Knowledge | search icon`. No Import, Capture, Prompts, sort, tag or shelf chips in the header.
- I have opened books: "Continue reading" shows up to 3 big cards with covers on top (only on shelf All with no filter or search); none opened: no block.
- Tap `+ Add`: a menu with Import a book, Capture a link, video or text, Prompts, and the file-format caption.
- Open the side panel: heading "Shelves": All, Reading now, Want to read, Finished (with counts), My collections (+), Recent (5, "Show all"). Shelves exist nowhere else on the page.
- Tap a shelf: the page shows it. Phone / closed panel: a shelf button `All v` by the title does the same.
- Tap More: a sheet with Filter (type tiles, tag), View (sort, grid / list, show progress, show author, Knowledge numbers), Shelves, Import and capture. Tap Done to apply, ✕ to cancel.
- A filter is on: a chip "Videos ✕" shows above the covers; ✕ clears it at once.
- Tap Tag in More: the universal Tag picker (filter mode) opens; a tag chip with ✕ shows.
- Tap a cover: the notes page opens. `⋯` or press-and-hold: Continue first, Open notes page, Mark as, Add to collections, Open original, Export highlights, Delete (with Undo).
- Tap Knowledge: the highlight list first (no number tiles in Beginner); `View v` (All highlights, Daily Highlights, Study prompts, Export), book and colour filters; a tapped highlight shows a preview with Jump.
- View, Export: "What to include" (Highlights, Notes, In my words, Bookmarks, Cards Q+A, Summaries, Chapter recaps, Tags), Only (★ key, colours), format Markdown or CSV, live count, Export.
- Professional: the same page plus ONE extra row `Type v · Status v · Tag v · Sort v · view · Select`. At 820 px portrait that row stays on one line (icons under 760 px, then sideways scroll).

## Won't do

No separate Import button next to + Add; no shelf chips above the covers; no full "Sources" list in the side panel; no number tiles in Beginner by default; cover tap does not change; no dense table layout; study modes are LATER; no new Dexie tables in this slice (collections, manual status and view choices are kept in a small add-only local store, to be moved into the database later: see Decisions); no cost, no network.

## The 34 inventory features to re-probe (all kept)

L01 title, L02 Import + file input, L03 Capture, L04 Prompts, L05 format hint, L06 busy status, L07 type filters, L08 drag and drop, L09 toasts, L10 empty states, L11 cover grid, L12 source card, L13 primary button (Start / Continue / Read again / Open), L14 cover tap = notes page, L15 `⋯` menu and press-and-hold, L16 delete with confirm, L17 newest-first order, L18 kind mapping; S01 panel heading, S02 capture button (now + Add), S03 panel source list (now Recent + Show all), S04 panel empty line; B01 book cover, B02 kind line, B03 progress, B04 last read, B05 Continue button, B06 original link, B07 extra actions; O01 space mounts the screen, O02 panel mounts the sidebar, O03 BookHeader on source pages, O04 import pipeline, O05 progress saving. Probes: the last test of `e2e/libraryV2.spec.ts` (all ids, flag on) and the flag-off test.

## Decisions to review

- Collections, manual status, view choices and saved filters live in an add-only localStorage store (`src/library/v2/libraryPrefs.ts`) because `src/core/db.ts` and `types.ts` are hot files. A later step moves them into add-only Dexie tables.
- `LibraryScreen.tsx` and `LibrarySidebar.tsx` switch to the v2 components when the flag is on (no `App.tsx` edit).
