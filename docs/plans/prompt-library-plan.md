# Prompt library and skills: plan (9 Nov 2026)

Answers: DECISIONS "Owner answers 9 Nov (parked features)" and "(skills and research books)". Research: [../research/prompt-library-2026-11.md](../research/prompt-library-2026-11.md). Spec: [../features/prompt-library.md](../features/prompt-library.md).

## Shape

- **Store:** one built-in database (`Database.kind = 'promptLibrary'`, rows in the hidden Databases notebook). No new Dexie version, no new table. Columns (found by `config.key`): Kind (prompt or skill), Purpose, Input, Output, Subjects, Prompt text, Provider, Model, Use preferred (toggle), Stars (average of result ratings), Versions (JSON), Ratings (JSON), Skill parts, Starter id, Licence. Rows are real pages, so the database views, search, sync, backup and Trash already work.
- **Seeds:** our own prompts and skills plus a few rewritten CC0 ones (licence note in the row). Added once per starter id; never overwrite edits; deleted starters stay deleted on this device.
- **Code:** `src/prompts/` (all lazy, one entry `PromptsEntry` from the page AI buttons and Ask this book).

## Parts (one commit each)

1. Library store + seeds + list with search, purpose/subject filters, New prompt, edit, delete with Undo.
2. Picker (search-first list, same look as the model cards) + cost before running in rupees and tokens, preferred provider/model.
3. Skills: one structured-JSON call (`ln-skill/1`), prompt caching of the long input for Claude, cheap model for simple steps, stars 1-10 + level + emoji for Must-know points, sources `[n]`, optional second-model fact check.
4. Preview: edit, untick, choose notebook (existing or new), save as AI-made content, one Undo.
5. Paste-in path: copy the prompt plus the exact answer format; Paste answer goes through the same strict validator and preview.
6. Versions (text changes keep the old text) and 1-5 star rating of each result (average shown on the row).

## Safe choices (also in DECISIONS "Decisions to review")

Icons are emoji chosen by the AI (no new icon set, no bytes added). Mind map nodes carry the emoji in their text. Rupee rate is an estimate in the pref `ai.inrPerUsd` (default 90). Fact check uses a different model than the main call when the user has one, else the cheapest.
