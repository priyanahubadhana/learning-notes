/** Called when saving failed because the device has no space left. */
let storageFullListener: (() => void) | undefined

export function onStorageFull(listener: () => void): () => void {
  storageFullListener = listener
  return () => {
    if (storageFullListener === listener) storageFullListener = undefined
  }
}

/** Storage safety (flag ON): true = it took the error, so the old message stays quiet. */
let storageErrorListener: ((error: unknown) => boolean) | undefined

export function onStorageError(
  listener: (error: unknown) => boolean,
): () => void {
  storageErrorListener = listener
  return () => {
    if (storageErrorListener === listener) storageErrorListener = undefined
  }
}

/** Called when an edit was refused because this device is not signed in (Q3a). */
let signInRequiredListener: (() => void) | undefined

export function onSignInRequired(listener: () => void): () => void {
  signInRequiredListener = listener
  return () => {
    if (signInRequiredListener === listener) signInRequiredListener = undefined
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
  const taken = storageErrorListener?.(error) ?? false
  if (!taken && isStorageFull(error)) storageFullListener?.()
  if ((error as { name?: string } | null)?.name === 'SignInRequiredError')
    signInRequiredListener?.()
}

/** Runs a background task from a UI event and logs any failure. */
export function runTask(task: Promise<unknown>): void {
  task.catch((error: unknown) => reportError(error))
}
