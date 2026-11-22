# The paste-in briefs

Claude Code fills the `<…>` parts at each checkpoint and gives the owner the text to paste. Every brief points at files; it never pastes them. Each ends with the same four lines.

## 1. Planning audit (any engine; the analyze gate)

```
You are a read-only auditor on this project. Read AGENTS.md, then docs/qa/README.md.
Checkpoint: <tag>. Working copy: <path>. Reports folder: C:\Users\pc\Downloads\learning-notes-qa\<checkpoint>\
Audit the PLAN, not the code. Read: docs/features/<spec>.md (draft), docs/plans/phases/<phase>.md,
the pictures in <docs/mockups/... or the artifact listed in docs/design/owner-decisions.md>,
docs/FEATURES.md (the rows <F-ids>), docs/design/quality-standard.md, docs/LIMITATIONS.md.
Report: (a) contradictions inside the spec or with another spec or picture, (b) cases the spec never
covers (empty, offline, reload, slow network, small screen, keyboard only, 44 px targets),
(c) unclear words a builder could read two ways, (d) a better option, with the case for and against,
(e) one design question: <question>, (f) one wording question: <question>.
Label each item error, gap or preference. Do not invent requirements.
Write ONE file: <reports folder>\<engine>.md using docs/qa/REPORT-TEMPLATE.md.
Change nothing in the working copy. Do not commit, install or fix. The owner decides.
```

## 2. Verification, code against the spec (Codex)

```
You are a read-only auditor on this project. Read AGENTS.md, then docs/qa/README.md.
Checkpoint: <tag>. Working copy: <path> (detached). Reports folder: C:\Users\pc\Downloads\learning-notes-qa\<checkpoint>\
Scope: the diff `git diff <previous tag>...<tag>` for part <part id> of docs/features/<spec>.md (rows <n>).
Run (read-only; `npm ci` first if node_modules is missing): npm test, npm run test:e2e -- <spec files the part names>,
npm run check:dod, npm run check:ratchet, npm run check:size, npm run lint, npm audit --omit=dev.
Report exact commands, exit codes and counts; say what you could not run.
Judge: every spec row has a test that really proves it; nothing unplanned was added; no test was
weakened; edge cases (offline, reload, keyboard, small screen); data integrity; regressions in shared code;
docs/qa/SECURITY-CHECKLIST.md for the files the diff touches.
Also answer the shared design question <q> and wording question <q>.
Write ONE file: <reports folder>\codex.md using docs/qa/REPORT-TEMPLATE.md.
Change nothing in the working copy. Do not commit, install (beyond npm ci) or fix. The owner decides.
```

## 3. Verification, design and quality (Cursor)

```
You are a read-only auditor on this project. Read AGENTS.md, then docs/qa/README.md.
Checkpoint: <tag>. Working copy: <path> (detached). Reports folder: C:\Users\pc\Downloads\learning-notes-qa\<checkpoint>\
Scope: the screens of part <part id> (files in the diff `git diff <previous tag>...<tag>`), against the approved
picture <path or artifact>, docs/design/quality-standard.md, docs/design/owner-ui-patterns.md,
docs/design/system.md and the Design and quality check at the bottom of docs/features/<spec>.md.
Judge: layout, spacing, type, order and labels against the picture; every action by click, by key and by a
44 px target, nothing hover-only; light, dark and sepia; one Undo per change; i18n keys not raw text;
motion and speed budget; consistency with the existing screens; accessibility (names, focus, contrast).
Run if useful: npm run test:visual (read-only). Screenshots go in the reports folder.
Also answer the shared design question <q> and wording question <q>.
Write ONE file: <reports folder>\cursor.md using docs/qa/REPORT-TEMPLATE.md.
Change nothing in the working copy. Do not commit, install (beyond npm ci) or fix. The owner decides.
```

## 4. Verification, the running app (Antigravity)

```
You are a read-only auditor on this project. Read AGENTS.md, then docs/qa/README.md.
Checkpoint: <tag>. Working copy: <path> (read the specs here; do not run the code). Reports folder: C:\Users\pc\Downloads\learning-notes-qa\<checkpoint>\
App to test: <preview URL> (the build of <tag>). Sign in with the test account the owner gives you in the chat
(never write it in the report). Use only the "Test" notebook. Do not delete notebooks or sign other users out.
Scenarios: docs/plans/phases/<phase>.md "Scenarios" <S-ids>, and the spec rows <n> of docs/features/<spec>.md.
Walk each scenario as a real user, by mouse and by keyboard. Try the edges: empty state, reload mid-action,
offline (DevTools), a very long title, pasting odd text, a second tab, back and forward, narrow window.
Note usability and accessibility problems and wrong or missing error messages.
Security, app level only (docs/qa/SECURITY-CHECKLIST.md "Accounts", "Input and injection", "Headers"): what a
signed-out visitor sees, URL tampering, script text in a note title, response headers. Nothing destructive.
Capture a screenshot and the console log for every finding, saved in the reports folder.
Also answer the shared design question <q> and wording question <q>.
Write ONE file: <reports folder>\antigravity.md using docs/qa/REPORT-TEMPLATE.md.
Change nothing in the working copy. Do not commit, install or fix. The owner decides.
```

## 5. Consolidate (the owner types this in Claude Code)

```
consolidate qa/<date>-<label>
```

Claude Code reads the three reports, merges duplicates, labels each line error, gap or preference, adds its view with the case against, writes docs/qa/CONSOLIDATION-TEMPLATE.md filled in to the reports folder and the one-line summary to docs/STATE.md, and asks the owner for the yes rows.
