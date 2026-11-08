import type { BlockRect } from '../../ink/anchor'

/**
 * C2b: ink on EPUB paragraphs. A paragraph is a "leaf" block element of a
 * section (it holds no other block element). Its id is
 * `epub:<section>:<n>`: the section's place in the book and the paragraph's
 * place among the section's leaf blocks, counted in document order. That
 * number does not change when the text size, font or window width changes
 * (the words reflow, the paragraphs stay in order), so ink stays with its
 * paragraph however the text is laid out.
 */
export const BLOCK_SELECTOR =
  'p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,figure,div,td,th,dt,dd,img,svg'

export const epubBlockId = (section: number, n: number): string =>
  `epub:${section}:${n}`

/** The section and paragraph numbers of a saved block id (null if not one). */
export function epubBlockOf(
  blockId: string | null,
): { section: number; n: number } | null {
  const m = /^epub:(\d{1,6}):(\d{1,6})$/.exec(blockId ?? '')
  return m ? { section: Number(m[1]), n: Number(m[2]) } : null
}

/**
 * The leaf blocks of a section, in document order: elements that match the
 * selector and contain no other match. Cached per document by the caller.
 */
export function leafBlocks(doc: Document): Element[] {
  const all = Array.from(doc.body?.querySelectorAll(BLOCK_SELECTOR) ?? [])
  return all.filter((el) => !el.querySelector(BLOCK_SELECTOR))
}

/** A leaf element's rect, in px from the wrap's top-left. */
export function blockIn(
  id: string,
  r: { left: number; top: number; width: number; height: number },
  frame: { left: number; top: number },
  box: { left: number; top: number },
): BlockRect | null {
  if (r.width <= 0 || r.height <= 0) return null
  return {
    id,
    x: frame.left + r.left - box.left,
    y: frame.top + r.top - box.top,
    w: r.width,
    h: r.height,
  }
}
