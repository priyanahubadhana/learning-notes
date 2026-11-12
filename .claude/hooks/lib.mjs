// Shared helper for project hooks: read the hook JSON from stdin.
import { readFileSync } from 'node:fs'
export function input() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}')
  } catch {
    return {}
  }
}
