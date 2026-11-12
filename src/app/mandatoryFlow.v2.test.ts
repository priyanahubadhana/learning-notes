import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COUNTDOWN_S,
  FORCE_RESTART_MS,
  SAVE_WAIT_MS,
  etaSeconds,
  resetMandatoryUpdate,
  startMandatoryUpdate,
  type MandatoryDeps,
} from './mandatoryFlow'
import { mandatoryMeta, mandatoryUpdate } from './mandatoryState'
import { resetUpdates } from './updates'

afterEach(() => {
  vi.useRealTimers()
  resetMandatoryUpdate()
  resetUpdates()
})

const phase = () => mandatoryUpdate.get()?.phase

/** A network the test switches by hand. */
function net(start = true) {
  let online = start
  const fns = new Set<(o: boolean) => void>()
  return {
    online: () => online,
    watchOnline: (fn: (o: boolean) => void) => {
      fns.add(fn)
      return () => fns.delete(fn)
    },
    set(o: boolean) {
      online = o
      for (const f of fns) f(o)
    },
  }
}

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

describe('reason and eta', () => {
  it('keeps the reason for the screen', () => {
    startMandatoryUpdate(deps({ reason: 'datafix' }))
    expect(mandatoryMeta.get()).toEqual({ v2: true, reason: 'datafix' })
  })
  it('eta is unknown at first, then bytes left over speed', () => {
    expect(etaSeconds(0, 100, 5000)).toBeUndefined()
    expect(etaSeconds(10, 100, 100)).toBeUndefined()
    expect(etaSeconds(50, 100, 4000)).toBe(4)
    expect(etaSeconds(100, 100, 4000)).toBeUndefined()
    expect(etaSeconds(10, 0, 4000)).toBeUndefined()
  })
})

describe('offline wait (the app is never locked out)', () => {
  it('starts offline: waits, then counts down by itself when back online', () => {
    vi.useFakeTimers()
    const n = net(false)
    startMandatoryUpdate(deps(n))
    expect(phase()).toBe('offline')
    vi.advanceTimersByTime(10_000)
    expect(phase()).toBe('offline')
    n.set(true)
    expect(mandatoryUpdate.get()).toEqual({
      phase: 'countdown',
      left: COUNTDOWN_S,
    })
  })
  it('going offline in the countdown pauses it; coming back restarts it', () => {
    vi.useFakeTimers()
    const n = net(true)
    startMandatoryUpdate(deps(n))
    vi.advanceTimersByTime(2000)
    n.set(false)
    expect(phase()).toBe('offline')
    vi.advanceTimersByTime(10_000)
    expect(phase()).toBe('offline')
    n.set(true)
    expect(phase()).toBe('countdown')
  })
  it('going offline in the download stops it and waits', async () => {
    vi.useFakeTimers()
    const n = net(true)
    const download = vi.fn(
      (_p: unknown, signal: AbortSignal) =>
        new Promise<void>((_ok, fail) =>
          signal.addEventListener('abort', () => fail(new Error('x'))),
        ),
    )
    startMandatoryUpdate(deps({ ...n, download }))
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000)
    expect(phase()).toBe('downloading')
    n.set(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(phase()).toBe('offline')
  })
  it('a pause chosen by the person is not undone by the network', () => {
    vi.useFakeTimers()
    const n = net(true)
    const f = startMandatoryUpdate(deps(n))
    f.cancel()
    expect(phase()).toBe('paused')
    n.set(false)
    n.set(true)
    expect(phase()).toBe('paused')
  })
  it('a download that fails while offline waits instead of failing', async () => {
    vi.useFakeTimers()
    const n = net(true)
    startMandatoryUpdate(
      deps({
        ...n,
        download: async () => {
          n.set(false)
          throw new Error('offline')
        },
      }),
    )
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000)
    expect(phase()).toBe('offline')
  })
})

describe('install', () => {
  it('waits up to 5 s for an unsaved change, then says it is not saved', async () => {
    vi.useFakeTimers()
    const prepare = vi.fn(async () => ({ kind: 'unsaved' as const }))
    startMandatoryUpdate(deps({ prepare }))
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000)
    expect(phase()).toBe('installing')
    await vi.advanceTimersByTimeAsync(SAVE_WAIT_MS - 500)
    expect(phase()).toBe('installing')
    await vi.advanceTimersByTimeAsync(1500)
    expect(mandatoryUpdate.get()).toEqual({
      phase: 'failed',
      reason: 'unsaved',
    })
  })
  it('installs when the save finishes inside the wait', async () => {
    vi.useFakeTimers()
    let calls = 0
    const apply = vi.fn()
    startMandatoryUpdate(
      deps({
        apply,
        prepare: async () =>
          ++calls < 4 ? { kind: 'unsaved' as const } : null,
      }),
    )
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000 + 3000)
    expect(apply).toHaveBeenCalledTimes(1)
  })
  it('no restart within 6 s: "did not finish" with Try again', async () => {
    vi.useFakeTimers()
    const hardRestart = vi.fn()
    startMandatoryUpdate(deps({ hardRestart }))
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000)
    expect(phase()).toBe('installing')
    await vi.advanceTimersByTimeAsync(FORCE_RESTART_MS + 10)
    expect(mandatoryUpdate.get()).toEqual({
      phase: 'failed',
      reason: 'install',
    })
  })
  it('flag off: the 30 s limit and the forced restart stay as today', async () => {
    vi.useFakeTimers()
    const hardRestart = vi.fn()
    startMandatoryUpdate(deps({ v2: false, hardRestart }))
    await vi.advanceTimersByTimeAsync(COUNTDOWN_S * 1000)
    await vi.advanceTimersByTimeAsync(FORCE_RESTART_MS + 10)
    expect(hardRestart).toHaveBeenCalledTimes(1)
    expect(phase()).toBe('installing')
  })
})
