# Prompt library and skills

Security rules: [rules/security.md](../../rules/security.md). Check them before building. Plan: [../plans/prompt-library-plan.md](../plans/prompt-library-plan.md). Research: [../research/prompt-library-2026-11.md](../research/prompt-library-2026-11.md). Builds on [database.md](database.md) (the library is a database) and [ai.md](ai.md) (keys, models, cost).

## Purpose

A searchable, editable library of prompts, and "skills": a saved recipe that turns ONE input (pasted transcript or text, a page, a PDF) into a whole study set in one go. Uses the owner's own AI keys, or no key at all (paste-in path). Built 9 Nov 2026.

## How it works

- **Where:** a "Prompts" button in the Library header and on every source page (next to the AI buttons, shown even when AI is off), and "Use a saved prompt" inside Ask this book. All code is lazy (`src/prompts/`); only the button is in the first load.
- **Library = a database (part 1):** `Database.kind = 'promptLibrary'` (rows in the hidden Databases notebook, found by workspace and kind). 15 columns found by `config.key` (`promptModel.ts` `LIB_KEYS`): Kind (prompt or skill), Purpose (8), Input (text, page, PDF), Output (answer, notes, cards, study set), Subject tags, Prompt text, Preferred company, Preferred model, Use preferred (toggle), Stars (average of result ratings), Versions (JSON), Ratings (JSON), Skill makes, Starter id, Licence. So it also opens as an ordinary database (table, board, search). No Dexie version.
- **Seeds:** `seedPrompts.ts` (lazy): 12 own learner prompts, 4 rewritten ideas from the CC0 collection awesome-chatgpt-prompts (licence note kept in each row), 3 own skills. Added once per starter id (`seedLibrary`; ids seen on this device are remembered in the pref `prompts.seeded`), never overwritten, a deleted one stays deleted on this device. A starter appearing twice (two devices seeding at once) shows once.
- **List:** search box (name, then subject tags, then text; every word must match; Enter runs the top result), filters Kind, Purpose, Subject, "Show N more" after 50, New prompt, New skill, Edit. Delete moves the row to Trash with Undo.
- **Picker (part 2):** the same list; a row opens the run view. In Ask this book a row fills the question box. The input is the open page, the PDF of an open book, pasted text, or a PDF file (`inputSource.ts`; PDF text read page by page with `[p. n]` marks; at most 300,000 characters).
- **Cost before running:** `promptRun.ts` `estimateCost` uses the model table and `costOf` (same numbers as the monthly cap): "About ₹0.42 · 3,000 tokens in, up to 2,000 out · Claude Haiku 5.5". Rupees use `ai.inrPerUsd` (pref, default 90). "Use preferred" picks the row's company and model if a key for it exists.
- **Plain prompt run:** prompt text + answer format + the input; the answer is editable, rated, added to the page under a heading (marked AI, one Undo) or copied; cards-output prompts go through the existing card approval list.
- **Skill run (part 3):** ONE call returns everything as JSON (`ln-skill/1`, `skillFormat.ts`): title, summary, keywords, sources `[n]`, points (text, 1-10 stars, emoji icon, topic, source numbers), pages (Markdown with `[n]`), cards (qa, cloze, truefalse, reverse). Levels: 8-10 Must know, 4-7 Good to know, 1-3 Extra. Must-know points always get an icon (emoji picked by the AI, star if missing), a mind-map node with the icon, and at least one card. Points with no source are marked "unchecked". The long input is sent first as a cached block for Claude (`cache_control`; `AiCall.cachePrefix`), other companies get the same words in one string. A skill with only keywords, summary and rows uses the cheapest model. **Fact check** (optional, button in the preview, its own cost line first): a different model than the main call when there is one, else the cheapest; doubted or wrong points are flagged and count as unchecked.
- **Preview (part 4):** every part has a section tick (summary, keyword summary with the key points, mind map, database rows, pages, cards, sources); every point, page, card and source can be edited and unticked; stars can be changed. Save into an existing notebook or a new one (default name "Research book"). Saved as: an overview page (summary, keyword summary by level, mind map block, a database block of the points, sources at the bottom), detailed pages under it, a Cards page; all blocks marked AI with one batch id. One Undo removes it (a new notebook is removed whole; in an old notebook only the pages and database made). If saving fails half-way, what was made is removed again. After Undo the preview is still there with its edits.
- **Paste-in (part 5):** "No AI key? Use any AI chat (free)" in every run view: Copy puts the prompt, the exact answer format and the input on the clipboard; Paste answer reads the reply. Plain answers: cleaned (control and invisible characters) and limited to 200,000 characters. Skill answers: the same strict reader as an answer from the app (`parseSkillAnswer`): at most 400,000 characters, JSON only (a code fence or a sentence around it is tolerated), unknown fields ignored, strings cut and cleaned, stars clamped, only http/https links, emoji-only icons, source numbers must exist, limits on points (200), cards (300), pages (40), sources (100). A refused answer shows a plain reason and changes nothing.
- **Versions and ratings (part 6):** changing the prompt text keeps the old text as a version (30 kept); Restore puts an old text back into the box. After a result, 1-5 stars rate it; the rating belongs to the version current at the time; the row's Stars column is the average (whole stars shown in the table, exact average in the list). The edit screen lists every version with its average and number of ratings.

## Edge cases

- Input over 300,000 characters is cut and the screen says so; over about 80,000 tokens the run is refused ("too much").
- A page that is locked, or in a notebook with Allow AI off, is refused with the usual message; typed or pasted text from the Library needs no notebook switch.
- A key for the preferred company missing: the normal order is used.
- Two devices seeding at once: duplicates by starter id are hidden, not deleted.
- Very large libraries: the list draws 50 rows at a time; search runs over the rows loaded in memory (fine for a few thousand).

## Security check

Own keys only, nothing sent before the cost is shown and the first-use privacy question is answered (same as the other AI buttons). Pasted and returned text is data: limited, cleaned, parsed as JSON (never evaluated), shown as plain text, links limited to http/https, no HTML. Nothing runs on import. Keys never enter prompt rows. Locked pages are checked in `callAi`.

## Tests

- Unit: `src/prompts/library.test.ts` (database made once, seeds with licence notes, versions, ratings, search and filters), `promptRun.test.ts` (cost in ₹ and tokens, preferred model), `skills.test.ts` (strict reader, levels, icons, sources, cached request, cheapest model, fact check), `skillSave.test.ts` (what is saved, unticked items, Undo, rollback), `pasteText.test.ts`.
- E2E (mocked AI, chromium): `e2e/promptLibrary.spec.ts` (library, run a prompt on a page with cost first, skill with fact check, preview, save and Undo, paste-in with no key and no network).

## Gaps closed (9 Nov)

- **Icons:** 66 Lucide icons (ISC, src/prompts/ICONS-LICENSE.txt); a skill may send `lucide:name`; drawn in the preview, saved as the emoji. Tests: icons.test.ts.
- **Note pages:** page ⋯ › Prompts and skills; the answer box is the preview, Insert below, one Undo.
- **Handwriting:** Convert to text and the Write pad can use a saved prompt (pref `ai.readPrompt`; optional). Tests: src/ai/readPrompt.test.ts.

## NotebookLM (9 Nov)

See [notebooklm-import.md](notebooklm-import.md): this feature gets imports from NotebookLM and an optional page tab.
