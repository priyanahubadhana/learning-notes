import { createContext } from 'react'
import type { LearningNotesDB } from '../core/db'

/** What custom editor blocks (e.g. page links) need from the app. */
export interface EditorAppContext {
  db: LearningNotesDB
  openPage: (pageId: string) => void
}

export const EditorContext = createContext<EditorAppContext | null>(null)

/** What the page around the editor can ask it to do. */
export interface EditorApi {
  focus: () => void
  /** Saves pending edits now (e.g. before "Save as template"). */
  flush: () => Promise<void>
}
