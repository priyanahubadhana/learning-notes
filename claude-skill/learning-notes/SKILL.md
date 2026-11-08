---
name: learning-notes
description: Turns anything the user gives (a transcript, article, chat answer, PDF, lecture, book chapter) into study notes in the exact Learning Notes import format (ln-skill/1 JSON). Use when the user says "make notes for Learning Notes", "for my notes app", "make a study set", or asks for notes they can paste or drop into their Learning Notes app.
---

# Learning Notes study set

Make a complete study set from the material the user gave you and reply in the Learning Notes import format. The app reads it with a strict reader, so the format must be exact.

## What to do

1. Read all the material. If a PDF or file is attached, use all of it.
2. Write ONE JSON object in the format of `reference/format.md` (`"format": "ln-skill/1"`).
3. Reply with the object in ONE fenced `json` block, then one short line telling the user: "Copy this and use Paste answer in Learning Notes (Prompts, any skill), or save it as `name.lnskill.json` and drop it in." If you can create files, also save the same JSON as `<short-title>.lnskill.json` and offer it for download.
4. No other text inside the block. Use the same language as the material.

## Rules

- **Keep every fact.** Do not drop numbers, names, dates, definitions, steps or examples to be short. Many small points beat a few vague ones. Nothing is invented.
- **Stars and level.** Every point has `stars` from 1 to 10: 8-10 Must know, 4-7 Good to know, 1-3 Extra. Most important first.
- **Icons.** Every point with 8 or more stars gets `icon` (one emoji).
- **Sources linked.** List every source you can name in `sources`, numbered from 1 (the material itself, works it cites, the user's links). Each point lists the numbers it rests on in `sources`; use `[]` when nothing backs it (the app shows it as "unchecked"). Put `[n]` after claims in page bodies. Never invent a source or a link; `url` is `""` when unknown.
- **Unchecked marks.** If you add something that is not in the material (general knowledge), give it `sources: []` so the user sees it is unchecked.
- **Card kinds.** `cards`: at least one for every Must know point (`point` = index in `points`, from 0). Mix `qa`, `cloze` (the question has `{{hidden words}}`), `truefalse` (`a` says True or False and why), `reverse` (term and meaning).
- **Mind map outline.** The app builds the mind map from each point's `topic` (a short group name). Use 3 to 8 topics; points of one topic share the exact same name.
- **Database rows.** Each point becomes one row of the notebook's database (text, stars, level, topic, sources). Keep `text` self-contained, under 1,000 characters.
- **Pages.** 2 to 8 detailed `pages` in Markdown, grouped by topic, with `[n]` marks.
- Limits: at most 200 points, 300 cards, 40 pages, 100 sources, 400,000 characters in all.

## Full example

```json
{
  "format": "ln-skill/1",
  "title": "Mitochondria and ATP",
  "summary": "Mitochondria make most of a cell's ATP by cellular respiration. They have two membranes and their own DNA.",
  "keywords": ["mitochondria", "ATP", "cellular respiration", "cristae"],
  "sources": [
    {
      "n": 1,
      "title": "Lecture transcript, week 3",
      "url": ""
    },
    {
      "n": 2,
      "title": "Biology 2e, OpenStax, chapter 4",
      "url": "https://openstax.org/books/biology-2e"
    }
  ],
  "points": [
    {
      "text": "Mitochondria make most of the cell's ATP through cellular respiration.",
      "stars": 10,
      "icon": "🔋",
      "topic": "Function",
      "sources": [1, 2]
    },
    {
      "text": "A mitochondrion has an outer membrane and a folded inner membrane; the folds are called cristae.",
      "stars": 8,
      "icon": "🧬",
      "topic": "Structure",
      "sources": [1]
    },
    {
      "text": "Mitochondria have their own circular DNA, which supports the endosymbiont theory.",
      "stars": 5,
      "icon": "",
      "topic": "Structure",
      "sources": [2]
    },
    {
      "text": "Muscle cells hold more mitochondria than skin cells.",
      "stars": 2,
      "icon": "",
      "topic": "Function",
      "sources": []
    }
  ],
  "pages": [
    {
      "title": "Function",
      "body": "## ATP production\n\nMitochondria make most of the cell's ATP [1][2]. Cells that need more energy, such as muscle cells, hold more of them."
    },
    {
      "title": "Structure",
      "body": "## Membranes\n\nThere are two membranes. The inner one is folded into cristae [1]. The organelle has its own circular DNA [2]."
    }
  ],
  "cards": [
    {
      "kind": "qa",
      "q": "Which organelle makes most of the cell's ATP?",
      "a": "The mitochondrion.",
      "point": 0
    },
    {
      "kind": "cloze",
      "q": "The folds of the inner membrane are called {{cristae}}.",
      "a": "cristae",
      "point": 1
    },
    {
      "kind": "truefalse",
      "q": "Mitochondria have no DNA of their own.",
      "a": "False. They have their own circular DNA.",
      "point": 2
    },
    {
      "kind": "reverse",
      "q": "Cristae",
      "a": "The folds of the inner mitochondrial membrane.",
      "point": 1
    }
  ]
}
```

More detail on every field: `reference/format.md`.
