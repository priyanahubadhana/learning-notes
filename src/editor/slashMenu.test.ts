/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core'
import { describe, expect, it, vi } from 'vitest'
import { buildSlashMenuItems } from './slashMenu'
import { schema } from './schema'

function setup(withSave = true) {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [{ id: 'p', type: 'paragraph' }],
  })
  editor.mount(document.createElement('div'))
  editor.setTextCursorPosition('p', 'start')
  const onNewSubPage = vi.fn()
  const onInsertTemplate = vi.fn()
  const onSaveAsTemplate = vi.fn()
  const items = buildSlashMenuItems(editor, {
    onNewSubPage,
    onLinkPage: vi.fn(),
    onInsertTemplate,
    onSaveAsTemplate: withSave ? onSaveAsTemplate : undefined,
  })
  const search = (query: string) =>
    filterSuggestionItems(items, query).map((i) => i.title)
  return {
    editor,
    items,
    search,
    onNewSubPage,
    onInsertTemplate,
    onSaveAsTemplate,
  }
}

describe('slash menu', () => {
  it('offers template actions, and hides "Save page as template" when not allowed', () => {
    const { search, items, onInsertTemplate, onSaveAsTemplate } = setup()
    expect(search('template')).toEqual(
      expect.arrayContaining(['Insert template…', 'Save page as template']),
    )
    items.find((i) => i.title === 'Insert template…')!.onItemClick()
    items.find((i) => i.title === 'Save page as template')!.onItemClick()
    expect(onInsertTemplate).toHaveBeenCalledOnce()
    expect(onSaveAsTemplate).toHaveBeenCalledOnce()

    expect(setup(false).search('template')).not.toContain(
      'Save page as template',
    )
  })

  it('finds the checklist when typing "todo"', () => {
    expect(setup().search('todo')[0]).toBe('Check List')
  })

  it('offers Callout (after Quote), then New sub-page and Link to page (last)', () => {
    const { items, search } = setup()
    const titles = items.map((i) => i.title)
    expect(titles.indexOf('Callout')).toBe(titles.indexOf('Quote') + 1)
    expect(titles.slice(-2)).toEqual(['New sub-page', 'Link to page'])
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
