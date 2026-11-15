// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { indexLetters, mergeSpans, spansUnder } from './eraseText'

/** A fake layout: every letter is 10 px wide and 20 px tall, left to right from x = 0. */
let rectCalls = 0
const SPACE_AT = new Set<number>()

beforeEach(() => {
  rectCalls = 0
  SPACE_AT.clear()
  const rect = (l: number, w: number) => ({
    left: l,
    top: 0,
    right: l + w,
    bottom: 20,
    width: w,
    height: 20,
  })
  Range.prototype.getBoundingClientRect = function () {
    return rect(0, 1000) as DOMRect
  }
  Range.prototype.getClientRects = function () {
    rectCalls++
    const i = this.startOffset
    if (SPACE_AT.has(i)) return [] as unknown as DOMRectList
    return [rect(i * 10, 10)] as unknown as DOMRectList
  }
})
afterEach(() => vi.restoreAllMocks())

function page(text: string) {
  const root = document.createElement('div')
  root.innerHTML = `<span data-style-type="backgroundColor">${text}</span>`
  document.body.append(root)
  return root
}
const view = { posAtDOM: (_n: Node, o: number) => 100 + o }

describe('word eraser (2A.8, T10)', () => {
  it('measures every letter once, whatever the number of moves', () => {
    const root = page('Claude by hand')
    const letters = indexLetters(root, { left: 0, top: 0 }, view, true)
    const after = rectCalls
    expect(after).toBe('Claude by hand'.length)
    const taken = new Set<number>()
    for (let x = 0; x < 140; x += 5)
      spansUnder(
        letters,
        taken,
        [
          { x, y: 10 },
          { x: x + 5, y: 10 },
        ],
        6,
      )
    expect(rectCalls).toBe(after)
  })

  it('a sweep takes whole words and the spaces between them, no gaps', () => {
    const root = page('Claude by hand')
    const letters = indexLetters(root, { left: 0, top: 0 }, view, true)
    const taken = new Set<number>()
    const spans = []
    for (let x = 0; x < 140; x += 7)
      spans.push(
        ...spansUnder(
          letters,
          taken,
          [
            { x, y: 10 },
            { x: x + 7, y: 10 },
          ],
          4,
        ),
      )
    expect(mergeSpans(spans)).toEqual([{ from: 100, to: 114 }])
  })

  it('a letter the browser cannot measure goes with its neighbour (no "Claud e")', () => {
    SPACE_AT.add(5)
    const root = page('Claude by')
    const letters = indexLetters(root, { left: 0, top: 0 }, view, true)
    expect(letters[5]!.blind).toBe(true)
    const taken = new Set<number>()
    const spans = spansUnder(
      letters,
      taken,
      [
        { x: 0, y: 10 },
        { x: 90, y: 10 },
      ],
      4,
    )
    expect(spans).toEqual([{ from: 100, to: 109 }])
  })

  it('a touched letter takes its whole word, never a cut word', () => {
    const root = page('Claude by hand')
    const letters = indexLetters(root, { left: 0, top: 0 }, view, true)
    // Only the letters "au" of Claude (x 25 to 45) are under the path.
    const spans = spansUnder(
      letters,
      new Set<number>(),
      [
        { x: 28, y: 10 },
        { x: 42, y: 10 },
      ],
      2,
    )
    expect(spans).toEqual([{ from: 100, to: 106 }])
  })

  it('two touched words take the space between them', () => {
    const root = page('Claude by hand')
    const letters = indexLetters(root, { left: 0, top: 0 }, view, true)
    const spans = spansUnder(
      letters,
      new Set<number>(),
      [
        { x: 55, y: 10 },
        { x: 75, y: 10 },
      ],
      2,
    )
    // The "e" and the "b" are touched: Claude, the space and by go; hand stays.
    expect(spans).toEqual([{ from: 100, to: 109 }])
  })

  it('highlights only measures just the highlighted words', () => {
    const root = document.createElement('div')
    root.innerHTML =
      'plain <span data-style-type="backgroundColor">marked</span>'
    document.body.append(root)
    const letters = indexLetters(root, { left: 0, top: 0 }, view, true)
    expect(letters).toHaveLength('marked'.length)
    const all = indexLetters(root, { left: 0, top: 0 }, view, false)
    expect(all).toHaveLength('plain marked'.length)
  })
})
