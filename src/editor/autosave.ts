/**
 * Debounced, one-at-a-time autosave. Framework- and editor-independent.
 *
 * - `schedule()`: call on every change; saves `delayMs` after the last call.
 * - `flush()`: save now (page switch, tab hidden); resolves when done.
 * - `dispose()`: cancel a pending timer (does not cancel a running save).
 *
 * Saves never overlap: a change made during a save causes exactly one more
 * save afterwards. `save` should read the latest state itself, so every run
 * saves the newest content.
 */
export interface Autosaver {
  schedule: () => void
  flush: () => Promise<void>
  dispose: () => void
}

export function createAutosaver(
  save: () => Promise<void>,
  delayMs = 500,
  onError: (error: unknown) => void = (error) =>
    console.error('Autosave failed', error),
): Autosaver {
  let timer: ReturnType<typeof setTimeout> | undefined
  let dirty = false
  let running: Promise<void> | null = null

  const run = async () => {
    while (dirty) {
      dirty = false
      try {
        await save()
      } catch (error) {
        // Failed changes are retried by the next save (the snapshot was not
        // advanced), which happens on the next edit or flush.
        onError(error)
      }
    }
  }

  const flush = (): Promise<void> => {
    clearTimeout(timer)
    timer = undefined
    running ??= run().finally(() => {
      running = null
    })
    return running
  }

  return {
    schedule() {
      dirty = true
      clearTimeout(timer)
      timer = setTimeout(() => void flush(), delayMs)
    },
    flush,
    dispose() {
      clearTimeout(timer)
      timer = undefined
    },
  }
}
