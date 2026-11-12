import { afterEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  PRIORITY,
  createEventRouter,
  getEventRouter,
  onRouted,
  resetEventRouterForTests,
  type AppSwitchEvent,
  type RouterTargets,
} from './eventRouter'

type Fn = (e: Event) => void

/** Fake document + window that count every add/remove. */
function fakeTargets(visibility: DocumentVisibilityState = 'visible') {
  const state = { visibility, adds: 0, removes: 0 }
  const make = () => {
    const map = new Map<string, Set<Fn>>()
    return {
      map,
      addEventListener(t: string, fn: Fn) {
        state.adds++
        if (!map.has(t)) map.set(t, new Set())
        map.get(t)!.add(fn)
      },
      removeEventListener(t: string, fn: Fn) {
        state.removes++
        map.get(t)?.delete(fn)
      },
    }
  }
  const doc = make()
  const win = make()
  const targets = {
    doc: Object.defineProperty(doc, 'visibilityState', {
      get: () => state.visibility,
    }),
    win,
  } as unknown as RouterTargets
  const fire = (where: 'doc' | 'win', type: string, target?: unknown) => {
    const m = where === 'doc' ? doc.map : win.map
    const e = { type, target: target ?? win } as unknown as Event
    for (const fn of [...(m.get(type) ?? [])]) fn(e)
  }
  const live = () =>
    [...doc.map.values(), ...win.map.values()].reduce((n, s) => n + s.size, 0)
  return { state, doc, win, targets, fire, live }
}

interface FakeNode {
  nodeType: number
  parent?: FakeNode
  contains: (o: unknown) => boolean
}

/** A tiny fake node tree: contains() walks parents. */
function node(parent?: FakeNode): FakeNode {
  const n: FakeNode = {
    nodeType: 1,
    parent,
    contains(o) {
      for (let c = o as FakeNode | undefined; c; c = c.parent)
        if (c === n) return true
      return false
    },
  }
  return n
}
const asEl = (n: unknown) => n as Element
const ev = (target: unknown) => ({ target }) as unknown as KeyboardEvent
const pev = (target: unknown) => ({ target }) as unknown as PointerEvent

afterEach(() => {
  resetEventRouterForTests()
  vi.restoreAllMocks()
})

describe('lazy listeners', () => {
  it('adds no listener when nobody subscribes', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    expect(r.domListenerCount()).toBe(0)
    expect(f.state.adds).toBe(0)
  })

  it('adds one real listener on the first subscriber, none more after', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    r.subscribe('keydown', () => {})
    r.subscribe('keydown', () => {})
    expect(f.state.adds).toBe(1)
    expect(r.domListenerCount()).toBe(1)
    expect(f.doc.map.get('keydown')?.size).toBe(1)
  })

  it('removes the listener when the last subscriber leaves', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const a = r.subscribe('pointerdown', () => {})
    const b = r.subscribe('pointerdown', () => {})
    a()
    expect(r.domListenerCount()).toBe(1)
    b()
    expect(r.domListenerCount()).toBe(0)
    expect(f.state.removes).toBe(1)
    expect(f.live()).toBe(0)
  })

  it('uses capture on document listeners', () => {
    const f = fakeTargets()
    const add = vi.spyOn(f.doc, 'addEventListener')
    const r = createEventRouter(f.targets)
    r.subscribe('focusin', () => {})
    expect(add).toHaveBeenCalledWith('focusin', expect.any(Function), {
      capture: true,
    })
  })

  it('removes with the same capture option it added with', () => {
    const f = fakeTargets()
    const rem = vi.spyOn(f.doc, 'removeEventListener')
    const r = createEventRouter(f.targets)
    r.subscribe('focusin', () => {})()
    expect(rem).toHaveBeenCalledWith('focusin', expect.any(Function), {
      capture: true,
    })
  })

  it('listens to each routed pointer/key/focus type separately', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const types = [
      'keydown',
      'keyup',
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'focusin',
      'focusout',
    ] as const
    for (const t of types) r.subscribe(t, () => {})
    expect(r.domListenerCount()).toBe(8)
    expect(f.win.map.size).toBe(0)
  })

  it('background attaches visibilitychange (doc), pagehide and blur (win)', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const off = r.subscribe('background', () => {})
    expect(f.doc.map.get('visibilitychange')?.size).toBe(1)
    expect(f.win.map.get('pagehide')?.size).toBe(1)
    expect(f.win.map.get('blur')?.size).toBe(1)
    expect(f.win.map.get('pageshow')?.size ?? 0).toBe(0)
    expect(r.domListenerCount()).toBe(3)
    off()
    expect(r.domListenerCount()).toBe(0)
  })

  it('foreground attaches visibilitychange, pageshow and focus', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    r.subscribe('foreground', () => {})
    expect(f.win.map.get('pageshow')?.size).toBe(1)
    expect(f.win.map.get('focus')?.size).toBe(1)
    expect(r.domListenerCount()).toBe(3)
  })

  it('shares visibilitychange between background and foreground', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const a = r.subscribe('background', () => {})
    r.subscribe('foreground', () => {})
    expect(f.doc.map.get('visibilitychange')?.size).toBe(1)
    expect(r.domListenerCount()).toBe(5)
    a()
    expect(f.doc.map.get('visibilitychange')?.size).toBe(1)
    expect(r.domListenerCount()).toBe(3)
  })

  it('destroy removes every listener and subscriber', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    r.subscribe('keydown', () => {})
    r.subscribe('background', () => {})
    r.subscribe('foreground', () => {})
    r.destroy()
    expect(r.domListenerCount()).toBe(0)
    expect(r.subscriberCount()).toBe(0)
    expect(f.live()).toBe(0)
  })

  it('works again after destroy', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    r.subscribe('keydown', () => {})
    r.destroy()
    const h = vi.fn()
    r.subscribe('keydown', h)
    f.fire('doc', 'keydown', node())
    expect(h).toHaveBeenCalledTimes(1)
  })

  it('importing the module attaches nothing', async () => {
    const add = vi.fn()
    vi.stubGlobal('document', { addEventListener: add })
    vi.stubGlobal('window', { addEventListener: add })
    try {
      vi.resetModules()
      await import('./eventRouter')
      expect(add).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('delivery order', () => {
  it('higher priority first, then subscription order', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const log: string[] = []
    r.subscribe('keydown', () => void log.push('n1'))
    r.subscribe('keydown', () => void log.push('fallback'), {
      priority: PRIORITY.fallback,
    })
    r.subscribe('keydown', () => void log.push('modal'), {
      priority: PRIORITY.modal,
    })
    r.subscribe('keydown', () => void log.push('n2'))
    r.subscribe('keydown', () => void log.push('modal2'), {
      priority: PRIORITY.modal,
    })
    f.fire('doc', 'keydown', node())
    expect(log).toEqual(['modal', 'modal2', 'n1', 'n2', 'fallback'])
  })

  it('a handler returning true stops delivery and dispatch returns true', () => {
    const r = createEventRouter(fakeTargets().targets)
    const second = vi.fn()
    r.subscribe('keydown', () => true, { priority: 10 })
    r.subscribe('keydown', second)
    expect(r.dispatch('keydown', ev(node()))).toBe(true)
    expect(second).not.toHaveBeenCalled()
  })

  it('only exactly true stops; other values pass it on', () => {
    const r = createEventRouter(fakeTargets().targets)
    const last = vi.fn()
    r.subscribe('keydown', () => false, { priority: 3 })
    r.subscribe('keydown', () => undefined, { priority: 2 })
    r.subscribe('keydown', () => 1 as unknown as boolean, { priority: 1 })
    r.subscribe('keydown', last)
    expect(r.dispatch('keydown', ev(node()))).toBe(false)
    expect(last).toHaveBeenCalledTimes(1)
  })

  it('dispatch with no subscribers returns false', () => {
    const r = createEventRouter(fakeTargets().targets)
    expect(r.dispatch('keyup', ev(node()))).toBe(false)
  })

  it('a real DOM event reaches handlers via the attached listener', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const h = vi.fn()
    r.subscribe('pointermove', h)
    const t = node()
    f.fire('doc', 'pointermove', t)
    expect(h).toHaveBeenCalledTimes(1)
    expect(h.mock.calls[0][0].target).toBe(t)
  })
})

describe('faults', () => {
  it('logs a throwing handler with its name and continues', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = createEventRouter(fakeTargets().targets)
    const after = vi.fn()
    r.subscribe(
      'keydown',
      () => {
        throw new Error('boom')
      },
      { name: 'badFeature', priority: 5 },
    )
    r.subscribe('keydown', after)
    expect(r.dispatch('keydown', ev(node()))).toBe(false)
    expect(after).toHaveBeenCalledTimes(1)
    expect(err).toHaveBeenCalledTimes(1)
    expect(String(err.mock.calls[0][0])).toContain('badFeature')
  })

  it('a throwing scope function is logged and skipped too', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = createEventRouter(fakeTargets().targets)
    const after = vi.fn()
    r.subscribe('keydown', () => {}, {
      scope: () => {
        throw new Error('x')
      },
      priority: 5,
    })
    r.subscribe('keydown', after)
    r.dispatch('keydown', ev(node()))
    expect(err).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe twice is safe and does not remove another subscriber', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const off = r.subscribe('keydown', () => {})
    const keep = vi.fn()
    r.subscribe('keydown', keep)
    off()
    off()
    expect(r.subscriberCount('keydown')).toBe(1)
    expect(r.domListenerCount()).toBe(1)
    r.dispatch('keydown', ev(node()))
    expect(keep).toHaveBeenCalledTimes(1)
  })

  it('a stale unsubscribe does not drop the listener a new subscriber needs', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const off = r.subscribe('keydown', () => {})
    off()
    r.subscribe('keydown', () => {})
    off()
    expect(r.domListenerCount()).toBe(1)
    expect(f.live()).toBe(1)
  })
})

describe('changes during delivery', () => {
  it('a subscriber removed mid-delivery that has not run yet is skipped', () => {
    const r = createEventRouter(fakeTargets().targets)
    const second = vi.fn()
    let offSecond = () => {}
    r.subscribe('keydown', () => offSecond(), { priority: 5 })
    offSecond = r.subscribe('keydown', second)
    r.dispatch('keydown', ev(node()))
    expect(second).not.toHaveBeenCalled()
    r.dispatch('keydown', ev(node()))
    expect(second).not.toHaveBeenCalled()
  })

  it('a subscriber that unsubscribes itself still finishes; later ones run', () => {
    const r = createEventRouter(fakeTargets().targets)
    const later = vi.fn()
    const self = vi.fn(() => off())
    const off = r.subscribe('keydown', self, { priority: 5 })
    r.subscribe('keydown', later)
    r.dispatch('keydown', ev(node()))
    r.dispatch('keydown', ev(node()))
    expect(self).toHaveBeenCalledTimes(1)
    expect(later).toHaveBeenCalledTimes(2)
  })

  it('a subscriber added mid-delivery waits for the next event', () => {
    const r = createEventRouter(fakeTargets().targets)
    const added = vi.fn()
    let done = false
    r.subscribe('keydown', () => {
      if (!done) {
        done = true
        r.subscribe('keydown', added, { priority: 100 })
      }
    })
    r.dispatch('keydown', ev(node()))
    expect(added).not.toHaveBeenCalled()
    r.dispatch('keydown', ev(node()))
    expect(added).toHaveBeenCalledTimes(1)
  })

  it('re-entrant dispatch works and each delivery has its own snapshot', () => {
    const r = createEventRouter(fakeTargets().targets)
    const log: string[] = []
    let depth = 0
    r.subscribe('keydown', () => {
      log.push(`a${depth}`)
      if (depth === 0) {
        depth++
        r.dispatch('keydown', ev(node()))
      }
    })
    r.subscribe('keydown', () => void log.push(`b${depth}`))
    r.dispatch('keydown', ev(node()))
    expect(log).toEqual(['a0', 'a1', 'b1', 'b1'])
  })

  it('last unsubscribe during delivery removes the listener', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const off = r.subscribe('keydown', () => off())
    f.fire('doc', 'keydown', node())
    expect(r.domListenerCount()).toBe(0)
    expect(f.live()).toBe(0)
  })

  it('destroy during delivery stops the remaining subscribers', () => {
    const r = createEventRouter(fakeTargets().targets)
    const later = vi.fn()
    r.subscribe('keydown', () => r.destroy(), { priority: 5 })
    r.subscribe('keydown', later)
    r.dispatch('keydown', ev(node()))
    expect(later).not.toHaveBeenCalled()
  })
})

describe('scope', () => {
  it('delivers only events inside the element', () => {
    const r = createEventRouter(fakeTargets().targets)
    const root = node()
    const inside = node(root)
    const outside = node()
    const h = vi.fn()
    r.subscribe('pointerdown', h, { scope: asEl(root) })
    r.dispatch('pointerdown', pev(inside))
    r.dispatch('pointerdown', pev(root))
    r.dispatch('pointerdown', pev(outside))
    expect(h).toHaveBeenCalledTimes(2)
  })

  it('a scope function is read at delivery time', () => {
    const r = createEventRouter(fakeTargets().targets)
    let current = node()
    const first = current
    const h = vi.fn()
    r.subscribe('keydown', h, { scope: () => asEl(current) })
    r.dispatch('keydown', ev(first))
    current = node()
    r.dispatch('keydown', ev(first))
    expect(h).toHaveBeenCalledTimes(1)
  })

  it('a scope function returning null delivers nothing', () => {
    const r = createEventRouter(fakeTargets().targets)
    const h = vi.fn()
    r.subscribe('keydown', h, { scope: () => null })
    expect(r.dispatch('keydown', ev(node()))).toBe(false)
    expect(h).not.toHaveBeenCalled()
  })

  it('a target that is not a Node is not delivered to a scoped subscriber', () => {
    const r = createEventRouter(fakeTargets().targets)
    const h = vi.fn()
    r.subscribe('keydown', h, { scope: asEl(node()) })
    r.dispatch('keydown', ev(null))
    r.dispatch('keydown', ev({}))
    expect(h).not.toHaveBeenCalled()
  })

  it('an out-of-scope handler cannot stop the event for others', () => {
    const r = createEventRouter(fakeTargets().targets)
    const other = vi.fn()
    r.subscribe('keydown', () => true, { scope: asEl(node()), priority: 9 })
    r.subscribe('keydown', other)
    r.dispatch('keydown', ev(node()))
    expect(other).toHaveBeenCalledTimes(1)
  })

  it('is ignored for background and foreground', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const bg = vi.fn()
    const fg = vi.fn()
    r.subscribe('background', bg, { scope: () => null })
    r.subscribe('foreground', fg, { scope: asEl(node()) })
    f.fire('win', 'pagehide')
    f.fire('win', 'pageshow')
    expect(bg).toHaveBeenCalledTimes(1)
    expect(fg).toHaveBeenCalledTimes(1)
  })
})

describe('background and foreground', () => {
  function setup() {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const bg: AppSwitchEvent[] = []
    const fg: AppSwitchEvent[] = []
    r.subscribe('background', (e) => void bg.push(e))
    r.subscribe('foreground', (e) => void fg.push(e))
    return { f, r, bg, fg }
  }

  it('visibilitychange to hidden is background "hidden"', () => {
    const { f, bg, fg } = setup()
    f.state.visibility = 'hidden'
    f.fire('doc', 'visibilitychange', {})
    expect(bg.map((e) => e.reason)).toEqual(['hidden'])
    expect(fg).toHaveLength(0)
    expect(bg[0].event.type).toBe('visibilitychange')
  })

  it('visibilitychange to visible is foreground "visible"', () => {
    const { f, bg, fg } = setup()
    f.fire('doc', 'visibilitychange', {})
    expect(fg.map((e) => e.reason)).toEqual(['visible'])
    expect(bg).toHaveLength(0)
  })

  it('pagehide is background, pageshow is foreground', () => {
    const { f, bg, fg } = setup()
    f.fire('win', 'pagehide', {})
    f.fire('win', 'pageshow', {})
    expect(bg.map((e) => e.reason)).toEqual(['pagehide'])
    expect(fg.map((e) => e.reason)).toEqual(['pageshow'])
  })

  it('window blur is background, window focus is foreground', () => {
    const { f, bg, fg } = setup()
    f.fire('win', 'blur')
    f.fire('win', 'focus')
    expect(bg.map((e) => e.reason)).toEqual(['blur'])
    expect(fg.map((e) => e.reason)).toEqual(['focus'])
  })

  it('ignores blur/focus whose target is not the window', () => {
    const { f, bg, fg } = setup()
    f.fire('win', 'blur', node())
    f.fire('win', 'focus', node())
    expect(bg).toHaveLength(0)
    expect(fg).toHaveLength(0)
  })

  it('subscribers get the event in priority order', () => {
    const f = fakeTargets()
    const r = createEventRouter(f.targets)
    const log: string[] = []
    r.subscribe('background', () => void log.push('a'))
    r.subscribe('background', () => void log.push('b'), { priority: 1 })
    f.fire('win', 'pagehide', {})
    expect(log).toEqual(['b', 'a'])
  })

  it('dispatch accepts an AppSwitchEvent directly', () => {
    const r = createEventRouter(fakeTargets().targets)
    r.subscribe('background', () => true)
    expect(
      r.dispatch('background', {
        reason: 'blur',
        event: { type: 'blur' } as Event,
      }),
    ).toBe(true)
  })
})

describe('counts', () => {
  it('subscriberCount per type and total', () => {
    const r = createEventRouter(fakeTargets().targets)
    r.subscribe('keydown', () => {})
    r.subscribe('keydown', () => {})
    r.subscribe('keyup', () => {})
    expect(r.subscriberCount('keydown')).toBe(2)
    expect(r.subscriberCount('keyup')).toBe(1)
    expect(r.subscriberCount('focusin')).toBe(0)
    expect(r.subscriberCount()).toBe(3)
  })
})

describe('jsdom smoke', () => {
  it('works against a real document and window', () => {
    const dom = new JSDOM('<!doctype html><div id="a"><b id="in"></b></div>')
    const { document: d, window: w } = dom.window
    const r = createEventRouter({ doc: d, win: w as unknown as Window })
    const log: string[] = []
    const scoped: string[] = []
    r.subscribe('keydown', (e) => void log.push(e.key))
    r.subscribe('keydown', (e) => void scoped.push(e.key), {
      scope: d.getElementById('a')!,
    })
    r.subscribe('background', (e) => void log.push(e.reason))
    const key = (k: string) =>
      new w.KeyboardEvent('keydown', { key: k, bubbles: true })
    d.getElementById('in')!.dispatchEvent(key('x'))
    d.body.dispatchEvent(key('y'))
    w.dispatchEvent(new w.Event('pagehide'))
    w.dispatchEvent(new w.Event('blur'))
    expect(log).toEqual(['x', 'y', 'pagehide', 'blur'])
    expect(scoped).toEqual(['x'])
    expect(r.domListenerCount()).toBe(4)
    r.destroy()
    expect(r.domListenerCount()).toBe(0)
    d.body.dispatchEvent(key('z'))
    expect(log).toHaveLength(4)
    w.close()
  })

  it('the app router is a lazy singleton on the real document', () => {
    const dom = new JSDOM('<!doctype html>')
    vi.stubGlobal('document', dom.window.document)
    vi.stubGlobal('window', dom.window)
    try {
      const r1 = getEventRouter()
      expect(getEventRouter()).toBe(r1)
      expect(r1.domListenerCount()).toBe(0)
      const h = vi.fn()
      const off = onRouted('keyup', h)
      dom.window.document.body.dispatchEvent(
        new dom.window.KeyboardEvent('keyup', { bubbles: true }),
      )
      expect(h).toHaveBeenCalledTimes(1)
      expect(r1.domListenerCount()).toBe(1)
      off()
      expect(r1.domListenerCount()).toBe(0)
      onRouted('keyup', h)
      resetEventRouterForTests()
      expect(r1.domListenerCount()).toBe(0)
      expect(getEventRouter()).not.toBe(r1)
    } finally {
      vi.unstubAllGlobals()
      dom.window.close()
    }
  })
})
