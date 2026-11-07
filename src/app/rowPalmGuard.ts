import { palmTouch } from './palmGuard'

/**
 * Sidebar and list buttons ignore a palm. Inside any `[data-palm-guard]`
 * area, a touch that starts on a button while the Pencil is down (or just
 * lifted) is cancelled together with the click that would follow it.
 * Loaded only on touch devices.
 */
export function installRowPalmGuard(doc: Document = document): () => void {
  let blockedAt = 0
  const guarded = (t: EventTarget | null) =>
    t instanceof Element &&
    t.closest('[data-palm-guard]') !== null &&
    t.closest('button, [role=button], [role=menuitem], a') !== null
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || !guarded(e.target)) return
    if (palmTouch(e)) {
      blockedAt = Date.now()
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  }
  const onClick = (e: MouseEvent) => {
    if (!blockedAt) return
    const fresh = Date.now() - blockedAt < 800
    blockedAt = 0
    if (fresh && guarded(e.target)) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  }
  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('click', onClick, true)
  return () => {
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('click', onClick, true)
  }
}
