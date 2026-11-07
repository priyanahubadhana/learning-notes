import { createExtension } from '@blocknote/core'
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
  type Transaction,
} from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { BlockRangeSelection } from './dragSelect'
import { penState } from './penGuard'
import type { AppSchema } from './schema'

/**
 * Our own selection (Phase A3). A selection made by a tap, a hold or a drag
 * must (1) always be visible and (2) stay until the person acts or dismisses
 * it. The iPad's own highlight disappears when the page loses focus, so the
 * selection is also drawn here as decorations (`ln-sel` for words,
 * `ln-sel-node` for whole blocks) that do not depend on focus.
 *
 * Rule (owner): nothing may collapse a non-empty selection except the
 * person: a tap, a key, a bar button, the cross. A change that arrives with
 * no recent input (a late focus change, a timer, Scribble) is put back. This
 * is the fix for "the selection vanishes after about a second".
 */

type Editor = AppSchema['BlockNoteEditor']

const key = new PluginKey('ln-own-selection')

/** Input this recently (ms) makes a selection change the person's own. */
export const INTENT_MS = 700
/** The most block highlights drawn at once. */
const MAX_DECORATIONS = 300
/** A text selection longer than this is drawn by whole blocks. */
const LONG_SELECTION = 6000

/** A kept selection stays this long (ms) against anything but a new tap or key. */
export const KEEP_MS = 1500

let lastInputAt = -1e9
let pointerDown = false
let keptUntil = -1e9

/**
 * A selection the app just made on purpose (a Pencil double or triple tap,
 * tapSelect.ts) is kept: the browser's own late reaction to that same tap
 * (iPadOS sends the tap's synthetic click after our selection, and its
 * mousedown collapses it, R6-18) arrives with no new pointerdown and is put
 * back. The next pointerdown or key press is the person's own move.
 */
export function keepSelection(now = Date.now()): void {
  keptUntil = now + KEEP_MS
}

/** Was there input (a pointer or a key) just now? Pure for tests. */
export const recentIntent = (
  now: number,
  last: number,
  down: boolean,
  kept = -1e9,
) => (down || now - last < INTENT_MS) && now >= kept

/** True when a transaction would collapse a non-empty selection by itself. */
export function wouldLoseSelection(
  before: EditorState,
  tr: Transaction,
  after: EditorState,
  intent: boolean,
): boolean {
  if (intent || tr.docChanged || tr.getMeta(key)?.deselect) return false
  const was = before.selection
  if (was.empty) return false
  if (!(was instanceof TextSelection || was instanceof BlockRangeSelection)) {
    return false
  }
  return after.selection.empty
}

function blockDecorations(
  state: EditorState,
  sel: { from: number; to: number },
): DecorationSet {
  const found: Decoration[] = []
  state.doc.nodesBetween(sel.from, sel.to, (node, pos) => {
    if (found.length >= MAX_DECORATIONS) return false
    if (node.type.name === 'blockContainer') {
      found.push(
        Decoration.node(pos, pos + node.nodeSize, { class: 'ln-sel-node' }),
      )
      return false
    }
    return true
  })
  return DecorationSet.create(state.doc, found)
}

export function selectionDecorations(state: EditorState): DecorationSet {
  const sel = state.selection
  if (sel.empty) return DecorationSet.empty
  if (sel instanceof TextSelection) {
    if (sel.to - sel.from > LONG_SELECTION) return blockDecorations(state, sel)
    return DecorationSet.create(state.doc, [
      Decoration.inline(sel.from, sel.to, { class: 'ln-sel' }),
    ])
  }
  if (sel instanceof BlockRangeSelection) return blockDecorations(state, sel)
  return DecorationSet.empty
}

export const ownSelection = createExtension({
  key: 'learning-notes-own-selection',
  prosemirrorPlugins: [
    new Plugin({
      key,
      props: { decorations: selectionDecorations },
      view: (view) => {
        const doc = view.dom.ownerDocument
        const note = () => {
          lastInputAt = Date.now()
        }
        // A new tap or key is the person's own move: a kept selection is let go.
        const own = () => {
          keptUntil = -1e9
          note()
        }
        const down = () => {
          pointerDown = true
          own()
        }
        const up = () => {
          pointerDown = false
          note()
        }
        doc.addEventListener('pointerdown', down, true)
        doc.addEventListener('pointerup', up, true)
        doc.addEventListener('pointercancel', up, true)
        doc.addEventListener('keydown', own, true)
        doc.addEventListener('beforeinput', note, true)
        return {
          destroy() {
            doc.removeEventListener('pointerdown', down, true)
            doc.removeEventListener('pointerup', up, true)
            doc.removeEventListener('pointercancel', up, true)
            doc.removeEventListener('keydown', own, true)
            doc.removeEventListener('beforeinput', note, true)
          },
        }
      },
      appendTransaction(trs, before, after) {
        const intent = recentIntent(
          Date.now(),
          lastInputAt,
          pointerDown,
          keptUntil,
        )
        for (const tr of trs) {
          if (!wouldLoseSelection(before, tr, after, intent)) continue
          // Put back what was selected (no edit happened, so positions hold).
          const back = before.selection
          if (back.to > after.doc.content.size) return null
          return after.tr.setSelection(
            back instanceof BlockRangeSelection
              ? new BlockRangeSelection(
                  after.doc.resolve(back.anchor),
                  after.doc.resolve(back.head),
                )
              : TextSelection.create(after.doc, back.anchor, back.head),
          )
        }
        return null
      },
    }),
  ],
})

/** The cross, Esc, a tap elsewhere: the person dismisses the selection. */
export function deselect(editor: Editor): void {
  const view = editor.prosemirrorView
  if (!view) return
  const { state } = view
  if (state.selection.empty) return
  const at = Math.min(state.selection.to, state.doc.content.size)
  const near = TextSelection.near(state.doc.resolve(at), -1)
  view.dispatch(state.tr.setSelection(near).setMeta(key, { deselect: true }))
}

/** Deletes what is selected (the Delete of our bar): one Undo step. */
export function deleteSelected(editor: Editor): void {
  const view = editor.prosemirrorView
  if (!view || view.state.selection.empty) return
  // The person pressed Delete: the Pencil guard must not hold it back.
  penState.down = false
  penState.upAt = -1e9
  view.dispatch(view.state.tr.deleteSelection().scrollIntoView())
}
