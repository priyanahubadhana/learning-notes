import type { Page } from '../core/types'

/** Space between stacked sheets, in screen px. */
export const SHEET_GAP_PX = 16
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 4

export const clampZoom = (z: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100))

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
