import { Selection } from 'prosemirror-state'
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
    return true
  }
  return !!held && (!boxId || held.boxId === boxId) && fresh()
}

const fresh = () => !!held && Date.now() - held.at < KEEP_MS

/** The pause ends: the caret returns to where it was. Returns the box id. */
export function resumeTyping(): string | null {
  const h = held
  if (!h || !fresh()) return null
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
  held = null
}

/** The box of the held caret, if it is still fresh. */
export const heldBox = () => (fresh() ? (held?.boxId ?? null) : null)

/**
 * Cards and lists that take over the screen: while one is open, a tap in it
 * pauses typing; when the last one is gone the caret comes back.
 */
const PANEL = '[data-box-style-panel], [role="dialog"], [role="menu"]'
/** A tap on the box bar itself: a pause that ends when no card or list followed. */
const BAR = '[data-box-bar]'
export function watchPanels(onResume?: (boxId: string) => void): () => void {
  let paused = false
  let timer = 0
  const open = () => !!document.querySelector(PANEL)
  const poll = () => {
    if (open()) return
    window.clearInterval(timer)
    timer = 0
    if (!paused) return
    paused = false
    const id = resumeTyping()
    if (id) onResume?.(id)
  }
  const down = (e: Event) => {
    const t = e.target instanceof Element ? e.target : null
    if (!t || t.closest('[data-paper-box] [data-box-content]')) return
    const bar = !!t.closest(BAR)
    if (!bar && !t.closest(PANEL)) return
    if (!pauseTyping()) return
    paused = true
    if (!timer) timer = window.setInterval(poll, bar ? 400 : 200)
  }
  document.addEventListener('pointerdown', down, true)
  return () => {
    document.removeEventListener('pointerdown', down, true)
    window.clearInterval(timer)
  }
}
