# Prompt library ("ocean") — research, 2026-11

Goal: a large, searchable library of prompts inside the app, opened from a **Prompts** tool.
Users browse/filter by tag, purpose and subject/chapter, and search title, heading and text.
Each prompt is a full rich-text page (BlockNote), with variables (`{selection}`, `{page}`,
`{chapter}`…), run from every AI action: Ask this book, Summarise, Key points, Cards,
Convert to text, Write pad AI. Summarise / Key points / Cards become editable starters with Reset.

Sources were checked online on 2026-11-08 (links below). Where a source could not be reached,
it says so.

## Owner rule change to log

The owner approved a **searchable picker** for prompts. This overrides the old "native
`<select>` only" rule **for this picker only**. Log it in docs/DECISIONS.md and update the
rule file when the phase is planned (rule change = owner OK, already given).

## 1. How others do it

| Product                   | Structure                                                                                | Categories / search                                                                      | Rating         | Versions                                            | User-made           |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------- | ------------------- |
| Anthropic prompt library  | System prompt + user prompt per example                                                  | Two groups (work / play) at launch, plus user-submitted; later coding, writing, analysis | None           | None                                                | Copy into Console   |
| OpenAI guides             | Instructions + examples (few-shot) in the prompt                                         | Guide pages, not a catalogue                                                             | None           | Saved prompts in platform                           | Yes (platform)      |
| Google Gemini / Vertex    | Prompt gallery with good-vs-bad examples; chain-of-thought, few-shot                     | Gallery by task                                                                          | None           | Saved prompts in Vertex                             | Yes                 |
| Raycast AI Commands       | Title, icon, prompt, model; `{selection}`, `{argument name="Language"}`, clipboard, date | Command palette search                                                                   | Store installs | None                                                | Yes, import/export  |
| AIPRM                     | Title, teaser, category, `[PROMPT]`, `[TARGETLANGUAGE]`                                  | Category + topic filters, search                                                         | Votes, views   | None                                                | Yes, public/private |
| PromptBase                | Paid listing, preview, model tag                                                         | Category, model, search                                                                  | Reviews, sales | None                                                | Sellers only        |
| FlowGPT / PromptHero      | Community prompts (PromptHero = image prompts)                                           | Tags, trending                                                                           | Likes          | None                                                | Yes                 |
| Notion AI                 | Saved prompts in workspace, act on page/selection                                        | `/` menu list                                                                            | None           | Page history                                        | Yes                 |
| PromptLayer               | Template + variables + model params                                                      | Registry folders                                                                         | None           | Every save = version; labels (`prod`, `staging`)    | Yes                 |
| LangChain Hub (LangSmith) | Prompt template with commits                                                             | Owner/name, tags                                                                         | Likes          | Commits; movable tags; staging/production promotion | Yes                 |
| awesome-chatgpt-prompts   | `act` + `prompt` rows in `prompts.csv`                                                   | Flat list + site search                                                                  | GitHub stars   | Git history                                         | Pull requests       |

Patterns that work everywhere:

1. **Few fixed fields:** title, body, short teaser, category, tags, target action, optional model.
2. **Few named variables** filled by the app, plus at most one runtime question
   (Raycast `{argument}`).
3. **Search first, filter second:** one box, then chips for category/tag; pinned and recent on top.
4. **Starters are copies, not locked** (AIPRM, Raycast store).
5. **Versions as named pointers** (PromptLayer labels, LangSmith tags). For one person, page
   History + "Reset to starter" is the same idea with no new table.
6. **Plain-file import/export** (CSV/JSON/Markdown) is how open collections spread.

Weak points: huge unchecked catalogues (AIPRM says community prompts are not tested by AIPRM),
paid prompts with unclear rights, prompts that silently send the whole book (breaks our
"Show what will be sent" promise).

## 2. Licensing verdict

| Collection                                        | Licence                                        | Can we bundle?                                   |
| ------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| awesome-chatgpt-prompts (prompts.csv, PROMPTS.md) | **CC0 1.0** (prompt data); site code MIT       | **Yes.** No attribution needed; we credit anyway |
| Our own prompts                                   | Ours                                           | **Yes** (preferred)                              |
| Anthropic prompt library                          | No public licence found for the library pages  | **No** — re-write in our words                   |
| Anthropic courses repo                            | CC BY-NC 4.0 (non-commercial)                  | **No** (blocks commercial use)                   |
| OpenAI / Google guides                            | Normal site terms, no open licence             | **No** — learn ideas only                        |
| PromptBase                                        | Buyer gets a use licence; creator keeps rights | **No** (no redistribution)                       |
| AIPRM, FlowGPT, PromptHero                        | Platform terms; rights stay with authors       | **No**                                           |
| PromptLayer, LangChain Hub                        | User-owned prompts on a service                | **No**, unless a prompt itself is marked MIT/CC0 |

**Recommendation:** ship only **our own prompts** plus a **curated, rewritten subset of
awesome-chatgpt-prompts (CC0)**. Ideas and techniques (few-shot, step by step, role) are not
copyrightable; exact wording is — so write our own text. Keep a `source` and `licence` field on
every bundled prompt so an audit is one query.

Note: most of awesome-chatgpt-prompts is "Act as …" role play, general chat. Few fit learners.
Expect to keep ~5–10% of it; the learner starters must be ours.

## 3. Design for our code

### Where prompts live (fits the existing pattern, no new Dexie version)

- Hidden notebook with `kind: 'prompts'` (add to the `kind` union in `src/core/types.ts`), seeded
  like the Templates notebook with `starterVersion`.
- **Each prompt = one page**, body = its blocks. Free: BlockNote editing, History
  (`pageVersions`), tags (`*tagIds`), lock, sync (`pages`/`blocks` already in `sync/tables.ts`).
- Optional `Page.prompt` meta (optional field = no schema change, like `Notebook.allowAiLocked`):
  ```ts
  prompt?: {
    for: AiTarget[];              // which actions show it
    purpose: PromptPurpose;       // taxonomy, below
    subjects?: string[];          // 'biology', 'law'… free, lower-case
    output: 'answer'|'text'|'cards'|'replace';
    starterId?: string;           // set on shipped prompts, used by Reset
    source?: 'own'|'cc0-acp';     // licence audit
    pinned?: boolean; lastUsedAt?: string; // UTC ISO
  }
  ```
- Chapter is not stored on the prompt; `{chapter}` is filled at run time from the open book.

### Search index that scales to thousands

Rules (rules/scalability.md): indexed queries, no full table scans on keystroke, virtualised
lists, lazy loading.

- Filters use **indexes only**: notebook `kind` → pages by `notebookId`; tags by `*tagIds`.
  `purpose` and `for` need a multi-entry index to be fast at 10k+ prompts. Options:
  (a) put them as reserved tags (`purpose:summarise`, `for:cards`) in `tagIds` — **no Dexie
  version**; or (b) a new index — needs a Dexie version. **Recommend (a).**
- Text search: reuse the app's existing page search (title + headings + text). If it scans,
  build a small **token → pageId** index for the prompts notebook only, updated on save,
  stored in the same table pattern the app search uses. Rank: title > heading > text, then
  pinned, then recent.
- Picker list: **virtualised** (render ~20 rows), results loaded in pages of 50, debounce 150 ms.
- Snippets: store a short `teaser` (first 140 chars, plain text) so the list never loads blocks.

### Shipping a large starter pack (not in first load)

- First load gets only the `kind` string and the "Prompts" button (~0.3 KB). Budget ~7 KB spare:
  keep it there.
- **Core starters (~12 learner prompts)**: a lazy chunk in `src/ai/prompts/starters.ts`,
  imported only when the Prompts tool or an AI action opens.
- **Big pack (hundreds+)**: a static JSON file (e.g. `public/packs/learner-v1.json`, gzipped,
  served by our free host). Downloaded only when the user taps "Add prompt pack", inserted in
  `bulkPut` batches of 200 inside one transaction, with `starterVersion` per pack so upgrades
  add new prompts and never overwrite edited ones.
- Packs are translated per language file (`learner-v1.hi.json`), English fallback.

### Variables

`{selection}`, `{page}`, `{title}`, `{notebook}`, `{chapter}`, `{highlights}`, `{language}`,
`{today}` (UTC date shown local), and one `{ask:Question}` box at run time (Raycast-style).
Rich text → markdown (existing AI export) → fill variables → "Show what will be sent" shows
the final text. Each variable passes the lock check in `callAi`. Unknown names stay as text
with a warning. Later: variable chips as BlockNote custom inline content (built in, no package).

### Running and Reset

- Each AI action opens the **searchable picker** filtered by `for`; Enter runs the top result.
- Summarise / Key points / Cards are starter prompts with `starterId`. **Reset** copies the
  shipped text back (the edit stays in History). If the starter is deleted, the action falls
  back to the built-in text so AI never breaks.

### Import / export

- Export one, a filter result, or all as JSON: `{ version, prompts: [{ title, markdown,
prompt meta, tags }] }`. Reuse `share/` code. Also accept **CSV with `act,prompt` columns**
  so users can import awesome-chatgpt-prompts directly (their choice, CC0).
- Import: validate size and fields (rules/security.md), strip scripts/links, mark as user-made,
  never run on import.

### Taxonomy for learners (purpose = one; tags = many)

Purposes: Understand (explain, simplify, analogy) · Summarise · Key points · Recall (cards,
cloze, quiz) · Check (find gaps, fact check, mistakes) · Practise (problems, essay plan) ·
Write (rewrite, outline, translate) · Read (chapter recap, characters, no spoilers) · Clean
(OCR/handwriting fix) · Plan (study plan, revision timetable).
Subjects: free tags, with a starter list (maths, science, history, languages, law, medicine,
code, business, arts). Level tags: `beginner`, `exam`, `deep`.

### Starter prompts (our own wording)

Summarise · Key points · Make recall cards · Cloze cards · Explain like I am new · Quiz me ·
Find gaps · Translate and keep terms · Chapter story so far (no spoilers) · Fix my handwriting
text · Study plan for a chapter · Teach it back (Feynman check).

## 4. New dependencies

**None needed.** BlockNote, Dexie, markdown export, sync and share code exist. A virtual list
can be ~60 lines of our own code. Flag only if we later want a fuzzy-search library
(e.g. MiniSearch, MIT, ~7 KB gz) — would have to stay in the lazy chunk; ask first.

## 5. Owner decisions needed

1. OK: `kind: 'prompts'` + optional `Page.prompt`, purpose/for as reserved tags (no Dexie version)?
2. OK: bundle only our own prompts + rewritten CC0 awesome-chatgpt-prompts; no others?
3. Big pack as a downloadable JSON from our free host (not in the app bundle)?
4. Log the searchable-picker rule change (approved) in DECISIONS.md and the rule file.
5. Which phase this belongs to (beyond the current phase as built).

## Sources

- awesome-chatgpt-prompts (CC0 prompts, MIT code): https://github.com/f/awesome-chatgpt-prompts
- Raycast AI Commands / placeholders: https://manual.raycast.com/ai/ai-commands ,
  https://manual.raycast.com/windows/raycast-ai
- PromptLayer registry and release labels: https://docs.promptlayer.com/features/prompt-registry ,
  https://docs.promptlayer.com/features/prompt-registry/release-labels
- LangSmith / LangChain Hub prompts and tags: https://docs.langchain.com/langsmith/manage-prompts ,
  https://docs.smith.langchain.com/prompt_engineering/how_to_guides/prompt_tags
- PromptBase buyer licence: https://promptbase.com/knowledge-base/prompt-purchases
- Anthropic prompt library coverage (work/play, user-submitted):
  https://www.tomsguide.com/ai/anthropic-just-released-a-claude-3-prompt-library-heres-the-best-ones-to-try-now
- Anthropic courses licence (CC BY-NC 4.0): https://deepwiki.com/anthropics/courses/6-license-and-usage
- Google Gemini prompting strategy (chain of thought):
  https://cloud.google.com/distributed-cloud/hosted/docs/latest/gdch/gemini/prompting-strategy
- Vertex AI prompt gallery:
  https://oneuptime.com/blog/post/2026-02-17-how-to-design-effective-prompts-for-gemini-models-in-vertex-ai-studio/view
- OpenAI text generation guide (examples / few-shot): https://platform.openai.com/docs/guides/text
- AIPRM community prompts not tested by AIPRM: https://www.bestaitools.com/tool/aiprm/

Not reached online (from product knowledge, check before quoting): AIPRM, FlowGPT and PromptHero
terms; Notion AI saved-prompt details; Anthropic prompt-library page footer.
