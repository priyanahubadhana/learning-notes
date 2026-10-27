/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core'
import { describe, expect, it, vi } from 'vitest'
import { cardSlashItem, makeCard } from './cardActions'
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
      onLinkPage: vi.fn(),
      onInsertTemplate: vi.fn(),
      onInsertDatabase: vi.fn(),
    })
    filterSuggestionItems(items, 'flashcard')[0].onItemClick()
    const card = editor.document.find((b) => b.type === 'card')!
    expect(card).toBeDefined()
    expect(card.children).toHaveLength(1)
  })
})

describe('"/card" inside a card\'s answer', () => {
  function cardEditor() {
    const editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        {
          id: 'outer',
          type: 'card',
          content: 'Outer question',
          children: [
            { id: 'ans', type: 'paragraph', content: 'Answer' },
            { id: 'line', type: 'paragraph' },
          ],
        },
        { id: 'after', type: 'paragraph', content: 'Later text' },
      ],
    })
    editor.mount(document.createElement('div'))
    return editor
  }
  const run = (
    editor: ReturnType<typeof cardEditor>,
    place: 'inside' | 'nextLine' | null,
  ) => {
    const ask = vi.fn(async () => place)
    const item = cardSlashItem(editor, ask)
    item.onItemClick()
    return ask
  }

  it('next line: the new card goes right after the outer card', async () => {
    const editor = cardEditor()
    editor.setTextCursorPosition('line')
    const ask = run(editor, 'nextLine')
    await vi.waitFor(() => expect(editor.document).toHaveLength(3))
    expect(ask).toHaveBeenCalledOnce()
    const [outer, created, after] = editor.document
    expect(outer.id).toBe('outer')
    expect(outer.children.map((c) => c.id)).toEqual(['ans']) // empty line gone
    expect(created.type).toBe('card')
    expect(after.id).toBe('after')
    expect(editor.getTextCursorPosition().block.id).toBe(created.id)
  })

  it('inside: the new card is nested in the answer', async () => {
    const editor = cardEditor()
    editor.setTextCursorPosition('line')
    run(editor, 'inside')
    await vi.waitFor(() =>
      expect(
        editor.getBlock('outer')!.children.some((c) => c.type === 'card'),
      ).toBe(true),
    )
  })

  it('cancel adds nothing; outside a card it does not ask', async () => {
    const editor = cardEditor()
    editor.setTextCursorPosition('line')
    run(editor, null)
    await new Promise((r) => setTimeout(r, 0))
    expect(editor.document).toHaveLength(2)
    expect(editor.getBlock('outer')!.children).toHaveLength(2)

    editor.setTextCursorPosition('after')
    const ask = run(editor, 'inside')
    expect(ask).not.toHaveBeenCalled()
  })
})
