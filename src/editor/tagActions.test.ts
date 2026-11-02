/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../core/testing'
import { findOrCreateTagPath, listTags } from '../tags/tagService'
import { editorToDrafts, inlineTagIds, toPlainText } from './mapping'
import { schema } from './schema'
import {
  insertTag,
  tagFromTyped,
  tagMenuItems,
  tagMenuShouldOpen,
} from './tagActions'

/** A real editor with one block of `text`, the cursor at its end. */
function setup(text: string, type: 'paragraph' | 'codeBlock' = 'paragraph') {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [{ id: 'b', type, content: text }],
  })
  editor.mount(document.createElement('div'))
  editor.setTextCursorPosition('b', 'end')
  return editor
}

const opens = (text: string, type?: 'paragraph' | 'codeBlock') =>
  tagMenuShouldOpen(setup(text, type).prosemirrorState.tr)

describe('# tag menu', () => {
  it('opens at a line start or after a space, never inside a word or code', () => {
    expect(opens('')).toBe(true)
    expect(opens('S1 is loud ')).toBe(true)
    expect(opens('C')).toBe(false) // "C#" stays text
    expect(opens('x ', 'codeBlock')).toBe(false)
  })

  it('picking inserts a tag chip and a space; the tag adds no text', () => {
    const editor = setup('Mitral ')
    insertTag(editor, { tagId: 't1', label: 'hy' })
    const [draft] = editorToDrafts(editor.document)
    expect(inlineTagIds(draft)).toEqual(['t1'])
    expect(toPlainText(draft.content)).toBe('Mitral  ')
  })
})

describe('typing faster than the # menu', () => {
  const db = createTestDb()
  afterEach(async () => {
    await db.tags.clear()
  })
  /** An editor whose menu says `typed` is what is typed now. */
  const typing = (typed: string) => {
    const editor = setup('')
    vi.spyOn(editor, 'getExtension').mockReturnValue({
      store: { state: { query: typed } },
    } as never)
    return editor
  }
  const tagsIn = (editor: ReturnType<typeof setup>) =>
    inlineTagIds(editorToDrafts(editor.document)[0])
  const names = async () => (await listTags(db)).map((tag) => tag.name)

  it('Enter on an old list makes the tag from what was typed', async () => {
    const editor = typing('exam')
    const [create] = await tagMenuItems(db, editor, 'exa', () => {})
    create.onItemClick()
    await vi.waitFor(async () => expect(tagsIn(editor)).toHaveLength(1))
    expect(await names()).toEqual(['exam'])
  })

  it('uses a tag that already has the typed name', async () => {
    const tag = await findOrCreateTagPath(db, 'Exam')
    const editor = setup('')
    await tagFromTyped(db, editor, 'exam')
    expect(tagsIn(editor)).toEqual([tag.id])
    expect(await names()).toEqual(['Exam'])
  })

  it('puts back text that cannot be a tag', async () => {
    const editor = setup('')
    await tagFromTyped(db, editor, '123')
    expect(toPlainText(editorToDrafts(editor.document)[0].content)).toBe('#123')
    expect(await names()).toEqual([])
  })

  it('a list that is up to date picks the chosen item', async () => {
    const other = await findOrCreateTagPath(db, 'examples')
    const editor = typing('exa')
    const [first] = await tagMenuItems(db, editor, 'exa', () => {})
    first.onItemClick()
    expect(tagsIn(editor)).toEqual([other.id])
  })
})
