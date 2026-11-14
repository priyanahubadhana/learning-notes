/** Width of the shared scroll bar and height of each arrow (px); a little smaller than 24 / 40 (14 Nov F6). */
export const BAR_W = 20
export const ARROW = 34
const MIN_THUMB = 40

export interface BarGeometry {
  thumbTop: number
  thumbH: number
}

/**
 * Where the thumb sits in a track of `track` px for a page `scrollH` tall in
 * a window `clientH` tall. Null when nothing scrolls. Pure.
 */
export function barGeometry(
  scrollTop: number,
  scrollH: number,
  clientH: number,
  track: number,
): BarGeometry | null {
  const range = scrollH - clientH
  if (range <= 1 || track <= 0) return null
  const thumbH = Math.min(
    track,
    Math.max(MIN_THUMB, (clientH / scrollH) * track),
  )
  const ratio = Math.min(1, Math.max(0, scrollTop / range))
  return { thumbTop: ratio * (track - thumbH), thumbH }
}

/** The scrollTop for a thumb dragged `dy` px from where it was grabbed. Pure. */
export function dragTop(
  startTop: number,
  dy: number,
  scrollH: number,
  clientH: number,
  track: number,
  thumbH: number,
): number {
  const range = scrollH - clientH
  const travel = track - thumbH
  if (range <= 0 || travel <= 0) return startTop
  return Math.min(range, Math.max(0, startTop + (dy * range) / travel))
}

/**
 * The scrollTop of the next (dir 1) or previous (dir -1) sheet from where the
 * page is now. `tops` are the sheets' tops in scroll coordinates. Without a
 * sheet that way, a window's worth. Pure.
 */
export function sheetTarget(
  scrollTop: number,
  tops: readonly number[],
  dir: 1 | -1,
  clientH: number,
  max: number,
): number {
  const near = 4
  const pick =
    dir === 1
      ? tops.find((x) => x > scrollTop + near)
      : [...tops].reverse().find((x) => x < scrollTop - near)
  const to = pick ?? scrollTop + dir * clientH * 0.9
  return Math.min(max, Math.max(0, to))
}

/**
 * B3-13: the scrollTop that puts the thumb's CENTRE under a tap at `y` px from
 * the top of the track (the thumb jumps there; it is clamped at both ends). Pure.
 */
export function trackJumpTop(
  y: number,
  scrollH: number,
  clientH: number,
  track: number,
  thumbH: number,
): number {
  const range = scrollH - clientH
  const travel = track - thumbH
  if (range <= 0 || travel <= 0) return 0
  const thumbTop = Math.min(travel, Math.max(0, y - thumbH / 2))
  return (thumbTop / travel) * range
}
