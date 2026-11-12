// @vitest-environment jsdom
import { createElement as h, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { $, $$, byLabel, click, cleanDom, key, mount } from '../testHelpers'
import { MoveButtons } from './MoveButtons'
import { ReorderList } from './ReorderList'
import {
  keyTarget,
  keyToMove,
  layoutGrid,
  moveItem,
  nextFit,
  snapToFit,
  targetIndex,
} from './reorder'

afterEach(cleanDom)

describe('reorder maths', () => {
  it('moveItem returns a new list with the item moved', () => {
    const a = ['a', 'b', 'c', 'd']
    expect(moveItem(a, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(a, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(a).toEqual(['a', 'b', 'c', 'd'])
  })

  it('keyTarget stops at both ends', () => {
    expect(keyTarget(0, 3, 'up')).toBe(-1)
    expect(keyTarget(2, 3, 'down')).toBe(-1)
    expect(keyTarget(1, 3, 'up')).toBe(0)
    expect(keyTarget(1, 3, 'start')).toBe(0)
    expect(keyTarget(1, 3, 'end')).toBe(2)
    expect(keyTarget(0, 3, 'start')).toBe(-1)
  })

  it('keyToMove respects the axis', () => {
    expect(keyToMove('ArrowUp', 'y')).toBe('up')
    expect(keyToMove('ArrowLeft', 'y')).toBeNull()
    expect(keyToMove('ArrowRight', 'x')).toBe('down')
    expect(keyToMove('ArrowDown', 'x')).toBeNull()
    expect(keyToMove('Home', 'grid')).toBe('start')
    expect(keyToMove('a', 'y')).toBeNull()
  })

  it('targetIndex picks the nearest centre on a vertical list', () => {
    const centres = [
      { x: 0, y: 10 },
      { x: 0, y: 50 },
      { x: 0, y: 90 },
    ]
    expect(targetIndex(centres, { x: 0, y: 5 }, 'y')).toBe(0)
    expect(targetIndex(centres, { x: 0, y: 30 }, 'y')).toBe(1)
    expect(targetIndex(centres, { x: 0, y: 88 }, 'y')).toBe(2)
  })

  it('snapToFit finds the closest slot that fits, and nextFit skips holes', () => {
    const fit = (s: number) => s !== 1
    expect(snapToFit(1, 4, fit)).not.toBe(1)
    expect(nextFit(0, 1, 4, fit)).toBe(2)
    expect(nextFit(3, 1, 4, fit)).toBe(-1)
  })

  it('layoutGrid wraps wide items onto the next row', () => {
    const p = layoutGrid([1, 2, 2], 3)
    expect(p[0].row).toBe(0)
    expect(p[1].row).toBe(0)
    expect(p[2].row).toBe(1)
  })
})

describe('MoveButtons', () => {
  it('renders nothing for a single item', () => {
    mount(h(MoveButtons, { name: 'A', index: 0, count: 1, onMove: () => {} }))
    expect($('.rord-moves')).toBeNull()
  })

  it('disables Up on the first and Down on the last', () => {
    const m = mount(
      h(MoveButtons, { name: 'A', index: 0, count: 3, onMove: () => {} }),
    )
    expect(byLabel<HTMLButtonElement>('Move A up')?.disabled).toBe(true)
    expect(byLabel<HTMLButtonElement>('Move A down')?.disabled).toBe(false)
    m.rerender(
      h(MoveButtons, { name: 'A', index: 2, count: 3, onMove: () => {} }),
    )
    expect(byLabel<HTMLButtonElement>('Move A down')?.disabled).toBe(true)
  })

  it('reports the direction pressed', () => {
    const onMove = vi.fn()
    mount(h(MoveButtons, { name: 'B', index: 1, count: 3, onMove }))
    click(byLabel('Move B down'))
    expect(onMove).toHaveBeenCalledWith('down')
  })

  it('is fully off when disabled', () => {
    mount(
      h(MoveButtons, {
        name: 'B',
        index: 1,
        count: 3,
        disabled: true,
        onMove: () => {},
      }),
    )
    expect(byLabel<HTMLButtonElement>('Move B up')?.disabled).toBe(true)
    expect(byLabel<HTMLButtonElement>('Move B down')?.disabled).toBe(true)
  })
})

type Item = { id: string; name: string }
const ITEMS: Item[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
]

function List({ onMove }: { onMove?: (id: string, to: number) => void }) {
  const [items, setItems] = useState(ITEMS)
  return h(ReorderList<Item>, {
    items,
    getId: (i) => i.id,
    label: (i) => i.name,
    axis: 'y',
    handle: 'grip',
    showMoveButtons: true,
    'aria-label': 'Things',
    onMove: (id, to) => {
      onMove?.(id, to)
      const from = items.findIndex((i) => i.id === id)
      setItems(moveItem(items, from, to))
    },
    renderItem: (item, ctx) =>
      h(
        'div',
        { className: 'row' },
        ctx.grip,
        h('span', { 'data-name': '' }, item.name),
        ctx.moveButtons,
      ),
  })
}

const names = () => $$('[data-name]').map((s) => s.textContent)

describe('ReorderList (useReorder)', () => {
  it('is a named list with a grip per item', () => {
    mount(h(List))
    expect($('[role="list"]')?.getAttribute('aria-label')).toBe('Things')
    expect(byLabel('Drag Alpha to reorder')).not.toBeNull()
    expect($$('li.rord-item')).toHaveLength(3)
  })

  it('moves an item with the Down button and announces it', () => {
    const onMove = vi.fn()
    mount(h(List, { onMove }))
    click(byLabel('Move Alpha down'))
    expect(onMove).toHaveBeenCalledWith('a', 1)
    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma'])
    expect($('.rord-live')?.textContent).toContain(
      'Alpha moved to position 2 of 3',
    )
  })

  it('moves with Alt+ArrowDown and Alt+End from the keyboard', () => {
    mount(h(List))
    key($$('li.rord-item')[0], 'ArrowDown', { altKey: true })
    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma'])
    key($$('li.rord-item')[0], 'End', { altKey: true })
    expect(names()).toEqual(['Alpha', 'Gamma', 'Beta'])
  })

  it('ignores plain arrows (no Alt)', () => {
    const onMove = vi.fn()
    mount(h(List, { onMove }))
    key($$('li.rord-item')[0], 'ArrowDown')
    expect(onMove).not.toHaveBeenCalled()
  })

  it('does not move past the ends', () => {
    const onMove = vi.fn()
    mount(h(List, { onMove }))
    key($$('li.rord-item')[0], 'ArrowUp', { altKey: true })
    expect(onMove).not.toHaveBeenCalled()
  })

  it('every item can take focus for the keyboard', () => {
    mount(h(List))
    for (const li of $$('li.rord-item')) expect(li.tabIndex).toBe(0)
  })
})
