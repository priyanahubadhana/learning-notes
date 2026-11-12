/**
 * Selection store: the one truth for "what is selected". Pure TypeScript, no
 * DOM. Only one kind of selection exists at a time; selecting replaces the
 * whole value. Not yet used by the app (slice 0e, flag foundation.selection).
 */

export type CellRef = { readonly row: number; readonly col: number }

export type Selection =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'text'
      readonly owner: string
      readonly from: number
      readonly to: number
      readonly blockIds?: readonly string[]
    }
  | {
      readonly kind: 'box'
      readonly owner: string
      readonly boxIds: readonly string[]
    }
  | {
      readonly kind: 'ink'
      readonly owner: string
      readonly strokeIds: readonly string[]
    }
  | { readonly kind: 'picture'; readonly owner: string; readonly id: string }
  | {
      readonly kind: 'cells'
      readonly owner: string
      readonly tableId: string
      readonly cells: readonly CellRef[]
    }
  | {
      readonly kind: 'rows'
      readonly owner: string
      readonly rowIds: readonly string[]
    }

export type SelectionKind = Selection['kind']

export const NONE: Selection = { kind: 'none' }

/** Narrows a selection to one kind. */
export function isKind<K extends SelectionKind>(
  sel: Selection,
  kind: K,
): sel is Extract<Selection, { kind: K }> {
  return sel.kind === kind
}

/** Deep equality for plain data (strings, numbers, arrays, flat objects). */
function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every(
    (k) =>
      Object.hasOwn(b, k) &&
      same(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
  )
}

export type SelectionStore = {
  getSnapshot: () => Selection
  /** For React useSyncExternalStore. */
  subscribe: (listener: () => void) => () => void
  select: (sel: Selection) => void
  /** With an owner: clears only if that owner made the selection. */
  clear: (owner?: string) => void
  /** Called once per change with (next, previous). */
  onChange: (fn: (next: Selection, prev: Selection) => void) => () => void
}

function addTo<T>(set: Set<T>, fn: T): () => void {
  set.add(fn)
  return () => void set.delete(fn)
}

export function createSelectionStore(): SelectionStore {
  let current: Selection = NONE
  const listeners = new Set<() => void>()
  const watchers = new Set<(next: Selection, prev: Selection) => void>()

  function set(next: Selection): void {
    if (same(next, current)) return
    const prev = current
    current = next
    for (const fn of [...listeners]) fn()
    for (const fn of [...watchers]) fn(next, prev)
  }

  return {
    getSnapshot: () => current,
    subscribe: (fn) => addTo(listeners, fn),
    select: (sel) => set(sel),
    clear: (owner) => {
      if (
        owner !== undefined &&
        (current.kind === 'none' || current.owner !== owner)
      )
        return
      set(NONE)
    },
    onChange: (fn) => addTo(watchers, fn),
  }
}

/** The app-wide store. */
export const selection = createSelectionStore()
