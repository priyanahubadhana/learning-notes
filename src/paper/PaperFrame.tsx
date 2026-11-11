import { frameCss, padOf } from '../core/boxStyle'
import { PICK_BOX } from '../editor/tapSelect'
import { isUiEvent } from '../app/uiGuard'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useReducer,
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
import { createId } from '../core/ids'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import type { GridRow, Page, PaperBox } from '../core/types'
import {
  BOX_COLOURS,
  boxesOf,
  MAIN_BOX,
  mainBox,
  MARGIN,
  TOP,
  readingOrder,
  sheetOf,
} from './boxes'
import { BoxFrame, ResizeDots, type GrabHow } from './BoxFrame'
import { caretAtEnd, type ResizeHow } from './boxHandles'
import { SAFE_GAP_PX, TOUCH_PX, TOUCH_STYLE } from './safeGap'
import { clampBox, MIN_W, type BoxPatch } from './boxService'
import {
  freeMaxW,
  FREE_MIN_W,
  FREE_RIGHT_GAP,
  insertAt,
  insertRow,
  isFreeRow,
  layoutRows,
  placesOf,
  MIN_FRAC,
  migrateToRows,
  reconcile,
  removeBox as removeFromRows,
  resizeCols,
  zoneOf,
  type Geometry,
  type Zone,
} from './grid'
import { GridDividers } from './GridDividers'
import { snapBox, type SnapResult } from './guides'
import { circleDigit, cleanShape, type DigitView } from './textPencil'
import { allBoxEditors } from './activeBox'
import { group as historyGroup } from '../core/historySteps'
import { readDeviceSetting } from '../settings/settingsService'
import { smartGuidesSetting } from '../settings/builtinSettings'
import { boxReducer, IDLE, pickedOf, type BoxEvent } from './boxState'
import { startBlankHold } from './blankHold'
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
  onGroup,
  onBoxHeight,
  layoutMode = false,
  layoutBar,
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
  onAddBox?: (at: {
    x: number
    y: number
    row?: number
    free?: boolean
    rows?: GridRow[]
  }) => void
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
  /** Lasso Group / Ungroup: the picked ids and the new group id (undefined = ungroup). */
  onGroup?: (ids: string[], group: string | undefined) => void
  /** The bottom handles set a box's minimum height (mm); undefined = back to its content. */
  onBoxHeight?: (id: string, h: number | undefined) => void
  /** Layout mode (owner batch 3, B3-7/8): the page zooms out a little, boxes wiggle and drag; `layoutBar` is the strip. */
  layoutMode?: boolean
  layoutBar?: ReactNode
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
  const [zoomState, setZoom] = useState(1)
  // Layout mode shows the page a little smaller; Done brings the zoom back.
  const zoom = layoutMode ? Math.min(zoomState, LAYOUT_ZOOM) : zoomState
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
  // Boxes as wide as their text report their width (px), so drops and guides
  // know where they really end.
  const [widths, setWidths] = useState<Record<string, number>>({})
  const reportWidth = useCallback((id: string, px: number) => {
    setWidths((w) => (w[id] === px ? w : { ...w, [id]: px }))
  }, [])
  const widthsMm = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(widths).map(([id, px]) => [id, px / (k || 1)]),
      ),
    [widths, k],
  )
  const geo: Geometry = useMemo(
    () => ({
      autoW: widthsMm,
      sheetW: sheet.w,
      sheetH: sheet.h,
      gapMm: SHEET_GAP_PX / (k || 1),
      left: box.x,
      right: sheet.w - box.x - box.w,
      top: box.y,
      bottom: MARGIN,
    }),
    [sheet.w, sheet.h, k, box.x, box.w, box.y, widthsMm],
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

  /** Boxes as wide as their text (free boxes nobody has widened). */
  const autoIds = useMemo(
    () =>
      new Set(
        rowsView
          .filter((r) => isFreeRow(r) && r.auto && r.wmm === undefined)
          .flatMap((r) => r.cols[0].boxIds),
      ),
    [rowsView],
  )
  const placedX = (b: PaperBox) => layout.get(b.id)?.x ?? b.x
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
  useEffect(
    () => () => {
      sheetNav.set(null)
      document.documentElement.removeAttribute('data-box-drag')
    },
    [],
  )

  // Rule 4: a stroke on empty paper is recorded, a box is made under it and
  // the stroke is played into that box's ink pad.
  const pen = useRef<Recorded[] | null>(null)
  // Where the mouse or Pencil hovers over empty paper (a "+ box" tag).
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  // B3-6: the page's own text box shows ⠿ and ⋯ while the caret is in it.
  const [mainFocus, setMainFocus] = useState(false)
  useEffect(() => {
    const el = boxEl.current
    if (!el || flat) return
    const on = () => setMainFocus(true)
    const off = (e: FocusEvent) => {
      if (el.contains(e.relatedTarget as Node | null)) return
      window.setTimeout(() => {
        if (!el.contains(document.activeElement)) setMainFocus(false)
      }, 150)
    }
    el.addEventListener('focusin', on)
    el.addEventListener('focusout', off)
    return () => {
      el.removeEventListener('focusin', on)
      el.removeEventListener('focusout', off)
    }
  }, [flat])
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
  // Box states (bug batch 2, item 8): idle, selected, typing (boxState.ts).
  const [bs, dispatchBs] = useReducer(boxReducer, IDLE)
  // A change of the state only: a dispatch that would leave it as it is would
  // still run this whole component again (on every tap in a box's text).
  const bsRef = useRef(bs)
  useEffect(() => {
    bsRef.current = bs
  }, [bs])
  const send = useCallback((e: BoxEvent) => {
    if (boxReducer(bsRef.current, e) !== bsRef.current) dispatchBs(e)
  }, [])
  const picked = useMemo(() => pickedOf(bs), [bs])
  const setPicked = (ids: string[]) => send({ type: 'pick', ids })
  // The caret going into a picked box's text (a tap inside it, or a key typed)
  // or out of it. A bar button that focuses the editor does not count.
  useEffect(() => {
    const boxOfText = (t: EventTarget | null) => {
      const el = t instanceof Element ? t : null
      if (!el?.closest('[contenteditable="true"]')) return null
      return el.closest('[data-paper-box]')?.getAttribute('data-paper-box')
    }
    // A run of quick taps (word, line, paragraph) must not be slowed by a
    // redraw between two taps: the state changes once the run has ended.
    let later = 0
    const down = (e: Event) => {
      const id = boxOfText(e.target)
      window.clearTimeout(later)
      if (id)
        later = window.setTimeout(() => send({ type: 'caretIn', id }), 250)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey) return
      const id = boxOfText(document.activeElement)
      if (id) send({ type: 'caretIn', id })
    }
    const out = () =>
      window.setTimeout(() => {
        if (!boxOfText(document.activeElement)) send({ type: 'caretOut' })
      }, 0)
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('keydown', key, true)
    document.addEventListener('focusout', out)
    return () => {
      window.clearTimeout(later)
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('keydown', key, true)
      document.removeEventListener('focusout', out)
    }
  }, [send])
  const lassoOn = activeTool.useValue() === 'lasso'
  /** A tap on a box's frame (or grip): it is the selection; Shift adds. */
  const selectBox = (id: string, add: boolean) => {
    // A grouped box brings its whole group with it.
    const g = extra.find((b) => b.id === id)?.group
    if (g && !add)
      return send({
        type: 'pick',
        ids: extra.filter((b) => b.group === g).map((b) => b.id),
      })
    send({ type: 'frameTap', id, add })
  }
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
  /** When the last drag, drop or resize ended: no new box for a moment after (B3-2). */
  const lastDragEnd = useRef(-Infinity)
  const drag = useRef<{
    x0: number
    y0: number
    lead: string
    ids: string[]
    orig: Map<string, PaperBox>
    rows0: GridRow[]
    moved: boolean
    shift: boolean
    /** The (snapped) move in mm, noted by applyMove for the drop. */
    dxMm?: number
    dyMm?: number
    /** The scroller and where it was, for edge auto-scroll. */
    scroller?: HTMLElement | null
    scroll0?: number
  } | null>(null)
  const [guides, setGuides] = useState<SnapResult | null>(null)
  const lastPt = useRef<{ clientX: number; clientY: number } | null>(null)
  const grab = (box: PaperBox, _how: GrabHow, e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    // The drag owns every pointer and key (item 25): the page leaves text
    // input (no "/" menu, no caret), the ink and Lasso ignore the touch.
    startGripDrag(e.currentTarget as Element, e.pointerId)
    document.documentElement.setAttribute('data-box-drag', '')
    const group = picked.includes(box.id)
      ? extra.filter((b) => picked.includes(b.id) && !b.locked)
      : [box]
    const ids = box.locked ? [] : group.map((b) => b.id)
    // The grabbed box leads, the others follow in reading order.
    ids.sort((a, b2) => (a === box.id ? -1 : b2 === box.id ? 1 : 0))
    if (!scrollLoop.current)
      scrollLoop.current = requestAnimationFrame(scrollTick)
    drag.current = {
      x0: e.clientX,
      y0: e.clientY,
      lead: box.id,
      ids,
      orig: new Map(group.map((b) => [b.id, b])),
      rows0: baseRows,
      moved: false,
      shift: e.shiftKey,
      scroller: paperEl.current ? scrollParent(paperEl.current) : null,
      scroll0:
        (paperEl.current ? scrollParent(paperEl.current) : null)?.scrollTop ??
        0,
    }
  }
  /** The arrangement a drop at the pointer would give (pure, from the rows at drag start). */
  const dropAt = (
    cx: number,
    cy: number,
    ids: string[],
    rows0: GridRow[],
    held?: {
      x0: number
      y0: number
      orig: Map<string, PaperBox>
      dxMm?: number
      dyMm?: number
    } | null,
  ) => {
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
      return { rows: d.rows, full: d.full, blank: false }
    }
    // Blank paper: a new full-width row at that height.
    let rows = ids.reduce((acc, id) => removeFromRows(acc, id), rows0)
    const top = (row: GridRow) =>
      Math.min(
        ...row.cols.flatMap((c) => c.boxIds).map((id) => now.get(id)?.y ?? 1e9),
      )
    // Text box v2: a box dropped on blank paper stays where it was put (a free
    // box at the dropped left edge, its width kept); the page's own text box
    // goes back to a full-width row.
    const dxMm = held ? (held.dxMm ?? (cx - held.x0) / k) : 0
    const dyMm = held ? (held.dyMm ?? (cy - held.y0) / k) : 0
    const leadTop = held?.orig.get(lead)
    const yTop = leadTop ? leadTop.y + dyMm : my
    let idx = rows.filter((row) => top(row) < yTop).length
    for (const id of [lead, ...rest]) {
      const o = held?.orig.get(id)
      if (!o || id === MAIN_BOX) {
        rows = insertRow(rows, idx++, id, snap(my, step / k))
        continue
      }
      const was = now.get(id)
      const row0 = rows0.find((r) => r.cols.some((c) => c.boxIds.includes(id)))
      const wasAuto =
        !!row0 && isFreeRow(row0) && !!row0.auto && row0.wmm === undefined
      const x = Math.min(
        Math.max(0, o.x + dxMm),
        sheet.w - 15 - FREE_MIN_W - FREE_RIGHT_GAP,
      )
      rows = insertRow(
        rows,
        idx++,
        id,
        Math.max(0, snap(o.y + dyMm, step / k)),
        {
          x,
          wmm: wasAuto ? undefined : was?.w,
        },
      )
    }
    return { rows, full: false, blank: true }
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
    lastPt.current = { clientX: e.clientX, clientY: e.clientY }
    // The page may have scrolled under the pointer (edge auto-scroll).
    const scrolled = d.scroller ? d.scroller.scrollTop - (d.scroll0 ?? 0) : 0
    d.dxMm = (e.clientX - d.x0) / k
    d.dyMm = (e.clientY - d.y0 + scrolled) / k
    let drop = dropAt(e.clientX, e.clientY, d.ids, d.rows0, d)
    // Smart guides (blank paper only): thin lines and a gentle snap.
    let snapped: SnapResult | null = null
    const lead = d.orig.get(d.lead)
    if (drop.blank && lead && readDeviceSetting(smartGuidesSetting) !== 'off') {
      const now = layoutRows(d.rows0, heightsMm, geo)
      const rc = now.get(d.lead)
      const others = [...now]
        .filter(([id]) => !d.ids.includes(id))
        .map(([id, r]) => ({ id, x: r.x, y: r.y, w: r.w, h: r.h }))
      const sn = snapBox(
        {
          x: lead.x + d.dxMm,
          y: lead.y + d.dyMm,
          w: rc?.w ?? lead.w,
          h: rc?.h ?? DEFAULT_H_MM,
        },
        others,
        sheet.w,
      )
      snapped = sn
      if (sn.dx || sn.dy) {
        d.dxMm += sn.dx
        d.dyMm += sn.dy
        drop = dropAt(e.clientX, e.clientY, d.ids, d.rows0, d)
      }
    }
    setGuides(
      snapped && (snapped.guides.length || snapped.marks.length)
        ? snapped
        : null,
    )
    const live = new Map<string, PaperBox>()
    for (const id of d.ids) {
      const o = d.orig.get(id)!
      live.set(
        id,
        clampBox({ ...o, x: o.x + d.dxMm, y: o.y + d.dyMm }, sheet.w),
      )
    }
    setLiveBoxes(live)
    setDragOrigin(d.orig)
    setPreview(drop.rows)
    setGhost({ id: d.lead, full: drop.full })
  }
  // Edge auto-scroll: holding a dragged box near the top or bottom of the
  // screen scrolls the page (and the box follows the paper).
  const scrollLoop = useRef(0)
  const scrollTick = () => {
    const d = drag.current
    if (!d) {
      scrollLoop.current = 0
      return
    }
    scrollLoop.current = requestAnimationFrame(scrollTick)
    const p = lastPt.current
    if (!d.moved || !p) return
    const sc = d.scroller ?? document.scrollingElement
    if (!sc) return
    const r = d.scroller?.getBoundingClientRect()
    const top = r ? Math.max(0, r.top) : 0
    const bottom = r
      ? Math.min(window.innerHeight, r.bottom)
      : window.innerHeight
    const edge = 70
    let v = 0
    if (p.clientY < top + edge) v = -Math.ceil((top + edge - p.clientY) / 4)
    else if (p.clientY > bottom - edge)
      v = Math.ceil((p.clientY - (bottom - edge)) / 4)
    if (!v) return
    const before = sc.scrollTop
    sc.scrollTop = before + Math.max(-24, Math.min(24, v))
    if (sc.scrollTop !== before) applyMove(p, d)
  }
  // Esc while a box is dragged: nothing changes (the preview closes).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !drag.current?.moved) return
      document.documentElement.removeAttribute('data-box-drag')
      drag.current = null
      setLiveBoxes(null)
      setDragOrigin(null)
      setGhost(null)
      setPreview(null)
      setGuides(null)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  const dragEnd = (e: ReactPointerEvent) => {
    document.documentElement.removeAttribute('data-box-drag')
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = 0
    pending.current = null
    const d = drag.current
    drag.current = null
    if (d?.moved) lastDragEnd.current = e.timeStamp
    // The drop is planned from the lift itself, not from the last drawn
    // preview: moves that all land inside one frame (a fast flick, a quick
    // WebKit drag) have not re-drawn yet when the lift comes.
    if (d && e.type !== 'pointercancel') applyMove(e, d)
    const rows =
      d?.moved && d.ids.length > 0
        ? dropAt(e.clientX, e.clientY, d.ids, d.rows0, d).rows
        : null
    setLiveBoxes(null)
    setDragOrigin(null)
    setGhost(null)
    setPreview(null)
    setGuides(null)
    if (!d) return
    if (e.type === 'pointercancel') return
    if (!d.moved) {
      // A tap on the frame while typing goes back to "selected": the caret
      // leaves the text (the editor keeps its place for the next tap inside).
      const live = document.activeElement
      if (live?.closest('[data-paper-box="' + CSS.escape(d.lead) + '"]'))
        (live as HTMLElement).blur()
      return selectBox(d.lead, d.shift)
    }
    if (!rows) return
    // Dragged back to where it was: nothing changes, no write, no Undo step.
    if (JSON.stringify(rows) === JSON.stringify(d.rows0)) return
    // The places the new arrangement gives (for old clients and exports).
    const places: BoxPatch[] = placesOf(rows, heightsMm, geo)
    setHeldRows(rows)
    onGridChange?.(rows, places)
  }
  // Eight round handles (B3-9). Sides and corners to the east or west move the
  // column divider beside the box; north, south and the corners set a minimum
  // height that never goes below what the box's text and pictures need.
  const resizing = useRef<{
    id: string
    x0: number
    y0: number
    h0: number
    minH: number
    rowId: string | null
    i: number | null
    vert: boolean
    rows: GridRow[]
    h?: number
    moved: boolean
    /** Lone box in its row: the side handles set its width (fraction). */
    lone: boolean
    /** A free box (text box v2): east/west set its width in mm, west also its left edge. */
    free: 'e' | 'w' | null
    /** Its right edge (mm) when the press began (the west handle keeps it). */
    right0: number
    /** The top handle: the top edge moves, the bottom stays. */
    north: boolean
    top0: number
    floorY: number
    shift?: number
  } | null>(null)
  const [liveH, setLiveH] = useState<{ id: string; h: number } | null>(null)
  const resizeDown = (b: PaperBox, how: ResizeHow, e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // The moves still arrive.
    }
    const el = paperEl.current?.querySelector<HTMLElement>(
      '[data-paper-box="' + CSS.escape(b.id) + '"]',
    )
    const content = el?.querySelector<HTMLElement>('[data-box-content]')
    const row = baseRows.find((r) =>
      r.cols.some((c) => c.boxIds.includes(b.id)),
    )
    const ci = row ? row.cols.findIndex((c) => c.boxIds.includes(b.id)) : -1
    let i: number | null = null
    if (row && how.includes('e') && ci < row.cols.length - 1) i = ci
    else if (row && how.includes('w') && ci > 0) i = ci - 1
    const isFree = !!row && isFreeRow(row)
    const lone = !!row && row.cols.length === 1 && how.includes('e')
    if (lone) i = 0
    if (isFree && how.includes('w')) i = 0
    const rc0 = layout.get(b.id)
    const north = how.includes('n') && !!row && ci === 0
    const top0 = layout.get(b.id)?.y ?? b.y
    const floorY =
      row && north
        ? (layoutRows(
            baseRows.map((r) => (r.id === row.id ? { ...r, y: 0 } : r)),
            heightsMm,
            geo,
          ).get(b.id)?.y ?? top0)
        : top0
    resizing.current = {
      free: isFree
        ? how.includes('e')
          ? 'e'
          : how.includes('w')
            ? 'w'
            : null
        : null,
      right0: rc0 ? rc0.x + rc0.w : 0,
      lone,
      north,
      top0,
      floorY,
      id: b.id,
      x0: e.clientX,
      y0: e.clientY,
      h0: (el?.getBoundingClientRect().height ?? 0) / k,
      minH: (content?.getBoundingClientRect().height ?? 0) / k,
      rowId: i !== null && row ? row.id : null,
      i,
      vert: how.includes('s') || north,
      rows: baseRows,
      moved: false,
    }
  }
  const resizeMove = (e: ReactPointerEvent) => {
    const d = resizing.current
    const r = paperEl.current?.getBoundingClientRect()
    if (!d || !r) return
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < TAP_PX)
      return
    d.moved = true
    if (d.i !== null) {
      const at =
        ((e.clientX - r.left) / k - geo.left) /
        Math.max(1, geo.sheetW - geo.left - geo.right)
      const atMm = (e.clientX - r.left) / k
      const maxX = geo.sheetW - geo.right - FREE_MIN_W
      d.rows = baseRows.map((row) =>
        row.id !== d.rowId
          ? row
          : d.free === 'e'
            ? withoutAuto({
                ...row,
                wmm:
                  Math.round(
                    Math.min(
                      geo.sheetW - (row.x ?? 0),
                      Math.max(FREE_MIN_W, atMm - (row.x ?? 0)),
                    ) * 10,
                  ) / 10,
              })
            : d.free === 'w'
              ? (() => {
                  const x = Math.min(maxX, Math.max(0, atMm))
                  return withoutAuto({
                    ...row,
                    x: Math.round(x * 10) / 10,
                    wmm:
                      Math.round(Math.max(FREE_MIN_W, d.right0 - x) * 10) / 10,
                  })
                })()
              : d.lone
                ? {
                    ...row,
                    cols: [
                      {
                        ...row.cols[0],
                        w: Math.min(1, Math.max(MIN_FRAC, at)),
                      },
                    ],
                  }
                : resizeCols(row, d.i!, at),
      )
      setPreview(d.rows)
    }
    if (d.north) {
      // Top edge: moves with the finger, the bottom stays; never above the
      // place the page flow gives the row, never below the text's minimum.
      const dy = (e.clientY - d.y0) / k
      const shift = Math.min(d.h0 - d.minH, Math.max(d.floorY - d.top0, dy))
      d.shift = shift
      d.h = d.h0 - shift
      d.rows = (d.i !== null ? d.rows : baseRows).map((row) =>
        row.cols.some((c) => c.boxIds.includes(d.id))
          ? { ...row, y: Math.max(0, d.top0 + shift) }
          : row,
      )
      setPreview(d.rows)
      setLiveH({ id: d.id, h: d.h })
    } else if (d.vert) {
      d.h = Math.max(d.minH, d.h0 + (e.clientY - d.y0) / k)
      setLiveH({ id: d.id, h: d.h })
    }
  }
  const resizeEnd = (e: ReactPointerEvent) => {
    const d = resizing.current
    resizing.current = null
    if (d?.moved) lastDragEnd.current = e.timeStamp
    setLiveH(null)
    setPreview(null)
    if (!d || e.type === 'pointercancel' || !d.moved) return
    if (d.i !== null || d.north) {
      const places: BoxPatch[] = placesOf(d.rows, heightsMm, geo)
      setHeldRows(d.rows)
      onGridChange?.(d.rows, places)
    }
    if (d.vert && d.h !== undefined)
      onBoxHeight?.(
        d.id,
        d.h <= d.minH + 0.5 ? undefined : Math.round(d.h * 10) / 10,
      )
  }
  useEffect(() => {
    if (!onGridView) return
    const places: BoxPatch[] = placesOf(rowsView, heightsMm, geo)
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
    const inLoop = extra.filter((b) => {
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
    // A loop that catches one member of a group takes the whole group.
    const groups = new Set(inLoop.flatMap((b) => (b.group ? [b.group] : [])))
    setPicked(
      extra
        .filter((b) => inLoop.includes(b) || (b.group && groups.has(b.group)))
        .map((b) => b.id),
    )
  }

  // Text tool + Pencil: the stroke is watched; on lift a circle round a digit
  // becomes a circled number, and (on blank paper) a drawn line, arrow, circle
  // or rectangle becomes a clean shape on the ink layer. One Undo.
  const textPen = useRef<{ pts: Pt[]; blank: boolean } | null>(null)
  const textPenDown = (e: ReactPointerEvent, blank: boolean) => {
    if (flat || activeTool.get() !== 'text' || e.pointerType !== 'pen') return
    if (isUiEvent(e.nativeEvent)) return
    textPen.current = { pts: [{ x: e.clientX, y: e.clientY }], blank }
  }
  const textPenMove = (e: ReactPointerEvent) => {
    if (textPen.current && e.pointerType === 'pen')
      textPen.current.pts.push({ x: e.clientX, y: e.clientY })
  }
  const textPenUp = (e: ReactPointerEvent) => {
    const tp = textPen.current
    textPen.current = null
    if (!tp || activeTool.get() !== 'text') return
    tp.pts.push({ x: e.clientX, y: e.clientY })
    const rec = cleanShape(tp.pts)
    if (!rec) return
    const bb = bounds(rec.pts.map((q) => ({ x: q.x, y: q.y })))
    if (rec.kind === 'ellipse') {
      const ring = { x: bb.x, y: bb.y, w: bb.w, h: bb.h }
      for (const ed of allBoxEditors()) {
        const view = ed.prosemirrorView
        if (!view) continue
        const r = view.dom.getBoundingClientRect()
        if (r.right < ring.x || r.left > ring.x + ring.w) continue
        if (r.bottom < ring.y || r.top > ring.y + ring.h) continue
        if (circleDigit(view as unknown as DigitView, ring)) return
      }
    }
    if (!tp.blank || !onInkOnPaper) return
    const r = paperEl.current?.getBoundingClientRect()
    if (!r) return
    const last = rec.pts[rec.pts.length - 1]
    const events: Recorded[] = [
      ...rec.pts.map((q, i) => ({
        type: i === 0 ? 'pointerdown' : 'pointermove',
        x: q.x,
        y: q.y,
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
        pointerType: 'pen',
        pointerId: e.pointerId,
      })),
      {
        type: 'pointerup',
        x: last.x,
        y: last.y,
        pressure: 0,
        tiltX: 0,
        tiltY: 0,
        pointerType: 'pen',
        pointerId: e.pointerId,
      },
    ]
    // The box that holds the ink and the ink itself are one Undo step.
    void historyGroup('Shape', async () => {
      const id = await boxUnder(r, bb)
      if (!id) return
      const pad = await waitFor(() =>
        document.querySelector(
          '[data-paper-box="' + CSS.escape(id) + '"] [data-ink-pad]',
        ),
      )
      if (!pad) return
      // The Pen draws it, then the Text tool is back (the person did not switch).
      activeTool.set('pen')
      await new Promise((ok) => requestAnimationFrame(ok))
      replay(pad, events)
      await new Promise((ok) => window.setTimeout(ok, 700))
      if (activeTool.get() === 'pen') activeTool.set('text')
    })
  }

  const tapAt = useRef<{ x: number; y: number; t: number } | null>(null)
  const penDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Placing a picture is a mode: no loop, ink or new box meanwhile (22h).
    if (document.documentElement.hasAttribute('data-placing')) return
    if (isUiEvent(e.nativeEvent)) return
    if (lassoDown(e)) return
    const tool = activeTool.get()
    textPenDown(e, true)
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
    textPenMove(e)
  }
  const penUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    textPenUp(e)
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
  const lastCreate = useRef<{ t: number; x: number; y: number } | null>(null)
  const tapPaper = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (document.documentElement.hasAttribute('data-placing')) return
    if (isUiEvent(e.nativeEvent)) return
    const down = tapStart.current
    tapStart.current = null
    if (!onAddBox || flat || e.button !== 0) return
    // B3-2/3: during a drag, a resize and for a moment after a drop, a tap
    // elsewhere never makes a box.
    if (
      drag.current ||
      resizing.current ||
      e.nativeEvent.timeStamp - lastDragEnd.current < AFTER_DRAG_MS
    )
      return
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
    // Owner final 2a: with a box selected (or being typed in), a tap on empty
    // paper only deselects; the next tap makes a box.
    if (bsRef.current.kind !== 'idle') {
      send({ type: 'clear' })
      const live = document.activeElement as HTMLElement | null
      if (live?.closest('[data-paper-box]')) live.blur()
      return
    }
    const r = paperEl.current?.getBoundingClientRect()
    if (!r) return
    const x = (e.clientX - r.left) / k
    const y = (e.clientY - r.top) / k
    // B3-4: a tap anywhere on an existing box's frame edits that box, it never
    // makes a box on top of it.
    for (const b of extra) {
      if (b.locked) continue
      const el = paperEl.current?.querySelector<HTMLElement>(
        '[data-paper-box="' + CSS.escape(b.id) + '"]',
      )
      const fr = el?.getBoundingClientRect()
      if (
        el &&
        fr &&
        e.clientX >= fr.left &&
        e.clientX <= fr.right &&
        e.clientY >= fr.top &&
        e.clientY <= fr.bottom
      ) {
        caretAtEnd(el)
        return
      }
    }
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
    // No double-tap-to-create (owner final): a second tap right after the
    // first, near it, never makes another box.
    const prev = lastCreate.current
    lastCreate.current = { t: Date.now(), x: e.clientX, y: e.clientY }
    if (
      prev &&
      Date.now() - prev.t < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_TAP_PX
    )
      return
    // Text box v2: a SMALL box exactly where tapped (its first line on the
    // paper line under the tap); it grows with the text, then wraps.
    onAddBox({
      x: Math.min(
        Math.max(0, x - 1),
        sheet.w - 15 - FREE_MIN_W - FREE_RIGHT_GAP,
      ),
      y: Math.max(0, snap(y, step / k)),
      row,
      free: true,
      rows: baseRows,
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
    (extra.length > 0 ||
      (narrow && !!onAddBoxInOrder) ||
      mainFocus ||
      layoutMode) && (
      <div
        ref={layerRef}
        data-paper-boxes
        onClick={narrow ? gapTap : undefined}
        onPointerDown={(e) => textPenDown(e, false)}
        onPointerMove={textPenMove}
        onPointerUp={textPenUp}
        // First in the paper, at its top (zero height): the boxes are placed
        // from here. Read aloud meets them before the page text (later).
        style={
          narrow
            ? { position: 'relative', paddingBottom: MARGIN * k, order: 2 }
            : { position: 'relative', height: 0, zIndex: 6 }
        }
      >
        <LoopLayer ref={loopLayer} />
        {guides && <GuideLines g={guides} k={k} />}
        {onGroup && picked.length >= 1 && !liveBoxes && (
          <GroupBar
            picked={extra.filter((b) => picked.includes(b.id))}
            layout={layout}
            k={k}
            onGroup={(ids, group) => onGroup(ids, group)}
          />
        )}
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
        {!narrow && ((mainFocus && !!onBoxMenu) || layoutMode) && (
          <MainChrome
            at={mainShown}
            k={k}
            layoutMode={layoutMode}
            onGrab={(e) => grab(box, 'move', e)}
            onDragMove={dragMove}
            onDragEnd={dragEnd}
            onMenu={(at) => onBoxMenu?.(box, at)}
            height={(heightsMm[MAIN_BOX] ?? 40) * k}
            onResize={{
              down: (how, e) => resizeDown(box, how, e),
              move: resizeMove,
              end: resizeEnd,
            }}
          />
        )}
        {extra.map((b) => (
          <BoxFrame
            key={b.id}
            box={liveBoxes?.has(b.id) ? (dragOrigin?.get(b.id) ?? b) : b}
            shown={
              liveH?.id === b.id
                ? { ...(liveBoxes?.get(b.id) ?? b), h: liveH.h }
                : (liveBoxes?.get(b.id) ?? b)
            }
            layoutMode={layoutMode}
            onResize={{
              down: (how, e) => resizeDown(b, how, e),
              move: resizeMove,
              end: resizeEnd,
            }}
            k={k}
            zoom={zoom}
            lineH={step / zoom}
            sheetPx={sheetPx}
            gapPx={SHEET_GAP_PX}
            sheets={sheets}
            onBottom={(px) => reportBottom(b.id, px)}
            onMenu={(at) => onBoxMenu?.(b, at)}
            picked={picked.includes(b.id)}
            typing={bs.kind === 'typing' && bs.id === b.id}
            lasso={lassoOn}
            dragging={!!liveBoxes?.has(b.id)}
            pushed={!!preview || !!heldRows}
            onHeight={(px) => reportHeight(b.id, px)}
            // Only a box that is as wide as its text reports: a preview that puts it
            // in a column must not change where it is hit.
            onWidth={
              autoIds.has(b.id) ? (px) => reportWidth(b.id, px) : undefined
            }
            autoMaxW={
              autoIds.has(b.id) ? freeMaxW(geo, placedX(b)) * k : undefined
            }
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
            onLive={setPreview}
            onCommit={(rows) => {
              setPreview(null)
              setHeldRows(rows)
              const places: BoxPatch[] = placesOf(rows, heightsMm, geo)
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
    <div data-paper-wrap style={flat ? undefined : { paddingTop: SAFE_GAP_PX }}>
      {layoutMode && layoutBar && (
        <div data-layout-bar data-chrome className="sticky top-2 z-30 mb-3">
          {layoutBar}
        </div>
      )}
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
          data-has-boxes={extra.length > 0 ? '' : undefined}
          data-layout-mode={layoutMode ? '' : undefined}
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
                // Hold on blank paper: "Start typing here" (loads on demand).
                if (
                  !flat &&
                  activeTool.get() === 'text' &&
                  !isUiEvent(e.nativeEvent) &&
                  (e.target === e.currentTarget ||
                    (e.target as Element).closest('[data-paper-sheet]'))
                ) {
                  const ne = e.nativeEvent
                  const r = paperEl.current?.getBoundingClientRect()
                  const mx = r ? (e.clientX - r.left) / k : 0
                  const my = r ? (e.clientY - r.top) / k : 0
                  if (mx > EDGE_MM && mx < sheet.w - EDGE_MM && my > EDGE_MM)
                    startBlankHold(ne, page.id, paperStepMm(page.inkBg), k)
                }
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
                    {t('textTool.hint')}
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
                    ...frameCss(box.style),
                    ...(box.colour && !box.style?.bg
                      ? {
                          backgroundColor: `color-mix(in srgb, ${BOX_COLOURS[box.colour] ?? box.colour} 14%, transparent)`,
                        }
                      : {}),
                    ...(box.style ? { padding: padOf(box.style) } : {}),
                    paddingBottom: MARGIN * k + padOf(box.style),
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

/** A free box the user widened keeps that width (it no longer follows its text). */
const withoutAuto = (row: GridRow): GridRow => {
  const next = { ...row }
  delete next.auto
  return next
}

/**
 * Lasso Group / Ungroup: a small pill above the picked boxes. Two or more
 * picked boxes that are not one group yet: Group. A group (all its boxes are
 * picked when one is tapped): Ungroup.
 */
function GroupBar({
  picked,
  layout,
  k,
  onGroup,
}: {
  picked: PaperBox[]
  layout: Map<string, { x: number; y: number; w: number; h: number }>
  k: number
  onGroup: (ids: string[], group: string | undefined) => void
}) {
  const rects = picked.flatMap((b) => layout.get(b.id) ?? [])
  if (rects.length === 0) return null
  const x = Math.min(...rects.map((r) => r.x))
  const y = Math.min(...rects.map((r) => r.y))
  const groups = new Set(picked.map((b) => b.group))
  const oneGroup = groups.size === 1 && !groups.has(undefined)
  const canGroup = picked.length >= 2 && !oneGroup
  const canUngroup = picked.some((b) => b.group)
  if (!canGroup && !canUngroup) return null
  const ids = picked.map((b) => b.id)
  const btn =
    'min-h-11 rounded-lg px-3 text-sm font-medium text-ink hover:bg-hover'
  return (
    <div
      data-group-bar
      data-ui
      role="toolbar"
      aria-label={t('paper.group.bar')}
      className="absolute z-30 flex gap-1 rounded-xl border border-line bg-surface p-1 shadow-md"
      style={{ left: x * k, top: Math.max(4, y * k - 120) }}
    >
      {canGroup && (
        <button
          type="button"
          data-group-action="group"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onGroup(ids, createId())}
        >
          {t('paper.group.group')}
        </button>
      )}
      {canUngroup && (
        <button
          type="button"
          data-group-action="ungroup"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onGroup(ids, undefined)}
        >
          {t('paper.group.ungroup')}
        </button>
      )}
    </div>
  )
}

/** A guess for a box whose height is not measured yet (mm). */
const DEFAULT_H_MM = 14

/** Smart guides: 1 px magenta lines between the dragged box and what it matches, equal-gap marks. */
function GuideLines({ g, k }: { g: SnapResult; k: number }) {
  const col = '#e11d8f'
  return (
    <div
      aria-hidden
      data-smart-guides
      className="pointer-events-none absolute z-30"
    >
      {g.guides.map((l, i) => (
        <div
          key={'g' + i}
          data-guide={l.kind}
          className="absolute"
          style={
            l.axis === 'x'
              ? {
                  left: l.at * k,
                  top: l.from * k,
                  width: 1,
                  height: (l.to - l.from) * k,
                  background: col,
                }
              : {
                  top: l.at * k,
                  left: l.from * k,
                  height: 1,
                  width: (l.to - l.from) * k,
                  background: col,
                }
          }
        />
      ))}
      {g.marks.map((m, i) => (
        <div
          key={'m' + i}
          data-guide-gap
          className="absolute"
          style={
            m.axis === 'x'
              ? {
                  left: m.from * k,
                  top: m.across * k,
                  width: (m.to - m.from) * k,
                  height: 1,
                  background: col,
                }
              : {
                  top: m.from * k,
                  left: m.across * k,
                  height: (m.to - m.from) * k,
                  width: 1,
                  background: col,
                }
          }
        >
          <span
            className="absolute"
            style={
              m.axis === 'x'
                ? { left: 0, top: -4, width: 1, height: 9, background: col }
                : { top: 0, left: -4, height: 1, width: 9, background: col }
            }
          />
          <span
            className="absolute"
            style={
              m.axis === 'x'
                ? { right: 0, top: -4, width: 1, height: 9, background: col }
                : { bottom: 0, left: -4, height: 1, width: 9, background: col }
            }
          />
        </div>
      ))}
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

/** A tap this soon (ms) and this near (px) after a box-making tap is not another box. */
const DOUBLE_TAP_MS = 700
const DOUBLE_TAP_PX = 60

/** B3-3: no new box this long (ms) after a drag, drop or resize. */
const AFTER_DRAG_MS = 500

/** Layout mode shows the page a little smaller. */
const LAYOUT_ZOOM = 0.85

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

/**
 * B3-6: ⠿ and ⋯ of the page's own text box (the first box), one 44 pt target
 * each, one touch target above its top edge. In Layout mode a cover over the
 * whole box takes the drag.
 */
function MainChrome({
  at,
  k,
  layoutMode,
  height,
  onGrab,
  onDragMove,
  onDragEnd,
  onMenu,
  onResize,
}: {
  onResize: {
    down: (how: ResizeHow, e: ReactPointerEvent) => void
    move: (e: ReactPointerEvent) => void
    end: (e: ReactPointerEvent) => void
  }
  at: { x: number; y: number; w: number }
  k: number
  layoutMode: boolean
  height: number
  onGrab: (e: ReactPointerEvent) => void
  onDragMove: (e: ReactPointerEvent) => void
  onDragEnd: (e: ReactPointerEvent) => void
  onMenu: (at: DOMRect) => void
}) {
  const pointer = {
    onPointerMove: onDragMove,
    onPointerUp: onDragEnd,
    onPointerCancel: onDragEnd,
  }
  return (
    <div
      data-main-chrome
      className="absolute"
      style={{ left: at.x * k, top: at.y * k, width: at.w * k }}
    >
      {layoutMode ? (
        <div
          data-layout-cover="main"
          onPointerDown={onGrab}
          {...pointer}
          className="absolute left-0 z-20 cursor-grab touch-none"
          style={{ top: 0, width: '100%', height }}
        />
      ) : (
        <>
          <div
            aria-hidden
            data-main-frame
            className="pointer-events-none absolute left-0 w-full rounded-md border-[1.5px] border-solid border-accent"
            style={{ top: 0, height }}
          />
          <div
            data-main-handles
            className="pointer-events-none absolute left-0 w-full"
            style={{ top: 0, height }}
          >
            <ResizeDots onResize={onResize} />
          </div>
          <div
            className="pointer-events-none absolute left-0 right-0 z-20 flex items-center justify-end pr-7"
            style={{ top: -TOUCH_PX - 20, height: TOUCH_PX }}
          >
            <button
              type="button"
              data-box-grip
              aria-label={t('paper.box.move')}
              onPointerDown={onGrab}
              {...pointer}
              style={TOUCH_STYLE}
              className="pointer-events-auto absolute left-1/2 -translate-x-1/2 cursor-grab touch-none rounded-t-xl border border-b-0 border-accent bg-accent px-6 text-2xl leading-none text-white shadow-md"
            >
              ≡
            </button>
            <button
              type="button"
              data-box-menu
              aria-label={t('paper.box.menu')}
              aria-haspopup="menu"
              onClick={(e) => onMenu(e.currentTarget.getBoundingClientRect())}
              style={TOUCH_STYLE}
              className="pointer-events-auto rounded-lg px-2 text-xl leading-none text-muted hover:bg-hover"
            >
              ⋯
            </button>
          </div>
        </>
      )}
    </div>
  )
}
