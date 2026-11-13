# Library v2 (slice 6, flag `library.v2`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Sources: approved mock `docs/mockups/library-mock-v2.html` (HTML), `docs/mockups/library-v2/v2.js` (JS), `v2.css` (CSS), `study.md` (ST); PENDING "Library mock v2: APPROVED" (12 Nov 2026); `docs/mockups/library-r3-comments.md` (LB1, LB2); `docs/plans/mock-feedback-2026-11-11.md:165` (MF); `docs/features/shared-parts.md` (SP, SH); `docs/mockups/pro-features.md` (PF). Book data, reader and highlights stay as in [library.md](library.md).

## Purpose

The Library space shows your books, videos, articles and pasted texts, and everything you highlighted in them. v2 keeps every feature of today's screen and puts it in a calmer order: what you are reading first, covers as the hero, one Add button, shelves in one place, filters out of sight until you need them.

Rule for both modes: **one place for where (side panel shelves), one row for how (More, tabs, search), one Add button, content first.**

## How it works

### 1. Plain words (for the owner)

- You open the Library and see the book you are reading, big, with a Continue button. Under it, all your covers.
- There is one blue "+ Add" button. It imports a file, captures a link or text, or opens Prompts.
- Shelves (All, Reading now, Want to read, Finished, your own collections) live only in the left panel. On a phone, tap the shelf name next to the title.
- Filters, sort, cover or list view, and tags are inside "More". When a filter is on, a small chip with a ✕ shows above the covers.
- The search icon opens a search box right there. On Knowledge it filters the list. On Books it shows results in groups.
- Knowledge shows your highlights first. Daily Highlights, Study prompts and Export are in one "View" menu.
- Professional adds one extra row of filters, list columns, and Tags and Saved filters in the left panel. Nothing else moves.
- Tapping a cover still opens the notes page. Continue is under each cover and first in the ⋯ menu.
- Nothing from today's Library is removed.

### 2. Flags

| Flag         | Meaning                                                                            | OFF                                                                        |
| ------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `library.v2` | Whole Library v2 (page, side panel, More sheet, Knowledge, Export, Tag picker use) | Today's `LibraryScreen` / `LibrarySidebar` / `BookHeader`, pixel for pixel |

Needs `foundation.parts` and `foundation.shell` ON (SP parts and SH shell). Professional switches (unlock ids, PF "Library (6)"): `lib.tagsTab`, `lib.tagCategories`, `lib.listColumns`, `lib.savedFilters`, `lib.dailyStar`, `lib.mentions`. Five Professional things have no id in PF yet: see Decisions to review D1 (proposed `lib.filterRow`, `lib.themes`, `lib.bulkSelect`, `lib.knowStats`, `lib.knowFilters`).

### 3. Shared parts used (names from shared-parts.md; no private copies)

| Need                                                                                  | Part                                                                              |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Colours, spacing, motion                                                              | SP-01 tokens                                                                      |
| Add menu, shelf menu, book ⋯, Knowledge View menu, colour menu                        | SH-11 pop menu (card ▾ frame SP-02, picker 304 / panel 376; phone = bottom sheet) |
| More sheet (Filter, View, Shelves, Import & capture, Daily Highlights, Saved filters) | SH-09 More sheet 440                                                              |
| Books / Knowledge / Themes / Journal / Tags tabs                                      | SP-03 tab row (customisable: add, rename, drag, remove)                           |
| Search box, Collection name, Capture fields                                           | SP-04 ✕ clear field                                                               |
| Tag picker (filter, assign, bulk)                                                     | **SP-05 Tag picker** (LB2). Defined there, only called here (section 6a)          |
| New collection reorder, Select mode drag                                              | SP-06 drag (drop-line, ▲▼, live reflow), SP-07 Arrange sheet for collection order |
| Empty states                                                                          | SP-08                                                                             |
| Select bar (Tag, Key, Move to, Status, Done)                                          | SP-09 object bar                                                                  |
| Capture, Collections, Make-card, Recap, Journal dialogs; delete confirm               | SH-10 small dialog                                                                |
| Toasts with Undo                                                                      | SH-12 toast; SH-05 Undo / Redo                                                    |
| Rail, top bar, sidebar                                                                | SH-02, SH-04, SH-07 (the left panel shows shelves)                                |
| Side panel on phone                                                                   | SH-15 drawer                                                                      |

No new shared part is needed. The Continue-reading card, cover tile and progress line are local to Library but built only from SP-01 tokens (D6).

### 4. Layout (what is on screen)

```
Rail | Shelves (288)    | Library                          [+ Add]
     |  All          14 | [More] Books | Knowledge | (Themes) [Q]
     |  Reading now   7 | (Pro) Type v  Status v  Tag v  Sort v  [grid|list] [Select]
     |  Want to read  5 | Continue reading   [cover] [cover] [cover]
     |  Finished      2 | All  14
     |  My collections  | [cov] [cov] [cov] [cov] [cov]
     |  (Pro) Tags      |
     |  (Pro) Saved     |
     |  Recent  Show all|
```

Phone (≤640): no side panel column; the title row shows `All ▾` (shelf button) next to Library and + Add; covers 2 per row; Continue shows 1 card.

### 5. "When I do X then Y" lines (one e2e test each)

Beginner (B) lines. `data-testid` names reuse today's (`library`, `source-card`, `source-menu-button`, `library-file`, `library-empty`, `book-continue`) and add `continue-card`.

| Id     | When I do X                                                                                                       | Then Y                                                                                                                                                                                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LB-B01 | open the Library, Beginner, iPad landscape 1180x820                                                               | I see the title "Library", one `+ Add` button, one row `More · Books · Knowledge · search icon`. No Import, Capture, Prompts, sort, tag or shelf chips in the header. Tabs are Books and Knowledge only (Themes is Professional)                                              |
| LB-B02 | same screen with 2 or more books read                                                                             | the first block is "Continue reading" with up to 3 big cards (cover, title, thin progress, % read, Continue). The first cover starts at 200 px or less from the top (today 460)                                                                                               |
| LB-B03 | tap a Continue card's cover                                                                                       | the book's notes page opens (not the reader)                                                                                                                                                                                                                                  |
| LB-B04 | tap Continue on a card                                                                                            | a PDF or EPUB opens in the reader at the saved spot; a DOCX opens its first chapter page; a web source opens its page                                                                                                                                                         |
| LB-B05 | pick shelf Finished, or turn a filter on, or search                                                               | the Continue block is hidden (it shows only on All with no filter)                                                                                                                                                                                                            |
| LB-B06 | no book has been opened                                                                                           | the Continue block is not drawn at all (no empty heading)                                                                                                                                                                                                                     |
| LB-B07 | tap `+ Add`                                                                                                       | a pop menu lists Import a book, Capture a link, video or text, Prompts, and the caption "DRM-free files only. You can also drop files, links or text anywhere on this page."                                                                                                  |
| LB-B08 | pick Import a book, choose a PDF                                                                                  | a status line "Saving name (n MB)", then a toast "imported"; the book is on All and Reading-ready, the Add button is disabled while saving                                                                                                                                    |
| LB-B09 | import a wrong type, a file over 300 MB, a DRM file                                                               | a toast with the plain reason; nothing is added; a file over the big-file size on iPad shows the big-file toast first                                                                                                                                                         |
| LB-B10 | pick Capture                                                                                                      | the Capture dialog opens (link, title, paste text); "Save to library" with no link and no text toasts "Add a link or some text first"; a link not starting with https:// toasts "That link should start with https://"                                                        |
| LB-B11 | pick Prompts                                                                                                      | the Prompts dialog opens (today's `PromptsEntry` content)                                                                                                                                                                                                                     |
| LB-B12 | drag a PDF over the page                                                                                          | a dashed banner "Drop a book, a link or some text anywhere here." shows; dropping imports it                                                                                                                                                                                  |
| LB-B13 | drop a link or plain text                                                                                         | the Capture dialog opens with it filled in                                                                                                                                                                                                                                    |
| LB-B14 | open the side panel (iPad landscape, docked)                                                                      | heading "Shelves"; first row is **All** and it is current on first open; then Reading now, Want to read, Finished with counts; then "My collections" with `+` and "No collections yet." when empty; then Recent (5) with "Show all". No Tags or Saved filters in Beginner     |
| LB-B15 | tap a shelf                                                                                                       | the page shows that shelf; the section heading shows the shelf name and a count; the row `aria-current="page"` follows                                                                                                                                                        |
| LB-B16 | tap "Show all" under Recent, then "Show less"                                                                     | the list grows to every item (heading "Everything") and back to 5                                                                                                                                                                                                             |
| LB-B17 | tap a Recent item                                                                                                 | that book's notes page opens (this replaces today's full "Sources" list)                                                                                                                                                                                                      |
| LB-B18 | phone 400x820, or iPad with the side panel closed                                                                 | the shelf button `All ▾` shows next to the title; it opens the same shelf list as a pop menu or sheet; picking one filters the page                                                                                                                                           |
| LB-B19 | look at one cover card                                                                                            | cover, title, thin progress line (only when 0 < percent < 100 and "Show progress" on), author (when "Show author" on), `⋯` button 44 px, Continue / Start reading / Read again button under it. A finished book has a green tick on the cover                                 |
| LB-B20 | tap a cover                                                                                                       | the book's notes page opens (cover tap keeps its old meaning)                                                                                                                                                                                                                 |
| LB-B21 | tap `⋯`, or press and hold 550 ms (finger or Pencil) on a card                                                    | a menu opens: Continue (first), Open notes page, Mark as (Want to read / Reading now / Finished), Add to collections…, Open the original (https only), Export highlights, Delete                                                                                              |
| LB-B22 | pick Mark as Finished                                                                                             | the book moves to Finished, a toast "Moved to Finished" with Undo; Undo puts it back                                                                                                                                                                                          |
| LB-B23 | open a book while "Set status automatically" is on                                                                | it moves to Reading now (unless you marked it Finished by hand); at 98 percent or more it shows as Finished                                                                                                                                                                   |
| LB-B24 | pick Add to collections…                                                                                          | a small dialog lists collections with ticks; saving shows the book on that shelf                                                                                                                                                                                              |
| LB-B25 | pick Delete, confirm                                                                                              | the book and its highlights go to Trash; toast with Undo. Cancel changes nothing                                                                                                                                                                                              |
| LB-B26 | pick Export highlights in ⋯                                                                                       | a Markdown file of that book's highlights downloads; toast "Exported highlights as Markdown"                                                                                                                                                                                  |
| LB-B27 | tap More                                                                                                          | the More sheet (440) opens with tabs Filter, View, Shelves, Import & capture, Daily Highlights; subtitle "How your library looks and behaves"; hint "Nothing changes until you tap Done"                                                                                      |
| LB-B28 | in More › Filter pick the tile Videos, tap Done                                                                   | only videos show and a chip "Videos ✕" appears above the covers with "Showing only these. Change it in More." Tiles: All, Books, Videos, Articles, Pasted                                                                                                                     |
| LB-B29 | tap ✕ on the chip                                                                                                 | the filter clears at once and the Continue block returns                                                                                                                                                                                                                      |
| LB-B30 | in More, close with ✕ instead of Done                                                                             | nothing changed                                                                                                                                                                                                                                                               |
| LB-B31 | in More › View change Default view, Sort by, Show progress, Show author, Stats at the top of Knowledge, then Done | the page updates, a toast "Saved", one Undo reverts all                                                                                                                                                                                                                       |
| LB-B32 | in More › Filter tap a tag chip, or "All tags"                                                                    | the Tag picker (SP-05, filter mode) filters the Library; a tag chip with ✕ shows; results are grouped                                                                                                                                                                         |
| LB-B33 | filter by a tag that nothing has                                                                                  | empty state "Nothing has this tag yet" with action "Clear the tag filter"                                                                                                                                                                                                     |
| LB-B34 | tap the search icon                                                                                               | a 46 px search box opens in place, focused; the icon shows "on"; ✕ in the box clears; Esc clears first, then closes the box                                                                                                                                                   |
| LB-B35 | on Books type 3 letters                                                                                           | results are grouped (Books, Highlights, Notes, Tags) instead of the cover grid; clearing returns the grid                                                                                                                                                                     |
| LB-B36 | on Knowledge type 3 letters                                                                                       | the highlight list filters in place; no grouping, no tab change                                                                                                                                                                                                               |
| LB-B37 | press `/` or Ctrl/Cmd+K on the Library                                                                            | the search box opens and takes focus (the top-bar search also searches the Library when you are there)                                                                                                                                                                        |
| LB-B38 | tap Knowledge                                                                                                     | straight to the highlight list, no number tiles (unless switched on in More › View); a quiet filter row `View ▾ · All books ▾ · Any colour ▾ · Newest ▾`                                                                                                                      |
| LB-B39 | tap `View ▾`                                                                                                      | a menu: All highlights, Daily Highlights, Study prompts, Export, each with a one-line caption                                                                                                                                                                                 |
| LB-B40 | wide (≥760 px) tap a highlight                                                                                    | the preview pane shows it on the right; on iPad portrait and phone it is a bottom sheet                                                                                                                                                                                       |
| LB-B41 | in the preview use Jump, ★ key, colour, tag, Make a card, delete                                                  | Jump opens the reader at that spot (glow); ★ toggles; Make a card toasts "Card made. It joins your next review." with Undo; delete has Undo                                                                                                                                   |
| LB-B42 | filter Knowledge by book, colour (5 dots), sort (Newest, Book order, Colour)                                      | the list changes at once; each active filter shows its value in the chip; "Clear filters" empty-state action resets                                                                                                                                                           |
| LB-B43 | tap View › Daily Highlights                                                                                       | a few old highlights come back with Keep / Show fewer; "Daily Highlights" settings are in More › Daily Highlights (off by default; 3, 5 or 10 a day; Home card on or off)                                                                                                     |
| LB-B44 | tap View › Study prompts                                                                                          | Chapter recap ("Sum it up in one line") and Reading journal (3 lines) forms; saving toasts "Recap saved" / "Entry saved"                                                                                                                                                      |
| LB-B45 | tap View › Export                                                                                                 | the Export card shows: Which books; **What to include** with 8 switches (Highlights, Notes, In my words, Bookmarks, Cards, Summaries, Chapter recaps, Tags); Only (★ Key highlights only, Colours); format Markdown or CSV; a live line "n items from m books"; Export button |
| LB-B46 | switch every "What to include" off                                                                                | the line says nothing matches and Export is disabled                                                                                                                                                                                                                          |
| LB-B47 | Export with Markdown, then with CSV                                                                               | the file downloads (`learning-notes-highlights.md` / `.csv`); toast "Exported a Markdown file"; CSV columns follow the switches                                                                                                                                               |
| LB-B48 | More › View › "Open Export"                                                                                       | the sheet closes, Knowledge opens on Export and "Which books" has focus (Export lives in Knowledge; More holds a shortcut)                                                                                                                                                    |
| LB-B49 | open a book from the Library (cover tap)                                                                          | the book page opens with its header (cover, kind · author · pages, progress, last read, Continue / Read again, original link, extra actions) unchanged                                                                                                                        |
| LB-B50 | iPad portrait 820x1180                                                                                            | the side panel is an overlay; the shelf button shows; Continue shows 2 cards; nothing overlaps and nothing scrolls sideways                                                                                                                                                   |
| LB-B51 | phone 400                                                                                                         | covers 2 per row; Continue shows 1 card; More, tabs, search fit one 44 px row; sheet is full width with grab bar                                                                                                                                                              |
| LB-B52 | empty library                                                                                                     | empty state "Your library is empty" with the file-format rules and one action "Import a book"                                                                                                                                                                                 |
| LB-B53 | open a shelf or filter with no result                                                                             | empty state "Nothing here yet." with "Show all" (resets shelf, type, status, search, tags)                                                                                                                                                                                    |
| LB-B54 | open Knowledge with no highlights                                                                                 | empty state "No highlights yet. Highlight while reading and everything shows up here."                                                                                                                                                                                        |
| LB-B55 | go offline                                                                                                        | the Library, covers, search, filters, Export still work (all local); Capture of a link still saves the link; nothing shows an error                                                                                                                                           |
| LB-B56 | turn `library.v2` OFF                                                                                             | today's screen returns unchanged                                                                                                                                                                                                                                              |

Professional (P) lines. Pro adds one row, list view columns, side-panel sections and Select. Each names its switch.

| Id     | When I do X                                                                 | Then Y                                                                                                                                                                            | Switch                             |
| ------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| LB-P01 | open Books in Professional, iPad landscape                                  | one extra row under the tabs: `Type ▾ · Status ▾ · Tag ▾ · Sort ▾ · [grid/list] · Select`; the Continue block and covers follow                                                   | `lib.filterRow` (new, D1)          |
| LB-P02 | iPad portrait 820 with the side panel open                                  | the Pro row stays on ONE line (no wrap). Below 760 px content width the Sort and view labels become icons; if still too wide the row scrolls sideways with the thin SP-03 track   | `lib.filterRow`                    |
| LB-P03 | phone 400                                                                   | the same row is one line and scrolls sideways with a fade at the edge; More, tabs and search stay on their own row                                                                | `lib.filterRow`                    |
| LB-P04 | pick Type ▾ Videos                                                          | pop menu (radio) with the five types; the chip shows "Videos" and is pressed; the active chip ✕ also shows above the covers                                                       | `lib.filterRow`                    |
| LB-P05 | on shelf Reading now, Finished or Want to read                              | the Status chip is hidden (the shelf already is the status)                                                                                                                       | `lib.filterRow`                    |
| LB-P06 | tap Tag ▾                                                                   | the Tag picker (SP-05, filter mode) opens as a popover; with `lib.tagCategories` on it shows Category › Tag › Sub-tag paths and "Include sub-tags"                                | `lib.tagCategories`                |
| LB-P07 | tap the list icon                                                           | the grid becomes a list with columns Title, Author, Progress, Last opened (more via the switches below); each shelf remembers its own view                                        | `lib.listColumns`                  |
| LB-P08 | More › View › List columns, switch Highlight count, Status, Tags on and off | the columns appear and disappear live in the list; at least Title stays                                                                                                           | `lib.listColumns`                  |
| LB-P09 | the side panel in Professional                                              | adds "Tags" (top 5 by use, "All tags" link) and "Saved filters" under the collections; tapping a tag filters Books; tapping a saved filter opens Knowledge with it applied        | `lib.tagsTab`, `lib.savedFilters`  |
| LB-P10 | tap Select                                                                  | covers get checkboxes; the Select bar (SP-09) shows Tag, Key, Move to, Status, Done; tap a cover toggles instead of opening                                                       | `lib.bulkSelect` (new, D1)         |
| LB-P11 | pick 3 books, Tag                                                           | the Tag picker opens in assign mode with tri-state rows (SP-18); a "some" tag applied adds to all; one Undo reverts all                                                           | `lib.bulkSelect`                   |
| LB-P12 | pick books, Move to / Status                                                | Move to puts them in a collection; Status sets Want / Reading / Finished; toast with Undo                                                                                         | `lib.bulkSelect`                   |
| LB-P13 | Select on Knowledge, pick highlights, Key                                   | the highlights are starred together; Undo reverts                                                                                                                                 | `lib.bulkSelect`                   |
| LB-P14 | open Knowledge                                                              | number tiles on top (highlights, ★ key, cards, tags) with ✕ to hide; in Beginner they are off unless More › View › "Show the Knowledge numbers in Beginner" is on                 | `lib.knowStats` (new, D1)          |
| LB-P15 | Knowledge filter row                                                        | adds `Type ▾` (Highlights, Notes, Bookmarks, ★ Key), `Tag ▾`, `Date ▾` and `Saved ▾` to the Beginner row; Select shows                                                            | `lib.knowFilters` (new, D1)        |
| LB-P16 | tap `Saved ▾` › Save this filter, name it                                   | the filter is saved; it is listed in the side panel and More › Saved filters; deleting it there has Undo                                                                          | `lib.savedFilters`                 |
| LB-P17 | tabs in Professional                                                        | Books, Knowledge, Themes by default; Journal and Tags can be added with "+"; Tags tab shows the Category › Tag › Sub-tag map and Claude's category suggestions (accept / dismiss) | `lib.tagsTab`, `lib.tagCategories` |
| LB-P18 | open Themes, make "New theme from a tag"                                    | any tag becomes a page across books, with its own export and delete (Undo)                                                                                                        | `lib.themes` (new, D1)             |
| LB-P19 | More › Daily Highlights with `lib.dailyStar` on                             | "Favour ★ key highlights": key-marked highlights come back more often                                                                                                             | `lib.dailyStar`                    |
| LB-P20 | open a highlight in the preview                                             | "Mentioned in" lists the notes that mention it; tap opens that note                                                                                                               | `lib.mentions`                     |
| LB-P21 | each Professional switch turned on in Beginner (Settings › Your experience) | only that feature appears; the rest of the screen stays Beginner; it glows once                                                                                                   | all of the above                   |
| LB-P22 | switch Beginner to Professional and back                                    | nothing that is in both modes moves (the extra row and sections appear and disappear in 180 ms)                                                                                   | all                                |

### 6. Behaviour details

**6a. Tag picker.** Library only calls SP-05; it never redefines it. Calls: Tag ▾ and More › Filter (`mode:'filter'`, `scope` = tags present in the current results, `value`/`onChange` = the Library tag filter, `match` Any/All, `includeSub`); book tags, highlight tags and bulk tag (`mode:'assign'`, `itemIds`, `suggest`). Popover on iPad and PC, bottom sheet on phone (SP-06 test in shared-parts). Keys `#` or `T` open it from a list. Automatic tags ("auto") and suggestions keep today's accept / dismiss (mock `tagEditor`, JS:374-382).

**6b. Search.** One search box in the Library row. The top-bar search (SH-04) keeps working and searches the Library when you are in it. On Books: grouped results (Books, Highlights, Notes, Tags) from the same index as Search v2; on Knowledge: the list filters in place; on other tabs: grouped. Closing the box clears it.

**6c. Order of everything.** Sort default is "Newest activity" (last opened, else captured), as today (`libraryService.ts:228-250`). Shelves fill by themselves: Reading now = status reading, Finished = progress ≥ 98 percent, Want to read = rest of the saved items.

**6d. Mark as.** A manual status wins over the automatic one until you change it again.

**6e. Undo.** Every change through ⋯, Mark as, collections, bulk, tags, Save filter, Delete goes through SH-05 Undo / Redo with a toast.

### 7. Sizes, spacing, motion (from the mock)

| Thing                    | Value                                                                                                                 | Mock                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Page max width / padding | 1120 px / 6 20 32 px (phone 4 12 28)                                                                                  | CSS:11-14, 881-884   |
| Title row                | min-height 48, gap 10, title 28 px bold, -0.025em (phone 24)                                                          | CSS:16-29, 885-887   |
| Shelf button             | 44 px high, pill, 14 px semibold, max 46 vw; shown only when the side panel is not docked or on phone                 | CSS:33-58, JS:44-49  |
| Control row              | gap 8, bottom line, bottom margin 4; More button first; tabs fill; search icon round 44                               | CSS:60-86            |
| Search box               | min-height 46, radius 14, 15 px, tonal fill, opens with the 200 ms `c7in`                                             | CSS:87-99            |
| Chips                    | tonal fill, no outline, gap 6, ▾ 14 px at 60 percent                                                                  | CSS:100-129          |
| Filter rows              | margin 10 0 2 (Pro row), 10 0 6 (Knowledge), 10 0 0 (active chips)                                                    | CSS:130-138          |
| Continue block           | 3 columns gap 12; 2 columns under 860 px container; 1 column under 560                                                | CSS:201-208, 306-323 |
| Continue card            | padding 12, radius 20, cover 66 px wide 3:4 radius 9, text gap 14; lifts 1 px on hover                                | CSS:209-246          |
| Card text                | title 14.5 px / 2 lines; author 12.5 px; % 11.5 px; progress line 4 px                                                | CSS:250-299          |
| Cover grid               | `minmax(150px,1fr)`, gap 22 18; phone 2 columns gap 18 14                                                             | CSS:324-328, 891-894 |
| Cover tile               | radius 12, soft shadow, lifts 2 px on hover, selected = 2.5 px accent outline, 2 px offset                            | CSS:338-353          |
| Card info                | padding-top 10, title 13.5 px / 600                                                                                   | CSS:354-361          |
| ⋯ button                 | top 6 right 6, 44 px target                                                                                           | CSS:373-376          |
| Finished tick            | 24 px circle, bottom-left 8                                                                                           | CSS:377-395          |
| Pop menu                 | radius 20, padding 8, blur 28, 200 ms `c7in`, origin top right                                                        | CSS:408-418          |
| Filter tiles in More     | grid min 92 px, gap 8, tile min-height 72, radius 14                                                                  | CSS:530-556          |
| More sheet               | 440 wide (SH-09); phone full width with grab bar                                                                      | shared-parts SH-09   |
| Side panel               | 288 wide (SH-01); phone drawer 86 vw max 320 (SH-15)                                                                  | shared-parts         |
| Touch targets            | 44 px minimum everywhere                                                                                              | ST, quality-standard |
| Motion                   | `--dur-2` for hovers, 200 ms for opens, spring `cubic-bezier(.34,1.45,.64,1)` for press feedback, scale 0.97 on press | CSS:3-9, 108-119     |

### 8. States

| State                                                                                           | What happens                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty library                                                                                   | LB-B52; Continue, shelves counts 0; side panel says "No collections yet."                                                                                              |
| Empty shelf / filter                                                                            | LB-B53                                                                                                                                                                 |
| No highlights, no cards, no bookmarks, no themes, no journal, no sticky notes, tag with nothing | SP-08 empty state, one action each                                                                                                                                     |
| Error                                                                                           | big file (toast on iPad first), over 300 MB, wrong type, DRM, unreadable, link not https: plain toast; busy line clears; nothing is half-saved                         |
| Offline                                                                                         | everything works; Capture saves the link without fetching; "Open the original" opens a tab and may fail by itself                                                      |
| Phone ≤640                                                                                      | LB-B18, LB-B51, LB-P03                                                                                                                                                 |
| iPad landscape / portrait                                                                       | LB-B01, LB-B50; preview pane at ≥760 px, sheet below                                                                                                                   |
| Light / dark / sepia                                                                            | tokens only (SP-01); screenshots in all three                                                                                                                          |
| Reduced motion                                                                                  | pop, search open, tiles, tag tick animation and hover lifts are off (CSS:896-908); changes still show instantly                                                        |
| Busy                                                                                            | Add disabled while saving; "Saving name (n MB)" line (today's `role="status"`)                                                                                         |
| Keyboard / screen reader                                                                        | all chips are buttons with `aria-pressed`; menus have radio roles; progress bars have `role="progressbar"` with values; cover buttons say "title: open the notes page" |

### 9. Nothing lost (34 features of today's screen, probed one by one)

Today's code: `src/library/LibraryScreen.tsx` (LS), `LibrarySidebar.tsx` (SB), `BookHeader.tsx` (BH), `libraryService.ts` (SV), `src/App.tsx`. The study's 35 ids (L, S, B, O) are re-counted to 34, O-ids rebuilt (D2).

| #   | Today's feature                                                                       | file:line                                | New home                                                                                                 |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| L01 | Page title "Library"                                                                  | LS:105-107                               | page title (28 px); on phone the shelf button sits beside it                                             |
| L02 | Import a book button and hidden multi-file input (.pdf .epub .docx)                   | LS:108-129                               | + Add › Import a book (same `library-file` input)                                                        |
| L03 | Capture button                                                                        | LS:130-136                               | + Add › Capture a link, video or text                                                                    |
| L04 | Prompts entry                                                                         | LS:137 (`PromptsEntry`)                  | + Add › Prompts; also More › Import & capture › Prompts                                                  |
| L05 | File-format hint sentence                                                             | LS:139                                   | Add menu caption, empty state, drop banner                                                               |
| L06 | "Saving name (n MB)" busy status                                                      | LS:140-144, 59                           | unchanged line under the title row                                                                       |
| L07 | Type chips All / Books / Videos / Articles / Pasted                                   | LS:26, 145-165                           | Beginner: More › Filter tiles + active chip; Pro: `Type ▾`                                               |
| L08 | Drag and drop of files, links, text                                                   | LS:73-82, 96-101, 166-170                | unchanged; drop banner kept                                                                              |
| L09 | Toasts: big file, imported, error                                                     | LS:60, 63, 65                            | unchanged (SH-12)                                                                                        |
| L10 | Empty states (all / filter)                                                           | LS:171-179                               | SP-08, one action each (LB-B52, B53)                                                                     |
| L11 | Cover grid 2/3/4 columns                                                              | LS:181-192                               | grid kept as default; adds list view, columns                                                            |
| L12 | Source card (cover, title, author, progress, % read)                                  | LS:212-331                               | calmer card: cover, title, thin progress, author on setting; % moves to list, ⋯, book page               |
| L13 | Primary button Start / Continue / Read again / Open                                   | LS:317-329; SV:197-207 (`readStatus`)    | kept under each cover; also first item of ⋯                                                              |
| L14 | Cover tap opens the notes page                                                        | LS:243-260                               | kept (cover tap = notes page; Continue is the reader entry)                                              |
| L15 | ⋯ menu and press-and-hold (Open notes page)                                           | LS:224-228, 261-291                      | ⋯ / 550 ms hold menu: adds Continue first, Mark as, Add to collections, Open original, Export highlights |
| L16 | Delete with confirm                                                                   | LS:194-207, 286-288                      | ⋯ › Delete (confirm, Trash, Undo)                                                                        |
| L17 | Order: newest activity first                                                          | SV:228-250                               | default sort kept; Sort in More › View and `Sort ▾`                                                      |
| L18 | Kinds map: books+file, videos+audio, articles, pasted; kind labels                    | SV:209-226; LS:257, 295                  | same mapping for Type; labels on placeholder covers and list                                             |
| S01 | Side panel heading "Library"                                                          | SB:29-31                                 | heading becomes "Shelves"                                                                                |
| S02 | "+ Capture" button in the panel                                                       | SB:32-38                                 | + Add (page); panel no longer holds an add button                                                        |
| S03 | Panel list of every source, newest first                                              | SB:39-54                                 | Recent (last 5) + "Show all" (LB-B16, B17)                                                               |
| S04 | Panel empty line                                                                      | SB:55-57                                 | "No collections yet." and Recent empty text                                                              |
| B01 | Book header cover                                                                     | BH:45-51                                 | unchanged on the book page                                                                               |
| B02 | Kind · author · pages line                                                            | BH:53-59                                 | unchanged                                                                                                |
| B03 | Progress bar and "% read"                                                             | BH:60-79; SV:206-207 (`progressPercent`) | unchanged                                                                                                |
| B04 | "Last read" date                                                                      | BH:80-86                                 | unchanged; list column "Last opened"                                                                     |
| B05 | Continue / Read again / Open button (PDF, EPUB reader; DOCX first chapter)            | BH:88-109; SV:181-195 (`continueTarget`) | unchanged (`book-continue`)                                                                              |
| B06 | Open the original link (https only)                                                   | BH:110-119                               | unchanged; also ⋯ › Open the original                                                                    |
| B07 | Extra actions slot (Copy prompt, Paste notes …)                                       | BH:120                                   | unchanged                                                                                                |
| O01 | Library space mounts `LibraryScreen` with onOpenPage / onRead / onCapture             | App.tsx:1857-1868                        | `library.v2` swaps the screen; same three callbacks                                                      |
| O02 | Side panel mounts `LibrarySidebar` (open page, Capture hub)                           | App.tsx:1431-1445                        | `libraryPanel` shows Shelves; same callbacks                                                             |
| O03 | `BookHeader` on every source page                                                     | App.tsx:1825                             | unchanged                                                                                                |
| O04 | Import pipeline: 300 MB cap, type by first bytes, cover, three sections               | SV:108-175; `core/bookFormat.ts:15-22`   | unchanged; error texts kept                                                                              |
| O05 | Reading progress saved after 2 s still, never per scroll; furthest only moves forward | SV:264-296 (`saveProgress`)              | unchanged; feeds Continue and shelves                                                                    |

Features that exist only in the approved mock and are NEW in the build (not in today's code): shelves and collections (JS:56-87, HTML:6482-6501), Continue block (JS:148-163), list view and columns (HTML:3904), Knowledge tab (HTML:4086), preview pane, ★ key, tags and Tag picker (JS:422-700), Daily Highlights (HTML:4171), Study prompts (HTML:4178), Themes (HTML:4190), Journal (HTML:4220), Tags map (HTML:4477), grouped search (HTML:3973), Select and bulk bar (HTML:5773-5860), saved filters (JS:1000-1030), Export "What to include" (JS:262-372). The reader, book-page tabs and highlight storage are in [library.md](library.md) and the reader spec; this slice only links to them.

### 10. Data (add-only)

New rows are needed for collections, manual status, saved filters and shelf view memory. They are added as new Dexie tables or new optional fields on `Page.source` (no index change), the same way slice C added tables. Tags use the existing `tags/tagService.ts` through SP-05. Backup, Trash and sync follow the existing rules; the table list is in Decisions to review D3.

## Edge cases

- A book file missing on this device (notes-only backup): the card shows; Continue says the file is missing and offers Import again (as library.md).
- A source with no cover: a generated title cover; the title is not printed twice (cover title only on the placeholder, caption hidden for it).
- Two books with the same title: shown separately; import asks "merge or keep both" when "Ask about duplicates" is on.
- Delete while a Select is active: the selection drops that book.
- A shelf is deleted: its books stay in the Library (books are never deleted with a collection); Undo restores the collection.
- A Pro switch turned off while its feature is in use (for example list view with columns off): the screen falls back to grid; saved choices are kept.
- A Pro filter is on, then the user switches to Beginner: the filter stays on and its chip shows (so nothing hides silently).
- Very long titles: two lines, then "…"; shelf names truncate in the button.
- 1,000+ books: the grid is virtualised; counts come from an index, not from loading all pages.
- Pencil: press-and-hold works with Pencil; scribble does not open anything.
- The shell Undo / Redo is hidden on a computer by setting (SH-09 test); Ctrl+Z still works.

## Security check

- Security rules apply: [rules/security.md](../../rules/security.md).
- Export files are made locally; text is escaped for CSV (quotes doubled) and for Markdown; nothing is sent anywhere.
- Capture and "Open the original" accept only `https://` links (2,000 characters at most, `core/sourceCheck.ts`); opened with `noopener noreferrer`.
- File type is decided by bytes, never by name (unchanged); no script from a book runs.
- Tag names and collection names are plain text, length-limited, rendered as text only; no HTML.
- Search text is never put in a URL or logged.
- Saved filters, collections and tags travel in backup and sync under the same row checks as other tables.
- Locked notebooks: books in a locked notebook show as locked and are left out of search, Daily Highlights and Export until unlocked.
- No cost: nothing here calls a paid service. "Suggest tags" and AI actions use the existing AI bar and its consent and limits.

## Tests

Unit (Vitest):

- `libraryService`: shelf membership (Reading now, Finished, Want), 98 percent rule, manual status wins, sort orders, Type mapping.
- Export builder: each of the 8 "What to include" switches, ★ key only, colours, Markdown and CSV escaping, empty result.
- Filter state: active-chip list, clear, "Show all" reset, Beginner/Pro switching keeps filters.
- Shelf counts; Recent 5 and Show all; search grouping.
- Pro row layout helper: collapse order at widths (no wrap at 820 portrait).

E2E (one per line id above, chromium + ipad-webkit): LB-B01 to LB-B56, LB-P01 to LB-P22. Today's `e2e/library.spec.ts` keeps passing with the flag OFF.

Screenshots (each line's main state): Beginner and Professional x light, dark x iPad landscape (1180x820), iPad portrait (820x1180), phone (400x820), PC (1366x768). Plus sepia for Books and Knowledge.

Other:

- a11y (axe): no serious findings on Books, Knowledge, Export, More sheet, Tag picker; focus order is More, tabs, search, Add; Esc closes menus and sheets; 44 px targets.
- Size budget: Library v2 chunk is lazy, at most 60 kB gzip beyond the shared parts; export code loads only when Export opens.
- Reduced motion test: animations off (LB state table).
- Nothing-lost probe: a script asserts all 34 ids in section 9 exist in the new build (flag ON) and behave as before (flag OFF unchanged, pixel diff 0).
- 820-portrait Pro row: bounding boxes of the row children share one `top`; no horizontal page scroll.
- Controls before first cover (budget): Beginner iPad 5 or fewer Library-owned controls; first cover top at 220 px or less (ST section 4).
- Tag picker tests are SP-14 to SP-19 in shared-parts; Library only tests that it opens them with the right mode.

## Won't do

- No separate "Import a book" button next to + Add.
- No shelf chips row above the covers (shelves only in the side panel).
- No full "Sources" list in the side panel.
- No stats tiles in Beginner by default.
- No change to the cover tap (stays the notes page).
- No native apps, no collaboration, no AI cost without the owner's OK.
- Study modes (summary layers, theme pages, quiz, teach-back, focus session) are LATER (PENDING); this slice keeps only Chapter recap and Reading journal from the approved mock.
- No dense table-first Professional layout (question 9 answered "same layout plus one row").
- No EPUB page curl, no password PDFs (unchanged).

## Sub-slice build order

One surface group per commit, each behind `library.v2`, each with tests and a section on the Parts gallery.

| #    | Group                                                                                                                              | Files (proposed)                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 6.1  | Data: collections, manual status, saved filters, shelf view memory; shelf and search selectors                                     | `src/library/v2/libraryStore.ts`, `shelves.ts`, `libraryQuery.ts`, migration                      |
| 6.2  | Page frame: title, + Add menu, control row, search in place, drop banner, busy line                                                | `src/library/v2/LibraryPage.tsx`, `AddMenu.tsx`, `LibrarySearch.tsx`                              |
| 6.3  | Side panel: Shelves, collections, Recent (Pro: Tags, Saved filters); phone shelf button                                            | `src/library/v2/ShelvesPanel.tsx`, `ShelfButton.tsx`                                              |
| 6.4  | Books tab: Continue block, cover grid, card, ⋯ menu, press-and-hold, Mark as, collections dialog, delete                           | `src/library/v2/ContinueRow.tsx`, `CoverGrid.tsx`, `SourceCardV2.tsx`, `BookMenu.tsx`             |
| 6.5  | More sheet: Filter, View, Shelves, Import & capture, Daily Highlights, active-filter chip                                          | `src/library/v2/LibraryMore.tsx`, `FilterChips.tsx`                                               |
| 6.6  | Tag picker wiring (filter, assign, bulk) on SP-05                                                                                  | `src/library/v2/tagWiring.ts`                                                                     |
| 6.7  | Knowledge: list, filters, preview pane / sheet, View menu, Daily, Study                                                            | `src/library/v2/Knowledge.tsx`, `HighlightPreview.tsx`, `DailyHighlights.tsx`, `StudyPrompts.tsx` |
| 6.8  | Export "What to include"                                                                                                           | `src/library/v2/ExportCard.tsx`, `exportBuilder.ts`                                               |
| 6.9  | Professional: filter row, list columns, Select and bulk bar, saved filters, stats, Themes, Journal, Tags tab, mentions, daily star | `src/library/v2/pro/*`                                                                            |
| 6.10 | Flag switch in `App.tsx`, nothing-lost probe, screenshots, a11y, size, owner check                                                 | `e2e/library-v2.spec.ts`, `src/library/v2/nothingLost.test.ts`                                    |

`BookHeader.tsx` and the importer stay untouched in 6.1 to 6.9.

## Owner iPad check (3 steps)

1. Open the Library. You should see the book you are reading at the top with a Continue button, then all covers. Tap "+ Add": you should see Import, Capture and Prompts in one menu.
2. Tap "More", pick "Videos", tap Done. A small "Videos ✕" chip shows above the covers. Tap ✕ and all covers return. Turn the iPad upright: nothing should wrap or jump.
3. Tap "Knowledge", then "View", then "Export". Switch a few "What to include" items off, tap Export, and check the file. Then switch to Professional and see one extra row of filters, and nothing else moving.

## Decisions to review

- D1. Five Professional features in the approved mock have no unlock id in `pro-features.md` (extra filter row, Themes tab, Select and bulk bar, Knowledge number tiles, Knowledge Type / Tag / Date / Saved filters). Safest pick: add ids `lib.filterRow`, `lib.themes`, `lib.bulkSelect`, `lib.knowStats`, `lib.knowFilters` to the Library list (6 becomes 11, total 174). Needs your OK; until then they are unlocked together with Professional.
- D2. The study counted 35 inventory ids (L01-L18, S01-S04, B01-B07, O01-O06) but did not define the O ids. This spec fixes 34 (O01-O05 above: space mount, panel mount, header mount, import pipeline, progress saving). If you meant another O item, add it; nothing here drops it.
- D3. New data (collections, manual status, saved filters, per-shelf view) is proposed as add-only tables, with the exact names left to the data-model owner (`data-model.md`). Safest option: add-only, so older backups still restore.
- D4. Where the sources disagree on the cover tap: the study proposed "opens the book" but the owner's PENDING says the cover keeps opening the notes page with Continue first in ⋯. This spec follows PENDING and keeps the Continue button under each cover (as the approved mock draws it). To make the card even calmer later, the under-cover button could be hidden in Beginner; not done now because it would drop a visible entry.
- D5. The 820-portrait Pro row: the mock does not say how to avoid the wrap. Pick: one line, labels turn to icons under 760 px, sideways scroll as the last resort. Alternative (a second line) is rejected by the approved condition.
- D6. Continue card, cover tile and progress line are Library-local, built from tokens. If Home or Review need the same Continue card, promote it to a shared part then (a "new shared part needed" note for slice 0g, not now).
- D7. Journal and Tags tabs exist in the mock's tab catalog but are not in the default tabs; Journal is available to Beginner through the "+" menu, Tags only with `lib.tagsTab`. Themes defaults on in Professional only (MF).
- D8. "Bank" in the owner's note is read as the Knowledge tab (the knowledge bank). Export lives there plus a shortcut in More › View.
- D9. Search on Books is grouped, on Knowledge in place, on Journal / Themes / Tags grouped (MF only names Knowledge and "elsewhere").
- D10. Shelf "Want to read" contains captured links and imported books not yet opened; status can be set by hand and wins over automatic status.

## Build lines of the first build (slice 6, short form)

The lines below are the short "When I do X" form that `npm run check:dod` counts; the full tables above stay the source. Each has an end-to-end test in `e2e/libraryV2.spec.ts`. Full build spec: [../plans/library-v2-spec.md](../plans/library-v2-spec.md).

- When I open the Library, I see the title, one + Add button and one row More, Books, Knowledge, search (LB-B01).
- When I have opened books, Continue reading shows them first with covers, only on All without a filter (LB-B02, B05, B06).
- When I tap + Add, one menu offers Import, Capture and Prompts with the file rules (LB-B07).
- When I open the side panel, I see Shelves with counts, my collections and Recent; a tap on a shelf filters (LB-B14, B15).
- When I tap a cover, the notes page opens; the menu has Continue first, Mark as, collections, Delete with Undo (LB-B20, B21, B22, B24).
- When I tap More, I can pick a type, tags and view choices; a chip with a cross shows the active filter (LB-B27 to B31).
- When I open the Tag picker from More, the shared picker opens in filter mode (LB-B32).
- When I tap the search icon, a box opens in place; three letters group the results (LB-B34, B35).
- When I tap Knowledge, my highlights show first with a View menu and a preview with Jump (LB-B38 to B41).
- When I open Export, I choose what to include, see a live count and download Markdown or CSV (LB-B45 to B48).
- When the level is Professional, one extra row appears and stays on one line at 820 px portrait (LB-P01, P02).
- When the flag is off, today's Library is unchanged (LB-B56).
