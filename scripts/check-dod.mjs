// Definition of Done checklist for one slice.
//   npm run check:dod -- <flag id> <spec name>
//   npm run check:dod -- toolbar.v8 toolbar
//   npm run check:dod -- - shared-parts   (a spec with no feature flag)
// "When" lines are "- When" bullets or table rows starting with a spec ID.
// Hard items (exit 1 if missing): the flag exists in src/app/flags.ts, no
// switch is on by default, docs/features/<spec>.md exists with "When" lines
// and a "Won't do" section, the first-load size is inside the budget.
// Soft items (warning only): fewer e2e tests than "When" lines, no build yet.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { behaviourLineCount, defaultsOn } from './dodSpec.mjs'

const root =
  process.env.DOD_ROOT ?? fileURLToPath(new URL('../', import.meta.url))
const [flagId, spec] = process.argv.slice(2)
if (!flagId || !spec) {
  console.error('Usage: npm run check:dod -- <flag id> <spec name>')
  process.exit(1)
}

const rows = []
const add = (state, text) => rows.push({ state, text })

// 1. The flag exists and is off by default.
const flagsSource = readFileSync(join(root, 'src/app/flags.ts'), 'utf8')
const list = /FLAG_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(flagsSource)
const ids = list ? [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
if (flagId === '-') {
  add('ok', 'no feature flag (shared parts): flag check skipped')
} else if (ids.includes(flagId)) {
  add('ok', `flag ${flagId} is in src/app/flags.ts`)
  // The list holds only ids: a switch is on only if someone turns it on.
  add(defaultsOn(flagsSource) ? 'missing' : 'ok', 'flags are OFF by default')
} else {
  add('missing', `flag ${flagId} is not in src/app/flags.ts`)
}

// 2. The spec exists, with "When" lines and a "Won't do" section.
const specFile = join(root, 'docs/features', `${spec}.md`)
let whenCount = 0
if (existsSync(specFile)) {
  add('ok', `docs/features/${spec}.md exists`)
  const text = readFileSync(specFile, 'utf8')
  whenCount = behaviourLineCount(text)
  add(
    whenCount > 0 ? 'ok' : 'missing',
    `spec has ${whenCount} "When" line${whenCount === 1 ? '' : 's'}`,
  )
  add(
    /^#{2,3}\s+(?:\d+\.\s+)?Won['’]t do\b/im.test(text) ? 'ok' : 'missing',
    'spec has a "Won\'t do" section',
  )
} else {
  add('missing', `docs/features/${spec}.md does not exist`)
}

// 3. e2e tests against the "When" lines (a warning only).
const e2eDir = join(root, 'e2e')
const files = readdirSync(e2eDir).filter((f) => f.endsWith('.spec.ts'))
let tests = 0
for (const f of files) {
  const text = readFileSync(join(e2eDir, f), 'utf8')
  if (
    f.toLowerCase().includes(spec.toLowerCase()) ||
    (flagId !== '-' && text.includes(flagId))
  ) {
    tests += (text.match(/^\s*test(?:\.\w+)?\(/gm) ?? []).length
  }
}
add(
  tests >= whenCount && whenCount > 0 ? 'ok' : 'warn',
  `${tests} e2e test${tests === 1 ? '' : 's'} (files named "${spec}" or naming ${flagId}) for ${whenCount} "When" line${whenCount === 1 ? '' : 's'}`,
)

// 4. Size budget, if a build exists.
if (existsSync(join(root, 'dist/index.html'))) {
  try {
    const out = execFileSync('node', [join(root, 'scripts/check-size.mjs')], {
      encoding: 'utf8',
    })
    add('ok', out.trim().split('\n').pop())
  } catch (e) {
    add('missing', `size budget: ${String(e.stdout ?? e.message).trim()}`)
  }
} else {
  add('warn', 'no dist/ yet: run npm run build to check the size budget')
}

const mark = { ok: '[x]', missing: '[ ] MISSING', warn: '[!] WARNING' }
console.log(`Definition of Done: ${flagId} / ${spec}`)
for (const r of rows) console.log(`${mark[r.state]} ${r.text}`)
if (rows.some((r) => r.state === 'missing')) process.exit(1)
