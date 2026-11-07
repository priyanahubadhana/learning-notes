import { clampDpr } from '../app/canvasBudget'
import { inkSwitches } from './inkRuntime'
import { createId } from '../core/ids'
import type { InkLayer, Stroke } from '../core/inkTypes'
import {
  eraserSettings,
  ERASER_SIZES,
  highlighterSettings,
  lassoSettings,
  penSettings,
  type DrawAs,
} from '../app/tools/main/inkSettings'
import type { ModeTool } from '../app/tools/main/mainTools'
import { pickAnchor, toLocal, toWorld } from './anchor'
import { eraseStroke, touches } from './eraser'
import {
  apply,
  around,
  boundsOf,
  containsPt,
  dist,
  inflate,
  inPolygon,
  intersects,
  mapXY,
  unionRect,
  xy,
  type Affine,
  type Pt,
  type Rect,
} from './geometry'
import {
  InkDoc,
  emptyEdit,
  isEmptyEdit,
  type Edit,
  type Placed,
} from './inkDoc'
import { InkHistory } from './inkHistory'
import {
  eraserLayer,
  layerForDrawing,
  liveLayers,
  newLayer,
  setHidden,
  setLocked,
} from './layers'
import { PageLayout } from './layout'
import { nearestEdge, projectOnEdge, type Edge } from './ruler'
import { rulerTool } from './toolState'
import { InkRenderer, paintStroke, strokeRect } from './render'
import {
  isLoop,
  isScribble,
  recogniseShape,
  shapeFromDrag,
  insideLoop,
  type Recognised,
} from './shapes'
import {
  highlightStyle,
  inkStyle,
  makeStroke,
  scaledStyle,
  tapeStyle,
  TAPE_COLOUR,
  type RawPoint,
} from './style'
import {
  clearHighlightRuns,
  eraseHighlightsLive,
  restoreHighlights,
  type LiveRemoved,
  highlightRuns,
  nearestHighlightName,
  runsText,
  textRunsUnder,
} from './textSnap'
import { MAX_LABEL, STRIDE } from '../core/inkTypes'
import { selectGesture } from '../editor/gesture'
import {
  isDoubleTap,
  isShort,
  isTap,
  travelOf,
  type TapMark,
} from './tapFilter'

/**
 * The ink engine for one open page: pointer handling for the Pen,
 * Highlighter, Eraser and Lasso, the lasso selection and its transforms,
 * and the canvases. No React here (the surface component owns the menus);
 * everything the page offers goes through the `InkEnv` it is given.
 */

export interface TextEditor {
  prosemirrorView?: {
    posAtDOM: (node: Node, offset: number) => number
    state: { schema: { marks: Record<string, unknown> } }
  }
  transact: <T>(fn: (tr: never) => T) => T
  addStyles: (styles: object) => void
}

export interface InkEnv {
  wrap: HTMLElement
  editorEl: () => HTMLElement | null
  editor: TextEditor
  doc: InkDoc
  history: InkHistory
  tool: () => ModeTool
  deviceMode: () => 'computer' | 'touch' | 'pencil'
  /** Reading or read-only: no drawing. */
  frozen: () => boolean
  night: () => boolean
  toast: (
    message: string,
    action?: { label: string; onSelect: () => void },
  ) => void
  /** The text editor's undo depth (for the one history). */
  textDepth: () => number
  /** Default name of a new layer ("Layer 2"). */
  layerName: (n: number) => string
  /** "Save to notes" of the highlighter. */
  saveToNotes: (text: string) => void
  /** Switch the active tool (circle to lasso). */
  setTool: (tool: ModeTool) => void
  textSize: () => number
}

type Gesture =
  | {
      kind: 'draw'
      id: number
      type: string
      layerId: string
      pts: RawPoint[]
      world: Pt[]
      predicted: RawPoint[]
      t0: number
      at: number
      holdOrigin: Pt
      holdTimer: ReturnType<typeof setTimeout> | undefined
      shape: Recognised | null
      highlight: boolean
      /** Dragging out a shape (or Tape) instead of writing freehand. */
      dragAs: DrawAs
      /** Where the gesture began (page px), for the shape's first corner. */
      origin: Pt
      /** The ruler edge this stroke slides along, if it began at one. */
      edge: Edge | null
      frame: { blockId: string | null }
    }
  | {
      kind: 'erase'
      id: number
      last: Pt | null
      path: Pt[]
      del: Map<string, Placed>
      add: Map<string, Placed>
      /** Text highlights taken off live (put back before the real edit). */
      live: LiveRemoved[]
    }
  | {
      kind: 'lasso'
      id: number
      path: Pt[]
      owns: boolean
      hitId: string | null
      start: Pt
    }
  | {
      kind: 'transform'
      id: number
      how: 'move' | 'scale' | 'rotate'
      start: Pt
      centre: Pt
      fixed: Pt
      m: Affine
      factor: number
      before: Placed[]
    }

const HOLD_MS = 600
const HOLD_SLOP = 3
const MIN_MOVE = 0.3
const DEFAULT_PRESSURE = 0.4
let penSeenEver = false

export class InkController {
  readonly layout: PageLayout
  readonly renderer: InkRenderer
  readonly pad: HTMLDivElement
  readonly overlay: HTMLDivElement
  selection: string[] = []
  /** Page blocks inside the same Lasso loop as the drawings (a mixed selection). */
  blockSel: string[] = []
  private env: InkEnv
  private gesture: Gesture | null = null
  private raf = 0
  private layoutDirty = true
  /** What the canvases show now (see `redraw`); '' after anything live. */
  private painted = ''
  private hidden = new Set<string>()
  private listeners = new Set<() => void>()
  private cleanups: (() => void)[] = []
  private pressureMax = 0
  private penDown = false
  private lastPenAt = -1e9
  private scroller: HTMLElement | Window = window
  private hover: Pt | null = null
  /** Tapes peeled off for now (ids; never saved). */
  private peeled = new Set<string>()
  /** Raised when the selection or what the overlay shows changed. */
  version = 0
  private lastDepth = 0
  private noted = -1

  constructor(env: InkEnv) {
    this.env = env
    this.layout = new PageLayout(env.wrap, (id) => env.doc.fallbackOf(id))
    this.renderer = new InkRenderer(penSettings.get().lowLatency)
    this.overlay = document.createElement('div')
    this.overlay.setAttribute('data-ink-overlay', '')
    Object.assign(this.overlay.style, {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: '5',
    })
    this.pad = document.createElement('div')
    this.pad.setAttribute('data-ink-pad', '')
    // Drawing must not close an open options pill (the page would jump).
    this.pad.setAttribute('data-popup-trigger', '')
    Object.assign(this.pad.style, { position: 'absolute', inset: '0' })
    this.overlay.append(this.renderer.root, this.pad)
  }

  // ---- Setup ----

  mount(): void {
    const { wrap, doc } = this.env
    wrap.append(this.overlay)
    this.placeOverlay()
    this.scroller = scrollParent(wrap)
    const on = (
      el: HTMLElement | Window | Document,
      type: string,
      fn: (e: never) => void,
      opts?: AddEventListenerOptions | boolean,
    ) => {
      el.addEventListener(type, fn as EventListener, opts)
      this.cleanups.push(() =>
        el.removeEventListener(type, fn as EventListener, opts),
      )
    }
    on(this.pad, 'pointerdown', (e: PointerEvent) =>
      this.guard(() => this.down(e)),
    )
    on(this.pad, 'pointermove', (e: PointerEvent) =>
      this.guard(() => this.move(e)),
    )
    on(this.pad, 'pointerup', (e: PointerEvent) => this.guard(() => this.up(e)))
    on(this.pad, 'pointercancel', (e: PointerEvent) =>
      this.guard(() => this.cancel(e)),
    )
    on(this.pad, 'pointerleave', () => {
      this.hover = null
      this.requestDraw()
    })
    on(this.pad, 'contextmenu', (e: Event) => e.preventDefault())
    // A Pencil must not scroll the page while a finger still can, and iPadOS
    // must not read a Pencil touch on the pad, a handle or a box as Scribble
    // over the words underneath (the handles sit over editable text). Chrome
    // inside the overlay (menus, chips) is left to penTap, which clicks it.
    const stylusOnly = (e: TouchEvent) => {
      if (!inkSwitches.touchCancel || !e.cancelable) return
      const t = e.target as Element | null
      if (t?.closest('[data-chrome]')) return
      for (const touch of Array.from(e.changedTouches)) {
        if ((touch as Touch & { touchType?: string }).touchType === 'stylus') {
          e.preventDefault()
          return
        }
      }
    }
    on(this.overlay, 'touchstart', stylusOnly, { passive: false })
    on(this.overlay, 'touchmove', stylusOnly, { passive: false })
    // The lasso watches the page without taking it over.
    on(
      wrap,
      'pointerdown',
      (e: PointerEvent) => this.guard(() => this.lassoDown(e)),
      true,
    )
    on(window, 'pointermove', (e: PointerEvent) =>
      this.guard(() => this.lassoMove(e)),
    )
    on(window, 'pointerup', (e: PointerEvent) =>
      this.guard(() => this.lassoUp(e)),
    )
    on(window, 'pointercancel', (e: PointerEvent) =>
      this.guard(() => this.lassoCancel(e)),
    )
    on(window, 'resize', () => this.dirty())
    on(this.scroller, 'scroll', () => this.requestDraw(), { passive: true })
    on(
      document,
      'keydown',
      (e: KeyboardEvent) => this.guard(() => this.key(e)),
      true,
    )
    const ro = new ResizeObserver(() => this.dirty())
    ro.observe(wrap)
    // The page moves when the bars above it grow or shrink (a pill opens or
    // closes): the scroller's size changes then, and the overlay must follow.
    if (this.scroller !== window) ro.observe(this.scroller as HTMLElement)
    const editorEl = this.env.editorEl()
    if (editorEl) ro.observe(editorEl)
    this.cleanups.push(() => ro.disconnect())
    const mo = new MutationObserver(() => this.dirty())
    mo.observe(editorEl ?? wrap, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-level', 'data-text-alignment'],
    })
    this.cleanups.push(() => mo.disconnect())
    this.cleanups.push(
      doc.subscribe(() => {
        this.syncPad() // the Lasso owns the pad only while there is ink
        this.notify() // the hidden-layer chip follows the layers
      }),
    )
    this.cleanups.push(penSettings.subscribe(() => this.syncPad()))
    this.cleanups.push(lassoSettings.subscribe(() => this.syncPad()))
    this.syncPad()
    this.dirty()
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    for (const c of this.cleanups) c()
    this.cleanups = []
    this.overlay.remove()
    this.renderer.dispose()
    this.listeners.clear()
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify(): void {
    this.version++
    for (const fn of this.listeners) fn()
  }

  private guard(fn: () => void): void {
    try {
      fn()
    } catch (e) {
      console.error('Ink', e)
      this.gesture = null
    }
  }

  private dirty(): void {
    this.layoutDirty = true
    this.requestDraw()
  }

  /**
   * Does the Lasso own the pointer? Yes while its Ink filter is on and the
   * page has ink: the pad then catches the Pencil like the Pen's pad does, so
   * nothing under the ink reacts (no text drag-selection, no Scribble, no
   * scroll). Words join only as whole blocks inside the loop. With no ink on
   * the page the Lasso keeps watching, and a Pencil drag still selects text.
   */
  lassoOwnsPad(): boolean {
    return (
      this.env.tool() === 'lasso' &&
      lassoSettings.get().ink &&
      this.env.doc.strokeCount > 0
    )
  }

  /** Tells the pad what to catch for the tool now selected. */
  syncPad(): void {
    const tool = this.env.tool()
    const on =
      (tool === 'pen' ||
        tool === 'highlighter' ||
        tool === 'eraser' ||
        this.lassoOwnsPad()) &&
      !this.env.frozen()
    this.pad.style.pointerEvents = on ? 'auto' : 'none'
    this.pad.style.cursor = on ? 'crosshair' : 'default'
    // A finger scrolls unless it may draw.
    this.pad.style.touchAction = this.fingerCanDraw()
      ? 'none'
      : 'pan-x pan-y pinch-zoom'
    this.requestDraw()
  }

  fingerCanDraw(): boolean {
    const mode = penSettings.get().finger
    if (mode === 'on') return true
    if (mode === 'off') return false
    return this.env.deviceMode() !== 'pencil' && !penSeenEver
  }

  // ---- Drawing the page ----

  requestDraw(): void {
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      this.guard(() => this.redraw())
    })
  }

  /**
   * Room to draw: while an ink tool is chosen, or there is ink, the page is
   * at least as tall as the visible scroller and always 240 px taller than its lowest
   * stroke, so there is blank page under the last line to write on.
   */
  private roomKey = ''
  private ensureRoom(): void {
    const { doc, wrap } = this.env
    const tool = this.env.tool()
    const inking =
      tool === 'pen' ||
      tool === 'highlighter' ||
      tool === 'eraser' ||
      tool === 'lasso'
    const key = `${doc.version}|${this.layout.version}|${inking}`
    if (key === this.roomKey) return
    this.roomKey = key
    if (!inking && doc.strokeCount === 0) {
      wrap.style.minHeight = ''
      return
    }
    let bottom = 0
    for (const p of doc.all()) {
      const r = strokeRect(p.stroke, this.layout.frame(p.blockId))
      if (r) bottom = Math.max(bottom, r.y + r.h)
    }
    const scrollerH =
      this.scroller === window
        ? window.innerHeight
        : (this.scroller as HTMLElement).clientHeight
    const want = Math.max(scrollerH, bottom > 0 ? bottom + 240 : 0)
    const have = parseFloat(wrap.style.minHeight) || 0
    if (Math.abs(want - have) > 8)
      wrap.style.minHeight = `${Math.round(want)}px`
  }

  private visible(): { top: number; height: number; width: number } {
    const wb = this.env.wrap.getBoundingClientRect()
    const s = this.scroller
    const vTop =
      s === window ? 0 : (s as HTMLElement).getBoundingClientRect().top
    const vBottom =
      s === window
        ? window.innerHeight
        : (s as HTMLElement).getBoundingClientRect().bottom
    const top = Math.min(Math.max(0, vTop - wb.top), wb.height)
    const bottom = Math.min(Math.max(0, vBottom - wb.top), wb.height)
    return { top, height: Math.max(1, bottom - top), width: wb.width }
  }

  /**
   * Lays the overlay exactly over the editor without making the editor's
   * container positioned (that moves the editor's own floating toolbars).
   */
  private placeOverlay(): void {
    const { wrap } = this.env
    const wr = wrap.getBoundingClientRect()
    const parent = this.overlay.offsetParent as HTMLElement | null
    let left: number
    let top: number
    if (parent && getComputedStyle(parent).position !== 'static') {
      const pr = parent.getBoundingClientRect()
      left = pr.left + parent.clientLeft
      top = pr.top + parent.clientTop
    } else {
      left = -window.scrollX
      top = -window.scrollY
    }
    const st = this.overlay.style
    st.left = `${wr.left - left}px`
    st.top = `${wr.top - top}px`
    st.width = `${wr.width}px`
    st.height = `${wr.height}px`
  }

  private redraw(): void {
    this.placeOverlay()
    const { doc } = this.env
    if (this.layoutDirty && (doc.strokeCount > 0 || this.gesture)) {
      this.layoutDirty = false
      this.layout.measure()
      for (const id of doc.anchorBlocks()) {
        const r = this.layout.rectOf(id)
        if (r) doc.noteBlock(id, { x: r.x, y: r.y, w: this.layout.width })
      }
    }
    this.ensureRoom()
    const v = this.visible()
    const dpr = clampDpr(window.devicePixelRatio || 1)
    const r = this.renderer
    r.setView(v.top, v.width, v.height, dpr)
    const tool = this.env.tool()
    const night = this.env.night()
    // Nothing on the canvases would change: leave them alone. Clearing three
    // screen-sized canvases and putting the layer bitmap back costs a whole
    // frame in WebKit (every keystroke, resize and layout check comes here).
    // Anything live (a stroke, the eraser ring, a lasso, peeled tape) paints
    // every frame.
    const live =
      this.gesture !== null ||
      (tool === 'eraser' && this.hover !== null) ||
      this.peeled.size > 0
    const key = live
      ? ''
      : `${doc.version}|${this.layout.version}|${r.top}|${r.width}|${r.height}|${r.dpr}|${[...this.hidden].join(',')}|${night}|${tool}`
    if (key === '' || key !== this.painted) {
      this.painted = key
      r.draw(doc, this.layout, {
        hidden: this.peeled.size
          ? new Set([...this.hidden, ...this.peeled])
          : this.hidden,
        night,
      })
      this.drawLive()
    }
    if (this.layout.version !== this.noted) {
      this.noted = this.layout.version
      this.notify()
    }
  }

  /** The moving parts: the stroke being drawn, the eraser, the lasso, a preview. */
  private drawLive(): void {
    const r = this.renderer
    r.clearLive()
    const g = this.gesture
    const target = r.liveTarget()
    if (g?.kind === 'draw') {
      const stroke = this.liveStroke(g)
      if (stroke) {
        r.setLiveBlend(g.highlight)
        paintStroke(target, stroke, this.layout.frame(g.frame.blockId))
      }
    } else if (g?.kind === 'transform') {
      for (const p of g.before) {
        paintStroke(target, p.stroke, this.layout.frame(p.blockId), g.m)
      }
    }
    const ctx = r.liveCtx
    const tool = this.env.tool()
    if (tool === 'eraser' && (this.hover || g?.kind === 'erase')) {
      const at = g?.kind === 'erase' && g.last ? g.last : this.hover
      if (at) this.circle(at, ERASER_SIZES[eraserSettings.get().size] / 2)
    }
    if (this.peeled.size > 0) {
      // A peeled tape leaves a dashed outline, so it can be stuck back.
      ctx.save()
      ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, -r.dpr * r.top)
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 1.5
      ctx.strokeStyle = TAPE_COLOUR
      for (const p of this.selectable()) {
        if (!this.peeled.has(p.stroke.id)) continue
        const box = strokeRect(p.stroke, this.layout.frame(p.blockId))
        if (box) ctx.strokeRect(box.x, box.y, box.w, box.h)
      }
      ctx.restore()
    }
    if (g?.kind === 'lasso' && g.path.length > 1) {
      ctx.save()
      ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, -r.dpr * r.top)
      ctx.setLineDash([6, 5])
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#0b6e99'
      ctx.beginPath()
      if (lassoSettings.get().shape === 'rect') {
        const b = boundsOf([g.path[0], g.path[g.path.length - 1]])
        ctx.rect(b.x, b.y, b.w, b.h)
      } else {
        ctx.moveTo(g.path[0].x, g.path[0].y)
        for (const p of g.path) ctx.lineTo(p.x, p.y)
        ctx.closePath()
      }
      ctx.stroke()
      ctx.restore()
    }
  }

  private circle(at: Pt, radius: number): void {
    const { liveCtx: ctx, dpr, top } = this.renderer
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, -dpr * top)
    ctx.lineWidth = 1.2
    ctx.strokeStyle = this.env.night() ? '#e8e8ea' : '#1d1d1f'
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.arc(at.x, at.y, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  private liveStroke(g: Extract<Gesture, { kind: 'draw' }>): Stroke | null {
    const frame = this.layout.frame(g.frame.blockId)
    const tape = g.dragAs === 'tape' && !g.highlight
    const style = g.highlight
      ? highlightStyle()
      : tape
        ? tapeStyle()
        : inkStyle()
    let points: RawPoint[] = [...g.pts, ...g.predicted]
    if (g.shape) {
      points = g.shape.pts.map((p, i) => ({
        ...toLocal(p, frame),
        p: 0.5,
        t: i * 8,
      }))
    }
    if (points.length === 0) return null
    const s = makeStroke(
      g.highlight ? 'highlight' : tape ? 'tape' : 'ink',
      style,
      points,
      this.layout.width,
      g.at,
    )
    if (!g.shape) return s
    return {
      ...s,
      shape: g.shape.kind,
      ...(tape || this.shapeFill(g.shape) ? { fill: true as const } : {}),
    }
  }

  private shapeFill(s: Recognised): boolean {
    return penSettings.get().shapeFill && s.closed
  }

  // ---- Pointers ----

  private accepts(e: PointerEvent): boolean {
    if (e.pointerType === 'pen') {
      penSeenEver = true
      this.lastPenAt = performance.now()
      return true
    }
    if (e.pointerType === 'mouse') return e.button === 0
    if (this.penDown || performance.now() - this.lastPenAt < 700) return false
    return this.fingerCanDraw()
  }

  private world(e: PointerEvent | { clientX: number; clientY: number }): Pt {
    const b = this.env.wrap.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }

  private scaled(e: PointerEvent): number {
    if (e.pointerType !== 'pen') return 0.5
    const raw = e.pressure
    this.pressureMax = Math.max(this.pressureMax, raw)
    if (!(raw > 0)) return DEFAULT_PRESSURE
    return Math.min(1, raw / Math.max(0.25, this.pressureMax))
  }

  private down(e: PointerEvent): void {
    // Under the Lasso the pad only shields the page: lassoDown took the event.
    if (this.env.tool() === 'lasso') return
    if (this.env.frozen() || !this.accepts(e)) return
    if (e.pointerType === 'pen') this.penDown = true
    if (this.gesture) {
      // A second finger: a pinch, not a stroke.
      if (e.pointerType === 'touch') this.cancelGesture()
      return
    }
    const tool = this.env.tool()
    e.preventDefault()
    try {
      this.pad.setPointerCapture(e.pointerId)
    } catch {
      // A pointer the browser does not know (a test): events still arrive.
    }
    this.layout.measure()
    const w = this.world(e)
    if (tool === 'eraser') {
      this.gesture = {
        kind: 'erase',
        id: e.pointerId,
        last: null,
        path: [],
        del: new Map(),
        add: new Map(),
        live: [],
      }
      this.eraseTo(w)
      return
    }
    if (tool !== 'pen' && tool !== 'highlighter') return
    const layer = this.layerForDrawing()
    if (!layer) return
    const blockId = pickAnchor(w, this.layout.blocks())
    const frame = this.layout.frame(blockId)
    const g: Extract<Gesture, { kind: 'draw' }> = {
      kind: 'draw',
      id: e.pointerId,
      type: e.pointerType,
      layerId: layer.id,
      pts: [],
      world: [],
      predicted: [],
      t0: e.timeStamp,
      at: Date.now(),
      holdOrigin: w,
      holdTimer: undefined,
      shape: null,
      highlight: tool === 'highlighter',
      dragAs: tool === 'pen' ? penSettings.get().drawAs : 'free',
      origin: w,
      edge: this.rulerEdgeAt(
        w,
        tool === 'pen' ? penSettings.get().drawAs : 'free',
      ),
      frame: { blockId },
    }
    this.gesture = g
    this.addPoint(g, e, frame)
    this.armHold(g)
    this.requestDraw()
  }

  lockedMessage = 'Unlock a layer to draw'

  /**
   * The active layer, or null after telling the user why nothing is drawn
   * (locked or hidden), with a button that fixes it.
   */
  private layerForDrawing(): InkLayer | null {
    const { doc } = this.env
    if (doc.layers.length === 0)
      return { id: '', pageId: doc.pageId } as InkLayer
    const r = layerForDrawing(doc.layers, doc.chosenLayer)
    if (r.layer) return r.layer
    const named = r.named
    if (!named) {
      this.env.toast(this.lockedMessage)
      return null
    }
    const fix = r.reason === 'locked' ? setLocked : setHidden
    this.env.toast(this.layerMessage(r.reason, named.name), {
      label: this.layerActionLabel(r.reason),
      onSelect: () => doc.patchLayer(fix(named, false)),
    })
    return null
  }

  /** Texts for the locked/hidden toast (set by the surface in the user's language). */
  layerMessage: (reason: 'locked' | 'hidden', name: string) => string = (
    reason,
    name,
  ) => `${name} is ${reason}`
  layerActionLabel: (reason: 'locked' | 'hidden') => string = (reason) =>
    reason === 'locked' ? 'Unlock' : 'Show'

  private addPoint(
    g: Extract<Gesture, { kind: 'draw' }>,
    e: PointerEvent,
    frame: { x: number; y: number; w: number },
  ): void {
    // A pen that began at a ruler edge slides along it.
    const raw = this.world(e)
    const w = g.edge ? projectOnEdge(raw, g.edge) : raw
    const last = g.world[g.world.length - 1]
    if (last && dist(last, w) < MIN_MOVE) return
    g.world.push(w)
    const l = toLocal(w, frame)
    g.pts.push({
      x: l.x,
      y: l.y,
      p: this.scaled(e),
      tx: e.tiltX ?? 0,
      ty: e.tiltY ?? 0,
      t: e.timeStamp - g.t0,
    })
  }

  private armHold(g: Extract<Gesture, { kind: 'draw' }>): void {
    clearTimeout(g.holdTimer)
    // Dragging out a shape or tape needs no "draw and hold" snapping.
    if (g.highlight || g.dragAs !== 'free' || !penSettings.get().holdShape) {
      return
    }
    g.holdTimer = setTimeout(() => {
      if (this.gesture !== g || g.world.length < 4) return
      const found = recogniseShape(g.world, {
        snap: penSettings.get().shapeSnap,
      })
      if (found) {
        g.shape = found
        this.requestDraw()
      }
    }, HOLD_MS)
  }

  private move(e: PointerEvent): void {
    const g = this.gesture
    if (!g) {
      if (e.pointerType !== 'touch') {
        this.hover = this.world(e)
        if (this.env.tool() === 'eraser') this.requestDraw()
      }
      return
    }
    if (g.id !== e.pointerId) return
    if (g.kind === 'draw') {
      if (g.dragAs !== 'free') {
        // A chosen shape (or tape): the two corners are where the drag began
        // and where it is now; the shape follows the pen.
        const now = this.world(e)
        g.shape = shapeFromDrag(
          g.dragAs === 'tape' ? 'rect' : g.dragAs,
          g.origin,
          now,
          penSettings.get().shapeSnap && g.dragAs !== 'tape',
        )
        g.world = [g.origin, now]
        this.requestDraw()
        return
      }
      if (g.shape) return // the shape is snapped: further movement is ignored
      const frame = this.layout.frame(g.frame.blockId)
      const events = e.getCoalescedEvents?.() ?? []
      for (const c of events.length > 0 ? events : [e])
        this.addPoint(g, c, frame)
      // Predicted points are drawn for the moment only, never saved.
      g.predicted = []
      for (const p of e.getPredictedEvents?.() ?? []) {
        const l = toLocal(this.world(p), frame)
        g.predicted.push({
          x: l.x,
          y: l.y,
          p: this.scaled(e),
          t: p.timeStamp - g.t0,
        })
      }
      const now = g.world[g.world.length - 1]
      if (now && dist(now, g.holdOrigin) > HOLD_SLOP) {
        g.holdOrigin = now
        this.armHold(g)
      }
      this.requestDraw()
    } else if (g.kind === 'erase') {
      const events = e.getCoalescedEvents?.() ?? []
      for (const c of events.length > 0 ? events : [e])
        this.eraseTo(this.world(c))
      this.requestDraw()
    }
  }

  private up(e: PointerEvent): void {
    if (e.pointerType === 'pen') this.penDown = false
    const g = this.gesture
    // Lasso and handle gestures end in lassoUp (the window listener).
    if (!g || g.id !== e.pointerId || g.kind === 'lasso') return
    if (g.kind === 'transform') return
    this.gesture = null
    if (g.kind === 'draw') {
      clearTimeout(g.holdTimer)
      if (!this.peelTape(g)) this.finishDraw(g, e.timeStamp - g.t0)
    } else if (g.kind === 'erase') {
      this.finishErase(g)
    }
    this.requestDraw()
    this.notify()
  }

  /** The ruler edge a stroke starting at `w` sticks to (freehand only). */
  private rulerEdgeAt(w: Pt, dragAs: DrawAs): Edge | null {
    const { on, ruler } = rulerTool.get()
    return on && ruler && dragAs === 'free' ? nearestEdge(w, ruler) : null
  }

  /** The top of the part of the page on screen, and the page's width (page px). */
  view(): { top: number; width: number } {
    const v = this.visible()
    return { top: v.top, width: v.width }
  }

  /**
   * Adds a stroke written somewhere else (the Magnifier's pad), already in
   * page px: it is kept like any stroke drawn with the pen, one Undo.
   */
  addWriting(
    points: readonly { x: number; y: number; p: number; t: number }[],
    /** Scales the pen width (writing made big lands small). */
    widthScale = 1,
  ): void {
    if (this.env.frozen() || points.length === 0) return
    const layer = this.layerForDrawing()
    if (!layer) return
    this.layout.measure()
    const blockId = pickAnchor(points[0], this.layout.blocks())
    const frame = this.layout.frame(blockId)
    const raw: RawPoint[] = points.map((q) => ({
      ...toLocal(q, frame),
      p: q.p,
      t: q.t,
    }))
    const stroke: Stroke = {
      ...makeStroke(
        'ink',
        scaledStyle(inkStyle(), widthScale),
        raw,
        this.layout.width,
      ),
      drawn: { w: this.layout.width, fs: this.env.textSize() },
    }
    const { id, edit } = this.ensureLayer(layer.id)
    edit.add.push({ layerId: id, blockId, stroke })
    this.commit(edit)
    this.requestDraw()
  }

  /**
   * A tap (not a drag) on tape peels it off to show what is under it; tap
   * again to stick it back. Peeled tapes are only remembered while the page
   * is open (nothing is saved or put in Undo). Returns true when it was one.
   */
  private peelTape(g: Extract<Gesture, { kind: 'draw' }>): boolean {
    if (g.highlight) return false
    const first = g.world[0]
    if (!first) return false
    for (const p of g.world) if (dist(p, first) > 6) return false
    const tape = this.tapeAt(first)
    if (!tape) return false
    const id = tape.stroke.id
    if (!this.peeled.delete(id)) this.peeled.add(id)
    this.requestDraw()
    return true
  }

  /** The tape under a point (topmost first), peeled or not. */
  private tapeAt(w: Pt): Placed | null {
    const all = this.selectable()
    for (let i = all.length - 1; i >= 0; i--) {
      const p = all[i]
      if (p.stroke.kind !== 'tape') continue
      const r = strokeRect(p.stroke, this.layout.frame(p.blockId))
      if (r && containsPt(r, w)) return p
    }
    return null
  }

  /** Counted for the Pencil lab: strokes kept or dropped on pointercancel. */
  readonly cancels = { kept: 0, dropped: 0 }

  /**
   * iPadOS cancels the pointer when it takes the touch over. A stroke with
   * enough points over enough time is real writing: keep it. Anything
   * shorter is a stray touch: drop it.
   */
  private cancel(e: PointerEvent): void {
    if (e.pointerType === 'pen') this.penDown = false
    const g = this.gesture
    if (!g || g.id !== e.pointerId) return
    if (g.kind === 'lasso' || g.kind === 'transform') return // lassoCancel
    if (g.kind === 'draw') {
      const last = g.pts[g.pts.length - 1]
      const lasted = last?.t ?? 0
      if (g.pts.length >= 3 && lasted >= 50) {
        this.cancels.kept++
        this.up(e)
        return
      }
      this.cancels.dropped++
    }
    this.cancelGesture()
  }

  private cancelGesture(): void {
    const g = this.gesture
    if (!g) return
    if (g.kind === 'draw') clearTimeout(g.holdTimer)
    if (g.kind === 'erase') this.finishErase(g)
    if (g.kind === 'transform') {
      this.hidden.clear()
    }
    this.gesture = null
    this.releaseEditing()
    this.requestDraw()
  }

  // ---- The page under a Lasso gesture ----

  private heldEditable: string | null = null

  /**
   * While a Lasso or handle gesture lasts, the page is not editable: iPadOS
   * Scribble then has nothing to write in or select (the cure penSelect uses
   * for a Pencil drag). Put back when the gesture ends.
   */
  private holdEditing(): void {
    const el = this.env.editorEl()
    if (!el || this.heldEditable !== null) return
    this.heldEditable = el.getAttribute('contenteditable') ?? ''
    el.setAttribute('contenteditable', 'false')
  }

  private releaseEditing(): void {
    const was = this.heldEditable
    if (was === null) return
    this.heldEditable = null
    const el = this.env.editorEl()
    if (!el) return
    if (was === '') el.removeAttribute('contenteditable')
    else el.setAttribute('contenteditable', was)
  }

  // ---- Taps are not ink ----

  /** The last tap-like stroke (for a double tap), and the mark it left. */
  private lastTap: (TapMark & { strokeId: string | null }) | null = null

  /** Counted for tests and the Pencil lab. */
  readonly taps = { dropped: 0, takenBack: 0 }

  /**
   * A stroke that is really a tap leaves no ink; the second tap of a double
   * tap also takes back the mark the first one left (tapSelect turns the
   * double tap into a word selection). Returns true when nothing is drawn.
   */
  private tapNotInk(
    g: Extract<Gesture, { kind: 'draw' }>,
    ms: number,
  ): boolean {
    const first = g.world[0]
    if (!first) return true
    const travel = travelOf(g.world)
    const now = { at: Date.now(), x: first.x, y: first.y }
    if (isShort(ms, travel) && isDoubleTap(this.lastTap, now)) {
      this.takeBackTap()
      this.lastTap = null
      this.taps.dropped++
      return true
    }
    if (isTap(ms, travel)) {
      this.lastTap = { ...now, strokeId: null }
      this.taps.dropped++
      return true
    }
    this.lastTap = isShort(ms, travel) ? { ...now, strokeId: '' } : null
    return false
  }

  /** The mark the first tap left is removed (no Undo step is made). */
  private takeBackTap(): void {
    const id = this.lastTap?.strokeId
    if (!id) return
    const top = this.env.history.peekUndo()
    if (!top || top.add.length !== 1 || top.add[0].stroke.id !== id) return
    if (top.del.length > 0 || top.layers.length > 0) return
    this.env.history.dropTop()
    this.env.doc.revert(top)
    this.taps.takenBack++
    this.notify()
  }

  // ---- Finishing a stroke ----

  /** Commits an edit: applies it, remembers it for Undo. */
  commit(edit: Edit, alreadyApplied = false): void {
    if (isEmptyEdit(edit)) return
    if (!alreadyApplied) this.env.doc.apply(edit)
    this.env.history.push(edit, this.env.textDepth())
    this.notify()
  }

  private ensureLayer(layerId: string): { id: string; edit: Edit } {
    const { doc } = this.env
    const edit = emptyEdit()
    if (layerId && doc.layer(layerId)) return { id: layerId, edit }
    const made = newLayer(
      doc.pageId,
      doc.layers,
      this.env.layerName(doc.layers.length + 1),
    )
    edit.layers.push({ after: made })
    return { id: made.id, edit }
  }

  private finishDraw(
    g: Extract<Gesture, { kind: 'draw' }>,
    /** How long the pen was down (ms). */
    ms: number,
  ): void {
    const world = g.world
    const pen = penSettings.get()
    const hl = highlighterSettings.get()
    if (g.pts.length === 0) return
    // A shape or tape needs a real drag; a tap leaves nothing.
    if (g.dragAs !== 'free' && !g.shape) return
    if (this.tapNotInk(g, ms)) return

    if (g.highlight) {
      if (hl.snapToText && this.snapHighlight(g, hl)) return
    } else if (!g.shape) {
      if (pen.scribbleErase && isScribble(world) && this.scribbleErase(world))
        return
      if (pen.circleLasso && isLoop(world) && this.circleSelect(world)) return
    }

    const stroke = this.liveStroke({ ...g, predicted: [] })
    if (!stroke) return
    const finished: Stroke = {
      ...stroke,
      drawn: { w: this.layout.width, fs: this.env.textSize() },
    }
    const { id, edit } = this.ensureLayer(g.layerId)
    edit.add.push({ layerId: id, blockId: g.frame.blockId, stroke: finished })
    this.commit(edit)
    if (this.lastTap?.strokeId === '') this.lastTap.strokeId = finished.id
  }

  /** The highlighter over words: marks the words instead of drawing. */
  private snapHighlight(
    g: Extract<Gesture, { kind: 'draw' }>,
    h: ReturnType<typeof highlighterSettings.get>,
  ): boolean {
    const root = this.env.editorEl()
    if (!root) return false
    const box = this.env.wrap.getBoundingClientRect()
    const width = (h.size === 0 ? 10 : h.size === 1 ? 16 : 26) / 2
    const runs = textRunsUnder(root, box, g.world, width)
    if (runs.length === 0) return false
    const done = highlightRuns(
      this.env.editor,
      runs,
      nearestHighlightName(h.colour),
    )
    if (done && h.saveToNotes) this.env.saveToNotes(runsText(runs))
    return done
  }

  private scribbleErase(world: Pt[]): boolean {
    const edit = emptyEdit()
    for (const p of this.selectable()) {
      const frame = this.layout.frame(p.blockId)
      const path = world.map((q) => toLocal(q, frame))
      if (touches(p.stroke, path, 10 / frame.w)) edit.del.push(p)
    }
    if (edit.del.length === 0) return false
    this.commit(edit)
    return true
  }

  private circleSelect(world: Pt[]): boolean {
    const inside = this.selectable().filter((p) => {
      const pts = this.worldPoints(p)
      const mid = pts[Math.floor(pts.length / 2)]
      return mid && insideLoop(mid, world)
    })
    if (inside.length === 0) return false
    this.env.setTool('lasso')
    this.select(inside.map((p) => p.stroke.id))
    return true
  }

  // ---- Eraser ----

  private eraseTo(w: Pt): void {
    const g = this.gesture
    if (g?.kind !== 'erase') return
    const radius = ERASER_SIZES[eraserSettings.get().size] / 2
    const from = g.last ?? w
    g.last = w
    g.path.push(w)
    const settings = eraserSettings.get()
    const hit = boundsOf([from, w])
    const area = inflate(hit, radius + 4)
    // The eraser only touches the active layer.
    // Highlights on the words go as the Pencil rubs them (put back at the end).
    if (settings.highlightsOnly) {
      const root = this.env.editorEl()
      if (root) {
        const box = this.env.wrap.getBoundingClientRect()
        g.live.push(
          ...eraseHighlightsLive(
            this.env.editor,
            textRunsUnder(root, box, [from, w], radius, true),
          ),
        )
      }
    }
    const active = eraserLayer(this.env.doc.layers, this.env.doc.chosenLayer)
    for (const p of this.selectable()) {
      if (active && p.layerId !== active.id) continue
      if (settings.highlightsOnly && p.stroke.kind !== 'highlight') continue
      const frame = this.layout.frame(p.blockId)
      const r = strokeRect(p.stroke, frame)
      if (!r || !intersects(r, area)) continue
      const path = [toLocal(from, frame), toLocal(w, frame)]
      const out = eraseStroke(p.stroke, path, radius / frame.w, settings.mode)
      if (out.length === 1 && out[0] === p.stroke) continue
      const pieces: Placed[] = out.map((stroke) => ({ ...p, stroke }))
      this.env.doc.apply({ del: [p], add: pieces, layers: [] })
      if (g.add.has(p.stroke.id)) g.add.delete(p.stroke.id)
      else g.del.set(p.stroke.id, p)
      for (const piece of pieces) g.add.set(piece.stroke.id, piece)
    }
  }

  private finishErase(g: Extract<Gesture, { kind: 'erase' }>): void {
    restoreHighlights(this.env.editor, g.live)
    const edit: Edit = {
      del: [...g.del.values()],
      add: [...g.add.values()],
      layers: [],
    }
    this.commit(edit, true)
    if (eraserSettings.get().highlightsOnly && g.path.length > 0) {
      const root = this.env.editorEl()
      if (root) {
        const box = this.env.wrap.getBoundingClientRect()
        const radius = ERASER_SIZES[eraserSettings.get().size] / 2
        clearHighlightRuns(
          this.env.editor,
          textRunsUnder(root, box, g.path, radius, true),
        )
      }
    }
  }

  // ---- Lasso ----

  /** Strokes that tools may change: in a layer that is shown and not locked. */
  selectable(): Placed[] {
    return liveLayers(this.env.doc.layers)
      .filter((l) => !l.hidden && !l.locked)
      .flatMap((l) => this.env.doc.strokesOf(l.id))
  }

  worldPoints(p: Placed): Pt[] {
    const frame = this.layout.frame(p.blockId)
    return xy(p.stroke).map((q) => toWorld(q, frame))
  }

  /** The stroke under a point (topmost first), if any. */
  hitStroke(w: Pt, slop = 8): Placed | null {
    const all = this.selectable()
    for (let i = all.length - 1; i >= 0; i--) {
      const p = all[i]
      const frame = this.layout.frame(p.blockId)
      const r = strokeRect(p.stroke, frame)
      if (!r || !intersects(inflate(r, slop), { x: w.x, y: w.y, w: 0, h: 0 }))
        continue
      const pts = this.worldPoints(p)
      const reach = Math.max(
        slop,
        ((p.stroke.style.width / p.stroke.bw) * frame.w) / 2 + 2,
      )
      if (pts.length === 1 ? dist(pts[0], w) <= reach : segHit(pts, w, reach))
        return p
    }
    return null
  }

  private lassoActive(e: PointerEvent): boolean {
    return (
      this.env.tool() === 'lasso' &&
      !this.env.frozen() &&
      lassoSettings.get().ink &&
      this.env.doc.strokeCount > 0 &&
      (e.pointerType === 'pen' ||
        e.pointerType === 'mouse' ||
        this.fingerCanDraw())
    )
  }

  private lassoDown(e: PointerEvent): void {
    if (this.gesture) return
    if (e.pointerType === 'pen') penSeenEver = true
    const target = e.target as HTMLElement | null
    if (target?.closest('[data-ink-handles]')) return
    if (!this.lassoActive(e)) return
    this.layout.measure()
    const w = this.world(e)
    if (this.lassoOwnsPad()) {
      // The pad took the touch: the page under it must not react at all.
      e.preventDefault()
      this.holdEditing()
      try {
        this.pad.setPointerCapture(e.pointerId)
      } catch {
        // A pointer the browser does not know (a test): events still arrive.
      }
    }
    const hit = this.hitStroke(w)
    if (hit && !this.selection.includes(hit.stroke.id)) {
      // Taking over: the page must not select text for this touch.
      e.preventDefault()
      e.stopPropagation()
      this.gesture = {
        kind: 'lasso',
        id: e.pointerId,
        path: [w],
        owns: true,
        hitId: hit.stroke.id,
        start: w,
      }
      return
    }
    const box = this.selectionRect()
    // A mixed selection cannot be moved here (the menu says so).
    if (box && this.blockSel.length === 0 && containsPt(inflate(box, 8), w)) {
      e.preventDefault()
      e.stopPropagation()
      this.startTransform('move', e)
      return
    }
    this.gesture = {
      kind: 'lasso',
      id: e.pointerId,
      path: [w],
      owns: false,
      hitId: null,
      start: w,
    }
  }

  private lassoMove(e: PointerEvent): void {
    const g = this.gesture
    if (!g || g.id !== e.pointerId) return
    if (g.kind === 'lasso') {
      // A press-and-hold on words became a text selection (holdSelect): the
      // loop gives way to it.
      if (selectGesture.active) {
        this.cancelGesture()
        return
      }
      g.path.push(this.world(e))
      this.requestDraw()
    } else if (g.kind === 'transform') {
      this.transformTo(g, this.world(e))
    }
  }

  private lassoUp(e: PointerEvent): void {
    const g = this.gesture
    if (!g || g.id !== e.pointerId) return
    if (g.kind === 'lasso') {
      this.gesture = null
      this.releaseEditing()
      const end = this.world(e)
      const moved = dist(g.start, end) > 6
      if (g.hitId && !moved) {
        this.select([g.hitId])
      } else if (moved || !g.owns) {
        const found = this.inRegion(g.path)
        if (found.length > 0) {
          this.select(found.map((p) => p.stroke.id))
          // Universal Lasso: text and pictures inside the same loop join in.
          this.blockSel = this.blocksIn(g.path)
          this.notify()
        } else if (!g.owns) this.clearSelection() // a tap or loop on empty paper
      }
      this.requestDraw()
    } else if (g.kind === 'transform') {
      this.finishTransform(g)
    }
  }

  private lassoCancel(e: PointerEvent): void {
    const g = this.gesture
    if (
      g &&
      g.id === e.pointerId &&
      (g.kind === 'lasso' || g.kind === 'transform')
    ) {
      this.cancelGesture()
    }
  }

  /** The loop (or rectangle) the Lasso drew, as a polygon. */
  private polygonOf(path: Pt[]): Pt[] {
    if (lassoSettings.get().shape !== 'rect') return path
    const b = boundsOf([path[0], path[path.length - 1]])
    return [
      { x: b.x, y: b.y },
      { x: b.x + b.w, y: b.y },
      { x: b.x + b.w, y: b.y + b.h },
      { x: b.x, y: b.y + b.h },
    ]
  }

  /** Page blocks whose centre is inside the loop (only blocks near its box are tested). */
  blocksIn(path: Pt[]): string[] {
    if (path.length < 3) return []
    const poly = this.polygonOf(path)
    const area = boundsOf(poly)
    return this.layout
      .blocks()
      .filter(
        (b) =>
          intersects(b, area) &&
          inPolygon({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, poly),
      )
      .map((b) => b.id)
  }

  private inRegion(path: Pt[]): Placed[] {
    if (path.length < 3) return []
    const poly = this.polygonOf(path)
    const area = boundsOf(poly)
    return this.selectable().filter((p) => {
      const r = strokeRect(p.stroke, this.layout.frame(p.blockId))
      if (!r || !intersects(r, area)) return false
      const pts = this.worldPoints(p)
      const inside = pts.filter((q) => inPolygon(q, poly)).length
      return inside / pts.length >= 0.5
    })
  }

  // ---- Selection ----

  select(ids: string[]): void {
    this.selection = ids.filter((id) => this.env.doc.find(id))
    this.blockSel = []
    this.notify()
    this.requestDraw()
  }

  clearSelection(): void {
    if (this.selection.length === 0) return
    this.selection = []
    this.blockSel = []
    this.notify()
    this.requestDraw()
  }

  selected(): Placed[] {
    return this.selection
      .map((id) => this.env.doc.find(id))
      .filter((p): p is Placed => !!p)
  }

  selectionCount(): number {
    return this.selected().length
  }

  strokeTotal(): number {
    return this.env.doc.strokeCount
  }

  /** The page element the ink sits on (for pictures of the whole page, J1). */
  pageElement(): HTMLElement {
    return this.env.wrap
  }

  /** The selection's box in page px (null when nothing is selected). */
  selectionRect(): Rect | null {
    let box: Rect | null = null
    for (const p of this.selected()) {
      const r = strokeRect(p.stroke, this.layout.frame(p.blockId))
      if (r) box = box ? unionRect(box, r) : r
    }
    if (box) {
      for (const id of this.blockSel) {
        const r = this.layout.rectOf(id)
        if (r) box = unionRect(box, r)
      }
    }
    return box
  }

  /** Steps the selection through the strokes (keyboard). */
  step(direction: 1 | -1): string | null {
    const all = this.selectable()
    if (all.length === 0) return null
    const at = all.findIndex((p) => p.stroke.id === this.selection[0])
    const next = all[(at + direction + all.length) % all.length]
    this.select([next.stroke.id])
    return `${all.indexOf(next) + 1}/${all.length}`
  }

  private key(e: KeyboardEvent): void {
    const mod = e.ctrlKey || e.metaKey
    const inText = !!(e.target as HTMLElement | null)?.closest?.(
      '[contenteditable="true"], input, textarea, select, [role="dialog"]',
    )
    if (
      mod &&
      !e.altKey &&
      (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')
    ) {
      const redo = e.key.toLowerCase() === 'y' || e.shiftKey
      const used = redo ? this.redo() : this.undo()
      if (used) {
        e.preventDefault()
        e.stopPropagation()
      }
      return
    }
    if (inText || this.env.frozen()) return
    if (
      this.selection.length > 0 &&
      (e.key === 'Delete' || e.key === 'Backspace')
    ) {
      e.preventDefault()
      this.deleteSelection()
    } else if (this.selection.length > 0 && e.key === 'Escape') {
      this.clearSelection()
    }
  }

  deleteSelection(): void {
    const del = this.selected()
    this.selection = []
    this.blockSel = []
    this.commit({ del, add: [], layers: [] })
  }

  /**
   * Delete the drawings and run `removeText` (which removes the blocks) as one
   * Undo step: the ink edit is marked so Undo takes the text step with it.
   */
  deleteMixed(removeText: () => void): void {
    const del = this.selected()
    this.selection = []
    this.blockSel = []
    this.commit({ del, add: [], layers: [] })
    removeText()
    this.env.history.chainTop()
    this.notify()
  }

  duplicateSelection(): void {
    const items = this.selected()
    const now = Date.now()
    const add = items.map((p, i) => {
      const frame = this.layout.frame(p.blockId)
      const stroke: Stroke = {
        ...p.stroke,
        id: createId(),
        at: now + i,
        pts: mapXY(p.stroke.pts, (q) => ({
          x: q.x + 16 / frame.w,
          y: q.y + 16 / frame.w,
        })),
      }
      return { ...p, stroke }
    })
    this.commit({ del: [], add, layers: [] })
    this.select(add.map((p) => p.stroke.id))
  }

  colourSelection(hex: string): void {
    const items = this.selected()
    const add = items.map((p) => ({
      ...p,
      stroke: {
        ...p.stroke,
        id: createId(),
        style: { ...p.stroke.style, colour: hex },
      },
    }))
    this.commit({ del: items, add, layers: [] })
    this.select(add.map((p) => p.stroke.id))
  }

  /** The label the selected drawings share ('' when none or they differ). */
  selectionLabel(): string {
    const labels = new Set(this.selected().map((p) => p.stroke.label ?? ''))
    return labels.size === 1 ? [...labels][0] : ''
  }

  /** Names the selected drawings (empty text takes the name away). One Undo. */
  labelSelection(text: string): void {
    const items = this.selected()
    if (items.length === 0) return
    const label = text.trim().slice(0, MAX_LABEL)
    const add = items.map((p) => {
      const { label: _old, ...rest } = p.stroke
      void _old
      return {
        ...p,
        stroke: { ...rest, id: createId(), ...(label && { label }) },
      }
    })
    this.commit({ del: items, add, layers: [] })
    this.select(add.map((p) => p.stroke.id))
  }

  // ---- Move, scale, rotate ----

  /** Starts a transform from a handle (or the body) of the selection. */
  startTransform(
    how: 'move' | 'scale' | 'rotate',
    e: PointerEvent,
    corner?: Pt,
  ): void {
    const box = this.selectionRect()
    if (!box || this.gesture) return
    this.holdEditing()
    const centre = { x: box.x + box.w / 2, y: box.y + box.h / 2 }
    const start = this.world(e)
    // Scale about the corner opposite the one grabbed (centre if unknown).
    const fixed = corner
      ? {
          x: box.x + (corner.x > centre.x ? 0 : box.w),
          y: box.y + (corner.y > centre.y ? 0 : box.h),
        }
      : centre
    this.gesture = {
      kind: 'transform',
      id: e.pointerId,
      how,
      start,
      centre,
      fixed,
      m: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      factor: 1,
      before: this.selected(),
    }
    this.hidden = new Set(this.selection)
    this.requestDraw()
  }

  private transformTo(g: Extract<Gesture, { kind: 'transform' }>, w: Pt): void {
    if (g.how === 'move') {
      g.m = { a: 1, b: 0, c: 0, d: 1, e: w.x - g.start.x, f: w.y - g.start.y }
      g.factor = 1
    } else if (g.how === 'scale') {
      const base = dist(g.start, g.fixed) || 1
      const s = Math.max(0.1, Math.min(10, dist(w, g.fixed) / base))
      g.m = around(g.fixed, s, 0)
      g.factor = s
    } else {
      const a0 = Math.atan2(g.start.y - g.centre.y, g.start.x - g.centre.x)
      const a1 = Math.atan2(w.y - g.centre.y, w.x - g.centre.x)
      g.m = around(g.centre, 1, a1 - a0)
      g.factor = 1
    }
    this.requestDraw()
  }

  private finishTransform(g: Extract<Gesture, { kind: 'transform' }>): void {
    this.gesture = null
    this.hidden = new Set()
    this.releaseEditing()
    // A tap on the selection or a handle that did not move changes nothing.
    const { a, b, c, d, e, f } = g.m
    if (a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0) {
      this.requestDraw()
      return
    }
    const add = g.before.map((p) => this.transformed(p, g.m, g.factor))
    this.commit({ del: g.before, add, layers: [] })
    this.select(add.map((p) => p.stroke.id))
  }

  /** A stroke after a page-px transform, anchored to the block it now lies over. */
  private transformed(p: Placed, m: Affine, factor: number): Placed {
    const frame = this.layout.frame(p.blockId)
    const moved = xy(p.stroke).map((q) => apply(m, toWorld(q, frame)))
    const mid = moved[Math.floor(moved.length / 2)] ?? { x: 0, y: 0 }
    const blockId = pickAnchor(mid, this.layout.blocks())
    const next = this.layout.frame(blockId)
    const pts = p.stroke.pts.slice()
    moved.forEach((q, i) => {
      const l = toLocal(q, next)
      pts[i * STRIDE] = Math.round(l.x * 10000) / 10000
      pts[i * STRIDE + 1] = Math.round(l.y * 10000) / 10000
    })
    const wNow = this.layout.width
    const stroke: Stroke = {
      ...p.stroke,
      id: createId(),
      pts,
      bw: wNow,
      style: {
        ...p.stroke.style,
        width: p.stroke.style.width * (wNow / p.stroke.bw) * factor,
      },
    }
    return { layerId: p.layerId, blockId, stroke }
  }

  // ---- Undo and Redo (one history with the text) ----

  undo(): boolean {
    const { history, doc } = this.env
    if (history.undoTarget(this.env.textDepth()) !== 'ink') return false
    const edit = history.takeUndo()
    if (!edit) return false
    doc.revert(edit)
    this.dropMissingSelection()
    this.notify()
    return true
  }

  /** Hidden layers that have drawings (the chip at the page's top right). */
  hiddenLayersWithInk(): InkLayer[] {
    const { doc } = this.env
    return liveLayers(doc.layers).filter(
      (l) => l.hidden && doc.strokesOf(l.id).length > 0,
    )
  }

  showLayer(layer: InkLayer): void {
    this.env.doc.patchLayer(setHidden(layer, false))
    this.notify()
  }

  /** Is the newest step a drawings-and-text delete (one Undo for both)? */
  undoIsChained(): boolean {
    return this.env.history.undoIsChained(this.env.textDepth())
  }

  redoIsChained(): boolean {
    return this.env.history.redoIsChained()
  }

  redo(): boolean {
    const { history, doc } = this.env
    if (history.redoTarget(this.env.textDepth()) !== 'ink') return false
    const edit = history.takeRedo()
    if (!edit) return false
    doc.apply(edit)
    this.dropMissingSelection()
    this.notify()
    return true
  }

  private dropMissingSelection(): void {
    this.selection = this.selection.filter((id) => this.env.doc.find(id))
    if (this.selection.length === 0) this.blockSel = []
  }

  /** Called when the text changed: ink Redo steps no longer fit after new typing. */
  noteTextChange(): void {
    const depth = this.env.textDepth()
    if (depth > this.lastDepth) this.env.history.forgetRedo()
    this.lastDepth = depth
  }
}

function segHit(pts: Pt[], w: Pt, reach: number): boolean {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t =
      len2 === 0
        ? 0
        : Math.max(0, Math.min(1, ((w.x - a.x) * dx + (w.y - a.y) * dy) / len2))
    if (Math.hypot(w.x - (a.x + t * dx), w.y - (a.y + t * dy)) <= reach)
      return true
  }
  return false
}

/** The nearest ancestor that scrolls up and down (else the window). */
function scrollParent(el: HTMLElement): HTMLElement | Window {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if (o === 'auto' || o === 'scroll' || o === 'overlay') return p
  }
  return window
}
