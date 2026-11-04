import { useId, useState } from 'react'

/**
 * The button's side of an anchored menu (see AnchoredMenu.tsx): which element
 * opened it, where it is, and the props the button needs. No refs: the click
 * itself says which button it was.
 */
export function useAnchoredMenu() {
  const [anchor, setAnchor] = useState<{
    el: HTMLElement
    rect: DOMRect
  } | null>(null)
  const id = useId()
  return {
    at: anchor?.rect ?? null,
    /** The button that opened it (the focus goes back there on Esc). */
    opener: anchor?.el ?? null,
    id,
    open: anchor !== null,
    close: () => setAnchor(null),
    toggle: (e: { currentTarget: HTMLElement }) => {
      // Read the button now: the event is gone by the time React updates.
      const el = e.currentTarget
      const rect = el.getBoundingClientRect()
      setAnchor((old) => (old ? null : { el, rect }))
    },
    /** Props for the button that opens it. */
    trigger: {
      'data-popup-trigger': true as const,
      'aria-haspopup': 'menu' as const,
      'aria-expanded': anchor !== null,
      'aria-controls': anchor !== null ? id : undefined,
    },
  }
}

export type AnchoredMenuState = ReturnType<typeof useAnchoredMenu>
