import { isStringArray } from '../app/uiPrefs'
import { prefStore } from '../app/tools/store'

/** Tools used from the search (R7-13). */
const MAX_RECENT = 6
const isRecent = (v: unknown): v is string[] =>
  isStringArray(v) && v.length <= MAX_RECENT && new Set(v).size === v.length

/** Row keys ("tool:writePad") of the tools last run from the search. */
export const recentTools = prefStore<string[]>(
  'search.recentTools',
  isRecent,
  [],
)

export function noteRecentTool(key: string): void {
  recentTools.set(
    [key, ...recentTools.get().filter((k) => k !== key)].slice(0, MAX_RECENT),
  )
}

/** Tools worth knowing about, in this order. */
export const RECOMMENDED = [
  'tool:writePad',
  'tool:find',
  'tool:card',
  'tool:mindMap',
  'tool:audio',
  'tool:summary',
]
