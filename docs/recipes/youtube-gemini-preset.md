# YouTube → Gemini → Learning Notes (owner, 16 Nov 2026)

Flow (owner, 16 Nov): the owner gives Gemini the YouTube link plus the prompt below, then pastes Gemini's answer (and screenshots) into Claude Code. Claude Code creates the notebook with the learning-notes connector (`create_notebook`). No app changes for now. Connector limits today: no mind map block (written as a nested list), no tags, no pictures, no databases.

## Prompt for Gemini (paste it with the YouTube link)

```
Source: a YouTube video (usually 10 to 60 minutes). Watch all of it, including what is on screen (slides, diagrams, code, formulas), not only the speech.
Rules:
- Keep every important idea, definition, number and example.
- Simple words: what it is, how it works, why it matters.
- Put [mm:ss] after each key point, step and card. Only timestamps you really saw; if unsure, leave it out.
- Start anything NOT said in the video with "(added)".
- Never invent facts, numbers, quotes or timestamps.
- Make it pleasant to read: one fitting emoji at the start of each key point.
Sections, in this order; skip any that do not fit:
## Tags: 3 to 6 short topic words, e.g. #photoshop #layers
## Short notes: 5 to 8 lines, the whole video at a glance.
## Key points: most important first.
## Mind map: small; one centre, 4 to 7 branches, at most 3 levels.
## Steps (only if the video shows a process)
## Full summary: the complete explanation, topic by topic, for when I have a doubt. Keep every nuance and example.
## Glossary: "Term: simple meaning", one per line.
## Code and formulas: in code blocks, exactly as on screen.
## Comparisons: Markdown tables.
## Common mistakes
## Cards: at least one per key point; mix Q:/A: and Cloze: lines.
## Screenshots: [mm:ss] what the frame shows and why it matters. Prefer slides, diagrams, code, charts.
## Explore next (added): 3 to 5 topics not in the video.
## What I could not see: say plainly if you only had the transcript or parts were missing.
```
