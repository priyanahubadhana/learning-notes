# Sessions (chats)

- **Way of working (owner, 2026-10-27):** plan a phase together, then build the whole phase without stopping; the owner checks in at the end of each phase (Phase 5: at the end of 5A and of 5B, as planned).
- Keep going from step to step in the same chat; don't stop between steps or ask the owner to `/clear` + `/next`. `/next` is for when the owner opens a new chat.
- Big steps: no need to ask over ~150k tokens; split the step into parts yourself and carry on.
- Auto-compact stays on: when the chat gets long, Claude Code compacts it by itself and work carries on. Don't ask the owner to type `/compact`.
- At the end of every step: update the README handoff, CHANGELOG and IDEAS, commit, mirror, then start the next step.
- **Models:** the owner uses `opusplan` (Opus plans, Sonnet builds). Write plans clear enough for Sonnet to follow: files to touch, data shapes, rules, tests. If Sonnet gets stuck or keeps failing at something, stop and tell the owner so they can switch to Opus for that part.

## Mirror copy (gdrive notes)

- Whenever you create, edit or delete any of CLAUDE.md, README.md, IDEAS.md, LEARNING.md, package.json, `rules/` or `src/`, apply the same change to the copy in `C:\Users\pc\Downloads\gdrive notes`.
- Run this after each change (PowerShell, one line). It copies the six files and mirrors `rules/` and `src/` (extra files there are deleted to match). Never node_modules, dist or test-results:

  ```powershell
  $s='C:\Users\pc\Downloads\learning-notes'; $d='C:\Users\pc\Downloads\gdrive notes'; robocopy $s $d CLAUDE.md README.md IDEAS.md LEARNING.md HELP-TEXTS.md package.json /NJH /NJS /NDL /NP; robocopy "$s\rules" "$d\rules" /MIR /NJH /NJS /NDL /NP; robocopy "$s\src" "$d\src" /MIR /XD node_modules dist test-results /NJH /NJS /NDL /NP
  ```

- Robocopy exit codes 0–7 mean success; 8 or more means a failure — report it.
- Deleting one of the five top-level files is not mirrored by the command; delete the copy by hand.
- Confirm in one line, e.g. "Mirrored to gdrive notes."
