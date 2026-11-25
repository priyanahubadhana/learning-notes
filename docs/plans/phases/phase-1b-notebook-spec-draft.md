# The notebook that Claude writes: big spec, second draft (25 Nov 2026)

**Status: DRAFT. Not approved. Opus builds nothing from this page.** The owner and Fable go through it; a line is approved only by the owner's yes. When it is approved it moves to `docs/features/`.

Where it comes from: [the talk notes](phase-1b-notebook-talk.md) (the owner's words, the audit, the code check, the walk-through). The way of working: [the Fable review](../fable-review-2026-11-25.md), section 13.

## How to read this page

The owner, 25 Nov: "It should be a goal, not a particular condition." "We don't need to limit the quality of output." So the lines are of three kinds, and they are not equal:

- **Goal.** What good looks like. Claude and Opus are free in how they reach it. The owner judges the result on the real device. A goal sets no number and no list of allowed things.
- **Fence.** What must hold every time, or must never happen. There are few fences.
- **When.** What the app does when the owner does something. These are the app's own behaviours, with the faults to fix and the new parts.

An id never changes. "Exists" means the code check of 25 Nov found it in the app; "new" means it did not. "iPad" means only the real iPad can prove it.

## 1. The objective, in the owner's words (25 Nov 2026)

- "I open my app, a notebook should be there with multiple chapters and subpages."
- "It should have a summary kind of note section ... Also a detailed section will be there, easily accessible."
- "A mind map will be there of everything." "A review card will be there based on this."
- "It should be very visually appealing." And: "Too much information is harmful."
- "It should be easily readable on a tablet. And it should be easily customizable on the PC. That is stage 1 goal."
- "The notebook should not have any glitches. It should be very smooth experience like Apple."
- "Just make sure that any feature you add should be easy to customize."

**The first real notebook:** Claude skills. What they are, how they work, if they work, the best practices. "I read it, after a few days I forgot it."

**What "usable every day" means (owner, 25 Nov):** on the PC, Claude writes a notebook, the app imports it in full, and the owner reads it and corrects it by typing. On the tablet the owner reads. On the phone the owner answers recall cards.

## 2. The fences (few; they must hold)

| Id    | The fence                                                                                                                                                                                                                                                                                                                                     | From                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| NB-01 | **The one test.** Everything that Claude puts into a notebook can be changed by the owner with the tool a person would use for it. A pen mark comes off with the eraser. A highlight can be removed. A picture can be moved and resized. The parts of a diagram can be changed. Text, a card and a mind map can be edited. Nothing is locked. | owner, 6 Nov and 25 Nov                          |
| NB-42 | An import never changes or removes a notebook or a page that was there before.                                                                                                                                                                                                                                                                | Fable's line                                     |
| NB-43 | No part of what Claude wrote is dropped without a word. What cannot be placed is named, with its chapter, and the rest still arrives.                                                                                                                                                                                                         | owner, 25 Nov ("nothing lost")                   |
| NB-62 | Customizing never loses words or strokes. "Saved" never shows while a stroke is not saved yet.                                                                                                                                                                                                                                                | owner, 25 Nov; fault 4 of the real-app page      |
| NB-11 | The sources are named at the end of a page, never at the top and never between the lines. The order of trust: the official Claude and Anthropic documents; then what members of the Claude team said themselves; then others.                                                                                                                 | owner, 25 Nov ("noise")                          |
| NB-12 | A point that Claude could not check has a small, quiet mark beside it, and the list at the end of the page explains it.                                                                                                                                                                                                                       | owner, 25 Nov                                    |
| NB-84 | Text is never typed over other text by accident: with the tick off, a shape takes no text.                                                                                                                                                                                                                                                    | owner, 25 Nov                                    |
| NB-85 | The ways that exist stay. A new way is added beside them, never in place of them (for example: boxes with the sticky look stay when shapes learn to hold text).                                                                                                                                                                               | owner, 25 Nov ("Do not lose that functionality") |

## 3. The goals (what good looks like; no numbers, no lists of allowed things)

| Id    | The goal                                                                                                                                                                                                                                         | From                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| NB-02 | The structure of a notebook comes from the preferences the owner gives to Claude. The app and the notes format do not fix one structure.                                                                                                         | owner, 25 Nov                  |
| NB-03 | A notebook has chapters. A chapter is a page. A chapter can have sub-pages, and they can have pages under them.                                                                                                                                  | owner, 25 Nov. Exists.         |
| NB-04 | Each chapter has a Summary, Notes, a mind map and recall cards. The names are the app's own: Summary, Notes, Review.                                                                                                                             | owner, 25 Nov. Exists.         |
| NB-05 | The Summary gives a brief idea of the whole chapter. It misses nothing that is important. Words that add nothing are noise and are left out; a diagram says it in their place. How long it is depends on the content.                            | owner, 25 Nov (walk-through)   |
| NB-13 | The Summary is led by a picture: a diagram or a flow of shapes that hold text, with arrows, colours and symbols.                                                                                                                                 | owner, 25 Nov                  |
| NB-06 | The Notes hold the depth. They are one tap away from the Summary.                                                                                                                                                                                | owner, 25 Nov. Exists.         |
| NB-14 | The Notes are led by text: a document of text boxes with their colours and looks, with diagrams and flows between the parts or at the end to explain them.                                                                                       | owner, 25 Nov                  |
| NB-08 | The whole mind map of a chapter can be seen. The owner can zoom in, zoom out and drag it. The mind map can be changed.                                                                                                                           | owner, 25 Nov (walk-through)   |
| NB-09 | A chapter has the recall cards its subject needs. One fact for a card. The owner can say how many in the questions Claude asks at the start.                                                                                                     | owner, 25 Nov (walk-through)   |
| NB-16 | Claude writes what the subject needs and no more. The number of cards, the size of a mind map and the length of a page follow the subject and the owner's answers at the start.                                                                  | owner, 25 Nov (walk-through)   |
| NB-20 | Claude may use every feature the app has: every kind of block and what a block can hold, every look of a box, pictures, diagrams, shapes, ink, the mind map, cards, databases, and what is added later.                                          | owner, 25 Nov (walk-through)   |
| NB-21 | Text boxes are the main building block. A page reads as a flow through its boxes.                                                                                                                                                                | owner, 25 Nov                  |
| NB-23 | Claude marks a page the way a person does with the Apple Pencil: an arrow, a circle, a star beside what is interesting, a dot, a cross, an underline, a small free-hand sketch. Sometimes a mark, sometimes none; whatever makes the page speak. | owner, 25 Nov (walk-through)   |
| NB-24 | A diagram is built so that its parts can be changed: for example one text box as the ground, shapes inside it that hold text, and arrows between them, so that it moves as one thing.                                                            | owner, 25 Nov                  |
| NB-26 | A page is calm and clean, in the spirit of Apple's design and of the app's own design principles. Too much on a page is noise.                                                                                                                   | owner, 25 Nov                  |
| NB-27 | Colour carries meaning, and a colour means the same thing in the whole notebook.                                                                                                                                                                 | owner's references, 25 Nov     |
| NB-15 | Text is larger where it matters more.                                                                                                                                                                                                            | owner, 25 Nov                  |
| NB-28 | Titles and short labels can look written by hand. Reading text stays easy to read.                                                                                                                                                               | owner, 25 Nov                  |
| NB-29 | Every look is right in the dark theme and in the light theme. The dark theme is checked first, because the owner uses it.                                                                                                                        | owner, 25 Nov                  |
| NB-30 | A page follows the app's frame. A notebook brings no new controls.                                                                                                                                                                               | owner, 25 Nov                  |
| NB-31 | A section stays with its diagram. A long list is split. What must be remembered stands out, for example on a sticky note.                                                                                                                        | owner, 16 Nov and 22 Nov       |
| NB-51 | The dashboard that opens a notebook is calm too. In stage 1 it shows where to continue reading, the chapters with their state, and the cards that are due.                                                                                       | owner, 25 Nov (audit A5)       |
| NB-56 | Reading is smooth: nothing jumps when a page opens or an option is tapped, and no word breaks in its middle.                                                                                                                                     | owner, 25 Nov; faults 7 and 15 |
| NB-63 | Nothing stands in the way while customizing: no card or toast covers what the owner works on.                                                                                                                                                    | owner, 25 Nov; faults 8 and 12 |

## 4. What the app does (when ... then ...)

### 4.1 From Claude into the app

| Id    | The line                                                                                                                                                                                                                                                                                            | From                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| NB-40 | When the owner asks Claude Code to "make a notebook on X from these sources", then Claude first asks a few quick questions (goal, level, depth, focus, layout, cards) and then writes one file.                                                                                                     | owner, 16 Nov and 22 Nov                                                   |
| NB-41 | When the owner brings that file into the app (by "Paste notes" or as a zip), then the whole notebook is there, with everything Claude wrote: the pages, the boxes and their looks, the shapes and their text, the arrows, the pen marks, the highlights, the pictures, the mind maps and the cards. | owner, 22 Nov and 25 Nov. New: no format writes boxes, looks or ink today. |
| NB-44 | When the import is done, then no box lies on another box by mistake, no box runs off the sheet, no picture is empty or broken, and no mind map has its branches cut off.                                                                                                                            | owner, 25 Nov ("no glitches"); fault 9                                     |
| NB-45 | When a chapter is imported, then its Summary is filled.                                                                                                                                                                                                                                             | New: today the Summary stays empty (fault 10)                              |
| NB-46 | In stage 1 there is no connector: the owner brings the file in by hand.                                                                                                                                                                                                                             | owner, 22 Nov                                                              |

### 4.2 Opening and reading

| Id    | The line                                                                                                                                                   | From                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| NB-50 | When the owner opens a notebook, then a dashboard shows first.                                                                                             | owner, 25 Nov. Partly exists (the Study tracker's dashboard). |
| NB-07 | When the owner opens a chapter of a notebook that Claude wrote, then the Summary shows first.                                                              | owner, 25 Nov. New: today Notes shows first.                  |
| NB-52 | The chapters show in the page list on the left and on the dashboard, as the same pages. The page list holds their order.                                   | owner, 25 Nov (audit A6)                                      |
| NB-53 | The row of options under a page's name shows Summary, Notes, Mind map and Review for such a notebook. "Database" stays off until the owner switches it on. | owner, 25 Nov. Exists, off by default.                        |
| NB-54 | When the owner reads on the tablet, held upright or sideways, then the text can be read with no zoom.                                                      | owner, 25 Nov. iPad.                                          |
| NB-55 | When the owner opens the app on the phone, then the cards that are due can be read and answered. Nothing else is needed on the phone in stage 1.           | owner, 25 Nov. Exists (the phone Review screen).              |
| NB-10 | The owner reviews the cards with the Review that the app has. The Review screens are not changed in stage 1.                                               | owner, 25 Nov                                                 |

### 4.3 Customizing on the PC

| Id    | The line                                                                                                                                                                                                                                                                                | From                               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| NB-60 | When the owner does one of these on a page that Claude wrote, then it works as on a page made by hand: open; read; fix a sentence; rewrite a box; highlight; change colour and size; add a box beside; paste a picture; move things; save and sync; change the mind map; change a card. | owner, 25 Nov (the twelve actions) |
| NB-61 | Each of these steps is undone by one Undo.                                                                                                                                                                                                                                              | the design rules                   |

### 4.4 Shapes that hold text, and the diagram in a box (stage 1, owner 25 Nov)

| Id    | The line                                                                                                                                                                                                                                                                                                      | From                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| NB-74 | When the owner makes a text box taller, then the whole of the box can be drawn on and typed in at once, with no extra step.                                                                                                                                                                                   | owner, 25 Nov. A fault today. iPad.                                                     |
| NB-75 | The Shapes tool works as it does today. A shape drawn with the tick off is drawn over what is there and holds no text.                                                                                                                                                                                        | owner, 25 Nov. Exists.                                                                  |
| NB-78 | The Shapes tool has a tick in its own settings in the Tool bar. With the tick on, a shape that is drawn can hold text.                                                                                                                                                                                        | owner, 25 Nov. New.                                                                     |
| NB-79 | The tick is offered for shapes with an inside: box, square, oval, circle, triangle. A line and an arrow never hold text.                                                                                                                                                                                      | owner, 25 Nov. New.                                                                     |
| NB-80 | When the tick is on and the owner draws such a shape inside a text box, then it acts as a text box: a tap in its middle or on its text puts the typing cursor there; a tap on its edge or corner picks it, and the bar for moving and changing it shows. The shape belongs to the text box and moves with it. | owner, 25 Nov. New. iPad.                                                               |
| NB-81 | When the text in such a shape needs more room, then the shape grows and keeps its form: a circle stays a circle. The text stays in the middle. The shape never gets smaller than it was drawn, and the text never gets smaller. It is the same idea as a text box that grows with its text.                   | owner, 25 Nov. New; no known app documents it, so it is tried on the real tablet. iPad. |
| NB-82 | When the owner presses Enter in such a shape, then the next line starts and the shape grows to hold it.                                                                                                                                                                                                       | owner, 25 Nov. New.                                                                     |
| NB-83 | When the owner makes such a shape larger by hand, then the whole of its inside can be typed in.                                                                                                                                                                                                               | owner, 25 Nov. New.                                                                     |
| NB-76 | When the owner draws an arrow with Shapes between two shapes inside a text box, then the arrow shows, stays where it was drawn, and moves with the text box.                                                                                                                                                  | owner, 25 Nov; faults 1 and 2. iPad.                                                    |
| NB-77 | When Claude writes a diagram, then the owner can change each shape, its text and each arrow.                                                                                                                                                                                                                  | owner, 25 Nov. In stage 1.                                                              |

Lines that the first draft had and this draft folds into others: NB-22 (highlights move with the words) and NB-25 (a diagram is not a flat picture) are now part of the one test, NB-01, and of the goal NB-24.

## 5. Direction for what is built after stage 1 (one page; gets its lines when its turn comes)

- **The map of a whole notebook** as one more view of its chapters: for looking, and for opening a chapter. Not there today.
- **"Database" as an option** in the row: the whole database of the notebook, with filters by time and date, the owner's own filters and trackers. Mostly there; off by default.
- **A fuller dashboard**, and "Dashboard" as an option in the row.
- **Pages under pages inside a database**: shown as in the page list, with an arrow to open a level.
- **Lines that stay joined to boxes.** Turning a box or a sticky note.
- **Other people's preferences** for the structure of a notebook (stage 3).
- **The connector**, so that a notebook arrives with no file (the end of stage 2).

## 6. Open points

**Questions to the owner:** none is open. The owner and Fable go through the lines; a line is approved only by the owner's yes.

**For Opus to prove in the real app before the spec is closed**

- NB-07: what decides which option shows first, and what it costs to change it for one notebook.
- NB-50 and NB-51: what the Study tracker's dashboard and the "Continue where you stopped" strip give today, on a notebook that Claude wrote.
- NB-74: why the case fails after the fix of issue #64.
- NB-78 to NB-83: what a drawn shape is in the app today, and what is missing for it to hold text.
- NB-01: for each kind of thing Claude can write, the tool that changes it, proven on the tablet and on the PC (the eraser on a pen mark and on a highlight; the handles on a picture; the parts of a diagram).
- "The four levels" in STATE: what they are.
- The fifteen faults of [the real-app page](../../mockups/notebook-look/real-app/README.md): which are real, and which block these lines.

## 7. Not in stage 1

Rework of the Review screens. The map of a whole notebook. Trackers and custom filters. Rows under rows. Lines joined to boxes. Anything on the phone but answering cards. A connector.
