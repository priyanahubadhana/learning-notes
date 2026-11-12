// Ratchet: counts raw `addEventListener(` calls and z-index uses in src/ and
// fails when a total grows above scripts/ratchet-baseline.json. Code that
// belongs to the shared input layer (src/app/input/) or overlay layer
// (src/app/overlay/) is not counted. Tests and src/vendor are skipped.
//
//   npm run check:ratchet              check against the baseline
//   npm run check:ratchet -- --update  write the current counts as baseline
//
// The runtime counterpart (listeners alive in the browser) is
// src/app/listenerCount.ts; this script counts them in the source.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const baselineFile = join(root, 'scripts', 'ratchet-baseline.json')

const SKIP_DIRS = ['src/vendor', 'src/app/input', 'src/app/overlay']
const SOURCE = /\.(ts|tsx|css)$/
const TEST = /\.(test|spec)\.(ts|tsx)$/

const PATTERNS = {
  listeners: /\baddEventListener\s*\(/g,
  zIndex: /z-index|zIndex|(?<![\w-])-?z-(?:\[|\d|auto)/g,
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    const rel = relative(root, full).split(sep).join('/')
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.includes(rel)) walk(full, out)
    } else if (SOURCE.test(entry.name) && !TEST.test(entry.name)) {
      out.push([rel, full])
    }
  }
  return out
}

/** Per-file counts and totals for the current source. */
export function countAll() {
  const files = { listeners: {}, zIndex: {} }
  const totals = { listeners: 0, zIndex: 0 }
  for (const [rel, full] of walk(join(root, 'src')).sort()) {
    const text = readFileSync(full, 'utf8')
    for (const kind of Object.keys(PATTERNS)) {
      const n = (text.match(PATTERNS[kind]) ?? []).length
      if (n > 0) {
        files[kind][rel] = n
        totals[kind] += n
      }
    }
  }
  return { totals, files }
}

function main() {
  const now = countAll()
  if (process.argv.includes('--update')) {
    writeFileSync(baselineFile, JSON.stringify(now, null, 2) + '\n')
    console.log(
      `Baseline written: ${now.totals.listeners} listeners, ${now.totals.zIndex} z-index.`,
    )
    return
  }
  if (!existsSync(baselineFile)) {
    console.error('No baseline. Run: npm run check:ratchet -- --update')
    process.exit(1)
  }
  const base = JSON.parse(readFileSync(baselineFile, 'utf8'))
  const names = { listeners: 'addEventListener', zIndex: 'z-index' }
  let failed = false
  let lower = false
  for (const kind of Object.keys(names)) {
    const was = base.totals[kind]
    const is = now.totals[kind]
    console.log(`${names[kind]}: ${is} (baseline ${was})`)
    if (is > was) {
      failed = true
      for (const [file, n] of Object.entries(now.files[kind])) {
        const before = base.files[kind][file] ?? 0
        if (n > before) console.error(`  grew: ${file} ${before} -> ${n}`)
      }
    } else if (is < was) lower = true
  }
  if (failed) {
    console.error(
      'More raw listeners or z-index than the baseline. Use src/app/input/ or src/app/overlay/ instead.',
    )
    process.exit(1)
  }
  if (lower) {
    console.log(
      'Counts went down. Lower the baseline: npm run check:ratchet -- --update',
    )
  }
}

main()
