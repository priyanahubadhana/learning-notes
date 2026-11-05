import { createId } from '../core/ids'
import type { InkLayer } from '../core/inkTypes'
import { orderBetween } from '../core/order'

/** Layer rules, as pure functions on a page's layer list. */

export const MAX_LAYERS = 12
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

/** The layer new ink goes to: the chosen one if usable, else the topmost unlocked. */
export function drawingLayer(
  layers: readonly InkLayer[],
  chosen: string | null,
): InkLayer | null {
  const live = liveLayers(layers)
  const pick = live.find((l) => l.id === chosen)
  if (pick && !pick.locked && !pick.hidden) return pick
  const open = [...live].reverse().find((l) => !l.locked && !l.hidden)
  return open ?? null
}
