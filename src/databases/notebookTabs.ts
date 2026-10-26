import type { NotebookTab } from '../core/types'

/**
 * Notebook tabs: every normal notebook gets Notes · Database · Cards from
 * the default tab template (custom tab templates later).
 */

/**
 * Id of a notebook's Study tracker database. Derived from the notebook id
 * (not random), so two devices that both create it end up with one record
 * when sync arrives.
 */
export function studyTrackerId(notebookId: string): string {
  return `tracker:${notebookId}`
}

/** The default tab template, for a new notebook. */
export function defaultNotebookTabs(notebookId: string): NotebookTab[] {
  return [
    { id: 'notes', kind: 'notes' },
    {
      id: 'database',
      kind: 'database',
      databaseId: studyTrackerId(notebookId),
    },
    { id: 'cards', kind: 'cards' },
  ]
}
