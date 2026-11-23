// Starts Vitest from the folder's canonical path.
//
// On Windows the same folder can be opened as "c:\..." or "C:\...". With the
// lowercase drive letter Vitest loaded its own modules twice and every test
// file failed with "Vitest failed to find the current suite" (22 Nov 2026,
// Node 26, Vitest 5). The spelling is fixed here, before Vitest starts, so
// `npm test` and the push guard pass from either spelling.
import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = realpathSync.native(process.cwd())
const here = realpathSync.native(fileURLToPath(import.meta.url))
const vitest = new URL('../node_modules/vitest/vitest.mjs', pathToFileURL(here))
const result = spawnSync(
  process.execPath,
  [fileURLToPath(vitest), ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
  },
)
process.exit(result.status ?? 1)
