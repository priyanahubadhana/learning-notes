// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { etaSeconds, follow, progressOf } from './updateProgress'
import { setFlag } from './flags'
import { SPLASH_MAX_MS, showUpdatingPill } from './autoUpdate'
import { updateStatus } from './updateStatus'

describe('update progress', () => {
  it('counts only files that were not cached before', () => {
    const listed = [
      { u: '/a.js', s: 100 },
      { u: '/b.js', s: 300 },
      { u: '/c.js', s: 600 },
    ]
    const p = progressOf(
      listed,
      new Set(['/a.js']),
      new Set(['/a.js', '/b.js']),
    )
    expect(p).toEqual({ loaded: 300, total: 900, files: 1, filesTotal: 2 })
  })
  it('estimates the seconds left from the speed so far', () => {
    expect(etaSeconds(0, 100, 1000)).toBeUndefined()
    expect(etaSeconds(50, 100, 10_000)).toBe(10)
  })
  it('shows the restart in the pill (no black cover) and gives up after 5 s', () => {
    vi.useFakeTimers()
    showUpdatingPill()
    expect(document.querySelector('[data-update-splash]')).toBeNull()
    expect(updateStatus.get().phase).toBe('updating')
    vi.advanceTimersByTime(SPLASH_MAX_MS + 10)
    expect(updateStatus.get().phase).toBe('ready')
    vi.useRealTimers()
  })
  it('the download poll never overwrites a restart already asked for (issue 58)', async () => {
    setFlag('update.v2', true)
    // The first cache read (before the install) is quick; the poll's own read is held open.
    let release: (v: string[]) => void = () => {}
    const held = new Promise<string[]>((r) => (release = r))
    const keys = vi.fn().mockResolvedValueOnce([]).mockReturnValueOnce(held)
    vi.stubGlobal('caches', { keys, open: vi.fn() })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ files: [{ u: '/a.js', s: 100 }] }),
      }),
    )
    const worker = Object.assign(new EventTarget(), {
      state: 'installing',
    }) as unknown as ServiceWorker
    void follow(worker)
    await vi.waitFor(() => expect(keys).toHaveBeenCalledTimes(2))
    // The 3 s prompt starts while the poll waits for the cache.
    updateStatus.set({ phase: 'updating', countdown: 3 })
    release([])
    await new Promise((r) => setTimeout(r, 20))
    expect(updateStatus.get()).toMatchObject({
      phase: 'updating',
      countdown: 3,
    })
    ;(worker as { state: string }).state = 'activated'
    vi.unstubAllGlobals()
    setFlag('update.v2', false)
  })
})
