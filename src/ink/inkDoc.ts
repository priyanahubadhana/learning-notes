import { createId } from '../core/ids'
import {
  CHUNK_MAX,
  type InkChunk,
  type InkFallback,
  type InkLayer,
  type InkSnapshot,
  type Stroke,
} from '../core/inkTypes'
import { liveLayers } from './layers'

/**
 * The ink of one open page, in memory. Strokes are immutable objects (an
 * edit makes new ones), so drawing caches can be keyed by the stroke.
 *
 * Every change is an `Edit` (strokes taken away and put in, layer changes).
 * `apply` and `revert` are exact opposites, which is what makes Undo and
 * Redo simple and what the eraser, lasso and layers all share.
 */

/** A stroke and where it lives. */
export interface Placed {
  layerId: string
  blockId: string | null
  stroke: Stroke
}

export interface LayerChange {
  before?: InkLayer
  after?: InkLayer
}

export interface Edit {
  del: Placed[]
  add: Placed[]
  layers: LayerChange[]
}

export const emptyEdit = (): Edit => ({ del: [], add: [], layers: [] })
export const isEmptyEdit = (e: Edit): boolean =>
  e.del.length === 0 && e.add.length === 0 && e.layers.length === 0

export type SaveFn = (
  layers: InkLayer[],
  chunks: InkChunk[],
) => Promise<void> | void

export interface DocOptions {
  pageId: string
  data: InkSnapshot
  save: SaveFn
  /** Wait before saving after a change (ms). */
  delay?: number
  now?: () => number
}

const live = (c: { deletedAt: number | null; purgedAt?: number }) =>
  c.deletedAt === null && c.purgedAt === undefined

/** Every ink document that is open now (for the soft refresh: save them all). */
const open = new Set<InkDoc>()

/** True while any open ink document has changes not written yet. */
export const inkHasUnsaved = (): boolean => [...open].some((d) => d.dirty)

/** Writes every open ink document now. */
export async function flushAllInk(): Promise<void> {
  await Promise.all([...open].map((d) => d.flush()))
}

export class InkDoc {
  readonly pageId: string
  /** Raised on every change (layers, strokes). */
  version = 0
  /** The layer new ink goes to (null = the top unlocked layer). */
  chosenLayer: string | null = null

  private layerMap = new Map<string, InkLayer>()
  private chunkMap = new Map<string, InkChunk>()
  private where = new Map<string, string>() // stroke id -> chunk id
  private dirtyChunks = new Set<string>()
  private dirtyLayers = new Set<string>()
  private fallbacks = new Map<string, InkFallback>()
  private sorted = new Map<string, Placed[]>()
  private layerVer = new Map<string, number>()
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private saving: Promise<void> = Promise.resolve()
  private readonly save: SaveFn
  private readonly delay: number
  private readonly now: () => number

  constructor(o: DocOptions) {
    this.pageId = o.pageId
    this.save = o.save
    this.delay = o.delay ?? 400
    this.now = o.now ?? Date.now
    open.add(this)
    for (const l of o.data.layers) this.layerMap.set(l.id, l)
    for (const c of o.data.chunks) {
      this.chunkMap.set(c.id, c)
      if (live(c)) for (const s of c.strokes) this.where.set(s.id, c.id)
    }
  }

  // ---- Reading ----

  get layers(): InkLayer[] {
    return liveLayers([...this.layerMap.values()])
  }

  layer(id: string): InkLayer | undefined {
    const l = this.layerMap.get(id)
    return l && live(l) ? l : undefined
  }

  /** Changes each time this layer's strokes or look change (a cache key). */
  layerVersion(layerId: string): number {
    return this.layerVer.get(layerId) ?? 0
  }

  private bump(layerId: string): void {
    this.layerVer.set(layerId, (this.layerVer.get(layerId) ?? 0) + 1)
  }

  /** Strokes of a layer, oldest first (the order they are painted). */
  strokesOf(layerId: string): Placed[] {
    const known = this.sorted.get(layerId)
    if (known) return known
    const out: Placed[] = []
    for (const c of this.chunkMap.values()) {
      if (c.layerId !== layerId || !live(c)) continue
      for (const stroke of c.strokes) {
        out.push({ layerId, blockId: c.blockId, stroke })
      }
    }
    out.sort((a, b) =>
      a.stroke.at !== b.stroke.at
        ? a.stroke.at - b.stroke.at
        : a.stroke.id < b.stroke.id
          ? -1
          : 1,
    )
    this.sorted.set(layerId, out)
    return out
  }

  /** Every stroke of every live layer. */
  all(): Placed[] {
    return this.layers.flatMap((l) => this.strokesOf(l.id))
  }

  find(strokeId: string): Placed | undefined {
    const chunk = this.chunkMap.get(this.where.get(strokeId) ?? '')
    const stroke = chunk?.strokes.find((s) => s.id === strokeId)
    return chunk && stroke
      ? { layerId: chunk.layerId, blockId: chunk.blockId, stroke }
      : undefined
  }

  get strokeCount(): number {
    return this.where.size
  }

  /** Blocks that hold ink (their positions must be measured). */
  anchorBlocks(): Set<string> {
    const out = new Set<string>()
    for (const c of this.chunkMap.values()) {
      if (live(c) && c.blockId && c.strokes.length > 0) out.add(c.blockId)
    }
    return out
  }

  /** Where a block was last seen, for ink whose block is gone. */
  fallbackOf(blockId: string): InkFallback | undefined {
    const known = this.fallbacks.get(blockId)
    if (known) return known
    for (const c of this.chunkMap.values()) {
      if (c.blockId === blockId && c.fb) return c.fb
    }
    return undefined
  }

  /** Remembers where a block is now (saved later, with its chunks). */
  noteBlock(blockId: string, fb: InkFallback): void {
    const old = this.fallbackOf(blockId)
    // The picture's first width stays the reference for ever.
    const mw = old?.mw ?? fb.mw
    fb = mw ? { ...fb, mw } : fb
    if (
      old &&
      old.mw === fb.mw &&
      Math.abs(old.x - fb.x) < 2 &&
      Math.abs(old.y - fb.y) < 2 &&
      Math.abs(old.w - fb.w) < 2
    ) {
      return
    }
    this.fallbacks.set(blockId, fb)
    for (const c of this.chunkMap.values()) {
      if (c.blockId === blockId && live(c)) this.dirtyChunks.add(c.id)
    }
    this.schedule(3000)
  }

  // ---- Changing ----

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private changed(): void {
    this.version++
    for (const fn of this.listeners) fn()
  }

  private chunkFor(layerId: string, blockId: string | null): InkChunk {
    let best: InkChunk | undefined
    for (const c of this.chunkMap.values()) {
      if (!live(c) || c.layerId !== layerId || c.blockId !== blockId) continue
      if (c.strokes.length < CHUNK_MAX) best = c
    }
    if (best) return best
    const t = this.now()
    const fresh: InkChunk = {
      id: createId(),
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
      pageId: this.pageId,
      layerId,
      blockId,
      strokes: [],
    }
    this.chunkMap.set(fresh.id, fresh)
    return fresh
  }

  private setChunk(chunk: InkChunk, strokes: Stroke[]): void {
    const t = this.now()
    const fb = chunk.blockId ? this.fallbacks.get(chunk.blockId) : undefined
    const next: InkChunk = {
      ...chunk,
      strokes,
      updatedAt: t,
      ...(fb ? { fb } : {}),
      // An empty chunk is put away (soft delete), not left as a blank row.
      deletedAt: strokes.length === 0 ? t : null,
    }
    this.chunkMap.set(next.id, next)
    this.dirtyChunks.add(next.id)
    this.bump(next.layerId)
  }

  /** Changes the doc exactly as `edit` says. */
  apply(edit: Edit): void {
    this.move(edit.del, edit.add)
    for (const ch of edit.layers) {
      const next =
        ch.after ??
        (ch.before ? { ...ch.before, deletedAt: this.now() } : undefined)
      if (next) this.putLayer(next)
    }
    this.finish()
  }

  /** Takes `edit` back. */
  revert(edit: Edit): void {
    this.move(edit.add, edit.del)
    for (const ch of edit.layers) {
      const prev =
        ch.before ??
        (ch.after ? { ...ch.after, deletedAt: this.now() } : undefined)
      if (prev) this.putLayer(prev)
    }
    this.finish()
  }

  private finish(): void {
    this.sorted.clear()
    this.changed()
    this.schedule(this.delay)
  }

  private putLayer(l: InkLayer): void {
    this.layerMap.set(l.id, { ...l, updatedAt: this.now() })
    this.dirtyLayers.add(l.id)
    this.bump(l.id)
  }

  private move(remove: Placed[], insert: Placed[]): void {
    const byChunk = new Map<string, Set<string>>()
    for (const p of remove) {
      const cid = this.where.get(p.stroke.id)
      if (!cid) continue
      const set = byChunk.get(cid) ?? new Set<string>()
      set.add(p.stroke.id)
      byChunk.set(cid, set)
      this.where.delete(p.stroke.id)
    }
    for (const [cid, ids] of byChunk) {
      const c = this.chunkMap.get(cid)!
      this.setChunk(
        c,
        c.strokes.filter((s) => !ids.has(s.id)),
      )
    }
    for (const p of insert) {
      if (this.where.has(p.stroke.id)) continue
      const c = this.chunkFor(p.layerId, p.blockId)
      this.setChunk(c, [...c.strokes, p.stroke])
      this.where.set(p.stroke.id, c.id)
    }
  }

  /** Adds a layer (no Undo step; pass an Edit to `apply` for that). */
  addLayer(l: InkLayer): void {
    this.putLayer(l)
    this.finish()
  }

  /** Chooses the layer new ink goes to. */
  chooseLayer(id: string | null): void {
    this.chosenLayer = id
    this.onChoose?.(id)
  }

  /** Told when the user chooses a layer (the surface remembers it). */
  onChoose: ((id: string | null) => void) | undefined

  /** Changes a layer's look (hide, lock, name) without an undo step. */
  patchLayer(l: InkLayer): void {
    this.putLayer(l)
    this.finish()
  }

  // ---- Saving ----

  private schedule(wait: number): void {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), wait)
  }

  get dirty(): boolean {
    return this.dirtyChunks.size + this.dirtyLayers.size > 0
  }

  /** Writes what changed. Safe to call any time; calls queue up. */
  flush(): Promise<void> {
    clearTimeout(this.timer)
    if (!this.dirty) return this.saving
    const layers = [...this.dirtyLayers]
      .map((id) => this.layerMap.get(id))
      .filter((l): l is InkLayer => !!l)
    const chunks = [...this.dirtyChunks]
      .map((id) => this.chunkMap.get(id))
      .filter((c): c is InkChunk => !!c)
    this.dirtyLayers.clear()
    this.dirtyChunks.clear()
    this.saving = this.saving
      .then(() => this.save(layers, chunks))
      .catch((e: unknown) => {
        // Put it back so the next flush tries again.
        for (const l of layers) this.dirtyLayers.add(l.id)
        for (const c of chunks) this.dirtyChunks.add(c.id)
        console.error('Could not save ink', e)
      })
    return this.saving
  }

  dispose(): Promise<void> {
    open.delete(this)
    clearTimeout(this.timer)
    this.listeners.clear()
    return this.flush()
  }
}
