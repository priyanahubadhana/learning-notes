import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { toPlainText } from '../editor/mapping'
import { getBookFile } from '../library/libraryService'

/**
 * Where a prompt or skill gets its words: a pasted text, a page, or a PDF.
 * Reads only; nothing is sent from here.
 */

/** Most characters one run reads (about 75,000 tokens). */
export const MAX_INPUT_CHARS = 300_000

export interface InputText {
  text: string
  /** The text was longer than the limit and was cut. */
  cut: boolean
}

export function clipInput(text: string): InputText {
  const clean = text.replace(/\r\n?/g, '\n').trim()
  return clean.length > MAX_INPUT_CHARS
    ? { text: clean.slice(0, MAX_INPUT_CHARS), cut: true }
    : { text: clean, cut: false }
}

/** The page's own words (AI-made blocks are left out), one block a line. */
export async function textOfPage(
  db: LearningNotesDB,
  page: Page,
): Promise<InputText> {
  const blocks = await listBlocks(db, page.id)
  return clipInput(
    blocks
      .filter((b) => b.source !== 'ai')
      .map((b) => toPlainText(b.content))
      .filter(Boolean)
      .join('\n'),
  )
}

/** The words of a PDF's pages, each page marked [p. n] so sources can name it. */
export async function textOfPdf(data: ArrayBuffer): Promise<InputText> {
  const [{ loadPdfjs }, { pageText }] = await Promise.all([
    import('../app/pdfjs'),
    import('../reader/pdf/pdfSearch'),
  ])
  const pdfjs = await loadPdfjs()
  const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) })
  const doc = await task.promise
  try {
    const parts: string[] = []
    let size = 0
    for (let p = 1; p <= doc.numPages && size <= MAX_INPUT_CHARS; p++) {
      const text = await pageText(doc, p).catch(() => '')
      if (!text) continue
      parts.push(`[p. ${p}] ${text}`)
      size += text.length
    }
    return clipInput(parts.join('\n'))
  } finally {
    void task.destroy()
  }
}

/** The PDF stored with a Library page, or undefined (not a PDF, or file gone). */
export async function pdfOfPage(
  db: LearningNotesDB,
  page: Page,
): Promise<ArrayBuffer | undefined> {
  if (page.source?.kind !== 'book') return undefined
  const file = await getBookFile(db, page.id)
  return file && file.mime === 'application/pdf' ? file.data : undefined
}

/** The words a run will use, and whether they are still being read. */
export interface InputValue extends InputText {
  busy: boolean
  /** What they came from, for the cost line and the log. */
  label: string
}

export const EMPTY_INPUT: InputValue = {
  text: '',
  cut: false,
  busy: false,
  label: '',
}
