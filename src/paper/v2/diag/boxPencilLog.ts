import {
  describeEvent,
  pushRow,
  type CheckRow,
} from '../../../design/parts/pencilCheckLogic'
import { watchWindowEvents } from '../../../app/input/windowRecorder'
import { KEEP } from './diagStore'

/** What a text box sees from a real Pencil or finger. Numbers and kinds only. */
export type BoxEntry = CheckRow & {
  /** ms since the page opened */
  t: number
  x: number
  y: number
  /** What reacted, read just after the event: kinds only, never text. */
  reaction: string
}

export const BOX_EVENTS = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'touchstart',
  'touchend',
  'touchcancel',
  'click',
  'dblclick',
  'focusin',
  'focusout',
] as const

export const BOX = '[data-paper-box]'

/** Is the event inside a text box? */
export function inBox(el: Element | null | undefined): boolean {
  return !!el?.closest?.(BOX)
}

/** The reaction as short words (no text): selection kind, keyboard, box state. */
export function reactionOf(opts: {
  selection: 'none' | 'caret' | 'range'
  editableFocused: boolean
  boxSelected: boolean
}): string {
  return [
    `sel=${opts.selection}`,
    `keys=${opts.editableFocused ? 'on' : 'off'}`,
    `box=${opts.boxSelected ? 'selected' : 'idle'}`,
  ].join(' ')
}

function reactionNow(el: Element | null): string {
  const s = document.getSelection()
  const a = document.activeElement
  return reactionOf({
    selection:
      !s || s.rangeCount === 0 ? 'none' : s.isCollapsed ? 'caret' : 'range',
    editableFocused: !!a && (a as HTMLElement).isContentEditable === true,
    boxSelected: !!el?.closest?.(
      `${BOX}[data-selected], ${BOX}[aria-selected="true"]`,
    ),
  })
}

/**
 * Starts logging. `onRows` gets the newest-first list after each change.
 * Passive: never stops or changes an event. Returns the stop function.
 */
export function startBoxPencilLog(
  initial: BoxEntry[],
  onRows: (rows: BoxEntry[]) => void,
): () => void {
  let rows = initial
  let id = initial.reduce((m, r) => Math.max(m, r.id), 0)
  const seen = new WeakMap<Event, number>()
  const commit = (next: BoxEntry[]) => {
    rows = next
    onRows(rows)
  }
  const onCapture = (e: Event) => {
    const el = e.target instanceof Element ? e.target : null
    if (!inBox(el)) return
    const p = e as Event & { clientX?: number; clientY?: number }
    const entry: BoxEntry = {
      ...describeEvent(e, ++id, () => false),
      t: Math.round(performance.now()),
      x: Math.round(p.clientX ?? 0),
      y: Math.round(p.clientY ?? 0),
      reaction: '',
    }
    const next = pushRow(rows, entry, KEEP)
    seen.set(e, next[0].id)
    commit(next)
    const rid = next[0].id
    setTimeout(() => {
      const reaction = reactionNow(el)
      commit(
        rows.map((r) =>
          r.id === rid ? { ...r, prevented: e.defaultPrevented, reaction } : r,
        ),
      )
    }, 0)
  }
  const onBubble = (e: Event) => {
    const rid = seen.get(e)
    if (rid === undefined) return
    commit(rows.map((r) => (r.id === rid ? { ...r, bubbled: true } : r)))
  }
  return watchWindowEvents(BOX_EVENTS, onCapture, onBubble)
}
