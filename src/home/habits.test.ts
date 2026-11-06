import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import type { Habit } from '../core/homeTypes'
import { createTestDb } from '../core/testing'
import { appendJournalNotes, openJournalDay } from '../journal/journalService'
import { listBlocks } from '../core/blockService'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { addTask, completeTask, listTasks, setTop3 } from '../core/taskService'
import { buildBriefing } from './briefing'
import {
  addHabit,
  dayState,
  habitsLeft,
  habitsMissed,
  listChecks,
  listHabits,
  setCheck,
  strip,
} from './habitService'
import { afterTime } from './timeLabel'

let db: LearningNotesDB
beforeEach(() => {
  db = createTestDb()
})
afterEach(() => db.delete())

// A habit made on 3 Nov 2026 at 09:00.
const habit = (over: Partial<Habit> = {}): Habit =>
  ({
    id: 'h1',
    createdAt: new Date(2026, 10, 3, 9).getTime(),
    updatedAt: 0,
    deletedAt: null,
    name: 'Stretch',
    routine: 'morning',
    order: 'a0',
    ...over,
  }) as Habit

const check = (day: string, done = true, habitId = 'h1') =>
  ({
    id: `${habitId}:${day}`,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    habitId,
    day,
    done,
  }) as never

describe('habit days', () => {
  it('shows done, missed (red cross), open and before', () => {
    const h = habit()
    const checks = [check('2026-11-05')]
    const state = (day: string) => dayState(h, checks, day, '2026-11-07', 4)
    expect(state('2026-11-02')).toBe('before')
    expect(state('2026-11-03')).toBe('missed')
    expect(state('2026-11-05')).toBe('done')
    expect(state('2026-11-06')).toBe('missed')
    expect(state('2026-11-07')).toBe('open')
  })

  it('uses the day-start hour: a habit made at 1 am starts the day before', () => {
    const late = habit({ createdAt: new Date(2026, 10, 4, 1).getTime() })
    expect(dayState(late, [], '2026-11-03', '2026-11-05', 4)).toBe('missed')
    expect(dayState(late, [], '2026-11-03', '2026-11-05', 0)).toBe('before')
  })

  it('an unticked check does not count as done', () => {
    expect(
      dayState(
        habit(),
        [check('2026-11-06', false)],
        '2026-11-06',
        '2026-11-07',
        4,
      ),
    ).toBe('missed')
  })

  it('builds a 7-day strip ending today', () => {
    const cells = strip(habit(), [check('2026-11-06')], '2026-11-07', 4)
    expect(cells.map((c) => c.state)).toEqual([
      'before', // 1 Nov
      'before', // 2 Nov
      'missed', // 3 Nov
      'missed',
      'missed',
      'done',
      'open',
    ])
    expect(cells[0].day).toBe('2026-11-01')
  })

  it('lists what is left today and what was missed yesterday', () => {
    const a = habit({ id: 'a', name: 'A' })
    const b = habit({ id: 'b', name: 'B' })
    const checks = [
      check('2026-11-07', true, 'a'),
      check('2026-11-06', true, 'b'),
    ]
    expect(
      habitsLeft([a, b], checks, '2026-11-07', 4).map((h) => h.name),
    ).toEqual(['B'])
    expect(
      habitsMissed([a, b], checks, '2026-11-06', '2026-11-07', 4).map(
        (h) => h.name,
      ),
    ).toEqual(['A'])
  })
})

describe('habit service', () => {
  it('ticks a habit once per day (same record), unticks, and lists a range', async () => {
    const h = await addHabit(db, { name: ' Meditate ', routine: 'morning' })
    expect(h.name).toBe('Meditate')
    await setCheck(db, h.id, '2026-11-07', true)
    await setCheck(db, h.id, '2026-11-07', true)
    expect(await db.habitChecks.count()).toBe(1)
    await setCheck(db, h.id, '2026-11-07', false)
    const [c] = await listChecks(db, '2026-11-01', '2026-11-30')
    expect(c.done).toBe(false)
    // The same id on another device (fixed id).
    const other = createTestDb()
    await setCheck(other, h.id, '2026-11-07', true)
    expect((await other.habitChecks.toArray())[0].id).toBe(c.id)
    await other.delete()
    expect((await listHabits(db)).map((x) => x.name)).toEqual(['Meditate'])
  })
})

describe('briefing', () => {
  it('gathers the day without reading anything', async () => {
    const today = '2026-11-07'
    const a = await addTask(db, { title: 'Essay', plannedDay: today })
    await addTask(db, { title: 'Email', plannedDay: today })
    await setTop3(db, a.id, today, true)
    const old = await addTask(db, { title: 'Old', plannedDay: '2026-11-06' })
    await db.tasks.update(old.id, {
      plannedDay: today,
      carried: [{ from: '2026-11-06', to: today, at: 1 }],
    })
    const h = habit({ id: 'm', name: 'Run' })
    const brief = buildBriefing({
      today,
      tasks: await listTasks(db),
      habits: [h],
      checks: [],
      cardsDue: 12,
      dayStart: 4,
    })
    expect(brief.top3.map((m) => m.task.title)).toEqual(['Essay'])
    expect(brief.dueToday.map((x) => x.title).sort()).toEqual(['Email', 'Old'])
    expect(brief.carriedFromYesterday.map((x) => x.title)).toEqual(['Old'])
    expect(brief.habitsLeft.map((x) => x.name)).toEqual(['Run'])
    expect(brief.missedHabits.map((x) => x.name)).toEqual(['Run'])
    expect(brief.cardsDue).toBe(12)
    await completeTask(db, a.id)
  })
})

describe('evening journal', () => {
  it('writes the answers into the day page, before the task record', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const date = new Date(2026, 10, 7, 21)
    const { page } = await openJournalDay(db, ws, date)
    await appendJournalNotes(
      db,
      ws,
      [
        { heading: 'What went well today?', text: 'Finished the essay' },
        { heading: 'What was hard?', text: '   ' },
        { heading: 'What will I do first tomorrow?', text: 'Read chapter 4' },
      ],
      date,
    )
    const blocks = (await listBlocks(db, page.id)).filter(
      (b) => b.parentId === null,
    )
    const types = blocks.map((b) => b.type)
    expect(types.at(-1)).toBe('dayRecord')
    expect(JSON.stringify(blocks)).not.toContain('What was hard?') // empty: skipped
    expect(JSON.stringify(blocks)).toContain('Finished the essay')
  })

  it('knows when the evening has come', () => {
    const at = (h: number, m = 0) => new Date(2026, 10, 7, h, m).getTime()
    expect(afterTime(at(19, 59), '20:00')).toBe(false)
    expect(afterTime(at(20, 0), '20:00')).toBe(true)
  })
})
