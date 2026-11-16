# Gemini prompt v3: YouTube video + frames → visual study pack (16 Nov 2026)

Replaces v2. Paste the box into Gemini, fill the [brackets], attach the frames folder (files like `frame-012-at-01m00s.jpg`, one every ~5 s, up to 100) and the YouTube link.

```
# Why this matters
I am building a study app that joins GoodNotes (Apple Pencil, paper pages) and Notion (databases, tags). From one source I make a visual study pack that I read like a book, recall from, and find again later. Your answer is turned into real app blocks, so follow the markers exactly. I will edit everything afterwards, so clear structure beats long text.

# My answers
- Goal: [Study and remember / preset name / custom]
- What matters to me: [everything / this part: ...]
- How important: [Must master / Important / Nice to know]  → depth and number of cards
- Writing style: [Simple / Technical with term meanings / custom]
- Tags: [my tags or "suggest 3 to 6"]

# What I give you
1. The YouTube link: watch all of it, speech and screen.
2. Frames named frame-NNN-at-MMmSSs.jpg (the time is in the name). Use only frames that teach: slides, diagrams, code, charts, a tool in use, before/after. Skip faces, duplicates and blurry frames. Refer to a frame by its exact file name.

# Accuracy (most important)
- Only what the video says or shows. Mark your own explanations with (added).
- Never invent numbers, quotes, names or times. If unsure, say so.
- Timestamps only on key moments (5 to 10 in all) as [mm:ss].
- End with "What I could not see or check".

# The app's building blocks (use these markers)
Text
- `## Topic`, `### Subtopic`. Short paragraphs: 2 to 3 sentences, one idea.
- Colour: {blue: text} key term · {green: text} good result / do this · {red: text} warning / don't · {yellow: text} highlight. At most one colour mark per paragraph.
Callouts (one idea each, 1 to 3 sentences)
- `> [!idea]` key idea · `> [!definition]` term: meaning · `> [!example]` example · `> [!warning]` mistake or limit · `> [!tip]` practical tip · `> [!question]` think about this.
Tap to open (toggle): a short line that opens the full detail. Use it for every detail a reader may not need on first read:
  `>> Short line the reader sees`
  `   Full detail shown after tapping (any blocks)`
Pictures
- `![caption: what to notice](frame-012-at-01m00s.jpg)`. Every caption teaches; never "screenshot of...".
Diagrams inside the notes (put one in most topics)
- Flow: `[diagram: flow] A → B → C` (steps, cause → effect).
- Cycle: `[diagram: cycle] A → B → C → back to A`.
- Compare: a table (rows = things, columns = features).
- Small mind map for one topic: `[diagram: mindmap]` then an indented list, 3 to 6 branches.
- `[drawing idea: ...]` one line describing a simple sketch I can draw with the Pencil.
Study blocks
- Big mind map of the whole video: indented list, one centre, 4 to 7 branches, 3 levels at most.
- Slides: `--- slide ---`, a title, one picture or diagram, at most 3 short lines.
- Cards: `Q:` / `A:` and `Cloze:` with {{hidden words}}. One fact per card. A card may show a frame.
- Code and formulas in code blocks, exactly as on screen.

# Make it visual, not decorated
- Every main idea gets a picture, diagram or table beside its words (dual coding).
- Order inside a topic: what it is → how it works (diagram) → why it matters → example → mistake.
- Each topic must fit one paper page with its pictures. Split long lists (e.g. 8 rules → two topics of 4).
- Icons only where they carry meaning and always the same meaning; never one on every line.
- White space beats more content. No hype, no filler.

# Output, in this order (skip what does not fit my goal)
1. Title · source (channel, link, length) · tags
2. Short notes: the video at a glance; each line ends "→ Topic name" pointing to its detailed topic
3. Detailed notes by topic (blocks above)
4. Big mind map
5. Slides
6. Glossary (definition callouts)
7. Cards (amount from "How important")
8. Explore next (added)
9. What I could not see or check
```
