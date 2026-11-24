// @vitest-environment jsdom
/**
 * P1.8: the pill while a new version installs. The offline copy fetches new
 * files one at a time; the page now fetches them in parallel at the same
 * time, and the pill counts those bytes (honest speed, honest "slow").
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { follow, type downloadNewFiles } from './updateProgress'
import { updateStatus } from './updateStatus'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  updateStatus.set({ phase: 'idle' })
})

function fakeWorker() {
  const w = new EventTarget() as EventTarget & { state: string }
  w.state = 'installing'
  return w as unknown as ServiceWorker & { state: string }
}

describe('P1.8 the pill fetches the new files in parallel', () => {
  it('starts the parallel download and shows its bytes; a fast network is not "slow"', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ files: [] })),
    )
    let tick: (l: number, t: number) => void = () => {}
    const download = vi.fn(
      (p: (l: number, t: number) => void) =>
        new Promise<void>(() => {
          tick = p
        }),
    ) as unknown as typeof downloadNewFiles
    void follow(fakeWorker(), download)
    await vi.advanceTimersByTimeAsync(0)
    expect(download).toHaveBeenCalledTimes(1)
    tick(0, 20_000_000)
    // 2 MB in 2 s: 1 MB/s, 18 s left, but the connection is fine.
    await vi.advanceTimersByTimeAsync(2000)
    tick(2_000_000, 20_000_000)
    await vi.advanceTimersByTimeAsync(500)
    const s = updateStatus.get()
    expect(s).toMatchObject({
      phase: 'downloading',
      loaded: 2_000_000,
      total: 20_000_000,
    })
    expect(s.etaS).toBeUndefined()
  })
  it('the download ends when the new version is installed', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ files: [] })),
    )
    let signal!: AbortSignal
    const download = vi.fn(
      (_p: unknown, s: AbortSignal) =>
        new Promise<void>(() => {
          signal = s
        }),
    ) as unknown as typeof downloadNewFiles
    const w = fakeWorker()
    void follow(w, download)
    await vi.advanceTimersByTimeAsync(0)
    w.state = 'installed'
    w.dispatchEvent(new Event('statechange'))
    expect(signal.aborted).toBe(true)
    expect(updateStatus.get().phase).toBe('installing')
  })
})
