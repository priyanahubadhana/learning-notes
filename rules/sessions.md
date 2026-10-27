# Sessions (chats)

- One full step per chat, not one sub-step per chat (e.g. all of Step 5 — 5a, 5b, and so on — in the same chat). Only suggest a new chat when a whole step is finished.
- Build a whole step on your own, asking less. Ask first only if a step looks bigger than ~150k tokens (give an estimate and a split). Token counts are estimates.
- Auto-compact stays on: when the chat gets long, Claude Code compacts it by itself and work carries on. Don't ask the owner to type `/compact`.
- At the end of a full step: update the README handoff, CHANGELOG and IDEAS, commit, then tell the owner to start fresh (see below).
- Start a new chat with `/next` (see `.claude/commands/next.md`).
- Models: remind the owner to use **Opus** for planning and tricky problems and **Sonnet** for routine building and tests, to save usage (switch with `/model`). If Sonnet gets stuck on a bug, suggest switching back to Opus.
- At the end of a full step, tell the owner to type `/clear` (or open a new chat), then `/next`.

## Mirror copy (gdrive notes)

- Whenever you create, edit or delete any of CLAUDE.md, README.md, IDEAS.md, LEARNING.md, package.json, `rules/` or `src/`, apply the same change to the copy in `C:\Users\pc\Downloads\gdrive notes`.
- Run this after each change (PowerShell, one line). It copies the five files and mirrors `rules/` and `src/` (extra files there are deleted to match). Never node_modules, dist or test-results:

  ```powershell
  $s='C:\Users\pc\Downloads\learning-notes'; $d='C:\Users\pc\Downloads\gdrive notes'; robocopy $s $d CLAUDE.md README.md IDEAS.md LEARNING.md package.json /NJH /NJS /NDL /NP; robocopy "$s\rules" "$d\rules" /MIR /NJH /NJS /NDL /NP; robocopy "$s\src" "$d\src" /MIR /XD node_modules dist test-results /NJH /NJS /NDL /NP
  ```

- Robocopy exit codes 0–7 mean success; 8 or more means a failure — report it.
- Deleting one of the five top-level files is not mirrored by the command; delete the copy by hand.
- Confirm in one line, e.g. "Mirrored to gdrive notes."
