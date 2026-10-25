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

- **Testing:** 220 automatic unit tests and 54 browser tests, including:
  - a database upgrade test, so older data keeps working
  - speed tests with 10,000 cards (All cards search ≈ 0.08 s)
  - screenshots in the Day, Night and Sepia themes and at phone size
- **Data safety:** card schedules live apart from your note text, so a schedule problem can never damage notes. Damaged schedule data restarts that card's schedule cleanly instead of breaking it.
- **Dependencies:** the FSRS library (ts-fsrs) is free (MIT licence), has no extra dependencies, and has 0 known vulnerabilities.
