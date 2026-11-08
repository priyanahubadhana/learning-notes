import { useSyncExternalStore } from 'react'

/**
 * Asking for a picture ("Insert > Picture", "/image", the empty picture
 * block's Add button). The block is made only once `onPick` gets a file, so
 * cancelling leaves nothing behind. The sheet itself
 * (`PictureChooser.tsx`) is loaded the first time it is needed.
 */
export interface PictureAsk {
  /** Which editor asked, so only that page shows the sheet. */
  owner: unknown
  onPick: (file: File) => void
}

let current: PictureAsk | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function openPictureChooser(ask: PictureAsk): void {
  current = ask
  emit()
}

export function closePictureChooser(): void {
  if (!current) return
  current = null
  emit()
}

export const usePictureAsk = (): PictureAsk | null =>
  useSyncExternalStore(subscribe, () => current)

/** First picture file on a paste/clipboard list, or null. */
export function firstImageFile(files: ArrayLike<File> | null): File | null {
  for (const file of Array.from(files ?? [])) {
    if (file.type.startsWith('image/')) return file
  }
  return null
}

/**
 * Reads a picture from the clipboard (needs the browser's permission, asked
 * on the tap). Null when blocked, unsupported or there is no picture.
 */
export async function readClipboardPicture(
  clipboard: Pick<Clipboard, 'read'> | undefined = navigator.clipboard,
): Promise<File | null> {
  try {
    if (!clipboard?.read) return null
    for (const item of await clipboard.read()) {
      const type = item.types.find((x) => x.startsWith('image/'))
      if (!type) continue
      const blob = await item.getType(type)
      return new File([blob], 'pasted-picture', { type: blob.type || type })
    }
  } catch {
    // refused or unavailable: the caller shows the hint
  }
  return null
}
