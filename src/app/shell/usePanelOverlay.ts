import { useEffect, useRef, type RefObject } from 'react'
import { overlay } from '../overlay'

/**
 * The pages panel opened over the page (no room to dock it beside the page):
 * it joins the overlay manager, so Esc and a tap outside close it. The
 * top bar's panel button counts as inside, so pressing it simply toggles.
 */
export function usePanelOverlay(
  active: boolean,
  wrap: RefObject<HTMLElement | null>,
  close: () => void,
): void {
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    if (!active) return
    let live = true
    const handle = overlay.open({
      id: 'shell-panel',
      layer: 'card',
      swallowOutsideTap: false,
      inside: (el) =>
        !!wrap.current?.contains(el) ||
        !!el.closest('[data-testid="panel-toggle"]'),
      close: () => {
        if (live) closeRef.current()
      },
    })
    return () => {
      live = false
      handle.close()
    }
  }, [active, wrap])
}
