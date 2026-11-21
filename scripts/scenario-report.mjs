// B0 (SC-05): writes the scenario report page.
//   node scripts/scenario-report.mjs <out-dir> <build text> [results.json ...]
// Without result files every scenario shows "not run". The report only has the
// scenario words, pass / fail marks and the owner's tick rows.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ipadTicks } from './spec-check-lib.mjs'
import {
  parseFeature,
  readResults,
  renderReport,
} from './scenario-report-lib.mjs'

const [
  out = 'dist/scenarios',
  build = 'Built from the code line',
  ...resultFiles
] = process.argv.slice(2)
const featureDir = resolve('e2e/features')
const features = readdirSync(featureDir)
  .filter((f) => f.endsWith('.feature'))
  .map((f) => parseFeature(readFileSync(join(featureDir, f), 'utf8')))
const results = {}
for (const f of resultFiles)
  Object.assign(results, readResults(JSON.parse(readFileSync(f, 'utf8'))))
const { rows } = ipadTicks(readFileSync('docs/metrics/ipad-checks.md', 'utf8'))
mkdirSync(out, { recursive: true })
writeFileSync(
  join(out, 'index.html'),
  renderReport({ features, results, tickRows: rows, build }),
)
console.log(`scenario report written to ${join(out, 'index.html')}`)
