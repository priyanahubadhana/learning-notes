# The Learning Notes app: the full user story

Written 16 Nov 2026 for the owner to read on a tablet. It is a draft to read and correct. It builds nothing and changes no plan.

---

## 1. Why this app exists

I learn from many places. Videos. Articles. Books. NotebookLM. Audible. Kindle. AI tools.

First I understand. Then I make notes. Then I study.

GoodNotes has the Apple Pencil, but not the depth.
Notion has the depth, but not the Pencil.

This app is both in one place.

- It is easy to understand.
- It is easy to recall.
- It is visual and interactive.
- It works like a book I can write and draw in.

The AI helps me start. The in-app AI, a connector (Claude Code or Claude), or my own API key can turn a source into a visual study pack. I answer a few quick questions first.

Then I:

- read the pack like a book,
- recall it with cards and a recall mind map,
- find it again later in a sorted database.

One sentence to remember: **GoodNotes Pencil plus Notion depth, plus a study pack that AI helps me make.**

---

## 2. Principles

### Design

- Every screen feels like a top-tier product from Apple or Google.
- Calm. Polished. Same spacing, same type, smooth motion.
- Clear hierarchy. The notes are the hero, not the buttons.
- Simple by default. The advanced options sit behind a small arrow (▾).
- The same patterns on iPad, phone and computer.
- Nothing is released below this bar.

### Quality

- Bug-free matters more than speed.
- A red test stops the work until the real cause is fixed.
- No test is ever weakened, skipped or deleted.
- Every feature must pass the "Definition of Done" (a checklist: purpose, simplicity, reliability, premium feel, safety, speed, clarity, review).
- Proof comes before "done": a test run, a screenshot, or a page checked in a browser.
- The real iPad is the truth.

### Never drop a feature

- A redesign keeps every feature.
- The simple version shows first. The advanced version stays one tap away.

### Accuracy first

- The AI says what the source says.
- Anything the AI added itself is marked "(added)".
- No invented facts, numbers, quotes or times.
- If it is not sure, it says so, and says what it could not check.

### Everything the AI makes is mine to edit

- I can change it with the same tools I have myself.
- It is like a design tool: full control, in the app's own premium look.
- Nothing is deleted or changed without me. I can remove an AI result in one tap.

### Same power everywhere

- The in-app AI, the connector and an API key can each use every feature of the app.
- Not only pages, blocks and cards.
- One shared list of actions for all three.

### The AI learns from my edits

- I fix what it missed and tell it so.
- A "my style" note keeps what I like.
- Next time it needs fewer changes.

### Privacy and security

- An account is required (Google, email code, or email and password).
- Once signed in, notes work offline.
- Synced notes are end-to-end encrypted (only I can read them). The server holds locked copies only.
- Saved files can be locked with a password.
- A privacy lock can hide a page, notebook or database from casual eyes.
- The connector can never delete anything.
- AI costs money only after the owner says yes. There are caps and a clear usage screen.
- Locked pages are never sent to AI.

### Global

- Any language. Any field of study.
- Dates and numbers follow the user's region.
- Built for millions of users.

### How we work

- One phase at a time.
- Picture first. The owner approves a picture.
- Then a plan with Fable (all questions at once).
- Then build only what the plan lists.
- Then the owner's early test on the iPad.
- Then fix and polish.
- Then release, switched on in the live app only after the owner says yes.
- New work goes to a preview first, behind on/off switches.
- The cheapest model that can do the job does it. Sonnet builds. Opus reviews. Fable plans and solves what Opus cannot.

---

## 3. How to read this

### The marks

| Mark | Meaning                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------- |
| ✅   | Built. It exists in the code. New parts are still OFF in the live app. Only the preview shows them. |
| 🔄   | Being changed. It exists, and a rebuild, fix or redesign is under way.                              |
| 🆕   | New. Agreed with the owner, not built yet.                                                          |
| ⏳   | Pending or parked idea. Noted, no date.                                                             |
| ❓   | Not sure. The files do not say clearly.                                                             |

### The three levels

- **Theme**: a big area of the journey (for example "Write and draw").
- **Epic**: one goal inside a theme (for example "Text box and Pencil").
- **Story**: one small thing a learner wants to do.

Each story has a **Done when**. It is the simple check that proves the story works.

### One more note

"Built" does not mean "live". The live app has had no new code since 12 Nov. Everything new waits for the owner's yes. Phase 1 goes live first, after the iPad re-test.

---

## 4. Story map

The journey of one learner, in order.

1. **Capture**: bring in a link, a video, an article, a book, a PDF, a photo, a voice note.
2. **Organise**: notebooks, four levels, covers, tags, databases, templates, the Journal.
3. **Write and draw**: the editor, blocks, the text box, the Pencil, paper pages, maths, pictures, media.
4. **Make with AI**: the questionnaire, the study pack, the connector, the Gemini prompt, my own key.
5. **Study**: notes, summary, slides, mind map, reading mode, the library and reader.
6. **Recall**: cards, review and scheduling, the recall mind map, Anki.
7. **Find**: search, filters, saved searches, several tags, date range, path.
8. **Keep safe**: sync, backup, export, import from Notion, NotebookLM and CSV, trash, history, lock, encryption.
9. **Settings and help**: settings, tool bar, tips, languages, shortcuts, updates.
10. **Home**: a dashboard of cards I arrange myself.

Epics, in the order of this file:

| #   | Epic                                     | Theme             |
| --- | ---------------------------------------- | ----------------- |
| 1   | Capture and sources                      | Capture           |
| 2   | Notebooks, pages and the four levels     | Organise          |
| 3   | Tags, links and templates                | Organise          |
| 4   | Databases and views                      | Organise          |
| 5   | Editor and blocks                        | Write and draw    |
| 6   | Text box and Pencil                      | Write and draw    |
| 7   | Tool bar and page menus                  | Write and draw    |
| 8   | Paper pages and long page                | Write and draw    |
| 9   | Pictures, media and things inside a page | Write and draw    |
| 10  | Start questionnaire                      | Make with AI      |
| 11  | The study pack and its tabs              | Make with AI      |
| 12  | Claude connector                         | Make with AI      |
| 13  | AI inside the app                        | Make with AI      |
| 14  | Reading and the Library                  | Study             |
| 15  | Summary, slides and mind map             | Study             |
| 16  | Recall cards and Review                  | Recall            |
| 17  | Recall mind map and Anki                 | Recall            |
| 18  | Find anything                            | Find              |
| 19  | Sync, backup and export                  | Keep safe         |
| 20  | Import from other apps                   | Keep safe         |
| 21  | Trash, history and undo                  | Keep safe         |
| 22  | Lock and encryption                      | Keep safe         |
| 23  | Settings, languages and help             | Settings and help |
| 24  | Home and daily use                       | Home              |

---

## 5. The epics

### Epic 1. Capture and sources

**As a learner, I want to bring any source into the app in one step, so that I can read it, highlight it and turn it into notes and cards.**

| Story                                                                                          | Done when                                                             | Status |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| Bring in a link, article, video or pasted text as a source page                                | The source opens as a page I can read and highlight                   | ✅     |
| Paste my AI's answer in the app's own Markdown format and get a finished page                  | The page shows key points, steps, a mind map, cards and picture slots | ✅     |
| Use a shareable Claude Skill that turns anything into the app's import file                    | I drop or paste the file and the page appears                         | ✅     |
| Paste notes turn a "## Tags" line into real page tags                                          | The page has tags with no taps                                        | ⏳     |
| Make notes from a PDF page or selection, no AI (rebuild headings, lists, tables)               | A selection becomes a tidy page                                       | ⏳     |
| Bring in a full "knowledge pack" zip (15-part prompt: notes, cards, mind maps, glossary, quiz) | The zip imports                                                       | ⏳     |
| Keep a camera photo on the page                                                                | A photo sits on the page                                              | ✅     |
| Record my voice with a note and play it back                                                   | The recording plays from the left list                                | ✅     |
| Mic in the text box: speech to text, or record audio                                           | I choose type-my-words or record                                      | ⏳     |
| Connect Kindle, Apple Books, Google Play Books, Audible                                        | A book from there appears                                             | ⏳     |

### Epic 2. Notebooks, pages and the four levels

**As a learner, I want my notes in a clear tree, so that I can open, close and find any part quickly.**

| Story                                                                                                           | Done when                                        | Status |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------ |
| Notebooks hold pages, and pages nest under pages                                                                | I can nest and move pages                        | ✅     |
| One notebook screen: find a notebook, see its pages, outline and resources, set it up (Notebooks and Search v2) | One screen shows all of it                       | 🔄     |
| Four levels: Notebook › Subject › Topic › Page, each opening and closing like a toggle                          | The tree opens and closes at every level         | 🆕     |
| A page may sit directly under a Subject, with no Topic                                                          | I can add such a page                            | 🆕     |
| Notebook covers in a grid, GoodNotes style                                                                      | I see covers, and pick or change one             | 🆕     |
| A sidebar of folders for the four levels                                                                        | The sidebar matches the four levels              | 🆕     |
| Notebook views: shelf of covers, section tabs, gallery, table, board                                            | I can switch the view                            | ✅     |
| Ready-made notebook kits (Finance tracker, Memory techniques, Study kit) add and remove cleanly                 | The kit appears and disappears with no leftovers | ✅     |
| The Journal: one page per day, under month pages                                                                | Today's page opens in one tap                    | ✅     |
| Merge the two "November 2026" Journal pages with nothing lost                                                   | One page remains, backup first                   | 🔄     |
| Four spaces (Home, Library, Notebooks, Review) with a slim strip to switch                                      | Tapping a space shows its own sidebar            | ✅     |
| Every screen has an address, so Back, Forward and refresh return to the same place                              | Refresh keeps me where I was                     | ✅     |
| Page tabs: Notes, Summary, Review always; Mind map, Slides, Audio and video, Database optional per notebook     | Optional tabs switch on per notebook             | ✅     |
| The goal answer switches the right tabs on for that page                                                        | The tabs match my questionnaire                  | 🆕     |
| Choose which tabs a new notebook gets (custom tab templates)                                                    | New notebooks start with my tabs                 | ⏳     |
| Move a page to another notebook and its cards follow                                                            | Cards still match the page                       | ❓     |

Why ❓ on the last row: the idea list says no "move to another notebook" existed when written, and no later file says it was added.

### Epic 3. Tags, links and templates

**As a learner, I want to label and link my notes, so that they stay connected and easy to sort.**

| Story                                                                                  | Done when                                                 | Status |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| Label pages and text with tags, including nested ones like medicine/cardio             | The tag shows in the tag list                             | ✅     |
| Merge, rename and delete a tag                                                         | All notes follow                                          | ✅     |
| Link notes with "[[", and see "Linked from" on the target (like Obsidian)              | The picker opens and the link works                       | ✅     |
| Hover previews of linked pages                                                         | Hovering a link shows a small preview                     | ⏳     |
| Unlinked mentions: list pages that mention a title without a link, with a one-tap Link | The mention gets a Link button                            | ⏳     |
| Reusable templates: a template copies into a new page                                  | The new page is a copy                                    | ✅     |
| New page opens blank, with "Study (Recommended)" under the cursor                      | One tap fills a study page                                | ✅     |
| Smart source types (like Tana supertags): a type brings its own fields                 | A "YouTube video" type adds source, depth and goal fields | 🆕     |
| Drag a tag onto another to move or merge it                                            | The tags merge                                            | ⏳     |

### Epic 4. Databases and views

**As a learner, I want lists of things in a database, so that I can sort, filter and see them in the way that suits me.**

| Story                                                                                                                                         | Done when                                        | Status |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------ |
| A database is a page with columns; every row is a full page                                                                                   | A row can hold notes, cards and links            | ✅     |
| Views: Table, Board, Calendar, Gallery, List, Dashboard                                                                                       | Each view keeps its own sorts and filters        | ✅     |
| Column filters and formulas                                                                                                                   | A formula column shows a result                  | ✅     |
| Charts: numbers, bars, lines, donuts, progress, heatmap                                                                                       | The dashboard draws from the rows                | ✅     |
| A database sits inside a note as a block                                                                                                      | I can place one in a page                        | ✅     |
| Notebook home shows a Database view of its pages: Title, Tags, Goal, Depth, Source, Date added, Last studied, Next review, How well I know it | Sort, filter and group by tag work               | 🆕     |
| A form view adds items; it fills the basics (title, source, tags, place) and I check or change below                                          | The new item sorts into the database by its type | 🆕     |
| "How well I know it": the app asks me with one tap                                                                                            | The answer saves with one tap                    | 🆕     |
| Study tracker: one database per notebook showing how well each lesson is learnt                                                               | The lessons show a level from their cards        | ✅     |
| Table: arrow-key moves, drag columns, several sorts, row menu                                                                                 | Each works from the keyboard                     | ⏳     |
| Search inside database cell values                                                                                                            | A cell word finds the row                        | ⏳     |
| Databases and views as movable blocks, Notion style                                                                                           | I can place and nest a view                      | ⏳     |
| Import and export a database as CSV                                                                                                           | The file opens in a spreadsheet                  | ✅     |

### Epic 5. Editor and blocks

**As a learner, I want one editor with many kinds of blocks, so that every note can be as rich as I need.**

| Story                                                                                  | Done when                            | Status |
| -------------------------------------------------------------------------------------- | ------------------------------------ | ------ |
| The editor shows a page as blocks and saves every edit by itself                       | I close the app and nothing is lost  | ✅     |
| Type "/" to add a block                                                                | The menu lists blocks                | ✅     |
| Toggle list, table, file, camera and callout blocks                                    | Each can be inserted                 | ✅     |
| Maths: fractions, powers, roots, sums, Greek letters, with LaTeX for those who know it | A formula shows on the page          | ✅     |
| Copy and paste keeps the look; paste without formatting                                | Both paste ways work                 | ✅     |
| Long-press or right-click shows a small strip: Cut, Copy, Paste, Delete, more          | The strip appears                    | ✅     |
| Keyboard shortcuts for PC, Mac and iPad keyboards                                      | Common actions have shortcuts        | ✅     |
| Checklist block saves without "Not saved yet"                                          | The checklist saves and does not lag | 🔄     |

### Epic 6. Text box and Pencil

**As a learner, I want a text box and the Apple Pencil to feel like GoodNotes, so that writing and typing sit together on one page.**

This is the top priority.

| Story                                                                    | Done when                                            | Status |
| ------------------------------------------------------------------------ | ---------------------------------------------------- | ------ |
| A tap on empty paper makes a text box with the cursor inside             | The box appears and I can type                       | 🔄     |
| Box states like GoodNotes: select, edit, move, resize                    | Each state looks and behaves as the approved picture | 🔄     |
| Write and draw by hand with Pencil, finger or mouse, on any page         | Strokes stay on the page                             | ✅     |
| Each box has its own ink, linked to its lines                            | A moved box takes its ink along                      | ✅     |
| Eraser removes part of a shape cleanly                                   | Erasing keeps the rest of the shape                  | 🔄     |
| Scribble: write with the Pencil and get typed text                       | Scribble over a word does not delete the wrong word  | 🔄     |
| Select symbols (arrows, commas, circled numbers) by double or triple tap | The symbol is selected                               | 🔄     |
| Lasso: select ink and boxes                                              | A lasso moves what it covers                         | ✅     |
| Write pad: write in a big pad and the words land as typed text           | Words appear in the note                             | ✅     |
| Undo and Redo, one history per page, in order                            | Undo undoes the last change of any kind              | ✅     |
| Undo and Redo move to the page top bar                                   | The buttons sit in the top bar                       | 🔄     |
| One redo step (the "50 random steps" test is red on iPad)                | The test passes                                      | 🔄     |
| Tap beside a box makes a new box side by side                            | A tap makes it next to the first                     | ⏳     |
| Layers, rotation, shrink a box to scale its text                         | Not decided                                          | ⏳     |
| Guard a palm resting on the page scroll bar                              | The palm does not scroll                             | ⏳     |

### Epic 7. Tool bar and page menus

**As a learner, I want a calm tool bar, so that I can pick Text, Pen, Eraser, Shapes, Lasso and Insert without thinking.**

| Story                                                                            | Done when                                 | Status |
| -------------------------------------------------------------------------------- | ----------------------------------------- | ------ |
| Tap a tool to use it; tap again to open one small card of options                | The card opens and closes                 | ✅     |
| One row of options and my Favourites                                             | Favourites show under the tools           | ✅     |
| Tool bar rebuilt to the approved v9 picture                                      | The look matches the picture side by side | 🔄     |
| Edit tool bar: hold, drag, Done                                                  | The ⋯ menu offers Edit tool bar           | 🔄     |
| Tool bar hides while writing, with a Show toolbar pill                           | The pill brings it back                   | ✅     |
| Page options in one panel from the right, with folded groups and "Pin an action" | The panel opens below the top bar         | ✅     |
| Pin any action into Page options                                                 | A "+ Add" pins any action                 | ⏳     |
| Up to three tool bars (Your layouts) and saved setups                            | Switch with one tap                       | ⏳     |
| "Back after one" is not cut off on the eraser bar                                | The full name shows, or an icon on hold   | 🔄     |
| Six colours per tool, with a Pro unlock beyond                                   | Not planned                               | ⏳     |
| Search every feature and pin any tool to the short bar                           | The Features group lists all tools        | ✅     |
| Command palette (Ctrl+K) and editable shortcuts for Professional                 | The palette opens                         | ✅     |
| A device mode (Computer, Touch, Pencil) sets button size and hints               | The bar changes by device                 | ✅     |

### Epic 8. Paper pages and long page

**As a learner, I want my page to be paper or one endless page, so that I can choose the way I like to write.**

| Story                                                                               | Done when                                 | Status |
| ----------------------------------------------------------------------------------- | ----------------------------------------- | ------ |
| Every page shows as fixed sheets (A4 or Letter) with blank, lined, grid or dots     | The sheets stack as I write               | ✅     |
| Zoom from fit width up to 400 percent, and pan                                      | Pinch and Ctrl-wheel work                 | ✅     |
| Two page modes with a default in Settings: paper pages or one long page             | I can pick either                         | 🆕     |
| In long-page mode, "+ Add page" at the top starts a new page                        | A new page starts                         | 🆕     |
| A section must not spill awkwardly onto the next paper page                         | Sections and their pictures stay together | 🆕     |
| Notes know the paper page size, split long lists, and push a block to the next page | A list of 8 splits into 2 pages of 4      | 🆕     |
| Phone dots near the page end are correct                                            | The dots do not overlap                   | 🔄     |
| Page scroll bar and zoom pill                                                       | They show and work                        | ✅     |

### Epic 9. Pictures, media and things inside a page

**As a learner, I want pictures, PDFs, audio, video and tables on my page, so that my notes can hold the whole picture.**

| Story                                                                           | Done when                        | Status |
| ------------------------------------------------------------------------------- | -------------------------------- | ------ |
| Add pictures from the device into notes and cells                               | The picture stays inside the app | ✅     |
| Place, crop and rotate pictures                                                 | Each works                       | ❓     |
| Embed a YouTube video next to the notes, with timestamps and pasted screenshots | A timestamp seeks the video      | ✅     |
| Any other web address becomes a link card                                       | The card shows                   | ✅     |
| PDF tools: scan, combine, make searchable, export                               | Each tool runs                   | ❓     |
| A mind map, a maths formula and a database as blocks in one page                | Each can be inserted             | ✅     |
| Pictures in recall cards, and video in cards by link                            | A card shows a picture           | ⏳     |
| Clean up unused pictures and show space used                                    | The list shows                   | ⏳     |

Why ❓ on pictures and PDF tools: they are in the Phase 9 spec, and Phase 9 still needs its approved picture. The files do not say how much is built.

### Epic 10. Start questionnaire

**As a learner, I want to answer a few quick questions before notes are made, so that the pack fits my goal.**

Six questions on one screen, about 30 seconds. Test first in Claude Code (Claude asks in chat). Later a screen in the app.

| Story                                                                                     | Done when                                                     | Status |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| Question 1, Goal: Study and remember (default) · My presets · Custom                      | I can pick one; presets are my saved goals, as many as I want | 🆕     |
| Study and remember makes a visual pack: summary, slides, recall cards, a starter mind map | The pack has all four                                         | 🆕     |
| Save for later makes clean, searchable notes, no cards, with a "Make cards" button        | No cards at first; the button makes them                      | 🆕     |
| Question 2, what matters to me (everything, or a part I type)                             | The AI follows my focus                                       | 🆕     |
| Question 3, how important: Must master · Important · Nice to know                         | The level sets note depth and the number of cards             | 🆕     |
| Question 4, Save to: a notebook or a new one                                              | The pack lands in that notebook                               | 🆕     |
| Question 5, Tags: suggested, existing or new                                              | The tags are set                                              | 🆕     |
| Question 6, Writing style: Simple · Technical (tap a term to see its meaning) · Custom    | The style shows in the notes                                  | 🆕     |
| My answers are kept with the page                                                         | I can open the page and see them                              | 🆕     |
| A preset saves a set of answers so the questions can be skipped                           | One tap runs the preset                                       | 🆕     |
| The same questions for articles, PDFs and my own notes                                    | Each source type asks them                                    | 🆕     |
| The AI learns from my edits with a "my style" note                                        | A second pack needs fewer edits                               | 🆕     |

### Epic 11. The study pack and its tabs

**As a learner, I want one pack with notes, summary, slides, mind map and cards, so that I can read it like a book and recall it.**

| Story                                                                                                     | Done when                                | Status |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ |
| As many pages as the answers need (not one page per video)                                                | The count follows my answers             | 🆕     |
| Tabs are switched on from the answers, never only one                                                     | The right tabs show                      | 🆕     |
| Notes tab: short paragraphs, icons and pictures in the body, 5 to 8 key moments with clickable timestamps | Timestamps open the video at that moment | 🆕     |
| Technical terms tap to show a meaning                                                                     | A tap shows a definition                 | 🆕     |
| Short notes with no fixed length; each one opens its detailed note, or can be edited                      | A tap jumps to the detail                | 🆕     |
| Summary tab: short notes on top, full summary below                                                       | Both show                                | 🆕     |
| Mind map tab: a full editable mind map made by the AI                                                     | I can edit it                            | 🆕     |
| Slides tab: one visual slide per key idea, swipe through                                                  | Swipe moves between slides               | 🆕     |
| Audio and video tab: the source link and recordings                                                       | The link opens                           | 🆕     |
| Review tab: recall cards plus the recall mind map                                                         | Both show                                | 🆕     |
| Every claim is from the source or marked "(added)"; the AI ends with "what I could not see or check"      | Both show in the pack                    | 🆕     |
| The Gemini prompt (v3) watches a video with frames and gives answers in the app's markers                 | The answer imports as a pack             | 🔄     |
| Keep each Gemini answer and its frames, to rebuild test notebooks later                                   | The files are saved                      | ⏳     |

### Epic 12. Claude connector

**As a learner, I want Claude to read and write in my notebooks, so that I do not copy and paste.**

| Story                                                                         | Done when                     | Status |
| ----------------------------------------------------------------------------- | ----------------------------- | ------ |
| Claude Desktop reads my notes ("what did I write about mitochondria?")        | The answer cites my notes     | ✅     |
| Claude adds new notebooks, pages, text at the end of a page, and recall cards | The new items appear          | ✅     |
| Claude never deletes and never edits existing text                            | The connector has no delete   | ✅     |
| Quiz me on my due cards                                                       | Claude lists the due cards    | ✅     |
| A device can be revoked                                                       | The revoked device is refused | ✅     |
| Online connector (B) with job tools on Supabase                               | Claude writes without my PC   | ⏳     |
| Connector can write toggles and text colours                                  | They appear in the page       | 🆕     |
| Connector can add pictures and screenshots                                    | They appear in the page       | 🆕     |
| Connector can make a mind map block                                           | The map appears               | 🆕     |
| Connector can create a database and rows                                      | The database appears          | 🆕     |
| Connector can set page tags and switch on page tabs                           | Tags and tabs show            | 🆕     |
| Connector can fill the Summary tab                                            | The tab holds the text        | 🆕     |
| Connector can set notebook covers and the four levels                         | Covers and levels show        | 🆕     |
| Connector adds clickable video timestamps                                     | A tap seeks the video         | 🆕     |
| Connector knows the paper page size                                           | Sections fit a page           | 🆕     |
| One shared action list for the connector, in-app AI and API keys              | All three can do the same     | 🆕     |
| Big AI changes go to an Inbox I check                                         | Nothing big lands unchecked   | ❓     |

Why ❓ on the last row: "connector can do everything" meets "big changes go to the Inbox" (see section 7).

### Epic 13. AI inside the app

**As a learner, I want AI help in the app with my own key, so that I stay in control of cost and privacy.**

| Story                                                                            | Done when                                         | Status |
| -------------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| Add my own AI keys, each named, masked, with a monthly cap                       | The key shows masked and Test passes              | ✅     |
| AI is off by default, and off per notebook                                       | A notebook needs its own Allow AI                 | ✅     |
| See what AI sent: date, notebook, feature and cost                               | The list shows                                    | ✅     |
| Usage and cost screen with CSV export                                            | The screen shows spend by key, model and notebook | ✅     |
| Ask this book: questions about a chapter or pages, with "Show what will be sent" | The answer streams                                | ✅     |
| Story so far: a recap up to where I stopped, nothing after                       | No spoilers                                       | ✅     |
| AI framework: a checked plan runs as one job, one Undo takes it back             | The job undoes in one tap                         | 🔄     |
| The Build screen runs a plan with content I paste                                | The plan runs                                     | ✅     |
| Prompt library and saved "skills" that turn one input into a study set           | A skill runs from my key or by paste              | ✅     |
| No AI spending until the owner says yes                                          | A cost approval is needed                         | ✅     |
| A named AI assistant in the tool bar                                             | Not decided                                       | ⏳     |
| AI learning companion that watches and listens while I learn                     | Not decided                                       | ⏳     |
| AI that auto-organises notes                                                     | Not decided                                       | ⏳     |
| A local server so a desktop AI app can read and write notebooks                  | Not decided                                       | ⏳     |

### Epic 14. Reading and the Library

**As a learner, I want to read books and sources calmly, so that I can highlight and keep what matters.**

| Story                                                                                | Done when                          | Status |
| ------------------------------------------------------------------------------------ | ---------------------------------- | ------ |
| The Library shows books, videos, articles and pasted texts as covers or a list       | Both modes show                    | 🔄     |
| Open a PDF or EPUB in a reader with highlights, notes, bookmarks and Contents        | Highlights land on the page        | 🔄     |
| Reader v2: new approved look, nothing removed                                        | It matches the approved picture    | 🔄     |
| Reading mode: themes, fonts, size, spacing, full screen, read aloud, where I stopped | A page reads like a book           | ✅     |
| Reading goals and a streak                                                           | Not planned                        | ⏳     |
| Daily highlight resurfacing and a highlights review                                  | A few old highlights show each day | ⏳     |
| Offline dictionary and translation of a tapped word                                  | A tap gives a meaning offline      | ⏳     |
| Reader presets (Read, Light study, Deep study)                                       | One tap sets them                  | ⏳     |
| A cross-book Highlights database                                                     | All highlights in one table        | ⏳     |
| Library as a sorted database of everything I learned                                 | I sort by source type, tag, date   | 🆕     |

### Epic 15. Summary, slides and mind map

**As a learner, I want three levels of the same material, so that I can skim, read or go deep.**

| Story                                                                                     | Done when                | Status |
| ----------------------------------------------------------------------------------------- | ------------------------ | ------ |
| Summary, Notes and Review as three views of one material, at page, notebook and app level | Nothing is copied        | ✅     |
| Revise: a revision sheet from words marked Key point, Keyword, Must know or Formula       | The sheet lists them     | ✅     |
| A mind map block I can type, rearrange and keep                                           | It is editable           | ✅     |
| Slides: a PowerPoint-style deck made by AI                                                | I swipe through          | 🆕     |
| Slide deck viewer and .pptx export                                                        | A deck opens and exports | ⏳     |
| NotebookLM-style studio: ask with citations, study guide, quiz, data table                | Not decided              | ⏳     |
| Study modes: summary layers, theme pages, quiz and teach-back                             | Not decided              | ⏳     |

### Epic 16. Recall cards and Review

**As a learner, I want cards and a calm review, so that I remember what I learned.**

| Story                                                                  | Done when                       | Status |
| ---------------------------------------------------------------------- | ------------------------------- | ------ |
| A Card block: a question with its answer inside                        | The card shows on a page        | ✅     |
| Make blanks from selected words, one card per blank                    | Each blank is one card          | ✅     |
| Eight card types in one editor                                         | Each type works                 | ✅     |
| Rate each card (Again, Hard, Good, Easy) and decide when it comes back | The next due date changes       | ✅     |
| Review v2: a calm study screen and a More sheet                        | It matches the approved picture | 🔄     |
| Cards table view, bulk actions, tags on cards                          | The table lists cards           | ✅     |
| Stats, streaks, a heatmap                                              | The dashboard shows them        | ✅     |
| Decks                                                                  | A deck filters the cards        | ✅     |
| Tune the schedule to my own history (FSRS)                             | Not planned                     | ⏳     |
| Review cap that also counts short repeats                              | Not decided                     | ⏳     |
| Suspended cards in a Paused list                                       | A list shows them               | ⏳     |
| Recall area like RemNote: a whole recall area, with a visual canvas    | One place for recall            | 🆕     |
| Number of cards follows Depth in the questionnaire                     | The numbers match               | 🆕     |

### Epic 17. Recall mind map and Anki

**As a learner, I want to recall a mind map from memory, so that I see what I forgot.**

| Story                                                                                       | Done when                           | Status |
| ------------------------------------------------------------------------------------------- | ----------------------------------- | ------ |
| Tap to recall: branches are hidden; I try, tap to check, and rate "I knew it" or "I forgot" | Forgotten branches come back sooner | 🆕     |
| The rating lives in the Review tab                                                          | The tab shows the recall map        | 🆕     |
| Build it myself from memory; Claude judges it on request and shows what I missed            | Claude lists the gaps               | 🆕     |
| In-app AI judge only after the owner approves the cost                                      | Cost approval is asked              | 🆕     |
| Anki: import .apkg into a new notebook                                                      | The cards appear                    | ✅     |
| Anki: save a notebook's cards as a package                                                  | Anki opens it                       | ✅     |
| Anki: import schedules, tags and pictures                                                   | They carry over                     | ⏳     |

### Epic 18. Find anything

**As a learner, I want one search for everything, so that I can find a video or note again.**

| Story                                                                                 | Done when                     | Status |
| ------------------------------------------------------------------------------------- | ----------------------------- | ------ |
| One box finds pages, notes, cards, books, highlights, tasks and features              | Results group by type         | ✅     |
| Filters: type, notebook, tag, card status, changed date                               | Filters narrow results        | ✅     |
| Saved searches, with counts                                                           | A saved search reopens        | ✅     |
| Search pop-up with ✕ to clear and ✕ to close                                          | The ✕ buttons work            | ✅     |
| Filter by source type (YouTube video, article, PDF, my notes)                         | Only that type shows          | 🆕     |
| Several tags at once; all must match                                                  | Only pages with all tags show | 🆕     |
| Date range filter                                                                     | Only that range shows         | 🆕     |
| Each result shows its path: Notebook › Subject › Topic › Page                         | The path shows                | 🆕     |
| Database columns: Title, Tags, Goal, Depth, Source, Due, and place in the four levels | The columns show              | 🆕     |
| Typo-tolerant search and "Did you mean"                                               | "mitrel" finds mitral         | ⏳     |
| Chinese and Japanese compound words match part of a word                              | A part finds the word         | ⏳     |
| Reorder saved searches by dragging                                                    | The order saves               | ⏳     |

### Epic 19. Sync, backup and export

**As a learner, I want my notes on my iPad and PC, and a copy I can keep, so that nothing is ever lost.**

| Story                                                                      | Done when                                       | Status |
| -------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| Sync between iPad and PC, end-to-end encrypted                             | A note on one shows on the other                | ✅     |
| A recovery code and a passphrase                                           | The code is shown and checked                   | ✅     |
| Two devices change the same thing: both versions are kept                  | The loser is kept as a clash                    | ✅     |
| Pictures and books sync through my Drive folder                            | The files arrive                                | ✅     |
| Installable app that opens with no internet                                | It opens offline                                | ✅     |
| The app tells me how safe the notes on this device are                     | A status shows                                  | ✅     |
| Full backup and restore; one-notebook files; safety copy before an upgrade | Restore brings it all back                      | ✅     |
| Export a page or notebook as PDF, Word, Markdown or text; share sheet      | The file opens                                  | ✅     |
| Must-have update flow: only must-have updates take over the screen         | The screen counts down and ends back in the app | 🔄     |
| Backup in a private place off this computer                                | Not decided                                     | ⏳     |
| Wrong device clocks handled                                                | Not yet                                         | ⏳     |

### Epic 20. Import from other apps

**As a learner, I want to bring my old notes in, so that I do not start from zero.**

| Story                                                            | Done when                  | Status |
| ---------------------------------------------------------------- | -------------------------- | ------ |
| Import a Notion export (workspace or database), free, no account | Pages arrive               | ✅     |
| Bring in what NotebookLM made, by file or paste                  | The notes appear           | ✅     |
| Import and export CSV                                            | The rows arrive            | ✅     |
| Import a ready-made notebook file                                | The notebook opens         | ✅     |
| CSV: skip duplicates, ask for date order                         | The duplicates are skipped | ⏳     |
| Publish a database so others can use it                          | Needs hosting and accounts | ⏳     |

### Epic 21. Trash, history and undo

**As a learner, I want to get back anything I did by mistake, so that I never fear losing work.**

| Story                                                        | Done when                | Status |
| ------------------------------------------------------------ | ------------------------ | ------ |
| One Trash for everything, emptied after 30 days (changeable) | Restore returns the item | ✅     |
| Page history: earlier copies by day                          | I can bring one back     | ✅     |
| One Undo takes back a whole AI job                           | Undo restores all        | ✅     |
| History: a drawn preview and compare with the current page   | The preview shows        | ⏳     |

### Epic 22. Lock and encryption

**As a learner, I want my private notes to stay private, so that a borrowed iPad shows nothing.**

| Story                                                            | Done when                    | Status |
| ---------------------------------------------------------------- | ---------------------------- | ------ |
| Privacy lock on a page, notebook or database                     | The lock screen shows        | ✅     |
| New PINs have 6 digits; guesses get slower                       | A wrong PIN waits longer     | ✅     |
| Lock passwords at least 8 letters                                | A short one is refused       | ✅     |
| A password protects a saved file                                 | The file needs the password  | ✅     |
| Real encryption of locked items and a recovery code for the lock | The locked item is scrambled | ⏳     |
| Wrong password shows a red message and a warning icon            | The message shows            | ⏳     |

### Epic 23. Settings, languages and help

**As a learner, I want one calm Settings, so that I can change what I like and find it again.**

| Story                                                                                      | Done when                       | Status |
| ------------------------------------------------------------------------------------------ | ------------------------------- | ------ |
| Search any setting; each row has a tiny preview                                            | The search finds every switch   | ✅     |
| Settings v5: starters, groups with Advanced, search that changes in place, per-device tags | It matches the approved picture | 🔄     |
| Turn on one Professional feature without leaving Beginner                                  | A single feature unlocks        | ✅     |
| Test a phase: one tap turns a phase on and off                                             | The preset toggles              | ✅     |
| Show the app in my language; dates and numbers by region                                   | The language changes            | ✅     |
| Spanish and Hindi checked by a native speaker                                              | A speaker reviews               | ⏳     |
| Hover tips and short help, which I can switch off                                          | Tips show and hide              | ✅     |
| Settings tour, previews and a welcome on first launch                                      | The tour runs                   | ⏳     |
| Saved setups, share a setup as a file, a file for experts                                  | Switch with one tap             | ⏳     |
| Voice replies (voice mode)                                                                 | It runs again                   | ⏳     |
| The app suggests ("add the Highlighter?") but never moves things alone                     | A quiet suggestion              | ⏳     |
| Toasts stack to three with Undo; a small ✕ on every notice                                 | The ✕ closes                    | 🔄     |

### Epic 24. Home and daily use

**As a learner, I want a home I build myself, so that my day starts in one place.**

| Story                                                                             | Done when                    | Status |
| --------------------------------------------------------------------------------- | ---------------------------- | ------ |
| Home as a page of cards I move, resize, add and delete                            | Edit mode works              | 🔄     |
| Cards: Top 3, Tasks, Pending, Timer, Daily Highlight and more                     | Each card works              | 🔄     |
| Briefing, tasks, matrix, Pomodoro, routines, habits, affirmations, evening review | Each works                   | ✅     |
| Calendar with Day, Week and Month                                                 | Day is a full-page card      | ✅     |
| Calendar Year view                                                                | The year shows               | ⏳     |
| Favourites list in the sidebar                                                    | The list shows               | ⏳     |
| Phone and tablet layouts for the whole app                                        | The sidebar becomes a drawer | ⏳     |

Why the 🔄 on Home: the Home v2 build is merged but waits for its side-by-side check and the owner's first look.

---

## 6. Everything pending, by category

### Bugs and open problems

- BUG-001: the checklist block shows "Not saved yet" and lags. Cannot be reproduced yet.
- BUG-002: the format bar leaves the screen. Test added; the owner's iPad check waits.
- BUG-004: must-have update flow. Built, off in live; the owner's check waits.
- BUG-005: Settings previews, tour and welcome. Not built.
- F7: the screen sometimes freezes. Cause unknown; a recorder runs on the preview.
- C2: the eraser removes or bends a whole shape.
- C3: "Back after one" is cut off on the eraser bar.
- C4: scribble deletes the wrong word and leaves grey ink.
- C5: symbols are hard to select.
- C6: "Edit tool bar" is missing in the ⋯ menu.
- R15: one redo step; "50 random steps" fails on iPad about 1 run in 5.
- R18: phone dots near the page end.
- R20: Journal month rename by double-tap fails in iPad tests.
- T25: Scribble space after "/".
- T26: write over a selected word.
- T3: three iPad tests fail on this PC every time.
- Seven desktop-only shell tests fail on the iPad test set.
- PP1 and S1: the Settings Preview pill covers a control; the preview picture is too loud.
- RD: reader problems (sidebar covers the ✕, blurry top bar, bars hide on their own).
- The owner's rule: no release until all bugs are fixed and tested.

### Connector

- Write toggles, text colours, pictures, mind maps, databases, tags, tabs, covers and the four levels.
- Clickable timestamps and the paper page size.
- One shared action list for the connector, in-app AI and API keys.
- The online connector needs job tools on Supabase (needs the owner's OK).
- Keep every Gemini answer and its frames to rebuild test notebooks later.
- Plan before building.
- Test the Gemini prompt v3.

### AI

- The questionnaire and presets.
- "My style" note, so the AI learns from my edits.
- The in-app AI judge for the recall mind map, only after the owner approves cost.
- Auto-tags on import.
- Make notes from a PDF without AI.
- The "knowledge pack" zip.
- AI learning companion, a named assistant, auto-organise, a local server for desktop AI apps.
- Premium AI voice and full hands-free voice.
- AI agents that write notes and notebooks from speech.
- Make the app's own user stories as a notebook in the app (after the 20 Nov limit reset, through the connector, without using the owner's API credit).

### Organise

- Four levels, covers, folders sidebar, smart source types.
- Database view of a notebook's pages, a form, "how well I know it".
- Two page modes and "+ Add page".
- Merge the two "November 2026" Journal pages.
- Custom tab templates.
- Favourites list in the sidebar.

### Study and recall

- Short notes that open the detailed note.
- Slides.
- Recall mind map, tap to recall and self-rating.
- A RemNote-style recall area.
- "Save for later" with a "Make cards" button.
- Reader extras: summarise, daily highlights, offline dictionary, goals.
- FSRS tuned to my own history.
- Pictures and video in cards.

### Design and polish

- Phase 2A: the tool bar rebuilt to v9, with the owner's fixes.
- Phase 2B: the text box and Pencil finished.
- Phase 1S: Settings v5.
- Your layouts (three tool bars) and saved setups.
- Scroll bar: a calmer look, and fades when idle.
- Phases 9 and 10 need their pictures.
- Review v2, Reader v2, Library v2, Home v2 and Study tabs wait for the side-by-side check with their pictures and the owner's first look.
- Toast ✕, tooltips with pictures.

### Later ideas

- Share a page (needs collaboration, a "no" for now).
- Year view in the Calendar.
- Publish a database to a public library.
- Backup in a private place off the computer.
- Kindle, Apple Books, Audible, Google Play Books.
- Speechify-style reading from a photo.
- Mic in the text box.
- Chemistry and inline maths formulas.
- Variable fonts.
- Drag a tag to merge.
- Typo-tolerant search.
- Pencil double-tap to switch to typing (waits for the write-pad design).
- Pin or hide menu items.

---

## 7. Open questions and contradictions

The owner's rule: before anything here is planned, every line is rechecked against the rules already in place. Contradictions go to the owner as easy questions, all at once.

### The six known contradictions (16 Nov)

1. In-app AI and API use **versus** the rule "AI only after the owner approves the cost".
2. New scope **versus** "build only what the phase plan lists", "no release until all bugs are fixed", "working app first" and "text box and Pencil top priority".
3. "Connector can do everything" **versus** the connector's safety: no delete, and big changes go to the Inbox.
4. Four levels (Notebook › Subject › Topic › Page) **versus** today's notebooks with sub-pages and spaces.
5. Tabs chosen by the answers **versus** today: Notes, Summary and Review are fixed, the others are off by default per notebook.
6. One long scrolling page **versus** paper pages and the BlockNote editor.

### New ones noticed while writing this file

7. The questionnaire draft has five questions with "what matters" and "how important" joined. The owner's round 5 splits them, so six in all. Use six.
8. The questionnaire draft names the goal "Understand and recall". Round 5 names it "Study and remember". Use round 5.
9. The study-pack file starts with "one page per video". Round 5 says "as many pages as the answers need". Round 5 wins.
10. The study-pack file lists a "Database view of notebook pages" as new, but databases already offer table, board, gallery, calendar and list. What is new is the study columns and the form. Check before planning.
11. Round 3 wants a "Recall tab like RemNote", while the Review v2 picture is already approved. It may need a second picture.
12. Slides are optional per notebook in today's plan, but round 2 makes them a main AI result. The deck viewer and .pptx export sit in parked ideas, not in any phase.
13. The owner says "working app first, polish parked", while the user story adds a large new scope. This is part of contradiction 2, but worth a clear yes or no on order.

---

## 8. Things we said no to (for now)

- Accounts are required (Google, email code, or email and password). Notes work offline once signed in.
- AI only after the owner approves the cost.
- No native apps (iPhone, iPad, Android, Mac) for now. The web app comes first.
- No collaboration.
- No switching from BlockNote or the current stack without asking.
- Build only what the phase plan and the approved specs list. No extras.
- No new spending without the owner's OK.

---

Sources: CLAUDE.md; docs/plans/phase-plan.md; docs/BUILD-STATE.md; docs/PENDING.md; docs/IDEAS.md; docs/design/quality-standard.md; docs/design/owner-decisions.md; docs/plans/user-story-study-pack.md; docs/plans/note-questionnaire-draft.md; docs/recipes/gemini-youtube-prompt-v3.md; docs/features/*.md.
