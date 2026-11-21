import { test } from 'vitest'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { render } from './docs-site.mjs'

const md = fs.readFileSync(
  new URL('../docs/METHOD-v2.md', import.meta.url),
  'utf8',
)
const r = render(md, 'METHOD-v2.md')

test('confirm sheet rows are tappable buttons', () => {
  const rows = r.html.match(/class="crow"/g) || []
  assert.equal(rows.length, 11)
  assert.match(r.html, /<button type="button" data-v="yes"/)
  assert.match(r.html, /data-v="explain"/)
  assert.match(r.html, /data-v="change"/)
  assert.match(r.html, /id="copybar"/)
})

test('status table becomes badges above the title', () => {
  assert.match(r.html, /class="badges"/)
  assert.ok(r.html.indexOf('class="badges"') < r.html.indexOf('<h1'))
  assert.match(r.html, /badge status/)
  const rows = md
    .split(String.fromCharCode(10))
    .filter((l) => l.startsWith('|'))
  const head = rows[0]
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim())
  const cell = rows[2].split('|').slice(1, -1)[head.indexOf('Status')].trim()
  assert.ok(cell.length > 0)
  assert.equal(r.status, cell)
})

test('links to .md became .html', () => {
  assert.doesNotMatch(r.html, /href="[^"]*\.md[#"]/)
  const l = render(
    '# T\n\nSee [d](DECISIONS.md#x) and [p](plans/phases/phase-pc-1.md).\n',
    'METHOD-v2.md',
  )
  assert.match(l.html, /href="DECISIONS\.html#x"/)
  assert.match(l.html, /href="plans\/phases\/phase-pc-1\.html"/)
})

test('the bottom layer is inside a closed details', () => {
  const m = /<details class="bottom"[^>]*>/.exec(r.html)
  assert.ok(m)
  assert.doesNotMatch(m[0], /open/)
  assert.ok(
    r.html.indexOf('<h3 id="roles"') >
      r.html.indexOf('<details class="bottom"'),
  )
})

test('no raw table pipes remain in body text', () => {
  const text = r.html
    .replace(/<pre[\s\S]*?<\/pre>/g, '')
    .replace(/<code>[\s\S]*?<\/code>/g, '')
    .replace(/<[^>]+>/g, ' ')
  assert.doesNotMatch(text, /\|/)
})

test('questions get A / B / Other buttons', () => {
  const q = render(
    '# T\n\n## 12. The main questionnaire\n\n**Q1. One.** A: x. B: y.\n',
    'x.md',
  )
  assert.match(q.html, /data-id="q1"/)
  assert.match(q.html, /data-v="other"/)
})
