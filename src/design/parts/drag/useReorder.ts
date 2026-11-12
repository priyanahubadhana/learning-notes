import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
  type PointerEvent as RPointerEvent,
} from 'react'
import {
  HOLD_MS,
  LOST_MS,
  keyTarget,
  keyToMove,
  moveItem,
  nextFit,
  pressMove,
  snapToFit,
  startMode,
  targetIndex,
  type Axis,
  type MoveKey,
  type Point,
} from './reorder'
import { tp } from '../tp'

export type MoveKind = 'drag' | 'button' | 'key'
export type HandleKind = 'grip' | 'row' | 'both'

export interface ReorderProps<T> {
  items: T[]
  getId(t: T): string
  axis: Axis
  /** Always one history step. `toIndex` is the index in the final list. */
  onMove(id: string, toIndex: number, kind: MoveKind): void
  handle?: HandleKind
  showMoveButtons?: boolean
  /** Grid: can this item sit in `slot` of the final order `order`? */
  fit?: (id: string, slot: number, order: string[]) => boolean
  label(t: T): string
  disabled?: boolean
  /** A drop that fits nowhere returns the item to its old place and calls this. */
  onReject?(id: string): void
  /** Columns of the grid (css var `--rord-cols`). */
  cols?: number
  span?: (t: T) => number
}

export interface DropLineRect {
  axis: 'y' | 'x'
  left: number
  top: number
  width: number
  height: number
}

interface DragState {
  id: string
  phase: 'pending' | 'lifted'
  order: string[] | null
  invalid: boolean
}

interface Press {
  id: string
  kind: 'grip' | 'row'
  pointerId: number
  pointerType: string
  mode: 'immediate' | 'hold'
  sx: number
  sy: number
  x: number
  y: number
  grabX: number
  grabY: number
  from: number
  lifted: boolean
  cap: Element | null
  hold: ReturnType<typeof setTimeout> | null
  lost: ReturnType<typeof setTimeout> | null
}

const ACTIVE_ATTR = 'data-reorder-active'
const INTERACTIVE =
  'button,input,textarea,select,a,[contenteditable],[data-no-drag]'
const reduced = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

export function useReorder<T>(props: ReorderProps<T>) {
  const { items, getId, axis, handle = 'grip', disabled } = props
  const propsRef = useRef(props)
  useLayoutEffect(() => {
    propsRef.current = props
  })
  const containerRef = useRef<HTMLElement | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [line, setLine] = useState<DropLineRect | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const press = useRef<Press | null>(null)
  const orderRef = useRef<string[]>([])
  const focusId = useRef<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClick = useRef(false)
  const prevPos = useRef(new Map<string, Point>())

  const ids = useMemo(() => items.map(getId), [items, getId])
  const orderedIds = drag?.order ?? ids
  const byId = useMemo(() => {
    const m = new Map<string, T>()
    items.forEach((it) => m.set(getId(it), it))
    return m
  }, [items, getId])
  const ordered = useMemo(
    () =>
      orderedIds.map((i) => byId.get(i)).filter((x): x is T => x !== undefined),
    [orderedIds, byId],
  )

  const nameOf = (id: string) => {
    const it = byId.get(id)
    return it === undefined ? id : propsRef.current.label(it)
  }

  const els = () => {
    const map = new Map<string, HTMLElement>()
    containerRef.current
      ?.querySelectorAll<HTMLElement>(':scope > [data-reorder-id]')
      .forEach((el) => map.set(el.dataset.reorderId ?? '', el))
    return map
  }

  const flash = (id: string) => {
    setFlashId(id)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashId(null), 700)
  }

  /** Pointer in the container's own (scrolled) coordinates. */
  const toLocal = (cx: number, cy: number): Point => {
    const c = containerRef.current
    if (!c) return { x: cx, y: cy }
    const r = c.getBoundingClientRect()
    return { x: cx - r.left + c.scrollLeft, y: cy - r.top + c.scrollTop }
  }

  /** Puts the lifted element under the pointer and places the drop-line. */
  const applyDrag = () => {
    const p = press.current
    if (!p?.lifted) return
    const el = els().get(p.id)
    if (!el) return
    const local = toLocal(p.x, p.y)
    const tx = axis === 'y' ? 0 : local.x - p.grabX - el.offsetLeft
    const ty = axis === 'x' ? 0 : local.y - p.grabY - el.offsetTop
    el.style.transform = `translate(${tx}px, ${ty}px) scale(1.02)`
    if (axis !== 'grid') {
      const next: DropLineRect =
        axis === 'y'
          ? {
              axis: 'y',
              left: el.offsetLeft,
              top: el.offsetTop + el.offsetHeight / 2,
              width: el.offsetWidth,
              height: 0,
            }
          : {
              axis: 'x',
              left: el.offsetLeft + el.offsetWidth / 2,
              top: el.offsetTop,
              width: 0,
              height: el.offsetHeight,
            }
      setLine((old) =>
        old &&
        old.axis === next.axis &&
        old.left === next.left &&
        old.top === next.top &&
        old.width === next.width &&
        old.height === next.height
          ? old
          : next,
      )
    }
  }

  const clearTimers = (p: Press) => {
    if (p.hold) clearTimeout(p.hold)
    if (p.lost) clearTimeout(p.lost)
    p.hold = null
    p.lost = null
  }

  const finish = (commit: boolean) => {
    const p = press.current
    if (!p) return
    clearTimers(p)
    press.current = null
    document.documentElement.removeAttribute(ACTIVE_ATTR)
    try {
      p.cap?.releasePointerCapture(p.pointerId)
    } catch {
      /* already released */
    }
    if (!p.lifted) {
      setDrag(null)
      return
    }
    suppressClick.current = true
    setTimeout(() => {
      suppressClick.current = false
    }, 60)
    const order = orderRef.current
    const to = order.indexOf(p.id)
    const el = els().get(p.id)
    const cur = el?.style.transform ?? ''
    if (el) el.style.transform = ''
    if (commit && to >= 0 && to !== p.from) {
      propsRef.current.onMove(p.id, to, 'drag')
      setAnnouncement(
        tp('parts.drag.moved', {
          name: nameOf(p.id),
          pos: to + 1,
          total: order.length,
        }),
      )
      flash(p.id)
    } else if (!commit) {
      propsRef.current.onReject?.(p.id)
    }
    if (el && cur && !reduced() && typeof el.animate === 'function') {
      el.animate([{ transform: cur }, { transform: 'none' }], {
        duration: 180,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      })
    }
    setLine(null)
    setDrag(null)
  }

  const lift = (p: Press, el: HTMLElement | undefined) => {
    p.lifted = true
    if (p.hold) clearTimeout(p.hold)
    p.hold = null
    const local = toLocal(p.x, p.y)
    p.grabX = local.x - (el?.offsetLeft ?? 0)
    p.grabY = local.y - (el?.offsetTop ?? 0)
    p.from = ids.indexOf(p.id)
    orderRef.current = [...ids]
    document.documentElement.setAttribute(ACTIVE_ATTR, '1')
    window.getSelection()?.removeAllRanges()
    try {
      p.cap?.setPointerCapture(p.pointerId)
    } catch {
      /* the pointer is gone */
    }
    if (p.pointerType !== 'mouse') navigator.vibrate?.(8)
    setDrag({ id: p.id, phase: 'lifted', order: [...ids], invalid: false })
    setAnnouncement(tp('parts.drag.lifted', { name: nameOf(p.id) }))
  }

  const armLost = (p: Press) => {
    if (p.lost) clearTimeout(p.lost)
    p.lost = setTimeout(() => finish(true), LOST_MS)
  }

  const onDown = (
    e: RPointerEvent<HTMLElement>,
    id: string,
    kind: 'grip' | 'row',
  ) => {
    if (disabled || press.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (kind === 'row') {
      const hit = (e.target as Element).closest(INTERACTIVE)
      if (hit && hit !== e.currentTarget) return
    }
    const p: Press = {
      id,
      kind,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      mode: startMode(kind, e.pointerType),
      sx: e.clientX,
      sy: e.clientY,
      x: e.clientX,
      y: e.clientY,
      grabX: 0,
      grabY: 0,
      from: -1,
      lifted: false,
      cap: e.currentTarget,
      hold: null,
      lost: null,
    }
    press.current = p
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* synthetic pointer */
    }
    if (kind === 'grip') e.stopPropagation()
    setDrag({ id, phase: 'pending', order: null, invalid: false })
    armLost(p)
    if (p.mode === 'hold') {
      p.hold = setTimeout(() => lift(p, els().get(id)), HOLD_MS)
    }
  }

  const reflow = (p: Press) => {
    const map = els()
    const order = orderRef.current
    const me = map.get(p.id)
    if (!me) return
    const local = toLocal(p.x, p.y)
    const centre: Point = {
      x: local.x - p.grabX + me.offsetWidth / 2,
      y: local.y - p.grabY + me.offsetHeight / 2,
    }
    const others = order.filter((i) => i !== p.id)
    const centres = others.map((i) => {
      const el = map.get(i)
      return {
        x: (el?.offsetLeft ?? 0) + (el?.offsetWidth ?? 0) / 2,
        y: (el?.offsetTop ?? 0) + (el?.offsetHeight ?? 0) / 2,
      }
    })
    const wanted = targetIndex(centres, centre, axis)
    const cur = order.indexOf(p.id)
    const fitFn = propsRef.current.fit
    const snapped = snapToFit(
      wanted,
      order.length,
      fitFn
        ? (slot) => fitFn(p.id, slot, moveItem(order, cur, slot))
        : undefined,
    )
    const dest = snapped === -1 ? cur : snapped
    const invalid = snapped !== Math.max(0, Math.min(order.length - 1, wanted))
    if (dest !== cur) {
      const next = moveItem(order, cur, dest)
      orderRef.current = next
      setDrag({ id: p.id, phase: 'lifted', order: next, invalid })
    } else {
      setDrag((d) => (d && d.invalid !== invalid ? { ...d, invalid } : d))
    }
  }

  const onMove = (e: RPointerEvent<HTMLElement>) => {
    const p = press.current
    if (!p || e.pointerId !== p.pointerId) return
    p.x = e.clientX
    p.y = e.clientY
    armLost(p)
    if (!p.lifted) {
      const what = pressMove(p.mode, Math.hypot(p.x - p.sx, p.y - p.sy))
      if (what === 'cancel') return finish(false)
      if (what === 'wait') return
      lift(p, els().get(p.id))
    }
    reflow(p)
    applyDrag()
  }

  const onUp = (e: RPointerEvent<HTMLElement>) => {
    const p = press.current
    if (!p || e.pointerId !== p.pointerId) return
    if (!p.lifted) return finish(false)
    const fitFn = propsRef.current.fit
    const order = orderRef.current
    finish(!fitFn || fitFn(p.id, order.indexOf(p.id), order))
  }

  const onCancel = (e: RPointerEvent<HTMLElement>) => {
    const p = press.current
    if (!p || e.pointerId !== p.pointerId) return
    finish(false)
  }

  /** ▲▼ buttons, the row menu and Alt+arrows. */
  const moveBy = useCallback(
    (id: string, key: MoveKey, kind: MoveKind = 'button') => {
      const cur = propsRef.current
      const list = cur.items.map(cur.getId)
      const from = list.indexOf(id)
      if (from < 0) return
      let to = keyTarget(from, list.length, key)
      if (to !== -1 && cur.fit) {
        const fit = cur.fit
        const fitAt = (slot: number) =>
          fit(id, slot, moveItem(list, from, slot))
        to =
          key === 'up' || key === 'down'
            ? nextFit(from, key === 'up' ? -1 : 1, list.length, fitAt)
            : snapToFit(to, list.length, fitAt)
        if (to === from) to = -1
      }
      if (to === -1) return
      focusId.current = kind === 'key' ? id : null
      cur.onMove(id, to, kind)
      setAnnouncement(
        tp('parts.drag.moved', {
          name: cur.label(cur.items[from]),
          pos: to + 1,
          total: list.length,
        }),
      )
      flash(id)
    },
    [],
  )

  const onKeyDown = (e: RKeyboardEvent<HTMLElement>, id: string) => {
    if (disabled || !e.altKey) return
    if ((e.target as Element).closest('input,textarea,[contenteditable]')) return
    const mv = keyToMove(e.key, axis)
    if (!mv) return
    e.preventDefault()
    moveBy(id, mv, 'key')
  }

  // After every render: slide the others into place (FLIP), keep the lifted
  // one under the pointer, put focus back on a keyboard-moved item.
  useLayoutEffect(() => {
    const map = els()
    const dragging = press.current?.lifted ? press.current.id : null
    const anim = !reduced()
    const next = new Map<string, Point>()
    map.forEach((el, id) => {
      const pos = { x: el.offsetLeft, y: el.offsetTop }
      next.set(id, pos)
      const old = prevPos.current.get(id)
      if (
        anim &&
        id !== dragging &&
        old &&
        (old.x !== pos.x || old.y !== pos.y) &&
        typeof el.animate === 'function'
      ) {
        el.animate(
          [
            { transform: `translate(${old.x - pos.x}px, ${old.y - pos.y}px)` },
            { transform: 'none' },
          ],
          { duration: 160, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        )
      }
    })
    prevPos.current = next
    applyDrag()
    if (focusId.current) {
      map.get(focusId.current)?.focus()
      focusId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  // Non-passive touchmove on the list: once lifted, the page must not scroll.
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const stop = (ev: TouchEvent) => {
      if (press.current?.lifted) ev.preventDefault()
    }
    c.addEventListener('touchmove', stop, { passive: false })
    return () => c.removeEventListener('touchmove', stop)
  }, [])

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
      const p = press.current
      if (p) clearTimers(p)
      press.current = null
      document.documentElement.removeAttribute(ACTIVE_ATTR)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const hasRow = handle === 'row' || handle === 'both'
  const hasGrip = handle === 'grip' || handle === 'both'

  return {
    ordered,
    orderedIds,
    drag,
    line,
    announcement,
    containerRef,
    hasGrip,
    moveBy,
    containerProps: {
      onClickCapture: (e: {
        stopPropagation(): void
        preventDefault(): void
      }) => {
        if (suppressClick.current) {
          e.stopPropagation()
          e.preventDefault()
        }
      },
    },
    itemProps: (id: string) => ({
      'data-reorder-id': id,
      'data-state':
        drag?.id === id
          ? drag.phase === 'lifted'
            ? drag.invalid
              ? 'invalid'
              : 'lifted'
            : 'hold-pending'
          : flashId === id
            ? 'flash'
            : 'idle',
      tabIndex: disabled ? -1 : 0,
      onPointerDown: hasRow
        ? (e: RPointerEvent<HTMLElement>) => onDown(e, id, 'row')
        : undefined,
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerCancel: onCancel,
      onKeyDown: (e: RKeyboardEvent<HTMLElement>) => onKeyDown(e, id),
    }),
    gripProps: (id: string) => ({
      'data-reorder-grip': '',
      'aria-label': tp('parts.drag.grip', { name: nameOf(id) }),
      disabled,
      onPointerDown: (e: RPointerEvent<HTMLElement>) => onDown(e, id, 'grip'),
    }),
  }
}
