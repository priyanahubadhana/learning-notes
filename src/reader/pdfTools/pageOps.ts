import type { Annotation, AnnotationAnchor, PageSource } from '../../core/types'
import type { InkChunk, Stroke } from '../../core/inkTypes'

/**
 * PDF page operations (Q8): the plan for reordering, rotating, deleting and
 * adding pages, and how everything that points at a page (highlights, notes,
 * bookmarks, ink, the reading place) follows it. Pure data: no PDF library,
 * no database, so it is easy to test.
 */

export type Turn = 0 | 90 | 180 | 270

/** One page of the new file: an old page (1 to n) or a blank one (`from: null`). */
export interface PlanItem {
  from: number | null
  /** Extra clockwise turn on top of the old page's own turn. */
  turn: Turn
}

export type PagePlan = PlanItem[]

/** Displayed size of an old page in points (its own turn already applied). */
export interface PageSize {
  w: number
  h: number
}

export const identityPlan = (n: number): PagePlan =>
  Array.from({ length: n }, (_, i) => ({ from: i + 1, turn: 0 }))

export const addTurn = (turn: Turn, by: 90 | -90): Turn =>
  ((((turn + by) % 360) + 360) % 360) as Turn

/** True when the plan changes nothing. */
export function isIdentity(plan: PagePlan, oldCount: number): boolean {
  return (
    plan.length === oldCount &&
    plan.every((p, i) => p.from === i + 1 && p.turn === 0)
  )
}

/** Moves one item to a new place (drag and drop, or the move buttons). */
export function movePage(plan: PagePlan, from: number, to: number): PagePlan {
  if (from === to || from < 0 || from >= plan.length) return plan
  const next = plan.slice()
  const [item] = next.splice(from, 1)
  next.splice(Math.min(Math.max(to, 0), next.length), 0, item!)
  return next
}

export const removePages = (plan: PagePlan, at: readonly number[]): PagePlan =>
  plan.filter((_, i) => !at.includes(i))

/** A blank page after position `after` (`-1` = first). */
export function insertBlank(plan: PagePlan, after: number): PagePlan {
  const next = plan.slice()
  next.splice(after + 1, 0, { from: null, turn: 0 })
  return next
}

export function turnPages(
  plan: PagePlan,
  at: readonly number[],
  by: 90 | -90,
): PagePlan {
  return plan.map((p, i) =>
    at.includes(i) ? { ...p, turn: addTurn(p.turn, by) } : p,
  )
}

/** What happened to one old page. */
export interface PageFate {
  /** Its new number (1 to n). */
  to: number
  turn: Turn
}

/** Old page number to its fate; a page that is not in the plan was deleted. */
export function fateMap(plan: PagePlan): Map<number, PageFate> {
  const map = new Map<number, PageFate>()
  plan.forEach((p, i) => {
    if (p.from !== null && !map.has(p.from)) {
      map.set(p.from, { to: i + 1, turn: p.turn })
    }
  })
  return map
}

// ---- Rectangles (highlights and notes), 0 to 1 of the page ----

/** Groups of x, y, w, h turned clockwise by `turn`. */
export function turnRects(rects: readonly number[], turn: Turn): number[] {
  if (turn === 0) return rects.slice()
  const out: number[] = []
  for (let i = 0; i + 3 < rects.length; i += 4) {
    const x = rects[i]!
    const y = rects[i + 1]!
    const w = rects[i + 2]!
    const h = rects[i + 3]!
    if (turn === 90) out.push(1 - y - h, x, h, w)
    else if (turn === 180) out.push(1 - x - w, 1 - y - h, w, h)
    else out.push(y, 1 - x - w, h, w)
  }
  return out
}

/**
 * The anchor after the edit, or null when its page was deleted. Anchors that
 * are not on a PDF page are returned as they are.
 */
export function mapAnchor(
  anchor: AnnotationAnchor,
  fates: Map<number, PageFate>,
): AnnotationAnchor | null {
  if (anchor.type !== 'pdf') return anchor
  const fate = fates.get(anchor.page)
  if (!fate) return null
  return {
    ...anchor,
    page: fate.to,
    rects: turnRects(anchor.rects, fate.turn),
  }
}

export interface AnnotationChange {
  id: string
  /** The new anchor, or null = delete (its page is gone). */
  anchor: AnnotationAnchor | null
}

/** Which annotations move and which go. Unchanged ones are left out. */
export function mapAnnotations(
  list: readonly Annotation[],
  fates: Map<number, PageFate>,
): AnnotationChange[] {
  const out: AnnotationChange[] = []
  for (const a of list) {
    const old = a.anchor
    if (old.type !== 'pdf') continue
    const anchor = mapAnchor(old, fates)
    const same =
      anchor?.type === 'pdf' &&
      anchor.page === old.page &&
      anchor.rects.every((v, i) => v === old.rects[i])
    if (!same) out.push({ id: a.id, anchor })
  }
  return out
}

// ---- Ink ----

const PDF_BLOCK = /^pdf:(\d{1,6})$/

/** The ink block id of a page number. */
export const inkBlockOf = (page: number): string => `pdf:${page}`

/**
 * A stroke turned with its page. Points are in page widths from the page
 * corner; `aspect` is the page height over its width before the turn. Shapes
 * keep their form (one scale in both directions), and the pen width follows
 * the page new scale.
 */
export function turnStroke(s: Stroke, turn: Turn, aspect: number): Stroke {
  if (turn === 0 || !(aspect > 0)) return s
  const r = 1 / aspect
  const pts = s.pts.slice()
  for (let i = 0; i + 1 < pts.length; i += 6) {
    const x = pts[i]!
    const y = pts[i + 1]!
    if (turn === 90) {
      pts[i] = 1 - y * r
      pts[i + 1] = x * r
    } else if (turn === 180) {
      pts[i] = 1 - x
      pts[i + 1] = aspect - y
    } else {
      pts[i] = y * r
      pts[i + 1] = r * (1 - x)
    }
  }
  const scale = turn === 180 ? 1 : r
  return { ...s, pts, style: { ...s.style, width: s.style.width * scale } }
}

export interface InkChange {
  id: string
  /** The new block id, or null = delete (its page is gone). */
  blockId: string | null
  strokes?: Stroke[]
}

/** Which ink chunks move, turn or go. Unchanged ones are left out. */
export function mapInk(
  chunks: readonly InkChunk[],
  fates: Map<number, PageFate>,
  sizes: readonly PageSize[],
): InkChange[] {
  const out: InkChange[] = []
  for (const c of chunks) {
    const m = PDF_BLOCK.exec(c.blockId ?? '')
    if (!m) continue
    const page = Number(m[1])
    const fate = fates.get(page)
    if (!fate) {
      out.push({ id: c.id, blockId: null })
      continue
    }
    const size = sizes[page - 1]
    const turned =
      fate.turn !== 0 && size
        ? c.strokes.map((s) => turnStroke(s, fate.turn, size.h / size.w))
        : undefined
    if (fate.to !== page || turned) {
      out.push({
        id: c.id,
        blockId: inkBlockOf(fate.to),
        ...(turned ? { strokes: turned } : {}),
      })
    }
  }
  return out
}

// ---- The reading place ----

/** `pdf:<page>:<y>` after the edit; a deleted page falls back to the nearest. */
export function mapLocator(
  at: string | undefined,
  fates: Map<number, PageFate>,
  newCount: number,
): string | undefined {
  const m = at ? /^pdf:(\d{1,6}):(.+)$/.exec(at) : null
  if (!m) return at
  const fate = fates.get(Number(m[1]))
  const page = fate
    ? fate.to
    : Math.min(Math.max(1, Number(m[1])), Math.max(1, newCount))
  return `pdf:${page}:${fate ? m[2] : '0'}`
}

export function mapSource(
  source: PageSource,
  fates: Map<number, PageFate>,
  newCount: number,
): PageSource {
  const out: PageSource = { ...source, pageCount: newCount }
  const at = mapLocator(source.at, fates, newCount)
  if (at) out.at = at
  const far = mapLocator(source.furthestAt, fates, newCount)
  if (far) out.furthestAt = far
  return out
}

/** The size of a blank page: that of its nearest neighbour in the plan. */
export function blankSize(
  plan: PagePlan,
  at: number,
  sizes: readonly PageSize[],
): PageSize {
  const fallback: PageSize = { w: 595.28, h: 841.89 }
  for (let d = 1; d < plan.length; d++) {
    for (const i of [at - d, at + d]) {
      const item = plan[i]
      if (!item?.from) continue
      const s = sizes[item.from - 1]
      if (!s) continue
      return item.turn === 90 || item.turn === 270 ? { w: s.h, h: s.w } : s
    }
  }
  return fallback
}
