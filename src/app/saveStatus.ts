/**
 * What could not be saved yet, for the lasting "Not saved yet" notice.
 * Each saver marks itself with its own token while its changes are unsaved
 * and gives a way to try again now.
 */
const unsaved = new Map<object, () => void>()
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((listener) => listener())

/** Something failed to save. `retry` (if any) tries again at once. */
export function markUnsaved(token: object, retry: () => void = () => {}): void {
  const isNew = !unsaved.has(token)
  unsaved.set(token, retry)
  if (isNew) changed()
}

/** It is saved now. */
export function markSaved(token: object): void {
  if (unsaved.delete(token)) changed()
}

export const hasUnsaved = (): boolean => unsaved.size > 0

/** Tries everything unsaved again. */
export function retryUnsaved(): void {
  for (const retry of [...unsaved.values()]) retry()
}

/** Calls `listener` when the answer of `hasUnsaved` may have changed. */
export function onUnsavedChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
