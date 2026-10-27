import type { LearningNotesDB } from '../core/db'
import { newRecordFields } from '../core/records'
import type { StoredImage } from '../core/types'
import { t } from '../i18n/t'
import { MAX_IMAGE_BYTES, isImageType } from './imageRef'

/** What is wrong with a picture that cannot be added. */
export class ImageError extends Error {}

/** A picture after any shrinking: what is stored. */
export interface PreparedImage {
  type: string
  width: number
  height: number
  data: ArrayBuffer
}

/**
 * Checks and stores a picture. `prepare` shrinks it (browser only; see
 * shrinkImage.ts); without it the file is stored as it is.
 */
export async function saveImage(
  db: LearningNotesDB,
  file: Blob & { name?: string },
  prepare?: (file: Blob) => Promise<PreparedImage>,
): Promise<StoredImage> {
  if (!isImageType(file.type)) throw new ImageError(t('image.badType'))
  if (file.size > MAX_IMAGE_BYTES) throw new ImageError(t('image.tooBig'))
  const prepared = prepare
    ? await prepare(file)
    : { type: file.type, width: 0, height: 0, data: await file.arrayBuffer() }
  const image: StoredImage = {
    ...newRecordFields(),
    name: (file.name ?? 'picture').slice(0, 200),
    ...prepared,
  }
  await db.images.add(image)
  return image
}

const urls = new Map<string, string>()

/**
 * A web-page URL for a stored picture (an object URL, kept for the life of
 * the page), or null if it is missing.
 */
export async function imageObjectUrl(
  db: LearningNotesDB,
  id: string,
): Promise<string | null> {
  const known = urls.get(id)
  if (known) return known
  const image = await db.images.get(id)
  if (!image || image.deletedAt !== null) return null
  const url = URL.createObjectURL(new Blob([image.data], { type: image.type }))
  urls.set(id, url)
  return url
}
