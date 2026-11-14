/**
 * "Pencil check" (P1.5a): a hidden recorder that only exists on the preview
 * host with ?pencilcheck=1. It records what Safari really sends on and around
 * the scroll bars; it never changes how the app behaves.
 */

/** Shown only on the preview host AND with ?pencilcheck=1 in the address. */
export function pencilCheckShown(onPreview: boolean, search: string): boolean {
  if (!onPreview) return false
  try {
    return new URLSearchParams(search).get('pencilcheck') === '1'
  } catch {
    return false
  }
}

/** The events the panel listens for. */
export const CHECK_EVENTS = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'gotpointercapture',
  'lostpointercapture',
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
  'click',
  'scroll',
] as const

export const MAX_ROWS = 25

export type CheckRow = {
  id: number
  type: string
  pointerType: string
  target: string
  prevented: boolean
  buttons: string
  pressure: string
  touchType: string
  touchAction: string
  /** Did the event reach the window in the bubble phase (a handler may stop it)? */
  bubbled: boolean
  /** Was it handled by the scroll bar (it, or the thing it scrolls, was marked)? */
  barHandled: boolean
}

/** A short name for an element: tag, data-* id, first classes. */
export function shortTarget(el: Element | null | undefined): string {
  if (!el || !(el as HTMLElement).tagName) return '-'
  const d = el as HTMLElement
  let s = d.tagName.toLowerCase()
  for (const a of Array.from(d.attributes)) {
    if (a.name.startsWith('data-') && a.name !== 'data-chrome') {
      s += `[${a.name}]`
      break
    }
  }
  const cls = typeof d.className === 'string' ? d.className.trim() : ''
  if (cls) s += '.' + cls.split(/\s+/).slice(0, 2).join('.')
  return s.slice(0, 48)
}

/** Is this event on or around a scroll bar, or on a list the bar scrolls? */
export function isNearBar(el: Element | null | undefined): boolean {
  if (!el || !el.closest) return false
  return !!el.closest(
    '.sbar, [data-scrollbar], [data-pagebar], [data-page-scroller]',
  )
}

const num = (v: unknown) => (typeof v === 'number' ? String(v) : '-')

/** One row from a raw event (pure apart from reading styles). */
export function describeEvent(
  e: Event,
  id: number,
  barHandled: (el: Element | null) => boolean,
): CheckRow {
  const raw = e as Event & {
    pointerType?: string
    buttons?: number
    pressure?: number
    touches?: ArrayLike<{ touchType?: string }>
    changedTouches?: ArrayLike<{ touchType?: string }>
  }
  const el = e.target instanceof Element ? e.target : null
  const touch = raw.changedTouches?.[0] ?? raw.touches?.[0]
  let touchAction = '-'
  try {
    if (el) touchAction = getComputedStyle(el).touchAction
  } catch {
    /* no styles available */
  }
  return {
    id,
    type: e.type,
    pointerType: raw.pointerType ?? '-',
    target: shortTarget(el),
    prevented: e.defaultPrevented,
    buttons: num(raw.buttons),
    pressure: raw.pressure === undefined ? '-' : raw.pressure.toFixed(2),
    touchType: touch?.touchType ?? '-',
    touchAction,
    bubbled: false,
    barHandled: barHandled(el),
  }
}

/** Newest first, at most MAX_ROWS. */
export function pushRow(rows: CheckRow[], row: CheckRow): CheckRow[] {
  return [row, ...rows].slice(0, MAX_ROWS)
}
