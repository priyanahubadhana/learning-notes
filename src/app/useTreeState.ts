import { isStringArray } from './uiPrefs'
import { usePref } from './usePref'

/** Which notebooks/pages are expanded in the sidebar (remembered). */
export interface TreeState {
  isNotebookOpen: (id: string) => boolean
  toggleNotebook: (id: string) => void
  expandNotebook: (id: string) => void
  /** Folds all the given notebooks (the sidebar's "Collapse all"). */
  collapseAllNotebooks: (ids: readonly string[]) => void
  /** Opens every notebook again. */
  expandAllNotebooks: () => void
  isPageOpen: (id: string) => boolean
  togglePage: (id: string) => void
  expandPage: (id: string) => void
}

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

/** Notebooks start open; pages start collapsed (like the prototype). */
export function useTreeState(): TreeState {
  const [collapsedNotebooks, setCollapsedNotebooks] = usePref(
    'collapsedNotebooks',
    isStringArray,
    [],
  )
  const [expandedPages, setExpandedPages] = usePref(
    'expandedPages',
    isStringArray,
    [],
  )

  return {
    isNotebookOpen: (id) => !collapsedNotebooks.includes(id),
    toggleNotebook: (id) => setCollapsedNotebooks((list) => toggle(list, id)),
    expandNotebook: (id) =>
      setCollapsedNotebooks((list) => list.filter((x) => x !== id)),
    collapseAllNotebooks: (ids) => setCollapsedNotebooks([...ids]),
    expandAllNotebooks: () => setCollapsedNotebooks([]),
    isPageOpen: (id) => expandedPages.includes(id),
    togglePage: (id) => setExpandedPages((list) => toggle(list, id)),
    expandPage: (id) =>
      setExpandedPages((list) => (list.includes(id) ? list : [...list, id])),
  }
}
