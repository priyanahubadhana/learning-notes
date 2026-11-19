import { t } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import { setKeyboard } from '../../../editor/keyboardPolicy'
import { noteTyped } from '../../../editor/typedSignal'
import { memStore } from '../store'
import { currentRunner } from '../toolRuntime'
import { startDictation, type DictationError } from './dictation'
import { speechCtor } from './miniKeys'

/**
 * Speak to type, shared by the top row's Mic and the floating bar's Mic: one
 * recogniser, one "listening" state, so the floating bar can stay up while
 * dictation runs even when the top row hides it.
 */
const ERROR_TEXT = {
  denied: 'keys.denied',
  network: 'keys.errNetwork',
  noMic: 'keys.errNoMic',
  language: 'keys.errLanguage',
  other: 'keys.errOther',
} as const satisfies Record<DictationError, string>

export const dictating = memStore(false)
export const heardText = memStore('')

let active: { stop: () => void } | null = null

export function stopMic(): void {
  active?.stop()
  active = null
}

/** Starts or stops dictation into the caret of `editor`. */
export function toggleMic(editor: Editor): void {
  const toast = (m: string) => currentRunner().app?.toast(m)
  if (active) return stopMic()
  const Ctor = speechCtor()
  if (!Ctor) {
    // No SpeechRecognition here: the keyboard's own microphone does it.
    setKeyboard(editor, true)
    toast(t('keys.useKeyboardMic'))
    return
  }
  active = startDictation({
    ctor: Ctor,
    lang: document.documentElement.lang || 'en',
    insert: (text) => {
      editor.insertInlineContent(text)
      noteTyped()
    },
    interim: (s) => heardText.set(s),
    listening: (on) => dictating.set(on),
    closed: () => {
      active = null
      heardText.set('')
    },
    error: (kind) => {
      toast(t(ERROR_TEXT[kind]))
      if (kind === 'denied' || kind === 'noMic') setKeyboard(editor, true)
    },
  })
}
