/**
 * Find in a PDF (C2b): the text of each page, searched without regard to
 * upper or lower case. The page texts are kept per document, so a second
 * search is instant. A scanned PDF (no text) finds nothing.
 */

/** The parts of a pdf.js document that searching needs. */
export interface SearchableDoc {
  numPages: number
  getPage: (n: number) => Promise<{
    getTextContent: () => Promise<{ items: readonly { str?: string }[] }>
    cleanup?: () => void
  }>
}

export interface PdfHit {
  page: number
  before: string
  match: string
  after: string
}

const SNIPPET = 40
export const MAX_HITS = 300

const cache = new WeakMap<object, Map<number, string>>()

/** One page's words as one line of text. */
export async function pageText(
  doc: SearchableDoc,
  n: number,
): Promise<string> {
  let pages = cache.get(doc)
  if (!pages) cache.set(doc, (pages = new Map()))
  const known = pages.get(n)
  if (known !== undefined) return known
  const page = await doc.getPage(n)
  const content = await page.getTextContent()
  page.cleanup?.()
  const text = content.items
    .map((i) => i.str ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  pages.set(n, text)
  return text
}

/** Every place `query` occurs on one page's text. */
export function hitsIn(text: string, query: string, page: number): PdfHit[] {
  const q = query.trim().toLowerCase()
  if (q === '') return []
  const hay = text.toLowerCase()
  const out: PdfHit[] = []
  for (let at = hay.indexOf(q); at !== -1; at = hay.indexOf(q, at + q.length)) {
    out.push({
      page,
      before: text.slice(Math.max(0, at - SNIPPET), at),
      match: text.slice(at, at + q.length),
      after: text.slice(at + q.length, at + q.length + SNIPPET),
    })
    if (out.length >= 20) break // a page full of one word needs no more
  }
  return out
}

/**
 * Searches all pages in order and reports hits as it goes. `isCancelled`
 * is checked between pages so a newer search can take over.
 */
export async function searchPdf(
  doc: SearchableDoc,
  query: string,
  isCancelled: () => boolean,
  onHits: (hits: PdfHit[], searched: number) => void,
): Promise<void> {
  if (query.trim().length < 2) return onHits([], 0)
  const all: PdfHit[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    if (isCancelled()) return
    all.push(...hitsIn(await pageText(doc, n), query, n))
    if (all.length >= MAX_HITS) {
      onHits(all.slice(0, MAX_HITS), n)
      return
    }
    if (n % 10 === 0 || n === doc.numPages) onHits([...all], n)
  }
}
