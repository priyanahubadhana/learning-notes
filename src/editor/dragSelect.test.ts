/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { TextSelection } from 'prosemirror-state'
import { describe, expect, it } from 'vitest'
import {
  BlockRangeSelection,
  blockRange,
  markSelectedMedia,
  mediaIdsBetween,
  rangeHasMedia,
  selectBlocks,
} from './dragSelect'
import { schema } from './schema'

/** Text, a picture, text (with a nested child), and a picture at the end. */
function setup() {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [
      { id: 'a', type: 'paragraph', content: 'First line' },
      { id: 'img1', type: 'image', props: { url: 'lnimg:1', name: 'one.png' } },
      {
        id: 'b',
        type: 'paragraph',
        content: 'Second line',
        children: [{ id: 'kid', type: 'paragraph', content: 'Child' }],
      },
      { id: 'c', type: 'paragraph', content: 'Third line' },
      { id: 'img2', type: 'image', props: { url: 'lnimg:2', name: 'two.png' } },
    ],
  })
  editor.mount(document.createElement('div'))
  const ids = () => editor.document.map((b) => b.id)
  return { editor, ids, doc: () => editor.prosemirrorState.doc }
}

describe('selecting across pictures', () => {
  it('finds the whole blocks between two blocks, either way round', () => {
    const { doc } = setup()
    const down = blockRange(doc(), 'a', 'c')!
    const up = blockRange(doc(), 'c', 'a')!
    expect(down).toEqual(up)
    // From before "a" to after "c" (the child comes along with "b").
    expect(doc().textBetween(down.from, down.to, '|', '|')).toContain('Child')
    expect(blockRange(doc(), 'a', 'nope')).toBeNull()
  })

  it('a nested block widens to the blocks at the level both share', () => {
    const { doc } = setup()
    const range = blockRange(doc(), 'kid', 'c')!
    const text = doc().textBetween(range.from, range.to, '|', '|')
    // "b" and its child come along as one whole block, then "c".
    expect(text).toContain('Second line')
    expect(text).toContain('Child')
    expect(text).toContain('Third line')
  })

  it('knows which blocks in a range are pictures', () => {
    const { doc } = setup()
    expect(rangeHasMedia(doc(), 'a', 'b')).toBe(true) // img1 between
    expect(rangeHasMedia(doc(), 'b', 'c')).toBe(false)
    expect(rangeHasMedia(doc(), 'c', 'img2')).toBe(true) // ends on a picture
    expect(rangeHasMedia(doc(), 'img1', 'img1')).toBe(true) // starts on one
    const range = blockRange(doc(), 'a', 'img2')!
    expect(mediaIdsBetween(doc(), range.from, range.to)).toEqual([
      'img1',
      'img2',
    ])
  })

  it('selects whole blocks, pictures included, from a picture to text', () => {
    const { editor, doc } = setup()
    expect(selectBlocks(editor, 'img1', 'c')).toBe(true)
    const sel = editor.prosemirrorState.selection
    expect(sel).toBeInstanceOf(BlockRangeSelection)
    const range = blockRange(doc(), 'img1', 'c')!
    expect([sel.from, sel.to]).toEqual([range.from, range.to])
  })

  it('Delete removes the whole selected range, picture included', () => {
    const { editor, ids } = setup()
    selectBlocks(editor, 'img1', 'c')
    const view = editor.prosemirrorView
    view.dispatch(view.state.tr.deleteSelection())
    const left = ids()
    expect(left).not.toContain('img1')
    expect(left).not.toContain('b')
    expect(left).not.toContain('c')
    expect(left).toContain('a')
    expect(left).toContain('img2')
  })

  it('Copy takes the whole range: the slice holds the picture and the text', () => {
    const { editor } = setup()
    selectBlocks(editor, 'a', 'b')
    const slice = editor.prosemirrorState.selection.content()
    let types = ''
    slice.content.descendants((node) => {
      types += node.type.name + ' '
    })
    expect(types).toContain('image')
    expect(
      slice.content.textBetween(0, slice.content.size, '|', '|'),
    ).toContain('Second line')
  })

  it('marks the pictures inside any selection, and clears the marks', () => {
    const { editor, doc } = setup()
    const view = editor.prosemirrorView
    // An ordinary text selection from "First line" to "Second line".
    const from = 2
    const to = doc().content.size - 2
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(doc(), from, to)),
    )
    markSelectedMedia(editor)
    const marked = [
      ...editor.domElement!.querySelectorAll('[data-ln-selected]'),
    ]
    expect(marked.map((el) => el.getAttribute('data-id'))).toEqual([
      'img1',
      'img2',
    ])
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc(), 2)))
    markSelectedMedia(editor)
    expect(
      editor.domElement!.querySelectorAll('[data-ln-selected]'),
    ).toHaveLength(0)
  })

  it('the selection survives serialising and has no cursor of its own', () => {
    const { editor } = setup()
    selectBlocks(editor, 'a', 'img1')
    const sel = editor.prosemirrorState.selection
    expect(sel.visible).toBe(false)
    const back = BlockRangeSelection.fromJSON(
      editor.prosemirrorState.doc,
      sel.toJSON(),
    )
    expect(back.eq(sel)).toBe(true)
  })
})
