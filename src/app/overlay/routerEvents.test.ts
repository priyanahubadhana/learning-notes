// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEventRouter, type EventRouter } from '../input/eventRouter'
import { createOverlayManager } from './manager'
import { routerOverlayEvents } from './routerEvents'

let router: EventRouter
afterEach(() => router?.destroy())

const key = (k: string) => new KeyboardEvent('keydown', { key: k })

describe('routerOverlayEvents', () => {
  it('Escape: calls back and claims the key; other keys pass on', () => {
    router = createEventRouter()
    const cb = vi.fn()
    const off = routerOverlayEvents(router).onEscape(cb)
    expect(router.dispatch('keydown', key('a'))).toBe(false)
    expect(router.dispatch('keydown', key('Escape'))).toBe(true)
    expect(cb).toHaveBeenCalledTimes(1)
    off()
    expect(router.domListenerCount()).toBe(0)
  })

  it('pointer-down gives the target element and does not claim it', () => {
    router = createEventRouter()
    const el = document.createElement('div')
    document.body.append(el)
    const cb = vi.fn()
    const off = routerOverlayEvents(router).onPointerDown(cb)
    const ev = new Event('pointerdown') as PointerEvent
    Object.defineProperty(ev, 'target', { value: el })
    expect(router.dispatch('pointerdown', ev)).toBe(false)
    expect(cb).toHaveBeenCalledWith(el)
    off()
    el.remove()
  })

  it('background: router background and navigation both call back; off removes all', () => {
    router = createEventRouter()
    const cb = vi.fn()
    const off = routerOverlayEvents(router, window).onBackground(cb)
    router.dispatch('background', { reason: 'hidden', event: new Event('x') })
    window.dispatchEvent(new Event('hashchange'))
    window.dispatchEvent(new Event('popstate'))
    expect(cb).toHaveBeenCalledTimes(3)
    off()
    window.dispatchEvent(new Event('hashchange'))
    expect(cb).toHaveBeenCalledTimes(3)
    expect(router.subscriberCount()).toBe(0)
  })

  it('drives the overlay manager: Escape closes the top overlay; listeners leave at zero', () => {
    router = createEventRouter()
    const m = createOverlayManager(routerOverlayEvents(router))
    const close = vi.fn()
    m.open({ id: 'm', layer: 'menu', close, inside: () => false })
    expect(router.subscriberCount()).toBeGreaterThan(0)
    router.dispatch('keydown', key('Escape'))
    expect(close).toHaveBeenCalledTimes(1)
    expect(router.subscriberCount()).toBe(0)
    expect(router.domListenerCount()).toBe(0)
  })
})
