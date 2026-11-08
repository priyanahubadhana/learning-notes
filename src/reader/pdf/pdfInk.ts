import type { BlockRect } from '../../ink/anchor'
import type { BookSurface } from '../../ink/layout'

/**
 * C2b: ink on PDF pages. The blocks are the pages (`pdf:<n>`), measured in px
 * from the top-left of the ink wrap. The unit is the first page's width in
 * px, so ink scales exactly with zoom (strokes are saved in page widths from
 * the page's own corner).
 */
export const pdfBlockId = (page: number): string => `pdf:${page}`

/** Which PDF page a saved block id is (0 = not a PDF page id). */
export function pdfPageOf(blockId: string | null): number {
  const m = /^pdf:(\d{1,6})$/.exec(blockId ?? '')
  return m ? Number(m[1]) : 0
}

/** Rect of a page element against the wrap's box (both client rects). */
export function pageBlock(
  page: number,
  r: { left: number; top: number; width: number; height: number },
  box: { left: number; top: number },
): BlockRect {
  return {
    id: pdfBlockId(page),
    x: r.left - box.left,
    y: r.top - box.top,
    w: r.width,
    h: r.height,
  }
}

const pagesOf = (wrap: HTMLElement): HTMLElement[] =>
  Array.from(
    wrap.parentElement?.querySelectorAll<HTMLElement>('[data-pdf-page]') ?? [],
  )

export const pdfSurface: BookSurface = {
  blocks: (wrap) => {
    const box = wrap.getBoundingClientRect()
    return pagesOf(wrap).flatMap((el) => {
      const page = Number(el.dataset.pdfPage)
      return page > 0 ? [pageBlock(page, el.getBoundingClientRect(), box)] : []
    })
  },
  unit: (wrap) => {
    const first = pagesOf(wrap)[0]
    return first?.getBoundingClientRect().width || wrap.clientWidth || 1
  },
}
