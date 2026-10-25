# Sessions (chats)

- One full step per chat, not one sub-step per chat (e.g. all of Step 5 — 5a, 5b, and so on — in the same chat). Only suggest a new chat when a whole step is finished.
- Token cap: 80k per sub-step. Estimate first and propose a split if it is bigger. Token counts are estimates; stop early when unsure.
- Auto-compact stays on as a safety net. After each sub-step, if the chat is long, tell the owner to type `/compact` (not to open a new chat).
- At the end of a full step: update the README handoff, CHANGELOG and IDEAS, commit, then tell the owner to start fresh (see below).
- Start a new chat with `/next` (see `.claude/commands/next.md`).
- Models: remind the owner to use **Opus** for planning and tricky problems and **Sonnet** for routine building and tests, to save usage (switch with `/model`). If Sonnet gets stuck on a bug, suggest switching back to Opus.
- At the end of a full step, tell the owner to type `/clear` (or open a new chat), then `/next`.
