// B0 (SC-03, SC-06, SC-07): the pure parts of `npm run check:spec`. No file or
// process access here, so every rule is unit-tested (specCheck.test.mjs).

/** "LS-50..LS-56" becomes the ids between; "LS-N1..LS-N6" and "LS-12" work too. */
export function expandIds(list) {
  const out = []
  for (const item of list) {
    const m = /^([A-Z]+)-([A-Z]?)(\d+)\.\.\1-\2(\d+)$/.exec(item)
    if (!m) {
      out.push(item)
      continue
    }
    const width = m[3].length
    for (let n = Number(m[3]); n <= Number(m[4]); n++)
      out.push(`${m[1]}-${m[2]}${String(n).padStart(width, '0')}`)
  }
  return out
}

/**
 * The detail lines of a spec page: every "- **LS-12**" bullet between the
 * heading `from` and the heading `to`. Also the bullets there that carry no id.
 */
export function detailLines(markdown, prefix, from, to) {
  const lines = markdown.split(/\r?\n/)
  const start = lines.findIndex((l) => l.startsWith(from))
  const end = lines.findIndex((l, i) => i > start && l.startsWith(to))
  const body = start < 0 ? [] : lines.slice(start, end < 0 ? undefined : end)
  const idRe = new RegExp(
    `^- (?:\`[^\`]*\` )?\\*\\*(${prefix}-[A-Z]?\\d+)\\*\\*`,
  )
  const ids = []
  const lacking = []
  for (const text of body) {
    if (!text.startsWith('- ')) continue
    const m = idRe.exec(text)
    if (m) ids.push({ id: m[1], text })
    else lacking.push(text)
  }
  return { ids, lacking }
}

/** Ids that appear twice. */
export const duplicates = (ids) => [
  ...new Set(ids.filter((id, i) => ids.indexOf(id) !== i)),
]

/**
 * The ids a test or scenario title names at its start ("LS-03, LS-04 and ..."),
 * and those in a scenario's [LS-12, LS-22] brackets.
 */
export function idsInTitle(title, prefix) {
  const one = `${prefix}-[A-Z]?\\d+`
  const lead = new RegExp(`^(${one}(?:[ ,/&+]+(?:and )?${one})*)`).exec(title)
  const found = new Set(lead ? lead[1].match(new RegExp(one, 'g')) : [])
  const br = /\[([^\]]*)\]/.exec(title)
  if (br) for (const m of br[1].matchAll(new RegExp(one, 'g'))) found.add(m[0])
  return [...found]
}

/** The first argument of every `test(` / `test.skip(` / `it(` call in a spec's text. */
export function testTitles(source) {
  const re = /\b(?:test|it)(?:\.\w+)*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g
  return [...source.matchAll(re)].map((m) => m[2])
}

/** Scenario titles and their tags from a feature file's text. */
export function scenarios(feature) {
  const out = []
  let tags = []
  for (const raw of feature.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('@')) tags = tags.concat(line.split(/\s+/))
    else if (/^Scenario( Outline)?:/.test(line)) {
      out.push({ title: line.replace(/^Scenario( Outline)?:\s*/, ''), tags })
      tags = []
    } else if (line && !line.startsWith('#')) tags = []
  }
  return out
}

/**
 * The checks on one spec page. `have` = ids that have a test or scenario named
 * after them. Returns a list of problems (empty = fine) and notes.
 */
export function checkSpec({ spec, markdown, have, testIds }) {
  const problems = []
  const notes = []
  const { ids, lacking } = detailLines(
    markdown,
    spec.prefix,
    spec.from,
    spec.to,
  )
  const all = ids.map((d) => d.id)
  for (const l of lacking)
    problems.push(`${spec.file}: a detail line has no id: ${l.slice(0, 70)}`)
  for (const id of duplicates(all))
    problems.push(`${spec.file}: id ${id} is used twice`)
  const waiting = new Set(expandIds(spec.waiting ?? []))
  for (const id of waiting)
    if (!all.includes(id))
      problems.push(`${spec.file}: waiting list names ${id}, not in the spec`)
  for (const id of all) {
    if (have.has(id)) {
      if (waiting.has(id))
        notes.push(`${id} has a test now: remove it from the waiting list`)
    } else if (!waiting.has(id))
      problems.push(`${spec.file}: ${id} has no test named after it`)
  }
  for (const id of testIds)
    if (!all.includes(id) && !(spec.extraIds ?? []).includes(id))
      problems.push(`a test names ${id}, which is not in ${spec.file}`)
  // SC-07: OPEN: inside a part that is being built.
  const building = new Set(
    expandIds(
      (spec.parts ?? [])
        .filter((p) => p.status === 'building')
        .flatMap((p) => p.ids),
    ),
  )
  for (const d of ids)
    if (building.has(d.id) && /\bOPEN:/.test(d.text))
      problems.push(
        `${spec.file}: ${d.id} has OPEN: but its part is being built`,
      )
  return { problems, notes }
}

/** The list of specs and the waiting lists may only shrink against `base`. */
export function checkGrowth(now, base) {
  const problems = []
  if (!base) return problems
  for (const b of base.specs ?? []) {
    const n = (now.specs ?? []).find((s) => s.file === b.file)
    if (!n) {
      problems.push(`the spec ${b.file} was taken out of the check`)
      continue
    }
    const was = new Set(expandIds(b.waiting ?? []))
    for (const id of expandIds(n.waiting ?? []))
      if (!was.has(id))
        problems.push(`${b.file}: ${id} was added to the waiting list`)
  }
  return problems
}

/** Rows of docs/metrics/ipad-checks.md: | S2 | 2026-11-21 | build | pass |. */
export function ipadTicks(markdown) {
  const rows = []
  const bad = []
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue
    const c = line
      .split('|')
      .slice(1, -1)
      .map((x) => x.trim())
    if (c.length < 4 || /^-+$/.test(c[0]) || /^scenario$/i.test(c[0])) continue
    const ok =
      /^S\d+$/.test(c[0]) &&
      /^\d{4}-\d{2}-\d{2}$/.test(c[1]) &&
      c[2] !== '' &&
      /^(pass|fail)$/i.test(c[3])
    if (ok)
      rows.push({
        id: c[0],
        date: c[1],
        build: c[2],
        result: c[3].toLowerCase(),
      })
    else bad.push(line)
  }
  return { rows, bad }
}

/** The newest tick of each scenario id. */
export function latestTicks(rows) {
  const out = {}
  for (const r of rows)
    if (!out[r.id] || r.date >= out[r.id].date) out[r.id] = r
  return out
}
