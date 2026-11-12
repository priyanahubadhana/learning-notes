// PreToolUse (Edit|Write|MultiEdit): block edits that weaken tests.
// Blocks: new .skip/.only/.fixme, raised timeout/retries, fewer expect() calls, emptied test files.
import { existsSync, readFileSync } from 'node:fs'
import { input } from './lib.mjs'

const d = input()
const t = d.tool_input || {}
const p = String(t.file_path || '').replace(/\\/g, '/')
const isTest =
  /\/e2e\//.test(p) ||
  /\.(spec|test)\.[cm]?[jt]sx?$/.test(p) ||
  /(playwright|vitest)\.config\.[cm]?[jt]s$/.test(p)
if (!isTest) process.exit(0)

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
  const re = new RegExp(`\\b${key}\\s*[:=(]\\s*([0-9_]+)`, 'gi')
  const n = [...s.matchAll(re)].map((m) => Number(m[1].replace(/_/g, '')))
  return n.length ? Math.max(...n) : null
}

const problems = []
const skipRe = /\.(skip|only|fixme)\s*\(|\b(xit|xdescribe|fit|fdescribe)\s*\(/g
if (count(after, skipRe) > count(before, skipRe))
  problems.push('adds .skip/.only/.fixme')
const expRe = /\bexpect\s*[.(]/g
if (count(after, expRe) < count(before, expRe))
  problems.push('removes assertions (expect)')
for (const k of ['timeout', 'retries']) {
  const a = maxNum(after, k)
  const b = maxNum(before, k)
  if (a !== null && b !== null && a > b)
    problems.push(`raises ${k} (${b} -> ${a})`)
}
if (d.tool_name === 'Write' && before.trim() && !after.trim())
  problems.push('empties a test file')

if (problems.length) {
  console.error(
    `Blocked by the test guard: this edit to ${p} ${problems.join(', ')}. ` +
      'Tests must never be weakened (rules/quality.md). Fix the code instead, or stop and report.',
  )
  process.exit(2)
}
