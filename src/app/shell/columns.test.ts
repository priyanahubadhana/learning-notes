import { describe, expect, it } from 'vitest'
import {
  COLUMN_WIDTH,
  columnsFor,
  effectiveSidebarWidth,
  isPhone,
  MIN_PAGE_W,
  PANEL_COST,
  panelLeft,
  sideCost,
  type ColumnInput,
} from './columns'

const at = (over: Partial<ColumnInput>): ColumnInput => ({
  width: 1366,
  height: 1024,
  sidebarHidden: false,
  panelOpen: false,
  sideOver: false,
  ...over,
})

describe('columnsFor (SH-07, SH-08)', () => {
  it('docks both on a wide screen that leaves the page its writing width', () => {
    const c = columnsFor(at({ panelOpen: true }))
    expect(c.sidebar).toBe('docked')
    expect(c.panel).toBe('docked')
    expect(c.steppedAside).toBe(false)
  })

  it('iPad landscape 1180: both docked would squeeze the page, so the panel opens over it', () => {
    const c = columnsFor(at({ width: 1180, height: 820, panelOpen: true }))
    expect(c.sidebar).toBe('docked')
    expect(c.panel).toBe('over')
    expect(c.steppedAside).toBe(false)
  })

  it('keeps the page at least 600 wide whenever columns are docked', () => {
    for (const width of [
      640, 700, 820, 900, 1024, 1100, 1180, 1280, 1366, 1600,
    ]) {
      for (const panelOpen of [false, true]) {
        const c = columnsFor(at({ width, panelOpen }))
        const used =
          24 +
          68 +
          (c.sidebar === 'docked' ? sideCost(COLUMN_WIDTH) : 0) +
          (c.panel === 'docked' ? PANEL_COST : 0)
        // Even with nothing docked, 640 wide has only 548 left after the rail.
        expect(
          width - used,
          `${width} panel=${panelOpen}`,
        ).toBeGreaterThanOrEqual(Math.min(MIN_PAGE_W, width - 92))
      }
    }
  })

  it('hides the sidebar with its toggle', () => {
    expect(columnsFor(at({ sidebarHidden: true })).sidebar).toBe('hidden')
  })

  it('1024: the sidebar steps aside for a docked panel', () => {
    expect(columnsFor(at({ width: 1024 })).sidebar).toBe('docked')
    const c = columnsFor(at({ width: 1024, panelOpen: true }))
    expect(c.panel).toBe('docked')
    expect(c.sidebar).toBe('hidden')
    expect(c.steppedAside).toBe(true)
  })

  it('portrait iPad 820: the sidebar collapses to the rail and the panel opens over the page', () => {
    const closed = columnsFor(at({ width: 820 }))
    expect(closed.sidebar).toBe('hidden')
    expect(closed.steppedAside).toBe(true)
    const c = columnsFor(at({ width: 820, panelOpen: true }))
    expect(c.panel).toBe('over')
    expect(c.sidebar).toBe('hidden')
    expect(c.steppedAside).toBe(true)
  })

  it('opens the stepped-aside sidebar over the page', () => {
    const c = columnsFor(at({ width: 1024, panelOpen: true, sideOver: true }))
    expect(c.sidebar).toBe('over')
    expect(c.panel).toBe('docked')
    expect(columnsFor(at({ width: 820, sideOver: true })).sidebar).toBe('over')
  })

  it('a wider sidebar gives way sooner', () => {
    expect(columnsFor(at({ width: 1100 })).sidebar).toBe('docked')
    expect(columnsFor(at({ width: 1100, sidebarWidth: 480 })).sidebar).toBe(
      'hidden',
    )
  })

  it('places a panel opened over the page after the rail and a docked sidebar', () => {
    expect(panelLeft(null)).toBe(80)
    expect(panelLeft(288)).toBe(80 + 312)
  })

  it('is a drawer and an overlay on a phone', () => {
    const c = columnsFor(at({ width: 390, height: 844, panelOpen: true }))
    expect(c.phone).toBe(true)
    expect(c.sidebar).toBe('drawer')
    expect(c.panel).toBe('over')
    expect(columnsFor(at({ width: 390, height: 844 })).panel).toBe('hidden')
  })

  it('counts a short landscape phone as a phone (same rule as the CSS)', () => {
    expect(isPhone(844, 390)).toBe(true)
    expect(isPhone(820, 1180)).toBe(false)
    expect(isPhone(639, 1000)).toBe(true)
    expect(isPhone(640, 600)).toBe(false)
  })
})

describe('effectiveSidebarWidth', () => {
  it("maps today's saved default (260) to 288 and keeps a chosen width", () => {
    expect(effectiveSidebarWidth(260)).toBe(COLUMN_WIDTH)
    expect(effectiveSidebarWidth(340)).toBe(340)
  })
})
