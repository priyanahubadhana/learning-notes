# What We Built — in Plain Language

One section per phase, so you can reread how the app works and why.

## Phase 3 — Recall & Spaced Repetition (completed 2026-10-26)

**The big idea:** you forget things on a curve. Reviewing a fact just before you would forget it makes the memory last longer each time. So the app turns your notes into question cards and shows each card again at the right moment: soon when it is new, then less and less often.

### Cards

- **Card block:** type `/card`, write a question; the lines nested under it are the answer.
  _Example:_ "Which valves close in S1?" → answer "Mitral and tricuspid".
- **Make card:** any block can become a card from its ⋮⋮ menu. Its nested lines become the answer. Ctrl+Z undoes it.
- **Fill-in-the-blank:** highlight words and press **Blank**. Each blank is its own card, shown as "…" in review.
  _Example:_ "S2 closes the **aortic** valve" → review shows "S2 closes the … valve".
- **Duplicate** (⋮⋮ menu): copies a block, with everything inside it, right below. A copied card is a brand-new card, so its schedule starts fresh.
- **Empty cards** (no question yet) stay saved but are left out of reviews until you type a question.
- **Suspend:** hides a card from reviews without deleting it (Undo is offered).

### Reviewing

- **Review** in the sidebar shows how many cards are due. Space reveals the answer. Then rate it: **1 Again · 2 Hard · 3 Good · 4 Easy**. Each button shows when the card would come back.
- **Scopes:** review everything, one notebook (⟳), one page (page bar), the cards in a Card list, or **Got wrong (7 days)**.
- **Practice anyway:** extra practice on cards that are not due. It never changes their schedule.
- **Daily limits:** 20 new cards a day by default, so a big import doesn't bury you. The study day starts at 4 am, so a late-night session still counts as "today".

### How the app decides "when" (the scheduler)

- **FSRS (default):** a modern memory model, also used by Anki. For each card it estimates two things: how _stable_ your memory is and how _difficult_ the card is. It then picks the day when you would still remember it with your **Target memory** chance (90% by default).
  _Example:_ a new card: Good → back in 10 minutes → Good → about 2 days → about 12 days → about 1–2 months. Forget it once and it restarts with short gaps, but it remembers that you knew it before.
- **Simple steps:** the original fixed ladder (1 → 3 → 7 → 14 → 30 → 60 days). It is easier to predict but needs more reviews.
- **Switching between them** (Settings › Review) never moves a card. Each card is handed over at its next review, using its review history.
- **Review log:** every rating is saved in a log that is only ever added to, never edited. Each card's schedule can be rebuilt from it, and future features (stats, FSRS training, sync) can reuse it.

### Organising cards

- **Lesson templates:** "Lesson" (Detailed notes, Keyword summary, Flashcards) and "Lesson (large topic)" (with sub-pages). Pages with 3+ headings get **section chips** that stay pinned at the top while you scroll.
- **Card list block:** a live list of the page's cards (optionally including sub-pages). Click one to jump to it; "Review these cards" reviews exactly that list.
- **All cards:** every card in one searchable list (search ignores accents and capitals). Click a card to open its note.
- **Dates** show in your own region's style: "12 Nov" in India or the UK, "Nov 12" in the US.

### Settings

Settings has a search box and categories (General, Review, Journal, APIs). Each setting checks its value, so a bad value can't break the app.

### Quality and safety

- **Testing:** 222 automatic unit tests and 56 browser tests, including:
  - a database upgrade test, so older data keeps working
  - speed tests with 10,000 cards (All cards search ≈ 0.08 s)
  - screenshots in the Day, Night and Sepia themes and at phone size
- **Data safety:** card schedules live apart from your note text, so a schedule problem can never damage notes. Damaged schedule data restarts that card's schedule cleanly instead of breaking it.
- **Dependencies:** the FSRS library (ts-fsrs) is free (MIT licence), has no extra dependencies, and has 0 known vulnerabilities.

### Last fix before closing

A duplicated card sometimes didn't show in All cards or Review. Saving a card is two writes: the block (its text) and the card record (its schedule). They are now written together in one **transaction**, which means "both or neither", like a bank transfer that can't take money out without putting it in. Opening a page also re-creates any missing card records, which repaired the copies that were already broken.

## Phase 4 — Organisation & Connection (completed 2026-10-27)

**The big idea:** a second brain is only useful if you can find things again and see how they connect. Phase 4 adds three tools that work together: **search** (find anything), **links** (connect one note to another) and **tags** (group notes across notebooks).

### Search

- **Ctrl+K** (⌘K on Mac) opens search from anywhere, even while typing. Enter or "See all" opens the full **Search** screen.
- It finds page titles, note text, cards and blanks, journal days and templates. The Trash is only searched when you tick it.
- **Word starts match, accents and capitals don't matter.**
  _Example:_ "card valv" finds "Cardiac **valves**"; "resume" finds "résumé".
- **Filters** (with counts): notebook, tag, card status (New, Due, Learned, Suspended, Got wrong, Empty), changed date. **Sort:** Best match, Recently changed, Most failed cards. **Views:** List, Compact, Grouped.
- **"Did you mean…?"** appears only when nothing is found and suggests a real word from your notes that is 1–2 letters off.
  _Example:_ "mitrel" → "Did you mean **mitral**?"
- **Saved searches** sit in the sidebar. A saved search that finds cards is a **deck**: "Review these cards" reviews exactly those. The old "All cards" list is now simply Search with the **Cards** chip.

**How it works:** the app keeps its own **word index**, like the index at the back of a book: a list of every word and where it appears. A search looks words up in the index instead of reading every note, so it stays fast with 100,000 entries (a rare word takes about 1 ms). The index is updated in the same save as your note (one **transaction**, "both or neither"), so it can never fall behind. If the index ever needs rebuilding, that happens in small chunks in the background.

### Links

- Type **[[** (or "/ Link to page") and pick a page, or press → to link straight to one of its headings or cards.
  _Example:_ in "Heart sounds" type [[ → "Valves" → → "Mitral valve" heading.
- A link stores the page's **id** (its permanent number), not its name. Renaming or moving the page never breaks the link, and the link always shows the current title.
- **Linked from** at the end of every page lists the pages that link to it, with the sentence around each link.
- A link to a page in the Trash is crossed out and offers **Restore**. **Ctrl+Enter** opens the link next to the cursor.

### Tags

- **Page tags:** "+ Add tag" under the title. **Tags in text:** type **#** and pick one. "C#" and "#1" stay normal text, and "# " still makes a heading.
- **Levels with /:** #medicine/cardiology is "cardiology" inside "medicine". Clicking a parent tag also finds its children.
- **Cards inherit** their page's tags, so a page tagged #exam makes all its cards #exam cards. Plain notes don't inherit, so a tag search doesn't list every paragraph.
- **Tag tools** (sidebar ⋯): rename, move, merge (two tags become one), delete (removes only the tag, never the notes), colour. Tags are stored by id like links, so a rename shows everywhere at once.
  _Example:_ merge #cardoi (a typo) into #cardio, and every page, note, card and saved search switches over.

### Card tools

- **Most failed cards:** a sort that puts the cards you got wrong most often first ("Wrong 3×").
- **Empty cards:** the card status "Empty" lists cards with no question, and "Remove N empty cards" deletes them while keeping their answer lines as normal notes. Undo is offered.

### Smaller fixes

- "Delete forever" now also erases the deleted cards' schedules and review history, keeping only a tiny marker for future sync.
- "Steps for Good" is hidden while FSRS is selected, and "Target memory" is hidden under Simple steps.
- There is an optional **Shuffle** order for Practice anyway.
- Template sub-pages now show in the sidebar.

### Quality and safety

- **Testing:** 304 unit tests and 88 browser tests, including:
  - database upgrade tests (version 1 or 2 → 3)
  - speed tests: search with 100,000 entries, "Linked from" with 10,000 links, tags on 10,000 cards, merging a tag typed in 10,000 notes in a real browser, and 10,000 cards with 50,000 reviews for "Most failed"
  - screenshots in Day, Night and Sepia and at phone size
- **Security review:** no way for note text to run as code, stored searches and settings are checked before use, no secrets in the project, and 0 known vulnerabilities in the libraries. One fix: tag colours are now limited to the app's six colours, so a damaged or imported value can't inject odd styling.
- **No new libraries:** search, links and tags are all built on the existing database (₹0).

## Phase 5 (first half, 5A) — Databases (completed 2026-10-27)

### What a database is

A database is a list where every item (a **row**) has the same boxes (**columns**): text, numbers, dates, choices, tick boxes, stars, links. Every row is also a full page, so you can write notes, make cards, add tags and links inside it.
_Example:_ a **Drug list** where each drug is a row with Class, Dose and Side effects, and a page of notes behind each name.

### Where you find them

- **Each notebook's Database tab** is its **Study tracker**: one row per lesson (a top-level page; its sub-pages count towards it).
- **Databases** in the sidebar lists all of them. **+ New database** offers ready-made lists: Drug list, Vocabulary, Books, Habits, or blank.
- **/database** puts a database inside a note. Each note keeps its own view of it (its own sorting and filters).
- **All cards** in the sidebar lists every card from every notebook.

### Three views of the same rows

**Table** (edit cells like a spreadsheet; click a column header to sort, filter or hide), **Dashboard** (number tiles, bars, lines, donuts, progress bars and a calendar heatmap, no chart library) and **Board** (columns of cards; drag a card to change its column).

### The Study tracker fills itself in

Each card remembers your latest answer, so the tracker only reads cards and stays fast.

- **Status:** Not started (nothing answered) · Learning (under 75% of your latest answers right) · Review (in between) · Mastered (90%+ right, nothing due, no new cards, and 80%+ of the cards at level Mastered). You can set a status yourself (shown with 📌) and hand it back with "Auto".
- **Card levels:** New (never reviewed) · Learning (comes back within a day) · Familiar (back in 1–20 days) · Mastered (21+ days). Each lesson shows how its cards are spread over the levels.
- **Cards due:** shown as "5 due · 20 new". **% correct** and **Last revised** come from your answers.
- **Review history charts:** % correct per week, cards answered per day, and your study streak.
  _Example:_ a lesson with 10 cards, 9 answered right, 8 of them at 21+ days, nothing due and no new cards is Mastered; add one new card and it drops back to Review.

### Formulas, relations and rollups

A **Formula** column works out a value from other columns with Excel-like words (never code), e.g. "Days until exam". A **Relation** links rows of two databases; a **Rollup** summarises the linked rows (e.g. the average Confidence of a unit's lessons).

### Help while you learn the app

**Settings › Show help** (on by default) shows a short explanation when you hover over a feature (or tap its ⓘ on a touch screen), and a help line under harder features. Every text is listed in `HELP-TEXTS.md` and can be reworded.

### Backups before an upgrade

When a new version changes how your notes are stored, the app first copies everything into a backup inside the browser and offers a backup **file** you can save.

### Quality and safety

- **Testing:** 440 unit tests and 141 browser tests, including database upgrade tests (versions 1–8 → 9), speed tests (10,000 rows, 10,000 cards in 100 lessons), and screenshots in Day, Night and Sepia and at phone size.
- **Security review:** values written into cells and statuses are checked; formulas cannot run code; tips only show text from the app; 0 known vulnerabilities; no secrets. Fixes in this phase: a damaged page-parent loop can no longer hang the tracker, and a database block outside the editor no longer crashes.
- **No new libraries:** charts, formulas and drag are our own code (₹0).

## Phase 5 (second half, 5B) — More views, Revise and sharing (built 2026-10-27)

### Calendar and Gallery

- **Calendar** puts each row on the day of a Date column, as a month or a week (weeks start on Monday). The "+" on a day adds a row for that day.
- **Gallery** shows rows as tiles: a picture (from a Web link column), the title and a few chosen values.
- **+ View** adds another view of the same rows (a second Board grouped differently, say). Views can be renamed and deleted (with Undo).

### Revise

Select words in a note and press **Key point**, **Keyword**, **Must know** or **Formula** in the toolbar. The words get a colour, and the notebook's **Revise** tab gathers them per lesson, with your own summary and a button to practise the lesson's cards.
_Example:_ mark "CO = HR × SV" as a Formula; before the exam, open Revise and read every Formula of the lesson in one place.

### Sharing and backups

- **CSV:** a database's ⋯ menu has **Export as CSV** (opens in Excel or Google Sheets) and **Import CSV…** (you say what each column becomes). Imports only add rows.
- **Backup & files** (sidebar): **Save a notebook as a file** (notes, cards with their schedules and review history, databases, views), **Import a file**, and **Restore the automatic backup** the app makes before an upgrade.
- **What a file carries:** the notebook, and (two ticks, on by default) your journal days and templates. Tag colours come along; a colour is only applied to a tag that is new on the receiving side. Journal days arrive as a notebook called "Journal (imported)", templates as new templates.
- **Try it:** "Load sample notebook" adds a ready-made notebook for testing every feature.
- **Safe by design:** everything that comes in is added as new copies, so nothing you have is ever changed or replaced; files are checked first, and a file from a newer version is refused with a clear message.

### Quality and safety

- **Testing:** 468 unit tests and 156 browser tests, including speed tests (10,000-row CSV import; a notebook of 500 pages, 10,000 notes and 5,000 cards through export and import) and screenshots in the three themes and at phone size.
- **Security review:** imported files are validated (app, version, shapes, size), ids are re-made, hostile keys are dropped, picture links are limited to web addresses, CSV cells that a spreadsheet could run as formulas are protected. 0 known vulnerabilities.
- **No new libraries** (₹0).

## Phase 6 — Data safety & reach (built 2026-10-28)

### Back and Forward, and a link for every screen

The browser's Back and Forward arrows now move between the screens of the app (pages, a notebook and its tab, Search, Review, Settings, Backup & files, databases and their views), and pressing F5 keeps you on the same screen. Each screen has its own address after the `#`, for example `#/page/…`.
_Example:_ open Settings, press Back, and you are on the page you were writing.

### Page history

Every page keeps its last 30 copies (about one every 5 minutes while you write, and one when you leave the page). **History** on a page shows them; pick one, read it, and press **Restore this copy**. The page as it was before is kept too, so a restore can be undone.

### Locked files and a whole-workspace file

- **Save everything** (Backup & files) saves all notebooks, the journal, the templates and databases in one file.
- Tick **Protect this file with a password** and type the password twice. The file is locked with strong encryption (AES-256, key made from your password). **If you forget the password, the file can never be opened again — nobody can recover it.**
- A **gentle reminder** appears if no backup file was saved for a week (Save backup now · Remind me later).
- **Safer closing:** if you close the tab right after typing, the last words are kept and come back the next time you open that page.

### Anki

**Backup & files › Anki** imports a deck (a `.apkg` file, old or new format) as a new notebook (Basic notes become cards, Cloze notes become blanks) and saves a notebook's cards as an `.apkg` for Anki. Cards start as new; Anki's schedules, pictures and sounds do not come along. The extra tools load only when you use them.

### Languages

**Settings › Language**: English, हिन्दी, Español. Every text of the app is translated (the Spanish by AI, to be checked by a native speaker). The editor's own menus are Spanish in Spanish, English in Hindi. Your own notes are never translated.

### Pictures from your device

The Image block in a note can upload a picture; a Web link column cell has a 🖼 button; the Gallery shows them as tiles. Pictures are shrunk (longest side 1,600 pixels) and kept inside the app. Files and backups carry the pictures they use.

### Your own Revise labels

**Settings › Review › Revise labels**: rename or recolour Key point, Keyword, Must know, Formula, or add your own. A line can be marked from the ⠿ menu (**Mark line: …**).

### On a phone

The sidebar slides in from a ☰ button instead of squeezing the page.

### Quality and safety

- **Testing:** 560 unit tests and 184 browser tests, including upgrade tests (versions 10 → 11 → 12), speed tests (copying a 10,000-note page, a 600-note Anki deck), encryption tests (wrong password, changed file, 20 MB file) and screenshots on a phone.
- **Security review:** passwords never stored; wrong or changed files are refused before anything is written; Anki text is reduced to plain text (no markup or script can arrive); the Anki file is unpacked with a size limit; pictures are limited to PNG/JPEG/WebP/GIF (never SVG) and checked in files; addresses and saved changes from the browser are validated; label colours come from a fixed list; 0 known vulnerabilities in 3 new libraries (fflate, sql.js, fzstd).
- **Not done / known:** the export to Anki was only tested against this app's own reader, not the real Anki; deleting many notes at once is slow on huge pages; sync, accounts and hosting are Phase 7.

## Phase 7 — Cleanup and safety net (built 2026-11-01)

Your project got a tidier filing system and an automatic checker.

- **GitHub** is an online copy of the whole project with its history, kept private. If this PC failed, the code would be safe.
- **CI** is a robot on GitHub that tests every change. Example: it caught a date test that only passed with your PC's date style.
- **INDEX and HANDOFF** tell Claude where things are and what comes next, so a new chat reads a little instead of everything.
- **Feature specs** are one short page per feature: what it does, its edge cases, its security and its tests.
- **New thing learned:** a test can pass on one computer and fail on another, so a second machine finds problems you would never see on your own.

## Phase 8 — Deep research (2026-11-01)

Before building sync, we looked up how it can work at ₹0 and wrote the answers in RESEARCH.md.

- **Sync** means your notes appear on all your devices.
- **End-to-end encryption** means notes are locked on your device, so the storage company only holds unreadable data. Example: even if Supabase were hacked, the thief gets scrambled text.
- **A connector** is a small piece of code that talks to one storage company. Example: to change company later, we swap that piece, not the whole app.
- **New thing learned:** "free" can still mean a bill. A service that needs your card and has no spending stop can charge you, while one with no card simply stops when full.

- **New thing learned (audit, 2026-11-02):** All 815 tests passed while 15 bugs sat in the app, because they tested normal use, not failure. A test that breaks the database on purpose found the lost typing straight away.

- **New thing learned (batch 2e, 2026-11-04):** One rule in one place beats ten copies. Every menu in the app had its own "close when I tap outside" code, and the More menu forgot a case, so it stayed open. Now a single shared hook decides when any pop-up closes, so a new menu cannot forget. Also: a menu inside a menu (the theme list inside the ribbon) must be told who its parent is, or opening it closes the parent and the menu vanishes.

## Batch 3 — Lock and Reading mode (2026-11-05)

- **A privacy lock** hides notes behind a screen. **Encryption** scrambles them so they cannot be read at all without the key. Example: a lock on a diary stops a sibling who picks up your iPad, but not a locksmith. The app says this out loud in Settings.
- **A hash** is a one-way scramble of your PIN. The app keeps only the scramble, so even the app cannot tell you the PIN back, and "Forgot" can only clear the lock.
- **Reading mode** turns a page into something you read, not edit: calm colours, big text, the voice reading along with each word marked.
- **New thing learned (batch 3):** A test that "types fast" can lie. The wrong-code wait test only counted two tries, because the screen ignores a new try while the first one is still being checked, which takes a moment on purpose. Waiting for the field to empty between tries showed the real behaviour.
