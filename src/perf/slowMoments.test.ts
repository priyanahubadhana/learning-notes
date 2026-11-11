/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  KEEP,
  clearSlowMoments,
  flushSlowMoments,
  noteSlowMoment,
  readSlowMoments,
  slowMomentsReport,
  startSlowMoments,
} from './slowMoments'

describe('slow moments (R6-11)', () => {
  beforeEach(() => clearSlowMoments())

  it('keeps only the last 50 on the device, newest last', () => {
    for (let i = 0; i < KEEP + 5; i++) noteSlowMoment('stall', 300 + i, i)
    const list = readSlowMoments()
    expect(list).toHaveLength(KEEP)
    expect(list[0].ms).toBe(305)
    expect(list[KEEP - 1].ms).toBe(300 + KEEP + 4)
    expect(list[0].route).toBe('')
  })

  it('writes a plain-text report with one line per moment', () => {
    noteSlowMoment('longtask', 120.4, Date.UTC(2026, 10, 7, 9, 30))
    noteSlowMoment('stall', 900, Date.UTC(2026, 10, 7, 9, 31))
    const report = slowMomentsReport(readSlowMoments(), 'TestBrowser/1')
    const lines = report.split('\n')
    expect(lines[0]).toBe('Learning Notes slow moments (2)')
    expect(lines[1]).toBe('TestBrowser/1')
    expect(lines.at(-2)).toContain('2026-11-07 09:30:00  long task  120 ms')
    expect(lines.at(-1)).toContain('froze  900 ms')
  })
})

describe('slow moments are cheap to record', () => {
  beforeEach(() => {
    clearSlowMoments()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('batches the writes: one write for a burst, after a few seconds', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem')
    for (let i = 0; i < 10; i++) noteSlowMoment('stall', 300 + i, i)
    expect(set).not.toHaveBeenCalled()
    expect(readSlowMoments()).toHaveLength(10) // still readable at once
    vi.advanceTimersByTime(3100)
    expect(set).toHaveBeenCalledTimes(1)
    expect(readSlowMoments()).toHaveLength(10)
  })

  it('flushSlowMoments writes what is waiting right now', () => {
    noteSlowMoment('longtask', 80, 1)
    flushSlowMoments()
    expect(
      JSON.parse(localStorage.getItem('learning-notes:perf.slow')!),
    ).toHaveLength(1)
  })

  it('pauses the stall check while the page is hidden, and writes on hide', () => {
    let state: DocumentVisibilityState = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state)
    const stop = startSlowMoments()
    const spy = vi.spyOn(globalThis, 'clearInterval')
    noteSlowMoment('stall', 400, 5)
    state = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(spy).toHaveBeenCalled()
    // Written as the app left the front.
    expect(localStorage.getItem('learning-notes:perf.slow')).toContain('400')
    // No timer runs while hidden: a long wait notes nothing.
    vi.advanceTimersByTime(60_000)
    expect(readSlowMoments()).toHaveLength(1)
    stop()
  })
})
