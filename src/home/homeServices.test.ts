import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import type { TimeEntry } from '../core/homeTypes'
import { newRecordFields } from '../core/records'
import { createTestDb } from '../core/testing'
import { addTask, setTop3, top3Marks, listTasks } from '../core/taskService'
import {
  addBlock,
  changeBlock,
  getPlan,
  removeBlock,
  snap,
} from './planService'
import { countedMs, dayTimeline, hoursPerProject, rangeDays } from './reports'
import { MIN } from './timer'
import {
  keepWorking,
  runningEntry,
  startTimer,
  stopAt,
  stopTimer,
} from './timerService'

let db: LearningNotesDB
beforeEach(() => {
  db = createTestDb()
})
afterEach(() => db.delete())

const T0 = new Date(2026, 10, 7, 9, 0).getTime()

describe('timer service', () => {
  it('runs one entry at a time and survives a reload (it is only stored times)', async () => {
    const a = await startTimer(db, { mode: 'free', projectId: 'p1' }, T0)
    expect((await runningEntry(db))?.id).toBe(a.id)
    // A new run stops the old one at the same moment.
    const b = await startTimer(
      db,
      { mode: 'free', projectId: 'p2' },
      T0 + 30 * MIN,
    )
    const old = await db.timeEntries.get(a.id)
    expect(old?.endedAt).toBe(T0 + 30 * MIN)
    expect((await runningEntry(db))?.id).toBe(b.id)
    await stopTimer(db, T0 + 90 * MIN)
    expect(await runningEntry(db)).toBeUndefined()
    expect((await db.timeEntries.get(b.id))?.endedAt).toBe(T0 + 90 * MIN)
  })

  it('"Still working?": keep, or stop at a chosen time (never before the start)', async () => {
    const a = await startTimer(db, { mode: 'free' }, T0)
    await keepWorking(db, a.id, T0 + 120 * MIN)
    expect((await db.timeEntries.get(a.id))?.ackedAt).toBe(T0 + 120 * MIN)
    await stopAt(db, a.id, T0 - 10 * MIN, T0 + 200 * MIN)
    expect((await db.timeEntries.get(a.id))?.endedAt).toBe(T0)
  })

  it('stopping at a time later than now stops now', async () => {
    const a = await startTimer(db, { mode: 'free' }, T0)
    await stopAt(db, a.id, T0 + 999 * MIN, T0 + 60 * MIN)
    expect((await db.timeEntries.get(a.id))?.endedAt).toBe(T0 + 60 * MIN)
  })
})

describe('reports', () => {
  const entry = (
    over: Partial<TimeEntry> & { startedAt: number; day: string },
  ): TimeEntry => ({ ...newRecordFields(), mode: 'free', ...over })

  it('adds hours per project, longest first, for a day range', () => {
    const entries = [
      entry({
        startedAt: T0,
        endedAt: T0 + 60 * MIN,
        day: '2026-11-07',
        projectId: 'a',
      }),
      entry({
        startedAt: T0,
        endedAt: T0 + 30 * MIN,
        day: '2026-11-06',
        projectId: 'b',
      }),
      entry({
        startedAt: T0,
        endedAt: T0 + 90 * MIN,
        day: '2026-11-05',
        projectId: 'b',
      }),
      entry({ startedAt: T0, endedAt: T0 + 10 * MIN, day: '2026-11-07' }),
    ]
    const week = rangeDays('week', '2026-11-07')
    expect(week).toEqual({ from: '2026-11-02', to: '2026-11-07' })
    const result = hoursPerProject(entries, week.from, week.to, T0 + 999 * MIN)
    expect(result).toEqual([
      { projectId: 'b', ms: 120 * MIN },
      { projectId: 'a', ms: 60 * MIN },
      { projectId: null, ms: 10 * MIN },
    ])
    const today = rangeDays('today', '2026-11-07')
    expect(hoursPerProject(entries, today.from, today.to, T0)).toHaveLength(2)
  })

  it('counts a running entry up to now and a Focus run without its breaks', () => {
    const running = entry({ startedAt: T0, day: '2026-11-07' })
    expect(countedMs(running, T0 + 45 * MIN)).toBe(45 * MIN)
    const focus = entry({
      startedAt: T0,
      endedAt: T0 + 32 * MIN,
      day: '2026-11-07',
      mode: 'focus',
      cycle: [25, 5, 15, 4],
    })
    expect(countedMs(focus, T0)).toBe(27 * MIN)
  })

  it('puts planned blocks next to what was tracked, and finds the overlap', () => {
    const entries = [
      entry({ startedAt: T0, endedAt: T0 + 60 * MIN, day: '2026-11-07' }),
    ]
    const plan = [
      { id: 'x', startMin: 9 * 60 + 30, durationMin: 60, title: 'Essay' },
    ]
    const line = dayTimeline(plan, entries, '2026-11-07', T0 + 120 * MIN)
    expect(line.planned).toEqual([
      { startMin: 570, endMin: 630, label: 'Essay', projectId: null },
    ])
    expect(line.actual).toEqual([
      { startMin: 540, endMin: 600, projectId: null },
    ])
    expect(line.overlapMin).toBe(30)
  })

  it('aggregates 20,000 entries quickly', () => {
    const entries = Array.from({ length: 20_000 }, (_, i) =>
      entry({
        startedAt: T0 + i * MIN,
        endedAt: T0 + i * MIN + 20 * MIN,
        day: i % 7 === 0 ? '2026-11-07' : '2026-11-06',
        projectId: `p${i % 10}`,
      }),
    )
    const started = performance.now()
    const result = hoursPerProject(entries, '2026-11-02', '2026-11-07', T0)
    const line = dayTimeline([], entries, '2026-11-07', T0)
    expect(performance.now() - started).toBeLessThan(300)
    expect(result).toHaveLength(10)
    expect(line.actual.length).toBeGreaterThan(0)
  })
})

describe('day plan', () => {
  it('adds, changes and removes blocks; one plan per day', async () => {
    await addBlock(db, '2026-11-07', {
      startMin: 543,
      durationMin: 20,
      title: 'Read',
    })
    await addBlock(db, '2026-11-07', {
      startMin: 480,
      durationMin: 60,
      title: 'Gym',
    })
    let plan = await getPlan(db, '2026-11-07')
    expect(
      plan?.blocks.map((b) => [b.title, b.startMin, b.durationMin]),
    ).toEqual([
      ['Gym', 480, 60],
      ['Read', 540, 20], // snapped to 15 minutes
    ])
    expect(await db.dayPlans.count()).toBe(1)
    const read = plan!.blocks[1]
    await changeBlock(db, '2026-11-07', read.id, { durationMin: 45 })
    await removeBlock(db, '2026-11-07', plan!.blocks[0].id)
    plan = await getPlan(db, '2026-11-07')
    expect(plan?.blocks).toHaveLength(1)
    expect(plan?.blocks[0].durationMin).toBe(45)
    expect(snap(10_000)).toBeLessThan(24 * 60)
  })

  it('two devices planning the same day get the same record id', async () => {
    await addBlock(db, '2026-11-08', {
      startMin: 600,
      durationMin: 30,
      title: 'A',
    })
    const other = createTestDb()
    await addBlock(other, '2026-11-08', {
      startMin: 700,
      durationMin: 30,
      title: 'B',
    })
    expect((await getPlan(db, '2026-11-08'))?.id).toBe(
      (await getPlan(other, '2026-11-08'))?.id,
    )
    await other.delete()
  })
})

describe('Top 3', () => {
  it('allows three, never swaps for you, and marks the day at its end', async () => {
    const ids: string[] = []
    for (const title of ['a', 'b', 'c', 'd']) {
      ids.push((await addTask(db, { title })).id)
    }
    expect(await setTop3(db, ids[0], '2026-11-07', true)).toBe(true)
    expect(await setTop3(db, ids[1], '2026-11-07', true)).toBe(true)
    expect(await setTop3(db, ids[2], '2026-11-07', true)).toBe(true)
    expect(await setTop3(db, ids[3], '2026-11-07', true)).toBe(false)
    await setTop3(db, ids[2], '2026-11-07', false)
    expect(await setTop3(db, ids[3], '2026-11-07', true)).toBe(true)

    await db.tasks.update(ids[0], { status: 'done' })
    const tasks = await listTasks(db)
    expect(
      top3Marks(tasks, '2026-11-07', '2026-11-07')
        .map((m) => m.mark)
        .sort(),
    ).toEqual(['done', 'todo', 'todo'])
    expect(
      top3Marks(tasks, '2026-11-07', '2026-11-08')
        .map((m) => m.mark)
        .sort(),
    ).toEqual(['done', 'missed', 'missed'])
  })
})
