// PostToolUse (Edit|Write|MultiEdit): note that a mirrored file in the main copy changed.
// The mirror itself runs once at Stop (debounced), in on-stop.mjs.
import { mkdirSync, writeFileSync } from 'node:fs'
import { input } from './lib.mjs'

const MAIN = 'c:/users/pc/downloads/learning-notes/'
const p = String(input().tool_input?.file_path || '')
  .replace(/\\/g, '/')
  .toLowerCase()
if (!p.startsWith(MAIN)) process.exit(0)
const rel = p.slice(MAIN.length)
if (
  /^(docs|rules|src)\//.test(rel) ||
  ['claude.md', 'readme.md', 'package.json'].includes(rel)
) {
  mkdirSync(MAIN + 'node_modules/.cache', { recursive: true })
  writeFileSync(MAIN + 'node_modules/.cache/mirror-pending', String(Date.now()))
}
