# Custom views research (9 Nov 2026)

Question: how do leading apps let people organise notebooks, pages and study material their own way, and what should the Notebooks home offer instead of All / Starred / Recent tabs?

## What each app does

| App            | Model                                                                                                               | Manual or rules   | Lesson for us                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GoodNotes 6    | Coloured folders and sub-folders with icons; Favorites (starred documents and bookmarked pages); sort; grid or list | Manual            | People think in shelves. Favorites mixes documents and pages: one pinned list of any kind works. Users complain nested folders hide items. |
| Notability     | Subjects grouped under dividers                                                                                     | Manual, one level | Simple, but one place per note; no cross-cutting views.                                                                                    |
| Notion         | Sidebar/teamspaces; linked views of a database on any page, each with its own filters                               | Rules             | A view is a saved filter over shared data, not a copy (ours: `dbViews`).                                                                   |
| Obsidian Bases | A base holds several views (table, cards, list, map); filters for all views or this view                            | Rules             | Rules plus a layout per view, stored small.                                                                                                |
| Apple Notes    | Tags and Smart Folders: tags, created/edited date, pinned, locked and more; match all or any                        | Rules             | Smart folders reference notes, never move them. All/Any is enough logic.                                                                   |
| Anki           | Filtered decks: any search pulls cards temporarily into a deck for cramming; reschedule or not                      | Rules, cards only | Exactly the "exam: chapters 3-5 due cards" case. We already have Decks.                                                                    |
| Craft          | Spaces, folders, collections, full-text search                                                                      | Mixed             | "Collections" is a known word for a mixed pinned set.                                                                                      |
| RemNote        | Flashcards made from notes; study by scope                                                                          | Rules             | Study sets come from a scope (notebook, pages, tags).                                                                                      |
| Things 3       | Areas hold projects and to-dos                                                                                      | Manual            | One level of grouping is enough for most people.                                                                                           |

## Takeaways

1. Two kinds cover almost everything: a manual pinned set of anything (GoodNotes Favorites, Craft collections) and a saved rule (Apple smart folders, Notion linked views, Obsidian Bases, Anki filtered decks).
2. Views reference items; they never move or copy them.
3. Keep logic to All/Any plus a handful of fields. No nested folders.
4. A study set is a rule view whose items are cards, opened in Review.

## Sources

- [Goodnotes help: Folders and documents](https://goodnotes-team.notion.site/Folders-and-documents-e5b36c71891f4350a5ee4c1a199bbe92)
- [The Sweet Setup: manage notebooks in GoodNotes](https://thesweetsetup.com/how-to-manage-your-notebooks-in-goodnotes/)
- [GoodNotes feedback: better way to organise many folders](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes-apple/suggestions/43659618-a-better-way-to-organize-so-many-accumulated-folde)
- [GoodNotes 6 vs Notability](https://mynexttablet.com/goodnotes-6-vs-notability-comparison/)
- [Craft vs Notability (vendor page)](https://www.craft.do/compare/notability)
- [Apple: Tags and Smart Folders in Notes](https://support.apple.com/en-nz/102288)
- [Apple: Smart Folders in Notes on Mac](https://support.apple.com/en-gb/guide/notes/apd58edc7964/4.13/mac/27)
- [Anki manual: Filtered decks](https://docs.ankiweb.net/filtered-decks.html)
- [Anki manual: Searching](https://docs.ankiweb.net/manual/searching)
- [Obsidian help: Bases views](https://obsidian.md/help/bases/views)
- [Notion Academy: Linked views](https://Notion.com/help/notion-academy/lesson/linked-views)
- [Things 3 guide](https://culturedcode.com/things/guide/) (prior knowledge, not fetched this session)
- Not found this session: Brainscape study-set docs, Craft spaces help page.
