/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import type { OverlayEvents } from './events'
import { createOverlayManager } from './manager'
import { openInTopLayer } from './topLayer'

function setup() {
  const esc = new Set<() => void>()
  const pd = new Set<(t: Element) => boolean | void>()
  const ev: OverlayEvents = {
    onEscape: (cb) => (esc.add(cb), () => esc.delete(cb)),
    onPointerDown: (cb) => (pd.add(cb), () => pd.delete(cb)),
    onBackground: () => () => {},
  }
  const m = createOverlayManager(ev)
  const popEl = () => {
    const el = document.createElement('div') as HTMLElement & {
      showPopover: () => void
      hidePopover: () => void
    }
    el.showPopover = vi.fn()
    el.hidePopover = vi.fn()
    document.body.append(el)
    return el
  }
  return {
    m,
    popEl,
    esc: () => [...esc].forEach((f) => f()),
    tap: (t: Element) => [...pd].forEach((f) => f(t)),
  }
}

describe('openInTopLayer', () => {
  it('shows a manual popover and registers it with the manager', () => {
    const { m, popEl } = setup()
    const el = popEl()
    openInTopLayer(el, { id: 'a', layer: 'menu' }, m)
    expect(el.getAttribute('popover')).toBe('manual')
    expect(el.showPopover).toHaveBeenCalledOnce()
    expect(m.isOpen('a')).toBe(true)
  })

  it('Esc hides it and runs onClose once', () => {
    const { m, popEl, esc } = setup()
    const el = popEl()
    const onClose = vi.fn()
    openInTopLayer(el, { id: 'a', layer: 'menu', onClose }, m)
    esc()
    esc()
    expect(el.hidePopover).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
    expect(m.isOpen('a')).toBe(false)
  })

  it('a tap outside closes it; a tap inside does not', () => {
    const { m, popEl, tap } = setup()
    const el = popEl()
    const child = document.createElement('button')
    el.append(child)
    openInTopLayer(el, { id: 'a', layer: 'card' }, m)
    tap(child)
    expect(m.isOpen('a')).toBe(true)
    tap(document.body)
    expect(m.isOpen('a')).toBe(false)
    expect(el.hidePopover).toHaveBeenCalledOnce()
  })

  it('one open at a time: a second floating one closes the first', () => {
    const { m, popEl } = setup()
    const a = popEl()
    const b = popEl()
    openInTopLayer(a, { id: 'a', layer: 'menu' }, m)
    openInTopLayer(b, { id: 'b', layer: 'menu' }, m)
    expect(m.isOpen('a')).toBe(false)
    expect(a.hidePopover).toHaveBeenCalledOnce()
    expect(m.top()).toBe('b')
  })

  it('handle.close hides it', () => {
    const { m, popEl } = setup()
    const el = popEl()
    openInTopLayer(el, { id: 'a', layer: 'menu' }, m).close()
    expect(el.hidePopover).toHaveBeenCalledOnce()
    expect(m.count()).toBe(0)
  })

  it('dialog mode: showModal, its own cancel goes through the manager', () => {
    const { m } = setup()
    const d = document.createElement('dialog')
    let open = false
    Object.defineProperty(d, 'open', { get: () => open })
    d.showModal = vi.fn(() => {
      open = true
    })
    d.close = vi.fn(() => {
      open = false
    })
    document.body.append(d)
    const onClose = vi.fn()
    openInTopLayer(d, { id: 'd', layer: 'sheet', mode: 'dialog', onClose }, m)
    expect(d.showModal).toHaveBeenCalledOnce()
    const cancel = new Event('cancel', { cancelable: true })
    d.oncancel?.(cancel)
    expect(cancel.defaultPrevented).toBe(true)
    expect(d.close).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
    expect(d.oncancel).toBeNull()
  })

  it('without browser support the manager entry still works', () => {
    const { m, esc } = setup()
    const el = document.createElement('div')
    const onClose = vi.fn()
    openInTopLayer(el, { id: 'x', layer: 'menu', onClose }, m)
    esc()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
