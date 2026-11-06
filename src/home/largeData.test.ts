import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import type { Task, TimeEntry } from '../core/homeTypes'
import { newRecordFields } from '../core/records'
import { createTestDb } from '../core/testing'
import { listTasks } from '../core/taskService'
import { recentPages } from '../core/recentPages'
import { hoursPerProject } from './reports'
import { entriesInRange } from './timerService'

/** Polish 1 · item 5: lists read by index, not whole tables. */

let db: LearningNotesDB
beforeEach(() => {
  db = createTestDb()
})
afterEach(() => db.delete())

const dayKey = (n: number) => {
  const d = new Date(Date.UTC(2024, 0, 1) + n * 86_400_000)
  return d.toISOString().slice(0, 10)
}

describe('time entries by day', () => {
  it('a week of a 20,000-entry table reads only that week', async () => {
    const entries: TimeEntry[] = []
    for (let i = 0; i < 20_000; i++) {
      const day = dayKey(i % 1000) // about 3 years of days
      entries.push({
        ...newRecordFields(),
        startedAt: i,
        endedAt: i + 60_000,
        day,
        mode: 'free',
      })
    }
    await db.timeEntries.bulkAdd(entries)

    const from = dayKey(500)
    const to = dayKey(506)
    const week = await entriesInRange(db, from, to)

    expect(week.length).toBe(7 * 20) // 20 entries on each of the 7 days
    expect(week.every((e) => e.day >= from && e.day <= to)).toBe(true)
    // The same hours as the old way (filter everything in memory).
    const old = hoursPerProject(entries, from, to, 0)
    const now = hoursPerProject(week, from, to, 0)
    expect(now).toEqual(old)
  })
})

describe('tasks', () => {
  it('Home reads open tasks and recent done ones; "Show older" reads all', async () => {
    const make = (over: Partial<Task>): Task =>
      ({
        ...newRecordFields(),
        title: 't',
        status: 'open',
        quadrant: 0,
        order: 'a',
        carried: [],
        ...over,
      }) as Task
    const tasks: Task[] = [make({ status: 'open' })]
    for (let i = 0; i < 3000; i++) {
      tasks.push(make({ status: 'done', doneDay: dayKey(i % 600) }))
    }
    await db.tasks.bulkAdd(tasks)
    const since = dayKey(570)
    const recent = await listTasks(db, { doneSince: since })
    expect(recent.filter((t) => t.status === 'open')).toHaveLength(1)
    expect(
      recent.every((t) => t.status === 'open' || t.doneDay! >= since),
    ).toBe(true)
    expect(recent.length).toBeLessThan(300)
    expect(await listTasks(db)).toHaveLength(3001)
  })
})

describe('recent pages', () => {
  it('keeps only the newest N while streaming', async () => {
    const pages = []
    for (let i = 0; i < 1000; i++) {
      pages.push({
        ...newRecordFields(),
        updatedAt: i + 1,
        notebookId: 'n',
        parentId: null,
        title: String(i),
      })
    }
    await db.pages.bulkAdd(pages as never)
    const top = await recentPages(db, () => true, 5)
    expect(top.map((p) => p.updatedAt)).toEqual([1000, 999, 998, 997, 996])
  })
})
