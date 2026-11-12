// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  asksForTryNew,
  closeTryNew,
  createTapCounter,
  KEEP_ON_ID,
  rowsToTurnOff,
  openTryNew,
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
