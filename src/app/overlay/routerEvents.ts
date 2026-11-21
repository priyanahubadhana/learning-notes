/**
 * OverlayEvents backed by the 0c event router (src/app/input/eventRouter.ts)
 * instead of raw document listeners. Not the default yet: the manager still
 * uses domOverlayEvents() until a later slice switches it over.
 *
 * Escape and pointer-down run at overlay priority. The manager only listens
 * while an overlay is open, so Escape is claimed (not passed on) then.
 * Background = the router's "app went away" plus navigation (hashchange /
 * popstate), which the router does not carry.
 */
import {
  PRIORITY,
  getEventRouter,
  type EventRouter,
} from '../input/eventRouter'
import type { OverlayEvents } from './events'
import { createTapSwallower, stopTap } from './swallow'

export function routerOverlayEvents(
  router: EventRouter = getEventRouter(),
  win: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): OverlayEvents {
  const o = { priority: PRIORITY.overlay, name: 'overlay' }
  return {
    onEscape(cb) {
      return router.subscribe(
        'keydown',
        (e) => {
          if (e.key !== 'Escape') return false
          cb()
          return true
        },
        o,
      )
    },
    onPointerDown(cb) {
      // Above the gesture router: a tap that only closes a card or menu must
      // not start a stroke or a drag either.
      const first = { priority: PRIORITY.gesture + 1, name: 'overlay-tap' }
      const tail = createTapSwallower((type, fn) =>
        router.subscribe(
          type,
          (e) => {
            fn(e)
            return type !== 'pointercancel'
          },
          first,
        ),
      )
      const off = router.subscribe(
        'pointerdown',
        (e) => {
          tail.disarm()
          if (!(e.target instanceof Element) || cb(e.target) !== true) return
          stopTap(e)
          tail.arm()
          return true
        },
        first,
      )
      return () => {
        off()
        tail.disarm()
      }
    },
    onBackground(cb) {
      const off = router.subscribe('background', () => cb(), o)
      win.addEventListener('hashchange', cb)
      win.addEventListener('popstate', cb)
      return () => {
        off()
        win.removeEventListener('hashchange', cb)
        win.removeEventListener('popstate', cb)
      }
    },
  }
}
