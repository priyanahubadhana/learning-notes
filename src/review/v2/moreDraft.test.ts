import { describe, expect, it, vi } from 'vitest'
import { createDraft, moreTabs } from './moreDraft'

describe('More sheet draft model (RV-P12, RV-P13)', () => {
  it('starts clean; staging makes it dirty; the same key replaces', () => {
    const d = createDraft()
    expect(d.dirty()).toBe(false)
    d.stage({ key: 'a', apply: vi.fn(), undo: vi.fn() })
    d.stage({ key: 'a', apply: vi.fn(), undo: vi.fn() })
    expect(d.dirty()).toBe(true)
    expect(d.size()).toBe(1)
  })

  it('nothing runs until commit; discard drops everything unrun', async () => {
    const apply = vi.fn(async () => {})
    const d = createDraft()
    d.stage({ key: 'a', apply, undo: vi.fn() })
    expect(apply).not.toHaveBeenCalled()
    d.discard()
    expect(d.dirty()).toBe(false)
    expect(await d.commit()).toBeNull()
    expect(apply).not.toHaveBeenCalled()
  })

  it('commit applies all in order; one undo reverts all, last first', async () => {
    const log: string[] = []
    const d = createDraft()
    for (const k of ['a', 'b']) {
      d.stage({
        key: k,
        apply: async () => void log.push(`do ${k}`),
        undo: async () => void log.push(`undo ${k}`),
      })
    }
    const undo = await d.commit()
    expect(log).toEqual(['do a', 'do b'])
    expect(d.dirty()).toBe(false)
    await undo!()
    expect(log).toEqual(['do a', 'do b', 'undo b', 'undo a'])
  })
})

describe('More tabs follow their own unlock switch (RV-P10)', () => {
  it('lists only tabs whose switch is on, in the fixed order', () => {
    const on = new Set(['rev.stats', 'rev.decks'])
    expect(moreTabs((id) => on.has(id)).map((x) => x.id)).toEqual([
      'decks',
      'stats',
    ])
  })
  it('none on = no tabs', () => {
    expect(moreTabs(() => false)).toEqual([])
  })
})

describe('draft dirty signal (React state in the More sheet)', () => {
  it('tells the listener on stage, discard and commit', async () => {
    const seen: boolean[] = []
    const d = createDraft((x) => seen.push(x))
    d.stage({ key: 'a', apply: vi.fn(), undo: vi.fn() })
    d.discard()
    d.stage({ key: 'b', apply: vi.fn(), undo: vi.fn() })
    await d.commit()
    expect(seen).toEqual([true, false, true, false])
  })
})
