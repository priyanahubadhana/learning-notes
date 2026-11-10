import { TOP } from './boxes'

/**
 * The reserved safe gap (bug batch 3, item B3-10). The Notes / Summary /
 * Review tab bar sits above the paper. A box's ⠿ and ⋯ sit one touch target
 * (44 px) above the box, so the paper starts SAFE_GAP_PX below the tab bar and
 * no box may be placed higher than the page text's own top (`SAFE_TOP_MM`).
 * Together nothing (box, handle, menu anchor) can enter the strip under the
 * tab bar. This is the one place both numbers live.
 */
export const SAFE_GAP_PX = 44

/** The highest a box may start on the paper (mm): the page text's top. */
export const SAFE_TOP_MM = TOP

/** A touch target is at least 44 pt. */
export const TOUCH_PX = 44

/** Inline, so the global touch rule (min-width 32 px on coarse pointers) cannot make it smaller. */
export const TOUCH_STYLE = {
  minWidth: TOUCH_PX,
  minHeight: TOUCH_PX,
  height: TOUCH_PX,
} as const
