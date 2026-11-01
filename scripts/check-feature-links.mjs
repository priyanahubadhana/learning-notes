/**
 * Fails when code adds a new direct link between two feature folders.
 * Links that existed on 2026-11-01 are listed in feature-links.json.
 * Run with `npm run check:links`; `-- --update` rewrites that list.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const LIST = join(ROOT, 'scripts', 'feature-links.json')
/** Shared folders: any feature may use these. */
const SHARED = new Set(['core', 'app', 'i18n', 'help', 'settings'])

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') return []
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

const folderOf = (path) => {
  const parts = relative(SRC, path).split(sep)
  return parts.length > 1 ? parts[0] : null
}

const found = new Set()
for (const file of sourceFiles(SRC)) {
  const from = folderOf(file)
  if (!from || SHARED.has(from) || /\.test\.tsx?$/.test(file)) continue
  const text = readFileSync(file, 'utf8')
  for (const [, target] of text.matchAll(/from '(\.[^']+)'/g)) {
    const to = folderOf(resolve(dirname(file), target))
    if (to && to !== from && !SHARED.has(to)) found.add(`${from} -> ${to}`)
  }
}
const links = [...found].sort()

if (process.argv.includes('--update') || !existsSync(LIST)) {
  writeFileSync(LIST, `${JSON.stringify(links, null, 2)}\n`)
  console.log(`Saved ${links.length} feature links.`)
} else {
  const known = new Set(JSON.parse(readFileSync(LIST, 'utf8')))
  const added = links.filter((link) => !known.has(link))
  if (added.length > 0) {
    console.error('New direct links between features (see docs/CODE-MAP.md):')
    for (const link of added) console.error(`  ${link}`)
    process.exit(1)
  }
  console.log(`OK: no new feature links (${links.length} known).`)
}
