import { createContext } from 'react'
import type { LearningNotesDB } from '../core/db'

/** What custom editor blocks (e.g. page links) need from the app. */
export interface EditorAppContext {
  db: LearningNotesDB
  /** The page this editor shows. */
  pageId: string
  openPage: (pageId: string) => void
  /** Opens a page (if not already open) and scrolls to one of its blocks. */
  openBlock: (pageId: string, blockId: string) => void
}

export const EditorContext = createContext<EditorAppContext | null>(null)

/** What the page around the editor can ask it to do. */
export interface EditorApi {
  focus: () => void
  /** Saves pending edits now (e.g. before "Save as template"). */
  flush: () => Promise<void>
}
