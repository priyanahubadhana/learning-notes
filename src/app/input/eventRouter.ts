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

/** Makes a router on the given targets (tests); the app uses `eventRouter`. */
export function createEventRouter(targets?: RouterTargets): EventRouter {
  void targets
  throw new Error('eventRouter: not built yet')
}

/** The app's one router (on `document` and `window`), made on first use. */
export function getEventRouter(): EventRouter {
  throw new Error('eventRouter: not built yet')
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
export function resetEventRouterForTests(): void {}
