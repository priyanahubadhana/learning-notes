import { prefStore } from '../app/tools/store'

/**
 * The layer each page draws on, remembered on this device: { pageId: layerId }.
 * At most 400 pages are kept (the oldest are dropped); values are checked on
 * read, and a layer that no longer exists is ignored by the caller.
 */
export const MAX_ENTRIES = 400

const isMap = (v: unknown): v is Record<string, string> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every((x) => typeof x === 'string') &&
  Object.keys(v).length <= MAX_ENTRIES

export const activeLayerPref = prefStore<Record<string, string>>(
  'ink.activeLayer',
  isMap,
  {},
)

/** The remembered layer of a page, if it is one of `layerIds`. */
export function readActiveLayer(
  pageId: string,
  layerIds: readonly string[],
): string | null {
  const id = activeLayerPref.get()[pageId]
  return id && layerIds.includes(id) ? id : null
}

/** Remembers the layer of a page (newest last; the oldest beyond 400 go). */
export function writeActiveLayer(pageId: string, layerId: string | null): void {
  const next = { ...activeLayerPref.get() }
  delete next[pageId]
  if (layerId) next[pageId] = layerId
  const keys = Object.keys(next)
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)))
    delete next[k]
  activeLayerPref.set(next)
}
