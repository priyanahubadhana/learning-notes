// Makes the local connector's copy of the record builder:
//   mcp/src/gen/notesWrite.ts  <-  supabase/functions/_shared/notesWrite.ts
// One builder for both connectors, so notes made by Claude look the same
// whichever way it connects. Only the known imports are rewritten; any other
// import makes this script stop (so a change in the original is noticed).
// `src/connector/mcpWriteParity.test.ts` fails if the copy is out of date:
// run `node scripts/sync-mcp-write.mjs`.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BANNER = `// GENERATED from supabase/functions/_shared/notesWrite.ts by scripts/sync-mcp-write.mjs. Do not edit here.\n`

const SWAPS = [
  [
    "import { stableId } from './e2e.ts'",
    "import { stableId } from '../../../src/core/ids'",
  ],
  [
    "import { ToolFail } from './escrow.ts'",
    "import { ToolError as ToolFail } from '../tools'",
  ],
  ["from './spec.ts'", "from '../../../src/connector/spec'"],
  // Pure helpers with no imports of their own (shared by both connectors).
  [
    "import { orderBetween } from './fracindex.ts'",
    "import { orderBetween } from '../../../supabase/functions/_shared/fracindex'",
  ],
  [
    "import { outlineToMap } from './mindmap.ts'",
    "import { outlineToMap } from '../../../supabase/functions/_shared/mindmap'",
  ],
  ["from './notesModel.ts'", "from '../model'"],
]

export function mcpWrite(source) {
  let out = source
  for (const [from, to] of SWAPS) {
    if (!out.includes(from))
      throw new Error(`notesWrite.ts no longer has: ${from}`)
    out = out.replace(from, to)
  }
  const left = [...out.matchAll(/^import .* from '([^']+)'/gm)]
    .map((m) => m[1])
    .filter((p) => !p.startsWith('../'))
  if (left.length) throw new Error(`Unexpected import(s): ${left.join(', ')}`)
  return BANNER + out
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('..', import.meta.url)
  const src = readFileSync(
    new URL('supabase/functions/_shared/notesWrite.ts', root),
    'utf8',
  )
  writeFileSync(new URL('mcp/src/gen/notesWrite.ts', root), mcpWrite(src))
}
