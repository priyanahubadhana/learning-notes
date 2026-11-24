import type { ToastClock } from '../parts/toastLogic'

/** What the gallery tests can use: `window.__partsClock`. */
export interface PartsClockHook {
  /** Stops time for the toasts: nothing expires until resume() or advance(). */
  pause(): void
  resume(): void
  /** Moves the toast time forward and runs what is due. */
  advance(ms: number): void
}

declare global {
  interface Window {
    __partsClock?: PartsClockHook
  }
}

interface Timer {
  id: number
  at: number
  fn: () => void
}

/**
 * The toast clock of the Parts gallery. It follows real time, except while
 * paused, so a test decides how long a toast lives instead of the machine's
 * speed. Only the gallery makes one; the product always uses the real clock.
 */
export function createPartsClock(): ToastClock &
  PartsClockHook & { dispose(): void } {
  let t = 0
  let last = performance.now()
  let paused = false
  let next = 1
  let timers: Timer[] = []
  let tick: ReturnType<typeof setInterval> | undefined

  const move = (ms: number) => {
    const to = t + ms
    for (;;) {
      const due = timers
        .filter((x) => x.at <= to)
        .sort((a, b) => a.at - b.at)[0]
      if (!due) break
      timers = timers.filter((x) => x !== due)
      t = due.at
      due.fn()
    }
    t = to
  }
  const follow = () => {
    const n = performance.now()
    const d = n - last
    last = n
    if (!paused) move(d)
  }
  const run = () => {
    if (tick === undefined) tick = setInterval(follow, 50)
  }

  return {
    now: () => {
      follow()
      return t
    },
    setTimer(fn, ms) {
      follow()
      run()
      const id = next++
      timers.push({ id, at: t + ms, fn })
      return id
    },
    clearTimer(h) {
      timers = timers.filter((x) => x.id !== h)
    },
    pause() {
      follow()
      paused = true
    },
    resume() {
      follow()
      paused = false
    },
    advance(ms) {
      follow()
      move(ms)
    },
    dispose() {
      if (tick !== undefined) clearInterval(tick)
      tick = undefined
      timers = []
    },
  }
}
