// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../core/db'
import {
  $,
  byLabel,
  click,
  cleanDom,
  mount,
} from '../../design/parts/testHelpers'
import { resetEventRouterForTests } from '../input/eventRouter'
import Shell, { type ShellProps } from './Shell'

afterEach(() => {
  cleanDom()
  resetEventRouterForTests()
  window.innerWidth = 1024
  window.innerHeight = 768
})

const size = (w: number, ht: number) => {
  window.innerWidth = w
  window.innerHeight = ht
}

const Side = ({ hidden }: { hidden?: boolean }) =>
  h('aside', { id: 'sidebar', 'data-hidden': String(hidden) }, 'Sidebar')
const Panel = ({ docked }: { docked?: boolean }) =>
  h('aside', { id: 'panel', 'data-docked': String(docked) }, 'Panel')

const props = (over: Partial<ShellProps> = {}): ShellProps => ({
  space: 'notebooks',
  spaces: ['home', 'library', 'notebooks', 'review'],
  onSelectSpace: vi.fn(),
  gear: {
    db,
    workspaceId: 'w',
    theme: 'night',
    onTheme: vi.fn(),
    settingsOpen: false,
    dataOpen: false,
    onOpenSettings: vi.fn(),
    onOpenData: vi.fn(),
    onOpenHelp: vi.fn(),
  },
  routeKey: '#/a',
  title: 'Cells',
  sidebarHidden: false,
  onToggleSidebar: vi.fn(),
  drawerOpen: false,
  onOpenDrawer: vi.fn(),
  onCloseDrawer: vi.fn(),
  hasPanel: false,
  panelOpen: false,
  onPanelOpen: vi.fn(),
  sidebarWidth: 260,
  onSidebarWidth: vi.fn(),
  onSearch: vi.fn(),
  onSlot: vi.fn(),
  onStackSlot: vi.fn(),
  sidebar: h(Side, {}),
  panel: h(Panel, {}),
  children: h('main', { 'data-page-scroller': '' }, 'Page'),
  ...over,
})

describe('Shell frame (SH-01)', () => {
  it('draws rail, top bar, sidebar and page, with a skip link first', () => {
    mount(h(Shell, props()))
    expect($('.sh-frame')?.firstElementChild?.textContent).toBe(
      'Skip to content',
    )
    expect($('nav[data-shell-rail]')).not.toBeNull()
    expect($('nav[data-shell-tabbar]')).toBeNull()
    expect($('header[data-shell-top]')).not.toBeNull()
    expect($('#sidebar')).not.toBeNull()
    expect($('main')).not.toBeNull()
  })

  it('the skip link moves focus to the page area', () => {
    mount(h(Shell, props()))
    click($('.sh-skip'))
    expect(document.activeElement?.hasAttribute('data-page-scroller')).toBe(
      true,
    )
  })

  it('draws the sidebar at 288 when the saved width is still the old default', () => {
    mount(h(Shell, props()))
    expect($('.sh-sidewrap')?.style.getPropertyValue('--sidebar-width')).toBe(
      '288px',
    )
  })

  it('shows the phone tab bar instead of the rail on a phone', () => {
    size(390, 844)
    mount(h(Shell, props()))
    expect($('nav[data-shell-rail]')).toBeNull()
    expect($('nav[data-shell-tabbar]')).not.toBeNull()
  })

  it('has one Spaces navigation at a time', () => {
    mount(h(Shell, props()))
    expect(document.querySelectorAll('nav[aria-label="Spaces"]')).toHaveLength(
      1,
    )
  })
})

describe('Shell columns (SH-07, SH-08)', () => {
  it('docks the panel and steps the sidebar aside between 640 and 1179', () => {
    mount(h(Shell, props({ hasPanel: true, panelOpen: true })))
    expect($('#panel')?.getAttribute('data-docked')).toBe('true')
    expect($('.sh-sidewrap')?.getAttribute('data-state')).toBe('hidden')
  })

  it('the sidebar toggle opens the stepped-aside sidebar over the page; Esc closes it', () => {
    const onToggleSidebar = vi.fn()
    mount(h(Shell, props({ hasPanel: true, panelOpen: true, onToggleSidebar })))
    // It opens a drawer over the page, so it is named like the phone's button.
    click($('.sh-wide-only button'))
    expect(onToggleSidebar).not.toHaveBeenCalled() // the saved choice is untouched
    expect($('.sh-overwrap #sidebar')).not.toBeNull()
    expect($('.sh-scrim')).not.toBeNull()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    // closed by the router handler
    return Promise.resolve().then(() => {
      expect($('.sh-overwrap')).toBeNull()
    })
  })

  it('1180 (iPad landscape): the panel opens over the page and Esc closes it', () => {
    size(1180, 820)
    const onPanelOpen = vi.fn()
    mount(h(Shell, props({ hasPanel: true, panelOpen: true, onPanelOpen })))
    expect($('#panel')?.getAttribute('data-docked')).toBe('false')
    expect($('.sh-sidewrap')?.getAttribute('data-state')).toBe('docked')
    expect($('.sh-panelwrap')?.getAttribute('data-state')).toBe('over')
    expect($('.sh-panelwrap')?.getAttribute('style')).toContain('--panel-left')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onPanelOpen).toHaveBeenCalledWith(false)
  })

  it('820 (iPad portrait): the sidebar sits on the rail', () => {
    size(820, 1180)
    mount(h(Shell, props()))
    expect($('.sh-sidewrap')?.getAttribute('data-state')).toBe('hidden')
    expect($('.sh-wide-only button')?.getAttribute('aria-label')).toBe(
      'Open menu',
    )
  })

  it('docks both columns when the page keeps its writing width', () => {
    size(1366, 1024)
    mount(h(Shell, props({ hasPanel: true, panelOpen: true })))
    expect($('#sidebar')).not.toBeNull()
    expect($('#panel')?.getAttribute('data-docked')).toBe('true')
    expect($('[role="separator"]')).not.toBeNull()
  })

  it('hides the sidebar with the toggle, which asks the app to remember', () => {
    size(1366, 1024)
    const onToggleSidebar = vi.fn()
    mount(h(Shell, props({ sidebarHidden: true, onToggleSidebar })))
    expect($('#sidebar')?.getAttribute('data-hidden')).toBe('true')
    click(byLabel('Show menu'))
    expect(onToggleSidebar).toHaveBeenCalled()
  })

  it('a phone panel is an overlay and Esc closes it', () => {
    size(390, 844)
    const onPanelOpen = vi.fn()
    mount(h(Shell, props({ hasPanel: true, panelOpen: true, onPanelOpen })))
    expect($('#panel')?.getAttribute('data-docked')).toBe('false')
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(onPanelOpen).toHaveBeenCalledWith(false)
  })

  it('a phone drawer has a scrim that closes it', () => {
    size(390, 844)
    const onCloseDrawer = vi.fn()
    mount(h(Shell, props({ drawerOpen: true, onCloseDrawer })))
    click($('.sh-scrim-phone'))
    expect(onCloseDrawer).toHaveBeenCalled()
  })
})
