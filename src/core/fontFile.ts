import type { StoredFont } from './types'

/** Biggest font file we keep (10 MB). */
export const MAX_FONT_BYTES = 10 * 1024 * 1024

/**
 * Which kind of font a file is, judged by its first four bytes (never by its
 * name): "OTTO" = OpenType (CFF), 00 01 00 00 or "true" = TrueType,
 * "wOF2" = WOFF2. Anything else, or a file that is too big or too small, is
 * not accepted.
 */
export function fontFormat(bytes: Uint8Array): StoredFont['format'] | null {
  if (bytes.byteLength < 12 || bytes.byteLength > MAX_FONT_BYTES) return null
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  if (tag === 'OTTO') return 'otf'
  if (tag === 'wOF2') return 'woff2'
  if (tag === 'true' || tag === '\u0000\u0001\u0000\u0000') return 'ttf'
  return null
}

/** The shown name of an imported font: its file name without the ending. */
export function fontNameOf(fileName: string): string {
  const base = fileName.replace(/\.[A-Za-z0-9]{2,5}$/, '').trim()
  return (base || 'Font').slice(0, 60)
}
