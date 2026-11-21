import type { Pt } from '../inkHelpers.ts'
import { line } from '../inkHelpers.ts'

export type Box = { x: number; y: number; width: number; height: number }

/** A small hand-drawn loop just around a box, starting at its bottom right corner. */
export function loopAround(b: Box, pad = 6): Pt[] {
  const c: Pt[] = [
    [b.x + b.width + pad, b.y + b.height + pad],
    [b.x - pad, b.y + b.height + pad],
    [b.x - pad, b.y - pad],
    [b.x + b.width + pad, b.y - pad],
    [b.x + b.width + pad - 1, b.y + b.height + pad - 2],
  ]
  return c.slice(1).flatMap((p, i) => line(c[i], p, 10))
}

export const centre = (b: Box): Pt => [b.x + b.width / 2, b.y + b.height / 2]
