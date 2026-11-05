// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Schema } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { refuseDelete, refuseInput, refuseTransaction } from './penGuard'

const idle = { down: false, upAt: -1e9 }

describe('refuseDelete', () => {
  it('refuses a delete while the pen is down', () => {
    expect(
      refuseDelete('deleteContentBackward', 1000, { ...idle, down: true }, 0),
    ).toBe(true)
  })
  it('refuses it for 500 ms after the pen lifts, not after', () => {
    const pen = { down: false, upAt: 1000 }
    expect(refuseDelete('deleteByDrag', 1400, pen, 0)).toBe(true)
    expect(refuseDelete('deleteByDrag', 1500, pen, 0)).toBe(false)
  })
  it('lets a real key press through', () => {
    expect(
      refuseDelete('deleteContentBackward', 1000, { ...idle, down: true }, 800),
    ).toBe(false)
  })
  it('never refuses typing or a delete with no pen', () => {
    expect(refuseDelete('insertText', 1000, { ...idle, down: true }, 0)).toBe(
      false,
    )
    expect(refuseDelete('deleteContent', 1000, idle, 0)).toBe(false)
  })
})

describe('refuseInput (Scribble writing)', () => {
  const down = { ...idle, down: true }
  it('refuses handwriting and replacements while the pen is busy', () => {
    for (const type of [
      'insertText',
      'insertReplacementText',
      'insertCompositionText',
      'insertFromComposition',
    ]) {
      expect(refuseInput(type, 1000, down, 0, false)).toBe(true)
    }
  })
  it('lets handwriting and small deletes through when Scribble is free', () => {
    expect(refuseInput('insertReplacementText', 1000, down, 0, true)).toBe(
      false,
    )
    expect(refuseInput('deleteContentBackward', 1000, down, 0, true)).toBe(
      false,
    )
  })
  it('lets typed keys through', () => {
    expect(refuseInput('insertText', 1000, down, 900, false)).toBe(false)
  })
})

describe('refuseTransaction', () => {
  const schema = new Schema({
    nodes: {
      doc: { content: 'paragraph+' },
      paragraph: { content: 'text*' },
      text: {},
    },
  })
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, schema.text('Hello world')),
  ])
  const fresh = () => EditorState.create({ doc }).tr
  const remove = (meta?: string) => {
    const tr = fresh().delete(1, 6)
    if (meta) tr.setMeta(meta, {})
    return tr
  }
  const insert = () => fresh().insertText('x', 3)
  const pen = { down: true, upAt: -1e9, lastKeyAt: -1e9 }

  it('rejects a delete or replace during a pen gesture', () => {
    expect(refuseTransaction(remove(), 1000, pen, false)).toBe(true)
  })
  it('rejects it for 500 ms after the pen lifts', () => {
    const up = { down: false, upAt: 1000, lastKeyAt: -1e9 }
    expect(refuseTransaction(remove(), 1400, up, false)).toBe(true)
    expect(refuseTransaction(remove(), 1500, up, false)).toBe(false)
  })
  it('allows typing in, undo and keys', () => {
    expect(refuseTransaction(insert(), 1000, pen, false)).toBe(false)
    expect(refuseTransaction(remove('history$'), 1000, pen, false)).toBe(false)
    expect(
      refuseTransaction(remove(), 1000, { ...pen, lastKeyAt: 800 }, false),
    ).toBe(false)
  })
  it('Scribble free: a small scratch-out is allowed, a big one is refused', () => {
    expect(refuseTransaction(remove(), 1000, pen, true)).toBe(false)
    const big = schema.node('doc', null, [
      schema.node('paragraph', null, schema.text('x'.repeat(40))),
    ])
    const tr = EditorState.create({ doc: big }).tr.delete(1, 31)
    expect(refuseTransaction(tr, 1000, pen, true)).toBe(true)
    expect(refuseTransaction(tr, 1000, { ...pen, lastKeyAt: 800 }, true)).toBe(
      false,
    )
  })
  it('allows deletes with no pen', () => {
    expect(
      refuseTransaction(
        remove(),
        1000,
        { down: false, upAt: -1e9, lastKeyAt: -1e9 },
        false,
      ),
    ).toBe(false)
  })
})
