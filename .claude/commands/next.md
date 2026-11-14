---
description: Pick up the project where we left off. Use when starting a new chat, after a restart or usage limit, or to resume the build.
---

0. Read docs/BUILD-STATE.md first and treat it as the place we left off. If it says PAUSED, do not start any helper or build step: tell the owner in 3 lines where things stand and what docs/PENDING.md "Needs you" lists, then wait.
1. Run `git status`. If there are unsaved changes, report what was half-done and ask whether to finish or undo it.
2. Run `npm audit`. Apply any security fix right away, then run only the related tests; the full set runs in CI.
3. Read only docs/HANDOFF.md and docs/INDEX.md; open other files only as the task needs.
4. Sum up where we are in 3 lines, then continue the next step of the current phase (docs/plans/phase-plan.md), following CLAUDE.md and `rules/`.

Extra instructions for today: $ARGUMENTS
