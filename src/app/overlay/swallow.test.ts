// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEventRouter, type EventRouter } from '../input/eventRouter'
import { domOverlayEvents, type OverlayEvents } from './events'
import type { Layer } from './layers'
import { createOverlayManager } from './manager'
import { routerOverlayEvents } from './routerEvents'
import { CLICK_WAIT_MS } from './swallow'

// The first tap outside an open card or menu only closes it (TB-06).

let router: EventRouter | undefined
const handles: Array<{ close(): void }> = []
afterEach(() => {
  handles.splice(0).forEach((h) => h.close())
  router?.destroy()
  router = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

type Kind = 'pen' | 'touch' | 'mouse'

/** A pointer-like event; jsdom has no PointerEvent constructor. */
function ptr(type: string, pointerType: Kind) {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, detail: 1 })
  Object.defineProperty(e, 'pointerType', { value: pointerType })
  Object.defineProperty(e, 'pointerId', { value: 1 })
  return e
}

/** Sends a whole tap at `el`; returns which events reached the page. */
function tap(el: Element, kind: Kind) {
  const seen: string[] = []
  const page = (e: Event) => seen.push(e.type)
  for (const t of ['pointerdown', 'pointerup', 'click'])
    el.addEventListener(t, page)
  const down = ptr('pointerdown', kind)
  el.dispatchEvent(down)
  el.dispatchEvent(ptr('pointerup', kind))
  el.dispatchEvent(ptr('click', kind))
  for (const t of ['pointerdown', 'pointerup', 'click'])
    el.removeEventListener(t, page)
  return { seen, downPrevented: down.defaultPrevented }
}

const kinds: Kind[] = ['pen', 'touch', 'mouse']
const setups: Array<[string, () => OverlayEvents]> = [
  ['DOM events', () => domOverlayEvents()],
  [
    'router events',
    () => {
      router = createEventRouter()
      return routerOverlayEvents(router)
    },
  ],
]

function world(make: () => OverlayEvents) {
  const m = createOverlayManager(make())
  const outside = document.createElement('button')
  const trigger = document.createElement('button')
  trigger.setAttribute('data-popup-trigger', '')
  document.body.append(outside, trigger)
  const open = (layer: Layer, swallowOutsideTap?: boolean) => {
    const el = document.createElement('div')
    document.body.append(el)
    const close = vi.fn()
    const h = m.open({
      id: layer,
      layer,
      close,
      inside: (t) => el.contains(t),
      swallowOutsideTap,
    })
    handles.push(h)
    return { el, close }
  }
  return { m, outside, trigger, open }
}

describe.each(setups)('first outside tap (%s)', (_name, make) => {
  it.each(kinds)(
    '%s: closes the card and swallows pointerdown, pointerup and click',
    (kind) => {
      const w = world(make)
      const card = w.open('card')
      const r = tap(w.outside, kind)
      expect(card.close).toHaveBeenCalledTimes(1)
      expect(r.seen).toEqual([])
      expect(r.downPrevented).toBe(true)
    },
  )

  it.each(kinds)('%s: the same holds for a menu', (kind) => {
    const w = world(make)
    const menu = w.open('menu')
    expect(tap(w.outside, kind).seen).toEqual([])
    expect(menu.close).toHaveBeenCalledTimes(1)
  })

  it('the next tap reaches the page again', () => {
    const w = world(make)
    w.open('card')
    tap(w.outside, 'touch')
    expect(tap(w.outside, 'touch').seen).toEqual([
      'pointerdown',
      'pointerup',
      'click',
    ])
  })

  it('a tap inside the card is not swallowed', () => {
    const w = world(make)
    const card = w.open('card')
    const inner = document.createElement('button')
    card.el.append(inner)
    expect(tap(inner, 'mouse').seen).toEqual([
      'pointerdown',
      'pointerup',
      'click',
    ])
    expect(card.close).not.toHaveBeenCalled()
  })

  it('a tap on a ▾ trigger is not swallowed', () => {
    const w = world(make)
    w.open('card')
    expect(tap(w.trigger, 'mouse').seen).toHaveLength(3)
  })

  it('a dialog closes on an outside tap but does not swallow it (off by default)', () => {
    const w = world(make)
    const d = w.open('dialog')
    expect(tap(w.outside, 'mouse').seen).toHaveLength(3)
    expect(d.close).toHaveBeenCalledTimes(1)
  })

  it('swallowOutsideTap: false lets the tap through on a card', () => {
    const w = world(make)
    w.open('card', false)
    expect(tap(w.outside, 'pen').seen).toHaveLength(3)
  })

  it('no overlay open: nothing is swallowed', () => {
    const w = world(make)
    expect(tap(w.outside, 'touch').seen).toHaveLength(3)
  })

  it('a pointercancel (the finger scrolled) ends the swallow', () => {
    const w = world(make)
    w.open('card')
    const seen: string[] = []
    w.outside.addEventListener('click', (e) => seen.push(e.type))
    w.outside.dispatchEvent(ptr('pointerdown', 'touch'))
    w.outside.dispatchEvent(ptr('pointercancel', 'touch'))
    w.outside.dispatchEvent(ptr('click', 'mouse'))
    expect(seen).toEqual(['click'])
  })

  it('a click long after the pointerup is not swallowed', () => {
    vi.useFakeTimers()
    const w = world(make)
    w.open('card')
    const seen: string[] = []
    w.outside.addEventListener('click', (e) => seen.push(e.type))
    w.outside.dispatchEvent(ptr('pointerdown', 'touch'))
    w.outside.dispatchEvent(ptr('pointerup', 'touch'))
    vi.advanceTimersByTime(CLICK_WAIT_MS + 1)
    w.outside.dispatchEvent(ptr('click', 'mouse'))
    expect(seen).toEqual(['click'])
  })
})

describe('router: the swallowed tap reaches no other router subscriber', () => {
  it('not even the gesture router or an editor', () => {
    router = createEventRouter()
    const m = createOverlayManager(routerOverlayEvents(router))
    const el = document.createElement('div')
    const outside = document.createElement('div')
    document.body.append(el, outside)
    m.open({
      id: 'c',
      layer: 'card',
      close: () => {},
      inside: (t) => el.contains(t),
    })
    const got = vi.fn()
    for (const t of ['pointerdown', 'pointerup', 'click'] as const) {
      router.subscribe(t, got, { priority: 1000 })
      router.subscribe(t, got, { priority: 400 })
    }
    outside.dispatchEvent(ptr('pointerdown', 'pen'))
    outside.dispatchEvent(ptr('pointerup', 'pen'))
    outside.dispatchEvent(ptr('click', 'pen'))
    expect(got).not.toHaveBeenCalled()
    expect(m.count()).toBe(0)
  })
})

describe('keyboard clicks are never swallowed', () => {
  it('a click with detail 0 (Enter on a button) passes and ends the swallow', () => {
    const m = createOverlayManager(domOverlayEvents())
    const el = document.createElement('div')
    const outside = document.createElement('button')
    document.body.append(el, outside)
    handles.push(
      m.open({
        id: 'c',
        layer: 'card',
        close: () => {},
        inside: (t) => el.contains(t),
      }),
    )
    const seen: string[] = []
    outside.addEventListener('click', (e) => seen.push(e.type))
    outside.dispatchEvent(ptr('pointerdown', 'mouse'))
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
    expect(seen).toEqual(['click'])
  })
})
