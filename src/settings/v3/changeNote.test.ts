import { describe, expect, it } from 'vitest'
import { settingsRegistry } from '../builtinSettings'
import { changeNote, valueText } from './changeNote'

const get = (id: string) => settingsRegistry.get(id)!

describe('changeNote (SET-B07)', () => {
  it('shows a choice as its plain label', () => {
    expect(valueText(get('review.scheduler'), 'fixed')).toBe('Simple steps')
  })
  it('shows a number and an unknown choice in plain words', () => {
    expect(valueText(get('review.newPerDay'), 20)).toBe('20')
    expect(valueText(get('review.scheduler'), 'zzz')).toBe('Not set')
  })
  it('shows a step list with arrows', () => {
    expect(valueText(get('review.goodSteps'), [1, 3, 7])).toBe('1 → 3 → 7')
  })
  it('writes one line naming what changed', () => {
    expect(
      changeNote({ id: 'x', name: 'Scheduler', from: 'A', to: 'B', seq: 1 }),
    ).toBe('Scheduler: A → B')
  })
})
