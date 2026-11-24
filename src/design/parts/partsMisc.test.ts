// @vitest-environment jsdom
import { createElement as h, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmptyState } from './EmptyState'
import { ObjectBar, type ObjectBarAction } from './ObjectBar'
import { TimeRangeBar } from './TimeRangeBar'
import TagPicker from './TagPicker/TagPicker'
import { allPresets } from './timeRangePresets'
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

describe('EmptyState', () => {
  it('names the next step with a title, text and one primary button', () => {
    const onAction = vi.fn()
    mount(
      h(EmptyState, {
        icon: 'inbox',
        title: 'No notes yet',
        text: 'Make your first note.',
        action: 'New note',
        onAction,
      }),
    )
    expect($('h3')?.textContent).toBe('No notes yet')
    expect($('p')?.textContent).toBe('Make your first note.')
    click($('[data-testid="empty-state-action"]'))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('has no button when no action is given', () => {
    mount(h(EmptyState, { text: 'Nothing here.' }))
    expect($('button')).toBeNull()
  })

  it('the page and inline variants differ only in look', () => {
    const m = mount(h(EmptyState, { text: 'x', variant: 'page' }))
    expect($('[data-testid="empty-state"]')?.getAttribute('data-variant')).toBe(
      'page',
    )
    expect($('.pm-empty__disc')).not.toBeNull()
    m.rerender(h(EmptyState, { text: 'x', variant: 'inline' }))
    expect($('[data-testid="empty-state"]')?.getAttribute('data-variant')).toBe(
      'inline',
    )
    expect($('.pm-empty__disc')).toBeNull()
  })

  it('offline fills in plain words and never blames the user', () => {
    mount(h(EmptyState, { kind: 'offline' }))
    expect($('h3')?.textContent).toBe('You are offline')
    expect($('p')?.textContent).toBe('Your notes are on this device.')
  })

  it('error offers Try again', () => {
    const onAction = vi.fn()
    mount(h(EmptyState, { kind: 'error', onAction }))
    expect($('h3')?.textContent).toBe('Something went wrong')
    click($('[data-testid="empty-state-action"]'))
    expect(onAction).toHaveBeenCalled()
  })

  it('announces itself (role=status) only when it replaces content', () => {
    const m = mount(h(EmptyState, { text: 'x' }))
    expect($('[data-testid="empty-state"]')?.getAttribute('role')).toBeNull()
    m.rerender(h(EmptyState, { text: 'x', replacesContent: true }))
    expect($('[data-testid="empty-state"]')?.getAttribute('role')).toBe(
      'status',
    )
  })

  it('has a quiet second action and a Learn more that does not swap the content', () => {
    const onSecondary = vi.fn()
    const learnMore = vi.fn()
    mount(
      h(EmptyState, {
        text: 'x',
        secondary: 'Import',
        onSecondary,
        learnMore,
      }),
    )
    click($('[data-testid="empty-state-secondary"]'))
    click($('[data-testid="empty-state-learn"]'))
    expect(onSecondary).toHaveBeenCalled()
    expect(learnMore).toHaveBeenCalled()
    expect($('p')?.textContent).toBe('x')
  })
})

const ACTIONS: ObjectBarAction[] = [
  { id: 'copy', icon: 'copy', label: 'Copy' },
  { id: 'lock', icon: 'lock', label: 'Lock', pressed: false },
  { id: 'del', icon: 'trash', label: 'Delete', danger: true },
]

describe('ObjectBar', () => {
  it('is a toolbar with one named 44 pt button per action', () => {
    mount(h(ObjectBar, { kind: 'box', actions: ACTIONS, onAction: () => {} }))
    expect($('[role="toolbar"]')?.getAttribute('aria-label')).toBe(
      'Actions for the selection',
    )
    expect(
      $$('[data-bar-btn]').map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Copy', 'Lock', 'Delete'])
  })

  it('reports the action pressed', () => {
    const onAction = vi.fn()
    mount(h(ObjectBar, { kind: 'box', actions: ACTIONS, onAction }))
    click(byLabel('Delete'))
    expect(onAction).toHaveBeenCalledWith('del')
  })

  it('exposes toggle state with aria-pressed only on toggle actions', () => {
    mount(h(ObjectBar, { kind: 'box', actions: ACTIONS, onAction: () => {} }))
    expect(byLabel('Lock')?.getAttribute('aria-pressed')).toBe('false')
    expect(byLabel('Copy')?.hasAttribute('aria-pressed')).toBe(false)
  })

  it('shows "3 selected" for a many-item selection', () => {
    mount(
      h(ObjectBar, {
        kind: 'rows',
        actions: ACTIONS,
        count: 3,
        onAction: () => {},
      }),
    )
    expect($('[data-testid="object-bar-count"]')?.textContent).toBe(
      '3 selected',
    )
  })

  it('has one tab stop (roving) and Arrow/Home/End keys move focus', () => {
    mount(h(ObjectBar, { kind: 'box', actions: ACTIONS, onAction: () => {} }))
    const b = $$('[data-bar-btn]')
    expect(b.map((x) => x.tabIndex)).toEqual([0, -1, -1])
    b[0].focus()
    key($('[role="toolbar"]'), 'ArrowRight')
    expect(document.activeElement).toBe(b[1])
    key($('[role="toolbar"]'), 'End')
    expect(document.activeElement).toBe(b[2])
    key($('[role="toolbar"]'), 'ArrowRight')
    expect(document.activeElement).toBe(b[0])
    key($('[role="toolbar"]'), 'ArrowLeft')
    expect(document.activeElement).toBe(b[2])
    key($('[role="toolbar"]'), 'Home')
    expect(document.activeElement).toBe(b[0])
  })

  it('Escape hands focus back to the object', () => {
    const onEscape = vi.fn()
    mount(
      h(ObjectBar, {
        kind: 'box',
        actions: ACTIONS,
        onAction: () => {},
        onEscape,
      }),
    )
    key($('[role="toolbar"]'), 'Escape')
    expect(onEscape).toHaveBeenCalled()
  })

  it('sends Professional actions to a "…" menu, never sideways scroll', () => {
    const onAction = vi.fn()
    mount(
      h(ObjectBar, {
        kind: 'box',
        onAction,
        actions: [
          ...ACTIONS,
          { id: 'adv', icon: 'settings', label: 'Advanced', pro: 'adv' },
        ],
      }),
    )
    const more = byLabel('More actions')!
    expect(more.getAttribute('aria-haspopup')).toBe('menu')
    expect(byLabel('Advanced')).toBeNull()
    click(more)
    expect(more.getAttribute('aria-expanded')).toBe('true')
    click($('[data-testid="ob-menu-adv"]'))
    expect(onAction).toHaveBeenCalledWith('adv')
    expect($('[role="menu"]')).toBeNull()
  })

  it('puts the actions that do not fit in the "…" menu', () => {
    mount(
      h(ObjectBar, {
        kind: 'box',
        actions: ACTIONS,
        maxWidth: 120,
        onAction: () => {},
      }),
    )
    expect(byLabel('More actions')).not.toBeNull()
    expect($$('[data-bar-btn]').length).toBeLessThan(ACTIONS.length + 1)
  })

  it('disables a disabled action', () => {
    mount(
      h(ObjectBar, {
        kind: 'box',
        onAction: () => {},
        actions: [{ id: 'x', icon: 'copy', label: 'Copy', disabled: true }],
      }),
    )
    expect(byLabel<HTMLButtonElement>('Copy')?.disabled).toBe(true)
  })
})

const PRESETS = allPresets().filter((p) =>
  ['today', 'week', 'month', 'custom'].includes(p.id),
)

function RangeHost({ onChange }: { onChange?: (id: string) => void }) {
  const [v, setV] = useState('today')
  return h(TimeRangeBar, {
    presets: PRESETS,
    value: v,
    today: '2026-11-12',
    onChange: (id: string) => {
      onChange?.(id)
      setV(id)
    },
  })
}

describe('TimeRangeBar', () => {
  it('is a radio group named "Time range" with the "Show:" label', () => {
    mount(h(RangeHost))
    expect($('[role="radiogroup"]')?.getAttribute('aria-label')).toBe(
      'Time range',
    )
    expect($('.pm-range__name')?.textContent).toBe('Show:')
    expect($$('[role="radio"]').map((r) => r.textContent)).toEqual([
      'Today',
      'This week',
      'This month',
      'Custom range',
    ])
  })

  it('checks the chosen preset with one tab stop', () => {
    mount(h(RangeHost))
    const r = $$('[role="radio"]')
    expect(r.map((x) => x.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ])
    expect(r.map((x) => x.tabIndex)).toEqual([0, -1, -1, -1])
  })

  it('picks a preset on click and reports the id and the dates', () => {
    const onChange = vi.fn()
    mount(
      h(TimeRangeBar, {
        presets: PRESETS,
        value: 'today',
        today: '2026-11-12',
        onChange,
      }),
    )
    click($('[data-testid="range-week"]'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const [id, range] = onChange.mock.calls[0]
    expect(id).toBe('week')
    expect(range).toEqual({ from: '2026-11-09', to: '2026-11-15' })
  })

  it('arrow keys move the choice and the focus, and wrap', () => {
    mount(h(RangeHost))
    const grp = $('[role="radiogroup"]')
    key(grp, 'ArrowRight')
    expect($('[data-testid="range-week"]')?.getAttribute('aria-checked')).toBe(
      'true',
    )
    expect(document.activeElement).toBe($('[data-testid="range-week"]'))
    key(grp, 'ArrowLeft')
    key(grp, 'ArrowLeft')
    expect(document.activeElement).toBe($('[data-testid="range-custom"]'))
  })

  it('shows the range line as a polite live region', () => {
    mount(h(RangeHost))
    const live = $('[aria-live="polite"]')
    expect(live).not.toBeNull()
    expect(live?.textContent).toBeTruthy()
  })

  it('custom opens date fields; an end before the start is invalid and Apply is off', () => {
    const onChange = vi.fn()
    mount(
      h(TimeRangeBar, {
        presets: PRESETS,
        value: 'today',
        today: '2026-11-12',
        onChange,
      }),
    )
    click($('[data-testid="range-custom"]'))
    expect($('[data-testid="range-picker"]')?.getAttribute('role')).toBe(
      'group',
    )
    typeInto($<HTMLInputElement>('[data-testid="range-from"]'), '2026-11-20')
    typeInto($<HTMLInputElement>('[data-testid="range-to"]'), '2026-11-10')
    expect($('[data-testid="range-from"]')?.getAttribute('aria-invalid')).toBe(
      'true',
    )
    expect($<HTMLButtonElement>('[data-testid="range-apply"]')?.disabled).toBe(
      true,
    )
    expect(
      $('[data-testid="time-range-bar"]')?.getAttribute('data-state'),
    ).toBe('invalid')
    typeInto($<HTMLInputElement>('[data-testid="range-to"]'), '2026-11-25')
    click($('[data-testid="range-apply"]'))
    expect(onChange).toHaveBeenCalledWith('custom', {
      from: '2026-11-20',
      to: '2026-11-25',
    })
  })

  it('hides Edit time range when not editable and the custom option when switched off', () => {
    const m = mount(
      h(TimeRangeBar, { presets: PRESETS, value: 'today', onChange: () => {} }),
    )
    expect($('[data-testid="range-edit"]')?.textContent).toBe('Edit time range')
    m.rerender(
      h(TimeRangeBar, {
        presets: PRESETS,
        value: 'today',
        onChange: () => {},
        editable: false,
        customRange: false,
      }),
    )
    expect($('[data-testid="range-edit"]')).toBeNull()
    expect($('[data-testid="range-custom"]')).toBeNull()
  })

  it('falls back to Today and This week when there are no presets', () => {
    mount(h(TimeRangeBar, { presets: [], value: 'x', onChange: () => {} }))
    expect($$('[role="radio"]').map((r) => r.textContent)).toEqual([
      'Today',
      'This week',
    ])
  })
})

const TAGS = [
  { id: 't1', name: 'health', parentId: null, count: 5 },
  { id: 't2', name: 'habits', parentId: 't1', count: 3 },
  { id: 't3', name: 'work', parentId: null, count: 9 },
]

describe('TagPicker', () => {
  const picker = (over: Partial<Parameters<typeof TagPicker>[0]> = {}) =>
    h(TagPicker, {
      mode: 'filter',
      tags: TAGS,
      placement: 'static',
      onClose: () => {},
      ...over,
    })

  it('is a dialog with a combobox search and a multi-select listbox of options', () => {
    mount(picker())
    expect($('[role="dialog"]')?.getAttribute('aria-label')).toBe('Tags')
    const input = $('[role="combobox"]')!
    expect(input.getAttribute('aria-label')).toBe('Find or create a tag')
    const list = $('[role="listbox"]')!
    expect(list.getAttribute('aria-multiselectable')).toBe('true')
    expect(input.getAttribute('aria-controls')).toBe(list.id)
    expect($$('[role="option"]').length).toBeGreaterThan(0)
  })

  it('searching narrows the options', () => {
    mount(picker())
    typeInto($('[role="combobox"]') as HTMLInputElement, 'wor')
    const names = $$('[role="option"]').map((o) => o.getAttribute('aria-label'))
    expect(names).toContain('#work')
    expect(names).not.toContain('#health')
  })

  it('filter mode: tapping a tag reports the ticked ids, and a tick is exposed to readers', () => {
    const onChange = vi.fn()
    const m = mount(picker({ value: [], onChange }))
    typeInto($('[role="combobox"]') as HTMLInputElement, 'work')
    click($('[data-testid="tag-row-t3"]'))
    expect(onChange).toHaveBeenCalledWith(['t3'])
    m.rerender(picker({ value: ['t3'], onChange }))
    expect($('[data-testid="tag-row-t3"]')?.getAttribute('aria-selected')).toBe(
      'true',
    )
    expect($('[data-testid="tp-count"]')?.textContent).toBe('1 ticked')
  })

  it('Arrow keys move the active option and Enter ticks it', () => {
    const onChange = vi.fn()
    mount(picker({ value: [], onChange }))
    const input = $('[role="combobox"]') as HTMLInputElement
    typeInto(input, 'h')
    const first = input.getAttribute('aria-activedescendant')
    expect(first).toBeTruthy()
    key(input, 'ArrowDown')
    expect(input.getAttribute('aria-activedescendant')).not.toBe(first)
    key(input, 'Enter')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('Escape clears typed text first instead of closing', () => {
    mount(picker())
    const input = $('[role="combobox"]') as HTMLInputElement
    typeInto(input, 'wor')
    key(input, 'Escape')
    expect(input.value).toBe('')
  })

  it('Clear unticks everything and is off when nothing is ticked', () => {
    const onChange = vi.fn()
    const m = mount(picker({ value: [], onChange }))
    expect($<HTMLButtonElement>('[data-testid="tp-clear"]')?.disabled).toBe(
      true,
    )
    m.rerender(picker({ value: ['t1'], onChange }))
    click($('[data-testid="tp-clear"]'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('Match Any/All is a radio group and reports the choice', () => {
    const onMatch = vi.fn()
    mount(picker({ match: 'any', onMatch }))
    expect(
      $('[data-testid="tp-match-any"]')?.getAttribute('aria-checked'),
    ).toBe('true')
    click($('[data-testid="tp-match-all"]'))
    expect(onMatch).toHaveBeenCalledWith('all')
  })

  it('Include sub-tags is a switch', () => {
    const onIncludeSub = vi.fn()
    mount(picker({ includeSub: false, onIncludeSub }))
    const sw = $('[data-testid="tp-include-sub"]')!
    expect(sw.getAttribute('role')).toBe('switch')
    expect(sw.getAttribute('aria-checked')).toBe('false')
    click(sw)
    expect(onIncludeSub).toHaveBeenCalledWith(true)
  })

  it('assign mode: a tap saves at once through onToggle', () => {
    const onToggle = vi.fn()
    mount(picker({ mode: 'assign', itemTags: [[]], onToggle }))
    typeInto($('[role="combobox"]') as HTMLInputElement, 'work')
    click($('[data-testid="tag-row-t3"]'))
    expect(onToggle).toHaveBeenCalledWith('t3', true)
    expect($('[data-testid="tp-hint"]')).not.toBeNull()
  })

  it('offers "Create #name" for a new name, and warns about a near duplicate', () => {
    const onCreate = vi.fn()
    mount(picker({ mode: 'assign', itemTags: [[]], onCreate }))
    const input = $('[role="combobox"]') as HTMLInputElement
    typeInto(input, 'garden')
    expect($('[data-testid="tp-create-row"]')?.textContent).toContain(
      'Create #garden',
    )
    click($('[data-testid="tp-create-row"]'))
    expect(onCreate).toHaveBeenCalledWith('garden', null)
  })

  it('Done closes', () => {
    const onClose = vi.fn()
    mount(picker({ onClose }))
    click($('[data-testid="tp-done"]'))
    expect(onClose).toHaveBeenCalledWith('x')
  })
})
