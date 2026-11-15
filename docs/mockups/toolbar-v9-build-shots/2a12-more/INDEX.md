# 2A.12 More card, first look (chromium, after last source edit, 15 Nov 2026)

Files `more-<level>-<theme>-<size>.png`: level beginner|professional, theme light|dark, size ipad-upright|ipad-sideways|phone.
Taken by `SHOTS=1 npx playwright test e2e/toolbarV9MoreShots.spec.ts --project=chromium` with Pen then Eraser chosen (so Back to Pen shows for Professional). The study fold is opened by its test id `more-group-study`; the shot fails if it does not open.

- Beginner: the fold is "Mark for review" with Keyword, Must know, Formula, Make blank, Make card.
- Professional: the fold is "Marks and study" and adds Summary, Study now (graduation cap), All cards (library), Due today (v9's Summary, Quiz me, Flashcards, Review today).
- Both levels: the grey line "Key point sits in Text › Format › Marks." under the tiles, as in v9.
- `more-professional-light-ipad-upright-copy.png`: the Copy and paste fold open, with the Copy, Cut, Paste tiles and Copy as plain text, Copy as Markdown, Paste as plain text, Copy page with pictures.

Top row: Keyboard, Reading mode, Search, Hide the tool bar. Settings and All tools are under the Tool bar fold (closed). View, Page, Copy and paste and Tool bar folds are closed in the 12 level/theme/size pictures.
Compare: docs/mockups/toolbar-v9/toolbar-v9.html (More card, bar ends).
