import { Schema } from 'prosemirror-model'
import { EditorState, TextSelection } from 'prosemirror-state'
import { describe, expect, it } from 'vitest'
import {
  INTENT_MS,
  recentIntent,
  selectionDecorations,
  wouldLoseSelection,
} from './ownSelection'

const schema = new Schema({
  nodes: {
    doc: { content: 'blockContainer+' },
    blockContainer: { content: 'paragraph' },
    paragraph: { content: 'text*', toDOM: () => ['p', 0] },
    text: {},
  },
})
const doc = schema.node('doc', null, [
  schema.node('blockContainer', null, [
    schema.node('paragraph', null, [schema.text('hello world')]),
  ]),
])

function stateWith(from: number, to: number) {
  const base = EditorState.create({ doc, schema })
  return base.apply(
    base.tr.setSelection(TextSelection.create(base.doc, from, to)),
  )
}

describe('own selection', () => {
  it('draws a highlight for a text selection and nothing for a caret', () => {
    expect(selectionDecorations(stateWith(3, 8)).find()).toHaveLength(1)
    expect(selectionDecorations(stateWith(3, 3)).find()).toHaveLength(0)
  })

  it('treats input within 0.7 s, or a pointer held down, as the person', () => {
    expect(recentIntent(1000, 1000 - INTENT_MS + 1, false)).toBe(true)
    expect(recentIntent(1000, 1000 - INTENT_MS - 1, false)).toBe(false)
    expect(recentIntent(5000, 0, true)).toBe(true)
  })

  it('a kept selection (a Pencil double tap) ignores recent input until the keep ends', () => {
    // The tap's own late click arrives 100 ms after the selection (R6-18).
    expect(recentIntent(1100, 1000, false, 1000 + 1500)).toBe(false)
    expect(recentIntent(2600, 2500, false, 1000 + 1500)).toBe(true)
    // A new pointerdown clears the keep (the plugin resets it to the past).
    expect(recentIntent(1100, 1000, true, -1e9)).toBe(true)
  })

  it('puts back a selection that collapses by itself, but not one the person ended', () => {
    const before = stateWith(3, 8)
    const collapse = before.tr.setSelection(TextSelection.create(doc, 8, 8))
    const after = before.apply(collapse)
    expect(wouldLoseSelection(before, collapse, after, false)).toBe(true)
    // The person tapped: allowed.
    expect(wouldLoseSelection(before, collapse, after, true)).toBe(false)
    // A change to the text (Delete, Cut) is the person's action too.
    const edit = before.tr.delete(3, 8)
    expect(wouldLoseSelection(before, edit, before.apply(edit), false)).toBe(
      false,
    )
  })
})
