# CLAUDE.md — Core Rules

**If a request conflicts with a rule here or in `rules/`: for money, data loss, secrets or a rule change, stop and ask. Otherwise take the safest option, log it in docs/DECISIONS.md "Decisions to review" and carry on.**

## Project

Learning Notes App: a premium, minimal second brain (Notion + OneNote + Anki). Each notebook has detailed notes, a short summary and recall cards. Web now; iPhone, iPad, Android and Mac later. Global, millions of users, any field. No new spending without the owner's OK (the Claude plan is already approved).

**Look and feel:** every screen feels like a top-tier product from Apple or Google: calm, polished, consistent spacing and type, smooth motion, clear hierarchy. The bar: docs/design/quality-standard.md. Nothing is released below it.

## How we work (owner, 14 Nov 2026)

Work runs in **phases, one at a time**: (1) **artifact**, a picture the owner approved; (2) **plan with Fable**, all questions at once; (3) **build** only what the plan lists, after that only bug fixes and rework; (4) the owner's **first look** on the iPad, early; (5) fix and polish to the full bar; (6) **release**, switched ON in the live app on the owner's yes.

Plan: docs/plans/phase-plan.md. How helpers work: docs/HOW-WE-BUILD.md. State: docs/BUILD-STATE.md. Open work: docs/PENDING.md.

| Owner setting (change only on the owner's word; log it in docs/DECISIONS.md) | Value                                                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Top manager                                                                  | Fable, the main chat: artifact, phase plan, final look, hard cases                 |
| Middle managers                                                              | Opus at medium effort: `phase-manager` (one phase), `reviewer` (each task once)    |
| Builders                                                                     | Sonnet (`builder`), as many as the phase has separate tasks; no Haiku in the build |
| Tests                                                                        | a fast set on each merge; the full set nightly and before each release             |
| Weekly quota                                                                 | 80% is a reference, not a cap                                                      |

## Core rules

- **Owner is a beginner:** plain words; what it is, what it does, why it matters. Be honest, not agreeable; estimates come from the measured pace.
- **Status line:** start every message to the owner with `Status:`, `Time left:` (rough, and how sure) and `Needs you: no` or `yes, <what>`.
- **Stop the line:** a red test stops that task until the root cause is fixed. Never weaken, skip or delete a test.
- **Never drop a feature:** a redesign keeps every feature (simple by default, advanced behind ▾); check against the spec and the inventory.
- **Do it yourself:** ask the owner only for money, logins and Supabase, switching a part ON in the live app, possible data loss, a test on a real device, or a real product decision.
- **When you must ask:** 2 to 5 questions at once, in very easy words, each with everything needed to decide inside it (what, why, options, pros and cons, your pick). During a build do not stop: take the safest option and log it.
- **Proof before "done":** the test run, the screenshot, or the page checked in a browser.
- **Escalate by yourself:** Sonnet → Opus → Fable when the same thing fails twice. Fix stalls at once.
- **Tokens:** short replies; briefs point to files and never paste them; no re-reading. docs/design/token-efficiency.md.
- **Continuity:** small commits pushed after each step; BUILD-STATE and PENDING always current; the owner only types "continue". docs/CONTINUITY.md.
- **Rules:** routine file updates, just do them. Rule changes wait for the owner's OK and never happen in the middle of a phase.

## Always apply

- **Design:** docs/design/quality-standard.md, docs/design/owner-ui-patterns.md, docs/design/owner-decisions.md (approved mock-ups and their conditions), docs/plans/mock-feedback-2026-11-11.md. Definition of Done: rules/quality.md.
- **Owner comments on mock-ups:** read every open comment, give each to the helper, verify each in a browser before saying done.

## Things we said no to (for now)

- Accounts are required (Google, email code or email + password); notes work offline once signed in. AI only after the owner approves the cost.
- No native apps, no collaboration. No switching from BlockNote or the stack without asking.
- Build only what the phase plan and the approved specs list. No extras.

## Files

- **Read docs/INDEX.md first**, then only what the task needs. Never read docs/ARCHIVE.md during work; search a heading only.
- Rule files, read when the work needs them: `rules/planning.md` (planning a phase), `building.md`, `sessions.md` (chats, limits, backup copy), `testing.md`, `architecture.md` (code, data, design), `global.md` (text, UTC, accessibility), `scalability.md`, `security.md`, `quality.md` (every feature), `phase-end.md`.
- docs/CHANGELOG.md: a dated entry after every change (what, why, files). Keep README, CLAUDE.md, docs/ and `rules/` up to date.
- The backup copy to "gdrive notes" is made by a hook when a chat or helper stops (rules/sessions.md).
