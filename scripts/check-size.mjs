// First-download size gate (brief B1): the entry script plus its modulepreload
// links, gzipped, must stay at or under 320,000 bytes. Run after `npm run build`.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const LIMIT = 320_000
const dist = new URL('../dist/', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
)
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const files = [
  ...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g),
  ...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g),
].map((m) => m[1])
let total = 0
const rows = files.map((f) => {
  const size = gzipSync(readFileSync(join(dist, f))).length
  total += size
  return [size, f]
})
rows.sort((a, b) => b[0] - a[0])
for (const [s, f] of rows.slice(0, 8)) console.log(String(s).padStart(8), f)
console.log(`first load: ${total} bytes gzipped (limit ${LIMIT})`)
if (total > LIMIT) {
  console.error('First load is over the limit.')
  process.exit(1)
}
