import { memStore } from '../../app/tools/store'
import type { Editor } from '../barActions'

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

/** Opens the pad (or closes it when it is already open for this editor). */
export function toggleWritePad(editor: Editor, pageId?: string): void {
  const open = writePad.get()
  if (open && open.editor === editor) writePad.set(null)
  else writePad.set({ editor, pageId, ...currentRange(editor) })
}

/** Closes the pad when its editor goes away (the page was left). */
export function closeWritePadFor(editor: unknown): void {
  if (writePad.get()?.editor === editor) writePad.set(null)
}
