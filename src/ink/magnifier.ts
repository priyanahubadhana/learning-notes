import type { Pt } from './geometry'

/**
 * The magnifier (G1): a big writing pad at the bottom of the screen. What is
 * written in it lands, small, in a target box on the page; the pad shows the
 * page's own ink inside that box (one source of truth: the page). The target
 * box is the size of the pad divided by the zoom. Pure maths in px, no DOM.
 * Numbers follow the research brief (pencil-tools-best-practice-2026-11.md).
 */

export const ZOOMS = [2, 2.5, 3, 4] as const
export type Zoom = (typeof ZOOMS)[number]
export const DEFAULT_ZOOM: Zoom = 2.5
export const isZoom = (v: unknown): v is Zoom =>
  (ZOOMS as readonly unknown[]).includes(v)

/** The pad's height as a share of the screen: default, least, most. */
export const PAD_HEIGHT = 0.3
export const PAD_HEIGHT_MIN = 0.2
export const PAD_HEIGHT_MAX = 0.5
export const clampPadHeight = (share: number): number =>
  Math.min(PAD_HEIGHT_MAX, Math.max(PAD_HEIGHT_MIN, share))

/** The page's margins the box keeps inside (share of the page width). */
export const MARGIN = 0.05
/** The pen lifting in this right share of the pad moves the box on. */
export const ADVANCE_ZONE = 0.2
/** How far the box moves on (share of its width). */
export const ADVANCE_BY = 0.6
/** The next line overlaps the last by this share of the box height. */
export const LINE_OVERLAP = 0.1

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

/** "Next line": back to the left margin, one box lower (a little overlap). */
export function nextLine(
  pad: Pad,
  target: Target,
  zoom: Zoom,
  pageWidth: number,
): Target {
  return {
    x: pageWidth * MARGIN,
    y: target.y + targetSize(pad, zoom).h * (1 - LINE_OVERLAP),
  }
}

/**
 * Where the target goes after a stroke. The pen lifting in the right fifth
 * of the pad moves the box on by 60 per cent of its width; past the right
 * margin it goes to the next line at the left margin. `null` = stay.
 */
export function advanceTarget(
  stroke: readonly Pt[],
  pad: Pad,
  target: Target,
  zoom: Zoom,
  pageWidth: number,
): Target | null {
  const last = stroke[stroke.length - 1]
  if (!last || last.x < pad.w * (1 - ADVANCE_ZONE)) return null
  const size = targetSize(pad, zoom)
  const x = target.x + size.w * ADVANCE_BY
  if (x + size.w > pageWidth * (1 - MARGIN)) {
    return nextLine(pad, target, zoom, pageWidth)
  }
  return { x, y: target.y }
}

/** "Space": the box moves on a quarter of its width. */
export function space(pad: Pad, target: Target, zoom: Zoom): Target {
  return { x: target.x + targetSize(pad, zoom).w * 0.25, y: target.y }
}
