import { describe, expect, it } from 'vitest'
import { chipTops, CHIP_H } from './barLayout'
import {
  DEFAULT_BARS,
  HIDE_AFTER,
  SHOW_AFTER,
  START_SCROLL,
  isBarState,
  scrollStep,
  setMinimised,
} from './barState'

describe('barState', () => {
  it('starts with both bars showing', () => {
    expect(DEFAULT_BARS).toEqual({ reader: false, draw: false })
  })
  it('validates what was saved', () => {
    expect(isBarState({ reader: true, draw: false })).toBe(true)
    expect(isBarState({ reader: true })).toBe(false)
    expect(isBarState(null)).toBe(false)
    expect(isBarState('x')).toBe(false)
  })
  it('minimises and restores each bar on its own', () => {
    const a = setMinimised(DEFAULT_BARS, 'reader', true)
    expect(a).toEqual({ reader: true, draw: false })
    const b = setMinimised(a, 'draw', true)
    expect(b).toEqual({ reader: true, draw: true })
    expect(setMinimised(b, 'draw', false)).toEqual({
      reader: true,
      draw: false,
    })
    expect(setMinimised(b, 'reader', false)).toEqual({
      reader: false,
      draw: true,
    })
  })
})

describe('scrollStep', () => {
  it('hides after scrolling down and shows after 12 px up', () => {
    let s = scrollStep(START_SCROLL, 10)
    expect(s.hidden).toBe(false)
    s = scrollStep(s, 10 + HIDE_AFTER)
    expect(s.hidden).toBe(true)
    s = scrollStep(s, 10 + HIDE_AFTER - (SHOW_AFTER - 1))
    expect(s.hidden).toBe(true)
    s = scrollStep(s, 10 + HIDE_AFTER - SHOW_AFTER)
    expect(s.hidden).toBe(false)
  })
  it('shows at the very top', () => {
    let s = scrollStep(START_SCROLL, 5)
    s = scrollStep(s, 100)
    expect(s.hidden).toBe(true)
    expect(scrollStep(s, 0).hidden).toBe(false)
  })
})

describe('chipTops', () => {
  it('stacks chips 8 px apart from the wanted top', () => {
    expect(chipTops(800, 64, 2)).toEqual([64, 64 + CHIP_H + 8])
    expect(chipTops(800, 64, 0)).toEqual([])
  })
  it('keeps every chip fully on screen, even on short screens', () => {
    for (const h of [320, 390, 568, 744, 820, 1024, 1366]) {
      for (const wanted of [0, 64, 200, 5000]) {
        for (const n of [1, 2]) {
          const tops = chipTops(h, wanted, n)
          for (const t of tops) {
            expect(t).toBeGreaterThanOrEqual(8)
            expect(t + CHIP_H).toBeLessThanOrEqual(h - 8)
          }
        }
      }
    }
  })
})
