// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { activeSet, resetToolbarState } from '../toolbarState'
import {
  MAIN_TOOLS,
  PILL_OPTIONS,
  activeTool,
  closePill,
  extraTools,
  mainList,
  moveIn,
  openCard,
  openPillTool,
  pillLists,
  pillOptionsOf,
  pillPinned,
  resetMainBar,
  resetMainState,
  setPillOptions,
  shownMainTools,
  shownPill,
  toggleIn,
} from './mainTools'
import { selectTool, setOfTool } from './selectTool'

beforeEach(() => {
  localStorage.clear()
  resetToolbarState()
  resetMainState()
})

describe('the main bar', () => {
  it('has the approved tools in the approved order', () => {
    expect(MAIN_TOOLS).toEqual([
      'text',
      'pen',
      'highlighter',
      'eraser',
      'newLine',
      'backspace',
      'lasso',
      'insert',
      'read',
    ])
    expect(mainList.get()).toEqual([...MAIN_TOOLS])
  })

  it('every pill has options, in the approved order', () => {
    for (const options of Object.values(PILL_OPTIONS)) {
      expect(options.length).toBeGreaterThan(0)
    }
    expect(PILL_OPTIONS.text).toEqual([
      'style',
      'font',
      'size',
      'lineHeight',
      'bold',
      'italic',
      'underline',
      'textColor',
      'highlightColor',
      'list',
      'align',
      'keyPoint',
    ])
    expect(PILL_OPTIONS.insert.slice(0, 2)).toEqual(['table', 'shape'])
  })

  it('a tapped tool is the mode and opens its pill; again closes the pill', () => {
    expect(selectTool('pen')).toBe('opened')
    expect(activeTool.get()).toBe('pen')
    expect(openPillTool.get()).toBe('pen')
    expect(activeSet.get()).toBe('draw')
    expect(selectTool('pen')).toBe('closed')
    expect(openPillTool.get()).toBeNull()
    expect(activeTool.get()).toBe('pen') // still the mode
  })

  it('another tool replaces the pill and closes any card', () => {
    selectTool('pen')
    openCard.set({ tool: 'pen', page: 'main' })
    selectTool('eraser')
    expect(openPillTool.get()).toBe('eraser')
    expect(openCard.get()).toBeNull()
    expect(activeTool.get()).toBe('eraser')
  })

  it('Insert opens its pill but is not a mode', () => {
    selectTool('lasso')
    selectTool('insert')
    expect(openPillTool.get()).toBe('insert')
    expect(activeTool.get()).toBe('lasso')
    expect(selectTool('insert')).toBe('closed')
  })

  it('Text and Read map to the Write and Read sets', () => {
    selectTool('read')
    expect(activeSet.get()).toBe('read')
    selectTool('text')
    expect(activeSet.get()).toBe('write')
    expect(setOfTool('highlighter')).toBe('draw')
  })

  it('a pinned pill stays when its tool is tapped again', () => {
    pillPinned.set(true)
    selectTool('pen')
    expect(selectTool('pen')).toBe('opened')
    expect(openPillTool.get()).toBe('pen')
    expect(shownPill(null, true, 'eraser')).toBe('eraser')
    expect(shownPill(null, false, 'eraser')).toBeNull()
    closePill()
    expect(openPillTool.get()).toBeNull()
  })

  it('the first tap on a tool that is already on (no pill yet) opens its pill', () => {
    expect(activeTool.get()).toBe('text')
    selectTool('text')
    expect(openPillTool.get()).toBe('text')
  })

  it('Edit bar: hide, show, reorder and reset', () => {
    mainList.set(['text', 'pen'])
    expect(shownMainTools(mainList.get())).toEqual(['text', 'pen'])
    expect(shownMainTools([])).toEqual([...MAIN_TOOLS]) // never empty
    setPillOptions('text', ['bold', 'italic'])
    expect(pillOptionsOf('text', pillLists.get())).toEqual(['bold', 'italic'])
    expect(pillOptionsOf('pen', pillLists.get())).toEqual([...PILL_OPTIONS.pen])
    extraTools.set(['strike'])
    resetMainBar()
    expect(mainList.get()).toEqual([...MAIN_TOOLS])
    expect(pillLists.get()).toEqual({})
    expect(extraTools.get()).toEqual([])
  })

  it('a wholly damaged saved list reads as the default', () => {
    localStorage.setItem('learning-notes:toolbar.main', '"pen"')
    localStorage.setItem('learning-notes:toolbar.pills', '{"text":["nope"]}')
    resetMainState()
    expect(mainList.get()).toEqual([...MAIN_TOOLS])
    expect(pillLists.get()).toEqual({})
  })

  it('R7-10: a saved bar keeps your choices when this build knows fewer or more ids', () => {
    localStorage.setItem(
      'learning-notes:toolbar.main',
      '["read","gone","pen","read"]',
    )
    localStorage.setItem(
      'learning-notes:toolbar.pills',
      '{"text":["italic","oldOption","bold"],"retired":["x"],"read":["y"]}',
    )
    const nine = Array.from({ length: 9 }, (_, i) => 'tool' + i)
    localStorage.setItem('learning-notes:toolbar.extras', JSON.stringify(nine))
    resetMainState()
    expect(mainList.get()).toEqual(['read', 'pen'])
    expect(pillLists.get()).toEqual({ text: ['italic', 'bold'] })
    expect(extraTools.get()).toEqual(nine)
    // New tools are not forced in: they wait in the Edit toolbar list.
    expect(mainList.get()).not.toContain('text')
  })

  it('moves and toggles list items', () => {
    expect(moveIn(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b'])
    expect(moveIn(['a', 'b', 'c'], 'a', -5)).toEqual(['a', 'b', 'c'])
    const all = ['a', 'b', 'c', 'd']
    expect(toggleIn(['a', 'd'], 'c', all)).toEqual(['a', 'c', 'd'])
    expect(toggleIn(['a', 'c', 'd'], 'c', all)).toEqual(['a', 'd'])
    expect(toggleIn([], 'b', all)).toEqual(['b'])
  })
})
