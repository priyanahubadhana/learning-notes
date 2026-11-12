/**
 * Writes src/aitools/catalog.gen.json from the tool definitions.
 * Run with `npm run aitools:catalog`. The source is TypeScript, so it is first
 * bundled in memory with esbuild (already installed with Vite) and run from
 * there. No network.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { format, resolveConfig } from 'prettier'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'aitools', 'catalog.gen.json')

const result = await build({
  entryPoints: [join(ROOT, 'src', 'aitools', 'catalog.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
})
const code = result.outputFiles[0].text
const mod = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
)
// Formatted like the rest of the repo so `npm run format:check` stays green.
const json = JSON.stringify(mod.toCatalog(), null, 2)
const options = (await resolveConfig(OUT)) ?? {}
writeFileSync(OUT, await format(json, { ...options, filepath: OUT }))
console.log(`Wrote ${OUT} (${mod.toCatalog().length} tools)`)
