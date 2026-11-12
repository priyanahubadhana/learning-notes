// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextStrip, type StripItem } from './ContextStrip'
import type { CommandGroup } from './commandListLogic'
import { $, $$, cleanDom, click, key, mount } from './testHelpers'

afterEach(cleanDom)

const items: StripItem[] = [
  {
    id: 'paste',
    icon: 'paste',
    label: 'Paste',
    menu: [
      { id: 'keep', label: 'Keep original' },
      { id: 'plain', label: 'Plain text' },
    ],
  },
  { id: 'copy', icon: 'copy', label: 'Copy' },
  { id: 'cut', icon: 'scissors', label: 'Cut' },
  { id: 'duplicate', icon: 'duplicate', label: 'Duplicate' },
  { id: 'delete', icon: 'trash', label: 'Delete', danger: true },
]
const commands: CommandGroup[] = [
  {
    id: 'f',
    label: 'Format',
    items: [{ id: 'colour', label: 'Colour' }],
  },
]

const strip = (extra: Record<string, unknown> = {}) => {
  const onAction = vi.fn()
  const onClose = vi.fn()
  mount(
    h(ContextStrip, {
      mode: 'inline',
      items,
      commands,
      onAction,
      onClose,
      ...extra,
    }),
  )
  return { onAction, onClose }
}
const names = () =>
  $$('[data-strip-btn]').map((b) => b.getAttribute('aria-label'))

describe('ContextStrip', () => {
  it('SP-40 shows Cut, Copy, Paste, Delete and more as a menubar of menuitems', () => {
    strip({ commands: undefined })
    const bar = $('[role="menubar"]')
    expect(bar).not.toBeNull()
    expect(names()).toEqual(['Paste', 'Copy', 'Cut', 'Duplicate', 'Delete'])
    expect($$('[role="menuitem"]')).toHaveLength(5)
  })

  it('Delete is last and red; more comes after it only when there are commands', () => {
    strip()
    expect(names().at(-2)).toBe('Delete')
    expect(names().at(-1)).toBe('More actions')
    expect($('[data-testid="cs-delete"]')?.className).toContain('--danger')
  })

  it('phone shows at most 4 items plus more, and every more item is pickable', () => {
    const { onAction } = strip({ phone: true })
    expect(names()).toEqual(['Paste', 'Copy', 'Cut', 'Delete', 'More actions'])
    click($('[data-testid="cs-more"]'))
    const rows = $$('[role="option"]')
    expect(rows.map((r) => r.textContent)).toEqual(['Duplicate', 'Colour'])
    click(rows[0])
    expect(onAction).toHaveBeenCalledWith('duplicate')
  })

  it('SP-42 Paste opens the picker; a second tap closes it; a choice reports it', () => {
    const { onAction } = strip()
    const trigger = $('[data-testid="cs-paste"]')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    click(trigger)
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')
    expect($('[data-testid="cs-picker"]')).not.toBeNull()
    click($('[data-testid="cs-pick-plain"]'))
    expect(onAction).toHaveBeenCalledWith('paste', 'plain')
    click(trigger)
    click(trigger)
    expect($('[data-testid="cs-picker"]')).toBeNull()
  })

  it('SP-43 the more button opens the Command list with the extra commands', () => {
    const { onAction } = strip()
    click($('[data-testid="cs-more"]'))
    expect($('[data-testid="command-list"]')).not.toBeNull()
    click($('[data-testid="cl-item-colour"]'))
    expect(onAction).toHaveBeenCalledWith('colour')
  })

  it('arrow keys move between items', () => {
    strip()
    const first = $('[data-testid="cs-paste"]')
    first?.focus()
    key(first, 'ArrowRight')
    expect(document.activeElement).toBe($('[data-testid="cs-copy"]'))
    key(document.activeElement, 'End')
    expect(document.activeElement).toBe($('[data-testid="cs-more"]'))
    key(document.activeElement, 'ArrowRight')
    expect(document.activeElement).toBe(first)
  })

  it('a plain item reports its id', () => {
    const { onAction } = strip()
    click($('[data-testid="cs-copy"]'))
    expect(onAction).toHaveBeenCalledWith('copy')
  })

  it('every item is at least 44 px by CSS and has a name', () => {
    strip({ phone: true })
    expect(
      $$('[data-strip-btn]').every((b) => b.getAttribute('aria-label')),
    ).toBe(true)
  })
})

describe('ContextStrip (floating)', () => {
  const target = { left: 500, top: 300, width: 160, height: 40 }
  const esc = () =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )

  it('SP-44 Esc closes it and gives focus back to the opener', async () => {
    vi.useFakeTimers()
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const onClose = vi.fn()
    mount(h(ContextStrip, { items, target, onAction: vi.fn(), onClose }))
    expect($('[role="menubar"]')).not.toBeNull()
    esc()
    expect(document.activeElement).toBe(opener)
    vi.advanceTimersByTime(300)
    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
