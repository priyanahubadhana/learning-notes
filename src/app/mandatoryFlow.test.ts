import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COUNTDOWN_S,
  downloadNewFiles,
  FILE_MAX_MS,
  STALL_MS,
  flow,
  resetMandatoryUpdate,
  startMandatoryUpdate,
  type MandatoryDeps,
} from './mandatoryFlow'
import { mandatoryUpdate } from './mandatoryState'
import { latestVersion, isUpdateRequired, resetUpdates } from './updates'

afterEach(() => {
  vi.useRealTimers()
  resetMandatoryUpdate()
  resetUpdates()
})

const phase = () => mandatoryUpdate.get()?.phase

function deps(over: Partial<MandatoryDeps> = {}): MandatoryDeps {
  return {
    apply: vi.fn(),
    prepare: vi.fn(async () => null),
    download: vi.fn(async (progress) => progress(10, 10)),
    ...over,
  }
}

describe('required flag in version.json', () => {
  const get = (body: object) =>
    (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch
  it('is read only when the version is newer', async () => {
    expect(await latestVersion('a', get({ commit: 'b', required: true }))).toBe(
      'newer',
    )
    expect(isUpdateRequired()).toBe(true)
  })
  it('a normal update is not required', async () => {
    resetUpdates()
    await latestVersion('a', get({ commit: 'b' }))
    expect(isUpdateRequired()).toBe(false)
  })
  it('the same version is never required', async () => {
    resetUpdates()
    await latestVersion('a', get({ commit: 'a', required: true }))
    expect(isUpdateRequired()).toBe(false)
  })
})

describe('mandatory update flow', () => {
  it('counts 5 s, downloads, installs and applies', async () => {
    vi.useFakeTimers()
    const d = deps()
    startMandatoryUpdate(d)
    expect(mandatoryUpdate.get()).toEqual({ phase: 'countdown', left: 5 })
    await vi.advanceTimersByTimeAsync(1000 * (COUNTDOWN_S - 1))
    expect(mandatoryUpdate.get()).toEqual({ phase: 'countdown', left: 1 })
    expect(d.download).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(d.download).toHaveBeenCalledTimes(1)
    expect(d.prepare).toHaveBeenCalledTimes(1)
    expect(d.apply).toHaveBeenCalledTimes(1)
    expect(phase()).toBe('installing')
  })

  it('shows progress while downloading', async () => {
    vi.useFakeTimers()
    let report!: (l: number, t: number) => void
    let finish!: () => void
    startMandatoryUpdate(
      deps({
        download: (p) => {
          report = p
          return new Promise<void>((r) => (finish = r))
        },
      }),
    )
    await vi.advanceTimersByTimeAsync(5000)
    report(30, 100)
    expect(mandatoryUpdate.get()).toEqual({
      phase: 'downloading',
      loaded: 30,
      total: 100,
    })
    finish()
  })

  it('Cancel in the countdown keeps the app blocked, Retry downloads', async () => {
    vi.useFakeTimers()
    const d = deps()
    startMandatoryUpdate(d)
    flow()!.cancel()
    expect(phase()).toBe('paused')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(d.download).not.toHaveBeenCalled()
    expect(phase()).toBe('paused')
    flow()!.retry()
    await vi.advanceTimersByTimeAsync(0)
    expect(d.download).toHaveBeenCalledTimes(1)
    expect(d.apply).toHaveBeenCalledTimes(1)
  })

  it('Cancel while downloading aborts it and never installs', async () => {
    vi.useFakeTimers()
    let signal!: AbortSignal
    const d = deps({
      download: (_p, s) => {
        signal = s
        return new Promise<void>((resolve) =>
          s.addEventListener('abort', () => resolve()),
        )
      },
    })
    startMandatoryUpdate(d)
    await vi.advanceTimersByTimeAsync(5000)
    flow()!.cancel()
    await vi.advanceTimersByTimeAsync(0)
    expect(signal.aborted).toBe(true)
    expect(phase()).toBe('paused')
    expect(d.apply).not.toHaveBeenCalled()
  })

  it('a failed download shows Retry; Retry tries again', async () => {
    vi.useFakeTimers()
    const download = vi
      .fn<NonNullable<MandatoryDeps['download']>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation(async (p) => p(1, 1))
    const d = deps({ download })
    startMandatoryUpdate(d)
    await vi.advanceTimersByTimeAsync(5000)
    expect(mandatoryUpdate.get()).toEqual({
      phase: 'failed',
      reason: 'download',
    })
    expect(d.apply).not.toHaveBeenCalled()
    flow()!.retry()
    await vi.advanceTimersByTimeAsync(0)
    expect(d.apply).toHaveBeenCalledTimes(1)
  })

  it('unsaved changes hold the update back (data never touched)', async () => {
    vi.useFakeTimers()
    const d = deps({ prepare: async () => ({ kind: 'unsaved' }) })
    startMandatoryUpdate(d)
    await vi.advanceTimersByTimeAsync(5000)
    expect(mandatoryUpdate.get()).toEqual({
      phase: 'failed',
      reason: 'unsaved',
    })
    expect(d.apply).not.toHaveBeenCalled()
  })

  it('a restart that never comes shows Retry', async () => {
    vi.useFakeTimers()
    const hardRestart = vi.fn()
    startMandatoryUpdate(deps({ hardRestart }))
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(6000)
    expect(hardRestart).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(mandatoryUpdate.get()).toEqual({
      phase: 'failed',
      reason: 'install',
    })
  })

  it('starts only once', () => {
    vi.useFakeTimers()
    const a = startMandatoryUpdate(deps())
    expect(startMandatoryUpdate(deps())).toBe(a)
  })
})

describe('downloadNewFiles', () => {
  it('fetches only files not cached and counts bytes', async () => {
    const get = vi.fn(
      async () => new Response(new Uint8Array(100)),
    ) as unknown as typeof fetch
    const seen: number[] = []
    await downloadNewFiles(
      (l) => seen.push(l),
      new AbortController().signal,
      async () => [
        { u: '/a.js', s: 100 },
        { u: '/b.js', s: 100 },
      ],
      async () => new Set(['/a.js']),
      get,
    )
    expect(get).toHaveBeenCalledTimes(1)
    expect(seen.at(-1)).toBe(100)
  })
  it('rejects on an error status', async () => {
    const get = (async () => new Response('', { status: 503 })) as typeof fetch
    await expect(
      downloadNewFiles(
        () => {},
        new AbortController().signal,
        async () => [{ u: '/a.js', s: 1 }],
        async () => new Set(),
        get,
      ),
    ).rejects.toThrow()
  })
  it('every file already cached: 0 files, ends at once, no request', async () => {
    const get = vi.fn() as unknown as typeof fetch
    const seen: Array<[number, number]> = []
    await downloadNewFiles(
      (l, t) => seen.push([l, t]),
      new AbortController().signal,
      async () => [
        { u: '/a.js', s: 100 },
        { u: '/b.js', s: 100 },
      ],
      async () => new Set(['/a.js', '/b.js']),
      get,
    )
    expect(get).not.toHaveBeenCalled()
    expect(seen).toEqual([[0, 0]])
  })
  // A request that never answers (and ignores the abort, like a stuck network).
  const hung = (() => new Promise(() => {})) as unknown as typeof fetch
  const run = (get: typeof fetch) =>
    downloadNewFiles(
      () => {},
      new AbortController().signal,
      async () => [{ u: '/a.js', s: 1 }],
      async () => new Set(),
      get,
    )
  it('watchdog: no byte for the stall limit rejects (never stuck)', async () => {
    vi.useFakeTimers()
    const p = run(hung)
    const out = expect(p).rejects.toThrow('stalled')
    await vi.advanceTimersByTimeAsync(STALL_MS + 1)
    await out
  })
  it('watchdog: a stream that stops mid-file rejects', async () => {
    vi.useFakeTimers()
    const body = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(5))
      },
    })
    const p = run((async () => new Response(body)) as unknown as typeof fetch)
    const out = expect(p).rejects.toThrow('stalled')
    await vi.advanceTimersByTimeAsync(STALL_MS + 1)
    await out
  })
  it('a slow file that keeps sending stops at the per-file limit', async () => {
    vi.useFakeTimers()
    let ctl!: ReadableStreamDefaultController<Uint8Array>
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        ctl = c
      },
    })
    const p = run((async () => new Response(body)) as unknown as typeof fetch)
    const out = expect(p).rejects.toThrow('too slow')
    for (let t = 0; t < FILE_MAX_MS; t += 10_000) {
      ctl.enqueue(new Uint8Array(1))
      await vi.advanceTimersByTimeAsync(10_000)
    }
    await vi.advanceTimersByTimeAsync(1)
    await out
  })
  it('the flow shows Try again when the download stalls', async () => {
    vi.useFakeTimers()
    startMandatoryUpdate(
      deps({
        download: (p, s) =>
          downloadNewFiles(
            p,
            s,
            async () => [{ u: '/a.js', s: 1 }],
            async () => new Set(),
            hung,
          ),
      }),
    )
    await vi.advanceTimersByTimeAsync((COUNTDOWN_S + 1) * 1000)
    expect(phase()).toBe('downloading')
    await vi.advanceTimersByTimeAsync(STALL_MS + 1)
    expect(phase()).toBe('failed')
  })
})
