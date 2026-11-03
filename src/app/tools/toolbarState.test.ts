// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { TABS } from './tabs'
import {
  DEFAULT_SET_TOOLS,
  activeSet,
  changeSet,
  keepSet,
  readSetTools,
  resetToolbarState,
  ribbonTab,
  tabForSet,
  visibleTabs,
  writeSetTools,
} from './toolbarState'

beforeEach(() => {
  localStorage.clear()
  resetToolbarState()
})

describe('tool sets', () => {
  it('changes by itself, and the user can always change it', () => {
    expect(changeSet('draw', 'auto')).toBe(true)
    expect(activeSet.get()).toBe('draw')
    expect(changeSet('draw', 'auto')).toBe(false)
    expect(changeSet('read', 'user')).toBe(true)
    expect(activeSet.get()).toBe('read')
  })

  it('stays put while the set is kept (only a tap changes it)', () => {
    keepSet.set(true)
    expect(changeSet('draw', 'auto')).toBe(false)
    expect(activeSet.get()).toBe('write')
    expect(changeSet('draw', 'user')).toBe(true)
    expect(activeSet.get()).toBe('draw')
    expect(keepSet.get()).toBe(true)
  })

  it('the keep choice is remembered on this device', () => {
    keepSet.set(true)
    keepSet.clearCache()
    expect(keepSet.get()).toBe(true)
  })

  it('the ribbon opens on the tab of the set', () => {
    expect(tabForSet('write')).toBe('home')
    expect(tabForSet('draw')).toBe('draw')
    expect(tabForSet('read')).toBe('view')
    changeSet('draw', 'user')
    expect(ribbonTab.get()).toBe('draw')
  })

  it('each set keeps its own tools; invalid saved lists read as the default', () => {
    expect(readSetTools('draw')).toEqual(DEFAULT_SET_TOOLS.draw)
    writeSetTools('draw', ['eraser', 'pen'])
    writeSetTools('read', ['theme'])
    expect(readSetTools('draw')).toEqual(['eraser', 'pen'])
    expect(readSetTools('read')).toEqual(['theme'])
    expect(readSetTools('write')).not.toContain('eraser')
    localStorage.setItem(
      'learning-notes:formatBar.pinned.draw',
      JSON.stringify(['a', 'a']),
    )
    resetToolbarState()
    expect(readSetTools('draw')).toEqual(DEFAULT_SET_TOOLS.draw)
  })

  it('at least one tab always stays visible', () => {
    expect(visibleTabs(['file', 'draw'])).toEqual([
      'home',
      'insert',
      'view',
      'review',
    ])
    expect(visibleTabs([...TABS])).toEqual([...TABS])
  })
})
