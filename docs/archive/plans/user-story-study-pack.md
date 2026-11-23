# User story: Study pack from anything I learn (draft 1, 16 Nov 2026)

Status: draft for the owner to read and change. Not planned, not built. Sources: owner messages 16 Nov, [note-questionnaire-draft.md](note-questionnaire-draft.md), the "ai TEST 1a" test, docs/IDEAS.md (16 Nov lines).

## The story

**As a learner** who watched a video (or read an article) and did not fully understand it,
**I want** to turn it into a visual study pack in one go, after a few quick questions,
**so that** I can read it like a book, recall it, and find it again later in a sorted database.

## 1. Before: five quick questions (one screen, about 30 seconds)

| Question                   | Choices (★ = default if skipped)                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What's your goal?**      | ★ **Study & remember**: visual study pack with summary, slides, recall cards and a starter mind map · **Save for later**: clean, searchable notes for your database · **Custom**: tell the AI what you want |
| **How deep should we go?** | Focus: ★ Everything · Specific part (opens a short text box). Depth: Quick · ★ Balanced · Deep (sets note detail and the number of recall cards)                                                            |
| **Save to**                | Pick a notebook or ★ + New notebook                                                                                                                                                                         |
| **Tags**                   | Tap suggested tags, pick existing ones, or add new                                                                                                                                                          |
| **Writing style**          | ★ **Simple**: everyday words · **Technical**: exact terms with tap-to-see definitions · **Custom**: describe your style                                                                                     |

- Answers are kept with the page. A **preset** (Settings) saves a set of answers so the questions can be skipped.
- Test first in Claude Code (Claude asks these in chat); later a screen in the app.

## 2. What gets made: one page per video, in a notebook database

- **Notebook** = a subject (or one per video until the owner decides; see Decisions to review, 16 Nov).
- **Notebook home** has a **Database** view of all its pages, like Notion: columns Title, Tags, Goal, Depth, Source link, Date added, Last studied, Next review, How well I know it; sort, filter, group by tag; formulas later.
- **Each video = one page** with tabs:

| Tab               | What's in it (Study & remember)                                                                                                                                                                                             | Save for later           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Notes**         | Short paragraphs, icons and pictures in the body, sections that fit one paper page each, long lists split across pages, key moments with clickable video timestamps (5 to 8, not every line), Technical terms tap-to-define | Same, plainer, no slides |
| **Summary**       | Short notes (5 to 8 lines) on top; full summary below for doubts                                                                                                                                                            | Summary only             |
| **Mind map**      | A full editable mind map made by the AI                                                                                                                                                                                     | Optional                 |
| **Slides**        | One slide per key idea, visual                                                                                                                                                                                              | Off                      |
| **Audio & video** | The source video link and any recordings                                                                                                                                                                                    | Link only                |
| **Review**        | Recall cards (count set by Depth) + **Recall mind map** (below)                                                                                                                                                             | Off by default           |

## 3. Recall mind map (in the Review tab)

- **Default: Tap to recall.** The AI's mind map with branches hidden; I try to remember, tap to check, and rate "I knew it / I forgot". Forgotten branches come back sooner, like cards.
- **Option: Build it myself** from memory; Claude judges it on request (in Claude Code; in-app AI only after the owner approves cost) and shows what I missed.

## 4. How the AI uses the app

- Gemini watches the video (sees the screen too); Claude Code turns its answer into the pack through the connector.
- The connector must learn to: switch on page tabs, fill the Summary tab, make a real mind map, add pictures and screenshots, set tags, add a database row, add clickable timestamps, and **know the paper page size** so each section and its pictures fit one page and overflow moves cleanly to the next.
- Nothing is deleted or changed without me; I can remove an AI result in one tap.

## 5. Changes from today's plan

| Area          | Today                                                                                                           | With this story                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Page tabs     | Notes · Summary · Review fixed; Mind map, Slides, Audio & video, Database optional per notebook, off by default | The goal answer switches the right tabs on for that page   |
| Summary tab   | Filled by hand or in-app AI                                                                                     | Filled by the import: short notes + full summary           |
| Review tab    | Recall cards                                                                                                    | Recall cards + Recall mind map                             |
| Notebook home | Pages list; databases exist                                                                                     | A Database view of the notebook's pages with study columns |
| Connector     | Pages, blocks, cards only                                                                                       | All of section 4                                           |
| Notes layout  | One long page                                                                                                   | Page-aware sections, more icons and pictures               |

## Open questions

See the chat of 16 Nov; answers go here.

## Owner answers, round 2 (16 Nov)

- **Four levels:** Notebook → Subject → Topic → Page. Each level opens and closes like a toggle (heading, subheading, sub-subheading).
- **Find anything (library database):** one place to search all notebooks, subjects, topics and pages. Filter by **source type** (YouTube video, article, PDF, my notes…), **date** (range), and **several tags at once** (pages that have all of them). Search inside titles and text; each result shows its path (Notebook › Subject › Topic › Page) so I can find the video again.
- **Database columns:** Title, Tags, Goal, Depth, **Source** (type + link), Due / not due (from the review schedule), plus the place in the four levels.
- **Slides:** a visual, PowerPoint-style deck made by the AI. Swipe through to understand and recall, instead of scrolling the notes.
- **How well I know it:** the app asks me (one tap) instead of guessing, because it lacks the full picture.
- **Other sources:** same five questions for articles, PDFs and my own notes.
- **No mock-ups until the limit resets on 20 Nov;** the cheapest way first.

## Owner answers, round 3 (16 Nov)

- Four levels, page may sit under a Subject without a Topic: yes. Save for later: no cards, "Make cards" button: yes. Smart source types (Tana supertags / Capacities types): yes.
- **Database views like Notion:** table, board, gallery, sort, filter, formulas, plus a **form** to add items that sort into the database by their type.
- **Notebook view like GoodNotes:** covers in a grid, with a sidebar of folders (the four levels); pages link to each other like Obsidian.
- **Recall tab like RemNote:** a whole recall area, with a visual canvas (as in the mind map) both there and in the Mind map tab.
- **Find:** not a new screen. Extend the existing search (it already has type, notebook, tag, card status, changed date and saved searches) with: source type, several tags at once (all must match), date range, and the full path on each result.

## Owner answers, round 4 (16 Nov) and what already exists

- **Form:** fills the basics on its own (title, source, tags, place); below it, an editable part to check, change or accept suggestions.
- **Already in the app (checked 16 Nov):** Library covers (books, videos, articles) with cover or list view; databases with table, board, gallery, calendar and list views, column filters and formulas; search with filters and saved searches. New in this story: covers for notebooks themselves (GoodNotes style), a form view, source-type columns, multi-tag search, the four-level sidebar.
- **Notebook covers: yes** (owner, 16 Nov), GoodNotes style. Owner idea: keep the app's own user stories as a notebook inside the app, made with these same principles.

## Owner vision and corrections, round 5 (16 Nov) — these replace earlier lines where they differ

**Why the app exists:** I learn from videos, articles, books, NotebookLM, Audible, Kindle and AI tools; I understand, make notes, then study. GoodNotes has the Pencil but not the depth; Notion has the depth but not the Pencil. This app is both: easy to recall, easy to understand, visual, interactive. The in-app AI, a connector or my own API key turns a source into a visual study pack after a few questions; I read it like a book, recall it, find it in a sorted database.

**Principles**

- **Everything the AI makes is fully editable** with the same tools the user has (like a UI builder; Photoshop-level control), in the app's premium design.
- **Accuracy first:** say what the source says; mark what was added; no invented facts.
- **AI learns from my edits:** I fix and add what it missed, tell it so, and next time it needs fewer changes.
- **Same power everywhere:** the in-app AI, the connector (Claude Code, Claude) and an API key can each use every feature of the app, not only pages, blocks and cards.

**Questionnaire changes**

- Q1 Goal: **Study and remember** · **My presets** (saved custom goals; add as many as I want) · **Custom** (type it).
- "What is important to you" and "How important is it" become **two questions** (six in all).
- Not one page per video: **as many pages as the answers need**. Tabs are switched on from the answers, never only one.
- "Fit one paper page" means each section must not spill awkwardly onto the next page; it does not limit the count of pages.
- Short notes have no fixed length; each short note can **open its detailed note** (tap to jump to the full depth) or be edited.

**Page layout:** two modes, a default in Settings: **paper pages** (GoodNotes) and **one long page** that scrolls forever (Notion), with + Add page at the top to start a new page.

## ⚠️ Before planning or building anything from this file (owner rule, 16 Nov)

Whoever plans this (Fable, Opus or any helper) first rechecks every line here against the rules already in place: CLAUDE.md, `rules/`, docs/plans/phase-plan.md, docs/design/owner-decisions.md, docs/DECISIONS.md, docs/features/ (the existing specs) and docs/design/quality-standard.md. List every contradiction as an easy question for the owner (what, why, options, pick), all at once, and fix this file from the answers before any plan is written. Known open contradictions are listed below until answered.

### Known contradictions (16 Nov, waiting for the owner)

1. In-app AI and API use vs "AI only after the owner approves the cost".
2. New scope vs "build only what the phase plan lists" and "no release until all bugs are fixed" (and "working app first", "text box & Pencil top priority").
3. "Connector can do everything" vs connector safety: no delete, big changes to the Inbox.
4. Four levels (Notebook › Subject › Topic › Page) vs today's notebooks with sub-pages and spaces.
5. Tabs chosen by the answers vs today: Notes · Summary · Review fixed, others off by default per notebook.
6. One long scrolling page vs paper pages and the BlockNote editor.
