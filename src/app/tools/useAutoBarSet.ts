import { useEffect } from 'react'
import { changeSet } from './toolbarState'

/** A pen tap that focuses the text is not "typing": wait this long (ms). */
const PEN_TAP_MS = 700

/** True for a key that adds, removes or breaks text (not a shortcut). */
const isTypingKey = (e: KeyboardEvent): boolean =>
  !e.ctrlKey &&
  !e.metaKey &&
  !e.altKey &&
  (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace')

const inText = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('.bn-editor') !== null

/**
 * The bar changes its tool set by itself (unless "Keep this set" is on):
 * a pen touching the screen shows Draw; typing, or the keyboard focus
 * arriving in the text, shows Write. Reading mode shows Read (it calls
 * `changeSet('read', 'auto')` itself, when that mode exists).
 */
export function useAutoBarSet(): void {
  useEffect(() => {
    let penAt = 0
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'pen') return
      // A pen tap on the bar's own buttons (e.g. ↵ New line) must not swap
      // the tools under it.
      if (e.target instanceof Element && e.target.closest('[data-bar]')) return
      penAt = Date.now()
      changeSet('draw', 'auto')
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTypingKey(e) && inText(e.target)) changeSet('write', 'auto')
    }
    const onFocus = (e: FocusEvent) => {
      if (Date.now() - penAt < PEN_TAP_MS) return
      if (inText(e.target)) changeSet('write', 'auto')
    }
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('focusin', onFocus, true)
    return () => {
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('focusin', onFocus, true)
    }
  }, [])
}
