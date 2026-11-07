import type { PadStroke } from './pressure'

/** Unread AI-canvas strokes survive closing the pad and page changes (R6-15). */
export const kept = new Map<string, PadStroke[]>()
export const keptKey = (pageId?: string) => pageId ?? ''
