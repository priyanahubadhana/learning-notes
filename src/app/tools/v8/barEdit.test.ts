// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_BAR,
  knownIds,
  resetBar,
  EXTRA_IDS,
  LOCKED_IDS,
  addTo,
  barDraft,
  barTools,
  cancelEdit,
  cleanBar,
  dragOver,
  doneEdit,
  isLocked,
  removeFrom,
  startEdit,
  trayOf,
} from './barEdit'
import { metaOf } from '../toolRegistryMeta'
import { findTool } from '../toolRegistry'

afterEach(() => {
  localStorage.clear()
  barTools.clearCache()
  barDraft.set(null)
})

describe('locked core tools (S5-23)', () => {
  it('locks Text, Pen and Eraser; the rest can leave', () => {
    expect([...LOCKED_IDS]).toEqual(['text', 'pen', 'eraser'])
    expect(isLocked('pen')).toBe(true)
    expect(isLocked('shapes')).toBe(false)
  })
  it('never removes a locked tool', () => {
    expect(removeFrom([...DEFAULT_BAR], 'eraser')).toEqual([...DEFAULT_BAR])
    expect(removeFrom([...DEFAULT_BAR], 'lasso')).toEqual([
      'text',
      'pen',
      'eraser',
      'shapes',
      'insert',
    ])
  })
  it('puts a missing locked tool back when a saved bar is read', () => {
    expect(cleanBar(['shapes', 'insert'])).toEqual([
      'text',
      'pen',
      'eraser',
      'shapes',
      'insert',
    ])
    expect(cleanBar('nope')).toBeUndefined()
    expect(cleanBar(['text', 'pen', 'eraser', 'ghost', 'text'])).toEqual([
      'text',
      'pen',
      'eraser',
    ])
  })
})

describe('the tray and adding back (S5-23)', () => {
  it('a removed tool waits in the tray and one tap adds it back', () => {
    const bar = removeFrom([...DEFAULT_BAR], 'shapes')
    expect(trayOf(bar)).toContain('shapes')
    expect(addTo(bar, 'shapes')).toEqual([...bar, 'shapes'])
    expect(addTo(addTo(bar, 'shapes'), 'shapes')).toEqual([...bar, 'shapes'])
  })
  it('the tray offers Highlighter, and every extra is a real registry tool', () => {
    expect(trayOf([...DEFAULT_BAR])).toContain('highlighter')
    for (const id of EXTRA_IDS) {
      expect(findTool(id), id).toBeDefined()
      expect(metaOf(id), id).toBeDefined()
    }
  })
})

describe('live drag (S5-22)', () => {
  it('over another tool: the dragged one takes its place', () => {
    const next = dragOver([...DEFAULT_BAR], 'insert', { tool: 'shapes' })
    expect(next).toEqual(['text', 'pen', 'eraser', 'insert', 'shapes', 'lasso'])
  })
  it('over the tray: a removable tool leaves, a locked one stays', () => {
    expect(dragOver([...DEFAULT_BAR], 'lasso', 'tray')).not.toContain('lasso')
    expect(dragOver([...DEFAULT_BAR], 'pen', 'tray')).toEqual([...DEFAULT_BAR])
  })
  it('a tray tool dragged onto the bar is added where it lands', () => {
    expect(dragOver([...DEFAULT_BAR], 'highlighter', { tool: 'pen' })).toEqual([
      'text',
      'highlighter',
      'pen',
      'eraser',
      'shapes',
      'lasso',
      'insert',
    ])
    expect(dragOver([...DEFAULT_BAR], 'highlighter', 'bar')).toEqual([
      ...DEFAULT_BAR,
      'highlighter',
    ])
  })
})

describe('edit session (S5-22)', () => {
  it('Done saves on this device; Cancel keeps the old bar', () => {
    startEdit()
    barDraft.set(addTo(barDraft.get()!, 'highlighter'))
    cancelEdit()
    expect(barTools.get()).toEqual([...DEFAULT_BAR])
    expect(barDraft.get()).toBeNull()
    startEdit()
    barDraft.set(addTo(barDraft.get()!, 'highlighter'))
    expect(doneEdit()).toBe(true)
    expect(barTools.get()).toEqual([...DEFAULT_BAR, 'highlighter'])
    expect(barDraft.get()).toBeNull()
  })
  it('Done with no change says nothing changed', () => {
    startEdit()
    expect(doneEdit()).toBe(false)
  })
})

describe('every tool of the old Edit toolbar list (never drop a feature)', () => {
  it('knows the app tools but never the fixed parts', () => {
    const ids = knownIds()
    expect(ids.length).toBeGreaterThan(40)
    for (const id of ['bold', 'share', 'highlighter', 'shapes'])
      expect(ids).toContain(id)
    for (const id of ['undo', 'redo', 'more', 'newLine'])
      expect(ids).not.toContain(id)
  })
  it('keeps a saved bar with any of them', () => {
    expect(cleanBar([...DEFAULT_BAR, 'bold', 'share'])).toEqual([
      ...DEFAULT_BAR,
      'bold',
      'share',
    ])
  })
  it('reset puts the standard bar back', () => {
    barTools.set([...DEFAULT_BAR, 'bold'])
    startEdit()
    resetBar()
    expect(barTools.get()).toEqual([...DEFAULT_BAR])
    expect(barDraft.get()).toBeNull()
  })
})
