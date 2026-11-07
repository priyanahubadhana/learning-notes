import { describe, expect, it, vi } from 'vitest'
import {
  reloadWhenSafe,
  SAFE_RELOAD_MAX_MS,
  watchControllerChange,
  type ServiceWorkerLike,
} from './updates'

function fakeSw(controller: unknown) {
  let fn: (() => void) | undefined
  const sw: ServiceWorkerLike = {
    controller,
    addEventListener: (_t, run) => {
      fn = run
    },
  }
  return { sw, change: () => fn?.() }
}

describe('a clean restart when a new version takes over (R7-1)', () => {
  it('restarts when a controlled page gets a new controller', () => {
    const restart = vi.fn()
    const { sw, change } = fakeSw({})
    watchControllerChange(sw, restart)
    change()
    expect(restart).toHaveBeenCalledTimes(1)
  })

  it('the first install (no controller before) is not an update', () => {
    const restart = vi.fn()
    const { sw, change } = fakeSw(null)
    watchControllerChange(sw, restart)
    change()
    expect(restart).not.toHaveBeenCalled()
    // A later take-over is.
    change()
    expect(restart).toHaveBeenCalledTimes(1)
  })

  it('does nothing without service workers', () => {
    expect(() => watchControllerChange(undefined, vi.fn())).not.toThrow()
  })
})

describe('reloadWhenSafe', () => {
  function clock() {
    let now = 0
    const queue: { at: number; run: () => void }[] = []
    return {
      timers: {
        now: () => now,
        setTimeout: (run: () => void, ms: number) => {
          queue.push({ at: now + ms, run })
          return 0
        },
      },
      advance(ms: number) {
        const until = now + ms
        while (queue.length > 0 && queue[0].at <= until) {
          const next = queue.shift()!
          now = next.at
          next.run()
        }
        now = until
      },
    }
  }

  it('reloads at once when it is safe', () => {
    const reload = vi.fn()
    const c = clock()
    reloadWhenSafe(() => true, reload, c.timers)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('waits until it is safe (a pen lifted, a save finished)', () => {
    const reload = vi.fn()
    const c = clock()
    let safe = false
    reloadWhenSafe(() => safe, reload, c.timers)
    c.advance(1000)
    expect(reload).not.toHaveBeenCalled()
    safe = true
    c.advance(300)
    expect(reload).toHaveBeenCalledTimes(1)
    c.advance(5000)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads anyway after the ceiling, so an old page never runs for ever', () => {
    const reload = vi.fn()
    const c = clock()
    reloadWhenSafe(() => false, reload, c.timers)
    c.advance(SAFE_RELOAD_MAX_MS - 1)
    expect(reload).not.toHaveBeenCalled()
    c.advance(500)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
