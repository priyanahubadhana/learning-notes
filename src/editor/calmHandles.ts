/**
 * Calm handles: the table grips ("⋮⋮" row and column, "+" edge buttons) and
 * the block "⠿ / +" side menu show only while the pointer is over their
 * table or block, fade out ~300 ms after it leaves, and never linger. On
 * touch they hide 3 s after the last tap, or at once on a tap elsewhere.
 * Done with two classes on <html> that the CSS (index.css) fades.
 */
const MENUS = '[role="menu"], .bn-menu-dropdown, .mantine-Menu-dropdown'
const TABLE_AREA = `[data-content-type="table"], .bn-table-handle, .bn-extend-button, ${MENUS}`
const SIDE_AREA = `.bn-editor, .bn-side-menu, ${MENUS}`
const LEAVE_MS = 300
const TOUCH_MS = 3000

/** Starts the rule; returns the function that stops it. */
export function installCalmHandles(): () => void {
  const root = document.documentElement
  const timers = new Map<string, number>()
  const set = (cls: string, away: boolean, delay: number) => {
    window.clearTimeout(timers.get(cls))
    timers.delete(cls)
    if (!away) return root.classList.remove(cls)
    if (root.classList.contains(cls)) return
    if (delay <= 0) return root.classList.add(cls)
    timers.set(
      cls,
      window.setTimeout(() => root.classList.add(cls), delay),
    )
  }
  const both = (inTable: boolean, inSide: boolean, delay: number) => {
    set('ln-grips-away', !inTable, delay)
    set('ln-side-away', !inSide, delay)
  }
  const inside = (target: EventTarget | null) => {
    const el = target instanceof Element ? target : null
    return [!!el?.closest(TABLE_AREA), !!el?.closest(SIDE_AREA)] as const
  }
  let touchTimer = 0
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    const [a, b] = inside(e.target)
    both(a, b, LEAVE_MS)
  }
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    const [a, b] = inside(e.target)
    window.clearTimeout(touchTimer)
    both(a, b, 0)
    if (a || b) {
      touchTimer = window.setTimeout(() => both(false, false, 0), TOUCH_MS)
    }
  }
  const onLeave = () => both(false, false, LEAVE_MS)
  document.addEventListener('pointermove', onMove, true)
  document.addEventListener('pointerdown', onDown, true)
  document.documentElement.addEventListener('mouseleave', onLeave)
  return () => {
    document.removeEventListener('pointermove', onMove, true)
    document.removeEventListener('pointerdown', onDown, true)
    document.documentElement.removeEventListener('mouseleave', onLeave)
    window.clearTimeout(touchTimer)
    for (const id of timers.values()) window.clearTimeout(id)
    root.classList.remove('ln-grips-away', 'ln-side-away')
  }
}
