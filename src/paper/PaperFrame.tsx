import { PICK_BOX } from '../editor/tapSelect'
import { isUiEvent } from '../app/uiGuard'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import type { GridRow, Page, PaperBox } from '../core/types'
import {
  boxesOf,
  MAIN_BOX,
  mainBox,
  MARGIN,
  TOP,
  readingOrder,
  sheetOf,
} from './boxes'
import { BoxFrame, type GrabHow } from './BoxFrame'
import { clampBox, MIN_W, type BoxPatch } from './boxService'
import {
  insertAt,
  insertRow,
  layoutRows,
  migrateToRows,
  reconcile,
  removeBox as removeFromRows,
  zoneOf,
  type Geometry,
  type Zone,
} from './grid'
import { GridDividers } from './GridDividers'
import { bounds, record, replay, waitFor, type Recorded } from './penOnPaper'
import { activeTool } from '../app/tools/main/mainTools'
import { onGestureReset } from '../app/gestureReset'
import { startGripDrag } from '../app/tools/gripDrag'
import { adopterIn, lassoAcrossBoxes, setPaperDrop } from '../ink/inkTransfer'
import { lassoSettings } from '../app/tools/main/inkSettings'
import { sheetNav } from './sheetNav'
import { applyPagination, clearPagination } from './paginate'
import {
  onPaginationRelease,
  paginationHeld,
  playTrackedMove,
  sheetMetrics,
} from './paginateHold'
import { onWakeBox } from './wakeBox'
import {
  clampZoom,
  NARROW_PX,
  rubberZoom,
  springEase,
  paperStepMm,
  sheetCount,
  SHEET_GAP_PX,
} from './sheets'

/** Item 7: the page scroll bar loads when a paper page shows (first-load size). */
const PageScrollBar = lazy(() =>
  import('./PageScrollBar').then((m) => ({ default: m.PageScrollBar })),
)

/**
 * Phase Q step 2: the page shown as paper. Fixed sheets (A4 or Letter) with
 * a border and the page's background, stacked top to bottom; the default
 * box (the page's editor, `children`) sits on them at its place. Zoom keeps
 * the text sharp (CSS zoom on the box) and changes the paper's real width;
 * pan is the scroll of the frame. Two fingers pinch; the Pencil never zooms.
 */
export function PaperFrame({
  page,
  flat = false,
  renderBox,
  eager,
  onAddBox,
  onAddBoxInOrder,
  onGridChange,
  onGridView,
  onBoxMenu,
  onDeleteBox,
  renderBar,
  onInkOnPaper,
  showHint = false,
  children,
}: {
  page: Pick<Page, 'id' | 'sheet' | 'inkBg' | 'boxes' | 'rows'>
  /** The block editor of a box other than the default one. */
  renderBox?: (boxId: string) => ReactNode
  /** A box whose editor is made at once (just made: it takes the caret). */
  eager?: string | null
  /** A tap on empty paper (mm); unset = no new boxes (read-only). */
  onAddBox?: (at: { x: number; y: number; row?: number }) => void
  /** Phones (fit width): a new box after a box id, at the 'start' or the 'end'. */
  onAddBoxInOrder?: (after: string) => void
  /** Boxes moved or resized in one go (a drop pushes others): one Undo. */
  onBoxesChange?: (changes: BoxChange[]) => void
  /**
   * Item 26: a drop or a divider changed the box grid: the new rows and the
   * places they give the boxes (mm), in one write, one Undo.
   */
  onGridChange?: (rows: GridRow[], places: BoxPatch[]) => void
  /** Tells the hook the grid as drawn now (rows, places), for ⋯ › Layout. */
  onGridView?: (
    rows: GridRow[],
    places: BoxPatch[],
    measured: { heights: Record<string, number>; geo: Geometry },
  ) => void
  onBoxMenu?: (box: PaperBox, at: DOMRect) => void
  /** Delete a box (an empty box goes with Backspace; a selected one with Delete). */
  onDeleteBox?: (box: PaperBox) => void
  /** The floating bar under a selected box. */
  renderBar?: (box: PaperBox) => ReactNode
  /**
   * Rule 4: ink on empty paper. Makes a box (mm) with that many empty lines
   * and returns its id; unset = ink on empty paper is ignored.
   */
  onInkOnPaper?: (
    at: { x: number; y: number; w: number },
    lines: number,
  ) => Promise<string | null>
  /** The page is empty and among the first few: show the "tap to add a box" hint. */
  showHint?: boolean
  /** The full-screen reader: plain flowing text, same tree (nothing remounts). */
  flat?: boolean
  children: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const boxEl = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [boxBottom, setBoxBottom] = useState(0)
  const sheet = sheetOf(page)
  const box = boxesOf(page)[0]
  const paperEl = useRef<HTMLDivElement>(null)
  // Where the other boxes end (px from the paper's top), for the sheet count.
  const [bottoms, setBottoms] = useState<Record<string, number>>({})
  const reportBottom = useCallback((id: string, px: number) => {
    setBottoms((b) => (b[id] === px ? b : { ...b, [id]: px }))
  }, [])

  // Fit width = the column the page sits in.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    // The column (the frame itself reaches out by the margins).
    const col = el.parentElement ?? el
    // Hidden (another tab): keep the last width, so nothing reflows.
    const measure = () => {
      if (col.clientWidth > 0) setFit(col.clientWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(col)
    return () => ro.disconnect()
  }, [])

  // At 100 % the default box is exactly the page column (so the text sits
  // where it always did); the sheet's margins reach out beside the column.
  const width = Math.max(1, ((fit * sheet.w) / mainBox(page).w) * zoom)
  const k = width / sheet.w // px per mm
  const sheetPx = sheet.h * k

  // ---- The box grid (item 26): rows of 1-3 columns, boxes never overlap ----
  // Heights are measured (px) and turned into mm; the layout is pure maths
  // (grid.ts). A page with no stored rows is arranged in memory from its
  // boxes; rows are written on the first change.
  const [heights, setHeights] = useState<Record<string, number>>({})
  const reportHeight = useCallback((id: string, px: number) => {
    setHeights((h) => (h[id] === px ? h : { ...h, [id]: px }))
  }, [])
  const heightsMm = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(heights).map(([id, px]) => [id, px / (k || 1)]),
      ),
    [heights, k],
  )
  const geo: Geometry = useMemo(
    () => ({
      sheetW: sheet.w,
      sheetH: sheet.h,
      gapMm: SHEET_GAP_PX / (k || 1),
      left: box.x,
      right: sheet.w - box.x - box.w,
      top: box.y,
      bottom: MARGIN,
    }),
    [sheet.w, sheet.h, k, box.x, box.w, box.y],
  )
  const baseRows = useMemo(
    () =>
      page.rows
        ? reconcile(
            page.rows,
            boxesOf(page).map((b) => b.id),
          )
        : migrateToRows(boxesOf(page), heightsMm),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page.rows, page.boxes, page.sheet],
  )
  /** The arrangement shown while a box is dragged (the live preview). */
  const [preview, setPreview] = useState<GridRow[] | null>(null)
  /** A dropped arrangement stays until the saved page catches up. */
  const [heldState, setHeldState] = useState<{
    rows: GridRow[]
    base: GridRow[] | undefined
  } | null>(null)
  const heldRows =
    heldState && heldState.base === page.rows ? heldState.rows : null
  const setHeldRows = (rows: GridRow[] | null) =>
    setHeldState(rows ? { rows, base: page.rows } : null)
  useEffect(() => {
    if (!heldState) return
    const id = window.setTimeout(() => setHeldState(null), 1500)
    return () => window.clearTimeout(id)
  }, [heldState])
  const rowsView = preview ?? heldRows ?? baseRows
  const layout = useMemo(
    () => layoutRows(rowsView, heightsMm, geo),
    [rowsView, heightsMm, geo],
  )
  const mainShown = layout.get(MAIN_BOX) ?? { x: box.x, y: box.y, w: box.w }
  /** A box with the place the grid gives it. */
  const placed = (b: PaperBox): PaperBox => {
    const r = layout.get(b.id)
    return r ? { ...b, x: r.x, y: r.y, w: r.w } : b
  }

  // The paper grows a sheet at a time under the box's text.
  useEffect(() => {
    const el = boxEl.current
    if (!el) return
    const measure = () => {
      setBoxBottom(
        el.getBoundingClientRect().bottom -
          (el.parentElement?.getBoundingClientRect().top ?? 0),
      )
      // The default box's height for the grid: its editor (the text, not the
      // stretch the ink tools give the box) and the bottom margin.
      const ed = el.querySelector<HTMLElement>('.bn-editor')
      reportHeight(
        MAIN_BOX,
        Math.round(
          ed
            ? ed.getBoundingClientRect().bottom -
                el.getBoundingClientRect().top +
                MARGIN * k
            : el.offsetHeight,
        ),
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [k, reportHeight])
  const lowest = Math.max(
    boxBottom,
    ...boxesOf(page)
      .filter((b) => b.id !== MAIN_BOX)
      .map((b) => bottoms[b.id] ?? (layout.get(b.id)?.y ?? b.y) * k),
  )
  const sheets = sheetCount(lowest + MARGIN * k, sheetPx)

  // Pinch (two fingers) and Ctrl + wheel zoom around the point between them.
  const zoomRef = useRef(zoom)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const zoomAt = (
      next: number,
      clientX: number,
      clientY: number,
      exact = false,
    ) => {
      const z0 = zoomRef.current
      const z1 = exact ? next : clampZoom(next)
      if (z1 === z0) return
      const r = el.getBoundingClientRect()
      const px = el.scrollLeft + clientX - r.left
      const py = el.scrollTop + clientY - r.top
      zoomRef.current = z1
      setZoom(z1)
      requestAnimationFrame(() => {
        el.scrollLeft = (px * z1) / z0 - (clientX - r.left)
        el.scrollTop = (py * z1) / z0 - (clientY - r.top)
      })
    }
    // Below fit width the paper only gives way while the fingers (or the
    // wheel) hold it; on release it eases back to fit (no sticky zoom-out).
    let spring = 0
    let wheelTimer = 0
    const springBack = (cx: number, cy: number) => {
      cancelAnimationFrame(spring)
      const from = zoomRef.current
      if (!(from < 1)) return
      const t0 = performance.now()
      const step = (now: number) => {
        const k = springEase((now - t0) / 220)
        zoomAt(from + (1 - from) * k, cx, cy, true)
        if (k < 1) spring = requestAnimationFrame(step)
      }
      spring = requestAnimationFrame(step)
    }
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      cancelAnimationFrame(spring)
      zoomAt(
        rubberZoom(zoomRef.current * Math.exp(-e.deltaY / 300)),
        e.clientX,
        e.clientY,
      )
      window.clearTimeout(wheelTimer)
      const { clientX, clientY } = e
      wheelTimer = window.setTimeout(() => springBack(clientX, clientY), 180)
    }
    let pinch: { d: number; z: number } | null = null
    let mid = { x: 0, y: 0 }
    const fingers = (e: TouchEvent) =>
      Array.from(e.touches).filter(
        (x) => (x as Touch & { touchType?: string }).touchType !== 'stylus',
      )
    const dist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const start = (e: TouchEvent) => {
      const f = fingers(e)
      if (f.length === 2) {
        cancelAnimationFrame(spring)
        pinch = { d: dist(f[0], f[1]), z: zoomRef.current }
      }
    }
    const move = (e: TouchEvent) => {
      const f = fingers(e)
      if (!pinch || f.length !== 2) return
      if (e.cancelable) e.preventDefault()
      mid = {
        x: (f[0].clientX + f[1].clientX) / 2,
        y: (f[0].clientY + f[1].clientY) / 2,
      }
      zoomAt(
        rubberZoom((pinch.z * dist(f[0], f[1])) / Math.max(1, pinch.d)),
        mid.x,
        mid.y,
      )
    }
    const end = (e: TouchEvent) => {
      if (fingers(e).length < 2) {
        if (pinch) springBack(mid.x, mid.y)
        pinch = null
      }
    }
    // Safari's own page pinch must not fight ours.
    const gesture = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('touchstart', start, { passive: true, capture: true })
    el.addEventListener('touchmove', move, { passive: false, capture: true })
    el.addEventListener('touchend', end, { capture: true })
    el.addEventListener('touchcancel', end, { capture: true })
    el.addEventListener('gesturestart', gesture)
    return () => {
      cancelAnimationFrame(spring)
      window.clearTimeout(wheelTimer)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('touchstart', start, { capture: true })
      el.removeEventListener('touchmove', move, { capture: true })
      el.removeEventListener('touchend', end, { capture: true })
      el.removeEventListener('touchcancel', end, { capture: true })
      el.removeEventListener('gesturestart', gesture)
    }
  }, [])

  const step = paperStepMm(page.inkBg) * k
  // Step 6: a phone or narrow window shows "fit width": no sheets, the boxes
  // stacked under the page's text in reading order, as wide as the column.
  // A phone-sized window (not a narrow column beside the sidebar on an iPad).
  const narrow =
    !flat &&
    fit > 0 &&
    typeof window !== 'undefined' &&
    window.innerWidth < NARROW_PX
  const total = narrow ? 0 : sheets * (sheetPx + SHEET_GAP_PX) - SHEET_GAP_PX
  // The gap between sheets is dead space: lines that would reach the bottom
  // margin move to the top of the next sheet (never split; paste included).
  useEffect(() => {
    const root = scroller.current
    if (!root || flat) return
    const editors = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>('[data-paper-box] .bn-editor'),
      )
    if (narrow) {
      for (const el of editors()) clearPagination(el)
      return
    }
    let frame = 0
    const run = () => {
      frame = 0
      // A picture is being resized: nothing jumps until the finger lifts.
      if (paginationHeld()) return
      const sheet0 = root
        .querySelector<HTMLElement>('[data-paper-sheet="1"]')
        ?.getBoundingClientRect()
      if (!sheet0 || sheet0.height === 0) return
      sheetMetrics.bottomMargin = MARGIN * k
      sheetMetrics.topMargin = TOP * k
      for (const el of editors()) {
        applyPagination(el, sheet0, SHEET_GAP_PX, MARGIN * k, TOP * k)
      }
      playTrackedMove(root)
    }
    const later = () => {
      if (!frame) frame = requestAnimationFrame(run)
    }
    later()
    const mo = new MutationObserver(later)
    mo.observe(root, { childList: true, subtree: true, characterData: true })
    const ro = new ResizeObserver(later)
    for (const el of editors()) ro.observe(el)
    window.addEventListener('resize', later)
    const unhold = onPaginationRelease(later)
    return () => {
      unhold()
      cancelAnimationFrame(frame)
      mo.disconnect()
      ro.disconnect()
      window.removeEventListener('resize', later)
    }
  }, [k, sheets, narrow, flat, page.boxes?.length])

  const stored = boxesOf(page)
    .filter((b) => b.id !== MAIN_BOX)
    .map(placed)
  // Wide: in the order they were made (a new box never moves another in the
  // page, so the caret stays); fit width: stacked in reading order.
  const extra = narrow ? readingOrder(stored) : stored

  // The left panel shows this page's sheets as thumbnails.
  const navSheet = page.sheet ?? 'A4'
  useEffect(() => {
    if (flat || narrow) sheetNav.set(null)
    else
      sheetNav.set({
        pageId: page.id,
        count: sheets,
        sheet: navSheet,
        bg: page.inkBg,
      })
  }, [flat, narrow, page.id, sheets, navSheet, page.inkBg])
  useEffect(() => () => sheetNav.set(null), [])

  // Rule 4: a stroke on empty paper is recorded, a box is made under it and
  // the stroke is played into that box's ink pad.
  const pen = useRef<Recorded[] | null>(null)
  // Where the mouse or Pencil hovers over empty paper (a "+ box" tag).
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const hoverMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const ok =
      !!onAddBox &&
      e.pointerType !== 'touch' &&
      activeTool.get() === 'text' &&
      e.buttons === 0 &&
      (e.target === e.currentTarget ||
        !!(e.target as Element).closest('[data-paper-sheet]'))
    setHover(ok ? { x: e.clientX, y: e.clientY } : null)
  }
  // Step 5: the Lasso on empty paper picks whole boxes (their ink moves with
  // them, as it is linked to their lines); a selected box's grip moves all.
  // The loop being drawn lives in its own small component, so each move
  // redraws one line, not every box of the page.
  const layerRef = useRef<HTMLDivElement>(null)
  const loopLayer = useRef<LoopApi>(null)
  const loop = useRef<Pt[] | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const lassoOn = activeTool.useValue() === 'lasso'
  /** A tap on a box's frame (or grip): it is the selection; Shift adds. */
  const selectBox = (id: string, add: boolean) =>
    setPicked((p) =>
      add ? (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]) : [id],
    )
  // A first tap on a box's text selects the box (tapSelect.ts, item 11).
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; add: boolean }>).detail
      if (extra.some((b) => b.id === d.id)) selectBox(d.id, d.add)
    }
    window.addEventListener(PICK_BOX, on)
    return () => window.removeEventListener(PICK_BOX, on)
  }, [extra])
  // A tap on the bare paper deselects: the Lasso's own loop-up does it.
  useEffect(() => {
    if (picked.length === 0) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setPicked([])
      // Delete with a box selected and the caret elsewhere removes it.
      const el = e.target as HTMLElement | null
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        onDeleteBox &&
        !el?.closest('input, textarea, [contenteditable="true"]')
      ) {
        for (const b of extra)
          if (picked.includes(b.id) && !b.locked) onDeleteBox(b)
        setPicked([])
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [picked, extra, onDeleteBox])

  // Moving boxes (item 26). The box under the pointer (and the others picked
  // with it) follow it as see-through copies; the other boxes slide into the
  // arrangement the drop would give (a live preview), an accent outline marks
  // the landing cell. Release = one write, one Undo.
  const [liveBoxes, setLiveBoxes] = useState<Map<string, PaperBox> | null>(null)
  /** Where the dragged boxes were at the start: they stay there, a transform moves them. */
  const [dragOrigin, setDragOrigin] = useState<Map<string, PaperBox> | null>(
    null,
  )
  const [ghost, setGhost] = useState<{ id: string; full: boolean } | null>(null)
  const drag = useRef<{
    x0: number
    y0: number
    lead: string
    ids: string[]
    orig: Map<string, PaperBox>
    rows0: GridRow[]
    moved: boolean
    shift: boolean
  } | null>(null)
  const grab = (box: PaperBox, _how: GrabHow, e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    // The drag owns every pointer and key (item 25): the page leaves text
    // input (no "/" menu, no caret), the ink and Lasso ignore the touch.
    startGripDrag(e.currentTarget as Element, e.pointerId)
    const group = picked.includes(box.id)
      ? extra.filter((b) => picked.includes(b.id) && !b.locked)
      : [box]
    const ids = box.locked ? [] : group.map((b) => b.id)
    // The grabbed box leads, the others follow in reading order.
    ids.sort((a, b2) => (a === box.id ? -1 : b2 === box.id ? 1 : 0))
    drag.current = {
      x0: e.clientX,
      y0: e.clientY,
      lead: box.id,
      ids,
      orig: new Map(group.map((b) => [b.id, b])),
      rows0: baseRows,
      moved: false,
      shift: e.shiftKey,
    }
  }
  /** The arrangement a drop at the pointer would give (pure, from the rows at drag start). */
  const dropAt = (cx: number, cy: number, ids: string[], rows0: GridRow[]) => {
    const r = paperEl.current!.getBoundingClientRect()
    const mx = (cx - r.left) / k
    const my = (cy - r.top) / k
    const now = layoutRows(rows0, heightsMm, geo)
    let target: string | null = null
    let zone: Zone = 'bottom'
    for (const [id, rc] of now) {
      if (ids.includes(id)) continue
      if (mx >= rc.x && mx <= rc.x + rc.w && my >= rc.y && my <= rc.y + rc.h) {
        target = id
        zone = zoneOf((mx - rc.x) / rc.w, (my - rc.y) / rc.h)
        break
      }
    }
    const [lead, ...rest] = ids
    if (target) {
      let d = insertAt(rows0, target, zone, lead)
      let prev = lead
      for (const id of rest) {
        d = {
          ...insertAt(
            d.rows,
            prev,
            zone === 'left' || zone === 'right' ? 'right' : 'bottom',
            id,
          ),
          full: d.full,
        }
        prev = id
      }
      return { rows: d.rows, full: d.full }
    }
    // Blank paper: a new full-width row at that height.
    let rows = ids.reduce((acc, id) => removeFromRows(acc, id), rows0)
    const top = (row: GridRow) =>
      Math.min(
        ...row.cols.flatMap((c) => c.boxIds).map((id) => now.get(id)?.y ?? 1e9),
      )
    let idx = rows.filter((row) => top(row) < my).length
    const y = snap(my, step / k)
    for (const id of [lead, ...rest]) {
      rows = insertRow(rows, idx++, id, y)
    }
    return { rows, full: false }
  }
  // One update per frame (item 25): pointer moves only note the spot; the
  // frame callback plans the drop and re-draws once.
  const pending = useRef<{ clientX: number; clientY: number } | null>(null)
  const frame = useRef(0)
  const dragMove = (e: ReactPointerEvent) => {
    if (!drag.current) return
    pending.current = { clientX: e.clientX, clientY: e.clientY }
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const at = pending.current
      pending.current = null
      if (at) applyMove(at)
    })
  }
  const applyMove = (
    e: { clientX: number; clientY: number },
    held = drag.current,
  ) => {
    const d = held
    if (!d || d.ids.length === 0) return
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < TAP_PX)
      return
    d.moved = true
    const dx = (e.clientX - d.x0) / k
    const dy = (e.clientY - d.y0) / k
    const live = new Map<string, PaperBox>()
    for (const id of d.ids) {
      const o = d.orig.get(id)!
      live.set(id, clampBox({ ...o, x: o.x + dx, y: o.y + dy }, sheet.w))
    }
    setLiveBoxes(live)
    setDragOrigin(d.orig)
    const drop = dropAt(e.clientX, e.clientY, d.ids, d.rows0)
    setPreview(drop.rows)
    setGhost({ id: d.lead, full: drop.full })
  }
  // Esc while a box is dragged: nothing changes (the preview closes).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !drag.current?.moved) return
      drag.current = null
      setLiveBoxes(null)
      setDragOrigin(null)
      setGhost(null)
      setPreview(null)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  const dragEnd = (e: ReactPointerEvent) => {
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = 0
    pending.current = null
    const d = drag.current
    drag.current = null
    // The drop is planned from the lift itself, not from the last drawn
    // preview: moves that all land inside one frame (a fast flick, a quick
    // WebKit drag) have not re-drawn yet when the lift comes.
    if (d && e.type !== 'pointercancel') applyMove(e, d)
    const rows =
      d?.moved && d.ids.length > 0
        ? dropAt(e.clientX, e.clientY, d.ids, d.rows0).rows
        : null
    setLiveBoxes(null)
    setDragOrigin(null)
    setGhost(null)
    setPreview(null)
    if (!d) return
    if (e.type === 'pointercancel') return
    if (!d.moved) return selectBox(d.lead, d.shift)
    if (!rows) return
    // The places the new arrangement gives (for old clients and exports).
    const places: BoxPatch[] = []
    for (const [id, rc] of layoutRows(rows, heightsMm, geo))
      if (id !== MAIN_BOX)
        places.push({ id, patch: { x: rc.x, y: rc.y, w: rc.w } })
    setHeldRows(rows)
    onGridChange?.(rows, places)
  }
  useEffect(() => {
    if (!onGridView) return
    const places: BoxPatch[] = []
    for (const [id, rc] of layout)
      if (id !== MAIN_BOX)
        places.push({ id, patch: { x: rc.x, y: rc.y, w: rc.w } })
    onGridView(rowsView, places, { heights: heightsMm, geo })
  })
  const toPaper = (e: ReactPointerEvent) => {
    const r = paperEl.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const lassoDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (flat || activeTool.get() !== 'lasso' || e.pointerType === 'touch')
      return false
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // The moves still bubble here.
    }
    loop.current = [toPaper(e)]
    loopLayer.current?.set(loop.current, lassoSettings.get().shape === 'rect')
    return true
  }
  /** A loop whose lift never came (cancel, app switch): its path goes. */
  const dropLoop = () => {
    loop.current = null
    loopLayer.current?.set(null)
  }
  useEffect(() => onGestureReset(dropLoop), [])
  const lassoUp = () => {
    const poly = loop.current
    if (!poly) return
    loop.current = null
    loopLayer.current?.set(null)
    if (poly.length < 3) return setPicked([])
    const p = paperEl.current?.getBoundingClientRect()
    if (!p) return
    // Owner item 2: a loop that starts on the margin or between boxes selects
    // whatever it covers inside the boxes (words, ink, pictures) first.
    const rect = lassoSettings.get().shape === 'rect'
    const client = poly.map((q) => ({ x: q.x + p.left, y: q.y + p.top }))
    if (lassoAcrossBoxes(client, rect)) return setPicked([])
    // One pass: every box found once, not one search per box.
    const frames = new Map<string, HTMLElement>()
    paperEl.current
      ?.querySelectorAll<HTMLElement>('[data-paper-box]')
      .forEach((el) => frames.set(el.dataset.paperBox ?? '', el))
    setPicked(
      extra
        .filter((b) => {
          const el = frames.get(b.id)
          if (!el) return false
          // Where the box is on screen, in paper px (as the loop is).
          const r = el.getBoundingClientRect()
          const c = {
            x: r.left - p.left + r.width / 2,
            y: r.top - p.top + r.height / 2,
          }
          return inPolygon(c, poly)
        })
        .map((b) => b.id),
    )
  }

  const tapAt = useRef<{ x: number; y: number; t: number } | null>(null)
  const penDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Placing a picture is a mode: no loop, ink or new box meanwhile (22h).
    if (document.documentElement.hasAttribute('data-placing')) return
    if (isUiEvent(e.nativeEvent)) return
    if (lassoDown(e)) return
    const tool = activeTool.get()
    // Item 9: a Pencil tap on blank paper with a drawing tool goes back to the
    // Lasso (as GoodNotes does); it never makes a box.
    tapAt.current =
      e.pointerType === 'pen' && tool !== 'text'
        ? { x: e.clientX, y: e.clientY, t: e.timeStamp }
        : null
    if (!onInkOnPaper || flat || (tool !== 'pen' && tool !== 'highlighter'))
      return
    // A finger scrolls the paper; only the Pencil and the mouse write here.
    if (e.pointerType === 'touch') return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // A pointer the browser no longer knows: the moves still bubble here.
    }
    pen.current = [record('pointerdown', e.nativeEvent)]
  }
  const penMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (loop.current) {
      loop.current.push(toPaper(e))
      loopLayer.current?.set(loop.current, lassoSettings.get().shape === 'rect')
    }
    pen.current?.push(record('pointermove', e.nativeEvent))
  }
  const penUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    lassoUp()
    const tap = tapAt.current
    tapAt.current = null
    if (
      tap &&
      activeTool.get() !== 'lasso' &&
      Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8 &&
      e.timeStamp - tap.t < 350
    ) {
      activeTool.set('lasso')
    }
    const events = pen.current
    pen.current = null
    if (!events || !onInkOnPaper) return
    events.push(record('pointerup', e.nativeEvent))
    const r = paperEl.current?.getBoundingClientRect()
    if (!r) return
    // A tap with the pen (a dot, under 2 mm) is not writing: no box.
    const b = bounds(events)
    if (b.w / k < 2 && b.h / k < 2) return
    void boxUnder(r, b)?.then(async (id) => {
      if (!id) return
      const pad = await waitFor(() =>
        document.querySelector(
          '[data-paper-box="' + CSS.escape(id) + '"] [data-ink-pad]',
        ),
      )
      // The box's lines are laid out a frame after its pad shows.
      if (pad) requestAnimationFrame(() => replay(pad, events))
    })
  }

  /** Rules 4 and 5: a box with empty lines under ink at `b` (client px). */
  const boxUnder = (
    r: DOMRect,
    b: { x: number; y: number; w: number; h: number },
  ) => {
    const stepMm = step / k
    const x = Math.max(0, (b.x - r.left) / k - 4)
    const y = Math.max(0, snap((b.y - r.top) / k - stepMm / 2, stepMm))
    const w = Math.max(MIN_W, b.w / k + 8)
    const lines = Math.ceil((b.h / k + stepMm) / stepMm) + 1
    return onInkOnPaper ? onInkOnPaper({ x, y, w }, lines) : null
  }

  // Rule 5: ink the Lasso drops on empty paper gets a box with lines there.
  const dropRef = useRef(boxUnder)
  useEffect(() => {
    dropRef.current = boxUnder
  })
  const canDrop = !flat && !!onInkOnPaper
  useEffect(() => {
    if (!canDrop) return
    setPaperDrop((items, lines) => {
      const r = paperEl.current?.getBoundingClientRect()
      const made =
        r && dropRef.current(r, bounds(items.flatMap((c) => c.client)))
      if (!made) return false
      void made.then(async (id) => {
        if (!id) return
        const box = await waitFor(() =>
          document.querySelector(
            '[data-paper-box="' + CSS.escape(id) + '"] [data-ink-pad]',
          ),
        )
        const into =
          box &&
          (await waitFor(() => adopterIn(box.closest('[data-paper-box]')!)))
        if (into) requestAnimationFrame(() => into.adopt(items, lines))
      })
      return true
    })
    return () => setPaperDrop(null)
  }, [canDrop])

  /** A tap on empty paper with the Text tool: a new box there (step 3). */
  const tapStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const tapPaper = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (document.documentElement.hasAttribute('data-placing')) return
    if (isUiEvent(e.nativeEvent)) return
    const down = tapStart.current
    tapStart.current = null
    if (!onAddBox || flat || e.button !== 0) return
    // Items 6/9: only a deliberate tap makes a box, not the end of a scroll
    // or a drag (moved more than 10 px, or held more than 600 ms).
    if (
      !down ||
      Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10 ||
      Date.now() - down.t > 600
    )
      return
    if (
      e.target !== e.currentTarget &&
      !(e.target as Element).closest('[data-paper-sheet]')
    )
      return
    if (activeTool.get() !== 'lasso') setPicked((p) => (p.length ? [] : p))
    const r = paperEl.current?.getBoundingClientRect()
    if (!r) return
    const x = (e.clientX - r.left) / k
    const y = (e.clientY - r.top) / k
    // A safe zone along the sheet's edges (and its scroll side): a tap there
    // never makes a box, it is a grab for scrolling.
    if (x < EDGE_MM || x > sheet.w - EDGE_MM || y < EDGE_MM) return
    // Inside the default box's column the tap belongs to the page's text.
    // On a page with a box grid the new box is a row at that height.
    const row = rowsView.filter(
      (r) =>
        Math.min(
          ...r.cols
            .flatMap((c) => c.boxIds)
            .map((id) => layout.get(id)?.y ?? 1e9),
        ) <= y,
    ).length
    onAddBox({
      x: Math.max(0, x - 4),
      y: Math.max(0, snap(y, step / k)),
      row,
    })
  }

  // Nothing around the default box is positioned (no relative or absolute),
  // so its editor's menus and the ink overlay keep the same containing blocks
  // as before: the sheets are normal blocks and the box is pulled up over
  // them. Other boxes sit in a zero-height positioned layer of their own.
  // Phones: a Text-tool tap in the gap under a box adds a box right after it
  // (above the first box: before every other box).
  const gapTap = (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (!onAddBoxInOrder || activeTool.get() !== 'text') return
    if (target !== e.currentTarget && !target.hasAttribute('data-chrome'))
      return
    let after = 'start'
    for (const b of extra) {
      const el = e.currentTarget.querySelector<HTMLElement>(
        '[data-paper-box="' + CSS.escape(b.id) + '"]',
      )
      if (el && el.getBoundingClientRect().bottom <= e.clientY) after = b.id
    }
    onAddBoxInOrder(after)
  }
  const layerEl = !flat &&
    (extra.length > 0 || (narrow && !!onAddBoxInOrder)) && (
      <div
        ref={layerRef}
        data-paper-boxes
        onClick={narrow ? gapTap : undefined}
        // First in the paper, at its top (zero height): the boxes are placed
        // from here. Read aloud meets them before the page text (later).
        style={
          narrow
            ? { position: 'relative', paddingBottom: MARGIN * k, order: 2 }
            : { position: 'relative', height: 0, zIndex: 6 }
        }
      >
        <LoopLayer ref={loopLayer} />
        {ghost &&
          (() => {
            const g = layout.get(ghost.id)
            if (!g) return null
            return (
              <div
                aria-hidden
                data-grid-ghost
                data-full={ghost.full ? '' : undefined}
                className="pointer-events-none absolute rounded-md border-2 border-accent bg-accent/10 transition-[left,top,width,height] duration-150 motion-reduce:transition-none"
                style={{
                  left: g.x * k,
                  top: g.y * k,
                  width: g.w * k,
                  height: g.h * k,
                }}
              >
                {ghost.full && (
                  <span className="absolute -top-6 left-0 rounded bg-accent px-1.5 py-0.5 text-xs text-white">
                    {t('layout.full')}
                  </span>
                )}
              </div>
            )
          })()}
        {extra.map((b) => (
          <BoxFrame
            key={b.id}
            box={liveBoxes?.has(b.id) ? (dragOrigin?.get(b.id) ?? b) : b}
            shown={liveBoxes?.get(b.id) ?? b}
            k={k}
            zoom={zoom}
            lineH={step / zoom}
            sheetPx={sheetPx}
            gapPx={SHEET_GAP_PX}
            sheets={sheets}
            onBottom={(px) => reportBottom(b.id, px)}
            onMenu={(at) => onBoxMenu?.(b, at)}
            picked={picked.includes(b.id)}
            lasso={lassoOn}
            dragging={!!liveBoxes?.has(b.id)}
            pushed={!!preview || !!heldRows}
            onHeight={(px) => reportHeight(b.id, px)}
            onGrab={(how, e) => grab(b, how, e)}
            onDragMove={dragMove}
            onDragEnd={dragEnd}
            onEmptyDelete={onDeleteBox ? () => onDeleteBox(b) : undefined}
            stacked={narrow ? { x: box.x, w: box.w } : null}
            bar={
              picked.length === 1 && picked[0] === b.id
                ? renderBar?.(b)
                : undefined
            }
          >
            <LazyMount
              boxId={b.id}
              ready={fit > 0}
              eager={b.id === eager}
              height={(step / zoom) * 3}
            >
              {renderBox?.(b.id)}
            </LazyMount>
          </BoxFrame>
        ))}
        {!narrow && (
          <GridDividers
            rows={rowsView}
            layout={layout}
            k={k}
            left={geo.left}
            width={geo.sheetW - geo.left - geo.right}
            paperEl={paperEl}
            enabled={!!onGridChange}
            picked={picked}
            onLive={setPreview}
            onCommit={(rows) => {
              setPreview(null)
              setHeldRows(rows)
              const places: BoxPatch[] = []
              for (const [id, rc] of layoutRows(rows, heightsMm, geo))
                if (id !== MAIN_BOX)
                  places.push({ id, patch: { x: rc.x, y: rc.y, w: rc.w } })
              onGridChange?.(rows, places)
            }}
          />
        )}
        {narrow && onAddBoxInOrder && (
          <button
            type="button"
            data-paper-add-end
            onClick={() => onAddBoxInOrder('end')}
            className="mt-8 flex min-h-12 w-full items-center justify-center rounded-md border border-dashed border-line text-sm text-muted hover:bg-hover"
          >
            {t('paper.addBoxEnd')}
          </button>
        )}
      </div>
    )

  return (
    <div>
      <div
        ref={scroller}
        data-paper-scroller
        // At 100 % nothing scrolls here (the page scrolls as before); zoomed
        // in, the paper pans sideways inside this frame.
        style={{
          touchAction: 'pan-x pan-y',
          overflowX: zoom > 1 ? 'auto' : 'visible',
          ...(flat ? {} : { marginLeft: -box.x * (width / sheet.w) }),
        }}
      >
        <div
          ref={paperEl}
          data-paper
          data-sheet={page.sheet ?? 'A4'}
          style={
            flat
              ? undefined
              : ({
                  width,
                  minHeight: total,
                  visibility: fit > 0 ? 'visible' : 'hidden',
                  // The text starts exactly where it always did: the sheet's
                  // top margin reaches up behind the line above the paper.
                  marginTop: -box.y * k,
                  ...(narrow
                    ? { display: 'flex', flexDirection: 'column' }
                    : {}),
                } as CSSProperties)
          }
        >
          {/* One place in the tree for both layouts: a switch never remounts the
              boxes (their editors). Fit width shows them after the text. */}
          {layerEl}
          {!flat && !narrow && (
            <div
              data-paper-sheets
              onPointerDown={(e) => {
                tapStart.current = {
                  x: e.clientX,
                  y: e.clientY,
                  t: Date.now(),
                }
                penDown(e)
              }}
              onPointerMove={(e) => {
                penMove(e)
                hoverMove(e)
              }}
              onPointerLeave={() => setHover(null)}
              onPointerCancel={() => {
                setHover(null)
                dropLoop()
              }}
              onPointerUp={(e) => {
                penUp(e)
                tapPaper(e)
              }}
            >
              {showHint && extra.length === 0 && (
                // Zero height, so nothing moves; it never takes a click.
                <div
                  className="pointer-events-none"
                  style={{ position: 'relative', height: 0 }}
                >
                  <p
                    data-paper-hint
                    className="absolute inset-x-0 mx-auto w-max max-w-[80%] text-center text-sm text-muted"
                    style={{ top: box.y * k + step * 5 }}
                  >
                    {t('paper.hint')}
                  </p>
                </div>
              )}
              {Array.from({ length: sheets }, (_, i) => (
                <div
                  key={i}
                  data-paper-sheet={i + 1}
                  data-paper-bg={page.inkBg}
                  className="rounded-sm border border-line bg-surface shadow-sm"
                  style={
                    {
                      height: sheetPx,
                      marginBottom: i < sheets - 1 ? SHEET_GAP_PX : 0,
                      '--paper-step': step + 'px',
                      '--paper-offset': ((box.y * k) % step) + 'px',
                    } as CSSProperties
                  }
                />
              ))}
              {hover &&
                createPortal(
                  <span
                    data-paper-addbox
                    aria-hidden
                    className="pointer-events-none fixed z-50 rounded-full bg-accent px-2 py-0.5 text-xs text-white shadow-sm"
                    style={{ left: hover.x + 12, top: hover.y + 12 }}
                  >
                    {t('paper.addBox')}
                  </span>,
                  document.body,
                )}
            </div>
          )}
          <div
            ref={boxEl}
            data-paper-box="main"
            className={
              flat
                ? undefined
                : 'rounded-md outline-1 outline-dashed outline-transparent focus-within:outline-line'
            }
            style={
              flat
                ? undefined
                : {
                    marginLeft: mainShown.x * k,
                    width: mainShown.w * k,
                    marginTop: mainShown.y * k - total,
                    paddingBottom: MARGIN * k,
                    ...(preview || heldRows
                      ? {
                          transition:
                            'margin 150ms ease-out, width 150ms ease-out',
                        }
                      : {}),
                  }
            }
          >
            <div style={zoom === 1 || flat ? undefined : { zoom }}>
              {children}
            </div>
          </div>
        </div>
      </div>
      {!flat && !narrow && (
        <Suspense fallback={null}>
          <PageScrollBar sheetsKey={sheets} />
        </Suspense>
      )}
      {!flat && (
        <div
          data-chrome
          className="mt-2 ml-auto flex w-max items-center gap-1 rounded-full border border-line bg-surface px-1 py-0.5 text-xs shadow-sm"
        >
          <Tip id="paper.zoomOut" touchInfo={false}>
            <button
              type="button"
              aria-label={t('paper.zoomOut')}
              onClick={() => setZoom((z) => Math.max(1, clampZoom(z / 1.25)))}
              className="min-h-8 min-w-8 rounded-full hover:bg-hover"
            >
              −
            </button>
          </Tip>
          <Tip id="paper.zoomFit" touchInfo={false}>
            <button
              type="button"
              aria-label={t('paper.zoomFit')}
              onClick={() => setZoom(1)}
              className="min-h-8 rounded-full px-2 tabular-nums hover:bg-hover"
            >
              {Math.round(zoom * 100)} %
            </button>
          </Tip>
          <Tip id="paper.zoomIn" touchInfo={false}>
            <button
              type="button"
              aria-label={t('paper.zoomIn')}
              onClick={() => setZoom((z) => clampZoom(z * 1.25))}
              className="min-h-8 min-w-8 rounded-full hover:bg-hover"
            >
              +
            </button>
          </Tip>
        </div>
      )}
    </div>
  )
}

/** A press that moves less than this (px) is a tap. */
const TAP_PX = 4

/** One box changed by a drop (with what it was, for Undo). */
export type BoxChange = BoxPatch & {
  before: { x: number; y: number; w: number }
}

/** Items 6/9: taps this close to a sheet edge (mm) never make a box. */
const EDGE_MM = 8

/** Rounds a length in mm to the paper's line spacing. */
const snap = (mm: number, stepMm: number) =>
  stepMm > 0 ? Math.round(mm / stepMm) * stepMm : mm

/** Is the point inside the polygon (even-odd rule)? */
function inPolygon(
  p: { x: number; y: number },
  poly: { x: number; y: number }[],
) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside
  }
  return inside
}

type Pt = { x: number; y: number }
type LoopApi = { set: (points: Pt[] | null, rect?: boolean) => void }

/** The Lasso loop on the paper; redraws alone while the pen moves. */
function LoopLayer({ ref }: { ref: Ref<LoopApi> }) {
  const [shape, setShape] = useState<{ points: Pt[]; rect: boolean } | null>(
    null,
  )
  useImperativeHandle(ref, () => ({
    set: (p, rect = false) => setShape(p && { points: [...p], rect }),
  }))
  if (!shape) return null
  const pts = shape.rect
    ? (() => {
        const a = shape.points[0]
        const z = shape.points[shape.points.length - 1]
        return [a, { x: z.x, y: a.y }, z, { x: a.x, y: z.y }]
      })()
    : shape.points
  const list = pts.map((p) => p.x + ',' + p.y).join(' ')
  // Clearly visible on light and dark paper (owner item 1): accent line with
  // a halo, a tinted fill.
  return (
    <svg
      aria-hidden
      data-paper-lasso
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
      width="1"
      height="1"
    >
      <polygon
        points={list}
        fill="var(--color-accent)"
        fillOpacity={0.14}
        stroke="var(--color-bg)"
        strokeOpacity={0.8}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <polygon
        points={list}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2.5}
        strokeDasharray="9 5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The nearest ancestor that scrolls up and down (null = the window). */
function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let p = node.parentElement; p; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY
    if (y === 'auto' || y === 'scroll' || y === 'overlay') return p
  }
  return null
}

/** How far outside the screen a box's editor is made ready (px). */
const NEAR_PX = 800

/**
 * A box's editor is made only when the box comes near the screen (before
 * that a light placeholder of about its height stands in), so a page with
 * many boxes opens with a few editors, not all. Once made it stays: an open
 * editor is never torn down while it may hold unsaved text.
 */
function LazyMount({
  boxId,
  ready,
  eager,
  height,
  children,
}: {
  boxId: string
  /** The paper has its width: boxes are where they will be. */
  ready: boolean
  eager: boolean
  height: number
  children: ReactNode
}) {
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined')
  const el = useRef<HTMLDivElement>(null)
  const on = near || eager
  // A jump (search hit) needs this box's editor now, wherever the box is.
  useEffect(() => {
    if (on) return
    return onWakeBox((id) => id === boxId && setNear(true))
  }, [on, boxId])
  useEffect(() => {
    const node = el.current
    if (on || !ready || !node) return
    // The margin only counts for the scrolling parent as the root (with the
    // window as root, a scrolling parent clips the box with no margin).
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true)
      },
      { root: scrollParent(node), rootMargin: NEAR_PX + 'px 0px' },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [on, ready])
  if (on) return <>{children}</>
  return (
    <div
      ref={el}
      data-box-placeholder
      aria-hidden
      className="flex flex-col justify-around opacity-60"
      style={{ minHeight: height }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 rounded-full bg-soft"
          style={{ width: 90 - i * 25 + '%' }}
        />
      ))}
    </div>
  )
}
