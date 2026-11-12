# Continuity: nothing is lost, whatever happens

Owner request (12 Nov 2026): work must survive a power cut, the PC turning off, the Claude window being closed by mistake, a lost connection, or the usage limit running out, and carry on with the same quality.

## Where the work lives (safe places)

| What                                | Where                                                           | Safe because                                      |
| ----------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| Code, rules, plans, decisions       | git repo, pushed to GitHub after every step                     | survives any PC problem                           |
| Open work list                      | `docs/PENDING.md` (the single list) + `docs/CHANGELOG.md`       | read first by any new session                     |
| Approved mock-ups and their sources | `docs/mockups/` (copied from the temporary scratchpad)          | the scratchpad is a temp folder Windows may clean |
| Mock-up links                       | claude.ai artifacts (listed in PENDING)                         | online, survive the PC                            |
| Backup copy                         | `C:\Users\pc\Downloads\gdrive notes` (mirror after each change) | second copy                                       |
| Helpers' half-done code             | their own git worktree + branch, committed in small steps       | a restart continues from the last commit          |

## What happens when…

| Event                               | What survives                              | How work resumes                                                                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Power cut / PC off**              | everything pushed to GitHub; local commits | Open VS Code → Claude → type `/next` (or "continue"). The new session reads PENDING + CHANGELOG + git log and restarts unfinished helpers from their last commit. At most the last few minutes of one helper are redone.                                                |
| **Claude window closed by mistake** | same as above; running helpers stop        | Reopen and say "continue". Prefer resuming the same chat (Claude Code's resume / chat history) so the context returns.                                                                                                                                                  |
| **Internet lost**                   | everything local                           | Helpers pause; when online again, say "continue". Pushes happen on the next step.                                                                                                                                                                                       |
| **Usage limit reached**             | all saved work                             | The manager schedules a restart at the reset time and resumes the stopped helpers from where they stopped (no new work started). Note: that scheduled restart lives only while this Claude window stays open; if the window was closed, say "continue" after the reset. |
| **Chat gets too long (compaction)** | a summary + all files                      | Work continues automatically; key facts are always in files, never only in chat.                                                                                                                                                                                        |
| **While the owner is away**         | n/a                                        | The cloud routine "Daily CI check" (Haiku, 13:00 IST) runs on Anthropic's servers even with the PC off.                                                                                                                                                                 |

## Rules that make this work (every helper, every task)

1. Commit and push small steps (one item per commit). Never leave work only in chat or in a temp folder.
2. Update `docs/PENDING.md` when a task starts, changes or ends.
3. Approved or in-progress mock-ups are copied to `docs/mockups/` and committed.
4. Each helper works in its own worktree and branch, so a crash never mixes half-done work into main.
5. On restart, first read PENDING + CHANGELOG + `git log -20`, then continue; never redo finished work.
6. The quality rules (`rules/quality.md`) apply after a restart exactly as before: same checks, same 3 gates.

## Restart checklist for the owner (30 seconds)

1. Open VS Code and the Claude panel.
2. Type: **continue** (or `/next`).
3. Wait for the short "here is where we are" summary, then answer any question.
