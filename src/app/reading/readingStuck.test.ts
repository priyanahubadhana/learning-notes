import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  pageOpened,
  readingLocked,
  readingView,
  resetReadingState,
  startReading,
} from './readingState'

// T8c (why): Reading mode lived on after the page was gone, so the writing
// tool bar could stay missing with no way back. It now ends with the last page.
describe('Reading mode never outlives the page screen (T8c)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetReadingState()
  })
  afterEach(() => vi.useRealTimers())

  it('ends when the last page screen closes', () => {
    const close = pageOpened()
    startReading('inPlace')
    close()
    vi.runAllTimers()
    expect(readingView.get()).toBe('off')
  })

  it('stays on while another page opens in its place', () => {
    const close = pageOpened()
    startReading('reader')
    close()
    const next = pageOpened()
    vi.runAllTimers()
    expect(readingView.get()).toBe('reader')
    next()
  })

  it('"Lock to reading" is respected', () => {
    const close = pageOpened()
    startReading('inPlace')
    readingLocked.set(true)
    close()
    vi.runAllTimers()
    expect(readingView.get()).toBe('inPlace')
  })
})
