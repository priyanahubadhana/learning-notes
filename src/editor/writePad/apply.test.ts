/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { TextSelection } from 'prosemirror-state'
import { describe, expect, it } from 'vitest'
import { schema } from '../schema'
import { applyPad, type PadLook } from './apply'
import { currentRange } from './padState'
import { decodeHand, encodeHand } from './handStyle'

const PLAIN: PadLook = {
  font: 'app',
  weight: 'normal',
  size: 100,
  color: 'default',
  highlight: 'default',
}

function setup(text = 'Hello big world') {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [{ id: 'p', type: 'paragraph', content: text }],
  })
  editor.mount(document.createElement('div'))
  return editor
}

/** Selects the first occurrence of `text` (or puts the cursor after it). */
function select(
  editor: ReturnType<typeof setup>,
  text: string,
  collapse = false,
) {
  editor.transact((tr) => {
    let start = -1
    tr.doc.descendants((node, pos) => {
      if (start < 0 && node.isText && node.text!.includes(text)) {
        start = pos + node.text!.indexOf(text)
      }
    })
    const from = collapse ? start + text.length : start
    tr.setSelection(TextSelection.create(tr.doc, from, start + text.length))
  })
}

const textOf = (editor: ReturnType<typeof setup>) =>
  (editor.document[0].content as { text: string }[]).map((r) => r.text).join('')

describe('Write pad apply', () => {
  it('inserts at the saved cursor with the look as marks', () => {
    const editor = setup()
    select(editor, 'Hello', true)
    const saved = currentRange(editor)
    applyPad(
      editor,
      ' NEW',
      { ...PLAIN, font: 'caveat', weight: 'bold', size: 125, color: 'red' },
      'insert',
      saved,
    )
    expect(textOf(editor)).toBe('Hello NEW big world')
    const run = (
      editor.document[0].content as {
        text: string
        styles: Record<string, string>
      }[]
    ).find((r) => r.text === ' NEW')!
    expect(run.styles.hand).toBe('caveat.bold.125')
    expect(run.styles.textColor).toBe('red')
  })

  it('replaces the saved selection even after the editor selection moved', () => {
    const editor = setup()
    select(editor, 'big')
    const saved = currentRange(editor)
    select(editor, 'world', true) // focus moved to the pad, cursor elsewhere
    applyPad(editor, 'small', PLAIN, 'replace', saved)
    expect(textOf(editor)).toBe('Hello small world')
  })

  it('Insert is one undo step; Replace is one undo step', () => {
    const editor = setup()
    select(editor, 'Hello', true)
    const saved = currentRange(editor)
    applyPad(editor, ' one\ntwo', PLAIN, 'insert', saved)
    editor.undo()
    expect(textOf(editor)).toBe('Hello big world')

    select(editor, 'big')
    const sel = currentRange(editor)
    applyPad(editor, 'tiny', { ...PLAIN, highlight: 'yellow' }, 'replace', sel)
    expect(textOf(editor)).toBe('Hello tiny world')
    editor.undo()
    expect(textOf(editor)).toBe('Hello big world')
  })

  it('leaves the cursor after the new text, for the next piece', () => {
    const editor = setup('ab')
    const first = applyPad(editor, 'X', PLAIN, 'insert', { from: 1, to: 1 })
    const second = applyPad(editor, 'Y', PLAIN, 'insert', {
      from: first!,
      to: first!,
    })
    expect(second).toBeGreaterThan(first!)
    expect(textOf(editor)).toBe('XYab')
  })

  it('does nothing for empty text and clamps stale positions', () => {
    const editor = setup('ab')
    expect(applyPad(editor, '', PLAIN, 'insert', { from: 1, to: 1 })).toBeNull()
    applyPad(editor, 'Z', PLAIN, 'insert', { from: 999, to: 999 })
    expect(textOf(editor)).toContain('Z')
  })

  it('encodes and decodes the hand look', () => {
    const look = { font: 'kalam', weight: 'light', size: 150 } as const
    expect(decodeHand(encodeHand(look))).toEqual(look)
    expect(decodeHand('nope.bold.100')).toBeNull()
  })
})
