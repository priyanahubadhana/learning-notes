// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandList } from './CommandList'
import type { CommandGroup } from './commandListLogic'
import {
  $,
  $$,
  cleanDom,
  click,
  key,
  mount,
  type as typeInto,
} from './testHelpers'

afterEach(cleanDom)

const groups: CommandGroup[] = [
  {
    id: 'f',
    label: 'Format',
    items: [
      { id: 'bold', label: 'Bold', aliases: ['strong'] },
      { id: 'colour', label: 'Colour', aliases: ['color'] },
      { id: 'turn', label: 'Turn into' },
    ],
  },
  {
    id: 'i',
    label: 'Insert',
    items: [
      { id: 'table', label: 'Table' },
      { id: 'picture', label: 'Picture', aliases: ['image'] },
      { id: 'link', label: 'Link' },
    ],
  },
]

const show = (extra: Record<string, unknown> = {}) => {
  const onPick = vi.fn()
  const onClose = vi.fn()
  mount(
    h(CommandList, {
      mode: 'inline',
      groups,
      onPick,
      onClose,
      limit: 4,
      ...extra,
    }),
  )
  return { onPick, onClose }
}
const input = () => $<HTMLInputElement>('[data-testid="cl-input"]')
const ids = () =>
  $$('[role="option"]').map((o) => o.dataset.testid?.replace(/^cl-\w+-/, ''))

describe('CommandList', () => {
  it('is a combobox with a listbox of options', () => {
    show()
    expect(input()?.getAttribute('role')).toBe('combobox')
    expect($('[role="listbox"]')).not.toBeNull()
    expect(input()?.getAttribute('aria-controls')).toBe(
      $('[role="listbox"]')?.id,
    )
    expect($$('[role="option"]').length).toBeGreaterThan(0)
  })

  it('SP-45 filters by name and alias as you type, and says No match', () => {
    show()
    typeInto(input(), 'col')
    expect(ids()).toEqual(['colour'])
    typeInto(input(), 'image')
    expect(ids()).toEqual(['picture'])
    typeInto(input(), 'zzz')
    expect(ids()).toEqual([])
    expect($('[data-testid="cl-none"]')?.textContent).toBe('No match')
  })

  it('SP-46 arrows move the highlight and Enter picks it', () => {
    const { onPick } = show()
    const first = $$('[role="option"]')[0]
    expect(input()?.getAttribute('aria-activedescendant')).toBe(first.id)
    key(input(), 'ArrowDown')
    key(input(), 'ArrowDown')
    key(input(), 'Enter')
    expect(onPick).toHaveBeenCalledWith('turn')
    key(input(), 'ArrowUp')
    expect(
      $('[role="option"][aria-selected="true"]')?.dataset.testid,
    ).toBeDefined()
  })

  it('Home and End jump the highlight to the first and last row', () => {
    show()
    const rows = () => $$('[role="option"]')
    key(input(), 'End')
    expect(input()?.getAttribute('aria-activedescendant')).toBe(
      rows().at(-1)?.id,
    )
    key(input(), 'Home')
    expect(input()?.getAttribute('aria-activedescendant')).toBe(rows()[0].id)
  })

  it('Esc closes an inline list', () => {
    const { onClose } = show()
    key(input(), 'Escape')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('SP-47 the last 3 picked show in Recent on top', () => {
    show()
    for (const id of ['cl-item-bold', 'cl-item-colour', 'cl-item-turn']) {
      click($(`[data-testid="${id}"]`))
    }
    click($('[data-testid="cl-item-table"]'))
    const recent = $$('[data-recent]').map((r) =>
      r.dataset.testid?.replace('cl-recent-', ''),
    )
    expect(recent).toEqual(['table', 'turn', 'colour'])
    expect($('[data-testid="cl-group-recent"]')?.textContent).toBe('Recent')
    expect($$('[role="option"]')[0].dataset.recent).toBe('true')
  })

  it('SP-48 Show all shows every group', () => {
    show()
    expect($('[data-testid="cl-show-all"]')).not.toBeNull()
    expect($('[data-testid="cl-item-link"]')).toBeNull()
    click($('[data-testid="cl-show-all"]'))
    expect($('[data-testid="cl-item-link"]')).not.toBeNull()
    expect($('[data-testid="cl-show-all"]')).toBeNull()
    expect($$('[role="option"]')).toHaveLength(6)
  })

  it('rows are 44 px tall by CSS and keep a name for the screen reader', () => {
    show()
    expect($$('[role="option"]').every((o) => o.textContent)).toBe(true)
  })
})
