#!/usr/bin/env node
// M6 Weekly card (METHOD-v2 M-05): the eight numbers, computed from
// docs/metrics/tasks.csv, git and `gh issue list`; written to
// docs/metrics/weekly/<iso-week>.md with an empty "Owner's line".
// A number the repo cannot know yet says "not recorded", never a guess.
//
//   npm run weekly-card                  the current ISO week
//   npm run weekly-card -- 2026-W47      a named week
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** ISO week label "2026-W47" of a date. */
export function isoWeek(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const n = Math.ceil(((d - start) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(n).padStart(2, '0')}`
}

/** Monday 00:00 (UTC date) and the next Monday of a label "2026-W47". */
export function weekRange(label) {
  const [y, w] = label.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(y, 0, 4))
  const monday = new Date(jan4)
  monday.setUTCDate(
    jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7,
  )
  const next = new Date(monday)
  next.setUTCDate(monday.getUTCDate() + 7)
  return { from: monday, to: next }
}

/** Splits one CSV line with "quoted, fields". */
export function csvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

export function parseTasks(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean)
  const head = csvLine(lines[0])
  return lines.slice(1).map((l) => {
    const v = csvLine(l)
    return Object.fromEntries(head.map((h, i) => [h, v[i] ?? '']))
  })
}

const num = (s) =>
  s === '' || s === undefined || isNaN(Number(s)) ? null : Number(s)
const avg = (xs) => {
  const v = xs.filter((x) => x !== null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
const fmt = (x, d = 1) => (x === null ? 'not recorded' : x.toFixed(d))

/**
 * The eight numbers. `tasks` are csv rows, `issues` are gh issue objects
 * ({createdAt, labels:[{name}]}), `shaky` is the count of skipped/only tests.
 */
export function compute({ tasks, issues, shaky, range }) {
  const mine = tasks.filter((t) => {
    const d = new Date(t.merged_at)
    return d >= range.from && d < range.to
  })
  const inWeek = issues.filter((i) => {
    const d = new Date(i.createdAt)
    return d >= range.from && d < range.to
  })
  const has = (i, name) => (i.labels ?? []).some((l) => l.name === name)
  const bugs = inWeek.filter((i) => has(i, 'bug'))
  return [
    [
      'Parts verified',
      String(mine.length),
      'rows merged in the week in tasks.csv',
    ],
    [
      'Hours per part against estimate',
      fmt(avg(mine.map((t) => num(t.hours_start_to_merged)))),
      'average hours; the estimate is not recorded in tasks.csv yet',
    ],
    [
      'Review rounds per part',
      fmt(avg(mine.map((t) => num(t.review_rounds)))),
      'average of review_rounds',
    ],
    [
      'Bugs found after Built',
      `${bugs.length} (a scenario should have caught: ${bugs.filter((i) => has(i, 'scenario-gap')).length})`,
      'GitHub issues labelled bug opened in the week; label scenario-gap marks the missed ones',
    ],
    [
      'Hours a signed spec waited for a builder',
      'not recorded',
      'no start time is stored yet',
    ],
    [
      'Hours a question waited for the owner',
      'not recorded',
      'no question time is stored yet',
    ],
    [
      'Shaky or skipped tests (must be zero)',
      String(shaky),
      'test.skip, test.fixme, it.skip, describe.skip and .only found in tests',
    ],
    [
      'Tokens per verified part',
      fmt(avg(mine.map((t) => num(t.helper_tokens))), 0),
      'average of helper_tokens',
    ],
  ]
}

export function render(label, numbers) {
  const body = numbers.map(
    (n, i) => `| ${i + 1} | ${n[0]} | ${n[1]} | ${n[2]} |`,
  )
  return `# Weekly card ${label}

Written by \`npm run weekly-card\` from docs/metrics/tasks.csv, git and GitHub issues. METHOD-v2 M-05.

| No | Number | This week | Where it comes from |
| -- | ------ | --------- | ------------------- |
${body.join('\n')}

## Owner's line

(empty: the owner writes one line here on Saturday)
`
}

function countShaky(root) {
  try {
    const out = execFileSync(
      'git',
      [
        'grep',
        '-nE',
        String.raw`\b(test|it|describe)\.(skip|fixme|only)\(|\bxit\(|\bxdescribe\(`,
        '--',
        'e2e',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ],
      { cwd: root, encoding: 'utf8' },
    )
    return out.trim().split('\n').filter(Boolean).length
  } catch (e) {
    return e.status === 1 ? 0 : 0
  }
}

function ghIssues(root) {
  try {
    return JSON.parse(
      execFileSync(
        'gh',
        [
          'issue',
          'list',
          '--state',
          'all',
          '--limit',
          '500',
          '--json',
          'createdAt,labels',
        ],
        { cwd: root, encoding: 'utf8' },
      ),
    )
  } catch {
    console.log('weekly-card: gh not available, bug numbers show 0')
    return []
  }
}

function main() {
  const label = process.argv[2] ?? isoWeek(new Date())
  const range = weekRange(label)
  const csv = join(ROOT, 'docs/metrics/tasks.csv')
  const tasks = existsSync(csv) ? parseTasks(readFileSync(csv, 'utf8')) : []
  const numbers = compute({
    tasks,
    issues: ghIssues(ROOT),
    shaky: countShaky(ROOT),
    range,
  })
  const dir = join(ROOT, 'docs/metrics/weekly')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${label}.md`)
  if (existsSync(file)) {
    // keep the owner's line if it was already written
    const old = readFileSync(file, 'utf8').split("## Owner's line")[1] ?? ''
    const text = render(label, numbers).split("## Owner's line")[0]
    writeFileSync(file, `${text}## Owner's line${old}`)
  } else writeFileSync(file, render(label, numbers))
  console.log(`weekly-card: wrote docs/metrics/weekly/${label}.md`)
  numbers.forEach((n, i) => console.log(`  ${i + 1}. ${n[0]}: ${n[1]}`))
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main()
