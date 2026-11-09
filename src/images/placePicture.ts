import type { LearningNotesDB } from '../core/db'
import { imageRef } from './imageRef'
import type { PlaceOptions } from './pictureChooserStore'
import { ImageError, saveImage } from './imageService'
import { requestPictureSelect } from './pictureSelect'
import { shrinkImage } from './shrinkImage'

/** The few editor calls a picture needs (keeps this file out of the schema). */
export interface PictureHost {
  getTextCursorPosition: () => { block: unknown }
  replaceBlocks: (remove: never[], add: never[]) => unknown
  insertBlocks: (blocks: never[], ref: never, placement: 'after') => unknown
  updateBlock: (block: never, update: never) => unknown
  document: { id: string }[]
  setTextCursorPosition: (block: never, placement: 'start') => void
  focus: () => void
}

/**
 * Stores a chosen picture and puts it in the page. With `blockId` it fills
 * that (empty) picture block; otherwise it goes on the cursor's line (on it
 * when the line is empty), else below it. Returns an error message for a
 * picture that cannot be used, or null.
 */
export async function placePicture(
  db: LearningNotesDB,
  editor: PictureHost,
  file: File,
  blockId?: string,
  /** Called with the new picture's reference (the editor adds a video-time caption). */
  onSaved?: (ref: string) => void,
  /** Where and how big (from the placement preview). */
  place?: PlaceOptions,
): Promise<string | null> {
  try {
    const saved = await saveImage(db, file, shrinkImage)
    const props: Record<string, unknown> = { url: imageRef(saved.id) }
    onSaved?.(props.url as string)
    if (place?.width) props.previewWidth = Math.round(place.width)
    if (place?.align && place.align !== 'left') {
      props.textAlignment = place.align
    }
    if (blockId) {
      editor.updateBlock(blockId as never, { props } as never)
      requestPictureSelect(blockId)
      return null
    }
    const target = place?.afterId
      ? editor.document.find((b) => b.id === place.afterId)
      : undefined
    const current = (target ?? editor.getTextCursorPosition().block) as {
      type: string
      content?: unknown
    }
    const block = { type: 'image' as const, props }
    const emptyLine =
      current.type === 'paragraph' &&
      Array.isArray(current.content) &&
      current.content.length === 0
    const inserted = (
      emptyLine
        ? (
            editor.replaceBlocks([current as never], [block as never]) as {
              insertedBlocks: { id: string }[]
            }
          ).insertedBlocks
        : editor.insertBlocks([block as never], current as never, 'after')
    ) as { id: string }[]
    // Like the other blocks: the cursor lands on the line below the picture
    // (a new one when the picture is last), so typing carries on.
    const last = inserted[inserted.length - 1]
    let below =
      editor.document[editor.document.findIndex((b) => b.id === last.id) + 1]
    if (!below) {
      below = (
        editor.insertBlocks(
          [{ type: 'paragraph' } as never],
          last as never,
          'after',
        ) as {
          id: string
        }[]
      )[0]
    }
    editor.setTextCursorPosition(below as never, 'start')
    editor.focus()
    // The new picture is selected at once, so its Picture strip shows.
    requestPictureSelect(last.id)
    return null
  } catch (error) {
    if (error instanceof ImageError) return error.message
    throw error
  }
}
