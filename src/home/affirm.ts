import { aloudState, startAloud } from '../app/reading/aloudController'
import { speechAvailable } from '../app/reading/readAloud'
import type { LearningNotesDB } from '../core/db'
import type { HomeFile } from '../core/homeTypes'
import { isLive, newRecordFields } from '../core/records'

/**
 * Affirmations (F3): a page of bullet points read aloud by the reader's
 * voice (B4 engine, so Now playing and the voice choice apply), or your own
 * recording played back. No timer, no cards.
 */

/** Reads `lines` aloud. Returns false when the device has no voice. */
export function readAffirmation(
  lines: readonly string[],
  meta: { title: string; pageId: string },
): boolean {
  if (!speechAvailable() || lines.length === 0) return false
  // The reader works on text on the screen: a hidden copy holds the lines.
  const root = document.createElement('div')
  root.setAttribute('aria-hidden', 'true')
  root.style.cssText =
    'position:fixed;left:-9999px;top:0;width:600px;pointer-events:none'
  for (const line of lines) {
    const p = document.createElement('p')
    p.textContent = line
    root.append(p)
  }
  document.body.append(root)
  const stop = aloudState.subscribe(() => {
    if (aloudState.get() === 'idle') {
      stop()
      root.remove()
    }
  })
  if (!startAloud(root, 0, meta)) {
    stop()
    root.remove()
    return false
  }
  return true
}

// ---- Your own voice ----

const isAudioType = (v: string): boolean => /^audio\/[\w.+-]{1,30}$/.test(v)

const TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
export const MAX_AFFIRMATION_MS = 10 * 60 * 1000

export const canRecord = (): boolean =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

export interface AffirmationRecording {
  stop: () => Promise<{ blob: Blob; type: string; durationMs: number }>
}

/**
 * Starts recording. Call it straight from the tap (Safari asks for the
 * microphone there). Rejects with 'denied' or 'unsupported'.
 */
export async function recordAffirmation(): Promise<AffirmationRecording> {
  if (!canRecord()) throw new Error('unsupported')
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    throw new Error('denied')
  }
  const type = TYPES.find((x) => MediaRecorder.isTypeSupported(x))
  const rec = new MediaRecorder(stream, {
    ...(type ? { mimeType: type } : {}),
    audioBitsPerSecond: 32_000,
  })
  const chunks: Blob[] = []
  const startedAt = Date.now()
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  rec.start(1000)
  const limit = setTimeout(() => {
    if (rec.state !== 'inactive') rec.stop()
  }, MAX_AFFIRMATION_MS)
  return {
    stop: () =>
      new Promise((resolve) => {
        const finish = () => {
          clearTimeout(limit)
          stream.getTracks().forEach((track) => track.stop())
          const mime = rec.mimeType || type || 'audio/webm'
          resolve({
            blob: new Blob(chunks, { type: mime }),
            type: mime.split(';')[0],
            durationMs: Date.now() - startedAt,
          })
        }
        if (rec.state === 'inactive') finish()
        else {
          rec.onstop = finish
          rec.stop()
        }
      }),
  }
}

/** Keeps a recording for Home (stored in `files`, locally). */
export async function saveAffirmationFile(
  db: LearningNotesDB,
  input: { name: string; type: string; durationMs: number; data: ArrayBuffer },
): Promise<HomeFile> {
  if (!isAudioType(input.type))
    throw new Error('This sound type is not allowed')
  const file: HomeFile = {
    ...newRecordFields(),
    kind: 'audio',
    name: input.name.slice(0, 300),
    type: input.type,
    durationMs: input.durationMs,
    data: input.data,
  }
  await db.files.add(file)
  return file
}

export async function getAffirmationFile(
  db: LearningNotesDB,
  id: string,
): Promise<HomeFile | undefined> {
  const file = await db.files.get(id)
  return file && isLive(file) ? file : undefined
}
