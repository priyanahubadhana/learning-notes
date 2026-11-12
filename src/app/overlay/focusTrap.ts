const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Keeps Tab / Shift+Tab inside `container`. The returned function releases the trap and focuses `opener`. */
export function trapFocus(
  container: HTMLElement,
  opener?: HTMLElement | null,
): () => void {
  const items = () =>
    Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const list = items()
    if (!list.length) {
      e.preventDefault()
      return
    }
    const first = list[0]
    const last = list[list.length - 1]
    const active = container.ownerDocument.activeElement
    if (e.shiftKey && (active === first || !container.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (
      !e.shiftKey &&
      (active === last || !container.contains(active))
    ) {
      e.preventDefault()
      first.focus()
    }
  }
  container.ownerDocument.addEventListener('keydown', onKey)
  let released = false
  return () => {
    if (released) return
    released = true
    container.ownerDocument.removeEventListener('keydown', onKey)
    opener?.focus()
  }
}
