import { describe, expect, it } from 'vitest'
import type { Task } from '../../core/homeTypes'
import { pendingItems } from './pendingItems'

const task = (id: string, o: Partial<Task> = {}): Task =>
  ({
    id,
    title: id,
    status: 'open',
    quadrant: 0,
    order: id,
    carried: [],
    ...o,
  }) as unknown as Task

describe('pendingItems', () => {
  const today = '2026-11-12'
  it('puts overdue first, oldest day first, then other open tasks', () => {
    const r = pendingItems(
      [
        task('b'),
        task('late2', { plannedDay: '2026-11-10' }),
        task('late1', { plannedDay: '2026-11-01' }),
        task('later', { plannedDay: '2026-11-20' }),
        task('a', { plannedDay: today }),
      ],
      today,
    )
    expect(r.shown.map((x) => x.id)).toEqual([
      'late1',
      'late2',
      'a',
      'b',
      'later',
    ])
    expect(r.overdue).toBe(2)
    expect(r.total).toBe(5)
  })
  it('skips done and dropped tasks', () => {
    const r = pendingItems(
      [
        task('d', { status: 'done' }),
        task('x', { status: 'dropped' }),
        task('o'),
      ],
      today,
    )
    expect(r.shown.map((x) => x.id)).toEqual(['o'])
  })
  it('shows at most the limit but counts all', () => {
    const many = Array.from({ length: 8 }, (_, i) => task(`t${i}`))
    const r = pendingItems(many, today, 5)
    expect(r.shown).toHaveLength(5)
    expect(r.total).toBe(8)
  })
  it('is empty with nothing open', () => {
    expect(pendingItems([], today)).toEqual({ shown: [], total: 0, overdue: 0 })
  })
})
