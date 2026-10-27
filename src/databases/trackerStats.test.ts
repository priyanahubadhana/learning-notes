import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Block, Card, Rating } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
import { CARD_BLOCK_TYPE, MAIN_PART, newCard } from '../recall/cardService'
import { loadDatabaseData, resolveRows } from './databaseQuery'
import { ensureStudyTracker, listColumns } from './databaseService'
import { getReviewQueue } from '../recall/reviewService'
import { loadTrackerStats } from './trackerLoad'
import { setLessonStatus } from './trackerService'
import {
  addCard as add,
  autoStatus,
  cardLevel,
  cardsDueText,
  levelsText,
  noStats,
  trackerRow,
  type LessonStats,
} from './trackerStats'

const DAY = 86_400_000
const NOW = new Date(2026, 9, 27, 12).getTime()
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

/** A lesson's numbers built from a short description of its cards. */
function statsOf(
  cards: { interval: number; answer?: Rating; due?: number }[],
): LessonStats {
  const stats = noStats()
  for (const c of cards) {
    const card = {
      reps: c.interval > 0 || c.answer ? 1 : 0,
      intervalDays: c.interval,
      due: c.due ?? NOW + DAY,
      lastReviewAt: c.answer ? NOW - DAY : undefined,
      lastRating: c.answer,
    } as Card
    add(stats, card, NOW)
  }
  return stats
}

describe('card levels', () => {
  it('follow the review gap: New, under 1 day, 1–20 days, 21+ days', () => {
    expect(cardLevel({ reps: 0, intervalDays: 0 })).toBe('new')
    expect(cardLevel({ reps: 0, intervalDays: 30 })).toBe('new')
    expect(cardLevel({ reps: 2, intervalDays: 0 })).toBe('learning')
    expect(cardLevel({ reps: 2, intervalDays: 0.5 })).toBe('learning')
    expect(cardLevel({ reps: 2, intervalDays: 1 })).toBe('familiar')
    expect(cardLevel({ reps: 2, intervalDays: 20.9 })).toBe('familiar')
    expect(cardLevel({ reps: 2, intervalDays: 21 })).toBe('mastered')
  })
})

describe('lesson status rule', () => {
  const mastered = { interval: 30, answer: 'good' as Rating }

  it('Not started until a card has been answered', () => {
    expect(autoStatus(noStats())).toBe('notStarted')
    expect(autoStatus(statsOf([{ interval: 0 }, { interval: 0 }]))).toBe(
      'notStarted',
    )
  })

  it('Learning under 75% correct (latest answer per card)', () => {
    const s = statsOf([
      { interval: 1, answer: 'good' },
      { interval: 0, answer: 'again' },
      { interval: 0, answer: 'again' },
      { interval: 1, answer: 'good' },
    ])
    expect(autoStatus(s)).toBe('learning') // 50%
    const edge = statsOf([
      { interval: 1, answer: 'good' },
      { interval: 1, answer: 'good' },
      { interval: 1, answer: 'good' },
      { interval: 0, answer: 'again' },
    ])
    expect(autoStatus(edge)).toBe('review') // exactly 75% is not "under"
  })

  it('Mastered needs 90%+ correct, nothing due, no new cards and 80%+ cards at level Mastered', () => {
    const all = statsOf(Array.from({ length: 10 }, () => mastered))
    expect(autoStatus(all)).toBe('mastered')
    // One card due → Review.
    const due = statsOf([
      ...Array.from({ length: 9 }, () => mastered),
      { ...mastered, due: NOW - DAY },
    ])
    expect(due.due).toBe(1)
    expect(autoStatus(due)).toBe('review')
    // A new card → Review, however well the rest is known.
    const withNew = statsOf([
      ...Array.from({ length: 9 }, () => mastered),
      { interval: 0 },
    ])
    expect(autoStatus(withNew)).toBe('review')
    // Only 7 of 10 cards at level Mastered → Review.
    const shaky = statsOf([
      ...Array.from({ length: 7 }, () => mastered),
      ...Array.from({ length: 3 }, () => ({
        interval: 5,
        answer: 'good' as Rating,
      })),
    ])
    expect(autoStatus(shaky)).toBe('review')
    // 8 of 10 is enough.
    const enough = statsOf([
      ...Array.from({ length: 8 }, () => mastered),
      ...Array.from({ length: 2 }, () => ({
        interval: 5,
        answer: 'good' as Rating,
      })),
    ])
    expect(autoStatus(enough)).toBe('mastered')
  })

  it('a status set by the user wins, and handing back shows Auto again', () => {
    const s = statsOf([{ interval: 30, answer: 'good' }])
    expect(trackerRow(s, undefined)).toMatchObject({
      status: 'mastered',
      override: null,
    })
    expect(trackerRow(s, 'learning')).toMatchObject({
      status: 'learning',
      auto: 'mastered',
      override: 'learning',
    })
    // Unknown stored text is ignored.
    expect(trackerRow(s, 'nonsense').override).toBeNull()
  })
})

describe('texts', () => {
  it('shows due and new cards separately', () => {
    expect(cardsDueText(noStats())).toBe('')
    const s = statsOf([
      { interval: 3, answer: 'good', due: NOW - DAY },
      { interval: 3, answer: 'good', due: NOW - DAY },
      { interval: 0 },
    ])
    expect(cardsDueText(s)).toBe('2 due · 1 new')
    expect(cardsDueText(statsOf([{ interval: 3, answer: 'good' }]))).toBe(
      'All done',
    )
    expect(levelsText(s)).toBe('1 New · 2 Familiar')
  })
})

// ------------------------------------------------------------ from the data

let counter = 0
/** A live Card block on `pageId` plus its card record. */
async function addCard(
  pageId: string,
  over: Partial<Card> = {},
  blockOver: Partial<Block> = {},
): Promise<Card> {
  const id = `b${counter++}`
  const stamp = { createdAt: 0, updatedAt: 0, deletedAt: null }
  await db.blocks.add({
    ...stamp,
    id,
    pageId,
    parentId: null,
    type: CARD_BLOCK_TYPE,
    content: { text: [{ type: 'text', text: 'Q?', styles: {} }] },
    order: 'a0',
    ...blockOver,
  })
  const card: Card = {
    ...newCard({ id, pageId }, nb, MAIN_PART, 0),
    id: `c-${id}`,
    ...over,
  }
  await db.cards.add(card)
  return card
}

const learnt = (days: number, over: Partial<Card> = {}): Partial<Card> => ({
  reps: 2,
  intervalDays: days,
  due: NOW + days * DAY,
  lastReviewAt: NOW - 3 * DAY,
  lastRating: 'good',
  ...over,
})

describe('numbers from the data', () => {
  it('sub-pages count towards their lesson; Trash, other notebooks and unusable cards do not', async () => {
    const lesson = await createPage(db, nb, null, 'Heart')
    const sub = await createPage(db, nb, lesson.id, 'Valves')
    const subSub = await createPage(db, nb, sub.id, 'Mitral')
    const other = await createPage(db, nb, null, 'Lungs')
    await addCard(lesson.id, learnt(30))
    await addCard(sub.id, learnt(2, { due: NOW - DAY, lastRating: 'again' }))
    await addCard(subSub.id) // new card
    await addCard(other.id)
    // Left out: suspended, block in the Trash, other notebook's card.
    await addCard(lesson.id, { suspendedAt: 1 })
    await addCard(lesson.id, {}, { deletedAt: 5 })
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb2 = (await createNotebook(db, ws, 'Other')).id
    await addCard(lesson.id, { notebookId: nb2 })

    const stats = await loadTrackerStats(db, nb, NOW)
    expect([...stats.keys()].sort()).toEqual([lesson.id, other.id].sort())
    const heart = stats.get(lesson.id)!
    expect(heart).toMatchObject({
      cards: 3,
      due: 1,
      fresh: 1,
      answered: 2,
      correct: 1,
      lastRevisedAt: NOW - 3 * DAY,
      levels: { new: 1, learning: 0, familiar: 1, mastered: 1 },
    })
    expect(stats.get(other.id)).toMatchObject({ cards: 1, fresh: 1 })
  })

  it('leaves out cards on Templates pages, whatever notebook the card names', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const templates = await db.notebooks.add({
      ...{ createdAt: 0, updatedAt: 0, deletedAt: null },
      id: 'tpl',
      workspaceId: ws,
      title: 'Templates',
      order: 'a0',
      kind: 'templates',
    })
    expect(templates).toBe('tpl')
    const lesson = await createPage(db, nb, null, 'Heart')
    const template = await createPage(db, 'tpl', null, 'Layout')
    await addCard(lesson.id)
    // A card made before its page became a template still names the old notebook.
    await addCard(template.id, { notebookId: nb })
    const stats = await loadTrackerStats(db, nb, NOW)
    expect(stats.get(lesson.id)?.cards).toBe(1)
    const due = await getReviewQueue(db, { kind: 'all' }, NOW)
    expect(due.cards.map((c) => c.pageId)).toEqual([lesson.id])
  })

  it('a lesson moved to the Trash drops out with its cards', async () => {
    const lesson = await createPage(db, nb, null, 'Heart')
    const sub = await createPage(db, nb, lesson.id, 'Valves')
    await addCard(sub.id)
    await deletePage(db, lesson.id)
    expect((await loadTrackerStats(db, nb, NOW)).size).toBe(0)
  })

  it('fills the tracker columns of each lesson', async () => {
    const tracker = await ensureStudyTracker(db, nb)
    const heart = await createPage(db, nb, null, 'Heart')
    const lungs = await createPage(db, nb, null, 'Lungs')
    await createPage(db, nb, null, 'Brain')
    await addCard(heart.id, learnt(30))
    await addCard(heart.id, learnt(0, { reps: 1, lastRating: 'again' }))
    await addCard(heart.id, { due: NOW - DAY, reps: 0 })
    await addCard(lungs.id, learnt(40))

    const columns = await listColumns(db, tracker.id)
    const id = (type: string) => columns.find((c) => c.type === type)!.id
    const data = await loadDatabaseData(db, tracker.id, NOW)
    const rows = resolveRows(data, NOW)
    const row = (title: string) => rows.find((r) => r.page.title === title)!
    const cell = (title: string, type: string) => row(title).values[id(type)]

    // Two answered cards, one of them Again = 50% correct.
    expect(cell('Heart', 'trackerStatus')).toBe('Learning')
    expect(cell('Heart', 'trackerCardsDue')).toBe(1) // the relearning card
    expect(cell('Heart', 'trackerCorrect')).toBe(0.5)
    expect(cell('Heart', 'trackerLastRevised')).toMatchObject({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
    expect(cell('Heart', 'trackerLevels')).toBe(
      '1 New · 1 Learning · 1 Mastered',
    )
    expect(cell('Lungs', 'trackerStatus')).toBe('Mastered')
    expect(cell('Brain', 'trackerStatus')).toBe('Not started')
    expect(cell('Brain', 'trackerCorrect')).toBeNull()
    expect(cell('Brain', 'trackerLastRevised')).toBeNull()
    expect(cell('Brain', 'trackerCardsDue')).toBeNull()
    expect(row('Brain').tracker?.auto).toBe('notStarted')
  })

  it('the user can set a status (📌) and hand it back to Auto', async () => {
    const tracker = await ensureStudyTracker(db, nb)
    const heart = await createPage(db, nb, null, 'Heart')
    await addCard(heart.id, learnt(30))
    const status = (await listColumns(db, tracker.id)).find(
      (c) => c.type === 'trackerStatus',
    )!
    const read = async () => {
      const rows = resolveRows(await loadDatabaseData(db, tracker.id, NOW), NOW)
      return rows[0]
    }
    expect((await read()).values[status.id]).toBe('Mastered')

    await setLessonStatus(db, heart.id, 'learning')
    let row = await read()
    expect(row.values[status.id]).toBe('Learning')
    expect(row.tracker).toMatchObject({
      override: 'learning',
      auto: 'mastered',
    })

    await setLessonStatus(db, heart.id, null)
    row = await read()
    expect(row.values[status.id]).toBe('Mastered')
    expect(row.tracker?.override).toBeNull()
    expect((await db.pages.get(heart.id))?.values).toBeUndefined()
  })
})

describe('speed', () => {
  it('works out 10,000 cards in 100 lessons quickly', async () => {
    const tracker = await ensureStudyTracker(db, nb)
    const pages = []
    for (let i = 0; i < 100; i++)
      pages.push(await createPage(db, nb, null, `L${i}`))
    const blocks: Block[] = []
    const cards: Card[] = []
    for (let i = 0; i < 10_000; i++) {
      const pageId = pages[i % 100].id
      const id = `s${i}`
      blocks.push({
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
        id,
        pageId,
        parentId: null,
        type: CARD_BLOCK_TYPE,
        content: { text: [{ type: 'text', text: 'Q?', styles: {} }] },
        order: 'a0',
      })
      cards.push({
        ...newCard({ id, pageId }, nb, MAIN_PART, 0),
        id: `c${i}`,
        ...(i % 5 === 0 ? {} : learnt((i % 40) + 1)),
      })
    }
    await db.blocks.bulkAdd(blocks)
    await db.cards.bulkAdd(cards)

    const start = performance.now()
    const data = await loadDatabaseData(db, tracker.id, NOW)
    const rows = resolveRows(data, NOW)
    const ms = performance.now() - start
    expect(rows).toHaveLength(100)
    expect(rows[0].tracker?.stats.cards).toBe(100)
    // fake-indexeddb is far slower than a real browser; this is a ceiling.
    expect(ms).toBeLessThan(4000)
  }, 60_000)
})
