import type { PadStroke } from './pressure'

/** Unread AI-canvas strokes survive closing the pad and page changes (R6-15). */
export const kept = new Map<string, PadStroke[]>()
export const keptKey = (pageId?: string) => pageId ?? ''

/** True when this page has writing on the canvas that was not read yet. */
export const hasUnreadStrokes = (pageId?: string): boolean =>
  (kept.get(keptKey(pageId))?.length ?? 0) > 0

/** Throws the unread strokes away (the user chose Discard). */
export const discardStrokes = (pageId?: string): void => {
  kept.delete(keptKey(pageId))
}
