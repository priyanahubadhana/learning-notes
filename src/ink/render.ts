import { canvasBytes, clampDpr, release, reserve } from '../app/canvasBudget'
import type { Stroke } from '../core/inkTypes'
import type { Frame } from './anchor'
import { IDENTITY, type Affine, type Rect } from './geometry'
import type { InkDoc } from './inkDoc'
import type { PageLayout } from './layout'
import {
  outlineBounds,
  strokeOutline,
  UNIT,
  widthUnits,
  type Outline,
} from './outline'

/**
 * Drawing ink on canvases.
 *
 * The overlay lives inside the page's scroller, so the browser scrolls the
 * ink with the text (no script on scroll). The finished ink is cut into
 * TILE_H-tall tiles; a tile has an `hl` canvas (highlights behind the ink)
 * and an `ink` canvas (every visible layer) only when it has strokes, and
 * only the tiles near the screen exist (bounded memory, iPad Safari refuses
 * about 16 million pixels per canvas). One `live` canvas the size of the
 * screen holds only what moves: the stroke being drawn, the eraser ring, a
 * lasso. A tile is painted again only when the ink, layout, size or look
 * changes, or when it first comes near the screen.
 */

interface Cached {
  outline: Outline
  path: Path2D
  /** Bounds in ink units. */
  b: { x0: number; y0: number; x1: number; y1: number }
}

const cache = new WeakMap<Stroke, Cached | null>()

function buildPath(o: Outline): Path2D {
  const p = new Path2D()
  if (o.kind === 'fill') {
    const poly = o.poly
    if (poly.length === 0) return p
    p.moveTo(poly[0][0], poly[0][1])
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]
      p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    }
    p.closePath()
    return p
  }
  const pts = o.pts
  if (pts.length === 0) return p
  p.moveTo(pts[0][0], pts[0][1])
  if (pts.length === 1) p.lineTo(pts[0][0] + 0.01, pts[0][1])
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1])
  if (o.closed) p.closePath()
  return p
}

/** The outline, path and bounds of a stroke (built once per stroke). */
function cachedStroke(stroke: Stroke): Cached | null {
  if (cache.has(stroke)) return cache.get(stroke) ?? null
  const outline = strokeOutline(stroke)
  const made = outline
    ? {
        outline,
        path: buildPath(outline),
        b: outlineBounds(outline, widthUnits(stroke)),
      }
    : null
  cache.set(stroke, made)
  return made
}

/** A stroke's bounds in page px, given where its block is. */
export function strokeRect(stroke: Stroke, frame: Frame): Rect | null {
  const c = cachedStroke(stroke)
  if (!c) return null
  const k = frame.w / UNIT
  return {
    x: frame.x + c.b.x0 * k,
    y: frame.y + c.b.y0 * k,
    w: (c.b.x1 - c.b.x0) * k,
    h: (c.b.y1 - c.b.y0) * k,
  }
}

/** Where a canvas sits: its top edge in page px and its device pixel ratio. */
export interface Target {
  ctx: CanvasRenderingContext2D
  top: number
  dpr: number
}

/** Paints one stroke. `m` moves it first (lasso preview), in page px. */
export function paintStroke(
  t: Target,
  stroke: Stroke,
  frame: Frame,
  m: Affine = IDENTITY,
): void {
  const c = cachedStroke(stroke)
  if (!c) return
  const { ctx, dpr } = t
  const k = frame.w / UNIT
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, -dpr * t.top)
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f)
  ctx.transform(k, 0, 0, k, frame.x, frame.y)
  const s = stroke.style
  const o = c.outline
  if (o.kind === 'fill') {
    ctx.globalAlpha = s.opacity
    ctx.fillStyle = s.colour
    ctx.fill(c.path)
  } else {
    if (stroke.fill && o.closed) {
      // Tape hides what is under it; other filled shapes only tint it.
      ctx.globalAlpha = stroke.kind === 'tape' ? s.opacity : s.opacity * 0.2
      ctx.fillStyle = s.colour
      ctx.fill(c.path)
    }
    ctx.globalAlpha = s.opacity
    ctx.strokeStyle = s.colour
    ctx.lineWidth = o.width
    ctx.lineCap = o.cap
    ctx.lineJoin = 'round'
    ctx.setLineDash(o.dash)
    ctx.stroke(c.path)
  }
  ctx.restore()
}

/** The height of one tile of ink canvas (page px). */
export const TILE_H = 640

export interface RenderOptions {
  /** Strokes not painted (the ones being moved by the lasso). */
  hidden: ReadonlySet<string>
  /** Night theme: highlights are plain see-through instead of blended. */
  night: boolean
}

interface Item {
  stroke: Stroke
  frame: Frame
  r: Rect
  behind: boolean
}

interface Plane {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

/**
 * A tile's canvases. Slots are made once and reused for whichever tile needs
 * ink (moved with a transform), so scrolling builds and removes no DOM.
 */
interface Slot {
  el: HTMLDivElement
  hl: Plane | null
  ink: Plane | null
  /** The tile it shows, or -1 (hidden, free). */
  index: number
}

/** One band of the page; `slot` is null while it has no ink to show. */
interface Tile {
  index: number
  slot: Slot | null
  key: string
}

/** The most slots (tiles with ink) one page keeps: bounds the memory. */
const MAX_SLOTS = 8
/** Free slots kept for reuse when the page is idle. */
const SPARE_SLOTS = 2

let rendererCount = 0

/** Is any pixel of the canvas not clear? Read in bands, stops at the first. */
function hasPixels(c: HTMLCanvasElement): boolean {
  const ctx = c.getContext('2d')
  if (!ctx || c.width === 0 || c.height === 0) return false
  const band = 48
  for (let y = 0; y < c.height; y += band) {
    const h = Math.min(band, c.height - y)
    const d = ctx.getImageData(0, y, c.width, h).data
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true
  }
  return false
}

export class InkRenderer {
  private readonly budgetId = `ink-${++rendererCount}`
  readonly root: HTMLDivElement
  readonly live: HTMLCanvasElement
  readonly liveCtx: CanvasRenderingContext2D
  private tiles = new Map<number, Tile>()
  private slots: Slot[] = []
  dpr = 1
  /** Top edge of the live canvas (the part of the page on screen), page px. */
  top = 0
  /** The page's width, and the live canvas's height (page px). */
  width = 1
  height = 1

  constructor(lowLatency: boolean) {
    this.root = document.createElement('div')
    this.root.setAttribute('data-ink-canvases', '')
    Object.assign(this.root.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
      // Changing tiles never makes the page lay out or restyle again.
      contain: 'strict',
    })
    const c = document.createElement('canvas')
    c.setAttribute('data-ink-canvas', 'live')
    Object.assign(c.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      pointerEvents: 'none',
    })
    this.root.append(c)
    const ctx = c.getContext('2d', lowLatency ? { desynchronized: true } : {})
    if (!ctx) throw new Error('No canvas')
    this.live = c
    this.liveCtx = ctx
  }

  /**
   * Sets the live canvas (the stroke being drawn, the eraser ring, a lasso):
   * it covers the part of the page on screen, `top` px down. The finished ink
   * is on tiles that scroll with the page and are not touched by scrolling.
   * Returns true if the sizes changed.
   */
  setView(top: number, width: number, height: number, dpr: number): boolean {
    dpr = clampDpr(dpr)
    // Over the memory budget: draw at 1x rather than turn blank.
    if (
      !reserve(
        this.budgetId,
        canvasBytes(width * dpr, height * dpr) + this.tileBytes(),
      )
    ) {
      dpr = 1
      reserve(this.budgetId, canvasBytes(width, height) + this.tileBytes())
    }
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))
    const sizeChanged =
      w !== this.width || h !== this.height || dpr !== this.dpr
    if (top !== this.top || sizeChanged) this.live.style.top = `${top}px`
    this.top = top
    this.dpr = dpr
    if (sizeChanged) {
      this.width = w
      this.height = h
      this.live.style.width = `${w}px`
      this.live.style.height = `${h}px`
      this.live.width = Math.round(w * dpr)
      this.live.height = Math.round(h * dpr)
    }
    return sizeChanged
  }

  private tileBytes(): number {
    let n = 0
    for (const sl of this.slots) {
      for (const pl of [sl.hl, sl.ink]) {
        if (pl) n += canvasBytes(pl.canvas.width, pl.canvas.height)
      }
    }
    return n
  }

  /** How many tile canvases exist now (tests, the lab). */
  tileCount(): number {
    let n = 0
    for (const sl of this.slots) n += (sl.hl ? 1 : 0) + (sl.ink ? 1 : 0)
    return n
  }

  /** Did the browser take a canvas's context away (memory pressure, a long background)? */
  contextLost(): boolean {
    const lost = (ctx: CanvasRenderingContext2D) =>
      (
        ctx as CanvasRenderingContext2D & { isContextLost?: () => boolean }
      ).isContextLost?.() === true
    if (lost(this.liveCtx)) return true
    return this.slots.some((sl) =>
      [sl.hl, sl.ink].some((pl) => pl !== null && lost(pl.ctx)),
    )
  }

  /**
   * Tiles that should show ink (they have a slot) but whose canvases read back
   * empty: the system dropped what a backgrounded app had drawn (health check).
   */
  blankTiles(): number {
    let n = 0
    for (const t of this.tiles.values()) {
      const sl = t.slot
      if (!sl || sl.index !== t.index) continue
      const planes = [sl.hl, sl.ink].filter((p): p is Plane => p !== null)
      if (planes.length > 0 && !planes.some((p) => hasPixels(p.canvas))) n++
    }
    return n
  }

  /** Gives the canvases' memory back (the page closed). */
  dispose(): void {
    this.live.width = this.live.height = 0
    for (const sl of [...this.slots]) this.dropSlot(sl)
    this.tiles.clear()
    release(this.budgetId)
  }

  /** Forgets what the tiles show (layers removed): they paint again. */
  dropBitmaps(): void {
    for (const t of this.tiles.values()) t.key = ''
  }

  clearLive(): void {
    this.liveCtx.clearRect(0, 0, this.live.width, this.live.height)
  }

  liveTarget(): Target {
    return { ctx: this.liveCtx, top: this.top, dpr: this.dpr }
  }

  setLiveBlend(blend: boolean): void {
    this.live.style.mixBlendMode = blend ? 'multiply' : 'normal'
  }

  private dropSlot(sl: Slot): void {
    for (const pl of [sl.hl, sl.ink]) {
      if (pl) pl.canvas.width = pl.canvas.height = 0
    }
    sl.el.remove()
    this.slots = this.slots.filter((x) => x !== sl)
  }

  private freeSlot(sl: Slot): void {
    sl.index = -1
    sl.el.style.display = 'none'
    // A free slot shows nothing (and holds no stale picture).
    for (const pl of [sl.hl, sl.ink]) {
      if (pl) pl.ctx.clearRect(0, 0, pl.canvas.width, pl.canvas.height)
    }
  }

  /** A slot for tile `index`: its own, a free one, a new one, or the farthest. */
  private takeSlot(index: number, from: number, to: number): Slot | null {
    let sl = this.slots.find((x) => x.index === index)
    if (sl) return sl
    sl = this.slots.find((x) => x.index === -1)
    if (!sl && this.slots.length < MAX_SLOTS) {
      const el = document.createElement('div')
      el.setAttribute('data-ink-tile', '')
      Object.assign(el.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        pointerEvents: 'none',
        contain: 'strict',
      })
      // Before the live canvas, which is always on top.
      this.root.insertBefore(el, this.live)
      sl = { el, hl: null, ink: null, index: -1 }
      this.slots.push(sl)
    }
    if (!sl) {
      // Take the slot whose tile is farthest outside the wanted range.
      let far = -1
      for (const x of this.slots) {
        const d = x.index < from ? from - x.index : x.index - to
        if (d > far) {
          far = d
          sl = x
        }
      }
      const old = sl && this.tiles.get(sl.index)
      if (old) {
        old.slot = null
        old.key = ''
      }
    }
    return sl ?? null
  }

  private plane(sl: Slot, name: 'hl' | 'ink'): Plane | null {
    let pl = sl[name]
    if (pl) return pl
    const canvas = document.createElement('canvas')
    canvas.setAttribute('data-ink-canvas', name === 'hl' ? 'highlights' : 'ink')
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    })
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // The highlights lie behind the ink: first in the tile.
    if (name === 'hl') sl.el.prepend(canvas)
    else sl.el.append(canvas)
    pl = { canvas, ctx }
    sl[name] = pl
    return pl
  }

  private removePlane(sl: Slot, name: 'hl' | 'ink'): void {
    const pl = sl[name]
    if (!pl) return
    pl.canvas.width = pl.canvas.height = 0
    pl.canvas.remove()
    sl[name] = null
  }

  /**
   * Keeps the tiles that cover `lo`..`hi` (page px: the screen plus a margin)
   * and paints the ones whose picture is out of date (`key` says when the ink,
   * the layout, the size or the look changed). A tile that is already right is
   * not touched, so scrolling costs nothing here. `idle` (the page is at
   * rest) also gives spare canvases back.
   */
  syncTiles(
    doc: InkDoc,
    layout: PageLayout,
    o: RenderOptions,
    key: string,
    lo: number,
    hi: number,
    pageH: number,
    idle = false,
  ): void {
    const count = Math.max(1, Math.ceil(pageH / TILE_H))
    const first = Math.min(count - 1, Math.max(0, Math.floor(lo / TILE_H)))
    const last = Math.min(count - 1, Math.max(first, Math.floor(hi / TILE_H)))
    // A tile leaves only a tile's height beyond the range it joined at, so
    // a page that is scrolled back and forth does not paint tiles again.
    for (const t of [...this.tiles.values()]) {
      if (t.index >= first - 1 && t.index <= last + 1) continue
      if (t.slot) this.freeSlot(t.slot)
      this.tiles.delete(t.index)
    }
    let items: Item[] | null = null
    let changed = false
    for (let i = first; i <= last; i++) {
      const h = Math.max(1, Math.min(TILE_H, Math.ceil(pageH - i * TILE_H)))
      const tkey = `${key}|${this.width}|${this.dpr}|${h}`
      let t = this.tiles.get(i)
      if (!t) {
        t = { index: i, slot: null, key: '' }
        this.tiles.set(i, t)
      }
      if (t.key === tkey) continue
      t.key = tkey
      changed = true
      items ??= this.collect(doc, layout, o)
      this.paintTile(t, items, o, h, first, last)
    }
    if (idle) {
      const free = this.slots.filter((x) => x.index === -1)
      for (const sl of free.slice(SPARE_SLOTS)) this.dropSlot(sl)
    }
    if (changed || idle) {
      reserve(
        this.budgetId,
        canvasBytes(this.live.width, this.live.height) + this.tileBytes(),
      )
    }
  }

  private collect(doc: InkDoc, layout: PageLayout, o: RenderOptions): Item[] {
    const items: Item[] = []
    for (const layer of doc.layers) {
      if (layer.hidden) continue
      for (const p of doc.strokesOf(layer.id)) {
        if (o.hidden.has(p.stroke.id)) continue
        const frame = layout.frame(p.blockId)
        const r = strokeRect(p.stroke, frame)
        if (!r) continue
        items.push({
          stroke: p.stroke,
          frame,
          r,
          behind: p.stroke.kind === 'highlight' && !!p.stroke.style.behind,
        })
      }
    }
    return items
  }

  private paintTile(
    t: Tile,
    items: Item[],
    o: RenderOptions,
    h: number,
    from: number,
    to: number,
  ): void {
    const { dpr } = this
    const y0 = t.index * TILE_H
    const y1 = y0 + h
    const hl: Item[] = []
    const ink: Item[] = []
    for (const it of items) {
      if (it.r.y > y1 || it.r.y + it.r.h < y0) continue
      ;(it.behind ? hl : ink).push(it)
    }
    if (hl.length + ink.length === 0) {
      if (t.slot) this.freeSlot(t.slot)
      t.slot = null
      return
    }
    const sl = this.takeSlot(t.index, from, to)
    if (!sl) return
    t.slot = sl
    sl.index = t.index
    const st = sl.el.style
    st.display = ''
    st.transform = `translateY(${y0}px)`
    st.width = `${this.width}px`
    st.height = `${h}px`
    const W = Math.round(this.width * dpr)
    const H = Math.round(h * dpr)
    for (const [name, list] of [
      ['hl', hl],
      ['ink', ink],
    ] as const) {
      if (list.length === 0) {
        this.removePlane(sl, name)
        continue
      }
      const pl = this.plane(sl, name)
      if (!pl) continue
      if (pl.canvas.width !== W || pl.canvas.height !== H) {
        pl.canvas.width = W
        pl.canvas.height = H
      } else {
        pl.ctx.clearRect(0, 0, W, H)
      }
      if (name === 'hl') {
        pl.canvas.style.mixBlendMode = o.night ? 'normal' : 'multiply'
        pl.canvas.style.opacity = o.night ? '0.6' : '1'
      }
      const target: Target = { ctx: pl.ctx, top: y0, dpr }
      for (const it of list) paintStroke(target, it.stroke, it.frame)
    }
  }
}
