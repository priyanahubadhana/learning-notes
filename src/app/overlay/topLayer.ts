import {
  overlay,
  type OverlayHandle,
  type OverlayManager,
  type OverlayOptions,
} from './manager'

/**
 * Opens an element in the browser top layer (above every z-index) and
 * registers it with the overlay manager, so the usual rules still hold:
 * one open at a time, Esc closes the top one, an outside tap closes it.
 *
 * Parts call this instead of `showPopover()` / `showModal()` directly.
 * - `popover` (default): the element becomes `popover="manual"`, so the
 *   browser's own light dismiss never fights the manager.
 * - `dialog`: a `<dialog>` opened with `showModal()`; its own Esc
 *   ("cancel") is handed to the manager instead.
 * Where the browser has neither, the element simply stays where it is.
 */
export interface TopLayerOptions extends Omit<
  OverlayOptions,
  'close' | 'inside'
> {
  mode?: 'popover' | 'dialog'
  /** Runs once after the element left the top layer (any reason). */
  onClose?: () => void
  /** Extra elements that count as inside (e.g. a menu opened from it). */
  inside?: (el: Element) => boolean
}

type PopoverEl = HTMLElement & {
  showPopover?: () => void
  hidePopover?: () => void
}

export function openInTopLayer(
  el: HTMLElement,
  opts: TopLayerOptions,
  manager: OverlayManager = overlay,
): OverlayHandle {
  const { mode = 'popover', onClose, inside, ...rest } = opts
  const p = el as PopoverEl
  const dialog = mode === 'dialog' ? (el as HTMLDialogElement) : null
  const onCancel = (e: Event) => {
    e.preventDefault()
    // Esc never closes a persistent bar; only its own handle does.
    if (!opts.persistent) handle.close()
  }

  let shown = false
  try {
    if (dialog && typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
      dialog.oncancel = onCancel
      shown = true
    } else if (!dialog && typeof p.showPopover === 'function') {
      if (el.getAttribute('popover') !== 'manual')
        el.setAttribute('popover', 'manual')
      p.showPopover()
      shown = true
    }
  } catch {
    // Already shown or not connected: the manager entry still applies.
  }

  let closed = false
  const handle = manager.open({
    ...rest,
    inside: (target) => el.contains(target) || !!inside?.(target),
    close: () => {
      if (closed) return
      closed = true
      if (dialog?.oncancel === onCancel) dialog.oncancel = null
      try {
        if (dialog?.open) dialog.close()
        else if (shown && !dialog) p.hidePopover?.()
      } catch {
        // Already hidden.
      }
      onClose?.()
    },
  })
  return handle
}
