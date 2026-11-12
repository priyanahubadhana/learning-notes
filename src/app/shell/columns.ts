/**
 * Where the two columns go at each screen size (shell-spec 4, SH-07, SH-08).
 *
 * - Phone (width < 640 or height < 512, the rule of src/index.css): the
 *   sidebar is a drawer from the left; the pages panel is an overlay.
 * - 640 to 1179: one column docked. An open pages panel docks and the sidebar
 *   steps aside (its toggle then opens it over the page).
 * - 1180 and wider: both docked, unless hidden with their toggle.
 */
export const PHONE_MAX_W = 640
export const PHONE_MAX_H = 512
export const BOTH_MIN_W = 1180

/** The default sidebar and panel width (D1). Today's saved default maps to it. */
export const COLUMN_WIDTH = 288
const OLD_DEFAULT = 260

export interface ColumnInput {
  width: number
  height: number
  sidebarHidden: boolean
  /** The pages panel is switched on and a notebook or book is open. */
  panelOpen: boolean
  /** The stepped-aside sidebar was opened over the page. */
  sideOver: boolean
}

export interface Columns {
  phone: boolean
  sidebar: 'docked' | 'hidden' | 'over' | 'drawer'
  panel: 'docked' | 'over' | 'hidden'
  /** The sidebar is hidden only because the panel took its place. */
  steppedAside: boolean
}

export const isPhone = (width: number, height: number): boolean =>
  width < PHONE_MAX_W || height < PHONE_MAX_H

export function columnsFor(i: ColumnInput): Columns {
  if (isPhone(i.width, i.height)) {
    return {
      phone: true,
      sidebar: 'drawer',
      panel: i.panelOpen ? 'over' : 'hidden',
      steppedAside: false,
    }
  }
  const panel = i.panelOpen ? 'docked' : 'hidden'
  const steppedAside = i.panelOpen && i.width < BOTH_MIN_W
  if (steppedAside) {
    return {
      phone: false,
      sidebar: i.sideOver ? 'over' : 'hidden',
      panel,
      steppedAside,
    }
  }
  return {
    phone: false,
    sidebar: i.sidebarHidden ? 'hidden' : 'docked',
    panel,
    steppedAside: false,
  }
}

/** The width to draw: the saved one, or 288 when it is still today's 260. */
export const effectiveSidebarWidth = (saved: number): number =>
  saved === OLD_DEFAULT ? COLUMN_WIDTH : saved
