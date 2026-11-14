// PreToolUse: block edits that weaken tests.
// Blocks: new .only, new .skip/.fixme, raised timeouts (timeout, actionTimeout, expect timeout,
// setTimeout) or retries, grepInvert/testIgnore, fewer expect() calls, emptied or deleted test files.
// Reason channel (owner-approved 13 Nov 2026): the hook cannot see commit messages, so a weakening
// is allowed only when the same added line, or the line just above it, carries a comment
// `test-guard-reason: <at least 5 words>`. The commit message must repeat the reason (docs/HOW-WE-BUILD.md section 8).
// Deleting a test file through Bash needs the same comment inside the command text.
// Edit|Write|MultiEdit are wired in settings.json; the Bash branch works once a Bash matcher points here.
import { existsSync, readFileSync } from 'node:fs'
import { input } from './lib.mjs'

const d = input()
const t = d.tool_input || {}

const testPathRe =
  /(^|[\\/])e2e[\\/]|\.(spec|test)\.[cm]?[jt]sx?(\b|$)|(playwright|vitest)\.config\.[cm]?[jt]s/
const reasonRe = /test-guard-reason:\s*((?:[^\s*/]+\s+){4}[^\s*/]+)/
const hasReason = (s) => reasonRe.test(s || '')
const fail = (msg) => {
  console.error(
    `Blocked by the test guard: ${msg} Tests must never be weakened (rules/quality.md). ` +
      'Fix the code instead, or stop and report. Only if the owner-approved exception applies, add the comment ' +
      '`test-guard-reason: <at least 5 words>` on that line (or the line above) and repeat the reason in the commit message.',
  )
  process.exit(2)
}

if (d.tool_name === 'Bash') {
  const c = String(t.command || '')
  const del = /(^|[\s;&|(])(rm|unlink|del|erase|rmdir|Remove-Item|ri)(\s|$)|git\s+rm\b/i.test(c)
  if (del && testPathRe.test(c) && !hasReason(c)) fail('this command deletes a test file.')
  process.exit(0)
}

const p = String(t.file_path || '').replace(/\\/g, '/')
if (!testPathRe.test(p)) process.exit(0)

let before = ''
let after = ''
if (d.tool_name === 'Write') {
  before = existsSync(t.file_path) ? readFileSync(t.file_path, 'utf8') : ''
  after = t.content || ''
} else if (d.tool_name === 'MultiEdit') {
  for (const e of t.edits || []) {
    before += (e.old_string || '') + '\n'
    after += (e.new_string || '') + '\n'
  }
} else {
  before = t.old_string || ''
  after = t.new_string || ''
}

const count = (s, re) => (s.match(re) || []).length
const maxNum = (s, key) => {
  const re = new RegExp(`${key}\\s*[:=(]\\s*([0-9_]+)`, 'gi')
  const n = [...s.matchAll(re)].map((m) => Number(m[1].replace(/_/g, '')))
  return n.length ? Math.max(...n) : null
}

// Added lines (multiset difference), each with the line just above it in the new text.
const seen = new Map()
for (const l of before.split('\n')) seen.set(l.trim(), (seen.get(l.trim()) || 0) + 1)
const added = []
const aLines = after.split('\n')
aLines.forEach((l, i) => {
  const k = l.trim()
  if ((seen.get(k) || 0) > 0) seen.set(k, seen.get(k) - 1)
  else added.push({ line: l, above: i > 0 ? aLines[i - 1] : '' })
})
// True when an added line matching `re` has no reason on it or just above it.
const unreasoned = (re) =>
  added.some((a) => re.test(a.line) && !hasReason(a.line) && !hasReason(a.above))

const problems = []
const onlyRe = /\.only\s*\(|\b(fit|fdescribe)\s*\(/g
if (count(after, onlyRe) > count(before, onlyRe)) problems.push('adds .only')
const skipRe = /\.(skip|fixme)\s*\(|\b(xit|xdescribe)\s*\(/
if (count(after, new RegExp(skipRe, 'g')) > count(before, new RegExp(skipRe, 'g')) && unreasoned(skipRe))
  problems.push('adds .skip/.fixme')
const expRe = /\bexpect\s*[.(]/g
if (count(after, expRe) < count(before, expRe)) problems.push('removes assertions (expect)')
for (const k of ['\\btimeout', 'actionTimeout', 'navigationTimeout', 'setTimeout', '\\bretries']) {
  const a = maxNum(after, k)
  const b = maxNum(before, k)
  if (a !== null && b !== null && a > b && unreasoned(new RegExp(k, 'i')))
    problems.push(`raises ${k.replace('\\b', '')} (${b} -> ${a})`)
}
// A longer-timeout setting added where the old text had none to compare with.
for (const k of ['actionTimeout', 'navigationTimeout', 'setTimeout']) {
  if (maxNum(before, k) === null && unreasoned(new RegExp(`${k}\\s*[:(]`))) problems.push(`adds ${k}`)
}
if (!/\.slow\s*\(/.test(before) && unreasoned(/\.slow\s*\(/)) problems.push('adds test.slow')
if (/(playwright|vitest)\.config/.test(p) && maxNum(before, 'timeout') === null && unreasoned(/\btimeout\s*:\s*\d/i))
  problems.push('adds timeout')
for (const w of ['grepInvert', 'testIgnore']) {
  const g = new RegExp(`\\b${w}\\b`, 'g')
  if (count(after, g) > count(before, g) && unreasoned(new RegExp(`\\b${w}\\b`)))
    problems.push(`adds ${w}`)
}
if (d.tool_name === 'Write' && before.trim() && !after.trim()) problems.push('empties a test file')

if (problems.length) fail(`this edit to ${p} ${problems.join(', ')}.`)
