# CLAUDE.md — Core Rules

**If a request conflicts with a rule here or in `rules/`: for money, data loss, secrets or a rule change, stop and ask. Otherwise take the safest option, log it in docs/DECISIONS.md "Decisions to review" and carry on.**

## Project

Learning Notes App: a premium, minimal second brain (Notion + OneNote + Anki). Each notebook has detailed notes, a short summary and recall cards. Web now; iPhone, iPad, Android and Mac later. Global, millions of users, any field. No new spending without the owner's OK (the Claude plan is already approved).

**Look and feel:** every screen feels like a top-tier product from Apple or Google: calm, polished, consistent spacing and type, smooth motion, clear hierarchy. The bar: docs/design/quality-standard.md. Nothing is released below it.

## How we work (owner, 22 Nov 2026; method v2)

The method is a spec: **docs/METHOD-v2.md** (confirmed 22 Nov). In one line: your words → "what I heard" → plan → main questionnaire with options → spec page in two layers → confirm sheet → plan and tasks → build, tests first → analyze → review once → the owner's test by scenario → issues → fix loop → switch ON. Pictures: docs/plans/method-v2/.

**Three stages (owner, 22 Nov):** 1 the working app for the owner (PC first, mouse and keyboard; Claude Code writes notebooks the app imports; the iPad reads); 2 the premium app for the owner (the Pencil first, then the polishing, then the richer features); 3 for everyone. Every feature has one row and one id in **docs/FEATURES.md** (the register) with its stage, state and phase; the id is used in specs, issues, briefs and plans. Stage 1 plan: docs/plans/stage-1-plan.md. A stage holds phases of at most two weeks, each ending with a train release (preview every Friday, live every second Friday on the owner's yes); a phase holds 10 to 20 parts; a part is under a day for one builder.

How helpers work: docs/HOW-WE-BUILD.md. State: docs/STATE.md (the one live state file). Bugs: GitHub Issues (the issue number is the bug id). The formatted site: https://priyanahubadhana.github.io/learning-notes/

**Owner settings** (change only on the owner's word; log each change in docs/DECISIONS.md):

- Builders: Sonnet at medium effort (`builder`), one planned task each; no Haiku in the build.
- Manager and reviewer: Opus at medium effort. It runs the build (the main chat in lean mode; `phase-manager` only when the owner asks for the full team), drafts ordinary specs with the lenses, reviews each part once (code against the spec, look against the picture, the Design and quality check) and takes over when Sonnet failed the same thing three times.
- Fable at medium effort: plans each stage and phase with the owner, writes the method and the templates, gives the attack read to part cards and risky specs, and solves what Opus could not. No routine reviews. Used as little as possible.
- Escalation (owner, 21 Nov 2026): Sonnet fails the same thing three times → Opus at medium → Opus at **high** effort → Fable → the owner last. If a result falls short, raise the effort before changing the model. A try counts only if it differs from the one before, and no new try starts without new evidence (a failing test, a trace, a measurement). For a fault that only the real iPad shows: no new try without a new trace from the owner.
- **Replan trigger (owner, 22 Nov 2026):** Opus counts meaningful changes to the live plan since Fable last planned: a confirmed spec's scope changed, a feature moved between stages or phases, a part added or removed, an estimate slip of more than three days. Trivial edits do not count. At 10, or at any stage move, Opus stops adding and **asks the owner** to open a Fable window to replan; it never escalates to Fable by itself for this trigger.
- Tests: chromium on each merge; ipad-webkit nightly and before each release; 20 of 20 before a merge.
- Weekly card: Saturday evening, eight computed numbers and the owner's one line (METHOD-v2 M-05). Rules change only at a phase end, from the numbers.
- Weekly quota: 80% is a reference, not a cap.
- **Windows (owner, 22 Nov 2026):** one task, one fresh builder window planned under 100K tokens, safety compaction at 120K never relied on; the manager chat is cleared at each part boundary; a normal task passes four gate layers (scenario tests, the verify recipe, a fresh checker, three rounds then the ladder), a tiny task (no screen change, under 3 files) the first two. Plan and parts: docs/plans/phases/phase-1m-build-machine.md.

## Core rules

- **Owner is a beginner:** plain words; what it is, what it does, why it matters. Estimates come from the measured pace.
- **Honesty (owner, 21 Nov 2026):** every pick carries the case against it, in one line, on real decisions only. A position changes only for a named new reason (new evidence or a new argument), and the message says which. An override is logged in docs/DECISIONS.md as "owner chose X; the reason against was Y". Contradict with a rationale, never for its own sake; never agree for comfort. Tells to avoid: praise of the owner's idea, instant flips, "works" without proof.
- **After every free-talk round:** five lines of "what I heard", in the owner's words, corrected on the spot. Small questions only when the answer changes what is built; otherwise the safest option, logged.
- **Builds on and reuse:** a new spec names the specs and part cards it extends, or says "none, checked on <date>"; analyze fails without it. No new code for a job a part card owns; the private-copy counter may only go down. A spec that outgrows one sitting is split, the new one pointing at the old.
- **Statuses by program:** Draft, Confirmed, Building, Built, Verified, Live are set from tests, analyze and the owner's yes; nobody types them.
- **PC first, iPad as the design target (owner, 21 Nov 2026):** every action by click, by key and by a 44 px target; nothing hover-only (mouse or Pencil; hover names are an extra); the Pencil work is parked behind its switches, not dropped; an iPad reading check at each release; every part card and bar spec carries "On the iPad later: what changes, what does not".
- **Design and quality in every spec:** the Design and quality check (template v2) is filled before the confirm sheet and verified by the reviewer: the approved picture, docs/design/quality-standard.md, owner-ui-patterns.md, accessibility, i18n keys, one Undo per change, a speed budget, device-neutral, flexible (simple default, advanced ▾). No new UI where an approved one exists.
- **Asking the owner for references and test data (owner, 22 Nov 2026):** look in the repo (docs/design/refs/, owner-decisions.md) or search the web, or simply ask; ask as often as needed and never stop asking. The "Test" notebook holds test data; the owner's account has nothing private in stage 1.
- **Status line:** start every message to the owner with `Status:`, `Time left:` (this phase and the whole project, each marked measured, estimate or not known yet) and `Needs you: no` or `yes, <what>`.
- **Stop the line:** a red test stops that task until the root cause is fixed. Never weaken, skip or delete a test.
- **Never drop a feature:** a redesign keeps every feature (simple by default, advanced behind ▾); check against the spec and the inventory.
- **Do it yourself:** ask the owner only for money, logins and Supabase, switching a part ON in the live app, possible data loss, a test on a real device, or a real product decision.
- **When you must ask:** 2 to 5 questions at once, in very easy words, each with everything needed to decide inside it (what, why, options, pros and cons, your pick). During a build do not stop: take the safest option and log it.
- **Proof before "done":** the test run, the screenshot, or the page checked in a browser.
- **Owner tests, Claude coaches (owner, 18 Nov 2026):** the owner wants to know what they can do so Claude does better, not to have everything done for them. Before each build, send a short plain-words "we will prove" list (the owner replies yes or "missing X"); ask for "done" examples (saw → expected, 2 to 4 lines) and "must never happen" lines, and turn each into a test; after each small group of fixes, ask for a 5-minute iPad check. Frame questions so the owner's answers give the most room to build well. If a message skips or contradicts this way of working, remind the owner kindly how it works. Read every owner message as if it ends with "what can I do to make this better, and ask me questions": end each questionnaire and each report with a short "How you can help" line (one or two asks) and any questions that would let the build go better.
- **Escalate by yourself:** failures (the same thing three times for Sonnet, five for Opus) and questions go Sonnet → Opus → Fable; the owner comes last. Fix stalls at once.
- **Tokens:** short replies; briefs point to files and never paste them; no re-reading. docs/design/token-efficiency.md.
- **Continuity:** small commits pushed after each step; docs/STATE.md always current; the owner only types "continue". docs/CONTINUITY.md.
- **Rules:** routine file updates, just do them. Rule changes wait for the owner's OK and never happen in the middle of a phase.

## Always apply

- **Design:** docs/design/quality-standard.md, docs/design/owner-ui-patterns.md, docs/design/owner-decisions.md (approved mock-ups and their conditions), docs/plans/mock-feedback-2026-11-11.md. Definition of Done: rules/quality.md.
- **Owner comments on mock-ups:** read every open comment, give each to the helper, verify each in a browser before saying done.

## Things we said no to (for now)

- Accounts are required (Google, email code or email + password); notes work offline once signed in. AI inside the app (API keys) is stage 3; in stage 1 Claude Code writes notebooks in the app's notes format and the app imports them; the connector is the end of stage 2.
- No native apps, no collaboration. No switching from BlockNote or the stack without asking.
- Build only what the stage plan and the confirmed specs list. No extras; a new wish goes to docs/IDEAS.md with must, nice or later, for the next phase (scope freeze inside a phase).
- No Claude artifacts for the owner's reading; the site renders the repo.

## Files

- **Read docs/INDEX.md first**, then only what the task needs (M-N7: a helper reads no more than the files its brief names). Never read docs/ARCHIVE.md or docs/archive/ during work; search a heading only. Specs: docs/features/ on template v2 (_TEMPLATE.md); part cards: docs/features/parts/.
- Rule files, read when the work needs them: `rules/planning.md` (planning a phase), `building.md`, `sessions.md` (chats, limits), `testing.md`, `architecture.md` (code, data, design), `global.md` (text, UTC, accessibility), `scalability.md`, `security.md`, `quality.md` (every feature), `phase-end.md`.
- docs/CHANGELOG.md: a dated entry after every change (what, why, files). Keep README, CLAUDE.md, docs/ and `rules/` up to date.
