import { describe, expect, it } from 'vitest'
import { Schema } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { wordRanges, wordsInRegion } from './lassoWords'

/**
 * Part A0 (Lasso freeze), LS-13: the words of S2 and S3 in docs/features/lasso.md,
 * "Service 23-11 2000 rate-is". A word is taken when its middle is inside the
 * loop; digits and the usual joins (-) keep one word together.
 */
const schema = new Schema({
  nodes: {
    doc: { content: 'blockContainer+' },
    blockContainer: { content: 'paragraph', attrs: { id: { default: '' } } },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
  },
})
const TEXT = 'Service 23-11 2000 rate-is'
const doc = schema.node('doc', null, [
  schema.node('blockContainer', { id: 'a' }, [
    schema.node('paragraph', null, [schema.text(TEXT)]),
  ]),
])
// Ten px per character on one row: character i spans x (i * 10) to (i * 10 + 10).
const view = {
  state: EditorState.create({ doc }),
  nodeDOM: () => ({
    getBoundingClientRect: () => ({ left: 0, right: 260, top: 0, bottom: 20 }),
  }),
  coordsAtPos: (pos: number) => ({
    left: (pos - 2) * 10,
    right: (pos - 2) * 10,
    top: 0,
    bottom: 20,
  }),
} as unknown as Parameters<typeof wordsInRegion>[0]
/** The loop: x from a to b on the one row (the box handed over is the whole row). */
const between = (a: number, b: number) => (x: number) => x >= a && x <= b
const ROW = { x: 0, y: 0, w: 260, h: 20 }
const at = (word: string) => TEXT.indexOf(word) + 1 // paragraph at 0: text starts at 1
/*
 * In the whole document the paragraph sits inside a container, so its text
 * starts at 2.
 */
const inDoc = (word: string) => TEXT.indexOf(word) + 2

describe('LS-13 the words of "Service 23-11 2000 rate-is"', () => {
  it('splits into four words; 23-11 and rate-is stay whole', () => {
    expect(wordRanges(doc.firstChild!.firstChild!, 0)).toEqual([
      [at('Service'), at('Service') + 7],
      [at('23-11'), at('23-11') + 5],
      [at('2000'), at('2000') + 4],
      [at('rate-is'), at('rate-is') + 7],
    ])
  })

  it('a loop round "2000 rate-is" takes exactly those two words (S3)', () => {
    const left = (inDoc('2000') - 2) * 10 - 14
    expect(wordsInRegion(view, between(left, left + 150), ROW)).toEqual({
      from: inDoc('2000'),
      to: inDoc('rate-is') + 7,
      blocks: ['a'],
      full: [],
    })
  })

  it('the middle decides: a loop that ends just before the middle of a word leaves it out', () => {
    const middle = (inDoc('rate-is') - 2 + 3.5) * 10 // the middle of "rate-is"
    expect(wordsInRegion(view, between(0, middle - 1), ROW)?.to).toBe(
      inDoc('2000') + 4,
    )
    expect(wordsInRegion(view, between(0, middle + 1), ROW)?.to).toBe(
      inDoc('rate-is') + 7,
    )
  })

  it('every word inside: the line counts as taken whole', () => {
    expect(wordsInRegion(view, between(0, 260), ROW)?.full).toEqual(['a'])
  })
})
