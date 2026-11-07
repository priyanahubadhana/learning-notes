import { memStore } from '../tools/store'
import type { AloudState } from './readAloud'

/**
 * The two Read aloud values the always-on shell looks at, kept apart from
 * the speech code so the first download does not carry the speech engine.
 */
export const aloudState = memStore<AloudState>('idle')

/** What is being read, for the Now playing pill. */
export const nowPlaying = memStore<{ title: string; pageId: string } | null>(
  null,
)
