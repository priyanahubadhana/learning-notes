# Sessions (chats)

- One full step per chat, not one sub-step per chat (e.g. all of Step 5 — 5a, 5b, and so on — in the same chat). Only suggest a new chat when a whole step is finished.
- Token cap: 80k per sub-step. Estimate first and propose a split if it is bigger. Token counts are estimates; stop early when unsure.
- Auto-compact stays on as a safety net. After each sub-step, if the chat is long, tell the owner to type `/compact` (not to open a new chat).
- At the end of a full step: update the README handoff, CHANGELOG and IDEAS, commit, then tell the owner to open a new chat.
- Start a new chat with `/next` (see `.claude/commands/next.md`).
