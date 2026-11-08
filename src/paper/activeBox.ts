import { useSyncExternalStore } from 'react'

/**
 * Phase Q: which box of the open page has the caret. The one toolbar of the
 * page (the docked bar) follows it; with none chosen it sits with the
 * default box, as before boxes existed.
 */
let current: { pageId: string; boxId: string } | null = null
const listeners = new Set<() => void>()

export const activeBox = {
  get: () => current,
  set(pageId: string, boxId: string) {
    if (current?.pageId === pageId && current.boxId === boxId) return
    current = { pageId, boxId }
    for (const fn of listeners) fn()
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

/**
 * Does this box own the page's toolbar now? Only a change of the answer
 * re-renders (the editor's menus must not remount on every focus).
 */
export function useOwnsBar(pageId: string, boxId: string | undefined) {
  const id = boxId ?? 'main'
  const owns = () => {
    const now = current
    return now?.pageId !== pageId ? id === 'main' : now.boxId === id
  }
  return useSyncExternalStore(activeBox.subscribe, owns)
}

/**
 * The editor of each box of an open page, so the floating bar under a
 * selected box can format that box's text (the toolbar runtime only knows
 * the editor that rendered last).
 */
type AnyEditor = import('../editor/barActions').Editor
const editors = new Map<string, AnyEditor>()
export const boxEditors = {
  set: (pageId: string, boxId: string, ed: AnyEditor) =>
    void editors.set(pageId + '/' + boxId, ed),
  clear: (pageId: string, boxId: string, ed: AnyEditor) => {
    if (editors.get(pageId + '/' + boxId) === ed)
      editors.delete(pageId + '/' + boxId)
  },
  get: (pageId: string, boxId: string) => editors.get(pageId + '/' + boxId),
}

/** Every box editor that is open now (the page-wide Cut and Delete use them). */
export const allBoxEditors = () => [...editors.values()]
