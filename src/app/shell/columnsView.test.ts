// @vitest-environment jsdom
import { createElement as h, act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  $,
  byLabel,
  click,
  cleanDom,
  mount,
} from '../../design/parts/testHelpers'
import { resetEventRouterForTests } from '../input/eventRouter'
import { OverSide, PanelSlot, SideSlot } from './ColumnSlots'
import { columnsFor, type ColumnInput } from './columns'
import { useEscape } from './useEscape'

afterEach(() => {
  cleanDom()
  resetEventRouterForTests()
})

const cols = (over: Partial<ColumnInput> = {}) =>
  columnsFor({
    width: 1366,
    height: 1024,
    sidebarHidden: false,
    panelOpen: false,
    sideOver: false,
    ...over,
  })
const side = ({ hidden }: { hidden: boolean }) =>
  h('aside', { id: 'sidebar', 'data-hidden': String(hidden) }, 'Sidebar')

describe('SideSlot / OverSide (SH-07)', () => {
  it('draws the sidebar in the row with the chosen width', () => {
    mount(h(SideSlot, { cols: cols(), width: 288, render: side }))
    const wrap = $('.sh-sidewrap')
    expect(wrap?.getAttribute('data-state')).toBe('docked')
    expect(wrap?.style.getPropertyValue('--sidebar-width')).toBe('288px')
    expect($('#sidebar')?.getAttribute('data-hidden')).toBe('false')
  })

  it('tells the sidebar to hide when its toggle is off', () => {
    mount(
      h(SideSlot, {
        cols: cols({ sidebarHidden: true }),
        width: 288,
        render: side,
      }),
    )
    expect($('#sidebar')?.getAttribute('data-hidden')).toBe('true')
  })

  it('draws the sidebar over the page only in the "over" state, with a scrim that closes it', () => {
    const over = cols({ width: 820, panelOpen: true, sideOver: true })
    const onClose = vi.fn()
    mount(
      h('div', null, [
        h(SideSlot, { key: 'a', cols: over, width: 288, render: side }),
        h(OverSide, { key: 'b', cols: over, render: side, onClose }),
      ]),
    )
    expect($$count('#sidebar')).toBe(1)
    expect($('.sh-overwrap')).not.toBeNull()
    click(byLabel('Close menu'))
    expect(onClose).toHaveBeenCalled()
  })

  it('draws no scrim when the sidebar is docked', () => {
    mount(h(OverSide, { cols: cols(), render: side, onClose: () => {} }))
    expect($('.sh-scrim')).toBeNull()
  })
})

const $$count = (sel: string) => document.body.querySelectorAll(sel).length

describe('PanelSlot (SH-08)', () => {
  const panel = ({ docked, width }: { docked: boolean; width: number }) =>
    h('aside', { id: 'panel', 'data-docked': String(docked) }, String(width))

  it('draws nothing while closed', () => {
    mount(h(PanelSlot, { cols: cols(), render: panel }))
    expect($('#panel')).toBeNull()
  })
  it('docks at 288 when open on a computer or iPad', () => {
    mount(h(PanelSlot, { cols: cols({ panelOpen: true }), render: panel }))
    expect($('#panel')?.getAttribute('data-docked')).toBe('true')
    expect($('#panel')?.textContent).toBe('288')
  })
  it('is an overlay on a phone', () => {
    mount(
      h(PanelSlot, {
        cols: cols({ width: 390, height: 844, panelOpen: true }),
        render: panel,
      }),
    )
    expect($('#panel')?.getAttribute('data-docked')).toBe('false')
    expect($('.sh-panelwrap')?.getAttribute('data-state')).toBe('over')
  })
})

describe('useEscape', () => {
  const Probe = ({ active, close }: { active: boolean; close: () => void }) => {
    useEscape(active, close)
    return null
  }
  const esc = () =>
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })

  it('closes on Esc only while active, through the shared router', () => {
    const close = vi.fn()
    const m = mount(h(Probe, { active: false, close }))
    esc()
    expect(close).not.toHaveBeenCalled()
    m.rerender(h(Probe, { active: true, close }))
    esc()
    expect(close).toHaveBeenCalledTimes(1)
  })
})
