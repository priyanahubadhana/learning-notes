import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { saveBlockChanges } from './blockService'
import type { LearningNotesDB } from './db'
import {
  addDays,
  dayKeyOf,
  daysBetween,
  lastDays,
  nextWeekday,
  weekStart,
} from './homeDays'
import { createTestDb } from './testing'
import {
  addProject,
  addTask,
  bucketTasks,
  carryTask,
  carryToTomorrow,
  completeTask,
  dayRecord,
  deleteTask,
  listTasks,
  moveToList,
  moveToQuadrant,
  reopenTask,
  restoreTask,
  showsCarried,
  taskFromBlock,
  todayKey,
  upcomingByDay,
} from './taskService'
import { newRecordFields } from './records'

let db: LearningNotesDB
beforeEach(() => {
  db = createTestDb()
})
afterEach(() => db.delete())

describe('home days', () => {
  it('rolls the day over at the day-start hour', () => {
    const lateNight = new Date(2026, 10, 7, 1, 30).getTime()
    expect(dayKeyOf(lateNight, 4)).toBe('2026-11-06')
    expect(dayKeyOf(lateNight, 0)).toBe('2026-11-07')
    const morning = new Date(2026, 10, 7, 9).getTime()
    expect(dayKeyOf(morning, 4)).toBe('2026-11-07')
  })

  it('adds days and finds weekdays across month ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    // 7 Nov 2026 is a Saturday: the next Monday is 9 Nov.
    expect(nextWeekday('2026-11-07', 1)).toBe('2026-11-09')
    expect(nextWeekday('2026-11-07', 6)).toBe('2026-11-14')
    expect(weekStart('2026-11-07')).toBe('2026-11-02')
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7)
    expect(lastDays('2026-11-07', 3)).toEqual([
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ])
  })
})

describe('tasks', () => {
  it('adds to the inbox, moves to a box, ticks and unticks', async () => {
    const a = await addTask(db, { title: '  Write essay ' })
    const b = await addTask(db, { title: 'Call Sam' })
    expect(a.title).toBe('Write essay')
    expect(bucketTasks(await listTasks(db)).inbox.map((t) => t.title)).toEqual([
      'Write essay',
      'Call Sam',
    ])

    await moveToQuadrant(db, b.id, 1)
    let buckets = bucketTasks(await listTasks(db))
    expect(buckets.inbox.map((t) => t.title)).toEqual(['Write essay'])
    expect(buckets.matrix[1].map((t) => t.title)).toEqual(['Call Sam'])

    await completeTask(db, b.id, new Date(2026, 10, 7, 10).getTime())
    buckets = bucketTasks(await listTasks(db))
    expect(buckets.matrix[1]).toHaveLength(0)
    expect(buckets.completed[0].doneDay).toBe('2026-11-07')

    await reopenTask(db, b.id)
    buckets = bucketTasks(await listTasks(db))
    expect(buckets.matrix[1]).toHaveLength(1)
    expect(buckets.completed).toHaveLength(0)
  })

  it('orders tasks inside a box and never auto-sorts', async () => {
    const a = await addTask(db, { title: 'A' })
    const b = await addTask(db, { title: 'B' })
    const c = await addTask(db, { title: 'C' })
    for (const t of [a, b, c]) await moveToQuadrant(db, t.id, 2)
    await moveToQuadrant(db, c.id, 2, 0)
    const box = bucketTasks(await listTasks(db)).matrix[2]
    expect(box.map((t) => t.title)).toEqual(['C', 'A', 'B'])
  })

  it('carries a task, keeps the history and shows "carried 3x" quietly', async () => {
    const t = await addTask(db, { title: 'Stuck', plannedDay: '2026-11-07' })
    const now = new Date(2026, 10, 7, 12).getTime()
    await carryTask(db, t.id, '2026-11-08', now)
    await carryTask(db, t.id, '2026-11-09', now)
    let task = (await listTasks(db))[0]
    expect(task.plannedDay).toBe('2026-11-09')
    expect(task.carried.map((c) => c.from)).toEqual([
      '2026-11-07',
      '2026-11-08',
    ])
    expect(showsCarried(task)).toBe(false)
    await carryTask(db, t.id, '2026-11-10', now)
    task = (await listTasks(db))[0]
    expect(showsCarried(task)).toBe(true)
    // The same day twice changes nothing.
    await carryTask(db, t.id, '2026-11-10', now)
    expect((await listTasks(db))[0].carried).toHaveLength(3)
  })

  it('carries to tomorrow from the Home day', async () => {
    const t = await addTask(db, { title: 'Later' })
    const now = new Date(2026, 10, 7, 12).getTime()
    await carryToTomorrow(db, t.id, now)
    expect((await listTasks(db))[0].plannedDay).toBe('2026-11-08')
    expect(await todayKey(db, now)).toBe('2026-11-07')
  })

  it('groups upcoming tasks by day and builds the day record', async () => {
    const now = new Date(2026, 10, 7, 12).getTime()
    const a = await addTask(db, { title: 'Done', plannedDay: '2026-11-07' })
    await completeTask(db, a.id, now)
    const b = await addTask(db, { title: 'Moved', plannedDay: '2026-11-07' })
    await carryTask(db, b.id, '2026-11-09', now)
    await addTask(db, { title: 'Open', plannedDay: '2026-11-07' })
    await addTask(db, { title: 'Soon', plannedDay: '2026-11-08' })
    const tasks = await listTasks(db)
    const record = dayRecord(tasks, '2026-11-07')
    expect(record.done.map((t) => t.title)).toEqual(['Done'])
    expect(record.carried.map((t) => t.title)).toEqual(['Moved'])
    expect(record.open.map((t) => t.title)).toEqual(['Open'])
    expect(
      upcomingByDay(tasks, '2026-11-07').map((d) => [
        d.day,
        d.tasks.map((t) => t.title),
      ]),
    ).toEqual([
      ['2026-11-08', ['Soon']],
      ['2026-11-09', ['Moved']],
    ])
  })

  it('soft deletes and restores; projects and lists work', async () => {
    const t = await addTask(db, { title: 'Temp' })
    await deleteTask(db, t.id)
    expect(await listTasks(db)).toHaveLength(0)
    expect(await db.tasks.count()).toBe(1) // kept
    await restoreTask(db, t.id)
    expect(await listTasks(db)).toHaveLength(1)
    await moveToList(db, t.id, ' Errands ')
    expect((await listTasks(db))[0].listName).toBe('Errands')
    const p = await addProject(db, 'Thesis')
    expect(p.name).toBe('Thesis')
  })
})

describe('tasks from notes', () => {
  const setup = async () => {
    const now = Date.now()
    await db.pages.add({
      ...newRecordFields(),
      id: 'p1',
      notebookId: 'n1',
      parentId: null,
      title: 'Plan',
      order: 'a0',
    })
    void now
    await saveBlockChanges(db, 'p1', {
      upserts: [
        {
          id: 'b1',
          parentId: null,
          type: 'checkListItem',
          content: { text: [], checked: false },
          order: 'a0',
        },
      ],
      deletes: [],
    })
  }

  it('links a checklist line once, and ticking the line ticks the task', async () => {
    await setup()
    const first = await taskFromBlock(db, {
      title: 'Read chapter 3',
      blockId: 'b1',
      pageId: 'p1',
      checked: false,
    })
    expect(first.created).toBe(true)
    const again = await taskFromBlock(db, {
      title: 'Read chapter 3',
      blockId: 'b1',
      pageId: 'p1',
      checked: false,
    })
    expect(again.created).toBe(false)
    expect(await db.tasks.count()).toBe(1)

    await saveBlockChanges(db, 'p1', {
      upserts: [
        {
          id: 'b1',
          parentId: null,
          type: 'checkListItem',
          content: { text: [], checked: true },
          order: 'a0',
        },
      ],
      deletes: [],
    })
    expect((await listTasks(db))[0].status).toBe('done')

    await saveBlockChanges(db, 'p1', {
      upserts: [
        {
          id: 'b1',
          parentId: null,
          type: 'checkListItem',
          content: { text: [], checked: false },
          order: 'a0',
        },
      ],
      deletes: [],
    })
    expect((await listTasks(db))[0].status).toBe('open')
  })

  it('a line already ticked makes a done task', async () => {
    await setup()
    const { task } = await taskFromBlock(db, {
      title: 'Done already',
      blockId: 'b1',
      pageId: 'p1',
      checked: true,
    })
    expect(task.status).toBe('done')
  })
})
