import { prefStore } from '../store'
import { isPillPlace, type PillPlace } from './pillPlace'

/**
 * The mini keyboard strip: a small floating strip with a microphone (speak to
 * type), Enter and Backspace, so the Pencil can work without the Apple
 * keyboard. It is shown from a toolbar toggle, snaps to the edges like the
 * pills, and both are remembered per device.
 */

const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean'

export const miniKeysOn = prefStore('toolbar.miniKeys', isBoolean, false)

/** Where the strip sits (edge + how far along it); null = the default. */
export const miniKeysPlace = prefStore<PillPlace | null>(
  'toolbar.miniKeysPlace',
  isPillPlace,
  null,
)

/** Right side, a little below the middle: out of the way of the page text. */
export const DEFAULT_KEYS_PLACE: PillPlace = { edge: 'right', along: 0.6 }

// ---- Speech to text (Safari's SpeechRecognition, if the browser has it) ----

export interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
export interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

type Ctor = new () => Recognition

/** The browser's recognizer, or null (then the keyboard's own mic is used). */
export function speechCtor(): Ctor | null {
  const w = window as unknown as {
    SpeechRecognition?: Ctor
    webkitSpeechRecognition?: Ctor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** The final phrases of a result event, joined; interim guesses are skipped. */
export function finalText(e: RecognitionEvent): string {
  let out = ''
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const r = e.results[i]
    if (r.isFinal) out += r[0].transcript
  }
  return out.trim()
}
