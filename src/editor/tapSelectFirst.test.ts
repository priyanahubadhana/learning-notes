// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { boxShift, nextTapCount, tapLevel, textFirstTap } from './tapSelect'

function editorIn(id: string, picked: boolean): HTMLElement {
  const box = document.createElement('div')
  box.setAttribute('data-paper-box', id)
  if (picked) box.setAttribute('data-picked', '')
  const ed = document.createElement('div')
  box.appendChild(ed)
  return ed
}

describe('boxShift with the Text tool (text box v2, TB-01)', () => {
  afterEach(() => {
    textFirstTap.on = false
  })

  it('switch off: the Text tool edits at once, as today', () => {
    expect(boxShift(editorIn('a', false), 'text')).toBe(0)
  })

  it('switch on: the first tap on a box that is not selected selects it', () => {
    textFirstTap.on = true
    expect(boxShift(editorIn('a', false), 'text')).toBe(1)
  })

  it('switch on: a selected box and the default box take the caret', () => {
    textFirstTap.on = true
    expect(boxShift(editorIn('a', true), 'text')).toBe(0)
    expect(boxShift(editorIn('main', false), 'text')).toBe(0)
  })

  it('the Lasso is not changed by the switch', () => {
    expect(boxShift(editorIn('a', false), 'lasso')).toBe(1)
  })
})

describe('tapLevel: what the Nth quick tap does (TB-04)', () => {
  it('switch on, box not selected: tap 1 selects the box, tap 2 is the first caret tap, tap 3 the word', () => {
    expect([1, 2, 3, 4, 5].map((n) => tapLevel(n, 1, true))).toEqual([
      0, 1, 2, 3, 4,
    ])
  })

  it('switch on, box selected: tap 1 caret, 2 word, 3 line, 4 paragraph', () => {
    expect([1, 2, 3, 4].map((n) => tapLevel(n, 0, true))).toEqual([1, 2, 3, 4])
  })

  it('switch off or Lasso: counts as before (a double tap on a new box = word)', () => {
    expect([1, 2, 3].map((n) => tapLevel(n, 1, false))).toEqual([0, 2, 3])
    expect([1, 2, 3].map((n) => tapLevel(n, 0, false))).toEqual([1, 2, 3])
  })
})

describe('tap timing (Pencil, TB-04)', () => {
  const at = (t: number, x = 100, y = 100) => ({ at: t, x, y, count: 1 })

  it('taps 80 to 350 ms apart add up; 450 ms or more start again', () => {
    for (const gap of [80, 150, 250, 350, 440])
      expect(nextTapCount(at(1000), 1000 + gap, 100, 100), 'gap ' + gap).toBe(2)
    expect(nextTapCount(at(1000), 1450, 100, 100)).toBe(1)
  })

  it('a wiggle of 6 px still counts as the same spot; 20 px does not', () => {
    expect(nextTapCount(at(1000), 1200, 104, 104)).toBe(2)
    expect(nextTapCount(at(1000), 1200, 120, 120)).toBe(1)
  })
})
