/**
 * P1.8: the must-have download on a real iPad. Each test pins one cause
 * found against the live preview (15 Nov):
 *  - precache.json listed 29 EMPTY files (0 bytes). Cloudflare Pages does not
 *    serve empty files (404) and the offline copy never saves them, so every
 *    download, Pretend included, failed at once ("after 0 s").
 *  - a newer deploy mid-update removes old file names (404).
 *  - the time left counted the file listing (slow on Safari) as download time.
 *  - "slow connection" came from the time left, not from the speed.
 *  - the failed screen had no way back to the app.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPrecached } from './precacheRules'
import {
  COUNTDOWN_S,
  downloadNewFiles,
  flow,
  resetMandatoryUpdate,
  startMandatoryUpdate,
  type MandatoryDeps,
} from './mandatoryFlow'
import { mandatoryFailure, mandatoryUpdate } from './mandatoryState'
import { slowEtaS, SLOW_BYTES_PER_S, SLOW_ETA_S } from './updateProgress'
import { resetUpdates, triggerMustHave } from './updates'

afterEach(() => {
  vi.useRealTimers()
  resetMandatoryUpdate()
  resetUpdates()
})

const phase = () => mandatoryUpdate.get()?.phase
const ok = (n: number) => new Response(new Uint8Array(n))

describe('P1.8 the file list names only files the server sends', () => {
  it('an empty built file is not listed (the server answers 404 for it)', () => {
    expect(isPrecached('assets/penCards-IBvbeZ0b.js', 0)).toBe(false)
    expect(isPrecached('assets/penCards-IBvbeZ0b.js', 1)).toBe(true)
  })
  it('an empty file in an old list is never fetched', async () => {
    const get = vi.fn(async () => ok(10)) as unknown as typeof fetch
    await downloadNewFiles(
      () => {},
      new AbortController().signal,
      async () => [
        { u: '/assets/empty.js', s: 0 },
        { u: '/assets/a.js', s: 10 },
      ],
      async () => new Set(),
      get,
    )
    expect(get).toHaveBeenCalledTimes(1)
    expect(vi.mocked(get).mock.calls[0][0]).toBe('/assets/a.js')
  })
})

describe('P1.8 a newer deploy during the download', () => {
  it('a 404 for a file the newest list no longer names is skipped', async () => {
    let reads = 0
    const files = async () =>
      reads++ === 0
        ? [
            { u: '/assets/old.js', s: 5 },
            { u: '/assets/a.js', s: 10 },
          ]
        : [{ u: '/assets/a.js', s: 10 }]
    const get = (async (u: string) =>
      u === '/assets/old.js'
        ? new Response('gone', { status: 404 })
        : ok(10)) as unknown as typeof fetch
    const seen: Array<[number, number]> = []
    await downloadNewFiles(
      (l, t) => seen.push([l, t]),
      new AbortController().signal,
      files,
      async () => new Set(),
      get,
    )
    expect(seen.at(-1)).toEqual([10, 10])
  })
  it('a 404 for a file the newest list still names fails (really missing)', async () => {
    const get = (async () =>
      new Response('gone', { status: 404 })) as unknown as typeof fetch
    await expect(
      downloadNewFiles(
        () => {},
        new AbortController().signal,
        async () => [{ u: '/assets/a.js', s: 10 }],
        async () => new Set(),
        get,
      ),
    ).rejects.toThrow('404')
  })
})

function deps(over: Partial<MandatoryDeps> = {}): MandatoryDeps {
  return {
    v2: true,
    online: () => true,
    apply: vi.fn(),
    prepare: vi.fn(async () => null),
    download: vi.fn(async (progress) => progress(10, 10)),
    ...over,
  }
}

describe('P1.8 an honest time left', () => {
  it('the clock starts when the files start coming, not while they are listed', async () => {
    vi.useFakeTimers()
    let t = 0
    let tick: (loaded: number, total: number) => void = () => {}
    startMandatoryUpdate(
      deps({
        now: () => t,
        download: (progress) =>
          new Promise<void>(() => {
            tick = progress
          }),
      }),
    )
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000)
    // Listing the files and reading the offline copy took 5 s.
    t += 5000
    tick(0, 1000)
    // Then half of the bytes came in 1 s: about 1 s is left, not 6.
    t += 1000
    tick(500, 1000)
    const s = mandatoryUpdate.get()
    expect(s?.phase === 'downloading' && s.etaS).toBe(1)
  })
})

describe('P1.8 "slow connection" only when the speed is slow', () => {
  it('a big download on a fast network is not called slow', () => {
    // 2 MB of 20 MB in 2 s = 1 MB/s; 18 s left, but the network is fine.
    expect(slowEtaS(2_000_000, 20_000_000, 2000)).toBeUndefined()
  })
  it('a slow speed with a long wait is called slow, with the time left', () => {
    const loaded = (SLOW_BYTES_PER_S / 2) * 4 // 4 s at half the limit
    expect(slowEtaS(loaded, loaded * 10, 4000)).toBeGreaterThanOrEqual(
      SLOW_ETA_S,
    )
  })
  it('a slow speed with only a moment left is not called slow', () => {
    expect(slowEtaS(10_000, 11_000, 2000)).toBeUndefined()
  })
  it('too early to tell: not called slow', () => {
    expect(slowEtaS(100, 10_000_000, 300)).toBeUndefined()
  })
})

describe('P1.8 the failed screen has a way back to the app', () => {
  const failing = () =>
    deps({
      download: async () => {
        throw new Error('x')
      },
    })
  it('Not now closes the screen; the next look for the update asks again', async () => {
    vi.useFakeTimers()
    startMandatoryUpdate(failing())
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000)
    expect(phase()).toBe('failed')
    flow()?.dismiss()
    expect(mandatoryUpdate.get()).toBeNull()
    expect(mandatoryFailure.get()).toBeNull()
    // A later check that still finds the must-have version shows it again.
    startMandatoryUpdate(failing())
    expect(phase()).toBe('countdown')
  })
  it('Not now does nothing while paused (the spec keeps the app blocked there)', async () => {
    vi.useFakeTimers()
    startMandatoryUpdate(deps())
    flow()?.cancel()
    expect(phase()).toBe('paused')
    flow()?.dismiss()
    expect(phase()).toBe('paused')
  })
  it('Try again clears the old failure note', async () => {
    vi.useFakeTimers()
    let fail = true
    startMandatoryUpdate(
      deps({
        download: (async (progress: (l: number, t: number) => void) => {
          if (fail) throw new Error('x')
          progress(10, 10)
          await new Promise<void>(() => {})
        }) as MandatoryDeps['download'],
      }),
    )
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000)
    expect(mandatoryFailure.get()).not.toBeNull()
    fail = false
    flow()?.retry()
    await vi.advanceTimersByTimeAsync(0)
    expect(mandatoryFailure.get()).toBeNull()
  })
})

describe('P1.8 review: never leave when the notes are already upgraded (U11)', () => {
  it('another tab upgraded the notes: no way back, the app stays blocked', async () => {
    vi.useFakeTimers()
    // This tab's code is older than the stored notes; its database is closed.
    triggerMustHave('storage', () => {})
    startMandatoryUpdate(
      deps({
        download: async () => {
          throw new Error('x')
        },
      }),
    )
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000)
    expect(phase()).toBe('failed')
    expect(flow()?.canDismiss()).toBe(false)
    flow()?.dismiss()
    expect(phase()).toBe('failed')
  })
  it('a normal must-have update may be left after a failure', () => {
    startMandatoryUpdate(deps())
    expect(flow()?.canDismiss()).toBe(true)
  })
})

describe('P1.8 review: a 404 is skipped only when the newest list proves it', () => {
  const missing = (async () =>
    new Response('gone', { status: 404 })) as unknown as typeof fetch
  it('the newest list cannot be read: the 404 is a failure', async () => {
    let reads = 0
    await expect(
      downloadNewFiles(
        () => {},
        new AbortController().signal,
        async () => {
          if (reads++ === 0) return [{ u: '/assets/a.js', s: 10 }]
          throw new Error('offline')
        },
        async () => new Set(),
        missing,
      ),
    ).rejects.toThrow('404')
  })
  it('the newest list comes back empty (a failed read): the 404 is a failure', async () => {
    let reads = 0
    await expect(
      downloadNewFiles(
        () => {},
        new AbortController().signal,
        async () => (reads++ === 0 ? [{ u: '/assets/a.js', s: 10 }] : []),
        async () => new Set(),
        missing,
      ),
    ).rejects.toThrow('404')
  })
})
