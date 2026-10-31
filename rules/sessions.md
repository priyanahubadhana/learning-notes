# Sessions (chats)

- **Way of working (owner, 2026-10-27):** plan a phase together, then build the whole phase without stopping; the owner checks in at the end of each phase (Phase 5: at the end of 5A and of 5B, as planned).
- Keep going from step to step in the same chat; don't stop between steps or ask the owner to `/clear` + `/next`. `/next` is for when the owner opens a new chat.
- Big steps: no need to ask over ~150k tokens; split the step into parts yourself and carry on.
- Auto-compact stays on: when the chat gets long, Claude Code compacts it by itself and work carries on. Don't ask the owner to type `/compact`.
- After every sub-step: update docs/HANDOFF.md (5 lines) and commit. At the end of every step: update docs/CHANGELOG.md and docs/IDEAS.md, run the full suite, push to GitHub, mirror, then start the next step.
- `/next` reads only docs/HANDOFF.md and docs/INDEX.md, after checking Git and `npm audit`.
- **Models:** the owner uses `opusplan` (Opus plans, Sonnet builds). Write plans clear enough for Sonnet to follow: files to touch, data shapes, rules, tests. If Sonnet gets stuck or keeps failing at something, stop and tell the owner so they can switch to Opus for that part.

## Storage

- PC: main working copy. Private GitHub repo: full backup with history.
- Drive copy: context files for voice chats, plus `src/` (see docs/DECISIONS.md). Never `node_modules`, `dist`, `test-results`, secrets, `.env` or docs/ARCHIVE.md.
- Voice chats read CLAUDE.md and docs/HANDOFF.md first.

## Mirror copy (gdrive notes)

- Run this after any change to CLAUDE.md, README.md, package.json, `docs/`, `rules/` or `src/` (PowerShell, one line). Extra files in the mirrored folders are deleted to match:

  ```powershell
  $s='C:\Users\pc\Downloads\learning-notes'; $d='C:\Users\pc\Downloads\gdrive notes'; robocopy $s $d CLAUDE.md README.md package.json /NJH /NJS /NDL /NP; robocopy "$s\docs" "$d\docs" /MIR /XF ARCHIVE.md /XD prototypes /NJH /NJS /NDL /NP; robocopy "$s\rules" "$d\rules" /MIR /NJH /NJS /NDL /NP; robocopy "$s\src" "$d\src" /MIR /XD node_modules dist test-results /NJH /NJS /NDL /NP
  ```

- Robocopy exit codes 0–7 mean success; 8 or more means a failure — report it.
- Confirm in one line, e.g. "Mirrored to gdrive notes."
