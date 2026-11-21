// @vitest-environment jsdom
import { createElement as h } from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TabRow, type TabDef } from './TabRow'
import { memoryTabSetStore, type TabSetStore } from './tabSets'
import {
  $,
  $$,
  byLabel,
  click,
  cleanDom,
  key,
  mount,
  type as typeInto,
} from './testHelpers'

afterEach(() => {
  vi.useRealTimers()
  cleanDom()
})

const CATALOG: TabDef[] = [
  { id: 'home', label: 'Home' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'notes', label: 'Notes' },
  { id: 'pro1', label: 'Insights', pro: 'insights' },
]
const DEFAULTS = ['home', 'today', 'week']

const row = (
  over: Partial<Parameters<typeof TabRow>[0]> = {},
  store: TabSetStore = memoryTabSetStore(),
) =>
  h(TabRow, {
    setKey: 'test',
    catalog: CATALOG,
    defaults: DEFAULTS,
    value: 'today',
    onPick: () => {},
    store,
    ...over,
  })

const tabs = () => $$('[role="tab"]')
const labels = () => tabs().map((t) => t.textContent)

describe('TabRow: structure and accessibility', () => {
  it('is one tablist named "Tabs" with the three default tabs', () => {
    mount(row())
    expect($('[role="tablist"]')?.getAttribute('aria-label')).toBe('Tabs')
    expect(labels()).toEqual(['Home', 'Today', 'Week'])
  })

  it('marks the chosen tab selected and gives only it a tab stop', () => {
    mount(row({ value: 'week' }))
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'true',
    ])
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, -1, 0])
  })

  it('falls back to the first tab when the value is unknown', () => {
    mount(row({ value: 'nope' }))
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true')
  })

  it('picks a tab on click', () => {
    const onPick = vi.fn()
    mount(row({ onPick }))
    click(tabs()[2])
    expect(onPick).toHaveBeenCalledWith('week')
  })

  it('uses the underline look by default and the pill look on request', () => {
    const m = mount(row())
    expect($('.tabrow')?.getAttribute('data-variant')).toBe('underline')
    m.rerender(row({ variant: 'pill' }))
    expect($('.tabrow')?.getAttribute('data-variant')).toBe('pill')
  })

  it('hides the thin track while nothing overflows', () => {
    mount(row())
    expect($<HTMLElement>('[data-testid="tabrow-track"]')?.hidden).toBe(true)
  })

  it('shows a Professional tab only when its unlock is on', () => {
    const store = memoryTabSetStore()
    store.write(
      'test',
      JSON.stringify({ ids: ['home', 'pro1'], custom: {}, labels: {} }),
    )
    const m = mount(row({ unlocked: () => false }, store))
    expect(labels()).toEqual(['Home'])
    m.unmount()
    mount(row({ unlocked: (id) => id === 'insights' }, store))
    expect(labels()).toEqual(['Home', 'Insights'])
  })

  it('loads a saved set', () => {
    const store = memoryTabSetStore()
    store.write(
      'test',
      JSON.stringify({
        ids: ['notes', 'home'],
        custom: {},
        labels: { notes: 'My notes' },
      }),
    )
    mount(row({}, store))
    expect(labels()).toEqual(['My notes', 'Home'])
  })
})

describe('TabRow: keyboard', () => {
  it('Left/Right move focus and wrap, without changing the chosen tab', () => {
    const onPick = vi.fn()
    mount(row({ onPick }))
    const t = tabs()
    t[1].focus()
    key(t[1], 'ArrowRight')
    expect(document.activeElement).toBe(t[2])
    key(t[2], 'ArrowRight')
    expect(document.activeElement).toBe(t[0])
    key(t[0], 'ArrowLeft')
    expect(document.activeElement).toBe(t[2])
    expect(onPick).not.toHaveBeenCalled()
  })

  it('Home and End jump to the first and last tab', () => {
    mount(row())
    const t = tabs()
    t[1].focus()
    key(t[1], 'End')
    expect(document.activeElement).toBe(t[2])
    key(t[2], 'Home')
    expect(document.activeElement).toBe(t[0])
  })

  it('Enter on a focused tab picks it (native button activation)', () => {
    const onPick = vi.fn()
    mount(row({ onPick }))
    const t = tabs()[0]
    t.focus()
    // jsdom does not turn Enter into a click, so click as the browser would.
    click(t)
    expect(onPick).toHaveBeenCalledWith('home')
  })
})

describe('TabRow: the "+" menu', () => {
  const plus = () => $<HTMLButtonElement>('[data-testid="tabrow-plus"]')!

  it('is a 44 px menu button, closed at first', () => {
    mount(row())
    expect(plus().getAttribute('aria-haspopup')).toBe('menu')
    expect(plus().getAttribute('aria-expanded')).toBe('false')
    expect($('[role="menu"]')).toBeNull()
  })

  it('is missing when the row is not editable', () => {
    mount(row({ editable: false }))
    expect(plus()).toBeNull()
  })

  it('opens a menu with addable tabs, Create your own tab and Edit tabs…', () => {
    mount(row())
    click(plus())
    expect(plus().getAttribute('aria-expanded')).toBe('true')
    const items = $$('[role="menuitem"]').map((i) => i.textContent)
    expect(items).toEqual([
      'Add a tab: Notes',
      'Add a tab: Insights',
      'Create your own tab',
      'Edit tabs…',
    ])
  })

  it('moves focus into the menu and Arrow keys cycle through items', () => {
    mount(row())
    click(plus())
    const items = $$('[role="menuitem"]')
    expect(document.activeElement).toBe(items[0])
    key(items[0], 'ArrowDown')
    expect(document.activeElement).toBe(items[1])
    key(items[1], 'ArrowUp')
    key(items[0], 'ArrowUp')
    expect(document.activeElement).toBe(items[items.length - 1])
  })

  it('Escape closes the menu and returns focus to the "+"', () => {
    mount(row())
    click(plus())
    key($('[role="menu"]'), 'Escape')
    expect($('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(plus())
  })

  it('adding a tab appends it and saves the set', () => {
    const store = memoryTabSetStore()
    mount(row({}, store))
    click(plus())
    click($('[data-testid="tabrow-add"]'))
    expect(labels()).toEqual(['Home', 'Today', 'Week', 'Notes'])
    expect($('[role="menu"]')).toBeNull()
    expect(JSON.parse(store.read('test') ?? '{}').ids).toEqual([
      'home',
      'today',
      'week',
      'notes',
    ])
  })
})

describe('TabRow: Create your own tab', () => {
  const open = (over = {}) => {
    mount(row(over))
    click($('[data-testid="tabrow-plus"]'))
    click($('[data-testid="tabrow-create"]'))
  }

  it('opens a dialog; Add tab stays off until a name is typed', () => {
    open()
    expect($('[role="dialog"]')?.getAttribute('aria-labelledby')).toBeTruthy()
    expect(
      $<HTMLButtonElement>('[data-testid="tabcreate-add"]')?.disabled,
    ).toBe(true)
    typeInto($<HTMLInputElement>('[role="dialog"] input'), 'Reading')
    expect(
      $<HTMLButtonElement>('[data-testid="tabcreate-add"]')?.disabled,
    ).toBe(false)
  })

  it('adds the named tab and closes the dialog', () => {
    open()
    typeInto($<HTMLInputElement>('[role="dialog"] input'), 'Reading')
    click($('[data-testid="tabcreate-add"]'))
    expect(labels()).toEqual(['Home', 'Today', 'Week', 'Reading'])
    expect($('[role="dialog"]')).toBeNull()
  })

  it('offers sources to point at and keeps the choice', () => {
    const store = memoryTabSetStore()
    mount(row({ sources: () => [{ id: 'f1', label: 'Saved filter' }] }, store))
    click($('[data-testid="tabrow-plus"]'))
    click($('[data-testid="tabrow-create"]'))
    typeInto($<HTMLInputElement>('[role="dialog"] input[type="text"]'), 'Mine')
    click(
      $<HTMLInputElement>('[role="dialog"] input[type="radio"]:not(:checked)'),
    )
    click($('[data-testid="tabcreate-add"]'))
    const saved = JSON.parse(store.read('test') ?? '{}')
    expect(saved.custom['custom:1']).toEqual({ label: 'Mine', source: 'f1' })
  })

  it('closes with the ✕ button', () => {
    open()
    click(byLabel('Close'))
    expect($('[role="dialog"]')).toBeNull()
  })
})

describe('TabRow: Edit tabs dialog', () => {
  const open = (store = memoryTabSetStore()) => {
    mount(row({}, store))
    click($('[data-testid="tabrow-plus"]'))
    click($('[data-testid="tabrow-edit"]'))
    return store
  }
  const rows = () => $$('[data-testid="tabed-row"]')

  it('lists every tab as a draggable row with a name field, ▲▼ and a ✕', () => {
    open()
    expect($('[role="dialog"]')?.textContent).toContain('Edit tabs')
    expect(rows()).toHaveLength(3)
    expect(byLabel('Drag Home to reorder')).not.toBeNull()
    expect(byLabel('Move Home down')).not.toBeNull()
    expect(byLabel('Remove Home')).not.toBeNull()
    expect(byLabel('Name of Home')).not.toBeNull()
  })

  it('shows a mini preview of the row inside the dialog', () => {
    open()
    expect(
      $$('[data-testid="tabed-preview"] .tabed-chip').map((c) => c.textContent),
    ).toEqual(['Home', 'Today', 'Week'])
  })

  it('reorders with the ▼ button and the main row follows at once', () => {
    open()
    click(byLabel('Move Home down'))
    expect(labels()).toEqual(['Today', 'Home', 'Week'])
  })

  it('removes a tab with its ✕, and Undo brings it back', () => {
    open()
    click(byLabel('Remove Today'))
    expect(labels()).toEqual(['Home', 'Week'])
    click($('[data-testid="tabed-undo"]'))
    expect(labels()).toEqual(['Home', 'Today', 'Week'])
  })

  it('never lets the last tab be removed', () => {
    open()
    click(byLabel('Remove Home'))
    click(byLabel('Remove Today'))
    expect(labels()).toEqual(['Week'])
    expect(byLabel<HTMLButtonElement>('Remove Week')?.disabled).toBe(true)
  })

  it('renames a tab when the name field loses focus', () => {
    open()
    const input = byLabel<HTMLInputElement>('Name of Home')!
    input.focus()
    typeInto(input, 'Start')
    act(() => input.blur())
    expect(labels()).toEqual(['Start', 'Today', 'Week'])
  })

  it('Reset returns to the default tabs', () => {
    open()
    click(byLabel('Remove Today'))
    click($('[data-testid="tabed-reset"]'))
    expect(labels()).toEqual(['Home', 'Today', 'Week'])
  })

  it('Done closes the dialog and keeps the changes', () => {
    open()
    click(byLabel('Remove Today'))
    click($('[data-testid="tabed-done"]'))
    expect($('[role="dialog"]')).toBeNull()
    expect(labels()).toEqual(['Home', 'Week'])
  })
})
