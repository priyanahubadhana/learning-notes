// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { TABS } from './tabs'
import {
  activeTool,
  openPillTool,
  resetMainState,
  shownPill,
} from './main/mainTools'
import { selectTool } from './main/selectTool'
import {
  DEFAULT_SET_TOOLS,
  activeSet,
  addUndoRedoOnce,
  changeSet,
  readSetTools,
  resetToolbarState,
  ribbonExpanded,
  ribbonOpen,
  ribbonTab,
  stayOpen,
  toggleRibbonBehaviour,
  tabForSet,
  visibleTabs,
  writeSetTools,
} from './toolbarState'

beforeEach(() => {
  localStorage.clear()
  resetToolbarState()
  resetMainState()
})

describe('tool sets', () => {
  it('a tool change moves the set; nothing changes it by itself', () => {
    expect(changeSet('draw', 'user')).toBe(true)
    expect(activeSet.get()).toBe('draw')
    expect(activeTool.get()).toBe('pen')
    expect(changeSet('draw', 'user')).toBe(false)
    expect(changeSet('read', 'user')).toBe(true)
    expect(activeSet.get()).toBe('read')
    expect(activeTool.get()).toBe('read')
    changeSet('write', 'user')
    expect(activeTool.get()).toBe('text')
  })

  it('the Read set opens no pill, and closes one left by another tool', () => {
    selectTool('pen')
    expect(openPillTool.get()).toBe('pen')
    changeSet('read', 'user')
    expect(openPillTool.get()).toBeNull()
    expect(selectTool('read')).toBe('closed')
    expect(openPillTool.get()).toBeNull()
    expect(shownPill(null, true, 'read')).toBeNull()
  })

  it('keeps an ink tool that was picked while Draw stays', () => {
    activeTool.set('eraser')
    changeSet('draw', 'user')
    expect(activeTool.get()).toBe('eraser')
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

  it('Ctrl+F1 switches between "close after use" and "stay open"', () => {
    expect(stayOpen.get()).toBe(false)
    expect(toggleRibbonBehaviour()).toBe(true)
    expect(ribbonOpen.get()).toBe(true)
    expect(ribbonExpanded.get()).toBe(true)
    stayOpen.clearCache()
    expect(stayOpen.get()).toBe(true) // remembered on this device
    expect(toggleRibbonBehaviour()).toBe(false)
    expect(ribbonExpanded.get()).toBe(false)
  })
})

describe('Undo and Redo on every set (batch 2f)', () => {
  it('are first in every default set', () => {
    for (const set of ['write', 'draw', 'read'] as const) {
      expect(readSetTools(set).slice(0, 2), set).toEqual(['undo', 'redo'])
    }
  })
  it('are added once to sets saved before, and can be removed again', () => {
    writeSetTools('write', ['bold', 'more'])
    writeSetTools('draw', ['pen', 'undo'])
    writeSetTools('read', ['theme', 'redo'])
    addUndoRedoOnce()
    expect(readSetTools('write')).toEqual(['undo', 'redo', 'bold', 'more'])
    expect(readSetTools('draw')).toEqual(['pen', 'undo', 'redo'])
    expect(readSetTools('read')).toEqual(['undo', 'theme', 'redo'])
    writeSetTools('write', ['bold'])
    addUndoRedoOnce()
    expect(readSetTools('write')).toEqual(['bold'])
  })
})
