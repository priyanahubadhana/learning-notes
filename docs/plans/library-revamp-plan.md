# Library revamp plan + deep-study ideas (11 Nov 2026)

Status: research + design, waiting for owner answers. Order agreed: (1) Library, (2) reading mode, (3) study modes. Builds on [reader-revamp-plan.md](reader-revamp-plan.md), [reader-inventory-2026-11-11.md](reader-inventory-2026-11-11.md) and [../features/library.md](../features/library.md). Must meet [../design/quality-standard.md](../design/quality-standard.md).

## A1. What exists today

- **Library screen** (`src/library/LibraryScreen.tsx`): a gallery of covers with title, author, progress bar and Continue / Read again. Filters: All, Books, Videos, Articles, Pasted. Drop files to import. No sort, no search box, no collections, no list view.
- **Sidebar** (`LibrarySidebar.tsx`): quick open of sources.
- **Book page** (`BookHeader.tsx`): every book is a normal page with three sections: Highlights & notes, Summary, Cards. Highlights are copied there automatically.
- **Data:** `annotations` (highlight / note / bookmark, five colours, quote, note, chapter, card links) and `Page.source` (progress, format, author, cover).
- **Missing:** one place to see _all_ highlights across books, a reading status you can set, shelves, and a way to resurface old highlights.

## A2. What the best apps do (research)

- **Apple Books** — Collections (Want to Read, Reading Now, Finished, your own), sort by Recent / Title / Author, grid or list. Lesson: _status shelves are made for you._ ([Apple support](https://support.apple.com/guide/books/organize-books-ibks0d4fde7a/mac))
- **Kindle** — Library filters (Downloaded, Read, Unread), sort, collections; all highlights live at read.amazon.com/notebook, one book at a time. Lesson: _a highlights notebook is loved, but per-book only is a pain._ ([Kindle notebook](https://read.amazon.com/notebook), [Amazon help](https://www.amazon.com/gp/help/customer/display.html?nodeId=GXPU3YPMBZQRWZEY))
- **Readwise** — every highlight from every source in one list, filter by book, tag, date; Daily Review resurfaces a few each day; Themed Reviews by tag; export to Notion/Obsidian/Markdown. Lesson: _cross-book view + daily resurfacing is the killer feature._ ([Readwise docs](https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights), [Themed reviews](https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights#how-do-themed-reviews-work))
- **Zotero 7** — left: collections + tags; middle: item list with columns; right: preview pane. Annotations show in a side pane and each jumps to the exact spot in the PDF. Lesson: _three-pane list + preview + Jump._ ([Zotero docs](https://www.zotero.org/support/pdf_reader))
- **Calibre** — tag browser on the left (author, series, tag, rating), huge sort/column choice, virtual libraries (saved searches). Lesson: _powerful, but cluttered — keep power in Professional._ ([Calibre manual](https://manual.calibre-ebook.com/gui.html))
- **Notion book trackers** — a database with Status (To read / Reading / Done), rating, genre, board view by status. Lesson: _a board by status is friendly._ ([Notion reading list template](https://www.notion.com/templates/category/reading-list))
- **Obsidian** — one note per book, tags and backlinks, Dataview queries, MOCs (hub pages). Lesson: _links between books create the "second brain"._ ([Obsidian help](https://help.obsidian.md/))
- **Heptabase** — highlights become cards you drag onto whiteboards by theme. Lesson: _themes across books matter more than books._ ([Heptabase](https://heptabase.com/))
- **LiquidText** — projects hold several documents; excerpts stay linked to their source. Lesson: _never lose the link back._ ([LiquidText](https://www.liquidtext.net/))

## A3. Proposed design

Top of the Library: three tabs — **Books · Knowledge · Bank**. Search sits above all three.

**1. Books tab (shelves)**

- Shelves made for you: _Reading now, Want to read, Finished, All_. Your own collections below (e.g. "Psychology", "Work").
- Views: **Grid** (covers, default) or **List** (title, author, progress, last opened, highlight count).
- Filters: type (book, article, video…), status, collection, tag. Sort: Last opened (default), Added, Title, Author, Progress.
- Status: set automatically (opened = Reading, 100 % = Finished) and changeable by hand. Progress bar + "12 min left in chapter" later.
- A book can be in several collections (like playlists).

**2. Knowledge tab (all highlights + notes across books)**

- iPad landscape: list on the left, **preview pane** on the right. Phone/portrait: tap opens a sheet.
- Each row: colour dot, quote (2 lines), your note, book + chapter, date.
- Filters as chips: book, tag, colour, type (highlight / note / bookmark / ★ key), date (this week, month, custom). Sort: newest, book order, colour.
- Preview pane: the quote with ~2 sentences before and after (context), your note (editable), tags, card status, and **Jump** (opens the reader at that exact spot) + **Make card**.
- Saved filters ("All ★ from psychology books") in Professional.

**3. Per-book knowledge page** — the existing book page, improved: a header with cover, status and counts; tabs _Highlights · Summary · Cards_; same filters as the Knowledge tab but scoped to the book; ordered by chapter.

**4. Bank (the knowledge bank)**

- **Daily Highlights**: 5 old highlights a day (★ ones more often), each with Keep / Less often / Make card.
- **Themes**: a tag becomes a theme page that gathers every highlight with that tag from every book (e.g. _Habits_ pulls from Atomic Habits and Deep Work).
- **Export**: Markdown per book or all, CSV; later Readwise/Obsidian style.

**5. Search** — one box searching titles, authors, highlights and notes; results grouped (Books / Highlights / Notes) with the word marked.

**Beginner vs Professional**

- Beginner: Books grid with shelves, Knowledge list with book + colour filters, Daily Highlights, search.
- Professional adds: list view with columns, tag/date/type filters, saved filters, theme pages, export options, bulk actions (tag many, move many).

## A4. Edge cases

- A book with 2,000 highlights: the list must be virtualised (only visible rows drawn) and filtered in the database, not in memory.
- A highlight whose text can't be found again (edited DOCX, changed file): show "Spot not found — open at page 42" instead of a broken Jump.
- A deleted book: its highlights go to Trash with it; restoring brings both back.
- Drawn-box highlights (scanned PDFs) have no text: show a small image snippet instead of a quote.
- Videos/audio: Jump means "play from 12:31".
- Same book imported twice: offer to merge or keep both.
- Very long notes: preview shows 2 lines, pane shows all.
- Right-to-left and Asian languages in quotes and search.
- Offline: everything works locally; sync later.
- Empty states: no books, no highlights, filter with zero results — each with a calm message and one action.

## A5. Questions for the owner

1. **Where does the Knowledge tab live?** (a) A tab inside Library ⭐ (b) its own space in the sidebar. _Example: you open Library and tap "Knowledge" to see every highlight from all books._ Keeps everything about reading in one place.
2. **Status: automatic or manual?** (a) Automatic, changeable by hand ⭐ (b) manual only. _Example: opening Sapiens moves it to "Reading now" by itself._ Less work for you.
3. **Default view of Books?** (a) Cover grid ⭐ (b) list. _Example: a wall of covers like Apple Books._ Feels premium; list is one tap away.
4. **Collections: can a book be in many?** (a) Yes, like playlists ⭐ (b) one folder only. _Example: Atomic Habits in both "Psychology" and "2026 reads"._ Matches how people think.
5. **Preview pane on iPad?** (a) Side pane in landscape, sheet in portrait ⭐ (b) always a sheet. _Example: tap a quote, it shows on the right with Jump._ Best use of iPad space.
6. **How much context in the preview?** (a) 2 sentences either side ⭐ (b) the whole paragraph (c) none. _Example: you see what came before "You do not rise to the level of your goals"._ Enough to remember, not too long.
7. **Daily Highlights count?** (a) 5 a day, changeable ⭐ (b) 10 (c) off by default. _Example: 5 old quotes each morning on Home._ Small enough to actually do.
8. **Where do Daily Highlights show?** (a) Bank tab + a card on Home ⭐ (b) Bank only. _Example: Home shows "Today's 5 highlights"._ You see it without hunting.
9. **Themes from tags or a new "theme" thing?** (a) Any tag can become a theme page ⭐ (b) a separate theme type. _Example: tag #habits → a Habits page across books._ No new concept to learn.
10. **Export in this phase?** (a) Markdown + CSV now ⭐ (b) later. _Example: download all Deep Work highlights as one file._ Your data is never locked in.

## B. Deep-study ideas (ranked by value for a lifelong knowledge bank)

1. **Spaced review of highlights** — old highlights come back to you on a schedule. _Example: a line from Atomic Habits you saved in March returns in May._ Benefit: you actually remember what you read. **Beginner** (Daily Highlights).
2. **Question cards from highlights** — turn a highlight into a question you must answer. _Example: "What are the four laws of behaviour change?" from Atomic Habits._ Benefit: testing beats rereading for memory. **Beginner** (one tap "Make card").
3. **★ Key highlight** — mark the few best highlights as key. _Example: of 80 highlights in Thinking, Fast and Slow, star the 6 about System 1 and 2._ Benefit: the best rises to the top; reviews favour them. **Beginner**.
4. **"In my words" note** — under a highlight, write the idea as you'd explain it to a friend. _Example: under Deep Work's "attention residue": "switching tasks leaves part of my mind on the old one."_ Benefit: real understanding, not copying. **Beginner** (optional field).
5. **Tags at capture** — add a tag while highlighting. _Example: tag a Sapiens line #history and #money._ Benefit: themes build themselves. **Beginner** (recent tags as chips), full tag tools in Professional.
6. **Progressive summarisation** — layers: highlight → ★ the best → summary in your words at the top of the book page. _Example: The Psychology of Money ends with a 5-line summary you wrote._ Benefit: future you reads one page, not 300. **Professional** (Beginner gets just the Summary box).
7. **Theme pages / MOCs** — a hub page for one theme collecting highlights from many books. _Example: "Decision making" pulls from Thinking, Fast and Slow, Superforecasting and Poor Charlie's Almanack._ Benefit: knowledge grows across books, not inside one. **Professional**.
8. **Backlinks** — link a note to another note or book; the other side shows the link back. _Example: your Deep Work note links to Atomic Habits; Atomic Habits shows "mentioned in Deep Work"._ Benefit: ideas connect over years. **Professional**.
9. **Reading journal** — a short dated entry after each session: what I read, what struck me, one question. _Example: "11 Nov, Sapiens ch. 2: gossip as glue of groups — is social media the same?"_ Benefit: tracks your thinking and builds the habit. **Beginner** (optional prompt when closing the reader).
10. **Chapter recap prompt** — at the end of a chapter, the app asks "Sum it up in one line." _Example: after Atomic Habits ch. 1: "1 % better daily compounds."_ Benefit: cheap, powerful memory boost. **Beginner** (can be turned off).
11. **Canvas of excerpts (LiquidText/Heptabase style)** — drag highlights onto a board and arrange them. _Example: lay out Sapiens' three revolutions as columns._ Benefit: see structure visually. **Professional**, later phase (costly to build).

Recommendation: build 1–5 with the Library revamp (they need the Knowledge tab anyway); 6–10 with study modes; 11 later.
