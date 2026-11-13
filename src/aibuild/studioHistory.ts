/**
 * Undo and Redo for the Studio plan (owner comment A3): every tick, place
 * change and name edit can be taken back. Pure; the screen only shows it.
 */

const LIMIT = 50

export interface Entry<T> {
  value: T
  /** What changed, in the app's words key or plain label. */
  label: string
  /** Edits with the same key join into one step (typing a name). */
  key?: string
}

export interface History<T> {
  past: Entry<T>[]
  present: T
  /** The label of the change that made `present` (empty at the start). */
  label: string
  key?: string
  future: Entry<T>[]
}

export const newHistory = <T>(present: T): History<T> => ({
  past: [],
  present,
  label: '',
  future: [],
})

export const canUndo = <T>(h: History<T>) => h.past.length > 0
export const canRedo = <T>(h: History<T>) => h.future.length > 0

export function commit<T>(
  h: History<T>,
  next: T,
  label: string,
  key?: string,
): History<T> {
  const join = key !== undefined && h.key === key && h.past.length > 0
  const past = join
    ? h.past
    : [...h.past, { value: h.present, label: h.label, key: h.key }].slice(
        -LIMIT,
      )
  return { past, present: next, label, key, future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  const prev = h.past[h.past.length - 1]
  if (!prev) return h
  return {
    past: h.past.slice(0, -1),
    present: prev.value,
    label: prev.label,
    key: prev.key,
    future: [{ value: h.present, label: h.label, key: h.key }, ...h.future],
  }
}

export function redo<T>(h: History<T>): History<T> {
  const next = h.future[0]
  if (!next) return h
  return {
    past: [...h.past, { value: h.present, label: h.label, key: h.key }],
    present: next.value,
    label: next.label,
    key: next.key,
    future: h.future.slice(1),
  }
}
