import { TOAST_AFTER_HOLD_MS, toastDuration } from '../toastTiming'

export interface ShellToastAction {
  label: string
  /** Runs the stored undo function; the toast closes after it. */
  onSelect: () => void
}

export interface ShellToast {
  id: number
  message: string
  action?: ShellToastAction
}

interface Timers {
  set: (fn: () => void, ms: number) => unknown
  clear: (handle: unknown) => void
}

const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
}

/**
 * SH-12: one toast at a time. A second one replaces the first. Time follows
 * the app's rule (toastTiming.ts): 2.5 to 8 s by length, at least 6 s with a
 * button; hovering or tapping holds it, and it closes 1.5 s after release.
 */
export function createShellToasts(timers: Timers = realTimers) {
  let current: ShellToast | null = null
  let nextId = 1
  let timer: unknown = null
  const subs = new Set<() => void>()
  const emit = () => subs.forEach((f) => f())
  const stop = () => {
    if (timer !== null) timers.clear(timer)
    timer = null
  }
  const arm = (ms: number) => {
    stop()
    const id = current?.id
    timer = timers.set(() => {
      if (current?.id === id) dismiss()
    }, ms)
  }

  function dismiss() {
    stop()
    if (!current) return
    current = null
    emit()
  }

  return {
    show(message: string, action?: ShellToastAction): number {
      current = { id: nextId++, message, action }
      arm(toastDuration(message, !!action))
      emit()
      return current.id
    },
    /** Runs the Undo button of the shown toast, then closes it. */
    undo() {
      const a = current?.action
      if (!a) return
      dismiss()
      a.onSelect()
    },
    dismiss,
    /** The pointer is over the toast, or it was tapped. */
    hold: stop,
    release() {
      if (current) arm(TOAST_AFTER_HOLD_MS)
    },
    current: (): ShellToast | null => current,
    subscribe(cb: () => void): () => void {
      subs.add(cb)
      return () => subs.delete(cb)
    },
  }
}

export type ShellToasts = ReturnType<typeof createShellToasts>

/** The app-wide shell toast. */
export const shellToasts: ShellToasts = createShellToasts()
