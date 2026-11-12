/**
 * The event router (slice 0c, root cause 1). Spec: docs/features/foundation-input.md.
 *
 * One place that listens to the keyboard, the pointer, focus and "the app
 * went to the background". Features subscribe here instead of adding their
 * own document listeners. One real DOM listener per event type, added when
 * the first feature subscribes and removed when the last one leaves.
 *
 * Delivery: highest `priority` first; equal priority = the earlier
 * subscription first. A handler that returns `true` has handled the event:
 * nobody after it gets it. A handler that throws is logged and skipped; the
 * others still get the event. Not used by the app yet (later slices adopt it).
 */

/** What the router delivers. `background` / `foreground` are app-level. */
export type RoutedType =
  | 'keydown'
  | 'keyup'
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'click'
  | 'input'
  | 'touchmove'
  | 'focusin'
  | 'focusout'
  | 'background'
  | 'foreground'

/** Why the app went away or came back. */
export type AppSwitchReason =
  | 'hidden' // visibilitychange → hidden
  | 'pagehide'
  | 'blur' // the window lost focus (split screen, another app)
  | 'visible' // visibilitychange → visible
  | 'pageshow'
  | 'focus'

export interface AppSwitchEvent {
  reason: AppSwitchReason
  /** The DOM event behind it. */
  event: Event
}

export interface RoutedEventMap {
  keydown: KeyboardEvent
  keyup: KeyboardEvent
  pointerdown: PointerEvent
  pointermove: PointerEvent
  pointerup: PointerEvent
  pointercancel: PointerEvent
  click: MouseEvent
  input: Event
  /** Heard non-passive: a handler may preventDefault to stop scrolling. Subscribe only while needed. */
  touchmove: TouchEvent
  focusin: FocusEvent
  focusout: FocusEvent
  background: AppSwitchEvent
  foreground: AppSwitchEvent
}

/** Return `true` = handled, stop here. Anything else = pass it on. */
export type RoutedHandler<T extends RoutedType> = (
  e: RoutedEventMap[T],
) => boolean | void

/** Common priorities. Any number works; higher runs first. */
export const PRIORITY = {
  /** The gesture router while a drag is on (nothing else reacts). */
  gesture: 1000,
  /** Dialogs and other things that own the keyboard while open. */
  modal: 800,
  /** Menus, cards, sheets. */
  overlay: 600,
  /** Editors and canvases. */
  editor: 400,
  /** Default. */
  normal: 0,
  /** Whole-app shortcuts that run only when nobody else handled the key. */
  fallback: -1000,
} as const

export interface SubscribeOptions {
  /** Higher runs first. Default `PRIORITY.normal`. */
  priority?: number
  /**
   * Only events whose target is inside this element (or the element a
   * function returns at delivery time). Ignored for background/foreground.
   * A function returning null = deliver nothing.
   */
  scope?: Element | (() => Element | null)
  /** A name for the tool-state dump and error logs. */
  name?: string
}

export type Unsubscribe = () => void

/** Where the router listens; narrow so tests can pass fakes. */
export interface RouterTargets {
  doc: Pick<
    Document,
    'addEventListener' | 'removeEventListener' | 'visibilityState'
  >
  win: Pick<Window, 'addEventListener' | 'removeEventListener'>
}

export interface EventRouter {
  subscribe<T extends RoutedType>(
    type: T,
    handler: RoutedHandler<T>,
    options?: SubscribeOptions,
  ): Unsubscribe
  /** Delivers an event as if the DOM sent it (tests and synthetic input). Returns true if handled. */
  dispatch<T extends RoutedType>(type: T, e: RoutedEventMap[T]): boolean
  /** Real DOM listeners attached right now (0 while nobody subscribes). */
  domListenerCount(): number
  /** Subscribers, for one type or all. */
  subscriberCount(type?: RoutedType): number
  /** Removes every subscriber and DOM listener. */
  destroy(): void
}

interface Sub {
  handler: (e: never) => boolean | void
  priority: number
  scope?: Element | (() => Element | null)
  name: string
  active: boolean
}

type DomWhere = 'doc' | 'win'

/** Which routed types each real DOM event feeds, and where it is heard. */
const DOM_EVENTS: Record<
  string,
  { where: DomWhere; feeds: readonly RoutedType[] }
> = {
  keydown: { where: 'doc', feeds: ['keydown'] },
  keyup: { where: 'doc', feeds: ['keyup'] },
  pointerdown: { where: 'doc', feeds: ['pointerdown'] },
  pointermove: { where: 'doc', feeds: ['pointermove'] },
  pointerup: { where: 'doc', feeds: ['pointerup'] },
  pointercancel: { where: 'doc', feeds: ['pointercancel'] },
  click: { where: 'doc', feeds: ['click'] },
  input: { where: 'doc', feeds: ['input'] },
  touchmove: { where: 'doc', feeds: ['touchmove'] },
  focusin: { where: 'doc', feeds: ['focusin'] },
  focusout: { where: 'doc', feeds: ['focusout'] },
  visibilitychange: { where: 'doc', feeds: ['background', 'foreground'] },
  pagehide: { where: 'win', feeds: ['background'] },
  pageshow: { where: 'win', feeds: ['foreground'] },
  blur: { where: 'win', feeds: ['background'] },
  focus: { where: 'win', feeds: ['foreground'] },
}

const CAPTURE = { capture: true } as const
/** touchmove must be non-passive so a drag can stop the page scrolling. */
const optsFor = (domType: string) =>
  domType === 'touchmove' ? { capture: true, passive: false } : CAPTURE

function isNode(t: unknown): t is Node {
  return (
    typeof t === 'object' &&
    t !== null &&
    typeof (t as { nodeType?: unknown }).nodeType === 'number'
  )
}

/**
 * Makes a router on the given targets (tests); the app uses `eventRouter`.
 *
 * Delivery snapshot: the subscribers are copied when a delivery starts. One
 * that unsubscribes during the delivery and has not run yet is skipped; one
 * that subscribes during the delivery waits for the next event.
 */
export function createEventRouter(targets?: RouterTargets): EventRouter {
  const t: RouterTargets = targets ?? { doc: document, win: window }
  const subs = new Map<RoutedType, Sub[]>()
  const attached = new Map<string, (e: Event) => void>()

  const count = (type: RoutedType) => subs.get(type)?.length ?? 0

  function deliver(type: RoutedType, e: unknown): boolean {
    const list = subs.get(type)
    if (!list || list.length === 0) return false
    const appLevel = type === 'background' || type === 'foreground'
    const target = appLevel ? null : (e as Event | null)?.target
    for (const sub of list.slice()) {
      if (!sub.active) continue
      try {
        if (sub.scope && !appLevel) {
          const el = typeof sub.scope === 'function' ? sub.scope() : sub.scope
          if (!el || !isNode(target) || !el.contains(target)) continue
        }
        if ((sub.handler as (e: unknown) => boolean | void)(e) === true)
          return true
      } catch (err) {
        console.error(`eventRouter: handler "${sub.name}" threw`, err)
      }
    }
    return false
  }

  function listenerFor(domType: string): (e: Event) => void {
    const info = DOM_EVENTS[domType]
    return (e: Event) => {
      if (
        (domType === 'blur' || domType === 'focus') &&
        isNode(e.target) // an element's or the page's own focus, not the window's
      )
        return
      if (domType === 'visibilitychange') {
        const hidden = t.doc.visibilityState === 'hidden'
        deliver(hidden ? 'background' : 'foreground', {
          reason: hidden ? 'hidden' : 'visible',
          event: e,
        })
        return
      }
      if (info.where === 'win') {
        deliver(info.feeds[0], { reason: domType as AppSwitchReason, event: e })
        return
      }
      deliver(info.feeds[0], e)
    }
  }

  function sync() {
    for (const [domType, info] of Object.entries(DOM_EVENTS)) {
      const wanted = info.feeds.some((f) => count(f) > 0)
      const fn = attached.get(domType)
      if (wanted && !fn) {
        const l = listenerFor(domType)
        attached.set(domType, l)
        if (info.where === 'doc')
          t.doc.addEventListener(domType, l, optsFor(domType))
        else t.win.addEventListener(domType, l)
      } else if (!wanted && fn) {
        attached.delete(domType)
        if (info.where === 'doc')
          t.doc.removeEventListener(domType, fn, CAPTURE)
        else t.win.removeEventListener(domType, fn)
      }
    }
  }

  return {
    subscribe(type, handler, options = {}) {
      const sub: Sub = {
        handler: handler as Sub['handler'],
        priority: options.priority ?? PRIORITY.normal,
        scope: options.scope,
        name: options.name ?? type,
        active: true,
      }
      const list = subs.get(type) ?? []
      // Higher priority first; equal priority keeps subscription order.
      let at = list.length
      while (at > 0 && list[at - 1].priority < sub.priority) at--
      list.splice(at, 0, sub)
      subs.set(type, list)
      sync()
      return () => {
        if (!sub.active) return
        sub.active = false
        const cur = subs.get(type)
        const idx = cur ? cur.indexOf(sub) : -1
        if (cur && idx >= 0) {
          cur.splice(idx, 1)
          if (cur.length === 0) subs.delete(type)
        }
        sync()
      }
    },
    dispatch(type, e) {
      return deliver(type, e)
    },
    domListenerCount() {
      return attached.size
    },
    subscriberCount(type) {
      if (type) return count(type)
      let n = 0
      for (const l of subs.values()) n += l.length
      return n
    },
    destroy() {
      for (const l of subs.values()) for (const s of l) s.active = false
      subs.clear()
      sync()
    },
  }
}

let appRouter: EventRouter | null = null

/** The app's one router (on `document` and `window`), made on first use. */
export function getEventRouter(): EventRouter {
  appRouter ??= createEventRouter()
  return appRouter
}

/** Shortcut for `getEventRouter().subscribe(...)`. */
export function onRouted<T extends RoutedType>(
  type: T,
  handler: RoutedHandler<T>,
  options?: SubscribeOptions,
): Unsubscribe {
  return getEventRouter().subscribe(type, handler, options)
}

/** Tests only: drops the app router so the next `getEventRouter` makes a new one. */
export function resetEventRouterForTests(): void {
  appRouter?.destroy()
  appRouter = null
}
