import { describe, expect, it } from 'vitest'
import {
  defaultCanGo,
  visibleSteps,
  visibleTools,
  wizardProgress,
} from './wizardLogic'

const S = [
  { id: 'file', label: 'File' },
  { id: 'match', label: 'Match columns', pro: 'db.csvPlus' },
  { id: 'check', label: 'Check' },
  { id: 'done', label: 'Done' },
]

describe('wizard steps logic', () => {
  it('closes the numbers up when a Pro step is locked (S3-40)', () => {
    expect(visibleSteps(S).map((s) => s.label)).toEqual([
      'File',
      'Check',
      'Done',
    ])
    expect(visibleSteps(S, (id) => id === 'db.csvPlus')).toHaveLength(4)
  })
  it('allows earlier steps, and the next only when valid (S3-14..16)', () => {
    expect(defaultCanGo(S, 'check', 'file', false)).toBe(true)
    expect(defaultCanGo(S, 'file', 'match', false)).toBe(false)
    expect(defaultCanGo(S, 'file', 'match', true)).toBe(true)
    expect(defaultCanGo(S, 'file', 'check', true)).toBe(false)
    expect(defaultCanGo(S, 'file', 'nope', true)).toBe(false)
  })
  it('gives progress as a fraction', () => {
    expect(wizardProgress(S, 'check')).toBe(0.75)
    expect(wizardProgress(S, 'x')).toBe(0)
  })
})

describe('visibleTools (S3-40)', () => {
  const tools = [{ id: 'a' }, { id: 'b', pro: 'media.curves' }, { id: 'c' }]
  it('leaves a locked Pro tool out and keeps the order', () => {
    expect(visibleTools(tools).map((t) => t.id)).toEqual(['a', 'c'])
  })
  it('adds only the unlocked one', () => {
    expect(
      visibleTools(tools, (id) => id === 'media.curves').map((t) => t.id),
    ).toEqual(['a', 'b', 'c'])
    expect(visibleTools(tools, () => false).map((t) => t.id)).toEqual([
      'a',
      'c',
    ])
  })
})
