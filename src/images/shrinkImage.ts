import { MAX_IMAGE_SIDE } from './imageRef'
import type { PreparedImage } from './imageService'

/**
 * Shrinks a picture in the browser: the longest side is at most
 * `MAX_IMAGE_SIDE` and it is stored as WebP (a GIF is kept as it is, so it
 * keeps moving). Falls back to the original if the browser cannot decode it.
 */
export async function shrinkImage(file: Blob): Promise<PreparedImage> {
  const original = async (width = 0, height = 0): Promise<PreparedImage> => ({
    type: file.type,
    width,
    height,
    data: await file.arrayBuffer(),
  })
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    if (file.type === 'image/gif') {
      bitmap.close()
      return original(width, height)
    }
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.86),
    )
    // Keep the smaller of the two.
    if (blob && blob.size < file.size) {
      return {
        type: 'image/webp',
        width: w,
        height: h,
        data: await blob.arrayBuffer(),
      }
    }
    return original(width, height)
  } catch {
    return original()
  }
}
