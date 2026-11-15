// @vitest-environment jsdom
import { SPLASH_MAX_MS, showUpdatingPill } from './autoUpdate'
import { updateStatus } from './updateStatus'
import { describe, expect, it, vi } from 'vitest'
import {
  FALLBACK_MAX_MS,
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
  const d: RestartDeps = {
    getRegistration: async () => undefined,
    clearOld: async () => {},
    flush: async () => {},
    reload,
    after: c.after,
    ...over,
  }
  return { d, reload }
}

describe('an update restart always finishes (T27)', () => {
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
    await c.advance(SPLASH_MAX_MS * 6)
    expect(restartRunning()).toBe(true)
    expect(updateStatus.get().phase).toBe('updating')
    w.set('activated')
    await c.advance(SPLASH_MAX_MS * 2)
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
})
