import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEventRouter, type RouterTargets } from './eventRouter'
import {
  LONG_PRESS_MS,
  SHARED,
  STUCK_MS,
  createGestureRouter,
  getGestureRouter,
  resetGestureRouterForTests,
  type Claimant,
  type EndReason,
  type Gesture,
  type GestureKind,
  type GestureRouter,
  type GestureStart,
} from './gestureRouter'
import { PALM_TAIL_MS, STALE_MS } from '../palmGuard'
import { MAX_MOVE, MAX_MS } from '../penTap'
import { AGE_LIMIT_MS } from '../inputMachine'
import { DOUBLE_TAP_MS } from '../tools/main/mainTools'

type Fn = (e: unknown) => void

function fakeTargets(): RouterTargets & { live: () => number } {
  const maps = [new Map<string, Set<Fn>>(), new Map<string, Set<Fn>>()]
  const make = (map: Map<string, Set<Fn>>) => ({
    addEventListener(t: string, fn: Fn) {
      if (!map.has(t)) map.set(t, new Set())
      map.get(t)!.add(fn)
    },
    removeEventListener(t: string, fn: Fn) {
      map.get(t)?.delete(fn)
    },
  })
  const doc = { ...make(maps[0]), visibilityState: 'visible' as const }
  const win = make(maps[1])
  return {
    doc,
    win,
    live: () =>
      maps.reduce(
        (n, m) => n + [...m.values()].reduce((a, s) => a + s.size, 0),
        0,
      ),
  } as unknown as RouterTargets & { live: () => number }
}

function pe(
  pointerId: number,
  pointerType: string,
  x = 0,
  y = 0,
  type = 'pointerdown',
): PointerEvent {
  return {
    type,
    pointerId,
    pointerType,
    clientX: x,
    clientY: y,
    target: null,
  } as unknown as PointerEvent
}

interface Rec {
  events: string[]
  c: Claimant
  ends: EndReason[]
  starts: Gesture[]
  moves: number
}

function rec(
  id: string,
  kind: GestureKind | ((s: GestureStart) => GestureKind | null) | null,
  extra: Partial<Claimant> = {},
): Rec {
  const r: Rec = {
    events: [],
    ends: [],
    starts: [],
    moves: 0,
    c: null as never,
  }
  r.c = {
    id,
    claim: (s) => (typeof kind === 'function' ? kind(s) : kind),
    onStart: (g) => {
      r.starts.push(g)
      r.events.push('start')
    },
    onMove: () => {
      r.moves++
      r.events.push('move')
    },
    onEnd: (_g, reason) => {
      r.ends.push(reason)
      r.events.push('end:' + reason)
    },
    ...extra,
  }
  return r
}

let targets: ReturnType<typeof fakeTargets>
let events: ReturnType<typeof createEventRouter>
let gr: GestureRouter

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  targets = fakeTargets()
  events = createEventRouter(targets)
  gr = createGestureRouter({ events })
})
afterEach(() => {
  gr.destroy()
  events.destroy()
  resetGestureRouterForTests()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('shared numbers', () => {
  it('match the modules they were copied from', () => {
    expect(SHARED.PALM_TAIL_MS).toBe(PALM_TAIL_MS)
    expect(SHARED.STALE_PEN_MS).toBe(STALE_MS)
    expect(SHARED.MAX_MOVE).toBe(MAX_MOVE)
    expect(SHARED.TAP_MAX_MS).toBe(MAX_MS)
    expect(SHARED.DOUBLE_TAP_MS).toBe(DOUBLE_TAP_MS)
    expect(STUCK_MS).toBe(AGE_LIMIT_MS)
    expect(LONG_PRESS_MS).toBe(500)
  })
})

describe('listeners', () => {
  it('unused = zero DOM listeners; first claimant adds, last removal removes', () => {
    expect(targets.live()).toBe(0)
    const off1 = gr.register(rec('a', null).c)
    expect(targets.live()).toBeGreaterThan(0)
    expect(events.subscriberCount('pointerdown')).toBe(1)
    const off2 = gr.register(rec('b', null).c)
    expect(events.subscriberCount('pointerdown')).toBe(1)
    off1()
    expect(targets.live()).toBeGreaterThan(0)
    off2()
    expect(targets.live()).toBe(0)
    expect(events.subscriberCount()).toBe(0)
  })

  it('destroy unsubscribes and ends everything cancelled', () => {
    const a = rec('a', 'draw')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'mouse'))
    gr.destroy()
    expect(a.ends).toEqual(['cancelled'])
    expect(targets.live()).toBe(0)
    expect(gr.active()).toHaveLength(0)
  })

  it('creating and using a router (getGestureRouter) with no claimant adds nothing', () => {
    const before = events.subscriberCount()
    createGestureRouter({ events })
    expect(events.subscriberCount()).toBe(before)
    vi.stubGlobal('document', targets.doc)
    vi.stubGlobal('window', targets.win)
    expect(getGestureRouter()).toBe(getGestureRouter())
    expect(targets.live()).toBe(0)
    vi.unstubAllGlobals()
  })

  it('works through the event router: handled events do not reach lower subscribers', () => {
    const a = rec('a', 'draw')
    gr.register(a.c)
    const low = vi.fn()
    events.subscribe('pointerdown', low)
    expect(events.dispatch('pointerdown', pe(1, 'mouse'))).toBe(true)
    expect(low).not.toHaveBeenCalled()
    expect(events.dispatch('pointerdown', pe(2, 'mouse'))).toBe(true) // second pointer, same owner
    gr.destroy()
  })
})

describe('claiming', () => {
  it('asks by priority desc, then registration order; first non-null owns; others get nothing', () => {
    const asked: string[] = []
    const mk = (id: string, priority: number, kind: GestureKind | null) =>
      rec(id, () => (asked.push(id), kind), { priority })
    const lo = mk('lo', 0, 'tap')
    const hi = mk('hi', 5, null)
    const hi2 = mk('hi2', 5, 'draw')
    gr.register(lo.c)
    gr.register(hi.c)
    gr.register(hi2.c)
    expect(gr.pointerDown(pe(1, 'mouse'))).toBe(true)
    expect(asked).toEqual(['hi', 'hi2'])
    expect(hi2.starts).toHaveLength(1)
    expect(lo.events).toEqual([])
    gr.pointerMove(pe(1, 'mouse', 5, 5, 'pointermove'))
    expect(hi2.moves).toBe(1)
    expect(lo.moves).toBe(0)
    expect(gr.active()[0]).toMatchObject({
      kind: 'draw',
      owner: 'hi2',
      pointerType: 'mouse',
    })
  })

  it('unowned pointer: all four handlers return false', () => {
    gr.register(rec('a', null).c)
    expect(gr.pointerDown(pe(1, 'mouse'))).toBe(false)
    expect(gr.pointerMove(pe(1, 'mouse'))).toBe(false)
    expect(gr.pointerUp(pe(1, 'mouse'))).toBe(false)
    expect(gr.pointerCancel(pe(1, 'mouse'))).toBe(false)
  })

  it('every kind but longpress starts immediately', () => {
    for (const kind of ['draw', 'scroll', 'select', 'drag', 'tap'] as const) {
      const r = rec('k' + kind, kind)
      const off = gr.register(r.c)
      gr.pointerDown(pe(1, 'mouse'))
      expect(r.starts).toHaveLength(1)
      gr.pointerUp(pe(1, 'mouse'))
      off()
    }
  })

  it('up -> onEnd done; cancel -> onEnd cancelled; router is free at once', () => {
    const a = rec('a', 'draw')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'mouse'))
    expect(gr.pointerUp(pe(1, 'mouse'))).toBe(true)
    gr.pointerDown(pe(1, 'mouse'))
    expect(gr.pointerCancel(pe(1, 'mouse'))).toBe(true)
    expect(a.ends).toEqual(['done', 'cancelled'])
    expect(gr.active()).toHaveLength(0)
    gr.pointerDown(pe(1, 'mouse'))
    expect(a.starts).toHaveLength(3)
  })

  it('a claim() that throws is logged and skipped', () => {
    const bad = rec(
      'bad',
      () => {
        throw new Error('x')
      },
      { priority: 9 },
    )
    const good = rec('good', 'tap')
    gr.register(bad.c)
    gr.register(good.c)
    expect(gr.pointerDown(pe(1, 'mouse'))).toBe(true)
    expect(good.starts).toHaveLength(1)
    expect(console.error).toHaveBeenCalled()
  })

  it('two pointers are independent', () => {
    const a = rec('a', 'draw')
    const b = rec('b', 'scroll', { priority: 1 })
    gr.register(a.c)
    gr.register(b.c)
    gr.pointerDown(pe(1, 'mouse')) // b (higher priority)
    gr.pointerDown(pe(2, 'mouse'))
    expect(gr.active()).toHaveLength(2)
    gr.pointerUp(pe(1, 'mouse'))
    expect(b.ends).toEqual(['done'])
    expect(gr.active()).toHaveLength(1)
    gr.pointerMove(pe(2, 'mouse', 3, 3, 'pointermove'))
    expect(b.moves).toBe(1)
    gr.pointerCancel(pe(2, 'mouse'))
    expect(b.ends).toEqual(['done', 'cancelled'])
  })

  it('maps unknown pointer types to mouse', () => {
    const a = rec('a', 'tap')
    gr.register(a.c)
    gr.pointerDown(pe(1, ''))
    expect(a.starts[0].pointerType).toBe('mouse')
  })
})

describe('long-press', () => {
  it('starts only after LONG_PRESS_MS held still', () => {
    const a = rec('a', 'longpress')
    gr.register(a.c)
    expect(gr.pointerDown(pe(1, 'touch', 10, 10))).toBe(true)
    vi.advanceTimersByTime(LONG_PRESS_MS - 1)
    expect(a.starts).toHaveLength(0)
    gr.pointerMove(pe(1, 'touch', 10 + MAX_MOVE, 10, 'pointermove')) // within 12 px
    vi.advanceTimersByTime(1)
    expect(a.starts).toHaveLength(1)
    gr.pointerUp(pe(1, 'touch', 10, 10, 'pointerup'))
    expect(a.ends).toEqual(['done'])
  })

  it('moving further than 12 px first gives it up: cancelled, onStart never runs', () => {
    const a = rec('a', 'longpress')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'touch', 0, 0))
    gr.pointerMove(pe(1, 'touch', MAX_MOVE + 1, 0, 'pointermove'))
    expect(a.ends).toEqual(['cancelled'])
    vi.advanceTimersByTime(LONG_PRESS_MS * 2)
    expect(a.starts).toHaveLength(0)
    expect(gr.active()).toHaveLength(0)
  })

  it('lifting first gives it up: cancelled, onStart never runs', () => {
    const a = rec('a', 'longpress')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'touch'))
    vi.advanceTimersByTime(100)
    gr.pointerUp(pe(1, 'touch'))
    vi.advanceTimersByTime(LONG_PRESS_MS * 2)
    expect(a.events).toEqual(['end:cancelled'])
  })

  it('no onMove before it has started', () => {
    const a = rec('a', 'longpress')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'touch'))
    gr.pointerMove(pe(1, 'touch', 1, 1, 'pointermove'))
    expect(a.moves).toBe(0)
  })
})

describe('drag', () => {
  it('is exclusive: other pointers are swallowed and no claim() is asked', () => {
    const claim = vi.fn((): GestureKind | null => 'tap')
    const d = rec('d', (s) => (s.pointerId === 1 ? 'drag' : null))
    const other = rec('o', claim)
    gr.register(d.c)
    gr.register(other.c)
    gr.pointerDown(pe(1, 'mouse'))
    expect(gr.dragActive()?.pointerId).toBe(1)
    claim.mockClear()
    expect(gr.pointerDown(pe(2, 'touch'))).toBe(true)
    expect(gr.pointerDown(pe(3, 'pen'))).toBe(true)
    expect(claim).not.toHaveBeenCalled()
    expect(gr.active()).toHaveLength(1)
    // The refused pointers' moves/ups are swallowed too (nothing else reacts).
    expect(gr.pointerMove(pe(2, 'touch', 1, 1, 'pointermove'))).toBe(true)
    gr.pointerUp(pe(1, 'mouse'))
    expect(d.ends).toEqual(['done'])
    expect(gr.dragActive()).toBeNull()
    expect(gr.pointerUp(pe(3, 'pen', 0, 0, 'pointerup'))).toBe(true)
    expect(other.starts).toHaveLength(0)
  })

  it('a refused pointer whose lift was lost does not swallow a later pointer with the same id', () => {
    const d = rec('d', (s) => (s.pointerId === 1 ? 'drag' : null))
    const t = rec('t', (s) => (s.pointerId === 2 ? 'tap' : null))
    gr.register(d.c)
    gr.register(t.c)
    gr.pointerDown(pe(1, 'mouse'))
    gr.pointerDown(pe(2, 'touch')) // refused, its lift never comes
    gr.pointerUp(pe(1, 'mouse', 0, 0, 'pointerup'))
    expect(gr.pointerDown(pe(2, 'touch'))).toBe(true)
    expect(t.starts).toHaveLength(1)
    gr.pointerMove(pe(2, 'touch', 1, 1, 'pointermove'))
    expect(t.moves).toBe(1)
  })

  it('Escape ends the drag with escape and is handled; without a drag it is not', () => {
    const d = rec('d', 'drag')
    gr.register(d.c)
    const key = { key: 'Escape' } as KeyboardEvent
    expect(events.dispatch('keydown', key)).toBe(false)
    events.dispatch('pointerdown', pe(1, 'mouse'))
    expect(events.dispatch('keydown', { key: 'a' } as KeyboardEvent)).toBe(
      false,
    )
    expect(d.ends).toEqual([])
    expect(events.dispatch('keydown', key)).toBe(true)
    expect(d.ends).toEqual(['escape'])
    expect(gr.dragActive()).toBeNull()
  })

  it('pointercancel mid-drag frees the router at once', () => {
    const d = rec('d', 'drag')
    gr.register(d.c)
    gr.pointerDown(pe(1, 'mouse'))
    gr.pointerCancel(pe(1, 'mouse'))
    expect(d.ends).toEqual(['cancelled'])
    expect(gr.dragActive()).toBeNull()
    gr.pointerDown(pe(2, 'mouse'))
    expect(d.starts).toHaveLength(2)
  })
})

describe('stuck gestures', () => {
  it('lost pointerup: ends with timeout after 4 s of silence; the next gesture works', () => {
    const a = rec('a', 'draw')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'touch'))
    vi.advanceTimersByTime(STUCK_MS - 1)
    expect(a.ends).toEqual([])
    vi.advanceTimersByTime(1)
    expect(a.ends).toEqual(['timeout'])
    expect(gr.active()).toHaveLength(0)
    expect(gr.pointerDown(pe(2, 'touch'))).toBe(true)
    expect(a.starts).toHaveLength(2)
  })

  it('a move refreshes the timer', () => {
    const a = rec('a', 'draw')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'mouse'))
    vi.advanceTimersByTime(3000)
    gr.pointerMove(pe(1, 'mouse', 1, 1, 'pointermove'))
    vi.advanceTimersByTime(3000)
    expect(a.ends).toEqual([])
    vi.advanceTimersByTime(1000)
    expect(a.ends).toEqual(['timeout'])
  })

  it('a stuck drag releases the exclusivity', () => {
    gr.register(rec('d', 'drag').c)
    gr.pointerDown(pe(1, 'mouse'))
    vi.advanceTimersByTime(STUCK_MS)
    expect(gr.dragActive()).toBeNull()
  })

  it('every end clears its timers', () => {
    gr.register(rec('a', 'draw').c)
    gr.register(rec('l', 'longpress', { priority: 5 }).c)
    gr.pointerDown(pe(1, 'mouse'))
    gr.pointerUp(pe(1, 'mouse'))
    expect(vi.getTimerCount()).toBe(0)
    gr.pointerDown(pe(2, 'mouse'))
    gr.pointerCancel(pe(2, 'mouse'))
    expect(vi.getTimerCount()).toBe(0)
    gr.pointerDown(pe(3, 'mouse'))
    gr.endAll('background')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('background', () => {
  it('ends every gesture with background (via the event router)', () => {
    const a = rec('a', 'draw')
    const b = rec('b', 'longpress', { priority: 1 })
    gr.register(a.c)
    gr.register(b.c)
    gr.pointerDown(pe(1, 'mouse')) // b, long-press pending
    gr.register(rec('c', 'draw', { priority: 2 }).c)
    gr.pointerDown(pe(2, 'mouse'))
    events.dispatch('background', {
      reason: 'hidden',
      event: new Event('visibilitychange'),
    })
    expect(b.ends).toEqual(['background'])
    expect(gr.active()).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a Pencil whose lift was lost does not make fingers palms afterwards', () => {
    gr.register(rec('a', 'tap').c)
    gr.pointerDown(pe(9, 'pen'))
    expect(gr.isPalm({ pointerType: 'touch' })).toBe(true)
    events.dispatch('background', { reason: 'blur', event: new Event('blur') })
    expect(gr.isPalm({ pointerType: 'touch' })).toBe(false)
  })
})

describe('pen and palm', () => {
  it('touch is a palm while the Pencil is down (swallowed, never claimed)', () => {
    const claim = vi.fn((): GestureKind | null => 'tap')
    gr.register(rec('a', (s) => (s.pointerType === 'pen' ? 'draw' : claim())).c)
    gr.pointerDown(pe(1, 'pen'))
    expect(gr.isPalm({ pointerType: 'touch' })).toBe(true)
    expect(gr.pointerDown(pe(2, 'touch'))).toBe(true)
    expect(claim).not.toHaveBeenCalled()
    expect(gr.active()).toHaveLength(1)
    // the palm's own move/up are swallowed too
    expect(gr.pointerMove(pe(2, 'touch', 1, 1, 'pointermove'))).toBe(true)
    expect(gr.pointerUp(pe(2, 'touch'))).toBe(true)
    // pen and mouse are never palms
    expect(gr.isPalm({ pointerType: 'pen' })).toBe(false)
    expect(gr.isPalm({ pointerType: 'mouse' })).toBe(false)
  })

  it('palm tail: ignored for 500 ms after the Pencil lifts, then a finger works', () => {
    const a = rec('a', (s) => (s.pointerType === 'pen' ? 'draw' : 'tap'))
    gr.register(a.c)
    gr.pointerDown(pe(1, 'pen'))
    gr.pointerUp(pe(1, 'pen'))
    vi.advanceTimersByTime(PALM_TAIL_MS - 1)
    expect(gr.pointerDown(pe(2, 'touch'))).toBe(true)
    expect(a.starts).toHaveLength(1)
    gr.pointerUp(pe(2, 'touch'))
    vi.advanceTimersByTime(1)
    expect(gr.isPalm({ pointerType: 'touch' })).toBe(false)
    gr.pointerDown(pe(3, 'touch'))
    expect(a.starts).toHaveLength(2)
  })

  it('a Pencil cancel also starts the tail', () => {
    gr.register(rec('a', 'draw').c)
    gr.pointerDown(pe(1, 'pen'))
    gr.pointerCancel(pe(1, 'pen'))
    expect(gr.isPalm({ pointerType: 'touch' })).toBe(true)
  })

  it('stale pen: down with no event for 3 s no longer counts', () => {
    gr.register(rec('a', 'tap').c)
    gr.pointerDown(pe(1, 'pen'))
    // keep the pen gesture alive without pen events? none arrive: stuck timer ends it at 4 s
    vi.advanceTimersByTime(STALE_MS - 1)
    expect(gr.isPalm({ pointerType: 'touch' })).toBe(true)
    vi.advanceTimersByTime(1)
    expect(gr.isPalm({ pointerType: 'touch' })).toBe(false)
    expect(gr.pointerDown(pe(2, 'touch'))).toBe(true)
    expect(gr.active().some((g) => g.pointerId === 2)).toBe(true)
  })

  it('isPalm takes an explicit now', () => {
    gr.pointerDown(pe(1, 'pen'))
    expect(gr.isPalm({ pointerType: 'touch' }, Date.now() + STALE_MS)).toBe(
      false,
    )
    expect(gr.isPalm({ pointerType: 'touch' }, Date.now() + 10)).toBe(true)
  })

  it('without palm rules for mouse: a mouse click while the Pencil is down is claimed', () => {
    const a = rec('a', 'tap')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'pen'))
    gr.pointerDown(pe(2, 'mouse'))
    expect(a.starts).toHaveLength(2)
  })
})

describe('pen double tap', () => {
  function tap(id: number, x = 0, y = 0) {
    gr.pointerDown(pe(id, 'pen', x, y))
    gr.pointerUp(pe(id, 'pen', x, y, 'pointerup'))
  }

  it('second tap within DOUBLE_TAP_MS and MAX_MOVE is a double tap', () => {
    const a = rec('a', 'tap')
    gr.register(a.c)
    tap(1)
    vi.advanceTimersByTime(DOUBLE_TAP_MS - 1)
    tap(2, MAX_MOVE - 1, 0)
    expect(a.starts.map((g) => g.doubleTap)).toEqual([false, true])
  })

  it('too late, too far, or after a non-pen pointer is not a double tap', () => {
    const a = rec('a', 'tap')
    gr.register(a.c)
    tap(1)
    vi.advanceTimersByTime(DOUBLE_TAP_MS)
    tap(2)
    tap(3, 50, 50)
    expect(a.starts.map((g) => g.doubleTap)).toEqual([false, false, false])
    gr.pointerDown(pe(4, 'mouse'))
    expect(a.starts[3].doubleTap).toBe(false)
  })

  it('a third tap is not a double tap again; a long press-hold is not a tap', () => {
    const a = rec('a', 'tap')
    gr.register(a.c)
    tap(1)
    tap(2)
    tap(3)
    expect(a.starts.map((g) => g.doubleTap)).toEqual([false, true, false])
    gr.pointerDown(pe(4, 'pen'))
    vi.advanceTimersByTime(MAX_MS)
    gr.pointerUp(pe(4, 'pen'))
    gr.pointerDown(pe(5, 'pen'))
    expect(a.starts[4].doubleTap).toBe(false)
  })

  it('a pen that moved too far on the first tap is no tap', () => {
    const a = rec('a', 'tap')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'pen', 0, 0))
    gr.pointerUp(pe(1, 'pen', 40, 0, 'pointerup'))
    gr.pointerDown(pe(2, 'pen', 40, 0))
    expect(a.starts[1].doubleTap).toBe(false)
  })

  it('touch never reports doubleTap', () => {
    const a = rec('a', 'tap')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'touch'))
    gr.pointerUp(pe(1, 'touch'))
    gr.pointerDown(pe(2, 'touch'))
    expect(a.starts[1].doubleTap).toBe(false)
  })
})

describe('faults', () => {
  it('onStart throws: gesture ends with error, onEnd still attempted, router free', () => {
    const a = rec('a', 'draw', {
      onStart: () => {
        throw new Error('boom')
      },
    })
    gr.register(a.c)
    expect(gr.pointerDown(pe(1, 'mouse'))).toBe(true)
    expect(a.ends).toEqual(['error'])
    expect(gr.active()).toHaveLength(0)
    expect(console.error).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('onMove throws: ends with error; a later pointer works', () => {
    const a = rec('a', 'draw', {
      onMove: () => {
        throw new Error('boom')
      },
    })
    gr.register(a.c)
    gr.pointerDown(pe(1, 'mouse'))
    expect(gr.pointerMove(pe(1, 'mouse', 1, 1, 'pointermove'))).toBe(true)
    expect(a.ends).toEqual(['error'])
    expect(gr.pointerMove(pe(1, 'mouse', 2, 2, 'pointermove'))).toBe(false)
    expect(gr.pointerDown(pe(2, 'mouse'))).toBe(true)
  })

  it('a throwing drag owner releases the exclusivity', () => {
    const a = rec('a', 'drag', {
      onMove: () => {
        throw new Error('boom')
      },
    })
    gr.register(a.c)
    gr.pointerDown(pe(1, 'mouse'))
    gr.pointerMove(pe(1, 'mouse', 1, 1, 'pointermove'))
    expect(gr.dragActive()).toBeNull()
  })

  it('onEnd throwing on a normal end is logged and the router stays free', () => {
    const a = rec('a', 'draw', {
      onEnd: () => {
        throw new Error('boom')
      },
    })
    gr.register(a.c)
    gr.pointerDown(pe(1, 'mouse'))
    expect(() => gr.pointerUp(pe(1, 'mouse'))).not.toThrow()
    expect(gr.active()).toHaveLength(0)
    expect(console.error).toHaveBeenCalled()
  })

  it('a long-press whose onStart throws ends with error', () => {
    const a = rec('a', 'longpress', {
      onStart: () => {
        throw new Error('boom')
      },
    })
    gr.register(a.c)
    gr.pointerDown(pe(1, 'touch'))
    vi.advanceTimersByTime(LONG_PRESS_MS)
    expect(a.ends).toEqual(['error'])
    expect(gr.active()).toHaveLength(0)
  })

  it('unregister mid-gesture ends its gestures cancelled; others continue', () => {
    const a = rec('a', 'draw')
    const b = rec('b', 'scroll', { priority: 1 })
    const offA = gr.register(a.c)
    gr.register(b.c)
    gr.pointerDown(pe(1, 'mouse')) // b
    gr.register(rec('x', null).c)
    offA() // a owns nothing
    expect(b.ends).toEqual([])
    const offB = gr.register(rec('c', 'draw', { priority: 9 }).c)
    gr.pointerDown(pe(2, 'mouse'))
    offB()
    expect(gr.active().map((g) => g.pointerId)).toEqual([1])
    expect(vi.getTimerCount()).toBe(1)
    expect(gr.pointerMove(pe(1, 'mouse', 1, 1, 'pointermove'))).toBe(true)
  })

  it('unregistering the owner: onEnd cancelled, later events unowned, listeners gone', () => {
    const a = rec('a', 'draw')
    const off = gr.register(a.c)
    gr.pointerDown(pe(1, 'mouse'))
    off()
    expect(a.ends).toEqual(['cancelled'])
    expect(gr.pointerUp(pe(1, 'mouse'))).toBe(false)
    expect(targets.live()).toBe(0)
    off() // twice is harmless
  })

  it('a duplicate pointerdown for an owned pointer cancels the old gesture first', () => {
    const a = rec('a', 'draw')
    gr.register(a.c)
    gr.pointerDown(pe(1, 'mouse'))
    gr.pointerDown(pe(1, 'mouse'))
    expect(a.events).toEqual(['start', 'end:cancelled', 'start'])
  })

  it('an event during an owner callback does not break (end inside onMove)', () => {
    const a = rec('a', 'draw')
    a.c.onMove = () => {
      gr.endAll('cancelled')
    }
    gr.register(a.c)
    gr.pointerDown(pe(1, 'mouse'))
    gr.pointerMove(pe(1, 'mouse', 1, 1, 'pointermove'))
    expect(a.ends).toEqual(['cancelled'])
    expect(gr.active()).toHaveLength(0)
  })

  it('register after destroy does nothing', () => {
    gr.destroy()
    gr.register(rec('a', 'draw').c)()
    expect(targets.live()).toBe(0)
  })
})
