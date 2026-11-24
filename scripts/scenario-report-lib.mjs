// B0 (SC-04, SC-05): the scenario report. Pure functions: feature text and the
// test run's JSON in, a page of plain HTML out. Nothing secret goes in: only
// the words of the scenarios, pass / fail marks and the owner's tick rows (no
// error text, no paths, no addresses).
import { latestTicks } from './spec-check-lib.mjs'

const STEP = /^(Given|When|Then|And|But)\s+(.*)$/

/** A feature file's text as { title, scenarios: [{ title, id, tags, steps }] }. */
export function parseFeature(text) {
  const out = { title: '', scenarios: [] }
  let tags = []
  let cur = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('@')) {
      tags = tags.concat(line.split(/\s+/))
      continue
    }
    if (line.startsWith('Feature:')) {
      out.title = line.slice(8).trim()
    } else if (/^Scenario( Outline)?:/.test(line)) {
      const title = line.replace(/^Scenario( Outline)?:\s*/, '')
      cur = { title, id: /^(S\d+)/.exec(title)?.[1] ?? title, tags, steps: [] }
      out.scenarios.push(cur)
    } else if (cur && STEP.test(line)) {
      cur.steps.push(line)
    }
    if (line && !line.startsWith('#')) tags = []
  }
  return out
}

/** { 'S1 title|project': { status, steps: { 'Given text': 'passed'|'failed' } } } from Playwright JSON. */
export function readResults(json) {
  const out = {}
  const flat = (steps, into) => {
    for (const s of steps ?? []) {
      if (STEP.test(s.title)) into[s.title] = s.error ? 'failed' : 'passed'
      flat(s.steps, into)
    }
  }
  const walk = (suite) => {
    for (const s of suite.suites ?? []) walk(s)
    for (const spec of suite.specs ?? [])
      for (const t of spec.tests ?? []) {
        const last = t.results?.[t.results.length - 1]
        const steps = {}
        flat(last?.steps, steps)
        out[`${spec.title}|${t.projectName}`] = {
          // Did the run end as it was expected to (a not-built scenario is expected to fail)?
          outcome: t.status,
          steps,
        }
      }
  }
  for (const s of json.suites ?? []) walk(s)
  return out
}

const PROJECTS = [
  ['bdd-chromium', 'Computer (Chrome)'],
  ['bdd-ipad-webkit', 'iPad stand-in'],
]

/** What one scenario shows: a headline and a mark per sentence and project. */
export function judge(scenario, results, ticks) {
  const per = PROJECTS.map(([project, label]) => ({
    project,
    label,
    result: results[`${scenario.title}|${project}`] ?? null,
  }))
  const notBuilt = scenario.tags.includes('@notbuilt')
  const ran = per.every((p) => p.result)
  const expected = per.every((p) => p.result?.outcome === 'expected')
  const anyRan = per.some((p) => p.result)
  let computer
  if (!ran) computer = anyRan ? 'partly run' : 'not run'
  else if (notBuilt)
    computer = expected ? 'not built yet' : 'now passes: remove @notbuilt'
  else computer = expected ? 'pass' : 'fail'
  const ipad = scenario.tags.includes('@ipad')
  const tick = ipad ? ticks[scenario.id] : undefined
  let headline = computer
  if (ipad && computer !== 'not built yet')
    headline = tick
      ? `owner's iPad check: ${tick.result} (${tick.date}, build ${tick.build})`
      : "needs the owner's iPad check"
  return { per, computer, headline, ipad, tick }
}

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

const MARK = { passed: 'pass', failed: 'fail' }

/** The whole report page. `features` = parseFeature results, `tickRows` from ipadTicks. */
export function renderReport({ features, results, tickRows, build }) {
  const ticks = latestTicks(tickRows)
  const tally = { pass: 0, fail: 0, notBuilt: 0, iPad: 0, other: 0 }
  const blocks = features
    .map((f) => {
      const items = f.scenarios
        .map((s) => {
          const j = judge(s, results, ticks)
          if (j.tick?.result === 'fail') tally.fail++
          else if (j.computer === 'pass' && j.ipad && !j.tick) tally.iPad++
          else if (j.computer === 'pass') tally.pass++
          else if (j.computer === 'fail') tally.fail++
          else if (j.computer === 'not built yet') tally.notBuilt++
          else tally.other++
          const cls =
            j.computer === 'fail' || /remove @notbuilt/.test(j.computer)
              ? 'fail'
              : j.computer === 'pass'
                ? j.ipad && !j.tick
                  ? 'wait'
                  : 'pass'
                : j.computer === 'not built yet'
                  ? 'wait'
                  : 'wait'
          const rows = s.steps
            .map((step) => {
              const cells = j.per
                .map((p) => {
                  const m = p.result?.steps[step]
                  const text = m ? MARK[m] : p.result ? 'not run' : '-'
                  return `<td class="m ${m ?? ''}">${text}</td>`
                })
                .join('')
              return `<tr><td>${esc(step)}</td>${cells}</tr>`
            })
            .join('')
          return `<details class="s ${cls}"><summary><span class="t">${esc(s.title)}</span><span class="h">${esc(j.headline)}</span></summary>
<table><thead><tr><th>Sentence</th>${j.per.map((p) => `<th>${esc(p.label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
${j.ipad ? `<p class="n">${j.tick ? `The owner tried it on the iPad: ${esc(j.tick.result)} (${esc(j.tick.date)}, build ${esc(j.tick.build)}).` : "Only the owner's iPad can decide this one. The marks above are the computer stand-in."}</p>` : ''}
${s.tags.includes('@notbuilt') ? '<p class="n">This part is not built yet. It is expected to fail until it is.</p>' : ''}
</details>`
        })
        .join('\n')
      return `<section><h2>${esc(f.title)}</h2>${items}</section>`
    })
    .join('\n')
  const summary = `${tally.pass} pass, ${tally.fail} fail, ${tally.notBuilt} not built yet${tally.other ? `, ${tally.other} not run` : ''}; ${tally.iPad} wait for the owner's iPad check`
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Scenario report</title>
<style>
:root{--bg:#fff;--fg:#1c1c1e;--mute:#6b6b70;--line:#e3e3e6;--ok:#1b7f3b;--bad:#b3261e;--wait:#8a5a00}
@media (prefers-color-scheme:dark){:root{--bg:#161618;--fg:#f2f2f4;--mute:#a0a0a6;--line:#303034;--ok:#5fcf80;--bad:#ff8a80;--wait:#f0c060}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:16px/1.45 -apple-system,system-ui,sans-serif;max-width:880px;margin-inline:auto}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:28px 0 8px}p{margin:6px 0}.mute,.n{color:var(--mute);font-size:14px}
details.s{border:1px solid var(--line);border-radius:10px;margin:8px 0;padding:0 14px}
summary{cursor:pointer;display:flex;gap:12px;justify-content:space-between;align-items:baseline;padding:12px 0;min-height:44px;box-sizing:border-box}
.h{font-weight:600;white-space:nowrap}.pass .h{color:var(--ok)}.fail .h{color:var(--bad)}.wait .h{color:var(--wait)}
table{width:100%;border-collapse:collapse;font-size:14px;margin:4px 0 10px}th,td{text-align:left;padding:6px 8px;border-top:1px solid var(--line)}
td.m.passed{color:var(--ok)}td.m.failed{color:var(--bad)}
@media (max-width:560px){summary{flex-direction:column;gap:2px}.h{white-space:normal}}
</style></head><body>
<h1>Scenario report</h1>
<p>${esc(summary)}.</p>
<p class="mute">${esc(build)}. Every scenario of every feature file, sentence by sentence. Scenarios marked for the iPad stay "needs the owner's iPad check" until a tick is written in docs/metrics/ipad-checks.md.</p>
${blocks}
</body></html>
`
}
