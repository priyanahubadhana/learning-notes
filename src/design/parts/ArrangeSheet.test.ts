// @vitest-environment jsdom
import { createElement as h, act, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ArrangeSheet,
  type ArrangeRow,
  type ArrangeSheetProps,
} from './ArrangeSheet'
import { moveRow, previewChips, removeRow, restoreRow } from './arrangeLogic'
import { $, $$, byLabel, click, cleanDom, key, mount } from './testHelpers'

afterEach(() => {
  vi.useRealTimers()
  cleanDom()
})

const ROWS: ArrangeRow[] = [
  { id: 'pen', label: 'Pen' },
  { id: 'text', label: 'Text' },
  { id: 'erase', label: 'Eraser' },
]

const ids = (rows: ArrangeRow[]) => rows.map((r) => r.id)

describe('arrangeLogic', () => {
  it('moveRow, removeRow and restoreRow are pure', () => {
    expect(ids(moveRow(ROWS, 'pen', 2))).toEqual(['text', 'erase', 'pen'])
    const r = removeRow(ROWS, 'text')
    expect(ids(r.rows)).toEqual(['pen', 'erase'])
    expect(r.removed?.id).toBe('text')
    expect(r.index).toBe(1)
    expect(ids(restoreRow(r.rows, r.removed!, r.index))).toEqual(ids(ROWS))
    expect(ROWS).toHaveLength(3)
  })

  it('previewChips caps the chips and counts the rest', () => {
    const c = previewChips(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])
    expect(c.shown.length + c.more).toBe(10)
    expect(c.more).toBeGreaterThan(0)
  })
})

function Host(props: Partial<ArrangeSheetProps> & { start?: ArrangeRow[] }) {
  const [rows, setRows] = useState(props.start ?? ROWS)
  return h(ArrangeSheet, {
    title: 'Organise the row',
    mode: 'inline',
    onDone: () => {},
    ...props,
    rows,
    onChange: (next: ArrangeRow[]) => {
      props.onChange?.(next)
      setRows(next)
    },
  })
}

const names = () =>
  $$('[data-testid="arrange-row"] .arr-name > span').map((s) => s.textContent)

describe('ArrangeSheet', () => {
  it('is a dialog named by its title, with a Close button', () => {
    const onDone = vi.fn()
    mount(h(Host, { onDone }))
    const d = $('[role="dialog"]')!
    expect(d.getAttribute('aria-labelledby')).toBeTruthy()
    expect(
      document.getElementById(d.getAttribute('aria-labelledby')!)?.textContent,
    ).toBe('Organise the row')
    click(byLabel('Close'))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('lists the rows in a named list, each with grip, ▲▼ and a "…" menu', () => {
    mount(h(Host))
    expect($('[role="list"]')?.getAttribute('aria-label')).toBe(
      'Items to arrange',
    )
    expect(names()).toEqual(['Pen', 'Text', 'Eraser'])
    expect(byLabel('Drag Pen to reorder')).not.toBeNull()
    expect(byLabel('Move Pen down')).not.toBeNull()
    expect(byLabel('More for Pen')).not.toBeNull()
  })

  it('shows the live preview chips of the current order', () => {
    mount(h(Host))
    const chips = () => $$('.arr-chip').map((c) => c.textContent)
    expect(chips()).toEqual(['Pen', 'Text', 'Eraser'])
    click(byLabel('Move Pen down'))
    expect(chips()).toEqual(['Text', 'Pen', 'Eraser'])
  })

  it('applies a ▼ move at once through onChange (one step)', () => {
    const onChange = vi.fn()
    mount(h(Host, { onChange }))
    click(byLabel('Move Pen down'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(ids(onChange.mock.calls[0][0])).toEqual(['text', 'pen', 'erase'])
    expect(names()).toEqual(['Text', 'Pen', 'Eraser'])
  })

  it('moves with Alt+Arrow from the keyboard', () => {
    mount(h(Host))
    key($$('li.rord-item')[2], 'ArrowUp', { altKey: true })
    expect(names()).toEqual(['Pen', 'Eraser', 'Text'])
  })

  it('Done reports done', () => {
    const onDone = vi.fn()
    mount(h(Host, { onDone }))
    click($('[data-testid="arrange-done"]'))
    expect(onDone).toHaveBeenCalled()
  })

  it('shows Reset only when asked and turns it off at the default', () => {
    const onReset = vi.fn()
    const m = mount(h(Host, { onReset, isDefault: true }))
    expect(
      $<HTMLButtonElement>('[data-testid="arrange-reset"]')?.disabled,
    ).toBe(true)
    m.rerender(h(Host, { onReset, isDefault: false }))
    click($('[data-testid="arrange-reset"]'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('Add is off with a reason when the list is at its maximum', () => {
    mount(h(Host, { onAdd: () => {}, max: 3 }))
    expect($<HTMLButtonElement>('[data-testid="arrange-add"]')?.disabled).toBe(
      true,
    )
    expect($('[data-testid="arrange-max"]')?.textContent).toContain('3')
  })

  it('Add works below the maximum', () => {
    const onAdd = vi.fn()
    mount(h(Host, { onAdd, max: 5, addLabel: 'Add favourite' }))
    click($('[data-testid="arrange-add"]'))
    expect(onAdd).toHaveBeenCalled()
    expect($('[data-testid="arrange-add"]')?.textContent).toContain(
      'Add favourite',
    )
  })

  it('shows a calm empty message when there are no rows', () => {
    mount(h(Host, { start: [] }))
    expect($('[data-testid="arrange-empty"]')?.textContent).toBe(
      'Nothing here yet',
    )
    expect($('[role="list"]')).toBeNull()
  })

  it('opens a row’s edit form on tap when onRowTap is given', () => {
    const onRowTap = vi.fn()
    mount(h(Host, { onRowTap }))
    click($$('.arr-name-btn')[1])
    expect(onRowTap).toHaveBeenCalledWith('text')
  })
})

describe('ArrangeSheet: the "…" row menu', () => {
  const menuBtn = (name: string) => byLabel(`More for ${name}`)!

  it('opens a menu with start, end and remove, and closes on Escape', () => {
    mount(h(Host))
    click(menuBtn('Text'))
    expect(menuBtn('Text').getAttribute('aria-expanded')).toBe('true')
    expect($$('[role="menuitem"]').map((i) => i.textContent)).toEqual([
      'Move to start',
      'Move to end',
      'Remove',
    ])
    key($('[role="menu"]'), 'Escape')
    expect($('[role="menu"]')).toBeNull()
  })

  it('turns the impossible moves off at the ends', () => {
    mount(h(Host))
    click(menuBtn('Pen'))
    expect($<HTMLButtonElement>('[data-testid="menu-start"]')?.disabled).toBe(
      true,
    )
    expect($<HTMLButtonElement>('[data-testid="menu-end"]')?.disabled).toBe(
      false,
    )
  })

  it('moves a row to the end', () => {
    mount(h(Host))
    click(menuBtn('Pen'))
    click($('[data-testid="menu-end"]'))
    expect(names()).toEqual(['Text', 'Eraser', 'Pen'])
  })

  it('hides Remove for a row that cannot be removed', () => {
    mount(
      h(Host, {
        start: [{ id: 'a', label: 'Fixed', removable: false }, ...ROWS],
      }),
    )
    click(menuBtn('Fixed'))
    expect($('[data-testid="menu-remove"]')).toBeNull()
  })

  it('Remove collapses the row, announces it, and Undo puts it back', () => {
    vi.useFakeTimers()
    mount(h(Host))
    click(menuBtn('Text'))
    click($('[data-testid="menu-remove"]'))
    act(() => void vi.advanceTimersByTime(400))
    expect(names()).toEqual(['Pen', 'Eraser'])
    expect($('[data-testid="arrange-undo"]')?.textContent).toContain(
      'Removed Text',
    )
    expect(
      $$('[role="status"]').some((s) =>
        s.textContent?.includes('Undo available'),
      ),
    ).toBe(true)
    click($('[data-testid="arrange-undo-btn"]'))
    expect(names()).toEqual(['Pen', 'Text', 'Eraser'])
    expect($('[data-testid="arrange-undo"]')).toBeNull()
  })

  it('the Undo bar goes away by itself', () => {
    vi.useFakeTimers()
    mount(h(Host))
    click(menuBtn('Text'))
    click($('[data-testid="menu-remove"]'))
    act(() => void vi.advanceTimersByTime(400))
    expect($('[data-testid="arrange-undo"]')).not.toBeNull()
    act(() => void vi.advanceTimersByTime(7000))
    expect($('[data-testid="arrange-undo"]')).toBeNull()
  })
})
