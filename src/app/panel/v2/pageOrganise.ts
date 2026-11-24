/**
 * Pure plans for organising a notebook's pages in the left panel (NB-B42..B47,
 * NB-B43, NB-P42). No database and no screen here: a plan is a list of small
 * steps the service then applies, and the Undo is the plan run backwards.
 */

/** What a plan needs to know about a page. */
export interface PageLite {
  id: string
  parentId: string | null
}

/** A page as one row of the list (reading order, sub-pages right below). */
export interface FlatRow<T extends PageLite = PageLite> {
  page: T
  depth: number
}

/** One step: put `id` at `toIndex` among the other children of `parentId`. */
export interface MoveOp {
  id: string
  parentId: string | null
  toIndex: number
}

/** Pages (already sorted by order) as a flat list: each page, then its sub-pages. */
export function flattenPages<T extends PageLite>(
  pages: readonly T[],
): FlatRow<T>[] {
  const children = new Map<string | null, T[]>()
  for (const p of pages) {
    const list = children.get(p.parentId) ?? []
    list.push(p)
    children.set(p.parentId, list)
  }
  const out: FlatRow<T>[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const page of children.get(parentId) ?? []) {
      out.push({ page, depth })
      walk(page.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

/** Ids of the pages under `id` (its sub-pages at any depth), in list order. */
export function subtreeOf(rows: readonly FlatRow[], id: string): string[] {
  const at = rows.findIndex((r) => r.page.id === id)
  if (at < 0) return []
  const out: string[] = []
  for (let i = at + 1; i < rows.length && rows[i].depth > rows[at].depth; i++)
    out.push(rows[i].page.id)
  return out
}

/** The picked pages that have no picked page above them (the ones to act on). */
export function topPicked(
  rows: readonly FlatRow[],
  picked: ReadonlySet<string>,
): string[] {
  const out: string[] = []
  let skipDepth = Infinity
  for (const r of rows) {
    if (r.depth > skipDepth) continue
    skipDepth = Infinity
    if (picked.has(r.page.id)) {
      out.push(r.page.id)
      skipDepth = r.depth
    }
  }
  return out
}

/** Ids of the children of `parentId`, in order. */
export function childIds(
  rows: readonly FlatRow[],
  parentId: string | null,
): string[] {
  return rows.filter((r) => r.page.parentId === parentId).map((r) => r.page.id)
}

/**
 * The steps that turn the order `current` into `wanted` (same ids), one per
 * page that is out of place. Each step is placed among the OTHER children,
 * like `movePage`, and they are meant to be applied in this order.
 */
export function opsToOrder(
  parentId: string | null,
  current: readonly string[],
  wanted: readonly string[],
): MoveOp[] {
  const at = new Map(current.map((id, i) => [id, i]))
  const seq = wanted.map((id) => at.get(id) ?? -1)
  // Pages already in the right order among themselves stay; only the others move.
  const stay = new Set(longestRun(seq).map((i) => wanted[i]))
  const list = [...current]
  const ops: MoveOp[] = []
  wanted.forEach((id, i) => {
    if (stay.has(id) || !at.has(id)) return
    list.splice(list.indexOf(id), 1)
    const toIndex = i === 0 ? 0 : list.indexOf(wanted[i - 1]) + 1
    list.splice(toIndex, 0, id)
    ops.push({ id, parentId, toIndex })
  })
  return ops
}

/** Indexes of one longest strictly increasing run of `seq` (negatives ignored). */
function longestRun(seq: readonly number[]): number[] {
  const tails: number[] = [] // index into seq of the smallest tail per length
  const back: number[] = new Array<number>(seq.length).fill(-1)
  seq.forEach((v, i) => {
    if (v < 0) return
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (seq[tails[mid]] < v) lo = mid + 1
      else hi = mid
    }
    back[i] = lo > 0 ? tails[lo - 1] : -1
    tails[lo] = i
  })
  const out: number[] = []
  for (let i = tails.at(-1) ?? -1; i >= 0; i = back[i]) out.push(i)
  return out.reverse()
}

export interface MovePlan {
  ops: MoveOp[]
  /** The steps that put everything back (for Undo). */
  undo: MoveOp[]
}

const NONE: MovePlan = { ops: [], undo: [] }

/** A plan that sets the children of `parentId` to the order `wanted`. */
export function planOrder(
  rows: readonly FlatRow[],
  parentId: string | null,
  wanted: readonly string[],
): MovePlan {
  const current = childIds(rows, parentId)
  const ops = opsToOrder(parentId, current, wanted)
  if (ops.length === 0) return NONE
  return { ops, undo: opsToOrder(parentId, wanted, current) }
}

/**
 * Move earlier (`-1`) or later (`1`): every picked page steps past the
 * neighbour it has on that side, within its own parent. Picked pages that sit
 * together stay together; the first one stays put at the very top.
 */
export function planShift(
  rows: readonly FlatRow[],
  picked: ReadonlySet<string>,
  dir: -1 | 1,
): MovePlan {
  const parents = new Set<string | null>()
  for (const r of rows) if (picked.has(r.page.id)) parents.add(r.page.parentId)
  const ops: MoveOp[] = []
  const undo: MoveOp[] = []
  for (const parentId of parents) {
    const current = childIds(rows, parentId)
    const wanted = [...current]
    const order = wanted.map((_, i) => (dir === -1 ? i : wanted.length - 1 - i))
    for (const i of order) {
      const j = i + dir
      if (!picked.has(wanted[i]) || j < 0 || j >= wanted.length) continue
      if (picked.has(wanted[j])) continue
      ;[wanted[i], wanted[j]] = [wanted[j], wanted[i]]
    }
    const one = planOrder(rows, parentId, wanted)
    ops.push(...one.ops)
    undo.unshift(...one.undo)
  }
  return ops.length === 0 ? NONE : { ops, undo }
}

/** Can the pages move earlier / later at all? (Controls the buttons.) */
export function canShift(
  rows: readonly FlatRow[],
  picked: ReadonlySet<string>,
  dir: -1 | 1,
): boolean {
  return planShift(rows, picked, dir).ops.length > 0
}

function isUnder(
  byId: ReadonlyMap<string, FlatRow>,
  id: string,
  ancestor: string,
): boolean {
  for (
    let p = byId.get(id)?.page.parentId ?? null;
    p !== null;
    p = byId.get(p)?.page.parentId ?? null
  ) {
    if (p === ancestor) return true
  }
  return false
}

/**
 * Is the drop slot good? `order` is the list of ids as it would look if the
 * dragged page `id` were dropped there (its sub-pages stay where they are on
 * screen). A page may only land among its own brothers and sisters: not
 * inside another page's sub-pages, and not into one of its own (edge case in
 * the spec). A slot that changes nothing is not good either, so the keys
 * skip it.
 */
export function canLand(
  byId: ReadonlyMap<string, FlatRow>,
  id: string,
  order: readonly string[],
  original: readonly string[],
  windowStart: number,
): boolean {
  const me = byId.get(id)
  if (!me) return false
  const own = new Set(order.filter((x) => isUnder(byId, x, id)))
  const filtered = order.filter((x) => !own.has(x))
  const before = original.filter((x) => !own.has(x))
  const at = filtered.indexOf(id)
  if (at < 0) return false
  const unchanged = filtered.every((x, i) => x === before[i])
  if (unchanged) return order.every((x, i) => x === original[i])
  const prev = at > 0 ? byId.get(filtered[at - 1]) : undefined
  const next = byId.get(filtered[at + 1] ?? '')
  if (next && next.depth > me.depth) return false // inside another page's sub-pages
  if (!prev) return me.page.parentId === null || windowStart > 0
  if (prev.page.id === me.page.parentId) return true
  return prev.depth >= me.depth
}

/**
 * A drop: the dragged page `id` ends at `toIndex` of the on-screen slice
 * `windowIds` (a stretch of the list starting at row `windowStart`). Gives
 * the new order of its brothers and sisters, or null if nothing changes.
 */
export function planDrop(
  rows: readonly FlatRow[],
  windowStart: number,
  windowIds: readonly string[],
  id: string,
  toIndex: number,
): (MovePlan & { parentId: string | null }) | null {
  const from = windowIds.indexOf(id)
  if (from < 0) return null
  const slice = [...windowIds]
  slice.splice(from, 1)
  slice.splice(Math.max(0, Math.min(slice.length, toIndex)), 0, id)
  const all = rows.map((r) => r.page.id)
  const full = [
    ...all.slice(0, windowStart),
    ...slice,
    ...all.slice(windowStart + windowIds.length),
  ]
  const me = rows.find((r) => r.page.id === id)
  if (!me) return null
  const parentId = me.page.parentId
  const parentOf = new Map(rows.map((r) => [r.page.id, r.page.parentId]))
  const wanted = full.filter((x) => parentOf.get(x) === parentId)
  const plan = planOrder(rows, parentId, wanted)
  return plan.ops.length === 0 ? null : { ...plan, parentId }
}

export interface DeletePlan {
  /** The pages to move to Trash (each with its sub-pages). */
  roots: string[]
  /** How many pages go in all (sub-pages included). */
  total: number
  /** The notebook would be left without a page: refuse. */
  blocked: boolean
}

/** NB-B44: Delete never takes the notebook's last page. */
export function planDelete(
  rows: readonly FlatRow[],
  picked: ReadonlySet<string>,
): DeletePlan {
  const roots = topPicked(rows, picked)
  let total = 0
  for (const id of roots) total += 1 + subtreeOf(rows, id).length
  return { roots, total, blocked: roots.length > 0 && total >= rows.length }
}

/** One copy to make: `sourceId` (with its sub-pages) goes right after itself. */
export interface CopyStep {
  sourceId: string
  parentId: string | null
  toIndex: number
}

/** NB-B45: each picked page is copied right after its original. */
export function planDuplicate(
  rows: readonly FlatRow[],
  picked: ReadonlySet<string>,
): CopyStep[] {
  const steps: CopyStep[] = []
  // Last to first, so an earlier copy never shifts a later position.
  for (const id of topPicked(rows, picked).reverse()) {
    const row = rows.find((r) => r.page.id === id)
    if (!row) continue
    const at = childIds(rows, row.page.parentId).indexOf(id)
    steps.push({ sourceId: id, parentId: row.page.parentId, toIndex: at + 1 })
  }
  return steps
}

/** "X copy": the name of a duplicate. */
export function copyName(name: string, suffix: string): string {
  return `${name} ${suffix}`.trim()
}

/** The page to open after the current one goes: the next one, else the one before. */
export function pageAfterDelete(
  rows: readonly FlatRow[],
  gone: ReadonlySet<string>,
  current: string,
): string | null {
  const at = rows.findIndex((r) => r.page.id === current)
  for (let i = Math.max(0, at); i < rows.length; i++)
    if (!gone.has(rows[i].page.id)) return rows[i].page.id
  for (let i = at; i >= 0; i--)
    if (!gone.has(rows[i].page.id)) return rows[i].page.id
  return null
}

/** Which rows of a long list to draw: a screenful and a few more each side. */
export function rowWindow(
  count: number,
  rowHeight: number,
  scrollTop: number,
  viewport: number,
  overscan = 4,
): { from: number; to: number } {
  const from = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const to = Math.min(
    count,
    Math.ceil((scrollTop + viewport) / rowHeight) + overscan,
  )
  return { from: Math.min(from, count), to: Math.max(from, to) }
}
