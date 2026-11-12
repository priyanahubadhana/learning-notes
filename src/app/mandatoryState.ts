import { memStore } from './tools/store'
import type { UpdateReason } from './updateLevel'

/**
 * Where the mandatory update flow is (BUG-004). Tiny on purpose: App reads it
 * in the first download; the flow itself and its screen load only when a
 * required update is found.
 */
export type MandatoryState =
  | { phase: 'countdown'; left: number }
  | { phase: 'downloading'; loaded: number; total: number; etaS?: number }
  | { phase: 'paused' }
  | { phase: 'installing' }
  /** update.v2 only: no network, waiting. The app stays usable. */
  | { phase: 'offline' }
  | { phase: 'failed'; reason: 'download' | 'unsaved' | 'install' }

/** What the screen needs besides the phase (update.v2 sets v2). */
export const mandatoryMeta = memStore<{ v2: boolean; reason: UpdateReason }>({
  v2: false,
  reason: 'storage',
})

/** null = no required update (the normal pill handles updates). */
export const mandatoryUpdate = memStore<MandatoryState | null>(null)
