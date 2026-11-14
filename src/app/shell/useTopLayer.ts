import { useLayoutEffect, type RefObject } from 'react'

/**
 * Puts an element (marked `popover="manual"`) in the browser's top layer:
 * above the page and every positioned element, in the order things are
 * opened, with no stacking number. Where the Popover API is missing the element
 * just stays fixed on the page.
 */
export function useTopLayer(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const el = ref.current
    try {
      el?.showPopover?.()
    } catch {
      // Already open, or not allowed here: the element still shows.
    }
    return () => {
      try {
        el?.hidePopover?.()
      } catch {
        // Already closed.
      }
    }
  }, [ref])
}
