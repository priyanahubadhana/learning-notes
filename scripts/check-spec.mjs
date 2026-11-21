// B0 (SC-03, SC-06, SC-07, SC-08): `npm run check:spec`. Run by the push guard
// and by CI. Fails on:
//  - a scenario sentence with no step (bddgen stops), a scenario not run
//    (missing from a project, or skipped);
//  - a detail line without an id, an id used twice, a line with no test or
//    scenario named after it, a test naming a line that is not there;
//  - `OPEN:` inside a part whose status is "building";
//  - a spec taken out of the check, or one more id on a waiting list;
//  - a badly written row in docs/metrics/ipad-checks.md.
import { spawnSync, execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import {
  checkGrowth,
  checkSpec,
  idsInTitle,
  ipadTicks,
  scenarios,
  testTitles,
} from './spec-check-lib.mjs'

const root = process.cwd()
const read = (f) => readFileSync(resolve(root, f), 'utf8')
const config = JSON.parse(read('scripts/spec-check.json'))
const problems = []
const notes = []

const files = (dir, re) =>
  readdirSync(resolve(root, dir), { recursive: true })
    .map(String)
    .filter((f) => re.test(f))
    .map((f) => join(dir, f))

// Scenarios.
const featureFiles = files('e2e/features', /\.feature$/)
const all = featureFiles.flatMap((f) =>
  scenarios(read(f)).map((s) => ({ ...s, file: f })),
)

// Detail lines of every spec under the check.
const specSources = files('e2e', /\.spec\.ts$/).map((f) => read(f))
const titles = specSources.flatMap(testTitles)
for (const spec of config.specs) {
  const have = new Set()
  const testIds = new Set()
  for (const t of [...titles, ...all.map((s) => s.title)])
    for (const id of idsInTitle(t, spec.prefix)) {
      have.add(id)
      testIds.add(id)
    }
  // A spec whose tests are made in loops names its ids in the spec's text.
  if (spec.idsFromSource)
    for (const src of specSources)
      for (const id of src.match(
        new RegExp(`${spec.prefix}-[A-Z]?\\d+`, 'g'),
      ) ?? []) {
        have.add(id)
        testIds.add(id)
      }
  const r = checkSpec({
    spec,
    markdown: read(spec.file),
    have,
    testIds: [...testIds],
  })
  problems.push(...r.problems)
  notes.push(...r.notes)
}

// The list of specs and the waiting lists only shrink (against the code line).
const baseRef = process.env.SPEC_CHECK_BASE || 'origin/build/next'
try {
  const base = JSON.parse(
    execFileSync('git', ['show', `${baseRef}:scripts/spec-check.json`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  )
  problems.push(...checkGrowth(config, base))
} catch {
  notes.push(`no ${baseRef} copy of the spec list to compare with`)
}

// The owner's iPad ticks.
if (existsSync(resolve(root, 'docs/metrics/ipad-checks.md'))) {
  const ticks = ipadTicks(read('docs/metrics/ipad-checks.md'))
  for (const b of ticks.bad)
    problems.push(`docs/metrics/ipad-checks.md: row not understood: ${b}`)
  const known = new Set(all.map((s) => /^(S\d+)/.exec(s.title)?.[1]))
  for (const r of ticks.rows)
    if (!known.has(r.id))
      problems.push(`docs/metrics/ipad-checks.md: ${r.id} is not a scenario`)
} else problems.push('docs/metrics/ipad-checks.md is missing')

// A sentence without a step: bddgen stops and names it.
const run = (cmd) =>
  spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64e6 })
const gen = run('npx --no bddgen')
if (gen.status !== 0)
  problems.push(
    'a scenario sentence has no step (or a feature is wrong):\n' +
      `${gen.stdout}${gen.stderr}`
        .trim()
        .split(/\r?\n/)
        .slice(0, 25)
        .join('\n'),
  )
else {
  // A scenario that is not run: it must be listed in both projects.
  const list = run(
    'npx playwright test --list --reporter=json --project=bdd-chromium --project=bdd-ipad-webkit',
  )
  let json
  try {
    json = JSON.parse(list.stdout)
  } catch {
    problems.push(
      'could not list the scenario tests:\n' + list.stderr.slice(0, 600),
    )
  }
  if (json) {
    const seen = new Map()
    const walk = (suite) => {
      for (const s of suite.suites ?? []) walk(s)
      for (const sp of suite.specs ?? [])
        for (const t of sp.tests ?? []) {
          const key = sp.title
          seen.set(key, (seen.get(key) ?? new Set()).add(t.projectName))
          if (t.expectedStatus === 'skipped')
            problems.push(`scenario "${sp.title}" is skipped`)
        }
    }
    for (const s of json.suites ?? []) walk(s)
    for (const s of all) {
      const where = seen.get(s.title)
      for (const p of ['bdd-chromium', 'bdd-ipad-webkit'])
        if (!where?.has(p))
          problems.push(`scenario "${s.title}" is not run in ${p}`)
      if (s.tags.some((t) => t === '@skip' || t === '@only'))
        problems.push(`scenario "${s.title}" is tagged ${s.tags.join(' ')}`)
    }
  }
}

for (const n of notes) console.log(`check:spec note: ${n}`)
if (problems.length) {
  console.error(`check:spec FAILED (${problems.length}):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(
  `check:spec ok: ${all.length} scenarios in ${featureFiles.length} feature file(s), ${config.specs.length} spec(s)`,
)
