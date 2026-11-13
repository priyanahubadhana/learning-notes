import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../core/db'
import type { Destination } from './buildState'

export interface DestinationLists {
  notebooks: { id: string; title: string }[] | undefined
  pages: { id: string; title: string; notebookId: string }[] | undefined
}

/** The notebooks and pages a result can go to (live). */
export function useDestinationLists(db: LearningNotesDB): DestinationLists {
  const notebooks = useLiveQuery(
    () =>
      db.notebooks
        .filter((n) => !n.deletedAt && !n.kind)
        .toArray()
        .then((l) => l.sort((a, b) => a.title.localeCompare(b.title))),
    [db],
  )
  const pages = useLiveQuery(
    () =>
      db.pages
        .filter((p) => !p.deletedAt)
        .limit(500)
        .toArray()
        .then((l) => l.sort((a, b) => a.title.localeCompare(b.title))),
    [db],
  )
  return { notebooks, pages }
}

/** The place in words (the new notebook's name, or the chosen title). */
export function destinationName(
  dest: Destination,
  lists: DestinationLists,
): string {
  if (dest.kind === 'new_notebook') return dest.title.trim()
  if (dest.kind === 'notebook')
    return lists.notebooks?.find((n) => n.id === dest.id)?.title ?? ''
  return lists.pages?.find((p) => p.id === dest.id)?.title ?? ''
}
