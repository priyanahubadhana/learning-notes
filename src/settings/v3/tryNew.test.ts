// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  asksForTryNew,
  closeTryNew,
  createTapCounter,
  KEEP_ON_ID,
  rowsToTurnOff,
  openTryNew,
  presetChangeItems,
  tryNewOpen,
} from './tryNew'

beforeEach(() => closeTryNew())

describe('Try new features stays hidden until asked for', () => {
  it('opens on the fifth tap within the window, not before', () => {
    const tap = createTapCounter()
    expect([0, 100, 200, 300].map((t) => tap(t))).toEqual([
      false,
      false,
      false,
      false,
    ])
    expect(tap(400)).toBe(true)
    // The count starts again.
    expect(tap(500)).toBe(false)
  })

  it('slow taps do not count', () => {
    const tap = createTapCounter()
    const results = [0, 1000, 2000, 3500, 6000].map((t) => tap(t))
    expect(results).not.toContain(true)
  })

  it('the phrase in search asks for it', () => {
    expect(asksForTryNew('try new features')).toBe(true)
    expect(asksForTryNew('  Try New Feature ')).toBe(true)
    expect(asksForTryNew('try new')).toBe(false)
    expect(asksForTryNew('glass')).toBe(false)
  })

  it('is shut at first, open for the visit once asked', () => {
    expect(tryNewOpen()).toBe(false)
    openTryNew()
    expect(tryNewOpen()).toBe(true)
    expect(sessionStorage.getItem('learning-notes:v3.tryNew')).toBe('1')
  })
})

describe('Turn all off keeps the new Settings on', () => {
  const rows = [
    { id: 'tryNew.media.v2', category: 'tryNew' },
    { id: KEEP_ON_ID, category: 'tryNew' },
    { id: 'tryNew.page.menus', category: 'tryNew' },
    { id: 'general.language', category: 'general' },
  ]
  it('never lists settings.v3, even when it is on', () => {
    const off = rowsToTurnOff(rows, () => true).map((r) => r.id)
    expect(off).toEqual(['tryNew.media.v2', 'tryNew.page.menus'])
    expect(off).not.toContain('tryNew.settings.v3')
  })
  it('lists only rows that are on and in Try new features', () => {
    expect(
      rowsToTurnOff(rows, (r) => r.id === 'tryNew.page.menus').map((r) => r.id),
    ).toEqual(['tryNew.page.menus'])
  })
})

describe('F9 preview host opens the list', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('is open at once on the preview host, closed on the live host', async () => {
    vi.stubGlobal('location', {
      hostname: 'build-next.learning-notes-app.pages.dev',
      search: '',
    })
    vi.resetModules()
    expect((await import('./tryNew')).tryNewOpen()).toBe(true)
    vi.stubGlobal('location', {
      hostname: 'learning-notes-app.pages.dev',
      search: '',
    })
    vi.resetModules()
    expect((await import('./tryNew')).tryNewOpen()).toBe(false)
  })
})

describe('rowsToTurnOff leaves the Test a phase rows alone (SET-B26g)', () => {
  it('does not list the preset rows', () => {
    const rows = [
      { id: 'tryNewPreset.on', category: 'tryNew' },
      { id: 'tryNewPreset.phase', category: 'tryNew' },
      { id: 'tryNew.home.v2', category: 'tryNew' },
    ]
    expect(rowsToTurnOff(rows, () => true).map((r) => r.id)).toEqual([
      'tryNew.home.v2',
    ])
  })
})

describe('Undo of a Test a phase change (SET-B26h)', () => {
  const own = { id: 'tryNewPreset.on', before: 'off', after: 'on' }
  it('gives one item per switch that changed, with the exact earlier state', () => {
    const items = presetChangeItems(
      new Set(['home.v2', 'reader.v2']),
      new Set(['reader.v2', 'settings.v3']),
      own,
    )
    expect(items).toEqual([
      { id: 'tryNew.home.v2', before: 'on', after: 'off' },
      { id: 'tryNew.settings.v3', before: 'off', after: 'on' },
    ])
  })
  it('keeps its own item when no switch moved', () => {
    expect(presetChangeItems(new Set(), new Set(), own)).toEqual([own])
  })
})
