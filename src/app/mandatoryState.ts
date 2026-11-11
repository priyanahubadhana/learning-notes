import { memStore } from './tools/store'

/**
 * Where the mandatory update flow is (BUG-004). Tiny on purpose: App reads it
 * in the first download; the flow itself and its screen load only when a
 * required update is found.
 */
export type MandatoryState =
  | { phase: 'countdown'; left: number }
  | { phase: 'downloading'; loaded: number; total: number }
  | { phase: 'paused' }
  | { phase: 'installing' }
  | { phase: 'failed'; reason: 'download' | 'unsaved' | 'install' }

/** null = no required update (the normal pill handles updates). */
export const mandatoryUpdate = memStore<MandatoryState | null>(null)
