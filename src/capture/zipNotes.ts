import { strFromU8, unzipSync } from 'fflate'
import { MAX_IMAGE_BYTES } from '../images/imageRef'
import { MAX_NOTES_CHARS } from './notesFormat'

/**
 * A zip made on the PC (see docs/recipes/notes-from-video.md): `notes.md` in
 * the ln-notes/1 format plus `images/*.png|jpg|webp|gif` (key frames). Read
 * with the same guards as backups: size, entry count, expanded size, and the
 * picture type decided by its first bytes.
 */

export const MAX_NOTES_ZIP_BYTES = 200 * 1024 * 1024
export const MAX_NOTES_ZIP_ENTRIES = 500
export const MAX_NOTES_ZIP_EXPANDED = 300 * 1024 * 1024
export const MAX_NOTES_IMAGES = 200

export class NotesZipError extends Error {}

const TYPES: [string, (b: Uint8Array) => boolean][] = [
  [
    'image/png',
    (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  ],
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/gif', (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46],
  [
    'image/webp',
    (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  ],
]

/** The picture type of some bytes, or null. */
export function imageTypeOf(bytes: Uint8Array): string | null {
  return TYPES.find(([, is]) => is(bytes))?.[0] ?? null
}

export interface NotesZip {
  markdown: string
  images: { name: string; blob: Blob }[]
}

/** Opens a notes zip. Throws `NotesZipError` for anything unsafe or missing. */
export function readNotesZip(bytes: Uint8Array): NotesZip {
  if (bytes.length > MAX_NOTES_ZIP_BYTES) throw new NotesZipError('too big')
  let total = 0
  let count = 0
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes, {
      filter: (f) => {
        if (++count > MAX_NOTES_ZIP_ENTRIES) throw new NotesZipError('entries')
        total += f.originalSize
        if (total > MAX_NOTES_ZIP_EXPANDED) throw new NotesZipError('expanded')
        const name = f.name.toLowerCase()
        return (
          name === 'notes.md' ||
          (name.startsWith('images/') && f.originalSize <= MAX_IMAGE_BYTES)
        )
      },
    })
  } catch (e) {
    if (e instanceof NotesZipError) throw e
    throw new NotesZipError('damaged')
  }
  const notesName = Object.keys(files).find(
    (n) => n.toLowerCase() === 'notes.md',
  )
  if (!notesName) throw new NotesZipError('no notes.md')
  const md = files[notesName]
  if (md.length > MAX_NOTES_CHARS) throw new NotesZipError('notes too big')
  const images: NotesZip['images'] = []
  for (const [path, data] of Object.entries(files)) {
    if (path === notesName || images.length >= MAX_NOTES_IMAGES) continue
    const type = imageTypeOf(data)
    const base = (path.split('/').pop() ?? '').toLowerCase()
    if (!type || !base) continue
    images.push({
      name: base,
      blob: new Blob([data.slice().buffer as ArrayBuffer], { type }),
    })
  }
  return { markdown: strFromU8(md), images }
}
