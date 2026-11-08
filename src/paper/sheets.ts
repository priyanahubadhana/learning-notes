import type { Page } from '../core/types'

/** Space between stacked sheets, in screen px. */
export const SHEET_GAP_PX = 16
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 4

export const clampZoom = (z: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100))

/** Pinching out may shrink the paper this far below fit width (fraction of fit). */
export const PINCH_SLACK = 0.27

/**
 * The zoom while two fingers are down: above fit width it follows the
 * fingers; below it the paper gives way with growing resistance and never
 * gets under about 73 % of fit (GoodNotes-like). On release it springs back.
 */
export function rubberZoom(z: number): number {
  if (!(z < 1)) return z
  return 1 - PINCH_SLACK * (1 - Math.exp(-(1 - z) / PINCH_SLACK))
}

/** Ease-out for the spring back (0 to 1). */
export const springEase = (t: number): number =>
  1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)

/** How many sheets hold content reaching `bottomPx` (at least one). */
export function sheetCount(bottomPx: number, sheetPx: number): number {
  if (!(sheetPx > 0) || !Number.isFinite(bottomPx)) return 1
  const per = sheetPx + SHEET_GAP_PX
  return Math.max(1, Math.min(500, Math.ceil((bottomPx + SHEET_GAP_PX) / per)))
}

/** Line spacing of the paper in mm: lined 8 mm, grid and dots 5 mm. */
export function paperStepMm(bg: Page['inkBg']): number {
  return bg === 'lined' ? 8 : 5
}

/** Below this window width (px: phones) the paper shows "fit width" (step 6). */
export const NARROW_PX = 600
