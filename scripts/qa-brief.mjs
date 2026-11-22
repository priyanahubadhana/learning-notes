// Write the day's filled-in briefs for the three auditors (docs/qa/README.md).
//   node scripts/qa-brief.mjs <label> [--full]
// Reads the newest qa/<date>-<label> tag and the one before it, lists what changed
// between them (specs, plan pages, pictures, code, tests), and writes
// BRIEFS-<label>.md into that checkpoint's reports folder with the four briefs of
// docs/qa/BRIEFS.md filled in. --full (the weekly audit, and the baseline) audits
// everything instead of the delta. The owner pastes the result; nothing else runs.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'

const label = (process.argv[2] || '').trim()
const full = process.argv.includes('--full')
if (!label) {
  console.error('usage: node scripts/qa-brief.mjs <label> [--full]')
  process.exit(1)
}
const root = resolve(
  dirname(new URL(import.meta.url).pathname.replace(/^\/([a-z]:)/i, '$1')),
  '..',
)
const git = (...a) =>
  execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim()

const tags = git('tag', '-l', 'qa/*', '--sort=creatordate')
  .split('\n')
  .filter(Boolean)
const tag = tags.filter((t) => t.endsWith('-' + label)).pop()
if (!tag) {
  console.error(
    `no qa tag ends with -${label}; run scripts/qa-checkpoint.mjs first`,
  )
  process.exit(1)
}
const prev = tags[tags.indexOf(tag) - 1]
const base = full || !prev ? null : prev
const changed = base
  ? git('diff', '--name-only', `${base}...${tag}`).split('\n').filter(Boolean)
  : []
const specs = changed.filter((f) => f.startsWith('docs/features/'))
const plans = changed.filter((f) => f.startsWith('docs/plans/'))
const pics = changed.filter((f) => /^docs\/(mockups|design)\//.test(f))
const code = changed.filter((f) => f.startsWith('src/'))
const tests = changed.filter((f) => f.startsWith('e2e/') || /\.test\./.test(f))
const list = (a, none) =>
  a.length ? a.map((f) => '  ' + f).join('\n') : '  ' + none

const downloads = resolve(root, '..')
const reports = join(downloads, 'learning-notes-qa', tag.replace('/', '-'))
if (!existsSync(reports)) {
  console.error(
    `reports folder missing: ${reports}; run scripts/qa-checkpoint.mjs`,
  )
  process.exit(1)
}
const head = git('rev-parse', '--short', tag)
const R = `C:\\Users\\pc\\Downloads\\learning-notes-qa\\${tag.replace('/', '-')}\\`
const common = (e) =>
  `You are a read-only auditor on this project. Read AGENTS.md, then docs/qa/PROJECT-BRIEFING.md, then docs/qa/README.md.
Checkpoint: ${tag} (detached, ${head}). Working copy: C:\\Users\\pc\\Downloads\\ln-qa-${e}. Reports folder: ${R}`
const scope = base
  ? `Scope: what changed since ${base} (git diff ${base}...${tag}).
Specs changed:\n${list(specs, 'none')}\nPlan pages changed:\n${list(plans, 'none')}\nPictures and design docs changed:\n${list(pics, 'none')}\nCode changed:\n${list(code, 'none')}\nTests changed:\n${list(tests, 'none')}`
  : `Scope: EVERYTHING (full audit). The plan: docs/plans/stage-1-plan.md, docs/METHOD-v2.md, docs/plans/phases/*.md, docs/FEATURES.md, every spec in docs/features/ with status Draft or Confirmed, and the pictures in docs/mockups/.`
const planning = `PLANNING AUDIT (all three do it): for every spec and plan page in scope, report contradictions inside it or with FEATURES.md, the pictures, owner-decisions.md and the quality standard; cases it never covers (keyboard only, 44 px targets, small screen, reload, offline, empty state); words a beginner or a builder could read two ways; better options with the case for and against. Label each item error, gap or preference. Do not invent requirements.`
const tail = (e, extra = '') =>
  `Write ONE file: ${R}${e}.md using docs/qa/REPORT-TEMPLATE.md (already there; fill it in). Evidence under ${R}evidence\\${e}\\.${extra}
Change nothing in the working copy. Do not commit, install (beyond npm ci) or fix. The owner decides.`

const out = `# Briefs for ${tag} (${full || !prev ? 'full audit' : 'daily delta since ' + prev})

Paste one block per tool. Set the tool to read-only first (docs/qa/README.md "How the owner runs a cycle").

## Codex (C:\\Users\\pc\\Downloads\\ln-qa-codex)

${common('codex')}
${scope}
Run (read-only; npm ci first): npm test, npm run test:e2e${base && tests.length ? ' -- ' + tests.filter((t) => t.startsWith('e2e/')).join(' ') : ''}, npm run check:dod, npm run check:ratchet, npm run check:size, npm run lint, npm audit --omit=dev. Report exact commands, exit codes and counts; say what you could not run (known: on Node 26 the unit tests may fail to load; report it, do not fix it).
Judge the code in scope against its spec rows: a row without a test that proves it; a test that proves less than its name; data integrity (src/core, src/sync); regressions in shared code; docs/qa/SECURITY-CHECKLIST.md for the files in scope.
${planning}
${tail('codex')}

## Cursor (C:\\Users\\pc\\Downloads\\ln-qa-cursor)

${common('cursor')}
${scope}
Judge the screens in scope (their code and the visual snapshots in e2e/) against docs/design/quality-standard.md, system.md, owner-ui-patterns.md and the approved pictures in docs/mockups/ and owner-decisions.md: layout, spacing, type, labels, order; every action by click, by key and by a 44 px target, nothing hover-only; light, dark and sepia; one Undo per change; i18n keys not raw text; accessibility names and focus; motion and speed. Run npm run test:visual read-only if useful.
PICTURE AUDIT for every mock-up in scope: which spec rows it misses, what the spec never asked for, how it would look on an iPad and a phone, what a beginner would misread, and one honest line: would a top-tier product ship this screen.
${planning}
${tail('cursor')}

## Antigravity (C:\\Users\\pc\\Downloads\\ln-qa-antigravity)

${common('antigravity')}
App to test: https://learning-notes-app.pages.dev (live build of main)${base ? '' : ''}. The owner signs you in with the test account; use only the "Test" notebook; never delete a notebook, sign out other sessions or change settings you cannot put back.
${scope}
Walk every scenario and user story in scope as a real user, by mouse and by keyboard (phase pages "Scenarios", docs/plans/user-stories-2b.md, the spec rows). Try the edges: empty state, reload mid-action, offline (DevTools), a very long title, pasting odd text, a second tab, back and forward, a narrow window. Note usability and accessibility problems, wrong or missing error messages, anything slower than a second.
Security, app level only (docs/qa/SECURITY-CHECKLIST.md "Accounts", "Input and injection", "Headers"): what a signed-out visitor sees, URL tampering, script text in a note title, response headers. Nothing destructive.
Save a screenshot and the console log for every finding.
${planning}
${tail('antigravity')}

## Then

When the three reports exist, type in Claude Code: consolidate ${tag}
`
const file = join(reports, `BRIEFS-${label}.md`)
writeFileSync(file, out)
console.log(
  `${file}\n${base ? changed.length + ' changed files since ' + base : 'full audit'}`,
)
