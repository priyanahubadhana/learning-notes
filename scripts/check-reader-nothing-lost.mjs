// Nothing-lost check for Reader v2 (docs/features/reader-v2.md, "Tests").
//   node scripts/check-reader-nothing-lost.mjs
// Reads every inventory id R01..R92 from docs/plans/reader-inventory-2026-11-11.md.
// Each must have an entry in scripts/reader-nothing-lost.json listing the
// test id, i18n key or text that must still exist in the named file (the place
// on the flag-off reader, or its listed new place with reader.v2 on). Exits 1
// when an id has no entry, or a file or text is missing.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root =
  process.env.NL_ROOT ?? fileURLToPath(new URL('../', import.meta.url))
const inventory = readFileSync(
  join(root, 'docs/plans/reader-inventory-2026-11-11.md'),
  'utf8',
)
const ids = [...inventory.matchAll(/^\|\s*(R\d{2})\s*\|/gm)].map((m) => m[1])
const { items } = JSON.parse(
  readFileSync(join(root, 'scripts/reader-nothing-lost.json'), 'utf8'),
)

const problems = []
const expected = Array.from(
  { length: 92 },
  (_, i) => `R${String(i + 1).padStart(2, '0')}`,
)
for (const id of expected)
  if (!ids.includes(id)) problems.push(`${id}: not in the inventory`)

const texts = new Map()
const read = (file) => {
  if (!texts.has(file))
    texts.set(
      file,
      existsSync(join(root, file))
        ? readFileSync(join(root, file), 'utf8')
        : null,
    )
  return texts.get(file)
}
for (const id of ids) {
  const list = items[id]
  if (!list?.length) {
    problems.push(`${id}: no entry in scripts/reader-nothing-lost.json`)
    continue
  }
  for (const { file, needle } of list) {
    const text = read(file)
    if (text === null) problems.push(`${id}: file is gone: ${file}`)
    else if (!text.includes(needle))
      problems.push(`${id}: "${needle}" is gone from ${file}`)
  }
}
for (const id of Object.keys(items))
  if (!ids.includes(id)) problems.push(`${id}: entry without an inventory row`)

if (problems.length) {
  console.error(`Nothing-lost check FAILED (${problems.length}):`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(
  `Nothing-lost check passed: ${ids.length} of 92 inventory ids found.`,
)
