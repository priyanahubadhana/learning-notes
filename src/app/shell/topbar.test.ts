// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  $,
  byLabel,
  click,
  cleanDom,
  mount,
} from '../../design/parts/testHelpers'
import { ShellTopBar, type ShellTopBarProps } from './ShellTopBar'

afterEach(cleanDom)

const props = (over: Partial<ShellTopBarProps> = {}): ShellTopBarProps => ({
  space: 'notebooks',
  title: 'Biology / Cells',
  sidebarHidden: false,
  drawerOpen: false,
  onOpenDrawer: vi.fn(),
  onToggleSidebar: vi.fn(),
  onSelectSpace: vi.fn(),
  onSearch: vi.fn(),
  onSlot: vi.fn(),
  ...over,
})

describe('ShellTopBar (SH-04, SH-05)', () => {
  it('is a banner with Back, Forward, Undo, Redo and Search', () => {
    mount(h(ShellTopBar, props()))
    expect($('header')?.getAttribute('aria-label')).toBe('Top bar')
    for (const name of ['Back', 'Forward', 'Undo', 'Redo', 'Search']) {
      expect(byLabel(name), name).not.toBeNull()
    }
  })

  it('keeps Undo and Redo visible, and greyed out when there is nothing to do', () => {
    mount(h(ShellTopBar, props()))
    expect(byLabel<HTMLButtonElement>('Undo')?.disabled).toBe(true)
    expect(byLabel<HTMLButtonElement>('Redo')?.disabled).toBe(true)
  })

  it('shows the pages panel toggle only while a notebook or book is open', () => {
    const none = mount(h(ShellTopBar, props()))
    expect($('[data-testid="panel-toggle"]')).toBeNull()
    none.unmount()
    const onToggle = vi.fn()
    mount(h(ShellTopBar, props({ panel: { open: false, onToggle } })))
    click($('[data-testid="panel-toggle"]'))
    expect(onToggle).toHaveBeenCalled()
  })

  it('names the sidebar toggle by what it will do', () => {
    const shown = mount(h(ShellTopBar, props()))
    expect(byLabel('Hide menu')).not.toBeNull()
    shown.unmount()
    mount(h(ShellTopBar, props({ sidebarHidden: true })))
    expect(byLabel('Show menu')).not.toBeNull()
  })

  it('opens Search from its button', () => {
    const p = props()
    mount(h(ShellTopBar, p))
    click(byLabel('Search'))
    expect(p.onSearch).toHaveBeenCalled()
  })

  it('earlier crumbs are buttons; the last is plain text', () => {
    const p = props()
    mount(h(ShellTopBar, p))
    const nav = $('nav[aria-label="You are here"]')
    expect(nav?.querySelector('b')?.textContent).toBe('Biology / Cells')
    click(nav?.querySelector('button') ?? null)
    expect(p.onSelectSpace).toHaveBeenCalledWith('notebooks')
  })

  it('gives the screen a slot for its own items', () => {
    const p = props()
    mount(h(ShellTopBar, p))
    expect(p.onSlot).toHaveBeenCalledWith(expect.any(HTMLElement))
  })
})
