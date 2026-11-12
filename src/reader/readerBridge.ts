import type { PDFDocumentProxy } from 'pdfjs-dist'
import { memStore } from '../app/tools/store'
import type { Annotation } from '../core/types'
import type { PageEditApi } from './v2/usePageEdit'

/** One line of a book's contents. `at` is an EPUB locator when it has one. */
export interface BridgeOutlineItem {
  title: string
  page: number
  depth: number
  at?: string
}

/**
 * What the open book tells the left panel (items 32 and 45). The reader
 * publishes it while it is open and clears it on close; the panel shows the
 * book's Pages, Outline and Notes instead of the note's while it is set.
 */
export interface ReaderBridge {
  pageId: string
  title: string
  format: 'pdf' | 'epub'
  pageCount: number
  /** PDF: the page now open. */
  page: number
  /** EPUB: the chapter now open. */
  label: string
  progress: number
  outline: BridgeOutlineItem[]
  doc: PDFDocumentProxy | null
  go: (at: string) => void
  jump: (a: Annotation) => void
  /** Cards from one or several notes (the reader owns the card maker). */
  makeCards: (list: Annotation[]) => void
  /** Flag reader.v2, PDF: edits from the Pages grid (see v2/usePageEdit.ts). */
  pageEdit?: PageEditApi
}

export const readerBridge = memStore<ReaderBridge | null>(null)
