import { Selection } from 'prosemirror-state'
import { setTypingPaused } from '../editor/typingPaused'
import { onRouted } from '../app/input/eventRouter'
import { allBoxEditors } from './activeBox'

/**
 * C10 (16 Nov 2026), text box v2: typing pauses while the user works on
 * something else (a resize dot, a card, a list) and comes back, with the
 * cursor and the selection, when that is done. Keys typed meanwhile go to
 * nothing, never into the text behind.
 *
 * The page's editors keep their selection while blurred, so a pause only has
 * to remember WHICH box was typed in; the selection itself is read back from
 * the editor's own state.
 */
type View = NonNullable<ReturnType<typeof viewOf>>
const viewOf = (el: Element | null) => {
  if (!el) return null
  for (const ed of allBoxEditors()) {
    const v = ed.prosemirrorView
    if (v && (v.dom === el || v.dom.contains(el))) return v
  }
  return null
}

/** The box whose caret was last put away (by a pause or a tap outside). */
let held: { boxId: string; sel: object; at: number } | null = null
/** A held caret older than this is forgotten (a stale tap, not a pause). */
const KEEP_MS = 120_000

const boxIdOf = (el: Element | null) =>
  el?.closest('[data-paper-box]')?.getAttribute('data-paper-box') ?? null

/** Remember the caret of the box editor `el` (no blur): the caret is leaving it. */
export function noteCaret(el: Element | null = document.activeElement): void {
  const id = boxIdOf(el)
  const v = viewOf(el)
  if (id && v)
    held = { boxId: id, sel: v.state.selection.toJSON(), at: Date.now() }
}

/**
 * A pause begins: the caret of the box being typed in (or just typed in, for
 * `boxId`) is put away and the editor loses focus. Returns true if a caret was
 * put away.
 */
export function pauseTyping(boxId?: string): boolean {
  const el = document.activeElement
  const id = boxIdOf(el)
  const v = viewOf(el)
  if (id && v) {
    held = { boxId: id, sel: v.state.selection.toJSON(), at: Date.now() }
    ;(el as HTMLElement).blur()
    // Why: a blurred editor still takes keys while the page's selection sits in it.
    // The editor keeps its own selection and gets it back at the resume.
    window.getSelection()?.removeAllRanges()
    setTypingPaused(true)
    return true
  }
  const held2 = !!held && (!boxId || held.boxId === boxId) && fresh()
  if (held2) setTypingPaused(true)
  return held2
}

const fresh = () => !!held && Date.now() - held.at < KEEP_MS

/** The pause ends: the caret returns to where it was. Returns the box id. */
export function resumeTyping(): string | null {
  setTypingPaused(false)
  const h = held
  if (!h || !fresh()) return null
  // The user already put the caret somewhere else (a new box, a field): that wins.
  const now = document.activeElement
  if (now?.closest('[contenteditable="true"], input, textarea, select')) {
    held = null
    return null
  }
  let result: string | null = null
  for (const ed of allBoxEditors()) {
    const v: View | undefined = ed.prosemirrorView
    const el = v?.dom.closest('[data-paper-box]')
    if (!v || el?.getAttribute('data-paper-box') !== h.boxId) continue
    try {
      const sel = Selection.fromJSON(v.state.doc, h.sel)
      v.dispatch(v.state.tr.setSelection(sel))
    } catch {
      // The text changed under it: the editor's own selection stands.
    }
    v.focus()
    result = h.boxId
  }
  return result
}

/** The caret is given up on purpose (the second tap outside, another box). */
export function forgetCaret(): void {
  setTypingPaused(false)
  held = null
}

/** The box of the held caret, if it is still fresh. */
export const heldBox = () => (fresh() ? (held?.boxId ?? null) : null)

/**
 * Cards and lists that take over the screen (the box card, the tool bar's
 * cards, menus): while one is open, a tap in it pauses typing; when the last
 * one is gone the caret comes back.
 */
const PANEL =
  '[data-box-style-panel], [data-pill-card], [role="dialog"], [role="menu"]'
/** A tap on a bar: typing is paused while the finger is down and until no card or list followed. */
const BAR = '[data-box-bar], [data-main-bar], [data-options-pill]'
export function watchPanels(onResume?: (boxId: string) => void): () => void {
  let paused = false
  let pressed = false
  let timer = 0
  const open = () => !!document.querySelector(PANEL)
  const poll = () => {
    if (pressed || open()) return
    window.clearInterval(timer)
    timer = 0
    if (!paused) return
    paused = false
    const id = resumeTyping()
    if (id) onResume?.(id)
  }
  const down = (e: PointerEvent) => {
    pressed = true
    const t = e.target instanceof Element ? e.target : null
    if (!t || t.closest('[data-paper-box] [data-box-content]')) return
    // The one bar (box bar part B) acts on the box being typed in: a press on it, or on its strips, keeps the caret.
    if (t.closest('.ob1')) return
    if (!t.closest(BAR) && !t.closest(PANEL)) return
    if (!pauseTyping()) return
    paused = true
    if (!timer) timer = window.setInterval(poll, 150)
  }
  const up = () => {
    pressed = false
  }
  const offDown = onRouted('pointerdown', down, { name: 'typingPause' })
  const offUp = onRouted('pointerup', up, { name: 'typingPauseUp' })
  const offCancel = onRouted('pointercancel', up, { name: 'typingPauseCancel' })
  return () => {
    offDown()
    offUp()
    offCancel()
    window.clearInterval(timer)
  }
}
