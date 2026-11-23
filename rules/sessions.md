# Sessions (chats)

- **Way of working (owner, 2026-10-27; confirmed 14 Nov 2026):** plan a phase together, then build the whole phase without stopping. One phase at a time. The owner's first look on the iPad comes as soon as the phase works, and again before it is switched ON in the live app (docs/plans/phase-plan.md).
- **Windows (owner, 22 Nov 2026; phase 1M, replaces "one long chat"):** one task, one fresh builder window, planned to finish under 100K tokens; the manager chat runs one part per window and is cleared at the part boundary (`/clear`, then `/next` reloads docs/STATE.md). Split a task by scope first, by a relay of windows second (a dossier file `HANDOFF-<task>.md` in the branch is the handoff), by compaction never. Detail: docs/plans/phases/phase-1m-build-machine.md "Building guide".
- Budget line: at 80K the builder commits, writes the dossier and stops with STOPPED-BUDGET; a fresh builder continues on the same branch. Never ask the owner about it.
- Auto-compact is a safety net only (`autoCompactWindow: 120000` on the helper agents); never plan on it. Don't ask the owner to type `/compact`.
- After every sub-step: update docs/STATE.md (the one live state file) and commit. At the end of every step: update docs/CHANGELOG.md and docs/IDEAS.md, run the related tests, push to GitHub, then start the next step. The full test set runs nightly in CI and before each release.
- `/next` reads docs/STATE.md first (if it says PAUSED, it stops and tells the owner), then docs/INDEX.md, after checking Git and `npm audit`.
- **Models:** see CLAUDE.md "How we work". If Sonnet fails the same thing three times, hand it to Opus medium, then Opus high, then Fable (owner, 21 Nov 2026; replaces "Opus five times" of 20 Nov).
- **Weekly card:** Saturday evening, eight computed numbers and the owner's one line (METHOD-v2 M-05).
  - Helper agents are allowed. Run several in parallel (separate git worktrees for independent work); pushes happen one at a time, each rebased on the latest code line.
- **Workflow:**
  - Keep the work continuous and well tested.
  - Builders run their related tests locally; GitHub CI confirms.
  - Never push failing code.
  - Small commits, so every change can be undone.
- **Context:** small windows, state in files. Keep coordinator messages short, helper reports under 15 lines, and the state in docs (the phase page, docs/STATE.md), never only in chat. `/goal` holds a part's done condition in the manager chat; `/loop` only watches CI, a background builder or a limit reset.
- **Usage limit:** if a helper or the session stops because the usage limit was hit, schedule a one-time restart for just after the stated reset time. When it fires, resume the same helper (so its saved work continues) and tell the owner in one line. Never start a fresh helper over half-done work without checking git status first. While a phase is being built, the hourly pulse also checks helpers and resumes them after each reset. This covers both the 5-hour and the weekly limits: wait and continue, again and again, until the phase is done. While the build is PAUSED nothing is resumed.

## Storage

- PC: main working copy. Private GitHub repo: full backup with history.
