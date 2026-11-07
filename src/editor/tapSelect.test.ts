import { describe, expect, it } from 'vitest'
import { Schema } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { inputModeFor, pencilFocuses, pencilTapAction } from './keyboardPolicy'
import { nextTapCount, posNear, rangeForTaps } from './tapSelect'

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*', group: 'block' },
    text: {},
  },
})
const doc = schema.node('doc', null, [
  schema.node('paragraph', null, schema.text('Hello big world')),
  schema.node('paragraph', null, schema.text('Second line')),
])
const state = EditorState.create({ doc })

describe('tap counting', () => {
  it('counts taps at the same spot within 450 ms (real iPad timing)', () => {
    expect(nextTapCount(null, 1000, 10, 10)).toBe(1)
    const one = { at: 1000, x: 10, y: 10, count: 1 }
    expect(nextTapCount(one, 1200, 15, 14)).toBe(2)
    expect(nextTapCount({ ...one, count: 2 }, 1300, 12, 10)).toBe(3)
    expect(nextTapCount(one, 1440, 10, 10)).toBe(2) // 440 ms: still a tap pair
    expect(nextTapCount(one, 1460, 10, 10)).toBe(1) // too slow
    expect(nextTapCount(one, 1100, 40, 10)).toBe(1) // too far (12 px)
  })
})

describe('what a double, a triple and a quadruple tap select', () => {
  // "Hello big world" drawn on two rows: "Hello big " (positions 1 to 10,
  // y 0 to 20) and "world" (11 to 16, y 20 to 40); 10 px per character.
  const wrap = (pos: number) => pos <= 10
  const view = {
    state,
    nodeDOM: () => ({
      getBoundingClientRect: () => ({
        left: 0,
        right: 100,
        top: 0,
        bottom: 40,
      }),
    }),
    coordsAtPos: (pos: number, side = 1) => {
      const top = wrap(pos) && !(pos === 10 && side > 0) ? 0 : 20
      const left = top === 0 ? (pos - 1) * 10 : (pos - 11) * 10
      return { left, right: left, top, bottom: top + 20 }
    },
    posAtCoords: ({ left, top }: { left: number; top: number }) => {
      if (top < 20)
        return { pos: 1 + Math.min(9, Math.round(left / 10)), inside: 0 }
      return { pos: 11 + Math.min(5, Math.round(left / 10)), inside: 0 }
    },
  } as unknown as Parameters<typeof rangeForTaps>[0]
  it('double: the word', () => {
    // Position 8 is inside "big".
    expect(rangeForTaps(view, 8, 2)).toEqual([7, 10])
  })
  it('triple: the visual row on screen, not the whole paragraph', () => {
    expect(rangeForTaps(view, 8, 3, 10)).toEqual([1, 10])
    expect(rangeForTaps(view, 13, 3, 30)).toEqual([11, 16])
    // On the wrap itself, the tap's y says which row is meant.
    expect(rangeForTaps(view, 10, 3, 5)).toEqual([1, 10])
    expect(rangeForTaps(view, 10, 3, 35)).toEqual([11, 16])
  })
  it('triple without a measurable row, and quadruple: the whole block', () => {
    expect(rangeForTaps({ ...view, nodeDOM: () => null }, 8, 3, 10)).toEqual([
      1, 16,
    ])
    expect(rangeForTaps(view, 8, 4, 10)).toEqual([1, 16])
    expect(rangeForTaps(view, 20, 4)).toEqual([18, 29])
  })
})

describe('tolerant hit-testing', () => {
  const view = (hit: (x: number, y: number) => number | null) => ({
    state,
    posAtCoords: ({ left, top }: { left: number; top: number }) => {
      const pos = hit(left, top)
      return pos === null ? null : { pos, inside: -1 }
    },
  })
  it('uses the exact spot when it is text', () => {
    expect(
      posNear(
        view(() => 5),
        100,
        100,
      ),
    ).toBe(5)
  })
  it('falls back to the nearest text around a miss', () => {
    // Only the point 7 px above hits text.
    expect(
      posNear(
        view((_x, y) => (y === 93 ? 4 : null)),
        100,
        100,
        14,
      ),
    ).toBe(4)
  })
  it('gives up when there is no text near', () => {
    expect(
      posNear(
        view(() => null),
        100,
        100,
      ),
    ).toBeNull()
  })
})

describe('the keyboard policy', () => {
  it('a Pencil never asks for the keyboard; a finger does', () => {
    expect(inputModeFor('pen')).toBe('none')
    expect(inputModeFor('touch')).toBe('text')
  })
  it('only the Text tool lets the Pencil focus the page', () => {
    expect(pencilFocuses('text')).toBe(true)
    for (const tool of ['pen', 'highlighter', 'eraser', 'lasso', 'read']) {
      expect(pencilFocuses(tool)).toBe(false)
    }
  })
})

describe('edge autoscroll while selecting', () => {
  it('only within 40 px of the edge, and capped', async () => {
    const { edgeScroll, MAX_SCROLL_PX } = await import('./dragSelect')
    expect(edgeScroll(400, 100, 800)).toBe(0)
    expect(edgeScroll(150, 100, 800)).toBe(0)
    expect(edgeScroll(120, 100, 800)).toBeLessThan(0)
    expect(edgeScroll(790, 100, 800)).toBeGreaterThan(0)
    expect(edgeScroll(5000, 100, 800)).toBe(MAX_SCROLL_PX)
    expect(edgeScroll(-5000, 100, 800)).toBe(-MAX_SCROLL_PX)
  })
})

describe('the two-tap rule for the Pencil', () => {
  const base = {
    tapTwice: true,
    blockHasWords: true,
    activeId: null as string | null,
    blockId: 'a',
  }
  it('first tap activates a block with words, second places the caret', () => {
    expect(pencilTapAction(base)).toBe('activate')
    expect(pencilTapAction({ ...base, activeId: 'a' })).toBe('place')
    // A tap on another block moves the activation.
    expect(pencilTapAction({ ...base, activeId: 'b' })).toBe('activate')
  })
  it('an empty block, blank space or the setting off place the caret at once', () => {
    expect(pencilTapAction({ ...base, blockHasWords: false })).toBe('place')
    expect(pencilTapAction({ ...base, blockId: null })).toBe('place')
    expect(pencilTapAction({ ...base, tapTwice: false })).toBe('place')
  })
})
