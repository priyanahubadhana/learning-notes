import * as b64 from '../core/base64'

/**
 * Turns a stored record into JSON-safe data and back (L7): bytes
 * (ArrayBuffer, typed arrays) become `{ $b: base64, k: kind }`. Everything
 * else is already plain data.
 */

type Kind = 'ab' | 'u8' | 'f32' | 'f64' | 'i16' | 'u16'

function kindOf(v: unknown): Kind | null {
  if (v instanceof ArrayBuffer) return 'ab'
  if (v instanceof Uint8Array) return 'u8'
  if (v instanceof Float32Array) return 'f32'
  if (v instanceof Float64Array) return 'f64'
  if (v instanceof Int16Array) return 'i16'
  if (v instanceof Uint16Array) return 'u16'
  return null
}

export function toWire(v: unknown): unknown {
  const k = kindOf(v)
  if (k) {
    const view = v as ArrayBufferView | ArrayBuffer
    const buf =
      view instanceof ArrayBuffer
        ? view
        : (view.buffer.slice(
            view.byteOffset,
            view.byteOffset + view.byteLength,
          ) as ArrayBuffer)
    return { $b: b64.toBase64(buf), k }
  }
  if (Array.isArray(v)) return v.map(toWire)
  if (v && typeof v === 'object') {
    if (v instanceof Blob) return null // not used by synced tables
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(v)) {
      if (value !== undefined) out[key] = toWire(value)
    }
    return out
  }
  return v
}

export function fromWire(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(fromWire)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (
      typeof o.$b === 'string' &&
      typeof o.k === 'string' &&
      Object.keys(o).length === 2
    ) {
      const buf = b64.fromBase64(o.$b)
      switch (o.k as Kind) {
        case 'ab':
          return buf
        case 'u8':
          return new Uint8Array(buf)
        case 'f32':
          return new Float32Array(buf)
        case 'f64':
          return new Float64Array(buf)
        case 'i16':
          return new Int16Array(buf)
        case 'u16':
          return new Uint16Array(buf)
      }
    }
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(o)) out[key] = fromWire(value)
    return out
  }
  return v
}
