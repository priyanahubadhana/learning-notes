import type { Pt } from './geometry'

/**
 * The magnifier (G1): a big writing pad at the bottom of the screen. What is
 * written in it lands, small, in a target box on the page. The target box is
 * the size of the pad divided by the zoom. Pure maths in px, no DOM.
 */

export const ZOOMS = [2, 3, 4] as const
export type Zoom = (typeof ZOOMS)[number]
export const isZoom = (v: unknown): v is Zoom =>
  (ZOOMS as readonly unknown[]).includes(v)

/** The pad's size in px. */
export interface Pad {
  w: number
  h: number
}

/** The target box's top-left corner on the page, in page px. */
export interface Target {
  x: number
  y: number
}

/** The size of the target box. */
export const targetSize = (pad: Pad, zoom: Zoom): Pad => ({
  w: pad.w / zoom,
  h: pad.h / zoom,
})

/** A point in the pad, as it lands on the page. */
export function toPage(p: Pt, target: Target, zoom: Zoom): Pt {
  return { x: target.x + p.x / zoom, y: target.y + p.y / zoom }
}

/** A point on the page, as it shows in the pad (for the preview). */
export function toPad(p: Pt, target: Target, zoom: Zoom): Pt {
  return { x: (p.x - target.x) * zoom, y: (p.y - target.y) * zoom }
}

/**
 * Where the target goes after a stroke. Writing near the right edge of the
 * pad moves the box on by 60 per cent of its width, so there is always room
 * for the next word. `null` = stay.
 */
export function advanceTarget(
  stroke: readonly Pt[],
  pad: Pad,
  target: Target,
  zoom: Zoom,
  pageWidth: number,
): Target | null {
  const right = Math.max(...stroke.map((p) => p.x))
  if (right < pad.w * 0.8) return null
  const size = targetSize(pad, zoom)
  const x = Math.min(target.x + size.w * 0.6, Math.max(0, pageWidth - size.w))
  return x > target.x ? { x, y: target.y } : null
}

/** "Next line": back to the left, one box lower. */
export function nextLine(
  pad: Pad,
  target: Target,
  zoom: Zoom,
  left: number,
): Target {
  return { x: left, y: target.y + targetSize(pad, zoom).h * 0.9 }
}

/** "Space": the box moves on a quarter of its width. */
export function space(pad: Pad, target: Target, zoom: Zoom): Target {
  return { x: target.x + targetSize(pad, zoom).w * 0.25, y: target.y }
}
