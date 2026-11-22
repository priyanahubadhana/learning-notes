# Independent QA: three auditors, one decision-maker

Set up 22 Nov 2026 (owner's yes in chat; DECISIONS.md 22 Nov). Rules for the auditor tools: [../../AGENTS.md](../../AGENTS.md). This page is the onboarding for Codex, Cursor and Antigravity, and the owner's how-to.

## Who does what

| Engine             | Role                                                      | Lens                                                                                          | Rules file it reads                    |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| Claude Code        | builds, fixes, reviews, merges the reports into one sheet | the method (METHOD-v2)                                                                        | CLAUDE.md                              |
| OpenAI Codex       | read-only auditor                                         | code against the spec and the tests; security of the implementation                           | AGENTS.md, `.codex/hooks.json`         |
| Cursor             | read-only auditor                                         | code and screens against the design pictures and the quality standard                         | AGENTS.md, `.cursor/rules/auditor.mdc` |
| Google Antigravity | read-only auditor                                         | the running app in a browser: workflows, usability, accessibility, errors, app-level security | AGENTS.md, `.agents/rules/auditor.md`  |
| The owner          | decides                                                   | reads the one merged sheet; marks yes or no                                                   | -                                      |

Each engine's lens is a starting assignment, not a belief. For the first two cycles every engine also answers the same design and the same wording question; accepted findings are tagged by source, and the lenses are re-assigned from the numbers on the weekly card (METHOD-v2 M-05). The case against assigning by belief: a wrong guess puts a weak reviewer on design.

## When they run: the two gates

METHOD-v2 already has two gates that need a fresh pair of eyes. The auditors sit at those gates; no step is added.

1. **Planning audit** (the analyze gate, before the confirm sheet): each auditor reads the draft spec, the plan page, the pictures and FEATURES.md and reports contradictions, gaps, unclear words and better options. Brief: [BRIEFS.md](BRIEFS.md) section 1.
2. **Verification audit** (the fresh-checker layer, after a part is Built, before the owner's own test): Codex and Cursor read the diff since the last checkpoint and run the checks; Antigravity drives the preview. Briefs: BRIEFS.md sections 2 to 4. Every built part is audited the same day (owner's default, 22 Nov); the owner can drop to twice a week if the reading is too much.

Reports are never acted on directly. Claude Code merges them into [CONSOLIDATION-TEMPLATE.md](CONSOLIDATION-TEMPLATE.md); the owner marks yes or no; a yes becomes a GitHub Issue (label `source:codex`, `source:cursor` or `source:antigravity`) and only then work.

## The checkpoint (one exact version for all three)

```
node scripts/qa-checkpoint.mjs <label>
```

Run from the main copy by Claude Code at each gate. It: tags `main` as `qa/<date>-<label>`, pushes the tag, creates (or moves) three **detached** worktrees `C:\Users\pc\Downloads\ln-qa-codex`, `ln-qa-cursor`, `ln-qa-antigravity` at that tag, creates the reports folder `C:\Users\pc\Downloads\learning-notes-qa\qa-<date>-<label>\` with one empty report per engine from the template, and writes the checkpoint line into docs/STATE.md. Detached means there is no branch to commit to: that is the real fence, the rules files are the second, the Codex hook the third.

A worktree needs its own `node_modules` for tests (`npm ci`, about 5 minutes). Only Codex and Cursor need it; Antigravity uses the preview URL.

## How the owner runs a cycle (about 10 minutes of typing)

1. Claude Code says "checkpoint qa/… is ready" with the three briefs filled in.
2. Open Codex on `ln-qa-codex` (read-only or suggest mode, approvals never auto). Paste brief 2.
3. Open Cursor on `ln-qa-cursor` (Ask or Plan mode, agent edits off). Paste brief 3.
4. Open Antigravity on `ln-qa-antigravity` (review mode, edits off). Paste brief 4 with the preview URL.
5. When the three reports exist in the reports folder, tell Claude Code: `consolidate qa/<date>-<label>`.
6. Read the one sheet. Type the yes rows. Done.

Before step 2, glance at `git status` in a worktree: it must say "HEAD detached at qa/…" and "nothing to commit". If it shows a branch or a changed file, stop and tell Claude Code.

## What configuration cannot solve

- An engine can ignore its rules file. The detached worktree and the protected `main` are the real fence; the hook is belt and braces (Codex honours hooks; Cursor and Antigravity may not).
- Antigravity can click destructive buttons in the app. It uses the test account and the "Test" notebook only; no real notes there.
- Nobody but the owner tests the real iPad.
- Three engines cost three plans the owner already has; token use is theirs, not Claude's.

## On the iPad later

Reports live outside the repo and are not on the docs site. The merged sheet is in docs/STATE.md under the checkpoint and so is readable on the site.
