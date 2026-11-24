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
  /** Caret position after the event in px (-1: no caret), to measure caret jumps. */
  caretX: number
  caretY: number
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

export type BoxState = 'dragging' | 'typing' | 'picked' | 'idle'

/** The box's own state marks (BoxFrame.tsx): data-dragging, data-typing, data-picked. */
export function boxStateOf(box: Element | null | undefined): BoxState {
  if (!box) return 'idle'
  if (box.hasAttribute('data-dragging')) return 'dragging'
  if (box.hasAttribute('data-typing')) return 'typing'
  if (box.hasAttribute('data-picked')) return 'picked'
  return 'idle'
}

/** Where the event happened: a pointer or click, or the first touch. */
export function pointOf(e: Event): { x: number; y: number } {
  const raw = e as Event & {
    clientX?: number
    clientY?: number
    changedTouches?: ArrayLike<{ clientX: number; clientY: number }>
    touches?: ArrayLike<{ clientX: number; clientY: number }>
  }
  const t = raw.changedTouches?.[0] ?? raw.touches?.[0]
  const x = t ? t.clientX : raw.clientX
  const y = t ? t.clientY : raw.clientY
  return { x: Math.round(x ?? 0), y: Math.round(y ?? 0) }
}

/** The reaction as short words (no text): selection kind, keyboard, box state. */
export function reactionOf(opts: {
  selection: 'none' | 'caret' | 'range'
  editableFocused: boolean
  boxState: BoxState
}): string {
  return [
    `sel=${opts.selection}`,
    `keys=${opts.editableFocused ? 'on' : 'off'}`,
    `box=${opts.boxState}`,
  ].join(' ')
}

/** The caret's place in px, or -1 when there is none. Numbers only. */
export function caretPoint(): { x: number; y: number } {
  try {
    const s = document.getSelection()
    if (!s || s.rangeCount === 0 || !s.isCollapsed) return { x: -1, y: -1 }
    const r = s.getRangeAt(0)
    const rect = r.getClientRects()[0] ?? r.getBoundingClientRect()
    if (
      !rect ||
      (rect.width === 0 && rect.height === 0 && rect.x === 0 && rect.y === 0)
    )
      return { x: -1, y: -1 }
    return { x: Math.round(rect.left), y: Math.round(rect.top) }
  } catch {
    return { x: -1, y: -1 }
  }
}

function reactionNow(el: Element | null): string {
  const s = document.getSelection()
  const a = document.activeElement
  return reactionOf({
    selection:
      !s || s.rangeCount === 0 ? 'none' : s.isCollapsed ? 'caret' : 'range',
    editableFocused: !!a && (a as HTMLElement).isContentEditable === true,
    boxState: boxStateOf(el?.closest?.(BOX)),
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
    const at = pointOf(e)
    const entry: BoxEntry = {
      ...describeEvent(e, ++id, () => false),
      t: Math.round(performance.now()),
      x: at.x,
      y: at.y,
      reaction: '',
      caretX: -1,
      caretY: -1,
    }
    const next = pushRow(rows, entry, KEEP)
    seen.set(e, next[0].id)
    commit(next)
    const rid = next[0].id
    setTimeout(() => {
      const reaction = reactionNow(el)
      const caret = caretPoint()
      commit(
        rows.map((r) =>
          r.id === rid
            ? {
                ...r,
                prevented: e.defaultPrevented,
                reaction,
                caretX: caret.x,
                caretY: caret.y,
              }
            : r,
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
