import type { JsonValue } from '../../core/types'

/** One setting's value before and after a change. */
export interface HistoryItem {
  id: string
  before: JsonValue
  after: JsonValue
}

/** One step of Undo / Redo: a single change or a whole section reset. */
export interface HistoryEntry {
  label: string
  items: HistoryItem[]
}

/**
 * Settings keeps its own history while it is open (spec decision 2). It only
 * keeps the stacks; the caller writes the values. Undo gives back the entry
 * to write `before` values from; Redo to write `after` values from.
 */
export function createHistory(limit = 100) {
  let past: HistoryEntry[] = []
  let future: HistoryEntry[] = []
  return {
    /** Records a new step. A new step ends any Redo. */
    push(entry: HistoryEntry): void {
      if (entry.items.length === 0) return
      past = [...past, entry].slice(-limit)
      future = []
    },
    undo(): HistoryEntry | undefined {
      const entry = past[past.length - 1]
      if (!entry) return undefined
      past = past.slice(0, -1)
      future = [...future, entry]
      return entry
    },
    redo(): HistoryEntry | undefined {
      const entry = future[future.length - 1]
      if (!entry) return undefined
      future = future.slice(0, -1)
      past = [...past, entry]
      return entry
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear(): void {
      past = []
      future = []
    },
  }
}

export type SettingsHistory = ReturnType<typeof createHistory>
