import type { Selection } from 'prosemirror-state'
import { memStore } from '../../app/tools/store'
import type { Editor } from '../barActions'
import { triggerFirstUse } from '../../help/firstUse'

/**
 * Whether the Write pad is open, and where the editor's cursor or selection
 * was when it opened. Tiny on purpose: the tool registry reads it in the
 * first load; the pad itself (WritePad.tsx) is a late-loaded chunk.
 */
export interface PadSession {
  editor: Editor
  /** The editor selection to insert at or replace (document positions). */
  from: number
  to: number
  /** The page being written on (the AI engine checks its notebook). */
  pageId?: string
}

export const writePad = memStore<PadSession | null>(null)

/** Reads the editor's selection now (on open, and when the pad is tapped). */
export function currentRange(editor: Editor): { from: number; to: number } {
  return editor.transact((tr) => ({
    from: tr.selection.from,
    to: tr.selection.to,
  }))
}

/**
 * Where the pad writes when it opens. With no cursor yet (the page was never
 * tapped, so the selection is still the very start) it is the end of the page,
 * so the live copy and Insert go somewhere sensible (R7-24).
 */
export function startRange(editor: Editor): { from: number; to: number } {
  const r = currentRange(editor)
  const view = editor.prosemirrorView
  if (!view || view.hasFocus() || r.from !== r.to) return r
  const doc = view.state.doc
  // The statics of the selection's own class (all inherit them from
  // Selection): importing prosemirror-state here would put the whole
  // editor engine in the first download.
  const kind = view.state.selection.constructor as typeof Selection
  if (r.from !== kind.atStart(doc).from) return r
  const end = kind.atEnd(doc).to
  return { from: end, to: end }
}

/** Opens the pad (or closes it when it is already open for this editor). */
export function toggleWritePad(editor: Editor, pageId?: string): void {
  const open = writePad.get()
  if (open && open.editor === editor) closeWritePad()
  else {
    writePad.set({ editor, pageId, ...startRange(editor) })
    triggerFirstUse('writePad')
  }
}

/**
 * Closes the pad. The pad itself first makes its text final on the page
 * (one Undo step), if it can (R7-25); see WritePad.tsx.
 */
let beforeClose: (() => void) | null = null
export function onWritePadClose(fn: (() => void) | null): void {
  beforeClose = fn
}
export function closeWritePad(): void {
  beforeClose?.()
  writePad.set(null)
}

/** Closes the pad when its editor goes away (the page was left). */
export function closeWritePadFor(editor: unknown): void {
  if (writePad.get()?.editor === editor) writePad.set(null)
}
