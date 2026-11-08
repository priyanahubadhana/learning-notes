# Claude Skill (Use with Claude)

Security rules: [rules/security.md](../../rules/security.md). Check them before building. Builds on [prompt-library.md](prompt-library.md) (the `ln-skill/1` answer format and Paste answer). Owner-approved 9 Nov 2026, cost ₹0.

## Purpose

A shareable Claude Skill that turns anything a user gives Claude (transcripts, articles, chat answers, PDFs) into our exact import format. The user, or any app user, copies Claude's reply or saves its `.lnskill.json` file and drops or pastes it into the app. No API key, no server, nothing new to host.

## How it works

- **The Skill:** `claude-skill/learning-notes/SKILL.md` (name `learning-notes`; the description triggers on "make notes for Learning Notes" and "for my notes app"), plus `reference/format.md` (every field). Rules inside: keep every fact, 1-10 stars + level, icons on 8+, sources numbered and linked `[n]`, unchecked = `sources: []`, card kinds (qa, cloze, truefalse, reverse), `topic` builds the mind map outline, each point is a database row, output = ONE fenced JSON block, optionally also a `.lnskill.json` file. One full example sits in SKILL.md.
- **Same format as the app:** there is no second format. The mind map and database rows come from `topic` and `points`, exactly as in the skills run inside the app (`src/prompts/skillFormat.ts`, `parseSkillAnswer`).
- **Sync test:** `src/prompts/claudeSkill.test.ts` reads the SKILL.md example with `parseSkillAnswer` and checks counts, levels, icons, unchecked mark, card kinds and a card for every Must-know point. Change the reader and the example together.
- **The zip:** built at build time by `scripts/skillZip.ts` (fflate; one folder `learning-notes/`, fixed dates) through the Vite plugin `claude-skill-zip` in `vite.config.ts`; served as `/learning-notes-skill.zip` (also in `npm run dev`). Not kept offline by the service worker.
- **Settings › AI › Use with Claude** (`src/ai/ClaudeSkillCard.tsx`): short explainer, "Download the Claude Skill (.zip)", and four steps (download, in Claude open Settings › Capabilities › Skills and upload the zip, say "make notes for Learning Notes", copy the JSON or the file and import).
- **Import by file:** in Prompts, open any skill, "No AI key? Use any AI chat" shows Paste answer, "Import a .lnskill.json file" and drop. The file is read as text (at most 2 MB) and goes through the same strict reader as a paste; a bad file shows the same plain reason and changes nothing.

## Edge cases

- A file over 2 MB: "too long", nothing read. Not JSON: "not in the expected format".
- Claude may wrap the JSON in a sentence or fence: the reader tolerates it.
- If the user unzips before uploading, Claude refuses it; the steps say not to.

## Security check

The file and the pasted text are data: size-limited, parsed as JSON (never evaluated), cleaned, links limited to http/https, emoji-only icons, no HTML. Nothing runs on import. The zip holds only our two text files.

## Tests

- Unit: `src/prompts/claudeSkill.test.ts`.
- E2E (chromium): `e2e/claudeSkill.spec.ts` (Settings card and a real zip download; bad then good `.lnskill.json` file import).

## Later (own phase)

An MCP connector so Claude writes into notebooks directly. Needs a server, sign-in and an end-to-end-encryption design. See docs/IDEAS.md and docs/ROADMAP.md.
