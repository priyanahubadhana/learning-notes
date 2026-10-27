/**
 * Pictures chosen from this device are kept in the app's own storage and
 * written into notes and cells as a short reference, "lnimg:<id>", never as
 * a file path or a web address.
 */
export const IMAGE_SCHEME = 'lnimg:'

const REF =
  /^lnimg:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** The reference text for a stored picture. */
export const imageRef = (id: string): string => `${IMAGE_SCHEME}${id}`

/** The picture id in a reference, or null if the text is not one. */
export function parseImageRef(text: string): string | null {
  return REF.exec(text.trim())?.[1].toLowerCase() ?? null
}

/** Kinds of picture that can be added (no SVG: it can carry scripts). */
export const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const

/** Largest file accepted (bytes). Bigger pictures are shrunk when stored. */
export const MAX_IMAGE_BYTES = 25_000_000

/** Longest side of a stored picture, in pixels (larger ones are shrunk). */
export const MAX_IMAGE_SIDE = 1600

export const isImageType = (type: string): boolean =>
  (IMAGE_TYPES as readonly string[]).includes(type)

/** Every picture id referenced anywhere in some JSON data. */
export function imageIdsIn(
  value: unknown,
  found = new Set<string>(),
): Set<string> {
  if (typeof value === 'string') {
    const id = parseImageRef(value)
    if (id) found.add(id)
  } else if (Array.isArray(value)) {
    for (const item of value) imageIdsIn(item, found)
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) imageIdsIn(item, found)
  }
  return found
}

/** A copy of JSON data with picture references pointing at new ids. */
export function remapImageRefs<T>(
  value: T,
  ids: ReadonlyMap<string, string>,
): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const id = parseImageRef(v)
      const next = id && ids.get(id)
      return next ? imageRef(next) : v
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v).map(([k, item]) => [k, walk(item)]),
      )
    }
    return v
  }
  return walk(value) as T
}
