// One source for the spec template: docs/features/_TEMPLATE.md (owner-approved).
// Spec Kit reads its project override .specify/templates/overrides/spec-template.md,
// which is a byte copy of it (also the part card template for reference).
//   node scripts/sync-spec-template.mjs          writes the copy
//   node scripts/sync-spec-template.mjs --check  exits 1 if the copy differs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const src = new URL('docs/features/_TEMPLATE.md', root)
const dst = new URL('.specify/templates/overrides/spec-template.md', root)
const want = readFileSync(src, 'utf8')
const have = existsSync(dst) ? readFileSync(dst, 'utf8') : null

if (process.argv.includes('--check')) {
  if (have !== want) {
    console.error(
      'spec-template override is out of date: run node scripts/sync-spec-template.mjs',
    )
    process.exit(1)
  }
  console.log('spec-template override matches docs/features/_TEMPLATE.md')
} else {
  writeFileSync(dst, want)
  console.log('wrote .specify/templates/overrides/spec-template.md')
}
