import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { overlay, trapFocus, type Layer } from '../overlay'

export interface OverlayLayerOptions {
  id: string
  layer: Layer
  /**
   * Esc or a tap outside. Return `false` to stay open (a sheet with edits
   * asks first); the layer is then registered again.
   */
  onClose: () => boolean | void
  /** Outside taps count as inside (a dialog is closed only with its buttons or Esc). */
  modal?: boolean
  parentId?: string
  /** Move focus into the element and trap Tab (dialogs and sheets). */
  trap?: boolean
}

/** Registers an element with the overlay manager; Esc and outside taps come from there. */
export function useOverlayLayer(
  ref: RefObject<HTMLElement | null>,
  opts: OverlayLayerOptions,
): void {
  const { id, layer, modal, parentId, trap } = opts
  const closeRef = useRef(opts.onClose)
  useLayoutEffect(() => {
    closeRef.current = opts.onClose
  })
  const [epoch, setEpoch] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    let live = true
    const handle = overlay.open({
      id,
      layer,
      parentId,
      opener,
      inside: modal ? () => true : (n) => el.contains(n),
      close: () => {
        // Taking the layer away (unmount) is not a request to close it.
        if (!live) return
        if (closeRef.current() === false) setEpoch((n) => n + 1)
      },
    })
    const release = trap ? trapFocus(el, opener) : undefined
    if (trap) {
      if (epoch === 0)
        el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
      if (!el.contains(document.activeElement)) el.focus()
    }
    return () => {
      live = false
      release?.()
      handle.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, id, layer, modal, parentId, trap, epoch])
}
