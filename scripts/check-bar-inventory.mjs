#!/usr/bin/env node
// AB-02: every Action bar picture (and later every bar build) must show the
// tool table of docs/features/action-bar.md, state by state, in order.
//
// The table lives between <!-- tool-table:start --> and <!-- tool-table:end -->.
// A picture declares its bars in HTML:
//
//   <div data-bar-state="A box">
//     <button data-tool="⠿"></button> <button data-tool="pin"></button>
//     <button data-tool="Edit text"></button> ... <button data-tool="⋯▾"></button>
//     <ul data-bar-more><li data-tool="Duplicate"></li> ...</ul>
//   </div>
//
// A tool written "Cut (grey)" in the table must carry data-flag="grey";
// "pin (filled)" must carry data-flag="filled". Rows whose text is a rule, not
// a list (PC mouse notes, Phone), are skipped. Every bar starts with ⠿ and the
// pin unless its row already names the pin.
//
// Run: npm run check:bar-inventory [file.html ...]  (default: docs/mockups/action-bar/*.html)
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
export const SPEC = join(root, 'docs/features/action-bar.md')
export const PICTURES = join(root, 'docs/mockups/action-bar')

const RULE_ROWS = new Set(['PC mouse notes', 'Phone'])

/** Splits "Cut (grey), Paste ▾" into [{name:'Cut', flag:'grey'}, {name:'Paste ▾'}]. */
export function parseTools(cell) {
  return cell
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.*?)\s*\((\w+)\)$/)
      return m ? { name: m[1].trim(), flag: m[2] } : { name: s }
    })
}

/** Reads the tool table of the spec: [{state, stage, bar:[...], more:[...]}]. */
export function parseTable(markdown) {
  const block = markdown
    .split('<!-- tool-table:start -->')[1]
    ?.split('<!-- tool-table:end -->')[0]
  if (!block) throw new Error('tool-table markers not found in the spec')
  const rows = []
  for (const line of block.split('\n')) {
    if (!line.startsWith('|')) continue
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    if (cells.length < 4 || cells[0] === 'State' || /^-+$/.test(cells[0]))
      continue
    const [state, stage, bar, more] = cells
    if (RULE_ROWS.has(state)) continue
    const tools = parseTools(bar)
    const prefix = tools.some((t) => t.name === 'pin')
      ? [{ name: '⠿' }]
      : [{ name: '⠿' }, { name: 'pin' }]
    rows.push({
      state,
      stage: Number(stage),
      bar: [...prefix, ...tools],
      more: parseTools(more),
    })
  }
  return rows
}

/** Reads the bars a picture declares: {state: {bar:[...], more:[...]}}. */
export function parsePicture(html) {
  const bars = {}
  const re = /<([a-z][\w-]*)([^>]*)\sdata-bar-state="([^"]+)"([^>]*)>/g
  let m
  while ((m = re.exec(html))) {
    const tag = m[1]
    const state = m[3]
    const start = m.index + m[0].length
    const end = closeOf(html, tag, start)
    const inner = html.slice(start, end)
    const moreStart = inner.search(/<[a-z][\w-]*[^>]*\sdata-bar-more[\s>=]/)
    const barPart = moreStart >= 0 ? inner.slice(0, moreStart) : inner
    const morePart = moreStart >= 0 ? inner.slice(moreStart) : ''
    bars[state] = { bar: toolsIn(barPart), more: toolsIn(morePart) }
  }
  return bars
}

function toolsIn(fragment) {
  const out = []
  const re = /<[a-z][\w-]*([^>]*)\sdata-tool="([^"]+)"([^>]*)>/g
  let m
  while ((m = re.exec(fragment))) {
    const attrs = m[1] + m[3]
    const flag = attrs.match(/\sdata-flag="(\w+)"/)
    out.push(flag ? { name: m[2], flag: flag[1] } : { name: m[2] })
  }
  return out
}

/** Index just after the matching close tag of `tag`, counting nesting. */
function closeOf(html, tag, from) {
  const re = new RegExp(`<(/?)${tag}(?=[\\s>/])[^>]*>`, 'g')
  re.lastIndex = from
  let depth = 1
  let m
  while ((m = re.exec(html))) {
    if (m[0].endsWith('/>')) continue
    depth += m[1] ? -1 : 1
    if (depth === 0) return m.index
  }
  return html.length
}

const label = (t) => (t.flag ? `${t.name} (${t.flag})` : t.name)

/** Compares one list; returns problems as strings. */
export function compareList(expected, actual, where) {
  const problems = []
  const same = (a, b) => a.name === b.name && (a.flag ?? '') === (b.flag ?? '')
  for (const t of expected) {
    if (!actual.some((a) => same(a, t)))
      problems.push(`${where}: missing ${label(t)}`)
  }
  for (const a of actual) {
    if (!expected.some((t) => same(a, t)))
      problems.push(`${where}: extra ${label(a)}`)
  }
  if (problems.length === 0) {
    const order = actual.map(label).join(', ')
    const want = expected.map(label).join(', ')
    if (order !== want)
      problems.push(`${where}: order is "${order}", the table says "${want}"`)
  }
  return problems
}

/**
 * Checks a picture against the table. Only stage-1 rows are required unless
 * `requiredStages` says otherwise; a drawn bar of any state is always checked.
 */
export function checkPicture(table, bars, { requiredStages = [1] } = {}) {
  const problems = []
  for (const row of table) {
    const drawn = bars[row.state]
    if (!drawn) {
      if (requiredStages.includes(row.stage))
        problems.push(`${row.state}: not drawn (stage ${row.stage} row)`)
      continue
    }
    problems.push(
      ...compareList(row.bar, drawn.bar, `${row.state}, on the bar`),
    )
    problems.push(
      ...compareList(row.more, drawn.more, `${row.state}, inside ⋯▾`),
    )
  }
  for (const state of Object.keys(bars)) {
    if (!table.some((r) => r.state === state))
      problems.push(`${state}: drawn, but not a state of the table`)
  }
  return problems
}

export function run(files, { spec = SPEC } = {}) {
  const table = parseTable(readFileSync(spec, 'utf8'))
  let failed = 0
  for (const file of files) {
    const problems = checkPicture(
      table,
      parsePicture(readFileSync(file, 'utf8')),
    )
    if (problems.length === 0) {
      console.log(`ok   ${file}`)
    } else {
      failed++
      console.log(`FAIL ${file}`)
      for (const p of problems) console.log(`     ${p}`)
    }
  }
  return failed
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let files = process.argv.slice(2)
  if (files.length === 0) {
    files = existsSync(PICTURES)
      ? readdirSync(PICTURES)
          .filter((f) => f.endsWith('.html'))
          .map((f) => join(PICTURES, f))
      : []
  }
  if (files.length === 0) {
    console.log(
      'check:bar-inventory: no pictures yet (docs/mockups/action-bar/*.html); nothing to check',
    )
    process.exit(0)
  }
  process.exit(run(files) ? 1 : 0)
}
