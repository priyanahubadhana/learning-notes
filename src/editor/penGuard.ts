import type { AppSchema } from './schema'

/**
 * Data-loss guard for the Apple Pencil (batch 2f). On an iPad, a Pencil drag
 * across text must only SELECT it. iPadOS Scribble can read a back-and-forth
 * drag as "scratch out" and delete the text, so:
 *  1. a `beforeinput` that deletes (delete*) while the Pencil is touching the
 *     screen, or in the 300 ms after it lifts, is refused, unless a key was
 *     pressed in the last 500 ms (a real Backspace or Delete);
 *  2. if a big deletion still happens right after pen input, a message offers
 *     Undo.
 * Choosing Delete from a menu or bar is not a `beforeinput`, so it still works.
 */

type Editor = AppSchema['BlockNoteEditor']

export const PEN_AFTER_MS = 300
export const KEY_RECENT_MS = 500
/** A drop of this many characters right after pen input offers Undo. */
export const BIG_DELETION = 20
const TOAST_AFTER_PEN_MS = 1000

/** Pure rule: should this input be refused? */
export function refuseDelete(
  inputType: string,
  now: number,
  pen: { down: boolean; upAt: number },
  lastKeyAt: number,
): boolean {
  if (!inputType.startsWith('delete')) return false
  const penBusy = pen.down || now - pen.upAt < PEN_AFTER_MS
  return penBusy && now - lastKeyAt > KEY_RECENT_MS
}

export function watchPenGuard(
  editor: Editor,
  offerUndo: () => void,
  clock: () => number = () => Date.now(),
): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument
  const pen = { down: false, upAt: -1e9 }
  let lastKeyAt = -1e9
  let size = editor.prosemirrorView?.state.doc.textContent.length ?? 0

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'pen') return
    if (e.type === 'pointerdown') pen.down = true
    else if (e.type === 'pointerup' || e.type === 'pointercancel') {
      pen.down = false
      pen.upAt = clock()
    }
  }
  const onKey = () => {
    lastKeyAt = clock()
  }
  const onBeforeInput = (e: Event) => {
    const input = e as InputEvent
    if (refuseDelete(input.inputType, clock(), pen, lastKeyAt)) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  }
  const unchange = editor.onChange(() => {
    const now = clock()
    const next = editor.prosemirrorView?.state.doc.textContent.length ?? size
    const penRecent = pen.down || now - pen.upAt < TOAST_AFTER_PEN_MS
    if (
      penRecent &&
      now - lastKeyAt > KEY_RECENT_MS &&
      size - next >= BIG_DELETION
    ) {
      offerUndo()
    }
    size = next
  })

  for (const type of ['pointerdown', 'pointerup', 'pointercancel']) {
    doc.addEventListener(type, onPointer as EventListener, true)
  }
  doc.addEventListener('keydown', onKey, true)
  dom.addEventListener('beforeinput', onBeforeInput, true)
  return () => {
    for (const type of ['pointerdown', 'pointerup', 'pointercancel']) {
      doc.removeEventListener(type, onPointer as EventListener, true)
    }
    doc.removeEventListener('keydown', onKey, true)
    dom.removeEventListener('beforeinput', onBeforeInput, true)
    unchange?.()
  }
}
