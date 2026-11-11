// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { etaSeconds, progressOf } from './updateProgress'
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
})
