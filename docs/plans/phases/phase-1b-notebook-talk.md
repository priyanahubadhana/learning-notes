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

## 6. What comes next

1. The owner's answers go into section 5.
2. Sample pictures of one chapter (a summary page, a notes page, the mind map) in the app's own design, for the owner's choice of the look.
3. The big spec with numbered lines; the owner and Fable go through it line by line.
