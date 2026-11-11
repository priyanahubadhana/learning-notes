/**
 * `fromWire` from src/sync/wire.ts, for Deno (that file imports the app's
 * base64 helper without an extension). Bytes stored as `{ $b, k }` become
 * typed arrays; everything else is plain data. Checked in parity.test.ts.
 */
import { fromBase64 } from './e2e.ts'

export function fromWire(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(fromWire)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (
      typeof o.$b === 'string' &&
      typeof o.k === 'string' &&
      Object.keys(o).length === 2
    ) {
      const bytes = fromBase64(o.$b)
      const buf = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer
      switch (o.k) {
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
