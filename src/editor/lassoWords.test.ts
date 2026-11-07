import { describe, expect, it } from 'vitest'
import { Schema } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { wordRanges, wordsInRegion } from './lassoWords'

const schema = new Schema({
  nodes: {
    doc: { content: 'blockContainer+' },
    blockContainer: { content: 'paragraph', attrs: { id: { default: '' } } },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    mention: { group: 'inline', inline: true, atom: true },
  },
  marks: { bold: {} },
})
const para = (id: string, ...inline: ReturnType<typeof schema.text>[]) =>
  schema.node('blockContainer', { id }, [
    schema.node('paragraph', null, inline),
  ])

describe('wordRanges', () => {
  it('finds words across marks, splits on an inline atom', () => {
    const p = schema.node('paragraph', null, [
      schema.text('in '),
      schema.text('Cla', [schema.mark('bold')]),
      schema.text('ude, it’s'),
      schema.node('mention'),
      schema.text('x'),
    ])
    // Block at pos 0: content starts at 1.
    expect(wordRanges(p, 0)).toEqual([
      [1, 3], // "in"
      [4, 10], // "Claude" across the bold mark
      [12, 16], // "it’s"
      [17, 18], // "x" after the mention (position 16)
    ])
  })
})

describe('wordsInRegion', () => {
  // Two paragraphs, 10 px per character, each on one row.
  const doc = schema.node('doc', null, [
    para('a', schema.text('The nucleus holds')),
    para('b', schema.text('the DNA')),
  ])
  const state = EditorState.create({ doc })
  const rowOf = (pos: number) => (pos < 21 ? 0 : 1)
  const view = {
    state,
    nodeDOM: (pos: number) => ({
      getBoundingClientRect: () =>
        pos < 21
          ? { left: 0, right: 170, top: 0, bottom: 20 }
          : { left: 0, right: 70, top: 20, bottom: 40 },
    }),
    coordsAtPos: (pos: number) => {
      const row = rowOf(pos)
      const left = (row === 0 ? pos - 2 : pos - 23) * 10
      return { left, right: left, top: row * 20, bottom: row * 20 + 20 }
    },
  } as unknown as Parameters<typeof wordsInRegion>[0]
  const boxInside =
    (b: { x: number; y: number; w: number; h: number }) =>
    (x: number, y: number) =>
      x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h

  it('selects the words whose centre is inside, first to last, across lines', () => {
    // "nucleus holds" on row 1: x 40..170, y 5..20.
    const box = { x: 40, y: 5, w: 130, h: 15 }
    expect(wordsInRegion(view, boxInside(box), box)).toEqual({
      from: 6,
      to: 19,
      blocks: ['a'],
      full: [],
    })
    const both = { x: 40, y: 5, w: 130, h: 30 }
    expect(wordsInRegion(view, boxInside(both), both)).toEqual({
      from: 6,
      to: 30, // ...and "DNA" on row 2 ("the" sits left of the loop)
      blocks: ['a', 'b'],
      full: [],
    })
  })
  it('a line whose every word is inside is reported as taken in whole', () => {
    const box = { x: 0, y: 20, w: 70, h: 20 }
    expect(wordsInRegion(view, boxInside(box), box)).toEqual({
      from: 23,
      to: 30,
      blocks: ['b'],
      full: ['b'],
    })
  })
  it('a loop around nothing, or only half a word, finds nothing', () => {
    const box = { x: 100, y: 5, w: 10, h: 10 }
    expect(wordsInRegion(view, boxInside(box), box)).toBeNull()
  })
})
