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

/** Runs after every applyPageMode (the edit locks use it to stay locked). */
const applied = new Set<() => void>()
export function onModeApplied(fn: () => void): () => void {
  applied.add(fn)
  return () => {
    applied.delete(fn)
  }
}

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
  for (const fn of [...applied]) fn()
}

type ModeTarget = Parameters<typeof applyPageMode>[1]

/**
 * P1 speed (17 Nov 2026): a page has one editor per box. When the tool
 * changed, each editor applied the mode in turn, and each editor's switch
 * reads the page's selection right after the editor before it had changed
 * the page, so the browser worked out the page's styles once per box (about
 * 60 ms on a desktop, several times that on an iPad). The editors of one
 * render now queue their mode and it is applied to all of them together,
 * before the next paint: the page changes first (focus, inert), then every
 * editor's typing switch. The result is the same as applyPageMode on each.
 */
const modeQueue = new Map<ModeTarget['editor'], [PageMode, ModeTarget]>()

function flushModes(): void {
  const list = [...modeQueue.values()]
  modeQueue.clear()
  if (list.length === 0) return
  const active = document.activeElement
  for (const [mode, { content, title }] of list) {
    if (
      (mode === 'ink' || mode === 'select') &&
      content &&
      active instanceof HTMLElement &&
      content.contains(active)
    )
      active.blur()
    if (content) content.toggleAttribute('inert', mode === 'ink')
    if (title) {
      title.readOnly = mode === 'ink'
      title.toggleAttribute('inert', mode === 'ink')
    }
  }
  for (const [mode, { editor }] of list) editor.isEditable = editableIn(mode)
  pageMode.set(list[list.length - 1][0])
  for (const fn of [...applied]) fn()
}

/** applyPageMode for an editor of the page, batched with the page's other editors. */
export function queuePageMode(mode: PageMode, el: ModeTarget): () => void {
  if (modeQueue.size === 0) queueMicrotask(flushModes)
  modeQueue.set(el.editor, [mode, el])
  return () => {
    if (modeQueue.get(el.editor)?.[1] === el) modeQueue.delete(el.editor)
  }
}
