// Reports how well the feature inventory is covered by probes. Report only:
// it always exits 0. Run: npm run probe:inventory
//
//   docs/inventory/features.json  entries {id, name, file, line}
//   e2e/probes/                   specs whose test titles hold [probe:<id>]
//
// It lists which entries have a probe, which have none, which probes name an
// id that is not in the inventory, and which file:line no longer exists.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const inventoryFile = join(root, 'docs/inventory/features.json')
const probesDir = join(root, 'e2e/probes')

if (!existsSync(inventoryFile)) {
  console.log('No inventory yet (docs/inventory/features.json).')
  process.exit(0)
}
const { features } = JSON.parse(readFileSync(inventoryFile, 'utf8'))

const probed = new Set()
if (existsSync(probesDir)) {
  for (const f of readdirSync(probesDir).filter((n) => /\.ts$/.test(n))) {
    const text = readFileSync(join(probesDir, f), 'utf8')
    for (const m of text.matchAll(/\[probe:([^\]\s]+)\]/g)) probed.add(m[1])
  }
}

const ids = new Set(features.map((e) => e.id))
const withProbe = features.filter((e) => probed.has(e.id))
const without = features.filter((e) => !probed.has(e.id))
const unknown = [...probed].filter((id) => !ids.has(id))

/** Does file:line still exist? */
function missingPlace(e) {
  const full = join(root, e.file)
  if (!existsSync(full)) return 'file is gone'
  const lines = readFileSync(full, 'utf8').split(/\r?\n/).length
  return e.line > lines ? `file has only ${lines} lines` : null
}
const moved = features
  .map((e) => [e, missingPlace(e)])
  .filter(([, why]) => why !== null)

console.log(`Inventory: ${features.length} features`)
console.log(`With a probe: ${withProbe.length}`)
for (const e of withProbe) console.log(`  ok   ${e.id}  ${e.file}:${e.line}`)
console.log(`Without a probe: ${without.length}`)
for (const e of without) console.log(`  none ${e.id}  ${e.file}:${e.line}`)
console.log(`File or line no longer there: ${moved.length}`)
for (const [e, why] of moved) {
  console.log(`  gone ${e.id}  ${e.file}:${e.line} (${why})`)
}
if (unknown.length > 0) {
  console.log(`Probes naming an unknown id: ${unknown.join(', ')}`)
}
