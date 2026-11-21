import type { Task } from '../../core/homeTypes'

export const PENDING_SHOWN = 5

export interface PendingItems {
  /** Overdue first (oldest day first), then the other open tasks in order. */
  shown: Task[]
  /** All pending tasks, also the ones not shown. */
  total: number
  /** How many of them are overdue. */
  overdue: number
}

const isOverdue = (task: Task, today: string): boolean =>
  !!task.plannedDay && task.plannedDay < today

/**
 * The Pending items card: tasks that are still open and not finished or
 * dropped. Overdue ones (planned before `today`) come first.
 */
export function pendingItems(
  tasks: readonly Task[],
  today: string,
  limit = PENDING_SHOWN,
): PendingItems {
  const open = tasks.filter((x) => x.status === 'open')
  const late = open
    .filter((x) => isOverdue(x, today))
    .sort(
      (a, b) =>
        (a.plannedDay ?? '').localeCompare(b.plannedDay ?? '') ||
        (a.order < b.order ? -1 : a.order > b.order ? 1 : 0),
    )
  const rest = open
    .filter((x) => !isOverdue(x, today))
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
  const all = [...late, ...rest]
  return { shown: all.slice(0, limit), total: all.length, overdue: late.length }
}
