import type { LearningNotesDB } from '../core/db'
import {
  newRecordFields,
  purgeMany,
  restoreMany,
  softDeleteMany,
} from '../core/records'
import { forgetRecordingTimes } from '../core/replay'
import type { Recording } from '../core/types'

/**
 * Voice recordings kept with a page (local only; the sound never leaves the
 * device). Deleting is safe in two steps: Delete moves a recording to
 * "Deleted recordings" (Undo / Restore at any time), and only "Delete
 * forever" erases the sound.
 */

/** Longest recording, in ms (3 hours): keeps memory and storage in check. */
export const MAX_RECORDING_MS = 3 * 60 * 60 * 1000
/** Largest sound accepted (bytes). */
export const MAX_RECORDING_BYTES = 200_000_000

export interface NewRecording {
  pageId: string
  name: string
  type: string
  startedAt: number
  durationMs: number
  data: ArrayBuffer
}

/** Saves a finished recording. */
export async function saveRecording(
  db: LearningNotesDB,
  input: NewRecording,
): Promise<Recording> {
  if (input.data.byteLength === 0) throw new Error('Empty recording')
  if (input.data.byteLength > MAX_RECORDING_BYTES) {
    throw new Error('Recording too big')
  }
  const row: Recording = {
    ...newRecordFields(),
    pageId: input.pageId,
    name: input.name,
    // "audio/webm;codecs=opus" -> keep it; the player copes with parameters.
    type: input.type,
    startedAt: input.startedAt,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    data: input.data,
  }
  await db.recordings.add(row)
  forgetRecordingTimes(input.pageId)
  return row
}

/** A page's recordings, oldest first; `deleted` = the ones in "Deleted". */
export async function listRecordings(
  db: LearningNotesDB,
  pageId: string,
  deleted = false,
): Promise<Recording[]> {
  const all = await db.recordings.where('pageId').equals(pageId).toArray()
  return all
    .filter((r) =>
      deleted
        ? r.deletedAt !== null && r.purgedAt === undefined
        : r.deletedAt === null,
    )
    .sort((a, b) => a.startedAt - b.startedAt)
}

/** Moves a recording to "Deleted recordings" (nothing is erased). */
export async function deleteRecording(
  db: LearningNotesDB,
  id: string,
  now: number = Date.now(),
): Promise<void> {
  await softDeleteMany(db.recordings, [id], now)
  forgetRecordingTimes()
}

/** Brings a deleted recording back. */
export async function restoreRecording(
  db: LearningNotesDB,
  id: string,
  now: number = Date.now(),
): Promise<void> {
  const row = await db.recordings.get(id)
  if (!row || row.purgedAt !== undefined) return
  await restoreMany(db.recordings, [id], now)
  forgetRecordingTimes()
}

const EMPTY: Partial<Recording> = { data: new ArrayBuffer(0), name: '' }

/**
 * Erases the sound of recordings that are already in "Deleted" (a live
 * recording is never erased from here).
 */
export async function eraseRecordings(
  db: LearningNotesDB,
  ids: readonly string[],
  now: number = Date.now(),
): Promise<void> {
  const rows = await db.recordings.bulkGet([...ids])
  const doomed = rows
    .filter((r): r is Recording => !!r)
    .filter((r) => r.deletedAt !== null && r.purgedAt === undefined)
    .map((r) => r.id)
  await purgeMany(db.recordings, doomed, EMPTY, now)
}

/** Default name: "Recording 6 Nov, 14:32" in the user's regional style. */
export function recordingName(
  label: string,
  startedAt: number,
  locale?: string,
): string {
  const when = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(startedAt))
  return `${label} ${when}`
}

/** "1:05" or "1:02:03" for a length in ms. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`
}
