// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PickerRow } from './PickerRow'
import { $, $$, cleanDom, click, key, mount } from './testHelpers'

afterEach(cleanDom)

const tiles = [
  { id: 'all', label: 'All decks' },
  { id: 'a', label: 'Heart', dot: '#c00' },
  { id: 'b', label: 'Lungs' },
]
const props = (over = {}) => ({
  tiles,
  value: 'all',
  onPick: vi.fn(),
  label: 'Decks',
  ...over,
})

describe('PickerRow (N3: pick on top)', () => {
  it('is a radiogroup; the picked tile is checked, the others are not', () => {
    mount(h(PickerRow, props()))
    expect($('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Decks')
    expect($$('[role="radio"]').map((r) => r.getAttribute('aria-checked'))).toEqual(
      ['true', 'false', 'false'],
    )
  })

  it('a tap picks; the arrow keys move the pick (wrapping)', () => {
    const p = props()
    mount(h(PickerRow, p))
    click($$('[role="radio"]')[1])
    expect(p.onPick).toHaveBeenLastCalledWith('a')
    key($$('[role="radio"]')[0], 'ArrowRight')
    expect(p.onPick).toHaveBeenLastCalledWith('a')
    key($$('[role="radio"]')[2], 'ArrowRight')
    expect(p.onPick).toHaveBeenLastCalledWith('all')
  })

  it('only the picked tile is in the tab order', () => {
    mount(h(PickerRow, props({ value: 'b' })))
    expect($$('[role="radio"]').map((r) => r.tabIndex)).toEqual([-1, -1, 0])
  })

  it('shows the colour dot only when a tile has one', () => {
    mount(h(PickerRow, props()))
    expect($$('.pickrow__dot')).toHaveLength(1)
  })

  it('30 tiles stay in one row (a single scroller)', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: `d${i}`,
      label: `Deck ${i}`,
    }))
    mount(h(PickerRow, props({ tiles: many, value: 'd29' })))
    expect($$('[role="radio"]')).toHaveLength(30)
    expect($$('[role="radiogroup"]')).toHaveLength(1)
  })
})
