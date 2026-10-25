/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { TextSelection } from 'prosemirror-state'
import { describe, expect, it } from 'vitest'
import { cardParts } from '../recall/cardService'
import { snapToWords, toggleBlank } from './blankActions'
import { blankIds, editorToDrafts, toPlainText } from './mapping'
import { schema } from './schema'

describe('snapToWords', () => {
  const snap = (text: string, part: string) => {
    const from = text.indexOf(part)
    const [a, b] = snapToWords(text, from, from + part.length)
    return text.slice(a, b)
  }

  it('widens a selection to whole words', () => {
    expect(snap('the start of S1', 'rt o')).toBe('start of')
    expect(snap('the start of S1', 'tart')).toBe('start')
  })

  it('drops spaces and punctuation at the edges', () => {
    expect(snap('closes (mitral) valve', ' (mitral) ')).toBe('mitral')
  })

  it('returns nothing when no word is selected', () => {
    expect(snapToWords('a , b', 1, 4)[0]).toBe(snapToWords('a , b', 1, 4)[1])
  })

  it('works with accents, other scripts and emoji', () => {
    expect(snap('le cœur bat', 'œu')).toBe('cœur')
    expect(snap('القلب ينبض', 'لقل')).toBe('القلب')
    expect(snap('🫀 heart', 'ear')).toBe('heart')
  })
})

function setup() {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [
      {
        id: 'p',
        type: 'paragraph',
        content: 'S2 closes the aortic and pulmonary valves',
      },
      { id: 'q', type: 'paragraph', content: 'Second line' },
    ],
  })
  editor.mount(document.createElement('div'))
  return editor
}

/** Selects the first occurrence of `text` in the document. */
function select(editor: ReturnType<typeof setup>, text: string) {
  editor.transact((tr) => {
    let found = -1
    tr.doc.descendants((node, pos) => {
      if (found < 0 && node.isText && node.text!.includes(text)) {
        found = pos + node.text!.indexOf(text)
      }
    })
    if (found < 0) throw new Error(`not found: ${text}`)
    tr.setSelection(TextSelection.create(tr.doc, found, found + text.length))
  })
}

const blanksOf = (editor: ReturnType<typeof setup>, id = 'p') =>
  blankIds(editorToDrafts(editor.document).find((d) => d.id === id)!.content)

describe('toggleBlank', () => {
  it('marks whole words as a blank and keeps the text', () => {
    const editor = setup()
    select(editor, 'rtic and pulmon')
    expect(toggleBlank(editor)).toBe('added')
    const draft = editorToDrafts(editor.document).find((d) => d.id === 'p')!
    expect(toPlainText(draft.content)).toBe(
      'S2 closes the aortic and pulmonary valves',
    )
    const runs = draft.content.text as { text: string; styles: object }[]
    expect(runs.find((r) => 'blank' in r.styles)?.text).toBe(
      'aortic and pulmonary',
    )
  })

  it('gives each blank its own id, so each becomes a card', () => {
    const editor = setup()
    select(editor, 'aortic')
    toggleBlank(editor)
    select(editor, 'valves')
    toggleBlank(editor)
    const ids = blanksOf(editor)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    const draft = editorToDrafts(editor.document).find((d) => d.id === 'p')!
    expect(cardParts({ type: draft.type, content: draft.content })).toEqual(ids)
  })

  it('removes a blank when used on it again', () => {
    const editor = setup()
    select(editor, 'aortic and')
    toggleBlank(editor)
    select(editor, 'ortic')
    expect(toggleBlank(editor)).toBe('removed')
    expect(blanksOf(editor)).toEqual([])
  })

  it('Undo removes a new blank in one step', () => {
    const editor = setup()
    select(editor, 'aortic')
    toggleBlank(editor)
    editor.undo()
    expect(blanksOf(editor)).toEqual([])
  })

  it('does nothing for a selection across blocks', () => {
    const editor = setup()
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, 5, tr.doc.content.size - 5)),
    )
    expect(toggleBlank(editor)).toBe(false)
  })
})
