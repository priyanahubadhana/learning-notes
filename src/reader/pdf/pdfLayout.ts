/**
 * Pure maths of the PDF page column: where each page sits, which pages to
 * draw, and how a reading position (page + fraction down the page) maps to a
 * scroll offset and back. No browser needed, so it is unit tested.
 */

/** Gap between pages (CSS px). */
export const PAGE_GAP = 12

export interface PageSize {
  w: number
  h: number
}

export interface Layout {
  /** Top of each page from the start of the column (CSS px). */
  tops: number[]
  /** Height of each page. */
  heights: number[]
  total: number
}

/** Stacks the pages top to bottom at `scale`. */
export function layoutPages(
  sizes: readonly PageSize[],
  scale: number,
  gap: number = PAGE_GAP,
): Layout {
  const tops: number[] = []
  const heights: number[] = []
  let y = gap
  for (const s of sizes) {
    tops.push(y)
    const h = s.h * scale
    heights.push(h)
    y += h + gap
  }
  return { tops, heights, total: y }
}

/** The pages (indexes) to draw: those near the visible band, plus `margin` viewports. */
export function visibleRange(
  layout: Layout,
  scrollTop: number,
  viewHeight: number,
  margin = 1,
): [number, number] {
  const n = layout.tops.length
  if (n === 0) return [0, -1]
  const from = scrollTop - viewHeight * margin
  const to = scrollTop + viewHeight * (1 + margin)
  let first = n
  let last = -1
  for (let i = 0; i < n; i++) {
    const bottom = layout.tops[i] + layout.heights[i]
    if (bottom >= from && layout.tops[i] <= to) {
      if (first === n) first = i
      last = i
    } else if (layout.tops[i] > to) break
  }
  return first === n ? [0, -1] : [first, last]
}

/** Scroll offset that puts `y` (0 to 1) of page `page` (1-based) at the top. */
export function offsetForLocator(
  layout: Layout,
  page: number,
  y: number,
): number {
  const i = Math.min(Math.max(page, 1), layout.tops.length) - 1
  if (i < 0) return 0
  return Math.max(
    0,
    layout.tops[i] + layout.heights[i] * Math.min(1, Math.max(0, y)) - PAGE_GAP,
  )
}

/** The page (1-based) and fraction down it at a scroll offset. */
export function locatorAt(
  layout: Layout,
  scrollTop: number,
): { page: number; y: number } {
  const n = layout.tops.length
  if (n === 0) return { page: 1, y: 0 }
  const probe = scrollTop + PAGE_GAP
  let i = 0
  for (let k = 0; k < n; k++) {
    // A pixel of slack: the browser rounds scrollTop, so a jump to a page
    // must not land a hair above it and report the page before.
    if (layout.tops[k] <= probe + 1) i = k
    else break
  }
  const y = (probe - layout.tops[i]) / (layout.heights[i] || 1)
  return { page: i + 1, y: Math.min(1, Math.max(0, y)) }
}

/** Reading progress 0 to 1 from the locator. */
export function progressOf(page: number, y: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  return Math.min(1, Math.max(0, (page - 1 + y) / pageCount))
}

/** A scale that fits the page width into `containerWidth` (minus side padding). */
export function fitWidthScale(
  containerWidth: number,
  pageWidth: number,
  padding = 24,
): number {
  return Math.max(0.1, (containerWidth - padding) / pageWidth)
}

/**
 * Page-by-page mode: the scale that fits a whole page on one screen (width
 * and height), leaving a gap above and below so the next page never peeks in.
 * With no height yet it falls back to fit width.
 */
export function fitPageScale(
  containerWidth: number,
  containerHeight: number,
  size: PageSize,
  gap: number = PAGE_GAP,
  padding = 24,
): number {
  const byWidth = fitWidthScale(containerWidth, size.w, padding)
  if (containerHeight <= 0) return byWidth
  const byHeight = Math.max(0.1, (containerHeight - 2 * gap) / size.h)
  return Math.min(byWidth, byHeight)
}

/** Largest scale that keeps one canvas under `maxPixels` (16.7 M by default). */
export function capScale(
  scale: number,
  size: PageSize,
  dpr: number,
  maxPixels = 16_700_000,
): number {
  const px = size.w * scale * dpr * (size.h * scale * dpr)
  if (px <= maxPixels) return scale
  return scale * Math.sqrt(maxPixels / px)
}

// ---- Rectangles ----

/** A box in page fractions: x, y, w, h each 0 to 1. */
export type Rect4 = [number, number, number, number]

/** A client rect as a fraction of the page box it lies on. */
export function toFractions(
  r: { left: number; top: number; width: number; height: number },
  box: { left: number; top: number; width: number; height: number },
): Rect4 {
  const c = (v: number) => Math.min(1, Math.max(0, v))
  return [
    c((r.left - box.left) / box.width),
    c((r.top - box.top) / box.height),
    c(r.width / box.width),
    c(r.height / box.height),
  ]
}

/**
 * Merges the many small rects of a selection: those on the same line (similar
 * top and height, touching or overlapping) become one. Drops specks.
 */
export function mergeRects(rects: readonly Rect4[]): Rect4[] {
  const sorted = rects
    .filter(([, , w, h]) => w > 0.002 && h > 0.002)
    .map((r) => [...r] as Rect4)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
  const out: Rect4[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    const sameLine =
      last &&
      Math.abs(last[1] - r[1]) < Math.min(last[3], r[3]) * 0.5 &&
      r[0] <= last[0] + last[2] + 0.01
    if (sameLine) {
      const right = Math.max(last[0] + last[2], r[0] + r[2])
      const bottom = Math.max(last[1] + last[3], r[1] + r[3])
      last[0] = Math.min(last[0], r[0])
      last[1] = Math.min(last[1], r[1])
      last[2] = right - last[0]
      last[3] = bottom - last[1]
    } else out.push(r)
  }
  return out
}

/** Flattens rect groups into the stored `rects` number list. */
export const flattenRects = (rects: readonly Rect4[]): number[] =>
  rects.flatMap((r) => r.map((n) => Math.round(n * 10000) / 10000))

/** Groups the stored `rects` list back into rects. */
export function groupRects(flat: readonly number[]): Rect4[] {
  const out: Rect4[] = []
  for (let i = 0; i + 3 < flat.length; i += 4) {
    out.push([flat[i], flat[i + 1], flat[i + 2], flat[i + 3]])
  }
  return out
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3

const clampZoom = (z: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

/** How much to scale the pages while two fingers spread by `spread` (1 = no change), kept inside 50 to 300 %. */
export const pinchRatio = (zoom: number, spread: number): number =>
  clampZoom(zoom * spread) / zoom

/** The zoom to keep when the fingers lift: within limits, in steps of 5 %. */
export const roundZoom = (z: number): number =>
  Math.round(clampZoom(z) * 20) / 20
