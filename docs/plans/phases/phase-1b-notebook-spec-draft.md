# The notebook that Claude writes: big spec, third draft (25 Nov 2026, after the audits)

**Status: DRAFT. Not approved. Opus builds nothing from this page.** A line is approved only by the owner's yes. Three questions to the owner are open (section 8). When it is approved, Opus moves it to `docs/features/`.

Where it comes from: [the talk notes](phase-1b-notebook-talk.md) (the owner's words, the code check, the walk-through, the audits). The plan it belongs to: [the plan after phase 1A](../plan-after-1a.md).

## How to read this page

The owner, 25 Nov: "It should be a goal, not a particular condition." "We don't need to limit the quality of output." The lines are of four kinds:

- **Goal.** What good looks like. Claude and Opus are free in how they reach it. A goal sets no number and no list of allowed things. It is proved by a look: Opus looks at the real result, then the owner looks at it on the real device, against the page the owner approved (section 7). A goal has no test with a number.
- **Fence.** What must hold every time, or must never happen. There are few. Each fence has a test.
- **When.** What the app does when the owner does something. Each one has a test through the real screen.
- **Situations.** Where the tests of the fences and the when-lines must hold (section 5).

An id never changes. "Exists" means the code check of 25 Nov found it in the app; "new" means it did not. "iPad" means only the real iPad can prove it. "Fable's" means the line is not the owner's own words; the owner confirms it or takes it out.

## 1. The objective, in the owner's words (25 Nov 2026)

- "I open my app, a notebook should be there with multiple chapters and subpages."
- "It should have a summary kind of note section ... Also a detailed section will be there, easily accessible."
- "A mind map will be there of everything ... which I can just see in a glimpse and get a complete idea of everything."
- "A review card will be there based on this."
- "As much accuracy and depth possible."
- "It should be very visually appealing." "This way our notes will be very interactive." "Make it more like human." And: "Too much information is harmful."
- "It should be easily readable on a tablet. And it should be easily customizable on the PC. That is stage 1 goal."
- "The notebook should not have any glitches. It should be very smooth experience like Apple."
- "Just make sure that any feature you add should be easy to customize."

**The first real notebook:** Claude skills. What they are, how they work, if they work, the best practices. "I read it, after a few days I forgot it."

**What "usable every day" means (owner, 25 Nov):** on the PC, Claude writes a notebook, the app imports it in full, and the owner reads it and corrects it by typing. On the tablet the owner reads. On the phone the owner answers recall cards.

**What this spec replaces, by the owner's newer word of 25 Nov:**

- 22 Nov, "Review and recall cards are out of stage 1": replaced for the cards that a notebook brings. They are in stage 1; the Review screens are left as they are (NB-10).
- 22 Nov, dashboards in stage 2: replaced for the simple dashboard that opens a notebook (NB-50, NB-51). Other dashboards keep their stage.
- 22 Nov, "Pencil fine work stays in stage 2": it stays. The shapes that hold text (section 4.4) are not that work: they are box and shape work, decided for stage 1 on 25 Nov.

## 2. The fences

| Id    | The fence                                                                                                                                                                                                                                                                                                                                                | From                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| NB-01 | **The one test.** Everything that Claude puts into a notebook can be changed by the owner with the tool a person would use for it. A pen mark comes off with the eraser. A highlight comes off with the eraser. A picture can be moved and resized. The parts of a diagram can be changed. Text, a card and a mind map can be edited. Nothing is locked. | owner, 6 Nov and 25 Nov                                              |
| NB-86 | Ordinary text boxes never lie on each other and never sit inside each other. They stand in rows and columns on the sheet. Only a shape that holds text sits inside a text box.                                                                                                                                                                           | owner, 10 Nov (`docs/DECISIONS.md:1031`) and 25 Nov. See question 2. |
| NB-43 | No part of what Claude wrote is dropped without a word. What cannot be placed is named, with its chapter, and the rest still arrives.                                                                                                                                                                                                                    | owner, 25 Nov ("nothing lost")                                       |
| NB-62 | Customizing never loses words or strokes. "Saved" never shows while a stroke is not saved yet.                                                                                                                                                                                                                                                           | owner, 25 Nov; fault 4                                               |
| NB-11 | The sources are named at the end of a page, never at the top and never between the lines. The order of trust: the official Claude and Anthropic documents; then what members of the Claude team said themselves; then others.                                                                                                                            | owner, 25 Nov ("noise")                                              |
| NB-12 | A point that Claude could not check has a small, quiet mark beside it, and the list at the end of the page explains it.                                                                                                                                                                                                                                  | owner, 25 Nov                                                        |
| NB-84 | Text is never typed over other text by accident: with the option off, a shape takes no text.                                                                                                                                                                                                                                                             | owner, 25 Nov                                                        |
| NB-85 | A way of doing something that the app has today is not taken away when a new way is added beside it.                                                                                                                                                                                                                                                     | owner, 25 Nov ("Do not lose that functionality")                     |
| NB-42 | An import never changes or removes a notebook or a page that was there before.                                                                                                                                                                                                                                                                           | Fable's. The owner to confirm (question 3).                          |

## 3. The goals

| Id    | The goal                                                                                                                                                                                                              | From                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| NB-02 | The structure of a notebook comes from the preferences the owner gives to Claude. The app and the notes format do not fix one structure.                                                                              | owner, 25 Nov                                   |
| NB-03 | A notebook has chapters. A chapter is a page. A chapter can have sub-pages, and they can have pages under them.                                                                                                       | owner, 25 Nov. Exists.                          |
| NB-04 | Each chapter has a Summary, Notes, a mind map and recall cards. The names are the app's own: Summary, Notes, Review.                                                                                                  | owner, 25 Nov                                   |
| NB-17 | What a notebook says is as accurate and as deep as its sources allow.                                                                                                                                                 | owner, 25 Nov                                   |
| NB-05 | The Summary gives a brief idea of the whole chapter. It misses nothing that is important. Words that add nothing are noise and are left out; a diagram says it in their place. How long it is depends on the content. | owner, 25 Nov                                   |
| NB-13 | The Summary is led by a picture: a diagram or a flow of shapes that hold text, with arrows, colours and symbols.                                                                                                      | owner, 25 Nov. New (question 1).                |
| NB-06 | The Notes hold the depth. They are one tap away from the Summary.                                                                                                                                                     | owner, 25 Nov. Exists.                          |
| NB-14 | The Notes are led by text: a document of text boxes with their colours and looks, with diagrams and flows between the parts or at the end to explain them.                                                            | owner, 25 Nov                                   |
| NB-08 | The whole mind map of a chapter can be seen, and one glimpse of it gives the complete idea. The owner can zoom in, zoom out and drag it. The mind map can be changed.                                                 | owner, 25 Nov                                   |
| NB-09 | A chapter has the recall cards its subject needs. The owner can say how many in the questions Claude asks at the start.                                                                                               | owner, 25 Nov                                   |
| NB-16 | Claude writes what the subject needs and no more. The number of cards, the size of a mind map and the length of a page follow the subject and the owner's answers at the start.                                       | owner, 25 Nov                                   |
| NB-20 | Claude may use every feature the app has: every kind of block and what a block can hold, every look of a box, pictures, diagrams, shapes, ink, the mind map, cards, databases, tags, and what is added later.         | owner, 25 Nov                                   |
| NB-21 | Text boxes are the main building block. A page reads as a flow through its boxes.                                                                                                                                     | owner, 25 Nov                                   |
| NB-18 | A notebook feels made by a person and is alive to the eye: diagrams in the right place, marks, colour, different sizes of text.                                                                                       | owner, 25 Nov                                   |
| NB-23 | Claude marks a page the way a person does with the Apple Pencil: an arrow, a circle, a star beside what is interesting, a dot, a cross, an underline, a small free-hand sketch. Sometimes a mark, sometimes none.     | owner, 25 Nov                                   |
| NB-22 | Words are highlighted with the text's own highlight colour, so the highlight moves with the words. Pen marks are for what does not hang on a single word.                                                             | owner, 25 Nov (audit point A1)                  |
| NB-24 | A diagram is built so that its parts can be changed: for example one text box as the ground, shapes inside it that hold text, and arrows between them, so that it moves as one thing.                                 | owner, 25 Nov                                   |
| NB-26 | A page is calm and clean, in the spirit of Apple's design and of the app's own design principles. Too much on a page is noise.                                                                                        | owner, 25 Nov                                   |
| NB-15 | Text is larger where it matters more.                                                                                                                                                                                 | owner, 25 Nov                                   |
| NB-27 | Colour helps the eye find things, and it is used in one way through a notebook.                                                                                                                                       | Fable's reading of the owner's references       |
| NB-28 | Titles and short labels can look written by hand. Reading text stays easy to read.                                                                                                                                    | owner, 25 Nov                                   |
| NB-29 | Every look is right in all three themes of the app: Night, Day and Sepia. The owner works in Night.                                                                                                                   | owner, 22 Nov (three themes) and 25 Nov         |
| NB-30 | A page follows the app's frame and its design principles.                                                                                                                                                             | owner, 25 Nov                                   |
| NB-31 | A section stays with its diagram on a sheet. A long list is split. What does not fit goes to the next sheet. What must be remembered stands out, for example on a sticky note.                                        | owner, 16 Nov and 22 Nov                        |
| NB-51 | The dashboard that opens a notebook is calm too. In stage 1 it shows where to continue reading, the chapters with their state, and the cards that are due.                                                            | owner, 25 Nov; the three parts are Fable's pick |
| NB-56 | Reading is smooth: nothing jumps when a page opens or an option is tapped, and no word breaks in its middle.                                                                                                          | owner, 25 Nov; faults 7 and 15                  |
| NB-63 | Nothing stands in the way while customizing: no card or toast covers what the owner works on, and the tool the owner chose stays chosen.                                                                              | owner, 25 Nov; faults 5, 8, 12, 14              |
| NB-89 | A shape that holds text can be picked and moved with a finger or the Pencil, also when it is small.                                                                                                                   | the design rules (targets of 44 pt)             |

## 4. What the app does

### 4.1 From Claude into the app

| Id    | The line                                                                                                                                                                                                                                                                                                                                                                                                                                            | From                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| NB-48 | A notebook skill is kept in the repo. Claude Code runs it when the owner says "make a notebook on X from these sources".                                                                                                                                                                                                                                                                                                                            | owner, 22 Nov. New.                                                        |
| NB-40 | When the skill starts, then Claude first asks a few quick questions (goal, level, depth, focus, layout, cards) and then writes one file. The owner approves the questions and the style once, with a picture.                                                                                                                                                                                                                                       | owner, 16 Nov and 22 Nov                                                   |
| NB-41 | When the owner brings that file into the app (by "Paste notes" or as a zip), then the whole notebook is there, with everything Claude wrote, whatever feature of the app it used. Examples: the pages and sub-pages, boxes and their looks, shapes and their text, arrows, pen marks, highlights, text colours, pictures (also picture files in the zip), mind maps, cards, databases, tags, and which options show in the row under a page's name. | owner, 22 Nov and 25 Nov. New: no format writes boxes, looks or ink today. |
| NB-44 | When the import is done, then no ordinary box lies on another, no box runs off the sheet, no picture is empty or broken, and no mind map has its branches cut off.                                                                                                                                                                                                                                                                                  | owner, 25 Nov ("no glitches"); faults 6 and 9                              |
| NB-45 | When a chapter is imported, then its Summary is filled.                                                                                                                                                                                                                                                                                                                                                                                             | New: today the Summary stays empty (fault 10)                              |
| NB-47 | When the owner removes a notebook that was brought in, then all of it goes as one thing, and one Undo brings it back.                                                                                                                                                                                                                                                                                                                               | owner, 6 Nov ("Remove this AI result", one Undo)                           |
| NB-87 | A pen mark that Claude writes belongs to the line or the box under it, and moves with it, as a mark made by hand does.                                                                                                                                                                                                                                                                                                                              | owner, 8 Nov (the ink rules). Exists for marks made by hand.               |
| NB-46 | In stage 1 there is no connector: the owner brings the file in by hand.                                                                                                                                                                                                                                                                                                                                                                             | owner, 22 Nov                                                              |
| NB-90 | A Test notebook that uses every kind of thing Claude can write is kept in the repo. The tests bring it in.                                                                                                                                                                                                                                                                                                                                          | the stage-1 plan (part N9); the audit of the build machine                 |

### 4.2 Opening and reading

| Id    | The line                                                                                                                                                                                | From                                                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| NB-50 | When the owner opens a notebook, then its dashboard shows first.                                                                                                                        | owner, 25 Nov. New as a first screen; the Study tracker's Dashboard view and the "Continue where you stopped" strip exist. |
| NB-57 | The first screen holds the contents of the notebook as a database inside the page: the chapters are its rows, and the owner can sort them, filter them and see them in the other views. | owner, 25 Nov. Partly exists: the Study tracker lists the top pages of a notebook.                                         |
| NB-53 | The row of options shows Dashboard, Summary, Notes, Mind map and Review for such a notebook. "Database" stays off until the owner switches it on.                                       | owner, 25 Nov. Summary, Notes and Review exist; Mind map and Database exist, off by default; Dashboard is new.             |
| NB-07 | When the owner opens a chapter of such a notebook, then the Summary shows first.                                                                                                        | owner, 25 Nov. New: today Notes shows first.                                                                               |
| NB-52 | The chapters show in the page list on the left and on the first screen, as the same pages. The page list holds their order.                                                             | owner, 25 Nov; "the page list holds the order" is Fable's (question 3)                                                     |
| NB-54 | When the owner reads on the tablet, held upright or sideways, or on the PC, then the text can be read with no zoom.                                                                     | owner, 25 Nov. iPad.                                                                                                       |
| NB-55 | When the owner opens the app on the phone, then the cards that are due can be read and answered. The phone needs the owner's sign-in and sync for this.                                 | owner, 25 Nov. The phone Review screen exists.                                                                             |
| NB-10 | The owner reviews the cards with the Review that the app has. The Review screens are not changed in stage 1.                                                                            | owner, 25 Nov                                                                                                              |

### 4.3 Customizing on the PC

| Id    | The line                                                                                                                                                                                                                                                      | From                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| NB-60 | When the owner does one of these on a page that Claude wrote, then it works: open; read; fix a sentence; rewrite a box; highlight; change colour and size; add a box beside; paste a picture; move things; save and sync; change the mind map; change a card. | owner, 25 Nov (the twelve actions) |
| NB-61 | Each change the owner makes is undone by one Undo.                                                                                                                                                                                                            | the design rules                   |

### 4.4 Shapes that hold text, and the diagram in a box (stage 1, owner 25 Nov)

| Id    | The line                                                                                                                                                                                                                                                                                                                                          | From                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| NB-74 | When the owner makes a text box taller, then the whole of the box can be drawn on and typed in at once, with no extra step.                                                                                                                                                                                                                       | owner, 25 Nov. A fault today (also fault 3). iPad.                                                      |
| NB-75 | The Shapes tool works as it does today. A shape drawn with the option off is drawn over what is there and holds no text.                                                                                                                                                                                                                          | owner, 25 Nov. Opus proves that it works today.                                                         |
| NB-78 | The Shapes tool has one on-or-off option in its own settings in the Tool bar (the owner calls it a tick). With it on, a shape that is drawn can hold text.                                                                                                                                                                                        | owner, 25 Nov. New.                                                                                     |
| NB-79 | The option works for the shapes that have an inside: Box, Oval and Triangle. A Line and an Arrow never hold text.                                                                                                                                                                                                                                 | owner, 25 Nov. New.                                                                                     |
| NB-80 | When the option is on and the owner draws such a shape inside a text box, then the shape acts as a text box that lives inside that text box. With the Text tool, a tap in its middle or on its text puts the typing cursor there. A tap on its corner picks it, and the Action bar shows, as for a text box. It moves with the text box it is in. | owner, 25 Nov. New: a shape is ink today and cannot hold text. iPad.                                    |
| NB-81 | When the text in such a shape needs more room, then the shape grows and keeps its form: a circle stays a circle. The text stays in the middle. The shape never gets smaller than it was drawn, and the text never gets smaller. It is the same idea as a text box that grows with its text.                                                       | owner, 25 Nov. New; no known app documents it. iPad.                                                    |
| NB-82 | When the owner presses Enter in such a shape, then the next line starts and the shape grows to hold it.                                                                                                                                                                                                                                           | owner, 25 Nov. New.                                                                                     |
| NB-83 | When the owner makes such a shape larger by hand, then the whole of its inside can be typed in.                                                                                                                                                                                                                                                   | owner, 25 Nov. New.                                                                                     |
| NB-76 | When the owner draws an arrow with Shapes between two shapes inside a text box, then the arrow shows, stays where it was drawn, and moves with the text box.                                                                                                                                                                                      | owner, 25 Nov; faults 1, 2 and 3. iPad.                                                                 |
| NB-88 | When a pen mark is made over words, then it shows on top of the words.                                                                                                                                                                                                                                                                            | owner, 10 Nov ("ink over text stays the way to write on top of text"); fault 3 (ink hidden behind text) |
| NB-77 | When Claude writes a diagram, then the owner can change each shape, its text and each arrow.                                                                                                                                                                                                                                                      | owner, 25 Nov                                                                                           |

## 5. Situations the tests must hold in

Finger, Pencil and mouse. The tablet upright and sideways, the PC, and the phone for cards. Night, Day and Sepia. Beginner and Professional. A box that was resized; the first box of a page; a box with a shape in it that was moved. A chapter with sub-pages; a long chapter; a chapter with no cards. A notebook brought in twice.

## 6. Examples with real values

- **The first notebook:** "Claude skills", with chapters such as: What a skill is; How a skill loads; Writing a good skill; Do skills work? The evidence; Best practices; Skills, hooks and helpers.
- **A diagram in a box, from that notebook:** one text box "What loads when", with four shapes that hold text (Name and description; Body; Extra files; Scripts) and an arrow from each to the next.
- **The owner's own diagram of 25 Nov** ([the picture](../../mockups/notebook-look/owner-try-2026-11-25.png)): one text box with the words "Opus → two manager →", two arrows down, and under each arrow a circle to type in: "manager 1", "manager 2".

## 7. The approved look (not there yet)

The way of working asks for a picture that the owner approved before a look is built. There is none: the owner rejected the drawn samples of 25 Nov, and the page made in the real app was plain because tools failed. So:

- The parts that make the tools work come first (NB-74, NB-78 to NB-83, NB-76, NB-88).
- Then one chapter is made in the real app, in its frame, and shown to the owner on the tablet and on the PC, in Night and in Day.
- The owner's yes to that page makes it the approved look. Until then no goal of section 3 about the look counts as reached.

## 8. Open points

**Questions to the owner (from the audits of 25 Nov)**

1. **The Summary.** Today the Summary option of a page shows a list of short lines taken from the notes. The owner's Summary is a page led by a diagram (NB-13). What becomes of today's short lines?
2. **Sticky boxes and the 10 Nov rule.** On 10 Nov the owner decided that ordinary boxes never lie on each other. On 25 Nov the owner said that small sticky boxes placed on a large box were right too and must not be lost. Which holds (NB-86)?
3. **Two lines that are Fable's:** NB-42 (an import never changes what was there) and NB-52 (the page list holds the order of the chapters). Yes to each?

**Small questions that come with the build (the daily list):** the name of the option of NB-78; in which of Beginner and Professional it shows; what a shape with the option on does when it is drawn outside any text box.

**For Opus to prove in the real app before a part is planned**

- NB-13 and NB-45: what the Summary option can hold today, and what a Summary made of boxes and diagrams needs.
- NB-50, NB-57 and NB-53: what the Study tracker and its Dashboard view give on a notebook that Claude wrote, and what "Dashboard" as an option needs.
- NB-07: what decides which option shows first.
- NB-74: why the case fails after the fix of issue #64.
- NB-75 to NB-83: what a drawn shape is in the app today; whether the Shapes tool works everywhere as the spec says (one spec says shapes are "still coming").
- NB-01: for each kind of thing Claude can write, the tool that changes it, on the tablet and on the PC.
- NB-55: what the phone needs (sign-in, sync) before cards show there.
- "The four levels" in STATE: what they are.
- The fifteen faults of [the real-app page](../../mockups/notebook-look/real-app/README.md): which are real. Each one that is real blocks the line named beside it in this spec.

## 9. Direction for what is built after stage 1 (gets its lines when its turn comes)

- **The map of a whole notebook** as one more view of its chapters.
- **The row of options as a switch for the database:** a tap on Mind map, Summary or Notes shows the database in that form, with the filters and tools that belong to it (owner, 25 Nov).
- **"Database" as an option:** the whole database of the notebook, with filters by time and date, the owner's own filters and trackers.
- **A fuller dashboard.**
- **Pages under pages inside a database,** shown as in the page list, like heading 1, 2 and 3.
- **Lines that stay joined to boxes.** Turning a box or a sticky note. Boxes that lie on each other (layers), if the owner wants it.
- **Other people's preferences** for the structure of a notebook (stage 3).
- **The connector,** so that a notebook arrives with no file (the end of stage 2). AI inside the app stays a "no" before stage 3.

## 10. Not proved or not built in stage 1

Rework of the Review screens. Other uses of the phone than answering cards. Ink at a zoom other than 100 percent (stage 2). A card made from a box, a box sent to the Summary, handwriting into a box, a box that folds (stage 2). Shapes in the reader, the ruler, tape and the magnifier (stage 2). Trackers and custom filters. Rows under rows. Lines joined to boxes. A connector.
