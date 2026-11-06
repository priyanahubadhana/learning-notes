import { useSyncExternalStore } from 'react'
import type { LearningNotesDB } from './db'
import type { Recording } from './types'

/**
 * Ink replay with audio (G2). Every stroke remembers when it began (`at`,
 * UTC ms) and every recording when its sound began (`startedAt`), so a
 * stroke written while recording points at a moment of the sound. Lives in
 * core so the ink layer (asks to play) and the Audio list (plays) share it
 * without importing each other.
 */

/** Slack after the end of a recording that still counts as inside it. */
const SLACK_MS = 1500

export interface ReplayTarget {
  recordingId: string
  /** Where in the sound to start (seconds). */
  seconds: number
}

/**
 * The recording a stroke was written during, and the second to start at, or
 * null when the stroke was not written during any recording. When recordings
 * overlap in time, the one that began last wins (the newest).
 */
export function replayTarget(
  recordings: readonly Pick<
    Recording,
    'id' | 'startedAt' | 'durationMs' | 'deletedAt'
  >[],
  at: number,
): ReplayTarget | null {
  let best: Pick<Recording, 'id' | 'startedAt'> | null = null
  for (const r of recordings) {
    if (r.deletedAt !== null) continue
    if (at < r.startedAt || at > r.startedAt + r.durationMs + SLACK_MS) continue
    if (!best || r.startedAt > best.startedAt) best = r
  }
  return best
    ? {
        recordingId: best.id,
        seconds: Math.max(0, (at - best.startedAt) / 1000),
      }
    : null
}

/** The earliest start among strokes (0 = a stroke with no time). */
export const earliestAt = (times: readonly number[]): number =>
  times.reduce((min, at) => (at > 0 && (min === 0 || at < min) ? at : min), 0)

// ---- Live recordings of a page (for the ink menu) ----

type Meta = Pick<Recording, 'id' | 'startedAt' | 'durationMs' | 'deletedAt'>
const cache = new Map<string, { at: number; rows: Meta[] }>()
const CACHE_MS = 15_000

/**
 * The page's recordings (times only), read when a drawing is selected. The
 * bytes come along with the row, so the answer is kept for 15 seconds.
 */
export async function recordingTimes(
  db: LearningNotesDB,
  pageId: string,
  now: number = Date.now(),
): Promise<Meta[]> {
  const hit = cache.get(pageId)
  if (hit && now - hit.at < CACHE_MS) return hit.rows
  const rows = (
    await db.recordings.where('pageId').equals(pageId).toArray()
  ).map(({ id, startedAt, durationMs, deletedAt }) => ({
    id,
    startedAt,
    durationMs,
    deletedAt,
  }))
  cache.set(pageId, { at: now, rows })
  return rows
}

/** Forget the kept answer (a recording was added, deleted or restored). */
export const forgetRecordingTimes = (pageId?: string) =>
  pageId ? cache.delete(pageId) : cache.clear()

// ---- A request to play, from the ink menu to the Audio list ----

export interface ReplayRequest extends ReplayTarget {
  /** Changes with every request, so asking twice for the same spot plays twice. */
  nonce: number
  /** When it was asked (ms): an old request is ignored by rows that mount later. */
  time: number
}

let request: ReplayRequest | null = null
let counter = 0
const listeners = new Set<() => void>()

/** Asks the Audio list to open and play from a moment. */
export function requestReplay(target: ReplayTarget): void {
  request = { ...target, nonce: ++counter, time: Date.now() }
  for (const l of listeners) l()
}

/** A request still worth acting on (not an old one a new row sees). */
export const isFreshReplay = (r: ReplayRequest, now = Date.now()): boolean =>
  now - r.time < 5000

export const useReplayRequest = (): ReplayRequest | null =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => request,
  )
