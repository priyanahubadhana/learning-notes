import { reportError } from '../app/errors'
import { markSaved, markUnsaved } from '../app/saveStatus'

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
 *
 * A failed save stays pending: it is tried again after a growing wait, and
 * on the next `flush()`, and the "Not saved yet" notice shows until it works.
 */
export interface Autosaver {
  schedule: () => void
  flush: () => Promise<void>
  dispose: () => void
  /** True while the last save failed. */
  failed: () => boolean
  /** Stops showing this saver as unsaved (someone else took over). */
  handOver: () => void
}

/** Wait before try `n` again: 2 s, 4 s, 8 s … at most a minute. */
export const retryDelay = (n: number): number =>
  Math.min(2000 * 2 ** (n - 1), 60_000)

export function createAutosaver(
  save: () => Promise<void>,
  delayMs = 500,
  onError: (error: unknown) => void = (error) =>
    reportError(error, 'Autosave failed'),
): Autosaver {
  let timer: ReturnType<typeof setTimeout> | undefined
  let dirty = false
  let running: Promise<void> | null = null
  let failures = 0
  let disposed = false
  const token = {}

  const run = async () => {
    while (dirty) {
      dirty = false
      try {
        await save()
        failures = 0
        markSaved(token)
      } catch (error) {
        dirty = true
        failures += 1
        onError(error)
        markUnsaved(token, () => void flush())
        if (!disposed) {
          clearTimeout(timer)
          timer = setTimeout(() => void flush(), retryDelay(failures))
        }
        return
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
      disposed = true
      clearTimeout(timer)
      timer = undefined
    },
    failed: () => failures > 0,
    handOver: () => markSaved(token),
  }
}
