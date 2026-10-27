import type { JsonValue } from '../core/types'

/**
 * A copy of JSON data with ids replaced: every string equal to an old id,
 * and every object key equal to one (cell values are stored by column id),
 * becomes its new id. Ids are long random strings, so ordinary text never
 * matches by accident.
 */
export function remapJson<T extends JsonValue>(
  value: T,
  ids: ReadonlyMap<string, string>,
): T {
  const walk = (v: JsonValue): JsonValue => {
    if (typeof v === 'string') return ids.get(v) ?? v
    if (Array.isArray(v)) return v.map(walk)
    if (v !== null && typeof v === 'object') {
      const out: Record<string, JsonValue> = {}
      for (const [key, item] of Object.entries(v)) {
        // A "__proto__" key from a file must never reach an object's prototype.
        if (key === '__proto__') continue
        out[ids.get(key) ?? key] = walk(item)
      }
      return out
    }
    return v
  }
  return walk(value) as T
}
