# Gemini prompt v2: YouTube video → visual study pack (draft, 16 Nov 2026)

Use: paste everything inside the box into Gemini, then add the YouTube link and the frames (screenshots) from the converter. Fill the [brackets] from the questionnaire answers.

```
# Who you are working for and why
I am building a study app that mixes GoodNotes (Apple Pencil, paper pages) with Notion (databases, tags). From one source I make a visual study pack that I read like a book, recall from, and find again later. Your answer will be turned into real app blocks, so follow the format exactly. Everything you make stays editable by me.

# My answers
- Goal: [Study and remember / preset name / custom text]
- What matters to me: [everything / a specific part]
- How important it is: [Must master / Important / Nice to know]  → sets depth and the number of cards
- Writing style: [Simple / Technical with term meanings / custom]
- Tags I want: [tags or "suggest"]

# What I give you
1. The YouTube link. Watch the whole video, including what is on screen.
2. Up to 100 frames from the video, each named by its time (e.g. 04-36.jpg). Use them as pictures in the pack. Choose only frames that teach: slides, diagrams, code, charts, before/after, a tool being used. Skip talking heads and duplicates.

# Accuracy rules (most important)
- Only state what the video says or shows. Anything you add to explain, mark with (added).
- Never invent numbers, quotes, names or timestamps. If you are unsure, say so.
- Timestamps only on key moments (5 to 10 in all), as [mm:ss].
- End with "What I could not see or check".

# Building blocks the app has (use them, by these exact markers)
- `## Heading` and `### Subheading` (topics).
- `> [!idea]` key idea · `> [!definition]` term + meaning · `> [!example]` example · `> [!warning]` mistake or limit · `> [!tip]` practical tip. One callout = one idea, 1 to 3 sentences.
- Tables: comparisons, steps with inputs/outputs, before/after.
- `![caption that says what to notice](04-36.jpg)` pictures from my frames. Every picture has a caption that teaches.
- Flow: `A → B → C` lines for processes and cause → effect.
- Mind map: an indented list, one centre, 4 to 7 branches, 3 levels at most.
- Slides: `--- slide ---` then a title, one picture or diagram, and at most 3 short lines.
- Cards: `Q:` / `A:` and `Cloze:` with {{hidden words}}. One fact per card.
- Code and formulas in code blocks, exactly as on screen.

# How to make it visually strong (not decorated)
- Dual coding: every main idea gets a picture, table or flow next to its words.
- Chunks: short paragraphs (2 to 3 sentences), one idea each; a heading every few chunks.
- Each section must fit one paper page with its pictures; if a list is long (e.g. 8 rules), split it into two sections of 4.
- Clear hierarchy: what it is → how it works → why it matters → example → mistake.
- Icons only when they carry meaning, used the same way everywhere; never one on every line. No filler, no hype words.
- White space beats more content.

# Output, in this order (skip what does not fit my goal)
1. Title, source (channel, link, length), tags.
2. Short notes: the whole video at a glance; each line links to its section ("→ see: Section name").
3. Detailed notes by topic, using the blocks above.
4. Mind map.
5. Slides.
6. Glossary (definition callouts).
7. Cards (amount from "How important").
8. Explore next (added).
9. What I could not see or check.
```
