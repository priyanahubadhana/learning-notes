import { describe, expect, it } from 'vitest'
import { addStudyDays } from '../core/time'
import type { Card, Rating } from '../core/types'
import { newCard } from './cardService'
import {
  fixedStepsScheduler as fixed,
  previewRatings,
  type SchedulerSettings,
} from './scheduler'

const NOW = new Date(2026, 9, 26, 12).getTime()
const settings: SchedulerSettings = {
  againMinutes: 10,
  goodSteps: [1, 3, 7, 14, 30, 60],
  dayStartHour: 4,
  targetMemory: 90,
}
const card = (over: Partial<Card> = {}): Card => ({
  ...newCard({ id: 'b1', pageId: 'p1' }, 'nb1', 'main', NOW),
  ...over,
})
const rate = (c: Card, r: Rating, s = settings) => fixed.next(c, r, NOW, s)

describe('fixed-steps scheduler', () => {
  it('Good climbs one step and waits that many study days', () => {
    expect(rate(card(), 'good')).toMatchObject({ step: 1, intervalDays: 1 })
    const next = rate(card({ step: 2, intervalDays: 3 }), 'good')
    expect(next).toMatchObject({ step: 3, intervalDays: 7 })
    expect(next.due).toBe(addStudyDays(NOW, 7, 4))
  })

  it('Easy skips one step, Hard stays on the same step', () => {
    expect(rate(card({ step: 1 }), 'easy')).toMatchObject({
      step: 3,
      intervalDays: 7,
    })
    expect(rate(card({ step: 2 }), 'hard')).toMatchObject({
      step: 2,
      intervalDays: 3,
    })
    // Hard on a new card still waits the first gap.
    expect(rate(card(), 'hard')).toMatchObject({ step: 0, intervalDays: 1 })
  })

  it('Again returns after the set minutes and goes back to step 0', () => {
    const next = rate(card({ step: 3, intervalDays: 7, lapses: 1 }), 'again')
    expect(next).toEqual({
      due: NOW + 10 * 60_000,
      intervalDays: 0,
      step: 0,
      lapses: 2,
    })
    // Forgetting a card that was never learned is not a lapse.
    expect(rate(card(), 'again').lapses).toBe(0)
  })

  it('stays at the top of the ladder, also after the ladder is shortened', () => {
    expect(rate(card({ step: 6 }), 'easy')).toMatchObject({
      step: 6,
      intervalDays: 60,
    })
    const short = { ...settings, goodSteps: [2, 5] }
    expect(rate(card({ step: 5 }), 'good', short)).toMatchObject({
      step: 2,
      intervalDays: 5,
    })
  })

  it('due dates land on the study-day start (after the day-start hour)', () => {
    const lateNight = new Date(2026, 9, 27, 2).getTime() // still the 26th's day
    const next = fixed.next(card(), 'good', lateNight, settings)
    expect(next.due).toBe(new Date(2026, 9, 27, 4).getTime())
  })

  it('preview always reflects the settings passed in', () => {
    const p = previewRatings(card({ step: 1 }), NOW, settings)
    expect(Object.keys(p)).toEqual(['again', 'hard', 'good', 'easy'])
    expect(p.good.intervalDays).toBe(3)
    const changed = previewRatings(card({ step: 1 }), NOW, {
      ...settings,
      againMinutes: 5,
      goodSteps: [2, 4],
    })
    expect(changed.good.intervalDays).toBe(4)
    expect(changed.again.due).toBe(NOW + 5 * 60_000)
  })
})
