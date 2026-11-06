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
 * Three stacked canvases over the page text:
 *  - `hl`   highlights drawn behind the ink (blended like a real highlighter);
 *  - `ink`  every visible layer, put together from one cached bitmap per layer;
 *  - `live` only the stroke being drawn (low latency, `desynchronized`).
 * The canvases cover just the part of the page that is on screen, so a very
 * long page never makes a huge canvas (iPad Safari refuses about 16 million
 * pixels). A layer's bitmap is a little taller than the screen, so scrolling
 * only moves it; strokes are drawn again only when the ink or the layout
 * changes, or the screen leaves the bitmap.
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
export function cachedStroke(stroke: Stroke): Cached | null {
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

interface Bitmap {
  canvas: HTMLCanvasElement
  key: string
  top: number
  height: number
}

/** The most pixels one layer bitmap may have. */
const MAX_BITMAP_PIXELS = 6_000_000

export interface RenderOptions {
  /** Strokes not painted (the ones being moved by the lasso). */
  hidden: ReadonlySet<string>
  /** Night theme: highlights are plain see-through instead of blended. */
  night: boolean
}

let rendererCount = 0

export class InkRenderer {
  private readonly budgetId = `ink-${++rendererCount}`
  readonly root: HTMLDivElement
  readonly hl: HTMLCanvasElement
  readonly ink: HTMLCanvasElement
  readonly live: HTMLCanvasElement
  private hlCtx: CanvasRenderingContext2D
  private inkCtx: CanvasRenderingContext2D
  readonly liveCtx: CanvasRenderingContext2D
  private bitmaps = new Map<string, Bitmap>()
  dpr = 1
  /** Top edge of the visible part, in page px, and its size. */
  top = 0
  width = 1
  height = 1

  constructor(lowLatency: boolean) {
    this.root = document.createElement('div')
    this.root.setAttribute('data-ink-canvases', '')
    Object.assign(this.root.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
      willChange: 'transform',
    })
    const make = (name: string, desync = false) => {
      const c = document.createElement('canvas')
      c.setAttribute('data-ink-canvas', name)
      Object.assign(c.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      })
      this.root.append(c)
      const ctx = c.getContext('2d', desync ? { desynchronized: true } : {})
      if (!ctx) throw new Error('No canvas')
      return [c, ctx] as const
    }
    ;[this.hl, this.hlCtx] = make('highlights')
    ;[this.ink, this.inkCtx] = make('ink')
    ;[this.live, this.liveCtx] = make('live', lowLatency)
  }

  /** Sets which part of the page is on screen. Returns true if anything moved. */
  setView(top: number, width: number, height: number, dpr: number): boolean {
    dpr = clampDpr(dpr)
    // Over the memory budget: draw at 1x rather than turn blank.
    if (
      !reserve(
        this.budgetId,
        3 * canvasBytes(width * dpr, height * dpr) + this.bitmapBytes(),
      )
    ) {
      dpr = 1
      reserve(this.budgetId, 3 * canvasBytes(width, height))
    }
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))
    const sizeChanged =
      w !== this.width || h !== this.height || dpr !== this.dpr
    this.top = top
    this.dpr = dpr
    this.root.style.transform = `translate3d(0, ${top}px, 0)`
    if (sizeChanged) {
      this.width = w
      this.height = h
      this.root.style.width = `${w}px`
      this.root.style.height = `${h}px`
      for (const c of [this.hl, this.ink, this.live]) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
      }
      this.bitmaps.clear()
    }
    return sizeChanged
  }

  private bitmapBytes(): number {
    let n = 0
    for (const b of this.bitmaps.values())
      n += canvasBytes(b.canvas.width, b.canvas.height)
    return n
  }

  /** Gives the canvases' memory back (the page closed). */
  dispose(): void {
    for (const c of [this.hl, this.ink, this.live]) c.width = c.height = 0
    for (const b of this.bitmaps.values()) b.canvas.width = b.canvas.height = 0
    this.bitmaps.clear()
    release(this.budgetId)
  }

  /** Forgets cached bitmaps (when layers are removed). */
  dropBitmaps(): void {
    this.bitmaps.clear()
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

  /** Paints the finished ink: highlights behind, then each visible layer. */
  draw(doc: InkDoc, layout: PageLayout, o: RenderOptions): void {
    const { dpr } = this
    const viewTop = this.top
    const viewBottom = viewTop + this.height
    const blend = o.night ? 'normal' : 'multiply'
    this.hl.style.mixBlendMode = blend
    this.hl.style.opacity = o.night ? '0.6' : '1'
    this.hlCtx.clearRect(0, 0, this.hl.width, this.hl.height)
    this.inkCtx.clearRect(0, 0, this.ink.width, this.ink.height)
    const hlTarget: Target = { ctx: this.hlCtx, top: viewTop, dpr }
    const seen = new Set<string>()
    for (const layer of doc.layers) {
      if (layer.hidden) continue
      const strokes = doc.strokesOf(layer.id)
      if (strokes.length === 0) continue
      seen.add(layer.id)
      for (const p of strokes) {
        if (o.hidden.has(p.stroke.id)) continue
        if (p.stroke.kind !== 'highlight' || !p.stroke.style.behind) continue
        const frame = layout.frame(p.blockId)
        const r = strokeRect(p.stroke, frame)
        if (!r || r.y > viewBottom || r.y + r.h < viewTop) continue
        paintStroke(hlTarget, p.stroke, frame)
      }
      const bmp = this.layerBitmap(doc, layout, layer.id, strokes, o)
      if (bmp) {
        this.inkCtx.drawImage(
          bmp.canvas,
          0,
          Math.round((bmp.top - viewTop) * dpr),
        )
      }
    }
    for (const id of [...this.bitmaps.keys()]) {
      if (!seen.has(id)) this.bitmaps.delete(id)
    }
  }

  private layerBitmap(
    doc: InkDoc,
    layout: PageLayout,
    layerId: string,
    strokes: ReturnType<InkDoc['strokesOf']>,
    o: RenderOptions,
  ): Bitmap | null {
    const { dpr } = this
    const key = `${doc.layerVersion(layerId)}|${layout.version}|${[...o.hidden].join(',')}|${this.width}x${this.height}`
    const viewTop = this.top
    const viewBottom = viewTop + this.height
    let bmp = this.bitmaps.get(layerId)
    if (
      bmp &&
      bmp.key === key &&
      bmp.top <= viewTop &&
      bmp.top + bmp.height >= viewBottom
    ) {
      return bmp
    }
    // A bitmap a little taller than the screen, within the pixel budget.
    const maxH = MAX_BITMAP_PIXELS / (this.width * dpr * dpr)
    const height = Math.max(this.height, Math.min(this.height * 1.5, maxH))
    const spare = (height - this.height) / 2
    const top = Math.max(0, viewTop - spare)
    if (!bmp) {
      bmp = { canvas: document.createElement('canvas'), key, top, height }
      this.bitmaps.set(layerId, bmp)
    }
    bmp.key = key
    bmp.top = top
    bmp.height = height
    bmp.canvas.width = Math.round(this.width * dpr)
    bmp.canvas.height = Math.round(height * dpr)
    reserve(
      this.budgetId,
      3 * canvasBytes(this.width * dpr, this.height * dpr) + this.bitmapBytes(),
    )
    const ctx = bmp.canvas.getContext('2d')
    if (!ctx) return null
    const target: Target = { ctx, top, dpr }
    const bottom = top + height
    for (const p of strokes) {
      if (o.hidden.has(p.stroke.id)) continue
      if (p.stroke.kind === 'highlight' && p.stroke.style.behind) continue
      const frame = layout.frame(p.blockId)
      const r = strokeRect(p.stroke, frame)
      if (!r || r.y > bottom || r.y + r.h < top) continue
      paintStroke(target, p.stroke, frame)
    }
    return bmp
  }
}
