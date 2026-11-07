import { driveFiles } from './google'
import { emptyMemoryState, memoryConnectors, type MemoryState } from './memory'
import { supabaseAuth, supabaseRecords } from './supabase'
import type { Connectors } from './types'

export * from './types'
export { memoryConnectors } from './memory'

/**
 * The app's connectors: Supabase (records, sign-in) and Drive (files). The
 * browser tests set `learning-notes:sync.mock` to use the in-memory ones,
 * kept in localStorage (`learning-notes:sync.mockState`), so no test ever
 * reaches a real account.
 */
const MOCK = 'learning-notes:sync.mock'
const MOCK_STATE = 'learning-notes:sync.mockState'

let cached: Connectors | null = null

export function getConnectors(): Connectors {
  if (cached) return cached
  let mock: boolean
  try {
    mock = localStorage.getItem(MOCK) === '1'
  } catch {
    mock = false
  }
  if (mock) {
    let state: MemoryState = emptyMemoryState()
    try {
      const raw = localStorage.getItem(MOCK_STATE)
      if (raw) state = JSON.parse(raw) as MemoryState
    } catch {
      // Start empty.
    }
    cached = memoryConnectors(state, (s) => {
      try {
        localStorage.setItem(MOCK_STATE, JSON.stringify(s))
      } catch {
        // Too big for the test store: keep it in memory.
      }
    })
    return cached
  }
  const auth = supabaseAuth()
  cached = { auth, records: supabaseRecords(auth), files: driveFiles(auth) }
  return cached
}

/** For unit tests: use these connectors instead. */
export function setConnectors(c: Connectors | null): void {
  cached = c
}
