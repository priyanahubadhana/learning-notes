import { createToastQueue, type ToastQueue } from '../../app/overlay'

export type ToastKind = 'done' | 'undo' | 'problem'

/** Seconds on screen: done 2.5 s, undo 6 s, a problem stays until ✕ (0). */
export const TOAST_MS: Record<ToastKind, number> = {
  done: 2500,
  undo: 6000,
  problem: 0,
}
export const MAX_TOASTS = 3

/** Where the toast timers take their time from. The product uses the real one. */
export interface ToastClock {
  now(): number
  setTimer(fn: () => void, ms: number): unknown
  clearTimer(handle: unknown): void
}
export const realClock: ToastClock = {
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
}

interface Meta {
  kind: ToastKind
  onUndo?: () => void
  left: number
  /** ms left, or 0 when it never times out */
  started: number
  timer?: unknown
  paused: boolean
}

export interface Toasts {
  queue: ToastQueue
  /** Shows a toast. A 4th pushes out the oldest "done" one; an Undo or a problem is never pushed out. */
  push(kind: ToastKind, message: string, onUndo?: () => void): number
  dismiss(id: number): void
  kindOf(id: number): ToastKind
  undo(id: number): void
  /** Hover / touch holds the timer; releasing starts it again. */
  hold(id: number, on: boolean): void
}

/** The toast logic for the stack: kinds, timers that can pause, and who may be pushed out. */
export function createToasts(clock: ToastClock = realClock): Toasts {
  const queue = createToastQueue({ max: MAX_TOASTS, timeoutMs: 0 })
  const meta = new Map<number, Meta>()

  const arm = (id: number) => {
    const m = meta.get(id)
    if (!m || m.left <= 0 || m.paused) return
    m.started = clock.now()
    m.timer = clock.setTimer(() => dismiss(id), m.left)
  }
  const disarm = (m: Meta) => {
    if (m.timer !== undefined) clock.clearTimer(m.timer)
    m.timer = undefined
  }
  function dismiss(id: number) {
    const m = meta.get(id)
    if (m) disarm(m)
    meta.delete(id)
    queue.dismiss(id)
  }
  // Timers start when a toast becomes visible (a waiting one has not started).
  const sync = () => {
    for (const t of queue.visible()) {
      const m = meta.get(t.id)
      if (m && m.timer === undefined && !m.paused && m.left > 0 && !m.started)
        arm(t.id)
    }
  }
  queue.subscribe(sync)

  return {
    queue,
    push(kind, message, onUndo) {
      if (queue.visible().length >= MAX_TOASTS) {
        const old = queue.visible().find((t) => meta.get(t.id)?.kind === 'done')
        if (old) dismiss(old.id)
      }
      const id = queue.push({ message, timeoutMs: 0 })
      meta.set(id, {
        kind,
        onUndo,
        left: TOAST_MS[kind],
        started: 0,
        paused: false,
      })
      sync()
      return id
    },
    dismiss,
    kindOf: (id) => meta.get(id)?.kind ?? 'done',
    undo(id) {
      const m = meta.get(id)
      dismiss(id)
      m?.onUndo?.()
    },
    hold(id, on) {
      const m = meta.get(id)
      if (!m || m.left <= 0 || m.paused === on) return
      m.paused = on
      if (on) {
        if (m.timer !== undefined) m.left -= clock.now() - m.started
        disarm(m)
      } else {
        // after letting go, give it at least 1.5 s
        m.left = Math.max(m.left, 1500)
        arm(id)
      }
    },
  }
}
