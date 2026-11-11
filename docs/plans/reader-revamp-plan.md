# Reader revamp plan: Read / Light study / Deep study (11 Nov 2026)

Status: research + design, waiting for owner answers. Builds on [reader-inventory-2026-11-11.md](reader-inventory-2026-11-11.md) (R01–R92), [mock-feedback-2026-11-11.md](mock-feedback-2026-11-11.md) (A2 lock modes) and [book-annotations-plan.md](book-annotations-plan.md).

## 1. What the best tools do (research)

- **Readwise → Obsidian**: every book gets its own page automatically. Each highlight carries tags, the note and a link back to the original ([Readwise docs](https://docs.readwise.io/readwise/docs/exporting-highlights/obsidian), [official plugin](https://community.obsidian.md/plugins/readwise-official)). Sync runs on open or every 1/12/24 h. Lesson: **one page per book, made for you, never hand-copied.**
- **Readwise Daily Review / Mastery**: a few old highlights resurface each day. Any of them can become Q&A or cloze cards, rated soon / later / someday (half-lives of 7 / 14 / 28 days) ([Mastery](https://help.readwise.io/article/26-how-does-the-readwise-spaced-repetition-algorithm-work), [Reviewing](https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights)). Lesson: **resurfacing is what makes highlights worth keeping.**
- **Zotero 7**: "Add note from annotations" builds a note in which every quote opens the PDF at that exact annotation ([Zotero reader docs](https://www.zotero.org/support/pdf_reader), [forum](https://forums.zotero.org/discussion/109109/zotero-7-jumping-to-the-annotation-through-link-no-longer-blink)). Users complain when some annotation types lose the link. Lesson: **every item must jump back, with no exceptions.**
- **Progressive summarisation (Tiago Forte)** works in layers: highlight, then bold the best parts, then summarise in your own words ([Forte Labs, PDFs](https://fortelabs.com/blog/progressive-summarization-with-pdfs/), [concept](https://concepts.dsebastien.net/concept/progressive-summarization/)). Lesson: **a "key" flag plus our Summary already give us layers 2–4.**
- **Zettelkasten / evergreen notes** say to write one idea per note in your own words and link ideas across sources ([Andy Matuschak](https://notes.andymatuschak.org/zAt1K9ARQYguinoHH8cfaqQ)). **MOCs** (maps of content) are hub pages that gather notes on one theme. **Dataview** queries notes like a database. Our databases + tags + backlinks already do this.
- **LiquidText / MarginNote** pull excerpts onto a canvas or mind-map that stays linked to the source. **Kindle / Apple Books** keep a flat list of highlights per book, and Kindle shows popular highlights. **Notion book trackers** use a Books DB related to a Highlights DB. **Heptabase** puts highlights on whiteboards as cards. Common pattern: **Books ↔ Highlights relation, with the highlight as the smallest unit.**

## 2. The three presets

One segmented control at the top of the reader: **Read · Study · Deep**. It is also in Aa (R17). Switching takes one tap, the bar fades over 150 ms and nothing is lost.

|                    | Read                                                               | Light study (default)                                                            | Deep study                                                                                                                   |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Bar                | Auto-hides. Tap the top edge to show title, progress, Aa, Contents | Today's bar minus the A-tagged extras                                            | Full bar + a capture counter ("12 today")                                                                                    |
| Select / highlight | Off (tap = page turn)                                              | Highlight, note, bookmark, pen, eraser                                           | Same, plus tags, colour meanings, "key" flag                                                                                 |
| Capture            | Bookmarks only                                                     | Annotations stay on the book; the book page shows the live block (existing plan) | Everything in Light, plus a row in the **Highlights DB**, a tag prompt after each highlight (skippable), chapter auto-filled |
| Lock mode (A2)     | **View only**                                                      | **Everything works**                                                             | **Everything works**                                                                                                         |
| Panels             | None                                                               | Contents, Notes                                                                  | Contents, Notes, Highlights (filter by tag/colour), Ask AI if on                                                             |

- **Relation to the lock:** a preset _sets_ a lock mode, and the padlock can still override it. Frozen and Reading mode stay padlock-only. The preset is the "what am I doing" choice and the lock is the "stop accidents" choice.
- **Per-book memory:** the last preset is stored on `Page.source` (like `at`/`progress`). New books use a global default from Settings.
- **Beginner / Professional:** Beginner sees Read and Light study. Deep study is Professional only, or one "Turn on Deep study" prompt the first time a Beginner highlights 20+ times in one book.

## 3. Auto-capture pipeline (Deep study)

**Source of truth = the `annotations` table.** It is never copied. Book note, Highlights DB and search are all _views_ of it. This is how the approved annotations plan already works (live block, no loose copies).

1. Highlight is made → an `Annotation` is saved with `anchor`, `quote` (exact/prefix/suffix), `chapter`, `colour`, `note`, `createdAt`, plus **new** `tags[]`, `key: boolean`, `locLabel` ("p. 42 · Ch 3" or "Ch 3 · 37%").
2. The **book notebook** ("Reading" notebook, one page per book, existing) shows it in the live `bookAnnotations` block, grouped by chapter.
3. **Highlights DB** = one system database, "All highlights", created on the first Deep capture. Columns: Quote, Book (relation → Books DB), Chapter, Location, Colour meaning, Tags, Note, Key, Created, Reviewed, Card, **Jump** (`#/read/<pageId>?at=<annotationId>`, with the existing glow on arrival).
   - **Rows are virtual.** The Highlights DB is a _source-backed database_: its rows are read from `annotations`, not stored as 10k extra Pages. Cells for Note/Tags/Key/Colour write straight to the annotation, so edits go both ways for free. Users can add their own columns, whose values live in a small side table keyed by annotation id. Opening a row as a page gives a full page created lazily, only if the user writes long-form notes there.
4. **Colour meanings:** the five colours get user-set names (the owner already picked "user-named colours"). Defaults: Yellow = Key idea, Green = Agree/evidence, Blue = Definition, Pink = Question, Purple = Quote to use.
5. **Dedupe:** the same book with an overlapping anchor and the same colour merges into one highlight (extended range), like Kindle. A different colour over the same text replaces the old one. Undo restores either way.
6. **Delete:** deleting in the book or in the DB removes the annotation (with Undo), and its row disappears from all views. Linked recall cards stay but lose their "jump" link (marked "source deleted"). Summary quotes become plain text with a small note. Delete forever also blanks snapshots (existing rule).
7. **Light → Deep later:** existing annotations appear in the DB at once. They are views, so there is no backfill job.

## 4. Knowledge-bank layer

- **Cross-book views** (saved DB views): by Tag, by Colour meaning, Key only, by Book (Board), Timeline. A **Theme page** (an MOC) is an ordinary page with a filtered DB view embedded plus the user's own synthesis text.
- **Backlinks:** `[[` links in a highlight note create backlinks on the target page ("Mentioned in 3 highlights"). Tags are shared with notes, so a tag page shows notes _and_ highlights.
- **Resurfacing:** the existing **Daily Highlights** draws from this DB: 5 a day, mixing Key and never-reviewed items (Readwise-style). Each item has three actions: Keep / Less often / **Make card**. The card becomes a recall card with the existing scheduler, so we do not build a second algorithm.
- **Progressive summarisation:** highlight (L1) → mark Key (L2) → **Add to Summary** (existing, L3) → own words in the book's Summary (L4).
- **Search:** highlights are already indexed. The DB adds filters (book, tag, colour, date).
- **Export:** Markdown per book (existing plan) plus CSV of the DB, plus an "Obsidian-style" folder export with a `.md` per book, front-matter tags and a link per quote.
- **Claude connector:** add read tools `list_highlights(filter)` and `get_book_highlights(book)`, plus write tools that create a _synthesis page_ (Theme/MOC) quoting highlights by id, so jump links survive. This runs on the user's own Claude, so it costs us nothing. In-app AI is still gated by owner cost approval.

## 5. Edge cases

- **EPUB reflow:** anchor = CFI + quote prefix/suffix. When the CFI fails after a font change or a new file, re-find by quote text (as in Hypothesis-style anchoring). If nothing is found, the item is marked "orphaned", never deleted. Location label = chapter + percent, not page.
- **PDF:** page + page-fraction rects (existing). Scanned PDFs have no text layer, so the item is an area capture with a snapshot image and an empty quote the user can type.
- **Offline:** everything is local (Dexie). Capture never waits for the network.
- **Sync:** per-annotation `updatedAt`, newest field wins. Tags are merged as a union. A delete is a tombstone, so a deleted highlight cannot come back from another device.
- **10k+ highlights:** index `annotations` on `[kind+createdAt]`, `tags` (multiEntry) and `pageId`. DB views page through 100 rows at a time (virtualised, rules/scalability). Counts are cached. No full scan on open. Test with a 50k fixture.
- **Book file replaced or deleted:** highlights stay. Jump says "book file missing, re-import to reopen".

## 6. New vs existing

**Existing (reuse):** annotations table and anchors, live `bookAnnotations` block, Make card, Add to Summary, bookmarks, Daily Highlights, recall scheduler, databases (relations, views, rollups), tags, links/backlinks, search, lock modes (A2, planned), Claude connector B, Markdown export.

**New:**

1. Preset control + per-book memory
2. `tags` / `key` / `locLabel` on Annotation
3. User-named colour meanings
4. Source-backed (virtual) database type for "All highlights"
5. Dedupe/merge rule
6. Quote-text re-anchoring fallback
7. Daily Highlights fed by the DB with Make-card
8. CSV/Obsidian export
9. Connector highlight tools
10. Deep-study capture counter and tag prompt

## 7. Contradictions with earlier decisions

- **C1.** In A2 the owner set **"Everything works" as the default lock**, and **Reading mode** (Kindle-like) _allows_ highlights. Under this plan, Read = View only. If the owner wants Read to allow a quick highlight, Read should map to Reading mode instead.
- **C2.** The databases rule is "every row is a page". Virtual rows break that rule for this one database, which is a new concept. The alternative (10k real Pages) doubles storage and makes two-way sync fragile.
- **C3.** The owner picked "Beginner shows everything" (annotations Q). Hiding Deep study from Beginner reverses that.
- **C4.** The annotations plan says the note page never holds copies. A "note in the book notebook" must therefore stay a live view, not a written note.
- **C5.** "Bugs only until Fri 13 Nov": building must wait. This plan is design only.

## 8. Build order (after OK)

1. Model fields + migration
2. Presets + lock mapping
3. Virtual Highlights DB + views
4. Dedupe + re-anchoring
5. Daily Highlights/cards
6. Export + connector tools
7. 50k performance test

Each step comes with unit + E2E tests.
