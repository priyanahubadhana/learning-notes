import {
  frameOf,
  nextBlockAt,
  pageFrame,
  type BlockRect,
  type Frame,
} from './anchor'
import type { InkFallback } from '../core/inkTypes'

/**
 * C2b: the blocks of a BOOK instead of a note. A PDF's blocks are its pages
 * (`pdf:<n>`), an EPUB's are its paragraphs (`epub:<section>:<n>`). The
 * reader measures them (px from the top-left of `wrap`); `unit` is the width
 * the saved points are measured in (a PDF's page width, so zoom scales ink
 * exactly). A block that is not on screen (another EPUB section) is drawn far
 * off-screen, never moved onto another block.
 */
export interface BookSurface {
  blocks: (wrap: HTMLElement) => BlockRect[]
  unit: (wrap: HTMLElement) => number
  /** Calls `cb` whenever the blocks may have moved (scroll, load, resize). */
  watch?: (cb: () => void) => () => void
}

/** Where an unmeasured book block is drawn: out of every view. */
export const OFF_SCREEN_Y = -1e7

/**
 * Where the page's blocks are now, in px from the top-left of the ink
 * container (the element ink is laid over). Measured with
 * getBoundingClientRect, so it is the same however far the page is scrolled.
 * Ink follows its block through this: when text reflows, the next `measure`
 * gives new frames and everything is drawn there.
 */
export class PageLayout {
  width = 1
  private boxWidth = 0
  height = 1
  /** Raised each time the measurement changed. */
  version = 0
  private rects = new Map<string, BlockRect>()
  private list: BlockRect[] = []

  private readonly wrap: HTMLElement
  private readonly fallbackOf: (id: string) => InkFallback | undefined
  private readonly book: BookSurface | undefined

  constructor(
    wrap: HTMLElement,
    fallbackOf: (id: string) => InkFallback | undefined,
    book?: BookSurface,
  ) {
    this.wrap = wrap
    this.fallbackOf = fallbackOf
    this.book = book
  }

  /** Measures every block (needed to pick the block under a pen). */
  measure(): boolean {
    const box = this.wrap.getBoundingClientRect()
    const next = new Map<string, BlockRect>()
    const list: BlockRect[] = []
    const nodes = this.book
      ? []
      : this.wrap.querySelectorAll<HTMLElement>(
          '.bn-block-outer > .bn-block > .bn-block-content',
        )
    if (this.book) {
      for (const rect of this.book.blocks(this.wrap)) {
        next.set(rect.id, rect)
        list.push(rect)
      }
    }
    for (const content of nodes) {
      const id = content.parentElement?.getAttribute('data-id')
      if (!id) continue
      const r = content.getBoundingClientRect()
      const rect = {
        id,
        x: r.left - box.left,
        y: r.top - box.top,
        w: r.width,
        h: r.height,
      }
      next.set(id, rect)
      list.push(rect)
    }
    const unit = this.book ? this.book.unit(this.wrap) : box.width
    const changed =
      Math.abs(unit - this.width) > 0.5 ||
      Math.abs(box.width - this.boxWidth) > 0.5 ||
      Math.abs(box.height - this.height) > 0.5 ||
      next.size !== this.rects.size ||
      list.some((r) => {
        const o = this.rects.get(r.id)
        return (
          !o ||
          Math.abs(o.x - r.x) > 0.25 ||
          Math.abs(o.y - r.y) > 0.25 ||
          Math.abs(o.h - r.h) > 0.25
        )
      })
    this.width = Math.max(1, unit)
    this.boxWidth = box.width
    this.height = Math.max(1, box.height)
    this.rects = next
    this.list = list
    if (changed) this.version++
    return changed
  }

  blocks(): readonly BlockRect[] {
    return this.list
  }

  rectOf(id: string): BlockRect | undefined {
    return this.rects.get(id)
  }

  /**
   * The frame of a block: where its corner is now. A block that is gone
   * (deleted) uses the place it was last seen; ink over no block uses the page.
   */
  frame(blockId: string | null): Frame {
    if (blockId === null) return pageFrame(this.width)
    const r = this.rects.get(blockId)
    if (r) return frameOf(r, this.width)
    if (this.book) return { x: 0, y: OFF_SCREEN_Y, w: this.width }
    const fb = this.fallbackOf(blockId)
    if (fb) {
      // Phase Q rule 7: the ink of a deleted line goes with the next line
      // (which has moved up into its place), so it is never left behind.
      const next = nextBlockAt(fb.y, this.list)
      return { x: fb.x, y: next ? next.y : fb.y, w: this.width }
    }
    return pageFrame(this.width)
  }
}
