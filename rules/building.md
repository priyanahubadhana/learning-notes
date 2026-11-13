# Building a Step

- **Phase start:** all of the phase's questions were asked in the planning talk and written into the plan; build from that plan.
- **During:** decide small things yourself and log them in docs/DECISIONS.md. Don't stop.
- **A question only the owner could answer** (one the plan doesn't cover): pick the safest sensible option, log it in docs/DECISIONS.md "Decisions to review" (date, step, what was picked, other options), and carry on.
- Short replies. Write risks, bugs and weak decisions into "Decisions to review" at once, in full.
- New ideas that come up mid-build go into docs/IDEAS.md (date, short description, likely phase), not into the current step.
- Small issues found during testing get fixed right away, or go into a polish list for the next step.
- **Stop and ask only for:** anything that costs money; anything that could delete or lose the owner's data; anything on the "said no to" list; a rule conflict; a blocker; or Sonnet stuck on something (see sessions.md).
- Before building or changing a feature, read its spec in docs/features/, rules/security.md and rules/global.md. New features get a spec from `docs/features/_TEMPLATE.md`.
- **Publishing:** the live site changes only through GitHub. No manual uploads to Cloudflare (owner, 2026-11-03).
- If the app stops, note how to restart it in docs/HANDOFF.md (commit rhythm: rules/sessions.md).

## Agent hierarchy (owner, 12 Nov 2026)

See CLAUDE.md "How Work Runs". The build runs in economy mode (docs/ECONOMY-MODE.md); other tasks use Fable → Opus sub-managers → Sonnet/Haiku.

- **Escalate automatically (owner, 13 Nov 2026):** stuck work goes Sonnet → Opus → Fable without waiting for the owner; stalls are fixed at once. Details: docs/ECONOMY-MODE.md section 12.
