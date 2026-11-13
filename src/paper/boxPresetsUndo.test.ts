import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import type { StepInput } from '../core/historySteps'

const steps: StepInput[] = []
let stored: unknown = {}
vi.mock('../core/historySteps', () => ({
  pushStep: (s: StepInput) => void steps.push(s),
}))
vi.mock('../settings/settingsService', () => ({
  getSetting: async () => stored,
  setSetting: async (_db: unknown, _def: unknown, v: unknown) => {
    stored = v
  },
}))

import { changeNewBoxStyle, loadNewBoxStyle } from './boxPresets'

const db = {} as LearningNotesDB

describe('new-box look is one Undo / Redo step (TB-42, Undo for every change)', () => {
  beforeEach(() => {
    steps.length = 0
    stored = {}
  })
  it('saves the look, pushes a step, Undo puts the old look back, Redo the new one', async () => {
    const seen: unknown[] = []
    await changeNewBoxStyle(db, undefined, { bg: 'yellow', pad: 8 }, (s) =>
      seen.push(s),
    )
    expect(await loadNewBoxStyle(db)).toEqual({ bg: 'yellow', pad: 8 })
    expect(steps).toHaveLength(1)
    await steps[0].undo?.()
    expect(await loadNewBoxStyle(db)).toBeUndefined()
    await steps[0].redo?.()
    expect(await loadNewBoxStyle(db)).toEqual({ bg: 'yellow', pad: 8 })
    // The open card is told each value that came into place.
    expect(seen).toEqual([
      { bg: 'yellow', pad: 8 },
      undefined,
      { bg: 'yellow', pad: 8 },
    ])
  })
})
