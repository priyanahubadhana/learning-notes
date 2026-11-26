import { createExtension } from '@blocknote/core'
import { Plugin } from 'prosemirror-state'
import type { Transaction } from 'prosemirror-state'
import { onGestureReset, registerToolState } from '../app/gestureReset'
import { inputMachine } from '../app/inputMachine'
import { gapMs, sharedTiming, stampNow, stampOf } from '../app/tapTiming'
import { scribbleFree } from './penMode'
import { scribbleInput } from './scribbleDelete'
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
  /** When a Pencil tap on the text last ended (ms; C14). */
  tapAt?: number
}

export const penState: PenState = {
  down: false,
  upAt: -1e9,
  lastKeyAt: -1e9,
  selectedAt: -1e9,
}
/**
 * Now, on the clock of the events' time stamps (C14): every time kept here
 * is an event's own time stamp, so a listener that runs late on a busy page
 * does not move it.
 */
const clock: () => number = stampNow

/** A press this short (ms) is a tap, when the tip barely moved. */
const TAP_PRESS_MS = 300
/** The furthest (px, along its whole path) the tip may travel during a tap. */
export const TAP_PATH_PX = 16
/** Tip moves shorter than this (px) are the sensor's own noise, not travel. */
const PATH_STEP_PX = 2

/** The tip's path so far: its length and the last point counted. */
export interface TipPath {
  len: number
  x: number
  y: number
}

/** The path after the tip reached (x, y); `end` counts the last bit too. */
export function tipPathTo(
  path: TipPath,
  x: number,
  y: number,
  end = false,
): TipPath {
  const d = Math.hypot(x - path.x, y - path.y)
  if (d < PATH_STEP_PX && !end) return path
  return { len: path.len + d, x, y }
}

/**
 * Was this press a tap (C14)? Short, and the tip travelled almost nowhere
 * along its WHOLE path. Why the path: a quick scratch-out over a small
 * glyph goes back and forth and ends near where it began; by the distance
 * from start to end it looked like a tap, and the delete it asked for was
 * refused by the tap grace (C4, "ten scribbles").
 */
export const wasPenTap = (heldMs: number, pathPx: number): boolean =>
  heldMs <= TAP_PRESS_MS && pathPx <= TAP_PATH_PX

// The watchdog: a Pencil gesture whose lift was lost in the background must
// not keep refusing every deletion (R7-5 family).
onGestureReset(() => {
  penState.down = false
})
registerToolState('penGuard', () => ({
  down: penState.down,
  upAgoMs: penState.upAt > 0 ? Math.round(clock() - penState.upAt) : null,
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

/**
 * C14 (switch textbox.v2): a Pencil tap never deletes. Between the taps of a
 * double or triple tap and a moment after (the tap gap + 200 ms), a delete
 * with no key pressed is refused. Writing is not: a tap places the caret
 * for Scribble.
 */
export const tapGraceOn = (pen: { tapAt?: number }, now: number): boolean =>
  sharedTiming() && now - (pen.tapAt ?? -1e9) < gapMs(450) + 200

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
  pen: { down: boolean; upAt: number; selectedAt?: number; tapAt?: number },
  lastKeyAt: number,
  scribbleOn: boolean,
): boolean {
  if (
    inputType.startsWith('delete') &&
    tapGraceOn(pen, now) &&
    now - lastKeyAt > KEY_RECENT_MS
  )
    return true
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

/**
 * Does this transaction remove or replace content? With `within`, only a
 * removal that overlaps that range counts (a synced change to another block
 * is not an attack on the selection).
 */
function removesContent(
  tr: Transaction,
  within?: { from: number; to: number },
): boolean {
  return tr.steps.some((step) => {
    const json = step.toJSON() as {
      stepType?: string
      from?: number
      to?: number
    }
    if (
      !(json.stepType === 'replace' || json.stepType === 'replaceAround') ||
      json.from === json.to
    )
      return false
    if (!within) return true
    return (json.from ?? 0) <= within.to && (json.to ?? 0) >= within.from
  })
}

/** Pure rule: should the editor refuse this transaction? */
export function refuseTransaction(
  tr: Transaction,
  now: number,
  pen: PenState,
  scribbleOn: boolean,
  selection?: { from: number; to: number },
): boolean {
  if (!tr.docChanged || !removesContent(tr)) return false
  // Undo and Redo, and a real key press, are the user's own doing.
  if (tr.getMeta('history$') !== undefined) return false
  if (now - pen.lastKeyAt <= KEY_RECENT_MS) return false
  // C14: nothing is removed in the moments around a Pencil tap.
  if (tapGraceOn(pen, now)) return true
  // Grace after a tap-selection: nothing may remove what is selected. (With
  // no selection to look at, any removal; a collapsed caret uses the rules
  // below.)
  if (selectGraceOn(pen, now)) {
    if (!selection) return true
    if (selection.from !== selection.to) return removesContent(tr, selection)
  }
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
      filterTransaction: (tr, state) =>
        !refuseTransaction(
          tr,
          clock(),
          penState,
          scribbleFree(),
          state.selection,
        ),
    }),
  ],
})

const POINTER_TYPES = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
]

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
  let downAt: { t: number; path: TipPath } | null = null

  const onPointer = (e: PointerEvent) => {
    // A press on a bar, menu or button (Delete, Cut ...) is the person asking:
    // it ends the grace period after a tap-selection at once.
    if (
      e.type === 'pointerdown' &&
      !(e.target instanceof Node && dom.contains(e.target))
    ) {
      penState.selectedAt = -1e9
      // Only a press outside every editor (another box's text is not a bar).
      if (!(e.target instanceof Element && e.target.closest('.bn-editor')))
        penState.tapAt = -1e9
    }
    if (e.pointerType !== 'pen') return
    if (e.type === 'pointermove') {
      if (downAt && e.pointerId === gesturePointer) {
        // A quick stroke arrives as a few moves; the browser keeps the rest
        // in getCoalescedEvents. Without them a fast ring looked like a tap.
        const more = e.getCoalescedEvents?.() ?? []
        for (const c of more.length > 0 ? more : [e])
          downAt.path = tipPathTo(downAt.path, c.clientX, c.clientY)
      }
      return
    }
    if (e.type === 'pointerdown') {
      if (e.target instanceof Node && dom.contains(e.target)) {
        penState.down = true
        gesturePointer = e.pointerId
        downAt = {
          t: stampOf(e),
          path: { len: 0, x: e.clientX, y: e.clientY },
        }
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
      penState.upAt = stampOf(e)
      gesturePointer = null
      // A quick press that barely moved was a tap (C14).
      if (
        e.type === 'pointerup' &&
        downAt &&
        wasPenTap(
          penState.upAt - downAt.t,
          tipPathTo(downAt.path, e.clientX, e.clientY, true).len,
        )
      )
        penState.tapAt = penState.upAt
      downAt = null
    }
  }
  const onKey = (e: Event) => {
    penState.lastKeyAt = stampOf(e)
  }
  const onBeforeInput = (e: Event) => {
    // C4: a delete right after a scribble goes to what the scribble covered.
    scribbleInput(dom, e, penState.lastKeyAt)
    if (e.defaultPrevented) return
    const input = e as InputEvent
    const scribbleOn = scribbleFree()
    if (
      refuseInput(
        input.inputType,
        stampOf(e),
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

  for (const type of POINTER_TYPES) {
    doc.addEventListener(type, onPointer as EventListener, true)
  }
  doc.addEventListener('keydown', onKey, true)
  dom.addEventListener('beforeinput', onBeforeInput, true)
  return () => {
    for (const type of POINTER_TYPES) {
      doc.removeEventListener(type, onPointer as EventListener, true)
    }
    doc.removeEventListener('keydown', onKey, true)
    dom.removeEventListener('beforeinput', onBeforeInput, true)
    unchange?.()
    penState.down = false
  }
}
