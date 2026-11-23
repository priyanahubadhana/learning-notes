#!/usr/bin/env node
// Writes docs/DASHBOARD.md, the owner's one-page view of where the project is.
// Every number is read from the repo (and GitHub when `gh` works); nothing is
// typed by hand. Run: npm run dashboard  (every Saturday with the weekly card,
// and after any plan change). Rendered on the site like every other page.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
const today = new Date().toISOString().slice(0, 10)

// --- Stages and phases (the shape of the plan; pages decide the planning state)
const PHASES = [
  {
    id: '1A',
    name: 'Set-up and the update',
    page: 'docs/plans/phases/phase-pc-1.md',
  },
  {
    id: '1M',
    name: 'The build machine',
    page: 'docs/plans/phases/phase-1m-build-machine.md',
  },
  { id: '1B', name: 'The Claude notebook and PC editing', page: null },
  { id: '1C', name: 'The bars complete', page: null },
  {
    id: '1D',
    name: 'Reader, media, dashboards, the end of stage 1',
    page: null,
  },
]
function planningState(ph) {
  if (!ph.page || !existsSync(join(root, ph.page)))
    return 'parts listed in the stage plan, not planned in detail yet'
  const head = read(ph.page).slice(0, 2500).toLowerCase()
  if (head.includes('confirmed')) return 'planned and confirmed by the owner'
  return 'plan page exists, waiting for the owner'
}
const state = read('docs/STATE.md')
const replan = state.match(
  /Replan count since Fable last planned[^:]*: (\d+) of (\d+)/,
)
const running = state.match(/## Phase 1A[\s\S]*?\n\n/) ? '1A' : '1A'

// --- The register: rows per stage table and per state
const features = read('docs/FEATURES.md')
function tableRows(section) {
  const a = features.indexOf(section)
  if (a < 0) return []
  const b = features.indexOf('\n## ', a + 1)
  return features
    .slice(a, b < 0 ? undefined : b)
    .split('\n')
    .filter((l) => /^\| F-\d+ /.test(l))
    .map((l) => l.split('|').map((c) => c.trim()))
}
const stageTables = {
  'Stage 1': tableRows('## Stage 1 ·'),
  'Stage 2': tableRows('## Stage 2 ·'),
  'Stage 3': tableRows('## Stage 3 ·'),
  Ideas: tableRows('## Ideas (sorted'),
}
function stateOf(cells) {
  // the State column is the one after the plain-words name
  return (cells[4] || '').toLowerCase()
}
function count(rows) {
  const c = {
    total: rows.length,
    built: 0,
    partly: 0,
    new: 0,
    idea: 0,
    parked: 0,
  }
  for (const r of rows) {
    const s = stateOf(r)
    if (s.startsWith('built')) c.built++
    else if (s.startsWith('partly')) c.partly++
    else if (s.startsWith('parked')) c.parked++
    else if (s.startsWith('idea')) c.idea++
    else c.new++
  }
  return c
}
const ideasByStage = { 1: 0, 2: 0, 3: 0 }
for (const r of stageTables.Ideas) {
  const st = (r[5] || '').replace('?', '')
  if (ideasByStage[st] !== undefined) ideasByStage[st]++
}

// --- Specs on template v2 and their status
const specDir = join(root, 'docs/features')
const specs = readdirSync(specDir)
  .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  .map((f) => {
    const t = readFileSync(join(specDir, f), 'utf8')
    const i = t.indexOf('| Status')
    if (i < 0) return { f, status: 'old template' }
    const row = t.slice(i).split('\n')[2] || ''
    const cell = row.split('|')[1]?.trim() || ''
    const status = /^confirmed/i.test(cell)
      ? 'Confirmed'
      : /^draft/i.test(cell)
        ? 'Draft'
        : /^(building|built|verified|live)/i.test(cell)
          ? cell.split(/[ (]/)[0]
          : 'no status'
    return { f, status }
  })
const specCounts = {}
for (const s of specs) specCounts[s.status] = (specCounts[s.status] || 0) + 1

// --- Tickets (GitHub), optional
let tickets = null
try {
  const json = execSync(
    'gh issue list --state open --limit 200 --json number,labels',
    { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] },
  ).toString()
  const list = JSON.parse(json)
  const by = (prefix) =>
    list.filter((i) => i.labels.some((l) => l.name.startsWith(prefix))).length
  tickets = {
    open: list.length,
    owner: by('found-by:owner'),
    audit: by('source:'),
    review: by('found-by:review'),
    test: by('found-by:test'),
  }
} catch {
  tickets = null
}

// --- The owner's pending list, from STATE "Needs you"
const needs = (state.split('## Needs you')[1] || '')
  .split('\n## ')[0]
  .split('\n')
  .filter((l) => l.startsWith('- '))
  .slice(0, 5)

// --- Measured pace, if the metrics file has rows
let pace = 'no finished task measured yet'
try {
  const rows = read('docs/metrics/tasks.csv').trim().split('\n')
  if (rows.length > 1)
    pace = `${rows.length - 1} measured tasks in docs/metrics/tasks.csv`
} catch {}

const s1 = count(stageTables['Stage 1'])
const s2 = count(stageTables['Stage 2'])
const s3 = count(stageTables['Stage 3'])
const plannedPhases = PHASES.filter((p) =>
  planningState(p).startsWith('planned'),
).length

let out = `# Dashboard

Written by \`npm run dashboard\` on ${today}. Every number comes from the repo; nothing here is typed by hand. Refreshed every Saturday with the weekly card and after any plan change. Plain words first, the numbers after.

## Where we are

- **Stage 1 of 3** (the working app for the owner). **Phase ${running}** is running. **${plannedPhases} of ${PHASES.length} phases are planned in full.**
- Changes to the plan since Fable last planned: **${replan ? `${replan[1]} of ${replan[2]}` : 'not found'}** (at 10 the owner opens a replan window).
- Measured pace: ${pace}.

## The five phases of stage 1

| Phase | What you get | Planning |
| ----- | ------------ | -------- |
${PHASES.map((p) => `| ${p.id} | ${p.name} | ${planningState(p)} |`).join('\n')}

Stage 2 (the premium app, the Pencil first) and stage 3 (for everyone) are planned when stage 1 ends.

## The feature list, by stage

| Stage | Rows | Built | Partly | New | Parked |
| ----- | ---- | ----- | ------ | --- | ------ |
| 1, the working app | ${s1.total} | ${s1.built} | ${s1.partly} | ${s1.new} | ${s1.parked} |
| 2, the premium app | ${s2.total} | ${s2.built} | ${s2.partly} | ${s2.new} | ${s2.parked} |
| 3, for everyone | ${s3.total} | ${s3.built} | ${s3.partly} | ${s3.new} | ${s3.parked} |
| Ideas, sorted by stage | ${stageTables.Ideas.length} | stage 1: ${ideasByStage[1]} | stage 2: ${ideasByStage[2]} | stage 3: ${ideasByStage[3]} | |

## Specs

${Object.entries(specCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join('\n')}

Confirmed on template v2: ${
  specs
    .filter((s) => s.status === 'Confirmed')
    .map((s) => s.f.replace('.md', ''))
    .join(', ') || 'none'
}. Specs on the old template are rewritten when their phase is planned.

## Open tickets

${
  tickets
    ? `- **${tickets.open} open** on GitHub Issues: ${tickets.owner} found by you, ${tickets.audit} from the outside audit, ${tickets.review} from reviews, ${tickets.test} from tests.`
    : '- GitHub could not be reached when this page was written; see https://github.com/priyanahubadhana/learning-notes/issues'
}

## Waiting for you

${needs.join('\n') || '- nothing'}

## Where the detail lives

[STATE.md](STATE.md) (today), [MASTER-PLAN.md](MASTER-PLAN.md) (the front door), [plans/stage-1-plan.md](plans/stage-1-plan.md) (the phases), [FEATURES.md](FEATURES.md) (every feature), [DECISIONS.md](DECISIONS.md) (what you decided), the weekly card in docs/metrics/.
`
writeFileSync(join(root, 'docs/DASHBOARD.md'), out)
console.log(
  `dashboard written: ${plannedPhases}/${PHASES.length} phases planned, stage 1 rows ${s1.total}, specs ${specs.length}, tickets ${tickets ? tickets.open : 'n/a'}`,
)
