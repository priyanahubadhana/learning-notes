import { useSyncExternalStore } from 'react'
import { db } from '../core/db'
import { t } from '../i18n/t'
import { dateLocale } from '../i18n/t'
import {
  MAX_RECORDING_MS,
  recordingName,
  saveRecording,
} from './recordingService'

/**
 * Records the microphone while notes are taken. One recording at a time for
 * the whole app; it belongs to the page it was started on and keeps going
 * when other pages are opened. Local only: the sound goes from the
 * microphone into the notes database on this device, nowhere else.
 */

export type RecorderState =
  | { status: 'idle' }
  | { status: 'recording'; pageId: string; startedAt: number }
  | { status: 'saving'; pageId: string }

export type StartResult =
  | { ok: true }
  | {
      ok: false
      reason: 'unsupported' | 'denied' | 'noMic' | 'busy' | 'failed'
    }

let state: RecorderState = { status: 'idle' }
const listeners = new Set<() => void>()
const set = (next: RecorderState) => {
  state = next
  for (const l of listeners) l()
}
export const getRecorderState = () => state
const subscribeRecorder = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
/** The recorder's state, live. */
export const useRecorder = (): RecorderState =>
  useSyncExternalStore(subscribeRecorder, getRecorderState)

/** Tells the app what happened when a recording ended on its own. */
let onEnded: ((message: string) => void) | null = null
export const setRecorderNotice = (fn: ((message: string) => void) | null) => {
  onEnded = fn
}

/** Sound types to try, best first (Safari makes mp4, Chrome webm). */
const TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']

function isRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

function pickType(): string | undefined {
  return TYPES.find((type) => MediaRecorder.isTypeSupported(type))
}

let recorder: MediaRecorder | null = null
let stream: MediaStream | null = null
let chunks: Blob[] = []
let limitTimer: ReturnType<typeof setTimeout> | undefined

/** Starts recording for `pageId`. Asks for the microphone the first time. */
export async function startRecording(pageId: string): Promise<StartResult> {
  if (state.status !== 'idle') return { ok: false, reason: 'busy' }
  if (!isRecordingSupported()) return { ok: false, reason: 'unsupported' }
  try {
    // Called straight from the tap: Safari wants the permission prompt here.
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (e) {
    const name = (e as DOMException | undefined)?.name
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return { ok: false, reason: 'noMic' }
    }
    return { ok: false, reason: 'denied' }
  }
  try {
    const type = pickType()
    // Speech needs little: a low rate keeps long recordings small.
    recorder = new MediaRecorder(stream, {
      ...(type ? { mimeType: type } : {}),
      audioBitsPerSecond: 32_000,
    })
  } catch {
    releaseStream()
    return { ok: false, reason: 'failed' }
  }
  chunks = []
  const startedAt = Date.now()
  const rec = recorder
  rec.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  rec.onerror = () => {
    onEnded?.(t('audio.error'))
    if (rec.state !== 'inactive') rec.stop()
  }
  rec.onstop = () => void finish(pageId, startedAt, rec.mimeType)
  rec.start(1000) // a piece every second, so little is lost if the app dies
  limitTimer = setTimeout(() => {
    onEnded?.(t('audio.limit'))
    void stopRecording()
  }, MAX_RECORDING_MS)
  set({ status: 'recording', pageId, startedAt })
  return { ok: true }
}

function releaseStream() {
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}

/** Stops and saves the recording (it ends up in the page's Audio list). */
export async function stopRecording(): Promise<void> {
  if (state.status !== 'recording' || !recorder) return
  clearTimeout(limitTimer)
  const rec = recorder
  set({ status: 'saving', pageId: state.pageId })
  if (rec.state !== 'inactive') rec.stop()
  else void finish(state.pageId, Date.now(), rec.mimeType)
}

async function finish(pageId: string, startedAt: number, mime: string) {
  clearTimeout(limitTimer)
  releaseStream()
  recorder = null
  const parts = chunks
  chunks = []
  const endedAt = Date.now()
  try {
    if (parts.length === 0) {
      onEnded?.(t('audio.empty'))
      return
    }
    const type = mime || parts[0].type || 'audio/mp4'
    const data = await new Blob(parts, { type }).arrayBuffer()
    await saveRecording(db, {
      pageId,
      name: recordingName(t('audio.defaultName'), startedAt, dateLocale()),
      type,
      startedAt,
      durationMs: endedAt - startedAt,
      data,
    })
    onEnded?.(t('audio.saved'))
  } catch (e) {
    console.error('Could not save the recording', e)
    onEnded?.(t('audio.saveFailed'))
  } finally {
    set({ status: 'idle' })
  }
}
