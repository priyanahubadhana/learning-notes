#!/usr/bin/env node
// M5 Analyze v1 (METHOD-v2 S4, S5, rule 7). Reads every spec in docs/features/
// and part card in docs/features/parts/ that is on template v2 and checks:
//   1 every rule id appears in a scenario (or a "covered by" row naming one)
//   2 every scenario id (S1, S2 ...) appears in an e2e test of that spec
//   3 every row of the bottom-layer Task table has a task id (T1, T2 ...)
//   4 the "Builds on" cell is present and not empty
//   5 shared-part reuse: private placement functions outside the part files
//     may only go down against docs/metrics/ratchet.json (global check)
//   6 status badge: computed from 1 to 5, written to docs/qa/analyze-report.md
// A spec's own status cell is never edited. Old-template pages are skipped.
//
//   npm run analyze                  print findings, write the report, exit 1 on a failure
//   npm run analyze -- --no-write    print only (the push guard uses this)
//   npm run analyze -- --update-ratchet   store today's private-copy count
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(here, '..')

const PLACEMENT =
  /\b(?:function|const|let)\s+((?:place|position|float)\w*(?:Bar|Pill|Toolbar|Popover|Menu|Panel|Beside)\w*|floating\w*|positionOf)\b/gi

const walk = (dir, test, out = []) => {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) walk(full, test, out)
    else if (test(full)) out.push(full)
  }
  return out
}
const rel = (root, p) => relative(root, p).split(sep).join('/')

/** Splits a markdown page into {heading, level, lines} sections. */
export function sections(md) {
  const out = [{ heading: '', level: 0, lines: [] }]
  let fence = false
  for (const line of md.split('\n')) {
    if (/^```/.test(line)) fence = !fence
    const h = !fence && line.match(/^(#{1,6})\s+(.*)$/)
    if (h) out.push({ heading: h[2].trim(), level: h[1].length, lines: [] })
    else out[out.length - 1].lines.push(line)
  }
  return out
}

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

/** Tables in a block of lines: [{header:[...], rows:[[...]]}]. */
export function tables(lines) {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].trim().startsWith('|') &&
      /^\|?\s*:?-{2,}/.test(lines[i + 1] ?? '')
    ) {
      const t = { header: cells(lines[i]), rows: [] }
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|'))
        t.rows.push(cells(lines[i++]))
      i--
      out.push(t)
    }
  }
  return out
}

/** Reads one page: v2 or not, header row values, rule ids, scenario ids. */
export function parsePage(md, kind) {
  const secs = sections(md)
  const heads = secs.map((s) => s.heading)
  const isV2 =
    kind === 'part'
      ? heads.includes('Scenarios') && heads.includes('Behaviour')
      : heads.some((h) => /^Confirm sheet/i.test(h))
  const top = []
  for (const s of secs) {
    if (s.level >= 2) break
    top.push(...s.lines)
  }
  const first = tables(top)[0]
  const header = {}
  if (first && first.rows[0])
    first.header.forEach((h, i) => (header[h] = first.rows[0][i] ?? ''))
  // rule ids: bold at a bullet start, or the first cell of a table row
  const ruleIds = new Set()
  for (const line of md.split('\n')) {
    const b = line.match(/^\s*[-*]\s+\*\*([A-Z]{2,4}-N?\d+)\b/)
    if (b) ruleIds.add(b[1])
  }
  const scen = secs.find((s) => s.heading === 'Scenarios')
  const scenarioIds = []
  for (const line of scen?.lines ?? []) {
    const m = line.match(/^\s*[-*]\s+\*\*(?:[A-Z]{2,4}-)?(S\d+)\b/)
    if (m) scenarioIds.push(m[1])
  }
  return { isV2, header, secs, ruleIds: [...ruleIds], scenarioIds, text: md }
}

/** Check 1. Returns failure strings. */
export function checkRules(page) {
  const out = []
  const scenText = (
    page.secs.find((s) => s.heading === 'Scenarios')?.lines ?? []
  ).join('\n')
  const lines = page.text.split('\n')
  for (const id of page.ruleIds) {
    const re = new RegExp(`\\b${id}\\b`)
    const def = new RegExp(`^\\s*[-*]\\s+\\*\\*${id}\\b`)
    // a "covered by" row names the rule and a scenario; the definition line does not count
    const ok =
      re.test(scenText) ||
      lines.some((l) => re.test(l) && !def.test(l) && /\bS\d+\b/.test(l))
    if (!ok) out.push(`rule ${id} is in no scenario`)
  }
  return out
}

/** Test files: e2e specs and part tests. */
export function testTexts(root) {
  const files = [
    ...walk(join(root, 'e2e'), (f) => /\.spec\.ts$/.test(f)),
    ...walk(join(root, 'src/design/parts'), (f) => /\.test\.tsx?$/.test(f)),
  ]
  return files.map((f) => ({
    file: rel(root, f),
    text: readFileSync(f, 'utf8'),
  }))
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Check 2. A test file counts when it names the spec's switch or file id. */
export function checkScenarios(page, specId, tests) {
  const names = new Set([specId])
  const sw = (page.header['Switch'] ?? '').match(/`([^`]+)`/)
  if (sw) names.add(sw[1])
  const code = (page.header['Code'] ?? '').match(/`([^`]+)`/)
  if (code)
    names.add(
      code[1]
        .replace(/\.tsx?$/, '')
        .split('/')
        .pop(),
    )
  const mine = tests.filter((t) =>
    [...names].some((n) => new RegExp(escapeRe(n)).test(t.text)),
  )
  const out = []
  for (const id of page.scenarioIds) {
    const re = new RegExp(`(?<![\\w])(?:[A-Z]{2,4}-)?${id}(?!\\d)`)
    if (!mine.some((t) => re.test(t.text)))
      out.push(
        `scenario ${id} is in no test file naming ${[...names].join(' or ')}`,
      )
  }
  return out
}

/** Check 3. Bottom layer Task table rows each start with T<number>. */
export function checkTasks(page) {
  const bottom = page.secs.findIndex((s) => /^Bottom layer/i.test(s.heading))
  if (bottom < 0) return ['no "Bottom layer" section, so no task table']
  const lines = []
  for (let i = bottom + 1; i < page.secs.length; i++) {
    if (page.secs[i].level <= page.secs[bottom].level) break
    lines.push(...page.secs[i].lines)
  }
  const found = tables(lines).filter((x) => /^Task/i.test(x.header[0]))
  if (found.length === 0) return ['no Task table in the bottom layer']
  const out = []
  for (const t of found)
    t.rows.forEach((r, i) => {
      if (!/^T\d+\b/.test(r[0])) out.push(`task row ${i + 1} has no task id`)
    })
  return out
}

/** Check 4. */
export function checkBuildsOn(page) {
  const v = page.header['Builds on']
  if (v === undefined) return ['no "Builds on" column in the header row']
  if (!v.trim()) return ['the "Builds on" cell is empty']
  return []
}

/** Check 5 counting: private placement functions outside the part files. */
export function countPrivateCopies(root) {
  const files = {}
  let total = 0
  for (const f of walk(join(root, 'src'), (p) => /\.(ts|tsx)$/.test(p))) {
    const r = rel(root, f)
    if (/\.(test|spec)\.tsx?$/.test(r) || r.startsWith('src/vendor/')) continue
    if (r.startsWith('src/design/parts/') || r.startsWith('src/app/overlay/'))
      continue
    const n = [...readFileSync(f, 'utf8').matchAll(PLACEMENT)].length
    if (n) {
      files[r] = n
      total += n
    }
  }
  return { total, files }
}

export function checkRatchet(root) {
  const now = countPrivateCopies(root)
  const file = join(root, 'docs/metrics/ratchet.json')
  if (!existsSync(file))
    return { now, stored: null, out: ['docs/metrics/ratchet.json is missing'] }
  const stored = JSON.parse(readFileSync(file, 'utf8')).privateCopies
  const out =
    now.total > stored
      ? [`private placement copies grew: ${now.total} now, ${stored} stored`]
      : []
  return { now, stored, out }
}

/** Runs everything. Returns {rows, skipped, ratchet}. */
export function analyze(root = ROOT) {
  const tests = testTexts(root)
  const rows = []
  const skipped = []
  const parts = `${sep}parts${sep}`
  const pages = [
    ...walk(join(root, 'docs/features'), (f) => f.endsWith('.md'))
      .filter((f) => !f.includes(parts))
      .map((f) => [f, 'spec']),
    ...walk(join(root, 'docs/features/parts'), (f) => f.endsWith('.md')).map(
      (f) => [f, 'part'],
    ),
  ]
  for (const [f, kind] of pages.sort()) {
    const name = rel(root, f)
    if (name.split('/').pop().startsWith('_')) continue
    const page = parsePage(readFileSync(f, 'utf8'), kind)
    if (!page.isV2) {
      skipped.push(name)
      continue
    }
    const id = name.split('/').pop().replace(/\.md$/, '')
    const checks = {
      1: checkRules(page),
      2: checkScenarios(page, id, tests),
      3: kind === 'part' ? [] : checkTasks(page),
      4: kind === 'part' ? [] : checkBuildsOn(page),
    }
    const failed = Object.entries(checks).flatMap(([n, list]) =>
      list.map((m) => ({ check: Number(n), message: m })),
    )
    const word = (page.header['Status'] ?? '').trim().split(/[\s(]/)[0]
    let computed
    if (['Built', 'Verified', 'Live'].includes(word)) computed = 'not computed'
    else if (failed.length) computed = 'Draft'
    else computed = word === 'Confirmed' ? 'Confirmed' : 'Draft'
    rows.push({ name, kind, header: word || '?', computed, failed })
  }
  return { rows, skipped, ratchet: checkRatchet(root) }
}

function table(headers, rows) {
  const all = [headers, ...rows]
  const w = headers.map((_, i) => Math.max(3, ...all.map((r) => r[i].length)))
  const line = (r) => `| ${r.map((c, i) => c.padEnd(w[i])).join(' | ')} |`
  return [
    line(headers),
    `| ${w.map((n) => '-'.repeat(n)).join(' | ')} |`,
    ...rows.map(line),
  ].join('\n')
}

const HOW = `# Analyze report

Written by \`npm run analyze\` (scripts/analyze.mjs). Never edited by hand.

## How to read it

- One row per spec or part card on template v2. Pages on the old template are listed at the bottom and skipped, not failed.
- **Page says** is the status cell of the page. **Computed** is what the checks allow: Draft if any check fails; Confirmed if the page says Confirmed and every check passes. Built, Verified and Live are set by later parts, so they show "not computed". The page's own status cell is never changed.
- **Failed checks** use these numbers: 1 a rule id is in no scenario; 2 a scenario id is in no test file that names the spec; 3 a task row has no task id; 4 "Builds on" is missing or empty.
- Check 5 is global: private placement functions outside the part files may only go down against docs/metrics/ratchet.json. Lower the stored number with \`npm run analyze -- --update-ratchet\` after removing a copy.
- To fix a row: open the page, do what the failing line says, run \`npm run analyze\` again.
`

export function report(result) {
  const { rows, skipped, ratchet } = result
  const pass = rows.filter((r) => r.failed.length === 0).length
  const body = rows.map((r) => [
    r.name,
    r.header,
    r.computed,
    r.failed.length
      ? [...new Set(r.failed.map((f) => f.check))].join(', ')
      : 'none',
  ])
  return `${HOW}
## Result

${pass} of ${rows.length} pages pass; ${rows.length - pass} fail. Private placement copies: ${ratchet.now.total} (stored limit ${ratchet.stored ?? 'none'}).

${table(['Page', 'Page says', 'Computed', 'Failed checks'], body)}

## Old template, skipped

${skipped.length ? skipped.map((s) => `- ${s}`).join('\n') : 'none'}
`
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--update-ratchet')) {
    const now = countPrivateCopies(ROOT)
    mkdirSync(join(ROOT, 'docs/metrics'), { recursive: true })
    writeFileSync(
      join(ROOT, 'docs/metrics/ratchet.json'),
      JSON.stringify(
        {
          note: 'Private placement or floating-bar functions outside the part files (scripts/analyze.mjs check 5). May only go down.',
          privateCopies: now.total,
          files: now.files,
        },
        null,
        2,
      ) + '\n',
    )
    console.log(`analyze: ratchet stored at ${now.total}`)
    return 0
  }
  const result = analyze()
  let failures = 0
  for (const r of result.rows)
    for (const f of r.failed) {
      failures++
      console.log(`FAIL ${r.name}: check ${f.check}: ${f.message}`)
    }
  for (const m of result.ratchet.out) {
    failures++
    console.log(`FAIL repo: check 5: ${m}`)
  }
  for (const s of result.skipped)
    console.log(`skip ${s}: old template, skipped`)
  const pass = result.rows.filter((r) => r.failed.length === 0).length
  console.log(
    `analyze: ${pass} of ${result.rows.length} v2 pages pass, ${result.rows.length - pass} fail, ${result.skipped.length} old-template skipped, private copies ${result.ratchet.now.total}/${result.ratchet.stored}`,
  )
  if (!args.includes('--no-write')) {
    mkdirSync(join(ROOT, 'docs/qa'), { recursive: true })
    writeFileSync(join(ROOT, 'docs/qa/analyze-report.md'), report(result))
  }
  return failures ? 1 : 0
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exit(main())
}
