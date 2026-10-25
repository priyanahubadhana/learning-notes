/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core'
import { describe, expect, it, vi } from 'vitest'
import { buildSlashMenuItems } from './slashMenu'
import { schema } from './schema'

function setup() {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [{ id: 'p', type: 'paragraph' }],
  })
  editor.mount(document.createElement('div'))
  editor.setTextCursorPosition('p', 'start')
  const onNewSubPage = vi.fn()
  const items = buildSlashMenuItems(editor, onNewSubPage)
  const search = (query: string) =>
    filterSuggestionItems(items, query).map((i) => i.title)
  return { editor, items, search, onNewSubPage }
}

describe('slash menu', () => {
  it('finds the checklist when typing "todo"', () => {
    expect(setup().search('todo')[0]).toBe('Check List')
  })

  it('offers Callout (after Quote) and New sub-page (last)', () => {
    const { items, search } = setup()
    const titles = items.map((i) => i.title)
    expect(titles.indexOf('Callout')).toBe(titles.indexOf('Quote') + 1)
    expect(titles.at(-1)).toBe('New sub-page')
    expect(search('callout')).toEqual(['Callout'])
  })

  it('only offers Phase 1 block types', () => {
    const { search } = setup()
    for (const missing of ['Table', 'Video', 'Audio', 'File']) {
      expect(search(missing.toLowerCase())).not.toContain(missing)
    }
  })

  it('Callout inserts a callout block; New sub-page calls back', () => {
    const { editor, items, onNewSubPage } = setup()
    items.find((i) => i.title === 'Callout')!.onItemClick()
    expect(editor.document[0].type).toBe('callout')

    items.find((i) => i.title === 'New sub-page')!.onItemClick()
    expect(onNewSubPage).toHaveBeenCalledOnce()
  })
})
