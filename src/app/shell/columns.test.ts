import { describe, expect, it } from 'vitest'
import {
  COLUMN_WIDTH,
  columnsFor,
  effectiveSidebarWidth,
  isPhone,
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
  it('docks both at 1180 and wider (iPad landscape, PC)', () => {
    const c = columnsFor(at({ panelOpen: true }))
    expect(c.sidebar).toBe('docked')
    expect(c.panel).toBe('docked')
    expect(c.steppedAside).toBe(false)
  })

  it('hides the sidebar with its toggle', () => {
    expect(columnsFor(at({ sidebarHidden: true })).sidebar).toBe('hidden')
  })

  it('docks only the sidebar between 640 and 1179 until the panel opens', () => {
    expect(columnsFor(at({ width: 820 })).sidebar).toBe('docked')
    const c = columnsFor(at({ width: 820, panelOpen: true }))
    expect(c.panel).toBe('docked')
    expect(c.sidebar).toBe('hidden')
    expect(c.steppedAside).toBe(true)
  })

  it('opens the stepped-aside sidebar over the page', () => {
    const c = columnsFor(at({ width: 820, panelOpen: true, sideOver: true }))
    expect(c.sidebar).toBe('over')
    expect(c.panel).toBe('docked')
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
