import type { LearningNotesDB } from '../core/db'
import { createAutosaver } from '../editor/autosave'
import { renamePage } from './pageService'

/** Debounced saving of a page title while the user types. */
export interface TitleSaver {
  /** Call on every keystroke with the full title. */
  set: (title: string) => void
  /** Save a pending title now. */
  flush: () => Promise<void>
}

export function createTitleSaver(
  db: LearningNotesDB,
  pageId: string,
  delayMs = 300,
): TitleSaver {
  let latest: string | null = null
  const autosaver = createAutosaver(async () => {
    if (latest !== null) await renamePage(db, pageId, latest)
  }, delayMs)

  return {
    set(title) {
      latest = title
      autosaver.schedule()
    },
    flush: autosaver.flush,
  }
}
