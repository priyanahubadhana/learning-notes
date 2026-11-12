/**
 * The gesture router (slice 0d). Spec: docs/features/foundation-input.md,
 * section "Gesture router".
 *
 * When a pointer goes down, features ("claimants") are asked in priority
 * order. The first that claims it owns that pointer's gesture until it ends.
 * A drag is exclusive. A gesture never stays stuck: a lift, a cancel, the
 * app going to the background, Escape (drag) or 4 s of silence all end it,
 * and the owner is always told why. Not used by the app yet.
 *
 * No top-level side effects: this file imports only the event router. The
 * numbers shared with palmGuard.ts / penTap.ts / mainTools.ts /
 * inputMachine.ts are copied here (importing those files would install
 * document listeners); gestureRouter.test.ts asserts they stay equal.
 */
import { PRIORITY, getEventRouter, type EventRouter } from './eventRouter'

export type GestureKind =
  'draw' | 'scroll' | 'select' | 'drag' | 'longpress' | 'tap'
export type PointerKind = 'pen' | 'touch' | 'mouse'
export type EndReason =
  'done' | 'cancelled' | 'timeout' | 'background' | 'escape' | 'error'

export interface GestureStart {
  pointerId: number
  pointerType: PointerKind
  x: number
  y: number
  target: EventTarget | null
  at: number
  /** Pen only: a second tap within DOUBLE_TAP_MS and MAX_MOVE of the previous pen tap. */
  doubleTap: boolean
}
export interface Gesture extends GestureStart {
  kind: GestureKind
  owner: string
  lastAt: number
}
export interface Claimant {
  id: string
  priority?: number
  claim(s: GestureStart): GestureKind | null
  onStart?(g: Gesture): void
  onMove?(g: Gesture, e: PointerEvent): void
  onEnd?(g: Gesture, reason: EndReason): void
}

/** Hold time before a long-press starts. */
export const LONG_PRESS_MS = 500
/** No event for this long (ms) = the pointerup was lost; same as inputMachine AGE_LIMIT_MS. */
export const STUCK_MS = 4000
/** Copies of numbers owned elsewhere; the test asserts they stay equal. */
export const SHARED = {
  /** palmGuard.PALM_TAIL_MS */
  PALM_TAIL_MS: 500,
  /** palmGuard.STALE_MS */
  STALE_PEN_MS: 3000,
  /** penTap.MAX_MOVE */
  MAX_MOVE: 12,
  /** penTap.MAX_MS */
  TAP_MAX_MS: 1000,
  /** mainTools.DOUBLE_TAP_MS */
  DOUBLE_TAP_MS: 350,
} as const

export interface GestureRouter {
  register(c: Claimant): () => void
  pointerDown(e: PointerEvent): boolean
  pointerMove(e: PointerEvent): boolean
  pointerUp(e: PointerEvent): boolean
  pointerCancel(e: PointerEvent): boolean
  endAll(reason: EndReason): void
  active(): readonly Gesture[]
  dragActive(): Gesture | null
  isPalm(e: { pointerType: string }, now?: number): boolean
  destroy(): void
}

interface Entry {
  g: Gesture
  c: Claimant
  /** False while a long-press is still waiting for its hold time. */
  started: boolean
  stuck: ReturnType<typeof setTimeout> | null
  hold: ReturnType<typeof setTimeout> | null
}

function kindOf(t: string): PointerKind {
  return t === 'pen' || t === 'touch' ? t : 'mouse'
}

export function createGestureRouter(
  opts: { events?: EventRouter; now?: () => number } = {},
): GestureRouter {
  const events = opts.events ?? getEventRouter()
  const now = opts.now ?? (() => Date.now())

  const claimants: { c: Claimant; seq: number }[] = []
  let seq = 0
  const entries = new Map<number, Entry>()
  const palmIds = new Set<number>()
  let unsubs: (() => void)[] = []
  let destroyed = false

  // Pencil state (same rules as palmGuard.ts).
  let penId: number | null = null
  let lastPenEvent = 0
  let lastPenLift = 0
  let penDown: {
    id: number
    at: number
    x: number
    y: number
    dbl: boolean
  } | null = null
  let lastPenTap: { at: number; x: number; y: number } | null = null

  const penIsDown = (t: number) =>
    penId !== null && t - lastPenEvent < SHARED.STALE_PEN_MS

  function isPalm(e: { pointerType: string }, t: number = now()): boolean {
    return (
      e.pointerType === 'touch' &&
      (penIsDown(t) || t - lastPenLift < SHARED.PALM_TAIL_MS)
    )
  }

  function trackPen(
    type: 'down' | 'move' | 'up' | 'cancel',
    e: PointerEvent,
    dbl = false,
  ) {
    if (e.pointerType !== 'pen') return
    const t = now()
    lastPenEvent = t
    if (type === 'down') {
      penId = e.pointerId
      penDown = { id: e.pointerId, at: t, x: e.clientX, y: e.clientY, dbl }
    } else if (type === 'move') {
      if (penId === e.pointerId) penId = e.pointerId
    } else if (penId === e.pointerId) {
      penId = null
      lastPenLift = t
      const d = penDown
      penDown = null
      if (
        type === 'up' &&
        d &&
        !d.dbl &&
        d.id === e.pointerId &&
        t - d.at < SHARED.TAP_MAX_MS &&
        Math.hypot(e.clientX - d.x, e.clientY - d.y) < SHARED.MAX_MOVE
      )
        lastPenTap = { at: t, x: e.clientX, y: e.clientY }
    }
  }

  function clearTimers(en: Entry) {
    if (en.stuck) clearTimeout(en.stuck)
    if (en.hold) clearTimeout(en.hold)
    en.stuck = en.hold = null
  }

  function end(en: Entry, reason: EndReason) {
    if (entries.get(en.g.pointerId) !== en) return
    entries.delete(en.g.pointerId)
    clearTimers(en)
    try {
      en.c.onEnd?.(en.g, reason)
    } catch (err) {
      console.error(`gestureRouter: "${en.c.id}" onEnd threw`, err)
    }
  }

  /** Runs an owner handler; a throw ends the gesture with 'error'. */
  function guarded(en: Entry, fn: () => void) {
    try {
      fn()
    } catch (err) {
      console.error(`gestureRouter: "${en.c.id}" threw`, err)
      end(en, 'error')
    }
  }

  function armStuck(en: Entry) {
    if (en.stuck) clearTimeout(en.stuck)
    en.stuck = setTimeout(() => end(en, 'timeout'), STUCK_MS)
  }

  function start(en: Entry) {
    en.started = true
    guarded(en, () => en.c.onStart?.(en.g))
  }

  function ordered(): Claimant[] {
    return claimants
      .slice()
      .sort(
        (a, b) => (b.c.priority ?? 0) - (a.c.priority ?? 0) || a.seq - b.seq,
      )
      .map((x) => x.c)
  }

  function dragActive(): Gesture | null {
    for (const en of entries.values())
      if (en.g.kind === 'drag' && en.started) return en.g
    return null
  }

  function pointerDown(e: PointerEvent): boolean {
    const t = now()
    const palm = isPalm(e, t)
    const type = kindOf(e.pointerType)
    let doubleTap = false
    if (type === 'pen') {
      const p = lastPenTap
      doubleTap =
        !!p &&
        t - p.at < SHARED.DOUBLE_TAP_MS &&
        Math.hypot(e.clientX - p.x, e.clientY - p.y) < SHARED.MAX_MOVE
      lastPenTap = null
    }
    trackPen('down', e, doubleTap)
    if (palm) {
      palmIds.add(e.pointerId)
      return true
    }
    // A duplicate down for a pointer we already own: the old one is over.
    const old = entries.get(e.pointerId)
    if (old) end(old, 'cancelled')
    if (dragActive()) return true // refused; nothing else reacts
    const s: GestureStart = {
      pointerId: e.pointerId,
      pointerType: type,
      x: e.clientX,
      y: e.clientY,
      target: e.target,
      at: t,
      doubleTap,
    }
    for (const c of ordered()) {
      let kind: GestureKind | null
      try {
        kind = c.claim({ ...s })
      } catch (err) {
        console.error(`gestureRouter: "${c.id}" claim threw`, err)
        continue
      }
      if (!kind) continue
      const en: Entry = {
        g: { ...s, kind, owner: c.id, lastAt: t },
        c,
        started: false,
        stuck: null,
        hold: null,
      }
      entries.set(e.pointerId, en)
      armStuck(en)
      if (kind === 'longpress') {
        en.hold = setTimeout(() => {
          en.hold = null
          if (entries.get(en.g.pointerId) === en) start(en)
        }, LONG_PRESS_MS)
      } else start(en)
      return true
    }
    return false
  }

  function pointerMove(e: PointerEvent): boolean {
    trackPen('move', e)
    if (palmIds.has(e.pointerId)) return true
    const en = entries.get(e.pointerId)
    if (!en) return false
    en.g.lastAt = now()
    armStuck(en)
    if (!en.started) {
      // Long-press waiting: moving too far gives it up.
      if (Math.hypot(e.clientX - en.g.x, e.clientY - en.g.y) > SHARED.MAX_MOVE)
        end(en, 'cancelled')
      return true
    }
    guarded(en, () => en.c.onMove?.(en.g, e))
    return true
  }

  function finish(e: PointerEvent, reason: 'done' | 'cancelled'): boolean {
    trackPen(reason === 'done' ? 'up' : 'cancel', e)
    if (palmIds.delete(e.pointerId)) return true
    const en = entries.get(e.pointerId)
    if (!en) return false
    // A long-press lifted before its hold time never started.
    end(en, en.started ? reason : 'cancelled')
    return true
  }

  function endAll(reason: EndReason) {
    for (const en of Array.from(entries.values())) end(en, reason)
  }

  function sync() {
    const want = claimants.length > 0
    if (want && unsubs.length === 0 && !destroyed) {
      const o = { priority: PRIORITY.gesture, name: 'gestureRouter' }
      unsubs = [
        events.subscribe('pointerdown', (e) => pointerDown(e), o),
        events.subscribe('pointermove', (e) => pointerMove(e), o),
        events.subscribe('pointerup', (e) => finish(e, 'done'), o),
        events.subscribe('pointercancel', (e) => finish(e, 'cancelled'), o),
        events.subscribe(
          'keydown',
          (e) => {
            if (e.key !== 'Escape') return false
            const d = dragActive()
            if (!d) return false
            const en = entries.get(d.pointerId)
            if (en) end(en, 'escape')
            return true
          },
          o,
        ),
        events.subscribe(
          'background',
          () => {
            // A lost Pencil lift must not turn later fingers into palms.
            penId = null
            penDown = null
            palmIds.clear()
            endAll('background')
          },
          o,
        ),
      ]
    } else if (!want && unsubs.length > 0) {
      const u = unsubs
      unsubs = []
      u.forEach((f) => f())
    }
  }

  return {
    register(c) {
      if (destroyed) return () => undefined
      const item = { c, seq: seq++ }
      claimants.push(item)
      sync()
      return () => {
        const i = claimants.indexOf(item)
        if (i < 0) return
        claimants.splice(i, 1)
        for (const en of Array.from(entries.values()))
          if (en.c === c) end(en, 'cancelled')
        sync()
      }
    },
    pointerDown,
    pointerMove,
    pointerUp: (e) => finish(e, 'done'),
    pointerCancel: (e) => finish(e, 'cancelled'),
    endAll,
    active: () => Array.from(entries.values(), (en) => en.g),
    dragActive,
    isPalm,
    destroy() {
      endAll('cancelled')
      destroyed = true
      claimants.length = 0
      palmIds.clear()
      sync()
    },
  }
}

let appRouter: GestureRouter | null = null

/** The app's one gesture router (on the app event router), made on first use. */
export function getGestureRouter(): GestureRouter {
  appRouter ??= createGestureRouter()
  return appRouter
}

/** Tests only. */
export function resetGestureRouterForTests(): void {
  appRouter?.destroy()
  appRouter = null
}
