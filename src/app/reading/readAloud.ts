import { makeChunks, wordAt, type Chunk } from './speechChunks'

/**
 * Read aloud with the free Web Speech API (`speechSynthesis`), built for
 * Safari's quirks:
 * - the text is spoken in short pieces (a long utterance is cut off);
 * - a piece that never reports word boundaries (some iPad voices) is
 *   highlighted as a whole sentence instead;
 * - changing the speed or voice restarts the current piece (a running
 *   utterance ignores the change);
 * - if the screen locked and speech stopped, coming back restarts the piece;
 * - a `resume()` that does nothing is replaced by a restart of the piece;
 * - the "canceled" / "interrupted" errors our own cancel() causes are ignored.
 */

/** What the engine reads and marks. The page supplies this. */
export interface SpeechText {
  text: string
  /** Marks the word being spoken ([start, end) in `text`). */
  markWord: (start: number, end: number) => void
  /** Marks the whole piece (when there are no word boundaries). */
  markSentence: (start: number, end: number) => void
  clearMarks: () => void
}

export type AloudState = 'idle' | 'playing' | 'paused'

export interface AloudOptions {
  /** 0.5 to 2. */
  rate: number
  voiceURI: string
  lang?: string
}

/** Wait for a first word boundary before falling back to sentences. */
export const BOUNDARY_WAIT_MS = 1200
/** Wait after resume() before deciding it did nothing. */
export const RESUME_WAIT_MS = 600

interface Synth {
  speak: (u: SpeechSynthesisUtterance) => void
  cancel: () => void
  pause: () => void
  resume: () => void
  getVoices: () => SpeechSynthesisVoice[]
  speaking: boolean
  paused: boolean
}

const synth = (): Synth | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window
    ? (window.speechSynthesis as unknown as Synth)
    : null

export const speechAvailable = (): boolean =>
  synth() !== null && typeof SpeechSynthesisUtterance !== 'undefined'

export class ReadAloud {
  state: AloudState = 'idle'
  private chunks: Chunk[] = []
  private index = 0
  /** Bumped on every speak/cancel, so late events of an old utterance are ignored. */
  private token = 0
  private sawBoundary = false
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private opts: AloudOptions

  private source: SpeechText
  private on: {
    state?: (state: AloudState) => void
    /** Called when the last piece has been spoken. */
    finished?: () => void
    /** The piece changed (offset in the text). */
    chunk?: (start: number) => void
  }

  constructor(
    source: SpeechText,
    options: AloudOptions,
    on: ReadAloud['on'] = {},
  ) {
    this.source = source
    this.on = on
    this.opts = options
    document.addEventListener('visibilitychange', this.onVisible)
  }

  private set(state: AloudState) {
    this.state = state
    this.on.state?.(state)
  }

  private later(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      fn()
    }, ms)
    this.timers.add(id)
  }

  private clearTimers() {
    for (const id of this.timers) clearTimeout(id)
    this.timers.clear()
  }

  /** Starts speaking at an offset of the text (0 = the beginning). */
  start(from = 0): void {
    const s = synth()
    if (!s) return
    this.chunks = makeChunks(this.source.text, from)
    this.index = 0
    if (this.chunks.length === 0) {
      this.finish()
      return
    }
    this.set('playing')
    this.speakCurrent()
  }

  private speakCurrent(): void {
    const s = synth()
    const chunk = this.chunks[this.index]
    if (!s || !chunk) return
    this.clearTimers()
    const token = ++this.token
    s.cancel() // also clears anything left from before
    const u = new SpeechSynthesisUtterance(chunk.text)
    u.rate = Math.min(2, Math.max(0.5, this.opts.rate))
    const voice = s.getVoices().find((v) => v.voiceURI === this.opts.voiceURI)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else if (this.opts.lang) {
      u.lang = this.opts.lang
    }
    this.sawBoundary = false
    this.on.chunk?.(chunk.start)
    u.onstart = () => {
      if (token !== this.token) return
      // No word boundaries? Then mark the sentence, not words.
      this.later(() => {
        if (token === this.token && !this.sawBoundary) {
          this.source.markSentence(chunk.start, chunk.end)
        }
      }, BOUNDARY_WAIT_MS)
    }
    u.onboundary = (e: SpeechSynthesisEvent) => {
      if (token !== this.token) return
      if (e.name && e.name !== 'word') return
      this.sawBoundary = true
      const [a, b] = wordAt(chunk.text, e.charIndex)
      this.source.markWord(chunk.start + a, chunk.start + b)
    }
    u.onend = () => {
      if (token !== this.token) return
      this.next()
    }
    u.onerror = (e: SpeechSynthesisErrorEvent) => {
      if (token !== this.token) return
      if (e.error === 'canceled' || e.error === 'interrupted') return
      this.next() // skip a piece that cannot be spoken
    }
    s.speak(u)
  }

  private next(): void {
    if (this.state === 'idle') return
    this.index += 1
    if (this.index >= this.chunks.length) {
      this.finish()
      return
    }
    this.speakCurrent()
  }

  private finish(): void {
    this.token++
    this.clearTimers()
    this.source.clearMarks()
    this.set('idle')
    this.on.finished?.()
  }

  pause(): void {
    if (this.state !== 'playing') return
    // Safari's pause() can leave speech running, so stop it fully and
    // restart the piece on resume (the piece is short).
    this.token++
    this.clearTimers()
    synth()?.cancel()
    this.set('paused')
  }

  resume(): void {
    if (this.state !== 'paused') return
    this.set('playing')
    this.speakCurrent()
  }

  stop(): void {
    if (this.state === 'idle') return
    this.token++
    this.clearTimers()
    synth()?.cancel()
    this.source.clearMarks()
    this.set('idle')
  }

  /** New speed or voice: the running piece is spoken again with it. */
  configure(options: Partial<AloudOptions>): void {
    this.opts = { ...this.opts, ...options }
    if (this.state === 'playing') this.speakCurrent()
  }

  /** The screen came back: if speech died while it was locked, go on. */
  private onVisible = (): void => {
    if (document.visibilityState !== 'visible') return
    if (this.state !== 'playing') return
    const s = synth()
    if (s && (!s.speaking || s.paused)) this.speakCurrent()
  }

  dispose(): void {
    this.stop()
    document.removeEventListener('visibilitychange', this.onVisible)
  }
}
