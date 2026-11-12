/**
 * Where the two columns go at each screen size (shell-spec 4, SH-07, SH-08).
 *
 * - Phone (width < 640 or height < 512, the rule of src/index.css): the
 *   sidebar is a drawer from the left; the pages panel is an overlay.
 * - 640 and wider: the page keeps a comfortable writing width (MIN_PAGE_W).
 *   The sidebar and the pages panel dock only while the page still has that
 *   much room. Order of giving way: (1) both docked, (2) the sidebar steps
 *   aside and the panel docks (under 1180), (3) the panel opens over the page
 *   and the sidebar stays, (4) the sidebar collapses to the rail (its toggle
 *   then opens it over the page).
 */
export const PHONE_MAX_W = 640
export const PHONE_MAX_H = 512
export const BOTH_MIN_W = 1180
/** The least width the page may be squeezed to by docked columns. */
export const MIN_PAGE_W = 600
/** Window padding (12 + 12) and the rail with the gap after it. */
const FRAME_PAD = 24
const RAIL_COST = 56 + 12
/** A docked sidebar costs its width plus the gaps around its resizer. */
export const sideCost = (width: number): number => width + 24
/** A docked panel costs its width, its border and a gap. */
export const PANEL_COST = 288 + 14

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
  /** The sidebar's drawn width; default 288. */
  sidebarWidth?: number
}

export interface Columns {
  phone: boolean
  sidebar: 'docked' | 'hidden' | 'over' | 'drawer'
  panel: 'docked' | 'over' | 'hidden'
  /** The sidebar is hidden only because there is no room for it beside the page. */
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
  const sw = i.sidebarWidth ?? COLUMN_WIDTH
  const room = i.width - FRAME_PAD - RAIL_COST
  const fits = (side: boolean, panel: boolean): boolean =>
    room - (side ? sideCost(sw) : 0) - (panel ? PANEL_COST : 0) >= MIN_PAGE_W
  const wide = i.width >= BOTH_MIN_W
  const wantSide = !i.sidebarHidden
  // The sidebar gone from the row: hidden by choice, or stepped aside for lack of room.
  const away = (stepped: boolean): Columns['sidebar'] =>
    stepped && i.sideOver ? 'over' : 'hidden'

  if (!i.panelOpen) {
    if (!wantSide || fits(true, false))
      return {
        phone: false,
        sidebar: wantSide ? 'docked' : 'hidden',
        panel: 'hidden',
        steppedAside: false,
      }
    return {
      phone: false,
      sidebar: away(true),
      panel: 'hidden',
      steppedAside: true,
    }
  }

  // The pages panel is open.
  if (wide && wantSide && fits(true, true))
    return {
      phone: false,
      sidebar: 'docked',
      panel: 'docked',
      steppedAside: false,
    }
  if (!wantSide)
    return {
      phone: false,
      sidebar: 'hidden',
      panel: fits(false, true) ? 'docked' : 'over',
      steppedAside: false,
    }
  if (!wide && fits(false, true))
    return {
      phone: false,
      sidebar: away(true),
      panel: 'docked',
      steppedAside: true,
    }
  if (fits(true, false))
    return {
      phone: false,
      sidebar: 'docked',
      panel: 'over',
      steppedAside: false,
    }
  return {
    phone: false,
    sidebar: away(true),
    panel: fits(false, true) ? 'docked' : 'over',
    steppedAside: true,
  }
}

/** Where a panel opened over the page starts: after the rail and a docked sidebar. */
export const panelLeft = (dockedSidebar: number | null): number =>
  FRAME_PAD / 2 +
  RAIL_COST +
  (dockedSidebar === null ? 0 : sideCost(dockedSidebar))

/** The width to draw: the saved one, or 288 when it is still today's 260. */
export const effectiveSidebarWidth = (saved: number): number =>
  saved === OLD_DEFAULT ? COLUMN_WIDTH : saved
