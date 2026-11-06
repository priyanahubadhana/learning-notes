import { useSyncExternalStore } from 'react'
import { parseImageRef } from './imageRef'

/**
 * Opening the picture editor from anywhere (the block menu, the selection
 * toolbar). The host (`PictureEditorHost`) shows the sheet.
 *
 * The editor is a plain object here (only `getBlock`, `updateBlock` and
 * `insertBlocks` are used), so this file stays out of the schema's types.
 */

export interface PictureEditorTarget {
  getBlock: (
    id: string,
  ) => { id: string; type: string; props?: unknown } | undefined
  updateBlock: (id: string, update: unknown) => unknown
  insertBlocks: (blocks: unknown[], ref: string, placement: 'after') => unknown
}

export interface PictureRequest {
  editor: PictureEditorTarget
  blockId: string
}

let current: PictureRequest | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Opens the editor for a picture block. */
export function openPictureEditor(
  editor: PictureEditorTarget,
  blockId: string,
): void {
  current = { editor, blockId }
  emit()
}

export function closePictureEditor(): void {
  current = null
  emit()
}

/** The open request, if any. */
export const usePictureRequest = (): PictureRequest | null =>
  useSyncExternalStore(subscribe, () => current)

/** The picture id a block shows, or null. */
export function blockImageId(
  editor: PictureEditorTarget,
  blockId: string,
): string | null {
  const block = editor.getBlock(blockId)
  if (!block || block.type !== 'image') return null
  const url = (block.props as { url?: unknown } | undefined)?.url
  return typeof url === 'string' ? parseImageRef(url) : null
}
