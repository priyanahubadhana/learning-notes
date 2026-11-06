import { createId } from '../core/ids'
import type { InkLayer } from '../core/inkTypes'
import { orderBetween } from '../core/order'
import type { Edit, Placed } from './inkDoc'

/** Layer rules, as pure functions on a page's layer list. */

export const MAX_LAYERS = 2
export const MAX_NAME = 40

export const liveLayers = (layers: readonly InkLayer[]): InkLayer[] =>
  layers
    .filter((l) => l.deletedAt === null && l.purgedAt === undefined)
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))

/** A new layer on top of the others. */
export function newLayer(
  pageId: string,
  layers: readonly InkLayer[],
  name: string,
  now = Date.now(),
): InkLayer {
  const live = liveLayers(layers)
  const last = live.length > 0 ? live[live.length - 1].order : null
  return {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    pageId,
    name: name.slice(0, MAX_NAME),
    order: orderBetween(last, null),
  }
}

export const canAddLayer = (layers: readonly InkLayer[]): boolean =>
  liveLayers(layers).length < MAX_LAYERS

export function rename(
  layer: InkLayer,
  name: string,
  now = Date.now(),
): InkLayer {
  const clean = name.trim().slice(0, MAX_NAME)
  return clean === '' || clean === layer.name
    ? layer
    : { ...layer, name: clean, updatedAt: now }
}

export function setHidden(
  layer: InkLayer,
  hidden: boolean,
  now = Date.now(),
): InkLayer {
  const next: InkLayer = { ...layer, updatedAt: now }
  if (hidden) next.hidden = true
  else delete next.hidden
  return next
}

export function setLocked(
  layer: InkLayer,
  locked: boolean,
  now = Date.now(),
): InkLayer {
  const next: InkLayer = { ...layer, updatedAt: now }
  if (locked) next.locked = true
  else delete next.locked
  return next
}

/** A layer's `order` after moving it one place up (towards the top) or down. */
export function moved(
  layers: readonly InkLayer[],
  id: string,
  direction: 'up' | 'down',
  now = Date.now(),
): InkLayer | null {
  const live = liveLayers(layers)
  const i = live.findIndex((l) => l.id === id)
  if (i < 0) return null
  if (direction === 'up') {
    if (i >= live.length - 1) return null
    const after = live[i + 1]
    const beyond = live[i + 2]?.order ?? null
    return {
      ...live[i],
      order: orderBetween(after.order, beyond),
      updatedAt: now,
    }
  }
  if (i === 0) return null
  const before = live[i - 1]
  const under = live[i - 2]?.order ?? null
  return {
    ...live[i],
    order: orderBetween(under, before.order),
    updatedAt: now,
  }
}

/** Soft delete (Undo brings it back). */
export const removed = (layer: InkLayer, now = Date.now()): InkLayer => ({
  ...layer,
  deletedAt: now,
  updatedAt: now,
})

/** What the doc must offer for layer merges (InkDoc does). */
export interface LayerSource {
  layers: readonly InkLayer[]
  strokesOf: (layerId: string) => Placed[]
}

/**
 * Moves every stroke of `fromId` into `intoId` and puts `fromId` away. One
 * edit, so one Undo step. Null when either layer is missing or they are the same.
 */
export function mergeLayers(
  doc: LayerSource,
  fromId: string,
  intoId: string,
  now = Date.now(),
): Edit | null {
  const from = doc.layers.find((l) => l.id === fromId)
  const into = doc.layers.find((l) => l.id === intoId)
  if (!from || !into || from.id === into.id) return null
  const moving = doc.strokesOf(from.id)
  const layers: Edit['layers'] = [{ before: from, after: removed(from, now) }]
  // The merged ink must stay editable: a locked or hidden target is opened up
  // in the same edit (Undo puts it back), so no stroke is left stuck.
  if (into.locked || into.hidden) {
    layers.push({
      before: into,
      after: setHidden(setLocked(into, false, now), false, now),
    })
  }
  return {
    del: moving,
    add: moving.map((p) => ({ ...p, layerId: into.id })),
    layers,
  }
}

/** Layers beyond the two that new pages have (old pages could have more). */
export const extraLayers = (layers: readonly InkLayer[]): InkLayer[] =>
  liveLayers(layers).slice(MAX_LAYERS)

/** Merges every extra layer into "Layer 2" (the second from the bottom) in one edit. */
export function mergeExtras(doc: LayerSource, now = Date.now()): Edit | null {
  const live = liveLayers(doc.layers)
  if (live.length <= MAX_LAYERS) return null
  const into = live[MAX_LAYERS - 1]
  const edit: Edit = { del: [], add: [], layers: [] }
  for (const extra of live.slice(MAX_LAYERS)) {
    const part = mergeLayers(doc, extra.id, into.id, now)
    if (!part) continue
    edit.del.push(...part.del)
    edit.add.push(...part.add)
    edit.layers.push(...part.layers)
  }
  return edit
}

export type NoLayer = 'locked' | 'hidden'

/**
 * The layer a stroke goes to: the active one (the chosen layer, else the top
 * visible, unlocked one). A locked or hidden active layer draws nothing and
 * says why. No layers yet is fine: one is made on the first stroke.
 */
export function layerForDrawing(
  layers: readonly InkLayer[],
  chosen: string | null,
):
  | { layer: InkLayer; reason?: undefined }
  | { layer: null; reason: NoLayer; named: InkLayer | null } {
  const live = liveLayers(layers)
  const pick =
    live.find((l) => l.id === chosen) ??
    [...live].reverse().find((l) => !l.locked && !l.hidden) ??
    live[live.length - 1]
  if (!pick) return { layer: null, reason: 'locked', named: null }
  if (pick.locked) return { layer: null, reason: 'locked', named: pick }
  if (pick.hidden) return { layer: null, reason: 'hidden', named: pick }
  return { layer: pick }
}

/**
 * The layer the eraser works on: the active one, unless it is locked or hidden
 * (then it cannot hold anything to erase, and the eraser works on every layer
 * that is shown and unlocked, so ink is never left stuck). Null = every layer.
 */
export function eraserLayer(
  layers: readonly InkLayer[],
  chosen: string | null,
): InkLayer | null {
  const active = activeLayerOf(layers, chosen)
  return active && !active.locked && !active.hidden ? active : null
}

/** The active layer for display: the chosen one, else the top one. */
export function activeLayerOf(
  layers: readonly InkLayer[],
  chosen: string | null,
): InkLayer | null {
  const live = liveLayers(layers)
  return (
    live.find((l) => l.id === chosen) ??
    [...live].reverse().find((l) => !l.locked && !l.hidden) ??
    live[live.length - 1] ??
    null
  )
}
