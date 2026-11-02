# Building a Step

- **Phase start:** all of the phase's questions were asked in the planning talk and written into the plan; build from that plan.
- **During:** decide small things yourself and log them in docs/DECISIONS.md. Don't stop.
- **A question only the owner could answer** (one the plan doesn't cover): pick the safest sensible option, log it in docs/DECISIONS.md "Decisions to review" (date, step, what was picked, other options), and carry on.
- Short replies. Write risks, bugs and weak decisions into "Decisions to review" at once, in full.
- New ideas that come up mid-build go into docs/IDEAS.md (date, short description, likely phase), not into the current step.
- Small issues found during testing get fixed right away, or go into a polish list for the next step.
- **Stop and ask only for:** anything that costs money; anything that could delete or lose the owner's data; anything on the "said no to" list; a rule conflict; a blocker; or Sonnet stuck on something (see sessions.md).
- Before building or changing a feature, read its spec in docs/features/ and the security rules. New features get a spec from `docs/features/_TEMPLATE.md`.
- **Publishing:** the live site changes only through GitHub. No manual uploads to Cloudflare (owner, 2026-11-03).
- After every sub-step: update docs/HANDOFF.md and commit. If the app stops, note how to restart it there.
