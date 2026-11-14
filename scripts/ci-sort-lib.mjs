// Pure parts of the CI failure sorter (no AI, plain rules). The CLI is
// scripts/ci-sort.mjs; this file only parses logs and builds the lines.
const MAX_LINES = 20
const TEST_LINE = /^\s*\[([\w-]+)\] › (\S+?\.spec\.ts):(\d+):\d+ › (.*?)\s*$/

export const testKey = (t) => `${t.file}|${t.title}`

/** Split one `gh run view --log-failed` line into job, step and text. */
function splitLine(raw) {
  const p = raw.replace(/^﻿/, '').split('\t')
  if (p.length < 3) return null
  const text = p
    .slice(2)
    .join('\t')
    .replace(/^﻿/, '')
    .replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z ?/, '')
  return { job: p[0], step: p[1], text }
}

/**
 * Parse a failed-run log. Failing tests come from Playwright's closing
 * summary ("N failed" / "N flaky" blocks), so retries are not counted twice.
 */
export function parseFailedLog(log) {
  const failed = []
  const flaky = []
  const failedSteps = []
  const seen = new Set()
  const jobSection = new Map()
  for (const raw of log.split(/\r?\n/)) {
    const l = splitLine(raw)
    if (!l) continue
    if (/^checks\b/.test(l.job)) {
      const s = l.step.replace(/^Run /, '')
      if (!failedSteps.includes(s)) failedSteps.push(s)
      continue
    }
    const head = l.text.match(
      /^\s{2}(\d+) (failed|flaky|skipped|passed|did not run|interrupted)\b/,
    )
    if (head) {
      jobSection.set(l.job, head[2])
      continue
    }
    const m = l.text.match(TEST_LINE)
    const section = jobSection.get(l.job)
    if (!m || !/^ {4}\[/.test(l.text)) continue
    if (section !== 'failed' && section !== 'flaky') continue
    const t = { project: m[1], file: m[2], line: Number(m[3]), title: m[4] }
    const id = `${section}|${t.project}|${t.file}:${t.line}|${t.title}`
    if (seen.has(id)) continue
    seen.add(id)
    ;(section === 'failed' ? failed : flaky).push(t)
  }
  return { failed, flaky, failedSteps }
}

/**
 * history: one Set of failed test keys per recent finished run (up to 5).
 * changedFiles: files changed after the last green run on the branch.
 */
export function buildReport({ parsed, history, changedFiles }) {
  const lines = []
  let anyNew = false
  let anyRepeat = false
  let anyShaky = false
  let anyChanged = false
  for (const s of parsed.failedSteps) lines.push(`SIMPLE CHECK: ${s}`)
  const changed = new Set(changedFiles)
  const n = history.length
  for (const t of parsed.failed) {
    const hits = history.filter((h) => h.has(testKey(t))).length
    const mark =
      hits > 0
        ? `REPEAT: also failed in ${hits} of the last ${n} finished runs`
        : 'NEW'
    if (hits > 0) anyRepeat = true
    else anyNew = true
    const edited = changed.has(t.file)
    if (edited && hits === 0) anyChanged = true
    lines.push(
      `${t.file}:${t.line} ${t.title} [${t.project}] ${mark}` +
        (edited ? ' - TEST FILE CHANGED SINCE THE LAST GREEN RUN' : ''),
    )
  }
  for (const t of parsed.flaky) {
    anyShaky = true
    lines.push(
      `${t.file}:${t.line} ${t.title} [${t.project}] SHAKY: passed on retry`,
    )
  }
  const advice = []
  if (parsed.failedSteps.length) advice.push('simple check = fix and push')
  if (anyNew)
    advice.push(
      anyChanged
        ? 'NEW with a changed test file = stale test or new bug, look at the last merge'
        : 'NEW = look at the last merge (stale test or new bug)',
    )
  if (anyRepeat) advice.push('REPEAT = root cause, Opus builder')
  if (anyShaky) advice.push('SHAKY = note it, do not edit the test')
  if (!advice.length)
    advice.push('no failing test found in the log; open the run')
  const adviceLine = `ADVICE: ${advice.join('; ')}`
  if (lines.length > MAX_LINES - 1) {
    const extra = lines.length - (MAX_LINES - 2)
    lines.length = MAX_LINES - 2
    lines.push(`... and ${extra} more`)
  }
  return [...lines, adviceLine]
}

/** True when `gh` is installed and signed in. exec(args) throws on failure. */
export function ghReady(exec) {
  try {
    exec(['--version'])
    exec(['auth', 'status'])
    return true
  } catch {
    return false
  }
}
