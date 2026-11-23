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
- If the app stops, note how to restart it in docs/STATE.md (commit rhythm: rules/sessions.md).

## Who does what (owner, 14 Nov 2026; ladder and stages updated 21 and 22 Nov)

See CLAUDE.md "How we work" and docs/HOW-WE-BUILD.md: Sonnet builds; Opus at medium effort manages and reviews each task once (code and look) and takes over when Sonnet failed the same thing three times; Fable plans each phase and solves what Opus failed at medium and high effort.

- **Escalate automatically (owner, 13 Nov 2026; the ladder of 21 Nov replaces "Opus five times"):** Sonnet fails the same thing three times → Opus medium → Opus high → Fable → the owner last; raise the effort before changing the model; no new try without new evidence (CLAUDE.md "Owner settings", METHOD-v2 "The ladder").
- **PC first (owner, 21 Nov 2026):** every action works by click, by key and by a 44 px target; nothing hover-only; Pencil work stays behind its switches. Every part card and bar spec carries "On the iPad later: what changes, what does not". Details: CLAUDE.md "Core rules".
- **Builds on:** a new spec names the specs and part cards it extends, or "none, checked on <date>". Reuse gate: rules/quality.md section 2.
- **Bugs are GitHub Issues:** the issue number is the bug id; the scenario changes before the code (M-N3); a status (Draft, Confirmed, Building, Built, Verified, Live) is set by a program, never typed (M-N1).
- **Honesty:** every real pick carries the case against it; a position changes only for a named new reason; an override is logged as "owner chose X; the reason against was Y" in docs/DECISIONS.md.
- **Short lines:** a rule or must-never line is about twelve words; detail goes in scenarios and detail lines.
- **Asking the owner for references and test data:** look in docs/design/refs/ and owner-decisions.md or on the web first, then ask, as often as needed.
