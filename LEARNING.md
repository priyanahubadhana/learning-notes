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

## Phase 4 — Organisation & Connection (built 2026-10-26 to 27)

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
