// @vitest-environment jsdom
import { SPLASH_MAX_MS, showUpdatingPill } from './autoUpdate'
import { updateStatus } from './updateStatus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FALLBACK_MAX_MS,
  pressRestart,
  resetRestartForTests,
  SLOW_AFTER_MS,
  WATCHDOG_MS,
  restartIntoNewFiles,
  restartRunning,
  WORKER_WAIT_MAX_MS,
  type RestartDeps,
  type WorkerLike,
} from './restartNow'

function clock() {
  let now = 0
  const q: { at: number; run: () => void }[] = []
  const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve()
  }
  return {
    after: (run: () => void, ms: number) => {
      q.push({ at: now + ms, run })
      q.sort((a, b) => a.at - b.at)
      return 0
    },
    async advance(ms: number) {
      const until = now + ms
      for (;;) {
        await flush()
        if (!q.length || q[0].at > until) break
        const n = q.shift()!
        now = n.at
        n.run()
      }
      now = until
      await flush()
    },
  }
}

function fakeWorker(state: string) {
  const w = {
    state,
    onstatechange: null as (() => void) | null,
    postMessage: vi.fn(),
    set(s: string) {
      w.state = s
      w.onstatechange?.()
    },
  }
  return w satisfies WorkerLike & { set(s: string): void }
}

const never = () => new Promise<never>(() => {})

function deps(c: ReturnType<typeof clock>, over: Partial<RestartDeps>) {
  const reload = vi.fn()
  const reloadFresh = vi.fn()
  const report = vi.fn()
  const d: RestartDeps = {
    getRegistration: async () => undefined,
    clearOld: async () => {},
    flush: async () => {},
    reload,
    reloadFresh,
    report,
    after: c.after,
    ...over,
  }
  return { d, reload, reloadFresh, report }
}

describe('an update restart always finishes (T27)', () => {
  beforeEach(resetRestartForTests)

  it('no worker: clears the old files, then reloads', async () => {
    const c = clock()
    const clearOld = vi.fn(async () => {})
    const { d, reload } = deps(c, { clearOld })
    void restartIntoNewFiles(d)
    await c.advance(0)
    expect(clearOld).toHaveBeenCalled()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('a clear that never ends: reloads anyway after the short limit', async () => {
    const c = clock()
    const { d, reload } = deps(c, { clearOld: never })
    void restartIntoNewFiles(d)
    await c.advance(FALLBACK_MAX_MS - 1)
    expect(reload).not.toHaveBeenCalled()
    await c.advance(2)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('a registration lookup that never ends: reloads after the limits', async () => {
    const c = clock()
    const { d, reload } = deps(c, { getRegistration: never, clearOld: never })
    void restartIntoNewFiles(d)
    await c.advance(FALLBACK_MAX_MS * 2 + 5)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('a worker still installing: no clearing, waits, then reloads when active', async () => {
    const c = clock()
    const w = fakeWorker('installing')
    const clearOld = vi.fn(async () => {})
    const { d, reload } = deps(c, {
      clearOld,
      getRegistration: async () => ({ installing: w, waiting: null }),
    })
    void restartIntoNewFiles(d)
    await c.advance(10_000)
    expect(reload).not.toHaveBeenCalled()
    expect(clearOld).not.toHaveBeenCalled()
    w.set('installed')
    await c.advance(0)
    expect(w.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(reload).not.toHaveBeenCalled()
    w.set('activated')
    await c.advance(0)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(clearOld).not.toHaveBeenCalled()
  })

  it('a waiting worker is activated, then the page reloads', async () => {
    const c = clock()
    const w = fakeWorker('installed')
    const { d, reload } = deps(c, {
      getRegistration: async () => ({ installing: null, waiting: w }),
    })
    void restartIntoNewFiles(d)
    await c.advance(0)
    expect(w.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    w.set('activated')
    await c.advance(0)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('a worker that fails (redundant): reloads', async () => {
    const c = clock()
    const w = fakeWorker('installing')
    const { d, reload } = deps(c, {
      getRegistration: async () => ({ installing: w, waiting: null }),
    })
    void restartIntoNewFiles(d)
    await c.advance(0)
    w.set('redundant')
    await c.advance(0)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('a worker that never finishes: after the long limit it falls back and still reloads', async () => {
    const c = clock()
    const w = fakeWorker('installing')
    const { d, reload } = deps(c, {
      clearOld: never,
      getRegistration: async () => ({ installing: w, waiting: null }),
    })
    void restartIntoNewFiles(d)
    await c.advance(WORKER_WAIT_MAX_MS - 1)
    expect(reload).not.toHaveBeenCalled()
    await c.advance(FALLBACK_MAX_MS + 5)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('data safety: what is typed during the wait is saved before the reload', async () => {
    const c = clock()
    const w = fakeWorker('installing')
    let typed = 'a'
    let saved = ''
    const { d, reload } = deps(c, {
      getRegistration: async () => ({ installing: w, waiting: null }),
      flush: async () => {
        saved = typed
      },
    })
    void restartIntoNewFiles(d)
    await c.advance(5_000)
    typed = 'a note typed during the wait'
    w.set('activated')
    await c.advance(0)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(saved).toBe('a note typed during the wait')
  })

  it('a save that never ends does not hold the reload longer than the limit', async () => {
    const c = clock()
    const { d, reload } = deps(c, { flush: never })
    void restartIntoNewFiles(d)
    await c.advance(FALLBACK_MAX_MS - 1)
    expect(reload).not.toHaveBeenCalled()
    await c.advance(2)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('the pill keeps "restarting" for the whole wait, not only 5 s (T27)', async () => {
    const c = clock()
    const w = fakeWorker('installing')
    const { d } = deps(c, {
      getRegistration: async () => ({ installing: w, waiting: null }),
    })
    void restartIntoNewFiles(d)
    showUpdatingPill(c.after)
    await c.advance(SPLASH_MAX_MS * 2)
    expect(restartRunning()).toBe(true)
    expect(updateStatus.get().phase).toBe('updating')
    w.set('activated')
    await c.advance(SPLASH_MAX_MS * 4)
    expect(restartRunning()).toBe(false)
    expect(updateStatus.get().phase).toBe('ready')
  })

  it('reloads only once', async () => {
    const c = clock()
    const { d, reload } = deps(c, { clearOld: never })
    void restartIntoNewFiles(d)
    await c.advance(FALLBACK_MAX_MS * 5)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('C22: the worker wait is 15 s at most', () => {
    expect(WORKER_WAIT_MAX_MS).toBe(15_000)
  })

  it('C22: a worker that never activates: "slow" at 5 s, then the reload at the limit', async () => {
    const c = clock()
    const w = fakeWorker('installing')
    const { d, reload, report } = deps(c, {
      getRegistration: async () => ({ installing: w, waiting: null }),
    })
    void restartIntoNewFiles(d)
    await c.advance(SLOW_AFTER_MS + 1)
    expect(report).toHaveBeenLastCalledWith('slow')
    expect(reload).not.toHaveBeenCalled()
    await c.advance(WORKER_WAIT_MAX_MS + FALLBACK_MAX_MS * 2)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('C22: "Restart now" stops the waiting and reloads at once', async () => {
    const c = clock()
    const w = fakeWorker('installing')
    const { d, reload } = deps(c, {
      getRegistration: async () => ({ installing: w, waiting: null }),
    })
    void restartIntoNewFiles(d)
    await c.advance(SLOW_AFTER_MS + 1)
    pressRestart()
    await c.advance(10)
    expect(reload).toHaveBeenCalledTimes(1)
    await c.advance(WATCHDOG_MS + FALLBACK_MAX_MS * 3) // let this run end
  })

  it('C22: a reload ignored once is asked again with a fresh address', async () => {
    const c = clock()
    const { d, reload, reloadFresh, report } = deps(c, {})
    void restartIntoNewFiles(d)
    await c.advance(100)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(reloadFresh).not.toHaveBeenCalled()
    await c.advance(WATCHDOG_MS + 10)
    expect(reloadFresh).toHaveBeenCalledTimes(1)
    expect(report).not.toHaveBeenCalledWith('failed')
    await c.advance(WATCHDOG_MS) // ends this run
    expect(report).toHaveBeenCalledWith('failed')
  })

  it('C22: ignored twice: "failed" is shown, the restart is free again, Tap to try again works', async () => {
    const c = clock()
    const { d, reload, reloadFresh, report } = deps(c, {})
    void restartIntoNewFiles(d)
    await c.advance(100 + WATCHDOG_MS * 2 + 10)
    expect(report).toHaveBeenLastCalledWith('failed')
    expect(restartRunning()).toBe(false)
    pressRestart()
    await c.advance(100)
    expect(reload).toHaveBeenCalledTimes(2)
    expect(reloadFresh).toHaveBeenCalledTimes(1)
    await c.advance(WATCHDOG_MS * 2 + 10)
  })

  it('C22: typed notes are saved before every reload, including the repeats', async () => {
    const c = clock()
    const flush = vi.fn(async () => {})
    const { d, reload, reloadFresh } = deps(c, { flush })
    void restartIntoNewFiles(d)
    await c.advance(100)
    expect(flush).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledTimes(1)
    await c.advance(WATCHDOG_MS + 10)
    expect(flush).toHaveBeenCalledTimes(2)
    expect(reloadFresh).toHaveBeenCalledTimes(1)
    await c.advance(WATCHDOG_MS)
  })

  it('C22: a worker that never activates, Restart now tapped: the old files are kept (clearOld not called)', async () => {
    const c = clock()
    const w = fakeWorker('installing')
    const clearOld = vi.fn(async () => {})
    const { d, reload } = deps(c, {
      clearOld,
      getRegistration: async () => ({ installing: w, waiting: null }),
    })
    void restartIntoNewFiles(d)
    await c.advance(SLOW_AFTER_MS + 1)
    pressRestart()
    await c.advance(10)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(clearOld).not.toHaveBeenCalled()
    await c.advance(WATCHDOG_MS * 3)
  })

  it('C22: the 15 s timeout with a worker still installing keeps the old files too', async () => {
    const c = clock()
    const w = fakeWorker('installing')
    const clearOld = vi.fn(async () => {})
    const { d, reload } = deps(c, {
      clearOld,
      getRegistration: async () => ({ installing: w, waiting: null }),
    })
    void restartIntoNewFiles(d)
    await c.advance(WORKER_WAIT_MAX_MS + 10)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(clearOld).not.toHaveBeenCalled()
    await c.advance(WATCHDOG_MS * 3)
  })

  it('C22: Restart now tapped while the reload watchdog runs asks again at once', async () => {
    const c = clock()
    const { d, reload, reloadFresh } = deps(c, {})
    void restartIntoNewFiles(d)
    await c.advance(100)
    expect(reload).toHaveBeenCalledTimes(1)
    pressRestart()
    await c.advance(100)
    expect(reloadFresh).toHaveBeenCalledTimes(1)
    await c.advance(WATCHDOG_MS * 3)
  })
})
