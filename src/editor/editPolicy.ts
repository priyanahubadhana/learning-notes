import { memStore } from '../app/tools/store'
import type { ModeTool } from '../app/tools/main/mainTools'

/**
 * What the page is allowed to do right now: one source of truth. While an ink
 * tool is chosen the page is not editable and inert, so iPadOS Scribble (which
 * collects every editable element under a Pencil stroke) finds nothing to
 * write in. Choosing Text makes it editable again.
 */
export type PageMode = 'edit' | 'select' | 'ink' | 'read' | 'frozen'

export function pageModeFor(o: {
  tool: ModeTool
  frozen: boolean
  reading: boolean
}): PageMode {
  if (o.frozen) return 'frozen'
  if (o.reading) return 'read'
  if (o.tool === 'lasso') return 'select'
  if (o.tool === 'pen' || o.tool === 'highlighter' || o.tool === 'eraser')
    return 'ink'
  return 'edit'
}

/** Pencil lab: switch the whole policy off to see what it protects. */
export const policyEnabled = memStore(true)

/** The mode of the open page (the title and other chrome follow it). */
export const pageMode = memStore<PageMode>('edit')

/**
 * Lasso mode makes the page not editable once the app draws its own caret and
 * selection (step A3); until then Lasso keeps the browser's own caret.
 */
const SELECT_IS_READ_ONLY = false

/** Does the page accept typing in this mode? */
export const editableIn = (mode: PageMode): boolean =>
  mode === 'edit' || (mode === 'select' && !SELECT_IS_READ_ONLY)

export function applyPageMode(
  mode: PageMode,
  el: {
    editor: { isEditable: boolean }
    content: HTMLElement | null
    title: HTMLTextAreaElement | HTMLInputElement | null
  },
): void {
  const { editor, content, title } = el
  const blurInside = () => {
    const a = document.activeElement
    if (content && a instanceof HTMLElement && content.contains(a)) a.blur()
  }
  if (mode === 'ink') blurInside()
  if (mode === 'select') blurInside()
  editor.isEditable = editableIn(mode)
  if (content) content.toggleAttribute('inert', mode === 'ink')
  if (title) {
    title.readOnly = mode === 'ink'
    title.toggleAttribute('inert', mode === 'ink')
  }
  pageMode.set(mode)
}
