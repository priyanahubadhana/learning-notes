import type { Pt } from './geometry'

/**
 * Anchoring: ink belongs to the block (paragraph, picture …) it was drawn
 * over, so it moves and resizes with the text when the page reflows.
 *
 * A point is saved as an offset from the block's top-left corner, measured
 * in PAGE WIDTHS (so a wider or narrower page scales the ink with it). A
 * `Frame` is where a block is NOW: its corner in page px, and the page
 * width in px. No DOM here; the surface measures blocks and passes frames.
 */

export interface BlockRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export interface Frame {
  /** The block's top-left corner, in px from the page's top-left. */
  x: number
  y: number
  /** One page width, in px (the unit of saved coordinates). */
  w: number
}

/** The frame of the page itself (ink drawn over no block). */
export const pageFrame = (pageWidth: number): Frame => ({
  x: 0,
  y: 0,
  w: pageWidth,
})

export const frameOf = (b: BlockRect, pageWidth: number): Frame => ({
  x: b.x,
  y: b.y,
  w: pageWidth,
})

/** Page px to saved units, relative to a frame. */
export const toLocal = (p: Pt, f: Frame): Pt => ({
  x: (p.x - f.x) / f.w,
  y: (p.y - f.y) / f.w,
})

/** Saved units to page px. */
export const toWorld = (p: Pt, f: Frame): Pt => ({
  x: f.x + p.x * f.w,
  y: f.y + p.y * f.w,
})

/**
 * Which block does a point at `p` belong to? The block whose rows it is
 * over; below or between blocks, the block just above it (so ink under the
 * last line stays with the last line); above the first block, the first.
 * No blocks: null (the page). `blocks` need not be sorted.
 */
export function pickAnchor(p: Pt, blocks: readonly BlockRect[]): string | null {
  if (blocks.length === 0) return null
  let above: BlockRect | undefined
  let first: BlockRect = blocks[0]
  for (const b of blocks) {
    if (b.y < first.y) first = b
    if (p.y >= b.y && p.y <= b.y + b.h) return b.id
    if (b.y <= p.y && (!above || b.y > above.y)) above = b
  }
  return (above ?? first).id
}
