import { createExtension } from '@blocknote/core'
import { Plugin } from 'prosemirror-state'
import type { Transaction } from 'prosemirror-state'
import { onGestureReset, registerToolState } from '../app/gestureReset'
import { inputMachine } from '../app/inputMachine'
import { scribbleFree } from './penMode'
import type { AppSchema } from './schema'

/**
 * Data-loss guard for the Apple Pencil (batches 2f and 3a). On an iPad, a
 * Pencil drag across text must only SELECT it. iPadOS Scribble can read a
 * back-and-forth drag as "scratch out" and delete text, or write over the
 * selection. Four layers (the Pencil gesture itself is handled in penSelect.ts):
 *  1. `beforeinput` events that delete, replace or write text while a Pencil
 *     gesture that began in the page is active (or ended less than 500 ms ago)
 *     are refused, unless a key was pressed in the last 500 ms;
 *  2. a ProseMirror `filterTransaction` rejects any change that removes or
 *     replaces content in that same window, however it arrived (a beforeinput
 *     we did not see, a composition, a direct DOM change). Undo and Redo and
 *     real key presses are exempt, and so is anything started from a bar or
 *     menu, because those taps begin outside the page text;
 *  3. if a big deletion still happens right after pen input, a message offers
 *     Undo;
 *  4. every deletion goes through the editor history, and History keeps a copy
 *     first (pageSync.ts).
 * "Pencil writes text (Scribble)" in Settings turns the Scribble layers off.
 */

type Editor = AppSchema['BlockNoteEditor']

const PEN_AFTER_MS = 500
/**
 * After a Pencil double/triple tap selects text, nothing may delete, replace
 * or write over that selection for this long (ms) unless a key was pressed,
 * whatever the Scribble setting. Pencil drift or a stray Scribble dot right
 * after the tap otherwise replaces the word (owner bug, 11 Nov 2026).
 */
export const SELECT_GRACE_MS = 600
const KEY_RECENT_MS = 500
/** A drop of this many characters right after pen input offers Undo. */
const BIG_DELETION = 20
const TOAST_AFTER_PEN_MS = 1000

/** The Pencil and keyboard, as last seen in the page. */
export interface PenState {
  /** A Pencil gesture that began in the page text is going on. */
  down: boolean
  /** When the last such gesture ended (ms). */
  upAt: number
  /** When a key was last pressed (ms). */
  lastKeyAt: number
  /** When a tap last selected text on purpose (ms). */
  selectedAt?: number
}

export const penState: PenState = {
  down: false,
  upAt: -1e9,
  lastKeyAt: -1e9,
  selectedAt: -1e9,
}
const clock: () => number = () => Date.now()

// The watchdog: a Pencil gesture whose lift was lost in the background must
// not keep refusing every deletion (R7-5 family).
onGestureReset(() => {
  penState.down = false
})
registerToolState('penGuard', () => ({
  down: penState.down,
  upAgoMs: penState.upAt > 0 ? clock() - penState.upAt : null,
}))

/** A tap just selected text: the grace period is on. */
export const selectGraceOn = (
  pen: { selectedAt?: number },
  now: number,
): boolean => now - (pen.selectedAt ?? -1e9) < SELECT_GRACE_MS

/** Called by tapSelect when a Pencil tap has selected a word, line or block. */
export function noteTapSelected(now: number = clock()): void {
  penState.selectedAt = now
}

/** Is a Pencil gesture going on, or did one just end? */
const penBusy = (pen: { down: boolean; upAt: number }, now: number): boolean =>
  pen.down || now - pen.upAt < PEN_AFTER_MS

/** Pure rule: should this input be refused? */
export function refuseDelete(
  inputType: string,
  now: number,
  pen: { down: boolean; upAt: number; selectedAt?: number },
  lastKeyAt: number,
): boolean {
  if (!inputType.startsWith('delete')) return false
  return (
    (penBusy(pen, now) || selectGraceOn(pen, now)) &&
    now - lastKeyAt > KEY_RECENT_MS
  )
}

/** What Scribble sends when it writes: text in, or text swapped. */
const WRITING = new Set([
  'insertText',
  'insertReplacementText',
  'insertCompositionText',
  'insertFromComposition',
  'insertTranspose',
])

/** Pure rule: refuse deleting, and (with Scribble off) writing too. */
export function refuseInput(
  inputType: string,
  now: number,
  pen: { down: boolean; upAt: number; selectedAt?: number },
  lastKeyAt: number,
  scribbleOn: boolean,
): boolean {
  // Grace after a tap-selection: no deleting and no writing, Scribble or not.
  if (
    selectGraceOn(pen, now) &&
    now - lastKeyAt > KEY_RECENT_MS &&
    (inputType.startsWith('delete') || WRITING.has(inputType))
  )
    return true
  // Scribble free (Text tool): handwriting and small deletes are the user's
  // own; only a big scratch-out is held back (see refuseTransaction).
  if (scribbleOn) return false
  if (refuseDelete(inputType, now, pen, lastKeyAt)) return true
  return (
    !scribbleOn &&
    WRITING.has(inputType) &&
    penBusy(pen, now) &&
    now - lastKeyAt > KEY_RECENT_MS
  )
}

/** Does this transaction remove or replace content? */
function removesContent(tr: Transaction): boolean {
  return tr.steps.some((step) => {
    const json = step.toJSON() as {
      stepType?: string
      from?: number
      to?: number
    }
    return (
      (json.stepType === 'replace' || json.stepType === 'replaceAround') &&
      json.from !== json.to
    )
  })
}

/** Pure rule: should the editor refuse this transaction? */
export function refuseTransaction(
  tr: Transaction,
  now: number,
  pen: PenState,
  scribbleOn: boolean,
): boolean {
  if (!tr.docChanged || !removesContent(tr)) return false
  // Undo and Redo, and a real key press, are the user's own doing.
  if (tr.getMeta('history$') !== undefined) return false
  if (now - pen.lastKeyAt <= KEY_RECENT_MS) return false
  if (selectGraceOn(pen, now)) return true
  if (!penBusy(pen, now)) return false
  // Scribble free: small edits are fine, a big scratch-out is refused.
  if (scribbleOn) {
    return (
      tr.before.textContent.length - tr.doc.textContent.length >= BIG_DELETION
    )
  }
  return true
}

/** The editor extension that holds the filterTransaction safety net. */
export const penTransactionGuard = createExtension({
  key: 'learning-notes-pen-guard',
  prosemirrorPlugins: [
    new Plugin({
      filterTransaction: (tr) =>
        !refuseTransaction(tr, clock(), penState, scribbleFree()),
    }),
  ],
})

export function watchPenGuard(
  editor: Editor,
  offerUndo: () => void,
): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument
  // content.size, not textContent.length: textContent joins the text of the
  // WHOLE page on every keystroke (slow on big pages); the size falls by the
  // same amount when text is deleted.
  let size = editor.prosemirrorView?.state.doc.content.size ?? 0
  // Only a Pencil gesture that began in the page text counts: a tap on the
  // bar or a menu (Delete, Undo) is the user asking, so it is never held back.
  let gesturePointer: number | null = null

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'pen') return
    if (e.type === 'pointerdown') {
      if (e.target instanceof Node && dom.contains(e.target)) {
        penState.down = true
        gesturePointer = e.pointerId
        // A Pencil lift that never comes is dropped after 4 s without movement.
        inputMachine.begin(e, 'penGuard', () => {
          penState.down = false
          penState.upAt = clock()
          gesturePointer = null
        })
      }
    } else if (
      (e.type === 'pointerup' || e.type === 'pointercancel') &&
      penState.down &&
      e.pointerId === gesturePointer
    ) {
      penState.down = false
      penState.upAt = clock()
      gesturePointer = null
    }
  }
  const onKey = () => {
    penState.lastKeyAt = clock()
  }
  const onBeforeInput = (e: Event) => {
    const input = e as InputEvent
    const scribbleOn = scribbleFree()
    if (
      refuseInput(
        input.inputType,
        clock(),
        penState,
        penState.lastKeyAt,
        scribbleOn,
      )
    ) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  }
  const unchange = editor.onChange(() => {
    const now = clock()
    const next = editor.prosemirrorView?.state.doc.content.size ?? size
    const penRecent = penState.down || now - penState.upAt < TOAST_AFTER_PEN_MS
    if (
      penRecent &&
      now - penState.lastKeyAt > KEY_RECENT_MS &&
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
    penState.down = false
  }
}
