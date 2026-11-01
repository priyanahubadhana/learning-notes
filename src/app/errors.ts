/** Called when saving failed because the device has no space left. */
let storageFullListener: (() => void) | undefined

export function onStorageFull(listener: () => void): () => void {
  storageFullListener = listener
  return () => {
    if (storageFullListener === listener) storageFullListener = undefined
  }
}

/** True for a browser or Dexie "no space left" failure. */
export function isStorageFull(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current = error
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const { name, inner } = current as { name?: string; inner?: unknown }
    if (name === 'QuotaExceededError') return true
    current = inner
  }
  return false
}

/** Logs a failure and tells the user when the cause is a full device. */
export function reportError(error: unknown, label?: string): void {
  console.error(...(label ? [label, error] : [error]))
  if (isStorageFull(error)) storageFullListener?.()
}

/** Runs a background task from a UI event and logs any failure. */
export function runTask(task: Promise<unknown>): void {
  task.catch((error: unknown) => reportError(error))
}
