# Building a Step

- **Phase start:** all of the phase's questions were asked in the planning talk and written into the phase page (docs/plans/phases/); build from that page. The order of phases is in docs/plans/phase-plan.md.
- **During:** build only what the phase page lists; after that only bug fixes and rework of things that do not behave as planned. Decide small things yourself and log them in docs/DECISIONS.md. Don't stop.
- **A question only the owner could answer** (one the plan doesn't cover): pick the safest sensible option, log it in docs/DECISIONS.md "Decisions to review" (date, step, what was picked, other options), and carry on.
- Short replies. Write risks, bugs and weak decisions into "Decisions to review" at once, in full.
- New ideas that come up mid-build go into docs/IDEAS.md (date, short description, likely phase), not into the current step.
- Small issues found during testing get fixed right away, or go into a polish list for the next step.
- **Stop and ask only for:** anything that costs money; anything that could delete or lose the owner's data; anything on the "said no to" list; a rule conflict; a blocker; or Sonnet stuck on something (see sessions.md).
- Before building or changing a feature, read its spec in docs/features/, rules/security.md and rules/global.md. New features get a spec from `docs/features/_TEMPLATE.md`.
- **Publishing:** the live site changes only through GitHub. No manual uploads to Cloudflare (owner, 2026-11-03).
- If the app stops, note how to restart it in docs/HANDOFF.md (commit rhythm: rules/sessions.md).

## Who does what (owner, 14 Nov 2026)

See CLAUDE.md "How we work" and docs/HOW-WE-BUILD.md: Fable is the top manager, Opus at medium effort manages a phase and reviews each task, Sonnet builds.

- **Escalate automatically (owner, 13 Nov 2026):** stuck work goes Sonnet → Opus → Fable without waiting for the owner; stalls are fixed at once.
