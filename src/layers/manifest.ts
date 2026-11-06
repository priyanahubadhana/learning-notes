import { BundleError, checkBundle, type Bundle } from '../share/bundle'
import { t } from '../i18n/t'

/**
 * I2 · A layer is a normal notebook file (share/bundle.ts) with one extra
 * key, `layer`, naming it: `{ id, version, name, description, adds }`.
 * Everything in a layer file is checked before anything is added: the
 * bundle by `checkBundle`, the manifest here, with every size capped.
 */

export interface LayerManifest {
  /** Stable name of the layer ("finance-tracker"); installing twice is refused. */
  id: string
  version: number
  name: string
  description: string
  /** Short lines for "what it adds". */
  adds: string[]
}

export interface LayerFile {
  manifest: LayerManifest
  bundle: Bundle
}

export const LAYER_ID = /^[a-z0-9][a-z0-9-]{0,63}$/
export const MAX_LAYER_NAME = 80
export const MAX_LAYER_TEXT = 400
export const MAX_LAYER_ADDS = 12

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** The manifest of a parsed layer file, or a `BundleError`. */
export function checkManifest(data: unknown): LayerManifest {
  const bad = () => new BundleError(t('layers.err.manifest'))
  if (!isObject(data)) throw bad()
  const { id, version, name, description, adds } = data
  if (typeof id !== 'string' || !LAYER_ID.test(id)) throw bad()
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 1 ||
    version > 1_000_000
  ) {
    throw bad()
  }
  if (
    typeof name !== 'string' ||
    name.trim() === '' ||
    name.length > MAX_LAYER_NAME
  ) {
    throw bad()
  }
  if (typeof description !== 'string' || description.length > MAX_LAYER_TEXT) {
    throw bad()
  }
  if (
    !Array.isArray(adds) ||
    adds.length > MAX_LAYER_ADDS ||
    !adds.every((a) => typeof a === 'string' && a.length <= 120)
  ) {
    throw bad()
  }
  return { id, version, name: name.trim(), description, adds: [...adds] }
}

/** Parses a layer file's text; nothing is written. */
export function readLayerFile(text: string): LayerFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BundleError(t('err.notJson'))
  }
  if (!isObject(data) || data.layer === undefined) {
    throw new BundleError(t('layers.err.notLayer'))
  }
  const manifest = checkManifest(data.layer)
  return { manifest, bundle: checkBundle(data) }
}
