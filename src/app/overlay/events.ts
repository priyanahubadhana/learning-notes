import { createTapSwallower, stopTap } from './swallow'

/** The few page events the overlay manager needs. Injected so the 0c event router can replace the DOM default. */
export interface OverlayEvents {
  onEscape(cb: () => void): () => void
  /**
   * `cb` returns true when the tap only closed a card or menu: then this
   * pointerdown and the pointerup and click that follow are swallowed, so no
   * tool, box or page reacts to that tap.
   */
  onPointerDown(cb: (target: Element) => boolean | void): () => void
  /** Navigation / history changes. */
  onBackground(cb: () => void): () => void
}

export function domOverlayEvents(doc: Document = document): OverlayEvents {
  const win = doc.defaultView ?? window
  return {
    onEscape(cb) {
      const h = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cb()
      }
      doc.addEventListener('keydown', h)
      return () => doc.removeEventListener('keydown', h)
    },
    onPointerDown(cb) {
      const tail = createTapSwallower((type, fn) => {
        doc.addEventListener(type, fn, true)
        return () => doc.removeEventListener(type, fn, true)
      })
      const h = (e: Event) => {
        tail.disarm()
        if (!(e.target instanceof Element) || cb(e.target) !== true) return
        stopTap(e)
        tail.arm()
      }
      doc.addEventListener('pointerdown', h, true)
      return () => {
        doc.removeEventListener('pointerdown', h, true)
        tail.disarm()
      }
    },
    onBackground(cb) {
      win.addEventListener('hashchange', cb)
      win.addEventListener('popstate', cb)
      return () => {
        win.removeEventListener('hashchange', cb)
        win.removeEventListener('popstate', cb)
      }
    },
  }
}
