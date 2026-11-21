import { finalText, type Recognition, type RecognitionEvent } from './miniKeys'

/**
 * Speak to type (C17). Words are typed as they are heard; the guess in
 * progress is shown (interim) until it is final. Safari ends a session by
 * itself after a pause: while the person still wants to listen it is
 * restarted. Every error has a plain message and a way out: the keyboard mic.
 *
 * `listening` is true only between the recognizer's own "started" and its
 * end, so the red glow is never shown for a mic that is not really open.
 */

export type DictationError =
  'denied' | 'network' | 'noMic' | 'language' | 'other'

export interface DictationHooks {
  ctor: new () => Recognition
  lang: string
  /** Type this text at the cursor. */
  insert: (text: string) => void
  /** The guess in progress ('' = none). */
  interim: (text: string) => void
  /** True while the mic is really open. */
  listening: (on: boolean) => void
  error: (kind: DictationError) => void
  /** The session is over for good (stopped, or an error): a new tap starts a new one. */
  closed: () => void
}

/** Restarts with nothing heard before we stop trying (no-speech loops). */
const MAX_IDLE_RESTARTS = 3

export function errorKind(code: string | undefined): DictationError | null {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'denied'
    case 'network':
      return 'network'
    case 'audio-capture':
      return 'noMic'
    case 'language-not-supported':
      return 'language'
    case 'no-speech':
    case 'aborted':
      return null // quiet; the session restarts
    default:
      return 'other'
  }
}

const FATAL: DictationError[] = [
  'denied',
  'network',
  'noMic',
  'language',
  'other',
]

export function startDictation(h: DictationHooks): { stop: () => void } {
  let wanted = true
  let idle = 0
  let rec: Recognition | null = null

  const begin = (): boolean => {
    const r = new h.ctor()
    r.lang = h.lang
    r.continuous = true
    r.interimResults = true
    r.onstart = () => h.listening(true)
    r.onresult = (e: RecognitionEvent) => {
      idle = 0
      const text = finalText(e)
      let guess = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) guess += e.results[i][0].transcript
      }
      h.interim(guess.trim())
      if (text) h.insert(text + ' ')
    }
    r.onerror = (e) => {
      const kind = errorKind(e.error)
      if (kind && FATAL.includes(kind)) {
        wanted = false
        h.error(kind)
      }
    }
    r.onend = () => {
      h.interim('')
      if (rec !== r) return
      rec = null
      h.listening(false)
      if (!wanted) {
        h.closed()
        return
      }
      if (++idle > MAX_IDLE_RESTARTS || !begin()) {
        wanted = false
        h.error('other')
        h.closed()
      }
    }
    rec = r
    try {
      r.start()
      return true
    } catch {
      rec = null
      return false
    }
  }

  if (!begin()) {
    wanted = false
    h.error('other')
    h.closed()
  }
  return {
    stop: () => {
      wanted = false
      const r = rec
      if (r) r.stop()
      else {
        h.listening(false)
        h.closed()
      }
    },
  }
}
