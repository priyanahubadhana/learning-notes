import { readDeviceSetting } from '../../settings/settingsService'
import { readingSpeedSetting } from '../../settings/readingSettings'
import { writeDeviceSetting } from '../../settings/settingsService'
import {
  ReadAloud,
  speechAvailable,
  type AloudState,
  type SpeechText,
} from '../../app/reading/readAloud'
import {
  stopAloud as stopNotesAloud,
  voiceChoice,
} from '../../app/reading/aloudController'
import { memStore } from '../../app/tools/store'

/**
 * Read aloud for books (the device's own speech, free). A "source" is the
 * text of what is on screen (an EPUB chapter, a PDF page); the engine is the
 * same `ReadAloud` the notes use. The reader supplies sources and a way to
 * go on to the next one.
 */

/** One readable piece of the book and how to mark it. */
export interface BookSource extends SpeechText {
  /** First text offset that is on screen now (where reading starts). */
  firstVisible: () => number
}

export interface BookAloudHost {
  /** Text now on screen, or null while it is still loading. */
  source: () => BookSource | null
  /** Go to the next chapter or page; resolves false at the end of the book. */
  next: () => Promise<boolean>
}

export const bookAloudState = memStore<AloudState>('idle')
export const bookAloudAvailable = speechAvailable
/** Counts the times Listen could not start because the device has no voice (reader v2: device voices only). */
export const bookNoVoice = memStore<number>(0)

let host: BookAloudHost | null = null
let engine: ReadAloud | null = null
/** Reader v2 (flag reader.v2): only voices that run on the device. */
let localOnly = false
export const setBookLocalOnly = (on: boolean) => {
  localOnly = on
}
/** Sleep timer "end of page": stop when the piece now read is done. */
let stopAtEnd = false
export const setBookStopAtEnd = (on: boolean) => {
  stopAtEnd = on
}
/** Bumped by every start/stop, so a late "next page" never restarts speech. */
let run = 0

const rate = () => readDeviceSetting(readingSpeedSetting) / 100

export function setBookAloudHost(h: BookAloudHost | null): void {
  host = h
  if (!h) stopBookAloud()
}

async function waitForSource(): Promise<BookSource | null> {
  for (let i = 0; i < 30; i++) {
    const s = host?.source() ?? null
    if (s && s.text.trim().length > 0) return s
    await new Promise((r) => setTimeout(r, 150))
  }
  return host?.source() ?? null
}

async function play(source: BookSource, from: number, id: number) {
  engine?.dispose()
  engine = new ReadAloud(
    source,
    {
      rate: rate(),
      voiceURI: voiceChoice.get(),
      lang: document.documentElement.lang || undefined,
      pauses: true,
      localOnly,
    },
    {
      state: (s) => {
        if (id === run) bookAloudState.set(s)
      },
      noVoice: () => {
        if (id !== run) return
        bookNoVoice.set(bookNoVoice.get() + 1)
        stopBookAloud()
      },
      finished: () => {
        if (id !== run || !host) return
        if (stopAtEnd) {
          stopAtEnd = false
          return stopBookAloud()
        }
        void host.next().then(async (more) => {
          if (id !== run) return
          if (!more) return stopBookAloud()
          const next = await waitForSource()
          if (id !== run) return
          if (!next) return stopBookAloud()
          void play(next, 0, id)
        })
      },
    },
  )
  engine.start(from)
}

/** Starts at the first words on screen (or at `from`). */
export async function startBookAloud(from?: number): Promise<boolean> {
  if (!speechAvailable() || !host) return false
  stopNotesAloud() // one voice at a time
  const id = ++run
  const source = await waitForSource()
  if (!source || id !== run) return false
  await play(source, from ?? source.firstVisible(), id)
  return true
}

export const pauseBookAloud = () => engine?.pause()
export const resumeBookAloud = () => engine?.resume()
export const skipBookAloud = (dir: 1 | -1) => engine?.skip(dir)

export function stopBookAloud(): void {
  run++
  stopAtEnd = false
  engine?.dispose()
  engine = null
  bookAloudState.set('idle')
}

export function setBookAloudSpeed(percent: number): void {
  writeDeviceSetting(readingSpeedSetting, percent)
  engine?.configure({ rate: percent / 100 })
}

export function setBookAloudVoice(voiceURI: string): void {
  voiceChoice.set(voiceURI)
  engine?.configure({ voiceURI })
}
