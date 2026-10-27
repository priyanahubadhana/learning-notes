import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Rating, ReviewLog } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { MAIN_PART, newCard } from '../recall/cardService'
import { chartData } from './dashboard/chartData'
import { suggestCharts } from './dashboard/chartSpec'
import { ensureStudyTracker, listColumns } from './databaseService'
import {
  loadReviewHistory,
  studyStreak,
  type ReviewHistory,
} from './trackerHistory'

const DAY = 86_400_000
const NOW = new Date(2026, 9, 28, 15).getTime() // a Wednesday
let db: LearningNotesDB
let nb: string

beforeEach(async () => {
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Medicine')).id
})

afterEach(async () => {
  await db.delete()
})

const history = (days: Record<number, [number, number]>): ReviewHistory =>
  new Map(
    Object.entries(days).map(([ago, [answered, correct]]) => [
      new Date(NOW - Number(ago) * DAY).toLocaleDateString('sv'),
      { answered, correct },
    ]),
  )

describe('study streak', () => {
  it('counts days in a row up to today, and the best run', () => {
    const h = history({ 0: [3, 3], 1: [2, 1], 2: [1, 1], 4: [5, 5], 5: [1, 1] })
    expect(studyStreak(h, NOW)).toEqual({ current: 3, best: 3 })
  })

  it('a day not over yet does not break the streak', () => {
    const h = history({
      1: [2, 2],
      2: [2, 2],
      5: [1, 1],
      6: [1, 1],
      7: [1, 1],
      8: [1, 1],
    })
    expect(studyStreak(h, NOW)).toEqual({ current: 2, best: 4 })
  })

  it('is 0 after a missed day, and with no history', () => {
    expect(studyStreak(history({ 2: [1, 1] }), NOW)).toEqual({
      current: 0,
      best: 1,
    })
    expect(studyStreak(new Map(), NOW)).toEqual({ current: 0, best: 0 })
  })
})

describe('review history of a notebook', () => {
  const log = (cardId: string, rating: Rating, ago: number): ReviewLog => ({
    id: `l${Math.random()}`,
    cardId,
    rating,
    createdAt: NOW - ago * DAY,
    durationMs: 1000,
    kind: 'review',
    scheduler: 'fixed',
    dueBefore: 0,
    dueAfter: 0,
    intervalBefore: 0,
    intervalAfter: 1,
    stepAfter: 1,
    isNew: false,
  })

  it('counts the notebook’s answers per day, skipping other notebooks and erased entries', async () => {
    const page = await createPage(db, nb, null, 'Heart')
    const card = {
      ...newCard({ id: 'b1', pageId: page.id }, nb, MAIN_PART, 0),
      id: 'c1',
    }
    const other = { ...card, id: 'c2', notebookId: 'elsewhere' }
    await db.cards.bulkAdd([card, other])
    await db.reviewLogs.bulkAdd([
      log('c1', 'good', 0),
      log('c1', 'again', 0),
      log('c1', 'easy', 1),
      log('c2', 'good', 0),
      { ...log('c1', 'good', 0), purgedAt: NOW },
      log('c1', 'good', 400), // older than a year
    ])
    const h = await loadReviewHistory(db, nb, NOW)
    // Oldest day first.
    expect([...h.values()]).toEqual([
      { answered: 1, correct: 1 },
      { answered: 2, correct: 1 },
    ])
  })
})

describe('tracker dashboard', () => {
  it('suggests the history charts for a Study tracker', async () => {
    const tracker = await ensureStudyTracker(db, nb)
    const columns = await listColumns(db, tracker.id)
    const charts = suggestCharts(columns)
    expect(charts.map((c) => c.history).filter(Boolean)).toEqual([
      'streak',
      'correct',
      'days',
    ])
    // Lessons by Status is there too.
    expect(charts.some((c) => c.kind === 'donut')).toBe(true)
  })

  it('works out % correct per week, answers per day and the streak', () => {
    const h = history({ 0: [4, 3], 1: [2, 2], 9: [10, 5] })
    const spec = (history: 'correct' | 'days' | 'streak') =>
      ({
        id: history,
        kind: 'number',
        title: '',
        size: 'small',
        measure: 'count',
        history,
      }) as const
    const weeks = chartData(spec('correct'), [], [], NOW, h)
    if (weeks.kind !== 'series') throw new Error('series expected')
    // This week (Mon 26 – Wed 28): 5 of 6 right; the week of 12 Oct: 5 of 10 (day 9).
    expect(weeks.points.at(-1)?.value).toBeCloseTo(5 / 6)
    expect(weeks.points.at(-1)?.rows).toBe(6)
    expect(weeks.points[0].value).toBeCloseTo(0.5)

    const days = chartData(spec('days'), [], [], NOW, h)
    if (days.kind !== 'heatmap') throw new Error('heatmap expected')
    expect(days.total).toBe(16)
    expect(days.max).toBe(10)

    const streak = chartData(spec('streak'), [], [], NOW, h)
    expect(streak).toMatchObject({ kind: 'number', value: 2 })
  })
})
