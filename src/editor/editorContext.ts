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
  /** Reviews this page's cards (and its sub-pages'); unset on templates. */
  reviewCards?: (includeSubpages: boolean) => void
  /** Shows everything with a tag (Search); unset = tags are not clickable. */
  openTag?: (tagId: string) => void
  /** Opens a database on its own screen; unset = no "Open" button. */
  openDatabase?: (databaseId: string) => void
}

export const EditorContext = createContext<EditorAppContext | null>(null)

/** What the page around the editor can ask it to do. */
export interface EditorApi {
  focus: () => void
  /** Saves pending edits now (e.g. before "Save as template"). */
  flush: () => Promise<void>
  /** ⋯ menu: copy the whole page (with pictures, as text or Markdown). */
  copyPage: (kind: 'pictures' | 'plain' | 'markdown') => void
  /** ⋯ menu: paste the clipboard's words without formatting. */
  pastePlain: () => void
}
