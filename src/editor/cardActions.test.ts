/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core'
import { describe, expect, it, vi } from 'vitest'
import { makeCard } from './cardActions'
import { editorToDrafts, toPlainText } from './mapping'
import { schema } from './schema'
import { buildSlashMenuItems } from './slashMenu'

function setup() {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [
      { id: 'p', type: 'paragraph', content: 'S1 is the first heart sound' },
      {
        id: 'b',
        type: 'bulletListItem',
        content: 'S2',
        children: [
          { id: 'kid', type: 'paragraph', content: 'Aortic + pulmonary' },
        ],
      },
      { id: 'code', type: 'codeBlock', content: 'x = 1' },
    ],
  })
  editor.mount(document.createElement('div'))
  return editor
}

describe('Make card', () => {
  it('turns a paragraph into a card with its text as the question', () => {
    const editor = setup()
    expect(makeCard(editor, editor.getBlock('p')!)).toBe(true)
    const card = editor.getBlock('p')!
    expect(card.type).toBe('card')
    expect(card.children).toHaveLength(1) // empty answer line
    expect(editor.getTextCursorPosition().block.id).toBe(card.children[0].id)

    // Saved as normal records: question in content.text, answer as a child.
    const drafts = editorToDrafts(editor.document)
    const saved = drafts.find((d) => d.id === 'p')!
    expect(toPlainText(saved.content)).toBe('S1 is the first heart sound')
    expect(drafts.some((d) => d.parentId === 'p')).toBe(true)
  })

  it('keeps nested blocks as the answer', () => {
    const editor = setup()
    makeCard(editor, editor.getBlock('b')!)
    const card = editor.getBlock('b')!
    expect(card.type).toBe('card')
    expect(card.children.map((c) => c.id)).toEqual(['kid'])
  })

  it('refuses blocks without text (e.g. code)', () => {
    const editor = setup()
    expect(makeCard(editor, editor.getBlock('code')!)).toBe(false)
    expect(editor.getBlock('code')!.type).toBe('codeBlock')
  })

  it('Undo restores the original block in one step', () => {
    const editor = setup()
    makeCard(editor, editor.getBlock('p')!)
    editor.undo()
    const block = editor.getBlock('p')!
    expect(block.type).toBe('paragraph')
    expect(block.children).toHaveLength(0)
    expect(editor.document).toHaveLength(3)
  })

  it('"/ Card" inserts an empty card with an answer line', () => {
    const editor = setup()
    editor.setTextCursorPosition('p', 'end')
    const items = buildSlashMenuItems(editor, {
      onNewSubPage: vi.fn(),
      onInsertTemplate: vi.fn(),
    })
    filterSuggestionItems(items, 'flashcard')[0].onItemClick()
    const card = editor.document.find((b) => b.type === 'card')!
    expect(card).toBeDefined()
    expect(card.children).toHaveLength(1)
  })
})
