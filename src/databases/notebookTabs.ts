import type { NotebookTab } from '../core/types'
import { t, type MessageKey } from '../i18n/t'

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

const DEFAULT_NAMES: Record<string, MessageKey> = {
  notes: 'notebook.tab.notes',
  database: 'notebook.tab.database',
  cards: 'notebook.tab.cards',
}

/** A tab's own name, or its kind's default name. */
export function tabName(tab: NotebookTab): string {
  if (tab.title) return tab.title
  const key = DEFAULT_NAMES[tab.kind]
  return key ? t(key) : tab.kind
}
