import { describe, expect, it } from 'vitest'
import { arrangePills, iconOnly, pillBottom, type PillKind } from './pillLogic'

const p = (kind: PillKind, id: string = kind) => ({ kind, id })
const NONE = { tabBar: 0, keyboard: 0, toolFooter: 0, toast: 0 }

describe('pill order and overflow (S3-21, S3-26)', () => {
  it('stacks recording, playing, timer, sync, update, zoom from the bottom', () => {
    const a = arrangePills([
      p('zoom'),
      p('update'),
      p('sync'),
      p('recording'),
      p('timer'),
    ])
    expect(a.shown.map((x) => x.kind)).toEqual([
      'recording',
      'timer',
      'sync',
      'update',
    ])
    expect(a.rest.map((x) => x.kind)).toEqual(['zoom'])
  })
  it('never folds recording, whatever else is there', () => {
    const many = [
      p('zoom'),
      p('custom'),
      p('update'),
      p('sync'),
      p('timer'),
      p('playing'),
      p('recording'),
    ]
    const a = arrangePills(many)
    expect(a.shown[0].kind).toBe('recording')
    expect(a.rest.some((x) => x.kind === 'recording')).toBe(false)
    expect(a.shown).toHaveLength(4)
    expect(a.rest).toHaveLength(3)
  })
  it('keeps insertion order inside a kind', () => {
    const a = arrangePills([p('custom', 'b'), p('custom', 'a')])
    expect(a.shown.map((x) => x.id)).toEqual(['b', 'a'])
  })
})

describe('pill bottom offset (S3-23, S3-29)', () => {
  it('is 16 px with nothing else', () => {
    expect(pillBottom(NONE)).toBe(16)
  })
  it('rides above the tab bar', () => {
    expect(pillBottom({ ...NONE, tabBar: 56 })).toBe(72)
  })
  it('rides above the keyboard and its 44 px bar', () => {
    expect(pillBottom({ ...NONE, keyboard: 300 })).toBe(16 + 344)
  })
  it('rides above the Tool frame footer (the tab bar is covered)', () => {
    expect(pillBottom({ ...NONE, tabBar: 56, toolFooter: 64 })).toBe(80)
  })
  it('rides above a toast with an 8 px gap', () => {
    expect(pillBottom({ ...NONE, toast: 60 })).toBe(68)
  })
})

describe('icon only (S3-28)', () => {
  it('only on a phone with 3+ pills, never for recording', () => {
    expect(iconOnly('sync', 3, true)).toBe(true)
    expect(iconOnly('recording', 3, true)).toBe(false)
    expect(iconOnly('sync', 2, true)).toBe(false)
    expect(iconOnly('sync', 5, false)).toBe(false)
  })
})
