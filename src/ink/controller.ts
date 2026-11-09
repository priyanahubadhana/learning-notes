import { clampDpr } from '../app/canvasBudget'
import {
  onGestureReset,
  registerToolState,
  type ResetReason,
} from '../app/gestureReset'
import { gripDragging } from '../app/tools/gripDrag'
import { inkSwitches } from './inkRuntime'
import {
  adopterAt,
  dropOnPaper,
  registerAdopter,
  type Carried,
  type CarriedLines,
} from './inkTransfer'
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
import {
  drawingAnchor,
  nextBlockAt,
  pickAnchor,
  reanchorPts,
  toLocal,
  toWorld,
  type Frame,
} from './anchor'
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
import { PageLayout, type BookSurface } from './layout'
import { nearestEdge, projectOnEdge, type Edge } from './ruler'
import { rulerTool } from './toolState'
import { InkRenderer, paintStroke, strokeRect, TILE_H } from './render'
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
import { mostlyInside } from './lassoMenu'
import {
  DEG,
  isDoubleTap,
  isShort,
  isTap,
  snapTurn,
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
  /** Polish 2 item 4: after one erase, back to the tool used before. */
  returnTool?: () => void
  textSize: () => number
  /**
   * The Lasso's T or Pictures filter found blocks but no ink: select them in
   * the text editor (the usual text menu follows). Ids in page order.
   */
  selectBlocks: (ids: string[]) => void
  /** The kind of a page block: words, or a picture. */
  blockKind: (id: string) => 'text' | 'picture'
  /** The words or picture of a block (page px), not its full-width box. */
  blockBox: (id: string) => Rect | null
  /**
   * The T filter around part of a paragraph (R6-17): the words whose centre
   * is inside the region, as one text range in reading order, the ids of the
   * blocks they sit in and which of those are taken in whole. `inside` and
   * `box` are in client px.
   */
  wordsIn: (
    inside: (x: number, y: number) => boolean,
    box: Rect,
  ) => { from: number; to: number; blocks: string[]; full: string[] } | null
  /** Selects a text range in the editor (the usual text menu follows). */
  selectText: (from: number, to: number) => void
  /** A finger tap or mouse click under the Lasso: the caret lands there. */
  placeCaret: (clientX: number, clientY: number) => void
  /**
   * Phase Q: false for a small box on the paper: the page is not made a
   * screen tall while drawing (the box keeps the height of its text).
   */
  growRoom?: boolean
  /**
   * Phase Q rule 6: moves these lines (page order) before or after
   * `target`, as one text step. False when it could not.
   */
  moveBlocks?: (
    ids: string[],
    target: string,
    place: 'before' | 'after',
  ) => boolean
  /**
   * Phase Q rule 6 across boxes: copies of these lines without ids, and the
   * insert of such copies next to a line here (the new ids, else null); the
   * lines leave their old box with `removeLines` once the new box has them.
   */
  copyLines?: (ids: string[]) => unknown[] | null
  insertLines?: (
    blocks: unknown[],
    target: string,
    place: 'before' | 'after',
  ) => string[] | null
  removeLines?: (ids: string[]) => boolean
  /**
   * C2b: set when the ink is over a book (PDF pages, EPUB paragraphs): the
   * blocks come from the reader, there is no text editor, and a block that is
   * not on screen keeps its ink (it is not "deleted").
   */
  book?: BookSurface
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
      /** A rectangle Lasso (chosen when the touch began): start to now. */
      rect: boolean
      now: Pt
    }
  | {
      kind: 'transform'
      id: number
      how: 'move' | 'scale' | 'rotate'
      /** Edge handles scale along one axis; corners keep the shape. */
      axis: 'x' | 'y' | 'both'
      start: Pt
      centre: Pt
      fixed: Pt
      m: Affine
      factor: number
      before: Placed[]
      /** A second finger on the selection: the pair twists and moves it. */
      second: { id: number; start: Pt; now: Pt; firstNow: Pt } | null
    }

const HOLD_MS = 600
/** Phase Q rule 10: strokes this close in time can be one drawing (ms). */
const DRAWING_MS = 20_000
/** A drawing over this many lines or more belongs to its top line. */
const DRAWING_LINES = 3
const HOLD_SLOP = 3
/** A stroke is selected when this share of its points lies inside the loop. */
export const LASSO_INSIDE = 0.6

/** The four corners of the box between two points (the rectangle Lasso). */
function rectPolygon(a: Pt, b: Pt): Pt[] {
  const r = boundsOf([a, b])
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ]
}
/** Turning the selection clicks to quarter turns when within 5 degrees. */
const TURN_SNAP = 5 * DEG
const MIN_MOVE = 0.3
const DEFAULT_PRESSURE = 0.4
/** Scrolling this far (px) chooses the ink tiles near the screen again. */
const SCROLL_STEP = 160

let penSeenEver = false

export class InkController {
  readonly layout: PageLayout
  readonly renderer: InkRenderer
  readonly pad: HTMLDivElement
  readonly overlay: HTMLDivElement
  /**
   * A zero-size, positioned box at the end of the editor's container. It is
   * the overlay's containing block, so the overlay lives inside the page's
   * scroller and the browser scrolls it with the text (no script on scroll).
   */
  private readonly anchor: HTMLDivElement
  selection: string[] = []
  /** Page blocks inside the same Lasso loop as the drawings (a mixed selection). */
  blockSel: string[] = []
  private env: InkEnv
  private gesture: Gesture | null = null
  private raf = 0
  private layoutDirty = true
  private hidden = new Set<string>()
  private listeners = new Set<() => void>()
  private cleanups: (() => void)[] = []
  private pressureMax = 0
  private penDown = false
  private lastPenAt = -1e9
  /** Pointers the pad holds captured now (the browser says when one goes). */
  private captured = new Set<number>()
  private scroller: HTMLElement | Window = window
  /** The overlay's position or the page's zoom may have changed. */
  private placeDirty = true
  private placed = ''
  /** Something moves on the live canvas now (it follows the screen). */
  private liveOn = false
  private liveWas = false
  /** The scroll position the tiles were last chosen for. */
  private drawnScroll = -1e9
  private scrollNow = 0
  private lastScrollAt = 0
  private settleTimer = 0
  /** The next draw reads the page's geometry again. */
  private fresh = true
  private geom: {
    contentTop: number
    viewH: number
    width: number
    pageHeight: number
  } | null = null
  private hover: Pt | null = null
  /** Tapes peeled off for now (ids; never saved). */
  private peeled = new Set<string>()
  /** Raised when the selection or what the overlay shows changed. */
  version = 0
  private lastDepth = 0
  /** Lines seen on screen while this page is open (Phase Q rule 7). */
  private seenBlocks = new Set<string>()
  private noted = -1

  constructor(env: InkEnv) {
    this.env = env
    this.layout = new PageLayout(
      env.wrap,
      (id) => env.doc.fallbackOf(id),
      env.book,
    )
    this.layout.mediaRef = (id) => env.doc.fallbackOf(id)?.mw
    this.renderer = new InkRenderer(penSettings.get().lowLatency)
    this.anchor = document.createElement('div')
    this.anchor.setAttribute('data-ink-anchor', '')
    Object.assign(this.anchor.style, {
      position: 'relative',
      width: '0',
      height: '0',
      pointerEvents: 'none',
    })
    this.overlay = document.createElement('div')
    this.overlay.setAttribute('data-ink-overlay', '')
    Object.assign(this.overlay.style, {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: '5',
      // Nothing on the overlay may be selected or get a long-press callout
      // (research brief, web constraints).
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
    })
    this.pad = document.createElement('div')
    this.pad.setAttribute('data-ink-pad', '')
    // Drawing must not close an open options pill (the page would jump).
    this.pad.setAttribute('data-popup-trigger', '')
    Object.assign(this.pad.style, { position: 'absolute', inset: '0' })
    this.overlay.append(this.renderer.root, this.pad)
    this.anchor.append(this.overlay)
  }

  // ---- Setup ----

  mount(): void {
    const { wrap, doc } = this.env
    wrap.append(this.anchor)
    this.placeOverlay()
    this.scroller = scrollParent(wrap)
    const on = (
      el: EventTarget,
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
    on(this.pad, 'gotpointercapture', (e: PointerEvent) => {
      this.captured.add(e.pointerId)
    })
    // The browser took the capture away (the app went to the background,
    // the system took the touch): a gesture still waiting for that pointer
    // would otherwise block every stroke after it (R7-3, R7-5).
    on(this.pad, 'lostpointercapture', (e: PointerEvent) =>
      this.guard(() => this.pointerLost(e)),
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
    if (this.env.book?.watch) {
      this.cleanups.push(this.env.book.watch(() => this.dirty()))
    }
    // The ink scrolls with the page by itself. The tiles near the screen are
    // chosen again only after a good step of scrolling (or while something
    // live follows the screen).
    on(this.scroller, 'scroll', () => this.onScroll(), { passive: true })
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
    const mo = new MutationObserver((records) => {
      // The ink's own canvases and menus changing is not the page changing.
      if (records.every((r) => this.overlay.contains(r.target))) return
      this.dirty()
    })
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
    // The watchdog: the app went away or came back (a lost pointerup, a
    // bfcache wake, the Update reload in another window). Everything that
    // was half-way is forgotten and the pad is armed again.
    this.cleanups.push(onGestureReset((reason) => this.resetGestures(reason)))
    this.cleanups.push(registerToolState('ink', () => this.debugState()))
    this.cleanups.push(
      registerAdopter({
        wrap,
        adopt: (items, lines) => this.adoptCarried(items, lines),
        copyLines: (ids, text, cut) => this.copyLines(ids, text, cut),
        wholeLines: () => this.wholeLinesSelected(),
        pasteLines: (text, run) => this.pasteLines(text, run),
      }),
    )
    // Rule 9: the editor's own copy, cut and paste carry the lines' ink.
    const clip = (e: ClipboardEvent) =>
      this.guard(() => {
        if (e.type === 'paste') {
          this.pasteLines(e.clipboardData?.getData('text/plain') ?? null)
          return
        }
        if (this.selection.length > 0) return
        const ids = this.wholeLinesSelected()
        if (ids.length > 0)
          this.copyLines(
            ids,
            window.getSelection()?.toString() ?? '',
            e.type === 'cut',
          )
        else InkController.lineClip = null
      })
    on(wrap, 'copy', clip, true)
    on(wrap, 'cut', clip, true)
    on(wrap, 'paste', clip, true)
    this.syncPad()
    this.dirty()
  }

  /**
   * Forgets every transient gesture state and arms the pad again: a
   * half-finished stroke, erase, lasso or handle drag (its pointerup never
   * came), the pen-down flag, the taps remembered for a double tap, the
   * finger tap waiting to place the caret, the page's "not editable during
   * a gesture" hold, and any pointer capture the pad still has. Safe to run
   * at any time: nothing is saved or changed, an erase in progress is kept.
   */
  resetGestures(reason: ResetReason = 'manual'): void {
    void reason
    const g = this.gesture
    if (g?.kind === 'draw') {
      // Real writing is kept, a stray touch is dropped (as a pointercancel).
      const last = g.pts[g.pts.length - 1]
      if (g.pts.length >= 3 && (last?.t ?? 0) >= 50) {
        this.cancels.kept++
        this.gesture = null
        clearTimeout(g.holdTimer)
        if (!this.peelTape(g)) this.finishDraw(g, last?.t ?? 0)
      } else {
        this.cancels.dropped++
      }
    }
    this.cancelGesture()
    this.penDown = false
    this.lastTap = null
    this.fingerTap = null
    this.hover = null
    this.hidden.clear()
    this.releaseEditing()
    for (const id of [...this.captured]) {
      try {
        this.pad.releasePointerCapture(id)
      } catch {
        // Already gone.
      }
    }
    this.captured.clear()
    this.syncPad()
    this.dirty()
    this.notify()
  }

  /** The pad lost a pointer it was tracking: the gesture cannot go on. */
  private pointerLost(e: PointerEvent): void {
    this.captured.delete(e.pointerId)
    const g = this.gesture
    if (!g || g.id !== e.pointerId) return
    if (g.kind === 'draw' || g.kind === 'erase') this.cancel(e)
    else this.cancelGesture()
  }

  /** What the engine believes right now (Settings › Advanced › Copy tool state). */
  debugState(): Record<string, unknown> {
    const g = this.gesture
    return {
      tool: this.env.tool(),
      frozen: this.env.frozen(),
      deviceMode: this.env.deviceMode(),
      gesture: g ? `${g.kind}#${g.id}` : 'none',
      penDown: this.penDown,
      penAgoMs: Math.round(performance.now() - this.lastPenAt),
      captured: [...this.captured],
      padPointerEvents: this.pad.style.pointerEvents,
      padTouchAction: this.pad.style.touchAction,
      padInDom: this.pad.isConnected,
      lassoOwnsPad: this.lassoOwnsPad(),
      heldEditable: this.heldEditable,
      editorEditable: this.env.editorEl()?.getAttribute('contenteditable'),
      editorInert: this.env.editorEl()?.hasAttribute('inert') ?? null,
      selection: this.selection.length,
      blockSel: this.blockSel.length,
      hidden: this.hidden.size,
      strokes: this.strokeTotal(),
      layers: this.env.doc.layers.length,
      chosenLayer: this.env.doc.chosenLayer,
      lastTap: this.lastTap ? Date.now() - this.lastTap.at : null,
      fingerTap: this.fingerTap?.id ?? null,
      taps: { ...this.taps },
      cancels: { ...this.cancels },
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.settleTimer)
    for (const c of this.cleanups) c()
    this.cleanups = []
    this.anchor.remove()
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
    this.placeDirty = true
    this.requestDraw()
  }

  /** The blocks may have moved (a book scrolled or reflowed): measure again. */
  refresh(): void {
    this.dirty()
  }

  /**
   * Does the Lasso own the pointer? Yes while its Ink filter is on and the
   * page has ink: the pad then catches the Pencil like the Pen's pad does, so
   * nothing under the ink reacts (no text drag-selection, no Scribble, no
   * scroll). Words join only as whole blocks inside the loop. With no ink on
   * the page the Lasso keeps watching, and a Pencil drag still selects text.
   */
  lassoOwnsPad(): boolean {
    // Owner design (7 Nov): under the Lasso the page under the ink never
    // reacts; the loop picks what its filters say (ink, pictures, text).
    return this.env.tool() === 'lasso'
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
    // A finger scrolls unless it may draw (under the Lasso: only "Always").
    const fingerOwns =
      tool === 'lasso' ? this.fingerLassos() : this.fingerCanDraw()
    this.pad.style.touchAction = fingerOwns ? 'none' : 'pan-x pan-y pinch-zoom'
    this.requestDraw()
  }

  fingerCanDraw(): boolean {
    const mode = penSettings.get().finger
    if (mode === 'on') return true
    if (mode === 'off') return false
    return this.env.deviceMode() !== 'pencil' && !penSeenEver
  }

  // ---- Drawing the page ----

  requestDraw(fresh = true): void {
    // A scroll-only draw may use the geometry read last time (no layout read
    // while the page scrolls); anything else reads it again.
    if (fresh) this.fresh = true
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
    if (this.env.growRoom === false) return
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

  private visible(): {
    top: number
    height: number
    width: number
    pageHeight: number
  } {
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
    // Where the page starts inside the scroller's content, and how tall the
    // scroller's window is: they do not change when only the scroll moves.
    this.geom = {
      contentTop: wb.top - vTop + this.scrollPos(),
      viewH: vBottom - vTop,
      width: wb.width,
      pageHeight: wb.height,
    }
    return {
      top,
      height: Math.max(1, bottom - top),
      width: wb.width,
      pageHeight: wb.height,
    }
  }

  /** The visible part from the geometry read last time (no layout read). */
  private visibleCached(): {
    top: number
    height: number
    width: number
    pageHeight: number
  } | null {
    const g = this.geom
    if (!g) return null
    const from = this.scrollNow - g.contentTop
    const top = Math.min(Math.max(0, from), g.pageHeight)
    const bottom = Math.min(Math.max(0, from + g.viewH), g.pageHeight)
    return {
      top,
      height: Math.max(1, bottom - top),
      width: g.width,
      pageHeight: g.pageHeight,
    }
  }

  /** The scroller's position (page px). */
  private scrollPos(): number {
    const s = this.scroller
    return s === window ? window.scrollY : (s as HTMLElement).scrollTop
  }

  /**
   * Scroll events (they come before the frame's changes, so the page is clean
   * and reading the position costs nothing): the ink itself scrolls with the
   * page. Choose the tiles again only after a step, or while something live
   * follows the screen; and once more, with fresh geometry, when it stops.
   */
  private onScroll(): void {
    this.scrollNow = this.scrollPos()
    this.lastScrollAt = performance.now()
    if (!this.settleTimer) {
      const check = () => {
        this.settleTimer = 0
        if (performance.now() - this.lastScrollAt < 140) {
          this.settleTimer = window.setTimeout(check, 150)
        } else this.requestDraw()
      }
      this.settleTimer = window.setTimeout(check, 150)
    }
    if (
      this.liveOn ||
      Math.abs(this.scrollNow - this.drawnScroll) >= SCROLL_STEP
    ) {
      this.requestDraw(false)
    }
  }

  /**
   * Lays the overlay exactly over the editor without making the editor's
   * container positioned (that moves the editor's own floating toolbars). The
   * overlay sits in the anchor, inside the scroller, so it scrolls with the
   * text. A zoomed paper (CSS zoom on an ancestor) scales the overlay's own
   * numbers; the overlay is zoomed back so its units are screen px.
   */
  private placeOverlay(): void {
    this.placeDirty = false
    const { wrap } = this.env
    const wr = wrap.getBoundingClientRect()
    const ar = this.anchor.getBoundingClientRect()
    const cs = getComputedStyle(wrap)
    let local = parseFloat(cs.width)
    if (cs.boxSizing !== 'border-box') {
      local +=
        (parseFloat(cs.paddingLeft) || 0) +
        (parseFloat(cs.paddingRight) || 0) +
        (parseFloat(cs.borderLeftWidth) || 0) +
        (parseFloat(cs.borderRightWidth) || 0)
    }
    let zoom = local > 1 && wr.width > 1 ? wr.width / local : 1
    if (Math.abs(zoom - 1) < 0.004) zoom = 1
    const left = Math.round((wr.left - ar.left) * 100) / 100
    const top = Math.round((wr.top - ar.top) * 100) / 100
    const key = `${left}|${top}|${Math.round(wr.width * 100)}|${Math.round(wr.height * 100)}|${zoom}`
    if (key === this.placed) return
    this.placed = key
    const st = this.overlay.style
    st.zoom = zoom === 1 ? '' : String(1 / zoom)
    st.left = `${left}px`
    st.top = `${top}px`
    st.width = `${wr.width}px`
    st.height = `${wr.height}px`
  }

  private redraw(): void {
    if (this.placeDirty) this.placeOverlay()
    const { doc } = this.env
    if (this.layoutDirty && (doc.strokeCount > 0 || this.gesture)) {
      this.layoutDirty = false
      this.layout.measure()
      const gone: string[] = []
      for (const id of doc.anchorBlocks()) {
        const r = this.layout.rectOf(id)
        if (this.env.book) continue // a book's block is never deleted
        if (r) {
          doc.noteBlock(id, {
            x: r.x,
            y: r.y,
            w: this.layout.width,
            ...(r.media ? { mw: r.w } : {}),
          })
          this.seenBlocks.add(id)
        } else if (this.seenBlocks.has(id)) gone.push(id)
      }
      if (gone.length && !this.gesture) this.adoptOrphans(gone)
    }
    this.ensureRoom()
    const cached = this.fresh ? null : this.visibleCached()
    this.fresh = false
    if (!cached) this.scrollNow = this.scrollPos()
    const v = cached ?? this.visible()
    const dpr = clampDpr(window.devicePixelRatio || 1)
    const r = this.renderer
    const tool = this.env.tool()
    const night = this.env.night()
    // Anything live (a stroke, the eraser ring, a lasso, peeled tape) is on
    // the live canvas, which follows the screen and is painted every frame;
    // everything finished is on tiles that scroll with the page.
    const live =
      this.gesture !== null ||
      (tool === 'eraser' && this.hover !== null) ||
      this.peeled.size > 0
    this.liveOn = live
    this.drawnScroll = this.scrollNow
    r.setView(live || this.liveWas ? v.top : r.top, v.width, v.height, dpr)
    const hidden = this.peeled.size
      ? new Set([...this.hidden, ...this.peeled])
      : this.hidden
    const key = `${doc.version}|${this.layout.version}|${[...hidden].join(',')}|${night}|${tool}`
    r.syncTiles(
      doc,
      this.layout,
      { hidden, night },
      key,
      v.top - TILE_H,
      v.top + v.height + TILE_H,
      v.pageHeight,
      cached === null && !live,
    )
    if (live || this.liveWas) this.drawLive()
    this.liveWas = live
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
    if (g?.kind === 'lasso' && (g.rect || g.path.length > 1)) {
      ctx.save()
      ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, -r.dpr * r.top)
      ctx.setLineDash([6, 5])
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#0b6e99'
      ctx.beginPath()
      if (g.rect) {
        const b = boundsOf([g.start, g.now])
        ctx.rect(b.x, b.y, b.w, b.h)
        ctx.fillStyle = 'rgba(11, 110, 153, 0.08)'
        ctx.fill()
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
    if (gripDragging()) return false // a bar is being dragged by its grip
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
      if (eraserSettings.get().returnAfter && g.path.length > 0) {
        this.env.returnTool?.()
      }
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
      this.syncPad()
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
    // The double-tap window runs from the first stroke's end to the second's start.
    const began = { at: Date.now() - ms, x: first.x, y: first.y }
    const now = { at: Date.now(), x: first.x, y: first.y }
    if (isShort(ms, travel) && isDoubleTap(this.lastTap, began)) {
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
    // Phase Q rule 10: a drawing over several lines belongs to its top line,
    // with the strokes it touches, so it moves as one piece.
    const piece = g.highlight
      ? null
      : this.drawingPiece(finished, g.frame.blockId)
    if (piece) {
      edit.add.push({
        layerId: id,
        blockId: piece.blockId,
        stroke: piece.stroke,
      })
      edit.del.push(...piece.del)
      edit.add.push(...piece.add)
    } else {
      edit.add.push({ layerId: id, blockId: g.frame.blockId, stroke: finished })
    }
    this.commit(edit)
    if (this.lastTap?.strokeId === '') this.lastTap.strokeId = finished.id
  }

  /**
   * Phase Q rule 7: lines that were on screen and are gone now (deleted)
   * hand their ink to the next line, for good: the strokes are re-linked
   * (saved, not an undo step), so they follow that line from now on.
   */
  private adoptOrphans(gone: readonly string[]): void {
    const { doc } = this.env
    const blocks = this.layout.blocks()
    if (blocks.length === 0) return
    const edit = emptyEdit()
    for (const id of gone) {
      const fb = doc.fallbackOf(id)
      const next = fb ? nextBlockAt(fb.y, blocks) : undefined
      if (!next) continue
      const from = this.layout.frame(id)
      const to = this.layout.frame(next.id)
      for (const p of doc.all()) {
        if (p.blockId !== id) continue
        edit.del.push(p)
        edit.add.push({
          layerId: p.layerId,
          blockId: next.id,
          stroke: {
            ...p.stroke,
            pts: reanchorPts(p.stroke.pts, STRIDE, from, to),
          },
        })
      }
      this.seenBlocks.delete(id)
    }
    if (!isEmptyEdit(edit)) doc.apply(edit)
  }

  /**
   * Phase Q rule 10: where a new stroke belongs when it spans lines or
   * touches other strokes of a drawing. Null when it stays on its own line.
   */
  private drawingPiece(
    stroke: Stroke,
    blockId: string | null,
  ): {
    blockId: string | null
    stroke: Stroke
    del: Placed[]
    add: Placed[]
  } | null {
    const blocks = this.layout.blocks()
    if (blocks.length < 2) return null
    const from = this.layout.frame(blockId)
    const box = strokeRect(stroke, from)
    if (!box) return null
    // Strokes of the same drawing: drawn in the last 20 s and overlapping it.
    const recent = stroke.at - DRAWING_MS
    let top = box.y
    let bottom = box.y + box.h
    const touched = this.env.doc
      .all()
      .filter(
        (p) =>
          p.stroke.kind === 'ink' &&
          p.stroke.at >= recent &&
          !this.hidden.has(p.layerId),
      )
      .filter((p) => {
        const r = strokeRect(p.stroke, this.layout.frame(p.blockId))
        const hit =
          !!r &&
          r.x <= box.x + box.w &&
          box.x <= r.x + r.w &&
          r.y <= box.y + box.h &&
          box.y <= r.y + r.h
        if (hit && r) {
          top = Math.min(top, r.y)
          bottom = Math.max(bottom, r.y + r.h)
        }
        return hit
      })
    // Only a drawing over three lines or more; handwriting stays per line.
    const spanned = blocks.filter((b) => b.y < bottom && b.y + b.h > top)
    if (spanned.length < DRAWING_LINES) return null
    const anchor = drawingAnchor(
      { x: box.x + box.w / 2, y: box.y },
      touched.map((p) => p.blockId),
      blocks,
    )
    const moveOthers = touched.filter((p) => p.blockId !== anchor)
    if (anchor === blockId && moveOthers.length === 0) return null
    const to = this.layout.frame(anchor)
    const reanchored = (s: Stroke, f: Frame): Stroke => ({
      ...s,
      pts: reanchorPts(s.pts, STRIDE, f, to),
    })
    return {
      blockId: anchor,
      stroke: anchor === blockId ? stroke : reanchored(stroke, from),
      del: moveOthers,
      add: moveOthers.map((p) => ({
        layerId: p.layerId,
        blockId: anchor,
        stroke: {
          ...reanchored(p.stroke, this.layout.frame(p.blockId)),
          id: createId(),
        },
      })),
    }
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

  /** A pointer id of our own for an erase driven from the Magnifier's pad. */
  private static readonly PAD_ERASE = -7

  /** The Magnifier's pad rubs the page with the eraser (page px). */
  beginErase(w: Pt): void {
    if (this.env.frozen() || this.gesture) return
    this.layout.measure()
    this.gesture = {
      kind: 'erase',
      id: InkController.PAD_ERASE,
      last: null,
      path: [],
      del: new Map(),
      add: new Map(),
      live: [],
    }
    this.eraseTo(w)
    this.requestDraw()
  }

  eraseMove(w: Pt): void {
    const g = this.gesture
    if (g?.kind !== 'erase' || g.id !== InkController.PAD_ERASE) return
    this.eraseTo(w)
    this.requestDraw()
  }

  endErase(): void {
    const g = this.gesture
    if (g?.kind !== 'erase' || g.id !== InkController.PAD_ERASE) return
    this.gesture = null
    this.finishErase(g)
    this.requestDraw()
    this.notify()
  }

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

  /**
   * Under the Lasso a finger scrolls and taps (owner: finger scroll beside
   * and under the Lasso), unless "Finger can draw" is Always (no Pencil at
   * all): only then does a finger draw a loop.
   */
  private fingerLassos(): boolean {
    return penSettings.get().finger === 'on'
  }

  private lassoActive(e: PointerEvent): boolean {
    return (
      this.env.tool() === 'lasso' &&
      !this.env.frozen() &&
      (e.pointerType === 'pen' ||
        e.pointerType === 'mouse' ||
        this.fingerLassos())
    )
  }

  private lassoDown(e: PointerEvent): void {
    if (gripDragging()) return
    const g = this.gesture
    if (g) {
      // A second finger while the selection is being dragged: twist it.
      if (
        g.kind === 'transform' &&
        g.how === 'move' &&
        !g.second &&
        e.pointerType === 'touch'
      ) {
        e.preventDefault()
        const w = this.world(e)
        g.second = { id: e.pointerId, start: w, now: w, firstNow: g.start }
        try {
          this.pad.setPointerCapture(e.pointerId)
        } catch {
          // A pointer the browser does not know (a test).
        }
      }
      return
    }
    if (e.pointerType === 'pen') penSeenEver = true
    const target = e.target as HTMLElement | null
    if (target?.closest('[data-ink-handles]')) return
    if (!this.lassoActive(e)) {
      // A finger that may not draw: it scrolls, and a tap places the caret
      // (lassoUp), as it would on the words themselves.
      if (
        e.pointerType === 'touch' &&
        target === this.pad &&
        this.env.tool() === 'lasso' &&
        !this.env.frozen()
      ) {
        this.fingerTap = { id: e.pointerId, x: e.clientX, y: e.clientY }
      }
      return
    }
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
    const hit = lassoSettings.get().ink ? this.hitStroke(w) : null
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
        rect: false,
        now: w,
      }
      return
    }
    const box = this.selectionRect()
    // Dragging the box moves the ink (a mixed selection: the ink only; the
    // menu says so, typed text flows with the page).
    if (box && containsPt(inflate(box, 8), w)) {
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
      rect: lassoSettings.get().shape === 'rect',
      now: w,
    }
  }

  private lassoMove(e: PointerEvent): void {
    const g = this.gesture
    if (!g) return
    if (g.kind === 'transform' && g.second) {
      if (e.pointerId === g.second.id) g.second.now = this.world(e)
      else if (e.pointerId === g.id) g.second.firstNow = this.world(e)
      else return
      this.twistTo(g)
      return
    }
    if (g.id !== e.pointerId) return
    if (g.kind === 'lasso') {
      // A press-and-hold on words became a text selection (holdSelect): the
      // loop gives way to it.
      if (selectGesture.active) {
        this.cancelGesture()
        return
      }
      g.now = this.world(e)
      g.path.push(g.now)
      this.requestDraw()
    } else if (g.kind === 'transform') {
      this.transformTo(g, this.world(e))
    }
  }

  /** A finger that may not draw, down on the pad (a tap places the caret). */
  private fingerTap: { id: number; x: number; y: number } | null = null

  private lassoUp(e: PointerEvent): void {
    const ft = this.fingerTap
    if (ft && ft.id === e.pointerId) {
      this.fingerTap = null
      if (Math.hypot(e.clientX - ft.x, e.clientY - ft.y) < 8) {
        this.env.placeCaret(e.clientX, e.clientY)
      }
      return
    }
    const g = this.gesture
    if (!g) return
    // Either finger lifting ends a twist.
    if (g.kind === 'transform' && g.second?.id === e.pointerId) {
      this.finishTransform(g)
      return
    }
    if (g.id !== e.pointerId) return
    if (g.kind === 'lasso') {
      this.gesture = null
      this.releaseEditing()
      const end = this.world(e)
      const moved = dist(g.start, end) > 6
      if (g.hitId && !moved) {
        this.select([g.hitId])
      } else if (moved || !g.owns) {
        const f = lassoSettings.get()
        // A rectangle selects by the box from the touch-down to the lift.
        const region = g.rect ? rectPolygon(g.start, end) : g.path
        const found = f.ink ? this.inRegion(region) : []
        const blocks = this.blocksIn(region)
        // The T filter around part of a paragraph: the words inside (R6-17).
        const words =
          found.length === 0 && f.text && !this.env.book
            ? this.wordsInRegion(region)
            : null
        // Lines taken in whole (most of the line, or every word, inside).
        const wholeLines =
          !words ||
          words.blocks.every(
            (id) => blocks.includes(id) || words.full.includes(id),
          )
        if (found.length > 0) {
          this.select(found.map((p) => p.stroke.id))
          // Ink and words or pictures in one loop: the mixed menu.
          this.blockSel = blocks
          this.notify()
        } else if (
          words &&
          !wholeLines &&
          !blocks.some((id) => this.env.blockKind(id) === 'picture')
        ) {
          // Some words, or a full line and part of the next: that text range.
          this.clearSelection()
          this.env.selectText(words.from, words.to)
        } else if (blocks.length > 0 || words) {
          // Whole lines or pictures: the text editor's own block selection and menu.
          this.clearSelection()
          const ids = words ? [...blocks, ...words.blocks] : blocks
          this.env.selectBlocks(
            this.layout
              .blocks()
              .map((b) => b.id)
              .filter((id) => ids.includes(id)),
          )
        } else if (!g.owns) {
          // A tap or loop on empty paper lets go of the selection. A mouse
          // click (no loop) places the caret, as it does everywhere.
          const had = this.selection.length > 0
          this.clearSelection()
          if (!moved && !had && e.pointerType === 'mouse') {
            this.env.placeCaret(e.clientX, e.clientY)
          }
        }
      }
      this.requestDraw()
    } else if (g.kind === 'transform') {
      this.finishTransform(g)
    }
  }

  private lassoCancel(e: PointerEvent): void {
    const g = this.gesture
    if (g?.kind === 'transform' && g.second?.id === e.pointerId) {
      this.finishTransform(g)
      return
    }
    if (
      g &&
      g.id === e.pointerId &&
      (g.kind === 'lasso' || g.kind === 'transform')
    ) {
      this.cancelGesture()
    }
  }

  /** Page blocks whose centre is inside the loop (only blocks near its box are tested). */
  blocksIn(path: Pt[]): string[] {
    if (path.length < 3 || this.env.book) return []
    const f = lassoSettings.get()
    if (!f.text && !f.pictures) return []
    const poly = path
    const area = boundsOf(poly)
    return this.layout
      .blocks()
      .filter((b) => {
        if (!intersects(b, area)) return false
        const kind = this.env.blockKind(b.id)
        if (kind === 'picture' ? !f.pictures : !f.text) return false
        // "Most of the line inside": the words themselves, not the full-width block.
        const words = this.env.blockBox(b.id) ?? b
        return mostlyInside(words, (p) => inPolygon(p, poly))
      })
      .map((b) => b.id)
  }

  /**
   * The words whose centre is inside the loop (R6-17), as one text range. The
   * loop is in page px; the editor measures words in client px.
   */
  private wordsInRegion(
    path: Pt[],
  ): { from: number; to: number; blocks: string[]; full: string[] } | null {
    if (path.length < 3) return null
    const b = this.env.wrap.getBoundingClientRect()
    const area = boundsOf(path)
    return this.env.wordsIn(
      (x, y) => inPolygon({ x: x - b.left, y: y - b.top }, path),
      { x: area.x + b.left, y: area.y + b.top, w: area.w, h: area.h },
    )
  }

  // ---- Copy, cut, paste, thickness ----

  /** The strokes copied last (page px, so they can land on any page). */
  private static clipboard: { stroke: Stroke; world: Pt[] }[] = []

  canPaste(): boolean {
    return InkController.clipboard.length > 0
  }

  /** Rule 9: the ink of the lines copied last (saved units, per line). */
  private static lineClip: {
    text: string
    lines: number
    items: { index: number; stroke: Stroke }[]
  } | null = null

  /** Lines (ids) whose words the page's text selection covers in full. */
  private wholeLinesSelected(): string[] {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return []
    const ranges = Array.from({ length: sel.rangeCount }, (_, i) =>
      sel.getRangeAt(i),
    )
    const inside = (n: Node, off: number) =>
      ranges.some((r) => {
        try {
          return r.comparePoint(n, off) === 0
        } catch {
          return false
        }
      })
    const out: string[] = []
    for (const el of this.env.wrap.querySelectorAll<HTMLElement>(
      '.bn-block[data-id] > .bn-block-content',
    )) {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let any = false
      let all = true
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const len = n.textContent?.length ?? 0
        if (len === 0) continue
        any = true
        if (!inside(n, 0) || !inside(n, len)) all = false
      }
      if (any && all) out.push(el.parentElement!.getAttribute('data-id')!)
    }
    return out
  }

  /** Rule 9: these lines (page order) were copied or cut; their ink goes too. */
  copyLines(ids: string[], text: string, cut: boolean): void {
    const mine = this.env.doc.all().filter((p) => ids.includes(p.blockId ?? ''))
    InkController.lineClip =
      mine.length === 0
        ? null
        : {
            text,
            lines: ids.length,
            items: mine.map((p) => ({
              index: ids.indexOf(p.blockId ?? ''),
              stroke: p.stroke,
            })),
          }
    // Cut: the ink leaves with its lines (one Undo brings it back).
    if (cut && mine.length > 0 && !this.env.frozen())
      this.commit({ del: mine, add: [], layers: [] })
  }

  /**
   * Rule 9: a paste of `text` (null: unknown) is running, or `run` does it.
   * When it is the lines copied last, their ink is linked to the pasted
   * lines (new lines in order; a paste into the line at the caret uses it).
   */
  pasteLines(text: string | null, run?: () => void): void {
    const clip = InkController.lineClip
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
    if (
      !clip ||
      this.env.frozen() ||
      (text !== null && norm(text) !== '' && norm(text) !== norm(clip.text))
    ) {
      run?.()
      return
    }
    const ids = () =>
      [
        ...this.env.wrap.querySelectorAll<HTMLElement>('.bn-block[data-id]'),
      ].map((e) => e.getAttribute('data-id')!)
    const before = new Set(ids())
    const anchor = window.getSelection()?.anchorNode
    const caret =
      (anchor instanceof Element ? anchor : anchor?.parentElement)
        ?.closest('.bn-block[data-id]')
        ?.getAttribute('data-id') ?? null
    run?.()
    // The editor puts the pasted lines in after this event.
    setTimeout(() =>
      requestAnimationFrame(() =>
        this.guard(() => {
          const fresh = ids().filter((id) => !before.has(id))
          const targets =
            fresh.length >= clip.lines || !caret ? fresh : [caret, ...fresh]
          if (targets.length === 0) return
          const layer = this.layerForDrawing()
          if (!layer) return
          this.layout.measure()
          const now = Date.now()
          const { id, edit } = this.ensureLayer(layer.id)
          clip.items.forEach((c, i) =>
            edit.add.push({
              layerId: id,
              blockId: targets[Math.min(c.index, targets.length - 1)],
              stroke: { ...c.stroke, id: createId(), at: now + i },
            }),
          )
          this.commit(edit)
        }),
      ),
    )
  }

  copySelection(): number {
    const items = this.selected()
    InkController.clipboard = items.map((p) => ({
      stroke: p.stroke,
      world: this.worldPoints(p),
    }))
    return items.length
  }

  cutSelection(): number {
    const n = this.copySelection()
    if (n > 0) this.deleteSelection()
    return n
  }

  /** Pastes the copied strokes a little to the right and down, and selects them. */
  pasteClipboard(): void {
    const items = InkController.clipboard
    if (items.length === 0 || this.env.frozen()) return
    this.placeAndSelect(
      items.map((c) => ({
        stroke: c.stroke,
        world: c.world.map((q) => ({ x: q.x + 16, y: q.y + 16 })),
      })),
    )
  }

  /**
   * Phase Q rule 5: strokes another box's Lasso dropped here (client px).
   * They link to the line under them; one Undo here.
   */
  adoptCarried(items: readonly Carried[], lines?: CarriedLines): void {
    if (items.length === 0 || this.env.frozen()) return
    if (lines && this.env.insertLines) {
      void this.adoptWithLines(items, lines)
      return
    }
    this.placeCarried(items, 0)
  }

  private placeCarried(items: readonly Carried[], dy: number): void {
    const b = this.env.wrap.getBoundingClientRect()
    this.placeAndSelect(
      items.map((c) => ({
        stroke: c.stroke,
        world: c.client.map((q) => ({ x: q.x - b.left, y: q.y - b.top + dy })),
      })),
    )
  }

  /**
   * Rule 6 across boxes: the lines go in next to the line nearest the drop
   * (or at the top of a new box), then the ink is laid over them where it
   * was over its old lines, so it stays linked to the same text.
   */
  private async adoptWithLines(
    items: readonly Carried[],
    lines: CarriedLines,
  ): Promise<void> {
    const insert = this.env.insertLines
    if (!insert) return
    this.layout.measure()
    const here = this.layout.blocks()
    const top = this.env.wrap.getBoundingClientRect().top
    const dropY = lines.refY - top
    let target = here[0]
    for (const b of here)
      if (Math.abs(b.y - dropY) < Math.abs(target.y - dropY)) target = b
    if (!target) return
    const place = dropY < target.y + target.h / 2 ? 'before' : 'after'
    const ids = insert(lines.blocks, target.id, place)
    if (!ids || ids.length === 0) return
    // Wait for the editor to draw the new lines, then measure them.
    let first: { y: number } | undefined
    for (let i = 0; i < 60 && !first; i++) {
      await new Promise((r) => requestAnimationFrame(r))
      this.layout.measure()
      first = this.layout.blocks().find((b) => b.id === ids[0])
    }
    const now = this.env.wrap.getBoundingClientRect().top
    this.placeCarried(items, first ? first.y + now - lines.refY : 0)
  }

  /** New strokes at these page px, each linked to the line under it; selected. */
  private placeAndSelect(items: { stroke: Stroke; world: Pt[] }[]): void {
    const layer = this.layerForDrawing()
    if (!layer) return
    this.layout.measure()
    const now = Date.now()
    const wNow = this.layout.width
    const add: Placed[] = items.map((c, i) => {
      const moved = c.world
      const mid = moved[Math.floor(moved.length / 2)] ?? moved[0]
      const blockId = pickAnchor(mid, this.layout.blocks())
      const frame = this.layout.frame(blockId)
      const pts = c.stroke.pts.slice()
      moved.forEach((q, k) => {
        const l = toLocal(q, frame)
        pts[k * STRIDE] = Math.round(l.x * 10000) / 10000
        pts[k * STRIDE + 1] = Math.round(l.y * 10000) / 10000
      })
      const stroke: Stroke = {
        ...c.stroke,
        id: createId(),
        at: now + i,
        pts,
        bw: wNow,
        style: {
          ...c.stroke.style,
          width: c.stroke.style.width * (wNow / c.stroke.bw),
        },
      }
      return { layerId: layer.id, blockId, stroke }
    })
    const { id, edit } = this.ensureLayer(layer.id)
    for (const p of add) edit.add.push({ ...p, layerId: id })
    this.commit(edit)
    this.select(edit.add.map((p) => p.stroke.id))
  }

  /** Sets the selected strokes' thickness (px on screen now). One Undo. */
  thicknessSelection(px: number): void {
    const items = this.selected()
    if (items.length === 0) return
    const add = items.map((p) => ({
      ...p,
      stroke: {
        ...p.stroke,
        id: createId(),
        style: {
          ...p.stroke.style,
          width: (px * p.stroke.bw) / this.layout.width,
        },
      },
    }))
    this.commit({ del: items, add, layers: [] })
    this.select(add.map((p) => p.stroke.id))
  }

  private inRegion(path: Pt[]): Placed[] {
    if (path.length < 3) return []
    const poly = path
    const area = boundsOf(poly)
    return this.selectable().filter((p) => {
      const r = strokeRect(p.stroke, this.layout.frame(p.blockId))
      if (!r || !intersects(r, area)) return false
      const pts = this.worldPoints(p)
      const inside = pts.filter((q) => inPolygon(q, poly)).length
      return inside / pts.length >= LASSO_INSIDE
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

  /** Runs `fn` whenever the page's ink changes (the Magnifier's pad mirrors it). */
  subscribeDoc(fn: () => void): () => void {
    return this.env.doc.subscribe(fn)
  }

  /**
   * Paints the page's ink that lies in `box` (page px) into another canvas,
   * `zoom` times bigger, the box's corner at the canvas's top left. The
   * Magnifier's pad shows the page this way, so page and pad never differ.
   */
  paintRegion(
    ctx: CanvasRenderingContext2D,
    dpr: number,
    box: Rect,
    zoom: number,
  ): void {
    const m: Affine = {
      a: zoom,
      b: 0,
      c: 0,
      d: zoom,
      e: -box.x * zoom,
      f: -box.y * zoom,
    }
    const target = { ctx, dpr, top: 0 }
    for (const p of this.selectable()) {
      if (this.hidden.has(p.stroke.id)) continue
      const frame = this.layout.frame(p.blockId)
      const r = strokeRect(p.stroke, frame)
      if (!r || !intersects(r, box)) continue
      paintStroke(target, p.stroke, frame, m)
    }
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
    /** The handle grabbed (a corner or the middle of an edge). */
    corner?: Pt,
    axis: 'x' | 'y' | 'both' = 'both',
  ): void {
    const box = this.selectionRect()
    if (!box || this.gesture) return
    this.holdEditing()
    const centre = { x: box.x + box.w / 2, y: box.y + box.h / 2 }
    const start = this.world(e)
    // Scale about the side opposite the handle grabbed (centre if unknown).
    const fixed = corner
      ? {
          x:
            axis === 'y' ? centre.x : box.x + (corner.x > centre.x ? 0 : box.w),
          y:
            axis === 'x' ? centre.y : box.y + (corner.y > centre.y ? 0 : box.h),
        }
      : centre
    this.gesture = {
      kind: 'transform',
      id: e.pointerId,
      how,
      axis,
      start,
      centre,
      fixed,
      m: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      factor: 1,
      before: this.selected(),
      second: null,
    }
    this.hidden = new Set(this.selection)
    // A second finger may join to twist: no native pinch meanwhile.
    this.pad.style.touchAction = 'none'
    this.requestDraw()
  }

  private transformTo(g: Extract<Gesture, { kind: 'transform' }>, w: Pt): void {
    if (g.how === 'move') {
      g.m = { a: 1, b: 0, c: 0, d: 1, e: w.x - g.start.x, f: w.y - g.start.y }
      g.factor = 1
    } else if (g.how === 'scale') {
      const clamp = (s: number) => Math.max(0.1, Math.min(10, s))
      if (g.axis === 'both') {
        const base = dist(g.start, g.fixed) || 1
        const s = clamp(dist(w, g.fixed) / base)
        g.m = around(g.fixed, s, 0)
        g.factor = s
      } else {
        // An edge handle stretches along its axis only.
        const sx =
          g.axis === 'x'
            ? clamp((w.x - g.fixed.x) / (g.start.x - g.fixed.x || 1))
            : 1
        const sy =
          g.axis === 'y'
            ? clamp((w.y - g.fixed.y) / (g.start.y - g.fixed.y || 1))
            : 1
        g.m = {
          a: sx,
          b: 0,
          c: 0,
          d: sy,
          e: g.fixed.x * (1 - sx),
          f: g.fixed.y * (1 - sy),
        }
        g.factor = Math.sqrt(sx * sy)
      }
    } else {
      const a0 = Math.atan2(g.start.y - g.centre.y, g.start.x - g.centre.x)
      const a1 = Math.atan2(w.y - g.centre.y, w.x - g.centre.x)
      g.m = around(g.centre, 1, snapTurn(a1 - a0, Math.PI / 2, TURN_SNAP))
      g.factor = 1
    }
    this.requestDraw()
  }

  /** Two fingers: the selection turns by the angle they turned and moves with their middle. */
  private twistTo(g: Extract<Gesture, { kind: 'transform' }>): void {
    const s = g.second
    if (!s) return
    const a0 = Math.atan2(s.start.y - g.start.y, s.start.x - g.start.x)
    const a1 = Math.atan2(s.now.y - s.firstNow.y, s.now.x - s.firstNow.x)
    const mid0 = {
      x: (g.start.x + s.start.x) / 2,
      y: (g.start.y + s.start.y) / 2,
    }
    const mid1 = {
      x: (s.firstNow.x + s.now.x) / 2,
      y: (s.firstNow.y + s.now.y) / 2,
    }
    g.m = around(
      g.centre,
      1,
      snapTurn(a1 - a0, Math.PI / 2, TURN_SNAP),
      mid1.x - mid0.x,
      mid1.y - mid0.y,
    )
    g.factor = 1
    this.requestDraw()
  }

  private finishTransform(g: Extract<Gesture, { kind: 'transform' }>): void {
    this.gesture = null
    this.hidden = new Set()
    this.releaseEditing()
    this.syncPad() // the pad's touch-action goes back to normal
    // A tap on the selection or a handle that did not move changes nothing.
    const { a, b, c, d, e, f } = g.m
    if (a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0) {
      this.requestDraw()
      return
    }
    if (g.how === 'move' && this.blockSel.length === 0 && this.dropElsewhere(g))
      return
    if (
      g.how === 'move' &&
      this.blockSel.length > 0 &&
      (this.moveLinesElsewhere(g) || this.moveWithText(g))
    )
      return
    const add = g.before.map((p) => this.transformed(p, g.m, g.factor))
    this.commit({ del: g.before, add, layers: [] })
    this.select(add.map((p) => p.stroke.id))
  }

  /**
   * Phase Q rule 5: ink dropped outside this box goes to the box under the
   * drop spot, or to a new box with an empty line made there on the paper
   * (so it is linked to a line). False when it stays in this box.
   */
  private dropElsewhere(g: Extract<Gesture, { kind: 'transform' }>): boolean {
    const b = this.env.wrap.getBoundingClientRect()
    const items: Carried[] = g.before.map((p) => ({
      stroke: p.stroke,
      client: this.worldPoints(p).map((q) => {
        const w = apply(g.m, q)
        return { x: w.x + b.left, y: w.y + b.top }
      }),
    }))
    const all = items.flatMap((c) => c.client)
    if (all.length === 0) return false
    const xs = all.map((q) => q.x)
    const ys = all.map((q) => q.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const target = adopterAt(cx, cy, this.env.wrap)
    if (
      !target &&
      cx >= b.left &&
      cx <= b.right &&
      cy >= b.top &&
      cy <= b.bottom
    )
      return false
    if (target) target.adopt(items)
    else if (!dropOnPaper(items)) return false
    this.commit({ del: g.before, add: [], layers: [] })
    this.clearSelection()
    return true
  }

  /**
   * Phase Q rule 6 across boxes: lines and ink dropped outside this box go
   * to the box under the drop spot, or to a new box made there on bare
   * paper. The other box takes the lines and ink first; only then do they
   * leave this one (nothing is lost if it cannot). Two Undo steps, one in
   * each box. False when the drop is inside this box.
   */
  private moveLinesElsewhere(
    g: Extract<Gesture, { kind: 'transform' }>,
  ): boolean {
    const { copyLines, removeLines } = this.env
    if (!copyLines || !removeLines) return false
    const sel = this.layout.blocks().filter((b) => this.blockSel.includes(b.id))
    if (sel.length === 0) return false
    const b = this.env.wrap.getBoundingClientRect()
    const inkPts = g.before.flatMap((p) => this.worldPoints(p))
    const pts = [
      ...inkPts,
      ...sel.flatMap((s) => [
        { x: 0, y: s.y },
        { x: 0, y: s.y + s.h },
      ]),
    ].map((q) => apply(g.m, q))
    const ys = pts.map((q) => q.y)
    const cy = b.top + (Math.min(...ys) + Math.max(...ys)) / 2
    const xs = inkPts.map((q) => apply(g.m, q).x)
    const cx = b.left + (Math.min(...xs) + Math.max(...xs)) / 2
    // Another box under the drop wins even when this box's area is larger.
    const target = adopterAt(cx, cy, this.env.wrap)
    if (
      !target &&
      cx >= b.left &&
      cx <= b.right &&
      cy >= b.top &&
      cy <= b.bottom
    )
      return false
    const items: Carried[] = g.before.map((p) => ({
      stroke: p.stroke,
      client: this.worldPoints(p).map((q) => {
        const w = apply(g.m, q)
        return { x: w.x + b.left, y: w.y + b.top }
      }),
    }))
    const order = this.layout
      .blocks()
      .filter((x) => this.blockSel.includes(x.id))
    const blocks = copyLines(order.map((x) => x.id))
    if (!blocks || blocks.length === 0) return false
    const lines: CarriedLines = {
      blocks,
      refY: b.top + order[0].y + g.m.f,
    }
    if (target) target.adopt(items, lines)
    else if (!dropOnPaper(items, lines)) return false
    this.commit({ del: g.before, add: [], layers: [] })
    removeLines(order.map((x) => x.id))
    this.clearSelection()
    this.dirty()
    return true
  }

  /**
   * Phase Q rule 6: ink and text Lasso-selected together move as one piece.
   * Each stroke is first linked to the nearest selected line (saved, not an
   * undo step: it does not move on screen), then the lines move to the drop
   * spot as one text step; the ink follows its lines, and one Undo puts the
   * lines, and so the ink, back.
   */
  private moveWithText(g: Extract<Gesture, { kind: 'transform' }>): boolean {
    const move = this.env.moveBlocks
    if (!move) return false
    const blocks = this.layout.blocks()
    const sel = blocks.filter((b) => this.blockSel.includes(b.id))
    const others = blocks.filter((b) => !this.blockSel.includes(b.id))
    if (sel.length === 0 || others.length === 0) return false
    const top = Math.min(...sel.map((b) => b.y))
    const bottom = Math.max(...sel.map((b) => b.y + b.h))
    const dropY = (top + bottom) / 2 + g.m.f
    let target = others[0]
    for (const b of others) {
      const d = Math.abs(b.y + b.h / 2 - dropY)
      if (d < Math.abs(target.y + target.h / 2 - dropY)) target = b
    }
    const place = dropY < target.y + target.h / 2 ? 'before' : 'after'
    const relink = emptyEdit()
    for (const p of g.before) {
      if (p.blockId && this.blockSel.includes(p.blockId)) continue
      const r = strokeRect(p.stroke, this.layout.frame(p.blockId))
      const mid = r ? r.y + r.h / 2 : top
      let to = sel[0]
      for (const b of sel) {
        if (Math.abs(b.y + b.h / 2 - mid) < Math.abs(to.y + to.h / 2 - mid))
          to = b
      }
      relink.del.push(p)
      relink.add.push({
        layerId: p.layerId,
        blockId: to.id,
        stroke: {
          ...p.stroke,
          pts: reanchorPts(
            p.stroke.pts,
            STRIDE,
            this.layout.frame(p.blockId),
            this.layout.frame(to.id),
          ),
        },
      })
    }
    if (!isEmptyEdit(relink)) this.env.doc.apply(relink)
    const ids = sel
      .map((b) => b.id)
      .sort(
        (a, b) =>
          blocks.findIndex((x) => x.id === a) -
          blocks.findIndex((x) => x.id === b),
      )
    if (!move(ids, target.id, place)) return false
    this.clearSelection()
    this.dirty()
    return true
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
