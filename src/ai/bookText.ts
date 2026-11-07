import {
  flattenToc,
  makeEpubLoader,
  type TocNode,
} from '../reader/epub/epubLoader'
import { pageText, type SearchableDoc } from '../reader/pdf/pdfSearch'
import type { BookPart } from './bookAsk'

/**
 * The words of a book, read on demand for Ask this book and Story so far.
 * PDF: page by page from the open document. EPUB: section by section from
 * the file (opened again here, apart from the reader's view).
 */

export async function pdfParts(
  doc: SearchableDoc,
  from: number,
  to: number,
): Promise<BookPart[]> {
  const out: BookPart[] = []
  const last = Math.min(to, doc.numPages)
  for (let p = Math.max(1, from); p <= last; p++) {
    const text = await pageText(doc, p).catch(() => '')
    out.push({ cite: `p. ${p}`, at: `pdf:${p}:0`, text })
  }
  return out
}

interface Section {
  id: string
  createDocument: () => Promise<Document>
}

export interface EpubBook {
  /** One per spine section, with the contents title where there is one. */
  chapters: { title: string; href: string }[]
  /** A section's words as a BookPart (`ch. N`, counting from 1). */
  part: (index: number) => Promise<BookPart>
}

export async function openEpub(data: ArrayBuffer): Promise<EpubBook> {
  const { EPUB } = await import('../vendor/foliate-js/epub.js')
  const book = (await new EPUB(
    makeEpubLoader(new Uint8Array(data)),
  ).init()) as {
    toc?: TocNode[]
    sections?: Section[]
  }
  const sections = book.sections ?? []
  const toc = flattenToc(book.toc)
  const titleOf = (href: string) =>
    toc.find((t) => t.href.split('#')[0] === href)?.title
  const chapters = sections.map((s, i) => ({
    title: titleOf(s.id) ?? `${i + 1}`,
    href: s.id,
  }))
  return {
    chapters,
    part: async (i) => {
      const s = sections[i]
      const doc = s ? await s.createDocument().catch(() => null) : null
      const text = (doc?.body?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return { cite: `ch. ${i + 1}`, at: `href:${s?.id ?? ''}`, text }
    },
  }
}
