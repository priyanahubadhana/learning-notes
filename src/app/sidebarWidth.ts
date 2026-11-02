/** The sidebar's width in pixels: what it starts at and its limits. */
export const SIDEBAR_DEFAULT = 260
export const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 480
/** The page always keeps at least this much of the window. */
const PAGE_MIN = 320

export const isSidebarWidth = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/** The widest the sidebar can be in a window this wide. */
export const sidebarMax = (windowWidth: number): number =>
  Math.max(
    SIDEBAR_MIN,
    Math.min(SIDEBAR_MAX, windowWidth - PAGE_MIN, Math.floor(windowWidth / 2)),
  )

/** A wanted width, kept inside the limits. */
export const clampSidebarWidth = (width: number, windowWidth: number): number =>
  Math.round(Math.min(sidebarMax(windowWidth), Math.max(SIDEBAR_MIN, width)))
