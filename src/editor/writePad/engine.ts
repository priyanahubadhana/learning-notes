import type { MessageKey } from '../../i18n/t'

/**
 * A way to turn handwriting into text for the Write pad. The MVP has one:
 * the iPad's own Scribble, which writes plain text into the pad's textarea
 * (so the pad just reads the box). Later engines plug in here without
 * touching the pad: a canvas with pressure, or the user's own AI key (needs
 * the owner's approval and is NOT built).
 */
export interface WritePadEngine {
  id: 'scribble' | 'handwriting-api' | 'ai'
  /** True when this engine can read handwriting on this device. */
  supported: () => boolean
  /** True when it reports pen pressure (Scribble does not). */
  pressure: boolean
  /** A one-line hint under the pad when this engine is not available. */
  missingHint: MessageKey
}

/** The iPad's Scribble: the pad is a textarea; only iPads can write in it. */
export const scribbleEngine: WritePadEngine = {
  id: 'scribble',
  supported: () => {
    const nav = globalThis.navigator
    return (
      !!nav &&
      /iPad|Mac/.test(nav.platform || nav.userAgent) &&
      nav.maxTouchPoints > 1
    )
  },
  pressure: false,
  missingHint: 'writePad.hint',
}

/** The engines to try, in order. The first is used. */
const ENGINES: readonly WritePadEngine[] = [scribbleEngine]

export const pickEngine = (): WritePadEngine => ENGINES[0]

/**
 * The browser's own handwriting recogniser (ChromeOS only). Detected so a
 * later step can use it; the MVP only types into the textarea.
 */
export const hasHandwritingApi = (): boolean =>
  typeof navigator !== 'undefined' && 'createHandwritingRecognizer' in navigator
