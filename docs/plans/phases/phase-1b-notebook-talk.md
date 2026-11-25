# Phase 1B planning talk: the notebook that Claude writes (notes)

**Status:** notes of the planning talk between the owner and Fable, begun 25 Nov 2026. Not a spec yet. The big spec with numbered lines is written from these notes when the questions below are answered. Opus builds nothing from this page.

The way of working: [the Fable review](../fable-review-2026-11-25.md), section 13. The earlier decisions used here: [the collection](../earlier-decisions/README.md).

## 1. The owner's words (25 Nov 2026)

**What I want.**

- "I open my app, a notebook should be there with multiple chapters and subpages."
- "Notebook not just have this information, it's have it in an organized way."
- "It should have a summary kind of note section, then in that all small notes will be there."
- "Also a detailed section will be there, easily accessible. If you want to study in depth, which you could not get based on the summary. Summary should be itself be sufficient enough, but just in case the smaller amount of word cannot hold the maximum information, a bigger page will be there."
- "A mind map will be there of everything."
- "A review card will be there based on this."
- "It should be very visually appealing. It should have diagrams, it should have flowcharts, it should have a lot of visual characters to it, like images, highlighted box, different kind of text box, sticky note kind of feel, different kind of feel, so that it makes user feel great about that UI."
- "It should be easily readable on a tablet. And it should be easily customizable on the PC. That is stage 1 goal."

**One real example.**

- "I recently learned about Claude, about Claude skills. I wanted to learn in depth what actually these skills are. What are they? How do they work? Do they really work? And what are the best practices to make them work?"
- "I keep on watching these videos on YouTube and learning about Claude docs from Claude on Claude's own Anthropic sites. I kept recording it, but the problem was I could not remember it. I read it, after a few days I forgot it."
- "A notebook would be great with mind maps which I can easily read in single snap."
- "A review card which I can use to just recall it. A mind map which I can just see in a glimpse and get a complete idea of everything. As much accuracy and depth possible. A short notes which I can go again if I have a doubt or something, and a big depth notes which I can always browse."

**What must never happen.**

- "The notebook should not have any glitches. It should be very smooth experience like Apple. The layout and everything should be very smooth. At the same time following our design principle and adding visual interactive kind of layer on over it."
- "When I try to customize, it should not show me any bugs or something like that which interrupts or hurdles my way of getting it done or customizing it."

## 2. What Fable heard

1. A notebook on one subject, with chapters and sub-pages, made by Claude and waiting in the app.
2. Four ways into the same material: a short summary that is enough by itself; deep notes for when it is not; a mind map of everything, read at one glance; review cards to recall it.
3. It looks rich: diagrams, flowcharts, pictures, highlighted boxes, sticky notes, more than one kind of box.
4. It reads easily on the tablet and is easy to change on the PC, with nothing that glitches or stands in the way.
5. The first real notebook: Claude skills (what they are, how they work, if they work, the best practices), accurate and deep, so that what was learned is not forgotten after a few days.

## 3. What the app already has (so the spec builds on it)

- **Summary, Notes and Review are three views of one page**, and of a notebook, and of the whole app. The Summary holds short lines; Notes holds the full notes; Review holds the page's recall cards (docs/features/summary.md).
- **The mind map is a block** that stays editable (docs/features/mind-map.md). **A card is a block** with its question and answer (docs/features/recall-cards.md).
- **Notebooks hold pages, and pages hold sub-pages** (docs/features/notebooks-and-pages.md).
- **The notes format, version 1,** carries key points, steps, a mind map, cards and picture slots (docs/features/ai-notes-format.md). Version 2 is part N1 of the stage-1 plan.

## 4. Earlier decisions of the owner that apply

| Date   | The decision                                                                                                                                      | Source                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 6 Nov  | What an AI writes is ordinary content: no locked blocks; a mind map stays editable; cards are normal cards; pictures are normal pictures.         | `docs/DECISIONS.md:852`                           |
| 8 Nov  | Every page is paper with block boxes.                                                                                                             | `docs/DECISIONS.md` (Phase Q)                     |
| 16 Nov | Notes must fit the paper page: each section stays with its pictures on one page; long lists are split; more icons and visuals in the body.        | `docs/IDEAS.md:172`                               |
| 16 Nov | Before it makes notes, Claude asks a few quick questions (goal, level, depth, focus, layout, cards). The owner picks them, then a picture.        | `docs/IDEAS.md:173`                               |
| 22 Nov | In stage 1 Claude Code writes the notes format and the owner imports it by "Paste notes" or a zip. No connector in stage 1.                       | `docs/plans/stage-questionnaire-2026-11-22.md:11` |
| 22 Nov | The notes format carries every block the app has: text boxes on paper, sticky and callout looks, highlights, colours, databases, tags, page tabs. | `docs/plans/stage-questionnaire-2026-11-22.md:21` |
| 22 Nov | Claude places sections as boxes on A4 sheets, keeps a section with its picture on one page, splits long lists, and uses a sticky for key points.  | `docs/plans/stage-questionnaire-2026-11-22.md:23` |
| 22 Nov | A notebook skill in the repo that Claude Code runs on "make a notebook on X from these sources".                                                  | `docs/plans/stage-questionnaire-2026-11-22.md:25` |
| 22 Nov | The format carries ink strokes and simple shapes, so Claude can draw figures and put pictures into the zip.                                       | `docs/plans/stage-questionnaire-2026-11-22.md:27` |
| 22 Nov | The paper page is stage 1. Mind maps are stage 1, "one of the owner's three daily tools". The Summary tab is stage 1.                             | `docs/plans/stage-questionnaire-2026-11-22.md`    |

**One clash for the owner.** On 22 Nov the owner put Review and recall cards out of stage 1 ("stage 2, left working as is meanwhile", `docs/plans/stage-questionnaire-2026-11-22.md:95`). On 25 Nov the owner wants review cards in the stage-1 notebook. Question 4 below settles it.

## 5. The owner's answers (25 Nov 2026, first round)

1. **The shape of a notebook.** "The system should be universal." Every chapter has its own summary, deep notes, mind map and cards. The first page of a notebook is "the database kind of thing": it lists everything the notebook holds (the pages, the summaries, the mind maps, the review cards) and can be sorted and filtered. Fable's reading: the same structure for every subject.
2. **Where the facts come from.** Fable's pick, with the owner's order of trust: first the official Claude and Anthropic documents on their websites; then what members of the Claude team themselves said or showed (YouTube, Twitter); other sources after these. Every key point carries its source; what could not be checked is marked.
3. **How big each part is.** Fable's pick: a chapter's summary fits one sheet; a mind map fits one tablet screen with no scrolling; 10 to 20 cards for a chapter.
4. **Review cards in stage 1.** Yes, in the notebook. The owner reviews them with the Review that exists. No rework of the Review screens in stage 1. This replaces the 22 Nov answer for the cards that a notebook brings.
5. **Customize on the PC.** The ten actions of the stage-1 plan, and two more: change the mind map, change a card.

### 5.1 How the owner will use it

- Most of the time as a book: to read, understand and gain the knowledge. On the tablet most of the time, or on the PC, whenever there is free time.
- The recall cards in spare moments, for example on the way to the office: read a card, get the brief idea, and fix it in memory.

### 5.2 The owner's references for the look

- Notes made by doctors and medical students, for their diagrams.
- Ali Abdaal, and other creators who show notes made in GoodNotes and OneNote that look good.

### 5.3 Still open (asked 25 Nov)

- What a row of the front database page is: one row for each chapter, or one row for each thing (a summary, a map, a set of cards).
- Where the map of the whole notebook lives, if the front page is a database.
- Which device the owner holds on the way to the office (the tablet or the phone).
- The look: asked with sample pictures.

### 5.4 The owner's second answers (25 Nov)

- **A correction: the structure is not universal.** "This system is not universal for every notebook and same structure whatever the subject." The structure of 5 (1) is the owner's own preference for this subject, like a prompt. Another user can have other preferences; changing them is a stage 3 refinement. Stage 1 tests the app for the owner, with these preferences. So the app and the notes format must not fix one structure; the preference lives in what Claude is asked to make.
- **The front page works like a Notion database.** One row is a chapter, with its name; the other columns are what the owner filters by (mind map, review cards, summary, and more). The owner does not fully like Fable's sample of the front page. Fable studies how Notion databases work, and adds the app's own features to that model.
- **The mind map as a view.** The owner's idea: the map of the whole notebook can be one of the views of that database.
- **On the way to the office the owner holds the phone.** So reading the recall cards on the phone must work in stage 1.
- The owner answers the questions about the look (the two sample looks, the strength of the highlight colours, the handwritten font) in a later message.

### 5.5 What the app already has for this (read 25 Nov)

- "Database pages (Notion-like)" exist: every row is a page; the property types are text, number (with stars), date, checkbox, choice, choices, link, tag, note link, relation, rollup and formula; the views are Table, Board, Gallery, Calendar, Dashboard and List; each view keeps its own filters, sorts and hidden columns; a database can be a full page or sit inside a note (docs/features/database.md, databases.md, database-views.md).
- The views are a registry: a new kind of view can be added without a change to the database screen. A "Map" view is not there today.
- A point for the spec: today the rows of a database are hidden from the notebook's page list.

### 5.6 The owner's third answers (25 Nov): the sample pictures are rejected

The owner on the eight sample pictures in docs/mockups/notebook-look/: "I don't like them at all."

- **Too computerized.** "Make it more like human."
- **Not in the app's frame.** "We have created a frame in our app. Follow it and then show me the image. How will it look in tablet in the frame, or in the PC with the frame on."
- **Not clean; too many elements.** "Learn from Apple design principles and follow our design principle here too." "Too much information is harmful."
- **Diagrams and text do not belong together.** "Make it more interactive by using diagrams at right place."
- **Not made with the app's own tools.** Sticky notes in place of the bars and boxes beside the big diagram. The pen tool to highlight, to scribble and to draw arrows. "If you don't build it using our own tool, it will be hard for me to customize using our own tool."

What this means for the spec: a notebook that Claude writes is made only of things the owner can change with the app's own tools (text boxes, sticky notes, pen and highlighter ink, shapes, the mind map). A diagram is built from such things, not placed as a flat picture. The next samples are made in the real app, inside its frame, on the tablet and on the PC.

### 5.7 The owner's third answers (25 Nov): the front page

- **What "filter by summary, mind map, review card" means.** Under the name of a page there is a row of options: Summary, Notes, Mind map and others. The database sits below it. A tap on "Mind map" switches the database to its mind map form, with the filters and tools that belong to mind maps; "Summary" shows what belongs to summaries; "Notes" what belongs to notes. Inside each of these the database still has its own filters (ticks, and filters as in Notion) and its own view switch, which the app already has.
- **The columns:** the owner asked for a plainer explanation.
- **The view that opens first:** the Table (Fable's pick).
- **The chapters show in both places:** in the page list on the left and in the front page database, in the same form.
- **Pages under pages.** The owner wants pages, sub-pages and pages under those to show in the database the way they show in the list: like heading 1, 2 and 3. References named by the owner: how Notion shows sub-pages in a database; how OneNote orders a page, a sub-page and a page under it.
- The owner: "I do not know the answers. I am just telling you what I could think is better. Together we both will find the best answer." Fable researches and comes back with a full proposal.

### 5.8 The owner's fourth answers (25 Nov): two kinds of database, and a dashboard

- **Two kinds of database, as in Notion: one inside a page, and one that is a whole page.**
- **The one inside a page is the one used most.** The first page of a notebook shows the content of that notebook (its chapters, with their notes and summaries) in the form of a database inside the page. "It will give user the complete customization that we want."
- **"Database" is also an option in the top row,** beside Summary, Mind map and Review. It opens the whole database page: all the databases made before, filtered to this notebook. There the owner can filter by time, by date or by any property, make custom filters, and make trackers.
- **"Dashboard" is an option in the top row too,** built from that database, "so that we can keep track of everything."

Fable's reading of the top row of a notebook, to be confirmed by the owner: Notes, Summary, Mind map, Review, Database, Dashboard.

### 5.9 The owner's fifth answers (25 Nov): depth in the plan, a small slice in stage 1, the dashboard first

- **Plan in depth; build a small part.** All of these features are planned in depth. Stage 1 builds only the small portion that makes the notebook usable, so that stage 1 ends on time and the depth is not lost.
- **The dashboard is the main view of everything.** It opens first. The "Database" option is not in the row by default; a user can add it later.
- **The default row of options:** Dashboard, Summary, Notes, Mind map, Review cards. Then the owner's next thought: Summary and Notes are similar, so keep short notes only, with Mind map, Review cards and Dashboard.
- The owner asked Fable to audit all of it and to name every contradiction.

## 5A. Fable's audit of the notebook as the owner described it (25 Nov; open, the owner decides)

**Points that pull against each other**

| #   | The two things                                                                                                                                         | What can break                                                                                                                           | Fable's pick                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | "Use our pen tool to highlight" and "easy to customize".                                                                                               | Pen ink sits at a place on the sheet. Text moves when it is edited. Change one word and the highlighter stroke lies over the wrong word. | Words are highlighted with the text's own highlight colour, which moves with the words. Pen ink is for what does not depend on single words: arrows, a circle round a box, an underline of a title. |
| A2  | "Build the diagram from boxes and pen arrows" and "customize it".                                                                                      | A pen arrow does not follow a box that is moved. The diagram comes apart.                                                                | Stage 1: the parts of one diagram form one group that moves together. Later: lines that stay joined to their boxes.                                                                                 |
| A3  | "A summary that is enough by itself, and a detailed section" (first answer) and "Summary and Notes are similar, keep short notes only" (fifth answer). | The deep notes lose their place, and with them "as much depth as possible".                                                              | Keep two depths with clear names: the short notes open first; the deep notes are one tap away. Merge only the names, not the content.                                                               |
| A4  | "A lot of visual character" (first answer) and "too many elements; too much information is harmful" (third answer).                                    | Each new sample swings from one side to the other.                                                                                       | Rich in kinds, few in number: a limit for one sheet (for example one diagram, two sticky notes, four short boxes). The real sample fixes the numbers.                                               |
| A5  | "The dashboard is the main view" and "I use it most as a book to read".                                                                                | The first screen serves tracking, while the main use is reading.                                                                         | The dashboard opens first and its first part is "continue reading"; then the contents; then the cards that are due. Four parts at most.                                                             |
| A6  | "The chapters show in the page list and in the database" and how the app stores rows today (rows of a database are hidden from the page list).         | Two lists of the same chapters that can disagree in order or in content.                                                                 | One chapter is one page. The page list holds the true order and the levels. A database view may sort and filter what it shows; it never changes the list.                                           |
| A7  | "Pages under pages, shown like heading 1, 2, 3" and "filters".                                                                                         | A filter finds a sub-page but not its parent: the level is lost, or the row seems to vanish.                                             | A sub-page that matches is shown under its parent, and the parent is shown too. Two levels under a chapter at most.                                                                                 |
| A8  | "The mind map is a view of the database" and "the mind map of a chapter, which Claude writes".                                                         | One name for two things. A change in the notebook's map could be taken for a change of the chapters.                                     | The map of the notebook is for looking and for opening a chapter. The map inside a chapter is the one that is edited.                                                                               |
| A9  | "Cards on the phone on the way to the office" and stage 1 as planned (PC and tablet).                                                                  | The cards reach the phone only through sign-in and sync, and the Review screen must fit a phone.                                         | In stage 1: reading and answering cards on the phone. Nothing else on the phone.                                                                                                                    |
| A10 | "Plan every feature in depth" and "plan in depth only the next phase part" (the review, 0.5).                                                          | Days of line-by-line approval for parts that are built months later; such lines go out of date.                                          | Numbered lines only for the stage-1 slice. One short page of direction for the rest; it gets its lines when its turn comes.                                                                         |
| A11 | "More human" and "easily readable on a tablet".                                                                                                        | A handwritten font for long text is slow to read.                                                                                        | Handwritten for titles and short labels; the easy-to-read font for the text.                                                                                                                        |

**Points that fit together well:** one material with many views (the app's own principle); what Claude writes is ordinary content the owner can change; the structure is the owner's preference and not fixed in the app; official sources first; the dashboard and the database are built from the same rows, so the "Database" option can stay hidden and still feed the dashboard.

**Fable's proposal for the stage-1 slice (the small portion that makes it usable):**

1. Claude writes the notebook in the notes format with only things the app's tools can change, and the app imports it with nothing lost.
2. A chapter has short notes, deep notes one tap away, its mind map and its cards.
3. A notebook opens on a simple dashboard: continue reading, the contents, the cards that are due.
4. Reading on the tablet; the twelve customize actions on the PC; the cards on the phone.

Planned in depth but built after stage 1's first use: the map of the notebook as a view; the "Database" option and its trackers; a richer dashboard; pages under pages inside a database; custom filters; lines that stay joined to boxes.

## 5B. The owner's decisions on the audit (25 Nov)

| Audit point                          | Decided                                                                                                                                                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1, highlights on words              | The text's own highlight colour, which moves with the words. The pen is for arrows, circles and underlines.                                                                                                                       |
| A2, diagrams                         | Boxes and hand-drawn arrows, in one group that moves together. Lines that stay joined to boxes come later.                                                                                                                        |
| A3, short and deep notes             | Both stay. The short one opens first; the deep one is one tap away. **The names are the ones the app already has: "Summary" for the short notes and "Notes" for the full notes** (docs/features/summary.md, line 7). No new name. |
| A10, how deep to plan later features | One page of direction now; numbered lines when a feature's turn comes.                                                                                                                                                            |
| The stage-1 slice                    | The four points of section 5A.                                                                                                                                                                                                    |

**The name check the owner asked for.** Searched: the specs, the decision lists, the collected earlier decisions and the app's texts. The only names in use are Summary (short key points), Notes (the full notes) and Review (recall cards). No other name for the deep notes was decided. One line in STATE speaks of "the four levels" that the connector must write; no list of four levels of notes was found, and the Claude skill format has three levels of importance for a point (must, good, extra). Opus confirms what "the four levels" are before the spec is closed.

**A fact found in the code (25 Nov).** The row of options under a page's name already takes more options. Every page has Notes, Summary and Review. A notebook can switch on four more, off by default: Mind map, Slides, Audio and video, Database (src/notebooks/pageTabs.ts on build/next). A "Dashboard" option is not in that list.

## 5C. What the code has today (checked 25 Nov on build/next 7649a35e, on the owner's word)

A helper checked each wish against the code, not against the specs. Opus confirms each line before the spec is closed.

**Already there**

| The owner's wish                         | What exists                                                                                                                                                                                                                 | Where                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| A row of options under a page's name     | Notes, Summary, Review always. A notebook can switch on Mind map, Slides, Audio and video, Database.                                                                                                                        | src/notebooks/pageTabs.ts:13; src/pages/PageView.tsx:734 |
| "Mind map" as an option                  | The page's Mind map option lists the page's mind maps, or builds one from the page's headings.                                                                                                                              | src/pages/tabs/MindMapTab.tsx:54                         |
| The chapters of a notebook as a database | The notebook's **Study tracker**: its rows are the notebook's top-level pages. Columns filled by the app: Status, Last revised, Cards due, percent correct, Confidence, Levels. Cards of sub-pages count toward their page. | src/databases/databaseService.ts:137, 162, 877           |
| A dashboard that tracks everything       | The Study tracker has a Dashboard view (charts: number, bar, line, donut, progress, heatmap; percent correct by week, answers by day, the streak) and opens on it once it has rows.                                         | src/databases/dashboard/; databaseService.ts:196         |
| "Continue reading"                       | A "Continue where you stopped" strip, and the last page of each notebook.                                                                                                                                                   | src/notebooks/v2/ContinueStrip.tsx:13                    |
| Two kinds of database                    | Inside a page ("/database") and as a whole page ("Database page").                                                                                                                                                          | src/databases/databasePage.ts:10                         |
| Views and filters as in Notion           | Table, Dashboard, Calendar, Gallery, Board, List. Filters with "all" or "any", grouping, hidden columns, kept for each view.                                                                                                | src/databases/views/viewTypes.ts:48                      |
| Sticky notes and other looks of a box    | Plain, outline, soft, note, sticky, card; a callout preset; ten colours.                                                                                                                                                    | src/core/boxStyle.ts:132                                 |
| The pen tools                            | Five pens, a highlighter, an eraser, the Lasso, tape. Shapes: line, **arrow**, rectangle, ellipse, triangle.                                                                                                                | src/core/inkTypes.ts:23; src/app/tools/v8/cards/shapes/  |
| Pages under pages                        | Nesting by drag, with no limit of depth; the Pages panel indents three levels.                                                                                                                                              | src/pages/PageTree.tsx:163                               |
| Cards on the phone                       | The Review screen has a phone layout, tested at phone width. Counts of due cards for a page, a notebook and all.                                                                                                            | src/review/v2/; e2e/review-v2.spec.ts:393                |

**Not there**

- "Dashboard" as an option in the row under a name; a mind map or a dashboard option for a whole notebook. Tabs of a notebook can be renamed and hidden, but not added or put in another order.
- A map made from the pages of a notebook. A map, tree or outline view of a database.
- Rows under rows in a database. A database of ordinary pages other than the Study tracker.
- Lines that stay joined to boxes. Rotating a box or a sticky note. A group that holds ink: a group holds boxes only. (So audit point A2 needs care: today the arrows of a diagram do not move with a group of boxes. Ink does move with the box it was drawn on.)
- **Any import format that writes boxes on paper, the looks of a box, ink, or the choice of options in the row.** Three formats are read today (ln-notes/1, ln-skill/1, ln-spec/1); none can. This is the main new work of the notebook path (parts N1 to N7 of the stage-1 plan).

**"The four levels":** the Study tracker has a column named "Levels". This is the likely meaning; Opus confirms.

## 5D. The owner's way to build a diagram (25 Nov), and the facts behind it

**The owner's idea.** Make one text box and draw in it. Put smaller boxes with the sticky look on it. Put all of them in one group. Then the whole diagram is one thing. And: "the tool need to use our text box feature a lot. Using that, we can get a lot of beautiful flows through the page."

**The owner's belief, checked in the code: true.** A pen stroke is stored with the block it was drawn over, as an offset from that block's corner. So it moves and resizes with its box (src/ink/anchor.ts, lines 3 to 10; `InkChunk.blockId` in src/core/inkTypes.ts). A box has its place, its width, its look and an optional group; boxes with the same group move together (`PaperBox` in src/core/types.ts; `setGroup` in src/paper/boxService.ts).

**What this gives.** A diagram as the owner describes it needs no new storage: a large box that carries the drawn arrows, small sticky boxes placed on it, one group for all of them. This replaces Fable's note under audit point A2.

**Not proven yet (Opus proves it in the real app before the spec is closed):** that a small box can sit on top of a larger box and stay there; that a group of such boxes moves with every stroke in place on the tablet and on the PC.

**What Claude needs so that it can write such pages.** The storage is there; the way in is missing. The notes format and the importer must be able to write, for a page: each box with its place, size and look; which boxes form a group; the strokes and shapes that belong to a box; the highlight of words. This is the main new work of the notebook path.

**A request to the owner:** one page made by hand in the app, the way the owner likes it (a title, a few boxes, one diagram built this way). It is the reference for the look, and its stored data is the model for the format.

## 5E. The owner tried to build the page by hand (25 Nov): one fault, one wish, five reference pictures

**The owner could not build the diagram in the app.** "I failed to make within our own box, within our own app."

**The fault (the owner's words, to become an issue when the device and the tool are known).**

- Saw: a text box with one line (the word "skill"), made taller by its handle to about ten lines. A drawn arrow stays in the first line; "the arrow does not go beyond one line, even though there is space there." Drawing and typing reach only the first line, until the owner clicks in the text with the Text tool and presses Enter to make the lines.
- Expected: "The area should expand the moment the box is extended." The whole of the box can be drawn on and typed in at once.
- Related: fault 3 of [the real-app page](../../mockups/notebook-look/real-app/README.md) (ink that starts in a box is cut at the box's edge), and issue #64 of phase 1A (drawing in the lower part of a taller box), which the owner passed on the iPad on 24 Nov. Opus checks why this case still fails.

**The wish: a box drawn inside a text box holds text.** The owner picks Shapes, then Box, and draws it inside a text box. That drawn box should then act as a small text box of its own kind: text can be typed in it, and it lives inside the larger text box. An ordinary text box is hard to put inside another text box, and that was made so on purpose; this kind is the one that can sit inside. With the Shapes tool (boxes, arrows) the diagrams of the reference pictures can then be made.

What follows for the plan: Fable's note in 5D ("small sticky boxes placed on a large box") does not hold, because ordinary boxes are kept from sitting on each other. The owner's diagram is: one text box as the ground; drawn boxes inside it that hold text; arrows between them; all of it moves with the one box.

**Five reference pictures from the owner** (in the chat of 25 Nov; not copied into the repo, they belong to their makers):

1. "Bacterial cell" (GoodNotes): a brush-lettered title; one coloured drawing in the middle; short labels with an orange highlight, joined to the parts by thin lines.
2. "Community acquired pneumonia" (Notability): two colours only (orange and dark blue); a cloud in the middle with arrows to the sections; boxes with orange borders; a flow of boxes and arrows; grid paper. Very full.
3. "Age of Exploration" (paper): a hand-lettered title; section names in small hand-drawn coloured boxes; bullets, arrows and brackets; grid paper.
4. "Cornell notes" (a template): a cue column, a notes column, a summary box at the foot; pink highlighter behind handwritten headings; small arrows with handwritten remarks; much empty space.
5. A typed page in an app frame ("Why Physical AI probably won't scale like LLMs"): a typed title; a two-column table with coloured heads; typed bullets; two small hand-drawn sketches beside the text; handwritten remarks with a star and an underline; one yellow highlighter line.

What they share: a title lettered by hand; one or two accent colours, used the same way all over the page; section names set in a coloured box or on a highlighter stroke; arrows and thin lines that join a label to its part; short phrases; small sketches right beside the words they explain.

**The owner's own try, as a picture (25 Nov, 19:14):** [owner-try-2026-11-25.png](../../mockups/notebook-look/owner-try-2026-11-25.png). The iPad, the Apple Pencil Pro, the dark theme, the Shapes tool. One tall text box holds the words "Opus → two manager →"; two arrows drawn with Shapes run down from the words to two drawn boxes. This is the diagram the owner means: the two drawn boxes should take text, and the whole of it should belong to the one text box. It also answers which device and tool the fault above was seen with.

A point for the spec: the owner works in the dark theme. Every look of a notebook must be right in dark and in light.

## 5F. The owner corrects the wish (25 Nov): a tick on the Shapes tool that lets a shape hold text

Fable's reading in 5E was not right. The owner's own description:

- **The Shapes tool stays as it is.** A shape drawn today is drawn over what is there, and that works. "We don't need to change anything in it."
- **One more option on the tool: a tick.** It sits in the settings of the Shapes tool, in the Tool bar itself. With the tick on, a shape that is drawn can be used as a text box.
- **Only some shapes.** Oval, rectangle, square: shapes with an inside. An arrow or a line never holds text: "it will not make sense."
- **With the tick on,** the drawn shape is a text box inside a text box: the owner clicks in it, the typing cursor goes there, and the owner types "just like a normal text box".
- **It grows with its text and keeps its form.** A circle stays a circle and grows both ways. A line of three words sits in the middle; with a line of ten words the circle is larger and the words are still in the middle.
- **Where the cursor can go.** While the shape grows by itself, the cursor is in the lines that exist, and Enter makes the next line. When the owner makes the shape larger by hand, the whole of the shape can be typed in.
- **With the tick off,** a shape holds no text. It is only drawn over what is there. "This way, no ruckus is there": text is never typed over other text by accident.
- **Both ways stay.** Small sticky boxes placed on a large box were right too. "Do not lose that functionality." The shape that holds text is one more option, not a replacement.
- **Why:** "This way our notes will be very interactive."

About the screenshot in 5E: it was taken after the owner pressed Enter down to the end of the box; before that, nothing could be drawn below the first line. The owner then wants to write "manager 1" and "manager 2" inside a circle under each arrow.

**More answers of the owner (25 Nov):** the diagram in a box belongs to stage 1; both themes, light and dark; handwriting for titles and short labels only. The owner asked Fable to ask again which reference is the model for the Summary and which for the Notes, and said that none of Fable's sample pictures was close to what the owner wants.

## 5G. How known apps let a shape hold text (research of 25 Nov, on the owner's word)

From the makers' help pages where they could be opened. Several pages could not be opened (Miro, GoodNotes, Canva); those points come from search summaries and are marked.

**What most apps agree on**

- A shape with an inside holds text. A line or an arrow does not; in some apps it takes a label instead (PowerPoint, Freeform, draw.io, FigJam, tldraw).
- Typing starts with a double tap or a double click in the shape, or by picking the shape and typing (Keynote, Freeform, draw.io, Canva; tldraw uses Enter).
- The text sits in the middle of the shape and wraps at the shape's width (tldraw and Excalidraw say so; PowerPoint offers "middle").
- In the diagram apps a line stays joined to its shapes when a shape moves (Freeform, FigJam, draw.io, Excalidraw, tldraw).

**Where the apps differ: what happens when the text is too long**

| What the app does                 | Which app                                                            | The known trouble                                      |
| --------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| The shape grows, taller only      | tldraw; PowerPoint ("Resize shape to fit text"); draw.io (a command) | A circle becomes an oval.                              |
| The text gets smaller             | PowerPoint and Google Slides, for some boxes                         | Tiny text; users complain.                             |
| The text is cut, with a mark      | Keynote                                                              | The user must resize by hand.                          |
| Nothing; the user resizes by hand | Miro (not verified)                                                  | Text runs out of the shape; users ask for auto-resize. |

**Two findings that matter for the owner's wish**

- **No help page that was read describes a circle that stays round while it grows.** The owner's rule (a circle stays a circle and grows both ways) is the app's own rule. It must be tried on the real tablet.
- **The owner's tick answers a known complaint.** GoodNotes users report that after a rectangle is drawn the app assumes they want to type, and they ask for a plain shape by default (a search summary, not verified). With the owner's tick, a plain shape is the default.

**One useful rule from tldraw:** a shape grows only when its text needs the room, and it never gets smaller than the size it was drawn at.

Sources: support.microsoft.com (PowerPoint: "Set text direction and position in a shape or text box"); support.apple.com (Keynote and Freeform guides); support.google.com/docs/answer/10364036; drawio.com/doc/faq/labels-add and /autosize; help.figma.com (FigJam connectors); tldraw.dev/sdk-features/geo-shape.

## 5H. The owner's answers on shapes, and what the Summary and the Notes are (25 Nov)

- **The tick, once more in the owner's words.** Tick off: the owner draws a shape and uses it as a shape, as today. Tick on: the shape can be edited and acts as a text box; "the same feature like text box will work on it." A tap in the middle or on the text gives the typing cursor. A tap on the corner brings the bar for moving and selecting.
- **A triangle holds text.** Only arrows and lines do not.
- **Typing starts with one tap** of the Text tool, as in a text box.
- **When the text is too long,** the shape grows and keeps its form; it never gets smaller than drawn, and the text never gets smaller. "The same thing we do in the text box."
- **The five reference pictures were not models for a page.** They only show that such notes can be made. Fable had asked the wrong question.
- **The Summary, as the owner sees it:** short notes as a picture. "A visual diagram, a flow chart with the text blocks like circle ... with different kinds of color, different kinds of sizes of text based on the importance." Diagrams, fonts, text colours, text boxes, arrows and symbols, combined "into a small page, at the same time keeping it informative". The bacterial cell picture is the nearest of the five.
- **The Notes, as the owner sees it:** "more of a text kind of document", with text box colours and the other looks, and with flow charts and diagrams between the parts or at the end to explain things.

Fable's picks for the two had been the wrong way round.

## 5I. The walk-through of the draft spec (begun 25 Nov)

The owner and Fable go through [the draft](phase-1b-notebook-spec-draft.md) group by group. A line is approved only by the owner's yes.

**Group 1, what a notebook is (NB-01 to NB-15):**

- NB-08 changed by the owner: no limits on the mind map. "If needed, I can zoom in, zoom out, I can drag it ... but the entire diagram should be available to view. That's all I wanted." "Too many restrictions there."
- NB-11 changed by the owner: "sources need to be mentioned in the end, not at the top or between or anywhere ... it will be disturbing, kind of like noise."
- NB-12: where a point that is not checked is named is open.
- NB-09 changed by the owner: the number of cards was "also kind of restriction". The same for the mind map and the cards: "Make what is necessary to be done. Don't add too much unnecessary stuff." The owner recalls that the questions Claude asks at the start include how many cards to make (the start questions of 16 Nov name "cards").
- NB-12 decided: a quiet mark beside a point that is not checked, and the list at the end explains it.
- NB-16 added from the owner's words: what the subject needs and no more.
- A lesson for Fable: three of its own numbers were restrictions the owner never asked for (the mind map's levels, the count of cards, and before that the accuracy rule). Every number in the draft that is Fable's own is shown to the owner as such.
- NB-05 changed by the owner: "fits one sheet" was "little hard of a condition too". The Summary gives a brief idea; it does not miss what is important; "too many of the words are noise itself", and a diagram takes their place; the length "depends on the content". "We don't need to limit the quality of output."
- NB-20 changed by the owner: a list of allowed things was a limit again. "Everything should be allowed, the app features, every app feature." "It should be a goal, not a particular condition."
- The owner's final example, which became the one test (NB-01): a picture that Claude inserts can be resized; a pen cross can be removed with the eraser; a highlight can be removed with the eraser; the parts of a diagram can be changed. And Claude marks a page as the owner would with the Apple Pencil: a star, an arrow, a dot, a red cross, a free-hand sketch (NB-23).
- The owner on numbers: Fable may set them, "just make sure that it's not too limiting. It should have more of a freedom."

**Second draft (25 Nov).** Fable rewrote the draft after this: three kinds of line (goals, a few fences, and what the app does), no numbers of Fable's own, and no list of allowed things. The ids did not change.

- The other lines: the owner has not said yes yet.

## 6. What comes next

1. The owner's answers go into section 5.
2. Sample pictures of one chapter in two looks, for the owner's choice: [docs/mockups/notebook-look/](../../mockups/notebook-look/README.md). Made on 25 Nov; the owner's choice is open.
3. The big spec with numbered lines; the owner and Fable go through it line by line.
