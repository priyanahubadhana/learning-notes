type Pop = HTMLElement & {
  showPopover?: () => void
  hidePopover?: () => void
}

/** Puts an element in the browser's top layer (no stacking numbers needed). Safe where unsupported. */
export function showTop(el: HTMLElement | null) {
  if (!el) return
  const p = el as Pop
  try {
    p.showPopover?.()
  } catch {
    /* already open or not supported: it still shows, just not on top */
  }
}

/** Moves an already shown top-layer element back above everything else. */
export function raiseTop(el: HTMLElement | null) {
  if (!el) return
  const p = el as Pop
  try {
    p.hidePopover?.()
    p.showPopover?.()
  } catch {
    /* ignore */
  }
}

/** `manual` where the browser has the top layer, else nothing (the element still shows). */
export const popoverAttr = (): 'manual' | undefined =>
  typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype
    ? 'manual'
    : undefined

/** The sheet docks beside the page from this width up; below it, it fills the screen. */
export const SHEET_DOCK_MIN = 1024
export const sheetDocks = (width = window.innerWidth) => width >= SHEET_DOCK_MIN
