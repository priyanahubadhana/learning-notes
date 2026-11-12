/** The few page events the overlay manager needs. Injected so the 0c event router can replace the DOM default. */
export interface OverlayEvents {
  onEscape(cb: () => void): () => void
  onPointerDown(cb: (target: Element) => void): () => void
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
      const h = (e: Event) => {
        if (e.target instanceof Element) cb(e.target)
      }
      doc.addEventListener('pointerdown', h, true)
      return () => doc.removeEventListener('pointerdown', h, true)
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
