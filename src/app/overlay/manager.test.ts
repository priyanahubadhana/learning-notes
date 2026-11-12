/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { domOverlayEvents, type OverlayEvents } from './events'
import { createOverlayManager, overlay } from './manager'
import type { Layer } from './layers'

function fakeEvents() {
  const l = {
    esc: new Set<() => void>(),
    pd: new Set<(t: Element) => void>(),
    bg: new Set<() => void>(),
  }
  const ev: OverlayEvents = {
    onEscape: (cb) => (l.esc.add(cb), () => l.esc.delete(cb)),
    onPointerDown: (cb) => (l.pd.add(cb), () => l.pd.delete(cb)),
    onBackground: (cb) => (l.bg.add(cb), () => l.bg.delete(cb)),
  }
  return {
    ev,
    l,
    listeners: () => l.esc.size + l.pd.size + l.bg.size,
    esc: () => [...l.esc].forEach((f) => f()),
    pd: (t: Element) => [...l.pd].forEach((f) => f(t)),
    bg: () => [...l.bg].forEach((f) => f()),
  }
}

function setup() {
  const f = fakeEvents()
  const m = createOverlayManager(f.ev)
  const mk = (
    id: string,
    layer: Layer,
    extra: {
      parentId?: string
      opener?: HTMLElement
      persistent?: boolean
    } = {},
  ) => {
    const el = document.createElement('div')
    document.body.append(el)
    const close = vi.fn()
    const h = m.open({
      id,
      layer,
      close,
      inside: (t) => el.contains(t),
      ...extra,
    })
    return { el, close, h }
  }
  return { f, m, mk }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('overlay manager', () => {
  it('same layer: previous closes', () => {
    const { m, mk } = setup()
    const a = mk('a', 'dialog')
    mk('b', 'dialog')
    expect(a.close).toHaveBeenCalledTimes(1)
    expect(m.isOpen('a')).toBe(false)
    expect(m.isOpen('b')).toBe(true)
  })
  it('menu/card/sheet close each other, other layers stay', () => {
    const { m, mk } = setup()
    const menu = mk('m', 'menu')
    const dlg = mk('d', 'dialog')
    const card = mk('c', 'card')
    expect(menu.close).toHaveBeenCalled()
    expect(dlg.close).not.toHaveBeenCalled()
    const sheet = mk('s', 'sheet')
    expect(card.close).toHaveBeenCalled()
    expect(m.count()).toBe(2)
    expect(sheet.close).not.toHaveBeenCalled()
  })
  it('parent chain stays open', () => {
    const { m, mk } = setup()
    const p = mk('p', 'menu')
    const c = mk('c', 'card', { parentId: 'p' })
    expect(p.close).not.toHaveBeenCalled()
    expect(m.count()).toBe(2)
    c.h.close()
    expect(m.isOpen('p')).toBe(true)
  })
  it('Esc closes only the top-most and focuses its opener', () => {
    const { f, m, mk } = setup()
    const opener = document.createElement('button')
    document.body.append(opener)
    const menu = mk('m', 'menu')
    const dlg = mk('d', 'dialog', { opener })
    expect(m.top()).toBe('d')
    f.esc()
    expect(dlg.close).toHaveBeenCalled()
    expect(menu.close).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(opener)
    expect(m.top()).toBe('m')
  })
  it('equal layers: newest is top', () => {
    const { m, mk } = setup()
    mk('p', 'menu')
    mk('c', 'menu', { parentId: 'p' })
    expect(m.top()).toBe('c')
  })
  it('pointerdown outside closes; inside, trigger and child do not', () => {
    const { f, m, mk } = setup()
    const p = mk('p', 'menu')
    const c = mk('c', 'card', { parentId: 'p' })
    const trig = document.createElement('button')
    trig.setAttribute('data-popup-trigger', '')
    document.body.append(trig)
    f.pd(trig)
    f.pd(c.el)
    expect(m.count()).toBe(2)
    f.pd(p.el)
    expect(c.close).toHaveBeenCalledTimes(1)
    expect(m.isOpen('p')).toBe(true)
    const out = document.createElement('div')
    document.body.append(out)
    f.pd(out)
    expect(m.count()).toBe(0)
    expect(p.close).toHaveBeenCalledTimes(1)
  })
  it('background closes menus and cards only', () => {
    const { f, m, mk } = setup()
    mk('m', 'menu')
    mk('d', 'dialog')
    f.bg()
    expect(m.count()).toBe(1)
    expect(m.top()).toBe('d')
  })
  it('double close is a no-op', () => {
    const { m, mk } = setup()
    const a = mk('a', 'menu')
    a.h.close()
    a.h.close()
    expect(a.close).toHaveBeenCalledTimes(1)
    expect(m.count()).toBe(0)
  })
  it('listeners only while something is open', () => {
    const { f, mk } = setup()
    expect(f.listeners()).toBe(0)
    const a = mk('a', 'menu')
    expect(f.listeners()).toBe(3)
    a.h.close()
    expect(f.listeners()).toBe(0)
  })
  it('works with the DOM default events and the lazy singleton', () => {
    const m = createOverlayManager(domOverlayEvents(document))
    const close = vi.fn()
    m.open({ id: 'x', layer: 'menu', close, inside: () => false })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(close).toHaveBeenCalledTimes(1)
    expect(overlay.count()).toBe(0)
    const h = overlay.open({
      id: 'y',
      layer: 'toast',
      close: () => {},
      inside: () => false,
    })
    expect(overlay.isOpen('y')).toBe(true)
    h.close()
  })
})

describe('overlay manager: persistent bars and pills', () => {
  it('stay open on outside tap, Esc, background and another overlay opening', () => {
    const { f, m, mk } = setup()
    const bar = mk('reader-bar', 'bar', { persistent: true })
    const pill = mk('reader-pill', 'pill', { persistent: true })
    const outside = document.createElement('p')
    document.body.append(outside)
    f.pd(outside)
    f.esc()
    f.bg()
    mk('menu', 'menu')
    mk('other-bar', 'bar')
    mk('sheet', 'sheet')
    expect(bar.close).not.toHaveBeenCalled()
    expect(pill.close).not.toHaveBeenCalled()
    expect(m.isOpen('reader-bar') && m.isOpen('reader-pill')).toBe(true)
  })

  it('Esc and an outside tap still close the normal overlay above them', () => {
    const { f, m, mk } = setup()
    const bar = mk('reader-bar', 'bar', { persistent: true })
    const menu = mk('menu', 'menu')
    f.esc()
    expect(menu.close).toHaveBeenCalledTimes(1)
    expect(m.isOpen('reader-bar')).toBe(true)
    const card = mk('card', 'card')
    f.pd(document.body)
    expect(card.close).toHaveBeenCalledTimes(1)
    expect(bar.close).not.toHaveBeenCalled()
  })

  it('takes part in layer order and closes by its own handle or the same id', () => {
    const { m, mk } = setup()
    const pill = mk('pill', 'pill', { persistent: true })
    expect(m.top()).toBe('pill')
    mk('menu', 'menu')
    expect(m.top()).toBe('menu')
    const again = mk('pill', 'pill', { persistent: true })
    expect(pill.close).toHaveBeenCalledTimes(1)
    again.h.close()
    expect(again.close).toHaveBeenCalledTimes(1)
    expect(m.isOpen('pill')).toBe(false)
  })

  it('a lone persistent bar ignores Esc', () => {
    const { f, m, mk } = setup()
    const bar = mk('bar', 'bar', { persistent: true })
    f.esc()
    expect(bar.close).not.toHaveBeenCalled()
    expect(m.count()).toBe(1)
  })
})
