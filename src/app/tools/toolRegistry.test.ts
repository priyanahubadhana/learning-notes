import { describe, expect, it } from 'vitest'
import { en } from '../../i18n/en'
import { enO } from '../../i18n/enO'
import { DEFAULT_PINNED } from '../deviceMode'
import { TABS } from './tabs'
import { DEFAULT_SET_TOOLS } from './toolbarState'
import {
  TAB_GROUPS,
  TOOLS,
  allTools,
  findTool,
  ribbonGroup,
} from './toolRegistry'

const keys: Record<string, string> = { ...en, ...enO }

describe('tool registry', () => {
  it('has unique ids and a name for every tool', () => {
    const ids = TOOLS.map((tool) => tool.id)
    expect(new Set(ids).size).toBe(ids.length)
    const missing = ids.filter((id) => !keys[`tool.${id}`])
    expect(missing).toEqual([])
  })

  it('names every tab, group and reason', () => {
    for (const tab of [...TABS, 'go']) {
      expect(keys[`ribbon.tab.${tab}`], tab).toBeTruthy()
    }
    for (const tool of TOOLS) {
      expect(keys[`ribbon.group.${tool.group}`], tool.group).toBeTruthy()
      for (const place of tool.also ?? []) {
        expect(keys[`ribbon.group.${place.group}`], place.group).toBeTruthy()
      }
      if (tool.coming) {
        expect(keys[`tool.coming.${tool.coming}`], tool.id).toBeTruthy()
      }
    }
  })

  it('lists every ribbon tool under a group of its tab', () => {
    for (const tool of TOOLS.filter((x) => x.inRibbon !== false)) {
      if (tool.section === 'go') continue
      expect(TAB_GROUPS[tool.section], tool.id).toContain(tool.group)
      for (const place of tool.also ?? []) {
        expect(TAB_GROUPS[place.tab], tool.id).toContain(place.group)
      }
    }
  })

  it('every tab has tools, as the owner listed them', () => {
    for (const tab of TABS) {
      const tools = TAB_GROUPS[tab].flatMap((g) => ribbonGroup(tab, g))
      expect(tools.length, tab).toBeGreaterThan(2)
    }
    const pens = ribbonGroup('draw', 'pens').map((x) => x.id)
    expect(pens).toEqual([
      'ballPen',
      'fountainPen',
      'marker',
      'brush',
      'pencil',
    ])
  })

  it('every draw tool works now (Shapes, Tape, Magnifier and Ruler too)', () => {
    for (const id of DEFAULT_SET_TOOLS.draw) {
      const tool = findTool(id)!
      expect(tool, id).toBeDefined()
      expect(tool.coming, id).toBeUndefined()
    }
  })

  it('the ink tools of the Draw tab run the ink engine', () => {
    for (const id of [
      'ballPen',
      'highlighter',
      'eraser',
      'lasso',
      'drawColor',
      'paperGrid',
      'inkLayers',
      'onlyPencil',
    ]) {
      const tool = findTool(id)!
      expect(tool.coming, id).toBeUndefined()
      expect(tool.run, id).toBeTypeOf('function')
    }
  })

  it('the default sets only use known tools', () => {
    for (const id of [
      ...DEFAULT_PINNED,
      ...DEFAULT_SET_TOOLS.draw,
      ...DEFAULT_SET_TOOLS.read,
    ]) {
      expect(findTool(id), id).toBeDefined()
    }
  })

  it('knows the Revise marks as tools', () => {
    expect(allTools().some((tool) => tool.id === 'mark:key')).toBe(true)
    expect(findTool('mark:key')?.section).toBe('home')
    expect(findTool('nope')).toBeUndefined()
  })
})
