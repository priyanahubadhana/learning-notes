# Sessions (chats)

- **Way of working (owner, 2026-10-27; confirmed 14 Nov 2026):** plan a phase together, then build the whole phase without stopping. One phase at a time. The owner's first look on the iPad comes as soon as the phase works, and again before it is switched ON in the live app (docs/plans/phase-plan.md).
- Keep going from step to step in the same chat; don't stop between steps or ask the owner to `/clear` + `/next`. `/next` is for when the owner opens a new chat.
- Big steps: no need to ask over ~150k tokens; split the step into parts yourself and carry on.
- Auto-compact stays on: when the chat gets long, Claude Code compacts it by itself and work carries on. Don't ask the owner to type `/compact`.
- After every sub-step: update docs/HANDOFF.md (5 lines) and commit (while a phase is being built: docs/BUILD-STATE.md instead). At the end of every step: update docs/CHANGELOG.md and docs/IDEAS.md, run the related tests, push to GitHub, then start the next step. The full test set runs nightly in CI and before each release.
- `/next` reads docs/BUILD-STATE.md first (if it says PAUSED, it stops and tells the owner), then docs/HANDOFF.md and docs/INDEX.md, after checking Git and `npm audit`.
- **Models:** see CLAUDE.md "How we work". If Sonnet fails twice at something, hand it to Opus, then Fable.
  - Helper agents are allowed. Run several in parallel (separate git worktrees for independent work); pushes happen one at a time, each rebased on the latest code line.
- **Workflow:**
  - Keep the work continuous and well tested.
  - Builders run their related tests locally; GitHub CI confirms.
  - Never push failing code.
  - Small commits, so every change can be undone.
- **Context:** long sessions rely on auto-compact. Keep coordinator messages short, and keep the state in docs (the phase page, BUILD-STATE, HANDOFF), never only in chat.
- **Usage limit:** if a helper or the session stops because the usage limit was hit, schedule a one-time restart for just after the stated reset time. When it fires, resume the same helper (so its saved work continues) and tell the owner in one line. Never start a fresh helper over half-done work without checking git status first. While a phase is being built, the hourly pulse also checks helpers and resumes them after each reset. This covers both the 5-hour and the weekly limits: wait and continue, again and again, until the phase is done. While the build is PAUSED nothing is resumed.

## Storage

- PC: main working copy. Private GitHub repo: full backup with history.
