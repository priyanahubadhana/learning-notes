# The notebook that Claude writes: big spec, first draft (25 Nov 2026)

**Status: DRAFT. Not approved. Opus builds nothing from this page.** The owner and Fable go through it line by line; no line counts as a yes until the owner says so. When it is approved it moves to `docs/features/`.

Where it comes from: [the talk notes](phase-1b-notebook-talk.md) (the owner's words, the audit, the code check). The way of working: [the Fable review](../fable-review-2026-11-25.md), section 13.

How to read a line: an id that never changes; the kind (**always** true, must **never** happen, **when** ... then ...); the line; where it comes from. "Open" means a question to the owner is not answered yet. "iPad" means only the real iPad can prove it. "Exists" means the code check of 25 Nov found it in the app; "new" means it did not. The spec says what the owner wants; how to build it is Opus's choice.

## 1. The objective, in the owner's words (25 Nov 2026)

- "I open my app, a notebook should be there with multiple chapters and subpages."
- "It should have a summary kind of note section ... Also a detailed section will be there, easily accessible ... Summary should be itself be sufficient enough."
- "A mind map will be there of everything." "A review card will be there based on this."
- "It should be very visually appealing." And: "Too much information is harmful."
- "It should be easily readable on a tablet. And it should be easily customizable on the PC. That is stage 1 goal."
- "If you don't build it using our own tool, it will be hard for me to customize using our own tool."
- "The notebook should not have any glitches. It should be very smooth experience like Apple."

**The first real notebook:** Claude skills. What they are, how they work, if they work, the best practices. "I read it, after a few days I forgot it."

**What "usable every day" means (owner, 25 Nov):** on the PC, Claude writes a notebook, the app imports it in full, and the owner reads it and corrects it by typing. On the tablet the owner reads. On the phone the owner answers recall cards.

## 2. The lines for stage 1

### 2.1 What a notebook is

| Id    | Kind   | The line                                                                                                                                                                   | From                                           |
| ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| NB-01 | always | Everything that Claude writes is ordinary content. The owner can change every part of it with the app's own tools. Nothing is locked.                                      | owner, 6 Nov and 25 Nov                        |
| NB-02 | always | The structure of a notebook comes from the preferences the owner gives to Claude. The app and the notes format do not fix one structure.                                   | owner, 25 Nov                                  |
| NB-03 | always | A notebook has chapters. A chapter is a page. A chapter can have sub-pages, and they can have pages under them.                                                            | owner, 25 Nov. Exists.                         |
| NB-04 | always | Each chapter has a Summary (short), Notes (full), a mind map and recall cards. The names are the app's own: Summary, Notes, Review.                                        | owner, 25 Nov. Exists.                         |
| NB-05 | always | The Summary of a chapter is enough by itself, and it fits one sheet.                                                                                                       | owner, 25 Nov                                  |
| NB-06 | always | The Notes hold the depth. They are one tap away from the Summary.                                                                                                          | owner, 25 Nov. Exists.                         |
| NB-07 | when   | When the owner opens a chapter of a notebook that Claude wrote, then the Summary shows first.                                                                              | owner, 25 Nov. New: today Notes shows first.   |
| NB-08 | always | The mind map of a chapter can be read at one glance on the tablet, with no scrolling: three levels at most, about five branches, a few words in a node. It can be changed. | owner, 25 Nov. The numbers are Fable's.        |
| NB-09 | always | A chapter has 10 to 20 recall cards. One fact for a card. The kinds: question and answer, and fill the gap.                                                                | owner, 25 Nov (Fable's numbers)                |
| NB-10 | always | The owner reviews the cards with the Review that the app has. The Review screens are not changed in stage 1.                                                               | owner, 25 Nov; replaces 22 Nov for these cards |
| NB-11 | always | Every key point shows its source. The order of trust: the official Claude and Anthropic documents; then what members of the Claude team said themselves; then others.      | owner, 25 Nov                                  |
| NB-12 | always | A point that Claude could not check is marked "not checked".                                                                                                               | owner, 25 Nov                                  |

### 2.2 The look: made with the app's own tools

| Id    | Kind   | The line                                                                                                                                                                 | From                                     |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| NB-20 | always | A page is made only of things the app's tools make: text boxes and their looks, highlights on words, pen and highlighter strokes, shapes, the mind map, cards, pictures. | owner, 25 Nov                            |
| NB-21 | always | Text boxes are the main building block. A page reads as a flow through its boxes.                                                                                        | owner, 25 Nov                            |
| NB-22 | always | Words are highlighted with the text's own highlight colour. It moves with the words when the text changes.                                                               | owner, 25 Nov (audit A1). Exists.        |
| NB-23 | always | Pen strokes are for arrows, circles, underlines and small sketches: for marks that do not depend on a single word.                                                       | owner, 25 Nov (audit A1)                 |
| NB-24 | always | A diagram is one text box as the ground, drawn boxes inside it that hold text, and arrows between them. It moves as one thing.                                           | owner, 25 Nov. New (see NB-74 to NB-76). |
| NB-25 | never  | A diagram that the tools can make is placed as a flat picture.                                                                                                           | owner, 25 Nov. Open (question 3).        |
| NB-26 | always | A sheet is calm: few elements and much empty space. The limits for one sheet are set from the owner's reference pictures and tried on the real tablet.                   | owner, 25 Nov. The numbers are open.     |
| NB-27 | always | One or two accent colours for a notebook. A colour has one meaning in the whole notebook, and the first Summary shows the meanings.                                      | owner's references, 25 Nov               |
| NB-28 | always | The title and short labels can look written by hand. Reading text uses the easy-to-read font.                                                                            | Fable's pick. Open.                      |
| NB-29 | always | Every look is right in the dark theme and in the light theme. The dark theme is checked first.                                                                           | Fable's pick. Open (question 4).         |
| NB-30 | always | A page follows the app's frame and its design principles. A notebook brings no new controls.                                                                             | owner, 25 Nov                            |
| NB-31 | always | A section stays with its diagram on one sheet. A long list is split. A sticky note holds the one thing to remember.                                                      | owner, 16 Nov and 22 Nov                 |

### 2.3 From Claude into the app

| Id    | Kind   | The line                                                                                                                                                                                                                       | From                                                                       |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| NB-40 | when   | When the owner asks Claude Code to "make a notebook on X from these sources", then Claude first asks a few quick questions (goal, level, depth, focus, layout, cards) and then writes one file.                                | owner, 16 Nov and 22 Nov                                                   |
| NB-41 | when   | When the owner brings that file into the app (by "Paste notes" or as a zip), then the whole notebook is there: chapters, sub-pages, Summary, Notes, mind maps, cards, boxes with their looks, drawn boxes, arrows and strokes. | owner, 22 Nov and 25 Nov. New: no format writes boxes, looks or ink today. |
| NB-42 | never  | An import changes or removes a notebook or a page that was there before.                                                                                                                                                       | Fable's line                                                               |
| NB-43 | never  | A part of the file is dropped without a word. What cannot be placed is named, with its chapter, and the rest still arrives.                                                                                                    | owner, 25 Nov ("nothing lost")                                             |
| NB-44 | never  | After an import: a box that lies on another box; a box that runs off the sheet; an empty or broken picture; a mind map with its branches cut off.                                                                              | owner, 25 Nov ("no glitches"); fault 9                                     |
| NB-45 | always | The import fills the Summary of each chapter.                                                                                                                                                                                  | New: today the Summary stays empty (fault 10)                              |
| NB-46 | always | In stage 1 there is no connector: the owner brings the file in by hand.                                                                                                                                                        | owner, 22 Nov                                                              |

### 2.4 Opening and reading

| Id    | Kind   | The line                                                                                                                                                   | From                                                          |
| ----- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| NB-50 | when   | When the owner opens a notebook, then a dashboard shows first.                                                                                             | owner, 25 Nov. Partly exists (the Study tracker's dashboard). |
| NB-51 | always | The dashboard has four parts at most. In stage 1: continue reading; the chapters with their state and their cards due; the cards due today.                | Fable's pick (audit A5), agreed 25 Nov                        |
| NB-52 | always | The chapters show in the page list on the left and on the dashboard, as the same pages. The page list holds their order.                                   | owner, 25 Nov (audit A6)                                      |
| NB-53 | always | The row of options under a page's name shows Summary, Notes, Mind map and Review for such a notebook. "Database" stays off until the owner switches it on. | owner, 25 Nov. Exists, off by default.                        |
| NB-54 | when   | When the owner reads a sheet on the tablet, held upright or sideways, then the text can be read with no zoom.                                              | owner, 25 Nov. iPad.                                          |
| NB-55 | when   | When the owner opens the app on the phone, then the cards that are due can be read and answered. Nothing else is needed on the phone in stage 1.           | owner, 25 Nov. Exists (the phone Review screen).              |
| NB-56 | never  | A glitch while reading: a title or a box that jumps when a page opens or an option is tapped; a word broken in its middle.                                 | owner, 25 Nov; faults 7 and 15                                |

### 2.5 Customizing on the PC

| Id    | Kind   | The line                                                                                                                                                                                                                                                                                | From                               |
| ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| NB-60 | when   | When the owner does one of these on a page that Claude wrote, then it works as on a page made by hand: open; read; fix a sentence; rewrite a box; highlight; change colour and size; add a box beside; paste a picture; move things; save and sync; change the mind map; change a card. | owner, 25 Nov (the twelve actions) |
| NB-61 | always | Each of these steps is undone by one Undo.                                                                                                                                                                                                                                              | the design rules                   |
| NB-62 | never  | Customizing loses words or strokes. "Saved" shows while a stroke is not saved yet.                                                                                                                                                                                                      | owner, 25 Nov; fault 4             |
| NB-63 | never  | Something stands in the way while customizing: a card or a toast that covers what the owner works on.                                                                                                                                                                                   | owner, 25 Nov; faults 8 and 12     |

### 2.6 The diagram in a box (the owner's fault and wish of 25 Nov)

| Id    | Kind   | The line                                                                                                                                                                                                                   | From                                 |
| ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| NB-74 | when   | When the owner makes a text box taller, then the whole of the box can be drawn on and typed in at once, with no extra step.                                                                                                | owner, 25 Nov. A fault today. iPad.  |
| NB-75 | always | The Shapes tool works as it does today. A shape drawn with the tick off is drawn over what is there and holds no text.                                                                                                     | owner, 25 Nov. Exists.               |
| NB-76 | when   | When the owner draws an arrow with Shapes between two shapes inside a text box, then the arrow shows, stays where it was drawn, and moves with the text box.                                                               | owner, 25 Nov; faults 1 and 2. iPad. |
| NB-77 | when   | When Claude writes a diagram, then it is made this way (NB-24), and the owner can change each shape, its text and each arrow.                                                                                              | owner, 25 Nov. In stage 1.           |
| NB-78 | always | The Shapes tool has a tick in its own settings in the Tool bar. With the tick on, a shape that is drawn can hold text.                                                                                                     | owner, 25 Nov. New.                  |
| NB-79 | always | The tick is offered for shapes with an inside: box, square, oval, circle. A line and an arrow never hold text.                                                                                                             | owner, 25 Nov. New.                  |
| NB-80 | when   | When the tick is on and the owner draws such a shape inside a text box, then a click in the shape puts the typing cursor there, and the owner types as in a text box. The shape belongs to the text box and moves with it. | owner, 25 Nov. New. iPad.            |
| NB-81 | when   | When the text in such a shape needs more room, then the shape grows and keeps its form: a circle stays a circle. The text stays in the middle.                                                                             | owner, 25 Nov. New.                  |
| NB-82 | when   | When the owner presses Enter in such a shape, then the next line starts and the shape grows to hold it.                                                                                                                    | owner, 25 Nov. New.                  |
| NB-83 | when   | When the owner makes such a shape larger by hand, then the whole of its inside can be typed in.                                                                                                                            | owner, 25 Nov. New.                  |
| NB-84 | never  | Text is typed over other text by accident: with the tick off, a shape takes no text.                                                                                                                                       | owner, 25 Nov                        |
| NB-85 | always | The way that exists stays: boxes with the sticky look placed with a large box. The shape that holds text is one more way, not a replacement.                                                                               | owner, 25 Nov                        |

## 3. Direction for what is built after stage 1 (one page; gets its lines when its turn comes)

- **The map of a whole notebook** as one more view of its chapters: for looking, and for opening a chapter. Not there today.
- **"Database" as an option** in the row: the whole database of the notebook, with filters by time and date, the owner's own filters and trackers. Mostly there; off by default.
- **A fuller dashboard**, and "Dashboard" as an option in the row.
- **Pages under pages inside a database**: shown as in the page list, with an arrow to open a level. A sub-page that a filter finds is shown under its parent.
- **Lines that stay joined to boxes.** Turning a box or a sticky note.
- **Other people's preferences** for the structure of a notebook (stage 3).
- **The connector**, so that a notebook arrives with no file (the end of stage 2).

## 4. Open points

**Answered by the owner on 25 Nov:** the diagram in a box is part of stage 1 (NB-25, NB-77); both themes, the dark one checked first (NB-29); handwriting for titles and short labels only (NB-28); the wish for a shape that holds text, as NB-78 to NB-85 now say.

**Questions to the owner (still open)**

1. Which of the owner's five reference pictures is the model for the Summary, and which for the Notes? (It sets the limits of NB-26.) Asked again on 25 Nov in plainer words.
2. NB-81: the exact way a shape grows (a research of how known apps do it is running).
3. NB-79: does a triangle hold text?

**For Opus to prove in the real app before the spec is closed**

- NB-07: what decides which option shows first, and what it costs to change it for one notebook.
- NB-50 and NB-51: what the Study tracker's dashboard and the "Continue where you stopped" strip give today, on a notebook that Claude wrote.
- NB-74: why the case fails after the fix of issue #64.
- NB-75 and NB-76: what a drawn shape is in the app today, and what is missing for it to hold text.
- "The four levels" in STATE: what they are.
- The fifteen faults of [the real-app page](../../mockups/notebook-look/real-app/README.md): which are real, and which block these lines.

## 5. Not in stage 1

Rework of the Review screens. The map of a whole notebook. Trackers and custom filters. Rows under rows. Lines joined to boxes. Anything on the phone but answering cards. A connector.
