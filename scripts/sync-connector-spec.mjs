// Makes the Deno copy of the notebook spec validator:
//   supabase/functions/_shared/spec.ts  <-  src/connector/spec.ts
// Deno cannot resolve the app's type-only import, so the copy swaps the four
// app types for the same literal unions. `src/connector/parity.test.ts` fails
// if the copy is out of date: run `node scripts/sync-connector-spec.mjs`.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BANNER = `// GENERATED from src/connector/spec.ts by scripts/sync-connector-spec.mjs. Do not edit here.\n`

export function denoSpec(source) {
  return (
    BANNER +
    source
      .replace("import type { Notebook, Page } from '../core/types'\n", '')
      .replaceAll("Notebook['view']", "'shelf' | 'tabs'")
      .replaceAll("Notebook['pathStyle']", "'simple' | 'full' | 'page'")
      .replaceAll("Page['sheet']", "'A4' | 'Letter'")
      .replaceAll("Page['inkBg']", "'lined' | 'grid' | 'dots'")
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('..', import.meta.url)
  const src = readFileSync(new URL('src/connector/spec.ts', root), 'utf8')
  writeFileSync(
    new URL('supabase/functions/_shared/spec.ts', root),
    denoSpec(src),
  )
}
