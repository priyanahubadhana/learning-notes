import { unzipSync, strFromU8 } from 'fflate'

/**
 * Book file types: told apart by their first bytes, never by the file name or
 * the type the browser claims. Pure; shared by the Library import and by the
 * backup checks.
 */
export type BookFormat = 'pdf' | 'epub' | 'docx'

export const BOOK_MIME: Record<BookFormat, string> = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

/** Largest book file accepted (bytes): 300 MB. */
export const MAX_BOOK_BYTES = 300 * 1024 * 1024

export const formatOfMime = (mime: unknown): BookFormat | null =>
  (Object.keys(BOOK_MIME) as BookFormat[]).find((f) => BOOK_MIME[f] === mime) ??
  null

/** A PDF starts with `%PDF` (some files have a few bytes before it). */
export function isPdfBytes(b: Uint8Array): boolean {
  const head = b.subarray(0, 1024)
  for (let i = 0; i + 4 <= head.length; i++) {
    if (
      head[i] === 0x25 &&
      head[i + 1] === 0x50 &&
      head[i + 2] === 0x44 &&
      head[i + 3] === 0x46
    ) {
      return true
    }
  }
  return false
}

/** A zip starts with `PK\x03\x04`. */
export const isZipBytes = (b: Uint8Array): boolean =>
  b.length > 4 &&
  b[0] === 0x50 &&
  b[1] === 0x4b &&
  b[2] === 0x03 &&
  b[3] === 0x04

/**
 * The format of a file's bytes, or null. For a zip, only the entries needed
 * are read: EPUB has a `mimetype` file saying `application/epub+zip`; DOCX has
 * `word/document.xml`.
 */
export function detectBookFormat(bytes: Uint8Array): BookFormat | null {
  if (isPdfBytes(bytes)) return 'pdf'
  if (!isZipBytes(bytes)) return null
  try {
    const files = unzipSync(bytes, {
      filter: (f) => f.name === 'mimetype' || f.name === 'word/document.xml',
    })
    if (files['mimetype']) {
      return strFromU8(files['mimetype']).trim() === 'application/epub+zip'
        ? 'epub'
        : null
    }
    return files['word/document.xml'] ? 'docx' : null
  } catch {
    return null
  }
}

/** Cheap check for a stored book (restore): the first bytes fit the format. */
export function bytesFitFormat(bytes: Uint8Array, format: BookFormat): boolean {
  if (bytes.length === 0) return true // "Notes only" kept the row without bytes
  return format === 'pdf' ? isPdfBytes(bytes) : isZipBytes(bytes)
}
