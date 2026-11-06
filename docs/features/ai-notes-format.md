# Learning Notes Markdown (ln-notes/1)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

One plain format that any AI (Gemini, Claude, ChatGPT, Claude Code, a script) can write, and that the app turns into a finished page: key points, steps, a mind map, cards and screenshot slots. It is the bridge between "paste the link into my AI" and notes in the app, at no cost: the app only builds a prompt (Copy prompt) and reads the answer (Paste notes or a zip). Master plan CR2. The optional built-in AI (CR4) uses the same format, so the AI side is swappable.

## How it works

- **Copy prompt** (Capture screen and every source page): the text holds the source (the link, or the pasted transcript up to 120,000 characters), the format below and the user's extra instructions. Saved presets (device setting, at most 20, 2,000 characters each) keep instructions like "Photoshop tutorial: name every tool icon".
- **Paste notes** (or choose a zip with `notes.md` and `images/`): `parseNotes` (pure, tolerant) reads the answer; `importNotes` writes ordinary blocks to the source page (or a new page in Sources), all marked `source: 'ai'` with one `batchId`. The page says "Made with your AI · edited by you" and offers **Remove this AI result** (soft delete of that batch, one Undo).
- **Limits:** 2 MB of text, 500 cards, zips: 200 MB, 500 entries, 300 MB expanded, 200 pictures of at most 25 MB, picture type decided by its first bytes.

### The format

```markdown
# <title> (optional)

## Key points -> bullet list

- one idea per line

## Steps -> numbered list

1. first step

## Mind map -> the editable mind map block

- Central topic
  - Branch
    - Sub-branch

## Cards -> Card blocks and fill-in-the-blank, scheduled for review

Q: A question?
A: The answer (may continue on the next lines, may hold ![caption](images/x.png)).
Cloze: A sentence with the {{hidden word}} (also {{c1::word}}).

## Screenshots -> placeholder lines "📷 12:34 what to capture"

[12:34] what to capture

## Any other heading -> kept as a heading with its Markdown

Free text, lists, ![caption](images/x.png)
```

Tolerances: heading case, level (`##`/`###`), bold marks, emoji and colons in headings; `Question:`/`Answer:`, `Q1:`, `**Q:**`; synonyms (Key takeaways, Workflow, Flashcards, Key frames…); the whole answer wrapped in a code fence; text with no headings at all (kept as plain notes).

### Full example

```markdown
# How to Sketch Faces

## Key points

- Start with a light oval
- Mark the eye line halfway down

## Steps

1. Draw the oval
2. Draw the guide lines

## Mind map

- Faces
  - Shape
  - Guides

## Cards

Q: Where does the eye line sit?
A: Halfway down the oval.
Cloze: The {{eye line}} sits halfway down.

## Screenshots

[0:45] the oval guide
[12:34] the shading step
```

## Edge cases

- A mind map becomes the mind map block (an editable tree, never a picture). A cloze with no `{{...}}` is a plain sentence.
- A picture reference without a matching file in the zip keeps its caption as text.
- "Remove this AI result" removes only that answer's blocks; cards made from them stay in the database but are skipped by reviews while the blocks are deleted.

## Security check

- Nothing is sent anywhere by this feature (tests replace `fetch`).
- Links in notes are kept only if https; HTML is never read here (Markdown only); zips are read by name with size and entry limits; no file is written outside the app.

## Tests

- `src/capture/notes.test.ts` (three fixtures: Gemini-style, Claude-style, broken; prompt; presets; import; picture refs; remove and restore; zip guards), `e2e/capture.spec.ts`.
