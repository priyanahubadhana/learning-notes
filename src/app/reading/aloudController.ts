import {
  readDeviceSetting,
  writeDeviceSetting,
} from '../../settings/settingsService'
import {
  readingBlanksSetting,
  readingSpeedSetting,
} from '../../settings/readingSettings'
import { memStore, prefStore } from '../tools/store'
import { buildTextMap, type TextMap } from './domSpeech'
import { rankVoices } from './voices'
import { ReadAloud, speechAvailable, type AloudState } from './readAloud'
import { aloudState, nowPlaying } from './aloudStores'

/**
 * The one Read aloud that runs in the app. It lives outside the page, so
 * it keeps going when the next page opens ("like an audiobook"), and the
 * sleep timer stops it whatever page is showing.
 */

export { aloudState, nowPlaying }
/** Seconds left on the sleep timer, or null when none runs. */
export const sleepLeft = memStore<number | null>(null)
/** Speech finished a page and the next one (this id) is opening: keep reading there. */
export const aloudContinues = memStore<string | null>(null)
/** The chosen device voice (its voiceURI); empty = the device's default. */
export const voiceChoice = prefStore<string>(
  'reading.voice',
  (v): v is string => typeof v === 'string' && v.length < 300,
  '',
)

/** Stop when this page ends instead of going on (sleep timer: end of page). */
export const sleepAtEnd = memStore(false)
/** What the forward and back buttons skip: one sentence or about 15 seconds. */
export const SKIP_MODES = ['sentence', 'seconds'] as const
export const skipMode = prefStore<(typeof SKIP_MODES)[number]>(
  'reading.skipMode',
  (v): v is (typeof SKIP_MODES)[number] => v === 'sentence' || v === 'seconds',
  'sentence',
)
/** The voice chosen for each language (a voiceURI per language code). */
const voiceByLang = prefStore<Record<string, string>>(
  'reading.voices',
  (v): v is Record<string, string> =>
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => typeof x === 'string'),
  {},
)

let engine: ReadAloud | null = null
let map: TextMap | null = null
let sleepTimer: ReturnType<typeof setInterval> | null = null
let sleepEnd = 0

/** Called when a page is finished; opens the next one and returns its id (null = no more). */
let nextPageHandler: (() => Promise<string | null>) | null = null
export const setNextPageHandler = (
  fn: (() => Promise<string | null>) | null,
) => {
  nextPageHandler = fn
}
/** Tells the user something (sleep timer ended, end of notebook). */
let notifier: ((message: string) => void) | null = null
export const setAloudNotifier = (fn: ((message: string) => void) | null) => {
  notifier = fn
}

export const aloudSupported = speechAvailable

const rate = () => readDeviceSetting(readingSpeedSetting) / 100

function setState(state: AloudState) {
  aloudState.set(state)
}

/** Reads the page shown in `root`, from a text offset (default: the start). */
export function startAloud(
  root: HTMLElement,
  from = 0,
  meta?: { title: string; pageId: string },
): TextMap | null {
  if (!speechAvailable()) return null
  engine?.dispose()
  if (meta) nowPlaying.set(meta)
  map = buildTextMap(root, {
    hideBlanks: readDeviceSetting(readingBlanksSetting) === 'hide',
  })
  engine = new ReadAloud(
    map,
    {
      rate: rate(),
      voiceURI: currentVoice(),
      lang: document.documentElement.lang || undefined,
      pauses: true,
    },
    {
      state: setState,
      finished: () => {
        if (sleepAtEnd.get()) {
          sleepAtEnd.set(false)
          stopAloud()
          notifier?.('sleep')
          return
        }
        if (!nextPageHandler) return
        void nextPageHandler().then((opened) => {
          if (opened) aloudContinues.set(opened)
          else notifier?.('end')
        })
      },
    },
  )
  engine.start(from)
  return map
}

/** The new page has loaded: carry on reading it from its start. */
export function continueAloud(
  root: HTMLElement,
  meta?: { title: string; pageId: string },
): void {
  aloudContinues.set(null)
  startAloud(root, 0, meta)
}

/** Goes on to the next page of the notebook now (the Next button). */
export function nextPageAloud(): void {
  if (!nextPageHandler) return
  void nextPageHandler().then((opened) => {
    if (opened) aloudContinues.set(opened)
    else notifier?.('end')
  })
}

/** Characters spoken per second at normal speed (a rough, steady guess). */
const CHARS_PER_SECOND = 15
const SKIP_SECONDS = 15

/**
 * Back or forward: one sentence, or about 15 seconds of speech at the
 * current speed (estimated from characters).
 */
export function skipAloud(direction: 1 | -1): void {
  if (!engine) return
  if (skipMode.get() === 'sentence') {
    engine.skip(direction)
    return
  }
  const at = engine.offset ?? 0
  const chars = SKIP_SECONDS * CHARS_PER_SECOND * rate()
  engine.seek(Math.max(0, at + direction * chars))
}

export const pauseAloud = () => engine?.pause()
export const resumeAloud = () => engine?.resume()

export function stopAloud(): void {
  aloudContinues.set(null)
  nowPlaying.set(null)
  engine?.dispose()
  engine = null
  map = null
  setState('idle')
}

/** Where the user tapped: reads from that word. */
export function readFromPoint(root: HTMLElement, x: number, y: number): void {
  const probe = buildTextMap(root, { hideBlanks: false })
  const at = probe.offsetAtPoint(x, y)
  startAloud(root, Math.max(0, at))
}

export function setAloudSpeed(percent: number): void {
  writeDeviceSetting(readingSpeedSetting, percent)
  engine?.configure({ rate: percent / 100 })
}

/** The voice for this page's language: the one chosen for it, else the general choice. */
function currentVoice(): string {
  const lang = (document.documentElement.lang || '').slice(0, 2)
  return (lang && voiceByLang.get()[lang]) || voiceChoice.get()
}

export function setAloudVoice(voiceURI: string): void {
  voiceChoice.set(voiceURI)
  const lang = (document.documentElement.lang || '').slice(0, 2)
  if (lang) {
    const all = { ...voiceByLang.get() }
    if (voiceURI) all[lang] = voiceURI
    else delete all[lang]
    voiceByLang.set(all)
  }
  engine?.configure({ voiceURI })
}

/** The device's voices (they can arrive late; see `onVoicesChanged`). */
export function listVoices(): SpeechSynthesisVoice[] {
  return speechAvailable() ? rankVoices(window.speechSynthesis.getVoices()) : []
}

// ---- Sleep timer ----

export function setSleepTimer(minutes: number | null): void {
  if (sleepTimer) clearInterval(sleepTimer)
  sleepTimer = null
  if (minutes === null) {
    sleepLeft.set(null)
    return
  }
  sleepEnd = Date.now() + minutes * 60_000
  sleepLeft.set(minutes * 60)
  sleepTimer = setInterval(() => {
    const left = Math.max(0, Math.ceil((sleepEnd - Date.now()) / 1000))
    sleepLeft.set(left)
    if (left <= 0) {
      if (sleepTimer) clearInterval(sleepTimer)
      sleepTimer = null
      sleepLeft.set(null)
      stopAloud()
      notifier?.('sleep')
    }
  }, 1000)
}

/** Tests only. */
export function resetAloud(): void {
  stopAloud()
  setSleepTimer(null)
  sleepAtEnd.set(false)
  nextPageHandler = null
  notifier = null
}
