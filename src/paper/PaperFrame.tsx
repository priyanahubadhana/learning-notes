import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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
import type { Page, PaperBox } from '../core/types'
import {
  boxesOf,
  dropPlan,
  MAIN_BOX,
  mainBox,
  MARGIN,
  TOP,
  type PlanBox,
  readingOrder,
  sheetOf,
  snapMove,
} from './boxes'
import { BoxFrame, type GrabHow } from './BoxFrame'
import { clampBox, MIN_W, type BoxPatch } from './boxService'
import { bounds, record, replay, waitFor, type Recorded } from './penOnPaper'
import { activeTool } from '../app/tools/main/mainTools'
import { adopterIn, setPaperDrop } from '../ink/inkTransfer'
import { sheetNav } from './sheetNav'
import { applyPagination, clearPagination } from './paginate'
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
  onBoxesChange,
  onBoxMenu,
  renderBar,
  onInkOnPaper,
  showHint = false,
  children,
}: {
  page: Pick<Page, 'id' | 'sheet' | 'inkBg' | 'boxes'>
  /** The block editor of a box other than the default one. */
  renderBox?: (boxId: string) => ReactNode
  /** A box whose editor is made at once (just made: it takes the caret). */
  eager?: string | null
  /** A tap on empty paper (mm); unset = no new boxes (read-only). */
  onAddBox?: (at: { x: number; y: number }) => void
  /** Phones (fit width): a new box after a box id, at the 'start' or the 'end'. */
  onAddBoxInOrder?: (after: string) => void
  /** Boxes moved or resized in one go (a drop pushes others): one Undo. */
  onBoxesChange?: (changes: BoxChange[]) => void
  onBoxMenu?: (box: PaperBox, at: DOMRect) => void
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

  // The paper grows a sheet at a time under the box's text.
  useEffect(() => {
    const el = boxEl.current
    if (!el) return
    const measure = () =>
      setBoxBottom(
        el.getBoundingClientRect().bottom -
          (el.parentElement?.getBoundingClientRect().top ?? 0),
      )
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [k])
  const lowest = Math.max(
    boxBottom,
    ...boxesOf(page)
      .filter((b) => b.id !== MAIN_BOX)
      .map((b) => bottoms[b.id] ?? b.y * k),
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
      const sheet0 = root
        .querySelector<HTMLElement>('[data-paper-sheet="1"]')
        ?.getBoundingClientRect()
      if (!sheet0 || sheet0.height === 0) return
      for (const el of editors()) {
        applyPagination(el, sheet0, SHEET_GAP_PX, MARGIN * k, TOP * k)
      }
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
    return () => {
      cancelAnimationFrame(frame)
      mo.disconnect()
      ro.disconnect()
      window.removeEventListener('resize', later)
    }
  }, [k, sheets, narrow, flat, page.boxes?.length])

  const stored = boxesOf(page).filter((b) => b.id !== MAIN_BOX)
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
  useEffect(() => {
    if (picked.length === 0) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setPicked([])
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [picked.length])

  // Moving and resizing boxes. The box under the pointer (and the others
  // picked with it) follow it as see-through copies; every drop is planned
  // (`dropPlan`) so boxes never overlap: the ones below make room.
  const [liveBoxes, setLiveBoxes] = useState<Map<string, PaperBox> | null>(null)
  const [landing, setLanding] = useState<Map<string, PaperBox> | null>(null)
  // A dropped box stays where it landed until the saved page catches up.
  const [heldRaw, setHeld] = useState<Map<string, PaperBox> | null>(null)
  const held =
    heldRaw &&
    [...heldRaw].some(([id, h]) => {
      const b = page.boxes?.find((x) => x.id === id)
      return !b || b.x !== h.x || b.y !== h.y || b.w !== h.w
    })
      ? heldRaw
      : null
  useEffect(() => {
    if (!heldRaw) return
    const id = window.setTimeout(() => setHeld(null), 1500)
    return () => window.clearTimeout(id)
  }, [heldRaw])
  const [dropLines, setDropLines] = useState<PaperBox[]>([])
  const [guides, setGuides] = useState<{
    gx: number | null
    gy: number | null
  } | null>(null)
  const drag = useRef<{
    how: GrabHow
    x0: number
    y0: number
    lead: string
    ids: string[]
    orig: Map<string, PaperBox>
    moved: boolean
    shift: boolean
  } | null>(null)
  const grab = (box: PaperBox, how: GrabHow, e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    try {
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    } catch {
      // The moves still reach the handle.
    }
    const group =
      how === 'move' && picked.includes(box.id)
        ? extra.filter((b) => picked.includes(b.id) && !b.locked)
        : [box]
    drag.current = {
      how,
      x0: e.clientX,
      y0: e.clientY,
      lead: box.id,
      ids: box.locked ? [] : group.map((b) => b.id),
      orig: new Map(group.map((b) => [b.id, b])),
      moved: false,
      shift: e.shiftKey,
    }
  }
  /** Every box now (mm): its place and size on the paper. */
  const rectsNow = (): PlanBox[] => {
    const out: PlanBox[] = []
    const holder = layerRef.current
    for (const b of boxesOf(page)) {
      if (b.id === MAIN_BOX) {
        out.push({
          id: b.id,
          x: b.x,
          y: b.y,
          w: b.w,
          h: mainTextHeight() / k,
          fixed: true,
        })
        continue
      }
      const el = holder?.querySelector<HTMLElement>(
        '[data-paper-box="' + CSS.escape(b.id) + '"]',
      )
      out.push({
        id: b.id,
        x: b.x,
        y: b.y,
        w: b.w,
        h: (el?.offsetHeight ?? 0) / k,
        fixed: !!b.locked,
      })
    }
    return out
  }
  /**
   * How tall the default box is for a drop (px). With the Text tool it is the
   * box itself; the ink tools stretch the box over the page, so then only its
   * text (and the bottom margin) counts.
   */
  const mainTextHeight = () => {
    const el = boxEl.current
    if (!el) return 0
    if (activeTool.get() === 'text') return el.offsetHeight
    const blocks = el.querySelectorAll<HTMLElement>(
      '.bn-editor > .bn-block-group > .bn-block-outer',
    )
    const last = blocks[blocks.length - 1]
    return last
      ? Math.min(
          el.offsetHeight,
          last.getBoundingClientRect().bottom -
            el.getBoundingClientRect().top +
            MARGIN * k,
        )
      : el.offsetHeight
  }
  const dragMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || d.ids.length === 0) return
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < TAP_PX)
      return
    d.moved = true
    const dx = (e.clientX - d.x0) / k
    const dy = (e.clientY - d.y0) / k
    const lead = d.orig.get(d.lead)!
    const all = rectsNow()
    const hOf = (id: string) => all.find((r) => r.id === id)?.h ?? 0
    const live = new Map<string, PaperBox>()
    if (d.how === 'move') {
      // The lead sticks lightly to other boxes and the margins; the rest of
      // the group keeps its distance to it.
      let nx = lead.x + dx
      let ny = snap(lead.y + dy, step / k)
      const others = all.filter((r) => !d.ids.includes(r.id))
      const sn = snapMove(
        { x: nx, y: ny, w: lead.w, h: hOf(lead.id) },
        others,
        sheet.w,
      )
      nx = sn.x
      if (sn.gy !== null) ny = sn.y
      const c = clampBox({ ...lead, x: nx, y: ny }, sheet.w)
      const ddx = c.x - lead.x
      const ddy = c.y - lead.y
      for (const id of d.ids) {
        const o = d.orig.get(id)!
        live.set(id, clampBox({ ...o, x: o.x + ddx, y: o.y + ddy }, sheet.w))
      }
      setGuides({ gx: sn.gx, gy: sn.gy })
    } else {
      live.set(
        lead.id,
        clampBox(
          d.how === 'right'
            ? { ...lead, w: lead.w + dx }
            : { ...lead, x: lead.x + dx, w: lead.w - dx },
          sheet.w,
        ),
      )
    }
    setLiveBoxes(live)
    // Where it would land, and who makes room.
    const plan = dropPlan(
      d.ids.map((id) => ({ ...live.get(id)!, h: hOf(id), id })),
      all.filter((r) => !d.ids.includes(r.id)),
      step / k,
    )
    const land = new Map<string, PaperBox>()
    for (const id of d.ids) {
      const b = live.get(id)!
      land.set(id, { ...b, y: plan.get(id) ?? b.y })
    }
    for (const [id, y] of plan) {
      if (d.ids.includes(id)) continue
      const o = extra.find((b) => b.id === id)
      if (o) land.set(id, { ...o, y })
    }
    setLanding(land)
    setDropLines(d.how === 'move' ? d.ids.map((id) => land.get(id)!) : [])
  }
  const dragEnd = (e: ReactPointerEvent) => {
    const d = drag.current
    drag.current = null
    const land = landing
    setLiveBoxes(null)
    setLanding(null)
    setDropLines([])
    setGuides(null)
    if (!d) return
    if (e.type === 'pointercancel') return
    if (!d.moved) return selectBox(d.lead, d.shift)
    if (!land) return
    const changes: BoxChange[] = []
    for (const [id, b] of land) {
      const was = extra.find((x) => x.id === id)
      if (!was) continue
      if (b.x === was.x && b.y === was.y && b.w === was.w) continue
      changes.push({
        id,
        patch: { x: b.x, y: b.y, w: b.w },
        before: { x: was.x, y: was.y, w: was.w },
      })
    }
    if (changes.length) {
      setHeld(land)
      onBoxesChange?.(changes)
    }
  }
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
    loopLayer.current?.set(loop.current)
    return true
  }
  const lassoUp = () => {
    const poly = loop.current
    if (!poly) return
    loop.current = null
    loopLayer.current?.set(null)
    if (poly.length < 3) return setPicked([])
    const p = paperEl.current?.getBoundingClientRect()
    if (!p) return
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

  const penDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (lassoDown(e)) return
    const tool = activeTool.get()
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
      loopLayer.current?.set(loop.current)
    }
    pen.current?.push(record('pointermove', e.nativeEvent))
  }
  const penUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    lassoUp()
    const events = pen.current
    pen.current = null
    if (!events || !onInkOnPaper) return
    events.push(record('pointerup', e.nativeEvent))
    const r = paperEl.current?.getBoundingClientRect()
    if (!r) return
    void boxUnder(r, bounds(events))?.then(async (id) => {
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
  const tapPaper = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onAddBox || flat || e.button !== 0) return
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
    // Inside the default box's column the tap belongs to the page's text.
    onAddBox({ x: Math.max(0, x - 4), y: Math.max(0, snap(y, step / k)) })
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
        {guides?.gx != null && (
          <div
            aria-hidden
            data-snap-guide="x"
            className="pointer-events-none absolute bg-accent"
            style={{
              left: guides.gx * k,
              top: 0,
              width: 1,
              height: total,
            }}
          />
        )}
        {guides?.gy != null && (
          <div
            aria-hidden
            data-snap-guide="y"
            className="pointer-events-none absolute bg-accent"
            style={{ top: guides.gy * k, left: 0, height: 1, width }}
          />
        )}
        {dropLines.map((b) => (
          <div
            key={b.id}
            aria-hidden
            data-drop-line
            className="pointer-events-none absolute"
            style={{
              left: b.x * k,
              top: b.y * k - 1,
              width: b.w * k,
              height: 2,
              background: '#ef4444',
            }}
          />
        ))}
        {extra.map((b) => (
          <BoxFrame
            key={b.id}
            box={b}
            shown={
              liveBoxes?.get(b.id) ?? landing?.get(b.id) ?? held?.get(b.id) ?? b
            }
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
            pushed={!!landing?.has(b.id)}
            onGrab={(how, e) => grab(b, how, e)}
            onDragMove={dragMove}
            onDragEnd={dragEnd}
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
              onPointerDown={penDown}
              onPointerMove={(e) => {
                penMove(e)
                hoverMove(e)
              }}
              onPointerLeave={() => setHover(null)}
              onPointerCancel={() => setHover(null)}
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
                    marginLeft: box.x * k,
                    width: box.w * k,
                    marginTop: box.y * k - total,
                    paddingBottom: MARGIN * k,
                  }
            }
          >
            <div style={zoom === 1 || flat ? undefined : { zoom }}>
              {children}
            </div>
          </div>
        </div>
      </div>
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
type LoopApi = { set: (points: Pt[] | null) => void }

/** The Lasso loop on the paper; redraws alone while the pen moves. */
function LoopLayer({ ref }: { ref: Ref<LoopApi> }) {
  const [points, setPoints] = useState<Pt[] | null>(null)
  useImperativeHandle(ref, () => ({
    set: (p) => setPoints(p && [...p]),
  }))
  if (!points) return null
  return (
    <svg
      aria-hidden
      data-paper-lasso
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
      width="1"
      height="1"
    >
      <polyline
        points={points.map((p) => p.x + ',' + p.y).join(' ')}
        fill="none"
        stroke="var(--color-accent)"
        strokeDasharray="4 3"
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
