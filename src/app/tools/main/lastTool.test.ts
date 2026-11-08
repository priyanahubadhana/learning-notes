// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { resetToolbarState } from '../toolbarState'
import {
  activeTool,
  extraTools,
  lastTool,
  nextLastTool,
  offerLastToolOnce,
  resetMainState,
} from './mainTools'
import { selectTool, swapToLastTool } from './selectTool'

beforeEach(() => {
  localStorage.clear()
  resetToolbarState()
  resetMainState()
})

describe('the last tool', () => {
  it('remembers the tool before, and never Reading mode', () => {
    expect(nextLastTool(null, 'pen', 'eraser')).toBe('pen')
    expect(nextLastTool('pen', 'eraser', 'eraser')).toBe('pen')
    expect(nextLastTool('pen', 'read', 'text')).toBe('pen')
  })

  it('Pen, Eraser, back = Pen; back again = Eraser', () => {
    selectTool('pen')
    selectTool('eraser')
    expect(lastTool.get()).toBe('pen')
    expect(swapToLastTool()).toBe(true)
    expect(activeTool.get()).toBe('pen')
    expect(lastTool.get()).toBe('eraser')
    expect(swapToLastTool()).toBe(true)
    expect(activeTool.get()).toBe('eraser')
  })

  it('does nothing when there is no earlier tool', () => {
    expect(swapToLastTool()).toBe(false)
    expect(activeTool.get()).toBe('text')
  })

  it('Pencil mode gets the button once; removing it sticks', () => {
    offerLastToolOnce()
    expect(extraTools.get()).toEqual(['lastTool'])
    extraTools.set([])
    offerLastToolOnce()
    expect(extraTools.get()).toEqual([])
  })
})
