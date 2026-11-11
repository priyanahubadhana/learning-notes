import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COUNTDOWN_S,
  downloadNewFiles,
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
})
