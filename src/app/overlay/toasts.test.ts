import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createToastQueue, stackPositions } from './toasts'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('toast queue', () => {
  it('shows 3, the 4th waits and appears when one goes', () => {
    const q = createToastQueue({ max: 3, timeoutMs: 1000 })
    const ids = ['a', 'b', 'c', 'd'].map((message) => q.push({ message }))
    expect(q.visible().map((t) => t.message)).toEqual(['a', 'b', 'c'])
    expect(q.waiting().map((t) => t.message)).toEqual(['d'])
    q.dismiss(ids[0])
    expect(q.visible().map((t) => t.message)).toEqual(['b', 'c', 'd'])
    expect(q.waiting()).toEqual([])
  })
  it('times out via setTimeout and promotes waiting ones', () => {
    const q = createToastQueue({ max: 1, timeoutMs: 1000 })
    q.push({ message: 'a' })
    q.push({ message: 'b' })
    vi.advanceTimersByTime(1000)
    expect(q.visible().map((t) => t.message)).toEqual(['b'])
    vi.advanceTimersByTime(1000)
    expect(q.visible()).toEqual([])
  })
  it('a waiting toast gets its full time only once shown', () => {
    const q = createToastQueue({ max: 1, timeoutMs: 1000 })
    q.push({ message: 'a' })
    q.push({ message: 'b' })
    vi.advanceTimersByTime(1500)
    expect(q.visible().map((t) => t.message)).toEqual(['b'])
  })
  it('dismiss of unknown id does nothing; subscribe notifies', () => {
    const q = createToastQueue({ max: 3, timeoutMs: 1000 })
    const cb = vi.fn()
    const off = q.subscribe(cb)
    const id = q.push({ message: 'a' })
    q.dismiss(999)
    expect(cb).toHaveBeenCalledTimes(1)
    q.dismiss(id)
    q.dismiss(id)
    expect(cb).toHaveBeenCalledTimes(2)
    off()
    q.push({ message: 'b' })
    expect(cb).toHaveBeenCalledTimes(2)
  })
})

describe('stackPositions', () => {
  const vp = { width: 390, height: 844 }
  it('stacks upward from the bottom with no avoid', () => {
    expect(stackPositions([50, 50, 50], vp, [])).toEqual([786, 728, 670])
  })
  it('never overlaps a title rect', () => {
    const title = { left: 0, top: 740, width: 390, height: 60 }
    const heights = [50, 50, 50]
    const tops = stackPositions(heights, vp, [title])
    tops.forEach((top, i) => {
      const bottom = top + heights[i]
      expect(bottom <= title.top || top >= title.top + title.height).toBe(true)
    })
    expect(new Set(tops).size).toBe(3)
  })
})
