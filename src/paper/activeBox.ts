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
