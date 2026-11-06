import { addDays } from '../core/homeDays'
import type { Habit, HabitCheck, Task } from '../core/homeTypes'
import { top3Marks } from '../core/taskService'
import { habitsLeft, habitsMissed } from './habitService'

/**
 * The Briefing at the top of Home (F3): what today holds, at a glance, with
 * nothing to read. Made by the app from your own data. `Briefing` is the
 * one shape; a later AI step can fill the same fields or add a `summary`
 * without any screen changing.
 */
export interface Briefing {
  day: string
  top3: { task: Task; mark: 'done' | 'todo' | 'missed' }[]
  dueToday: Task[]
  cardsDue: number
  habitsLeft: Habit[]
  /** Yesterday's tasks that were carried to another day. */
  carriedFromYesterday: Task[]
  /** Habits missed yesterday (red cross). */
  missedHabits: Habit[]
  /** Reserved for a later AI-written line (Phase P). */
  summary?: string
}

export function buildBriefing(input: {
  today: string
  tasks: readonly Task[]
  habits: readonly Habit[]
  checks: readonly HabitCheck[]
  cardsDue: number
  dayStart: number
}): Briefing {
  const { today, tasks, habits, checks, cardsDue, dayStart } = input
  const yesterday = addDays(today, -1)
  return {
    day: today,
    top3: top3Marks(tasks, today, today),
    dueToday: tasks.filter(
      (t) =>
        t.status === 'open' && t.plannedDay === today && t.top3Day !== today,
    ),
    cardsDue,
    habitsLeft: habitsLeft(habits, checks, today, dayStart),
    carriedFromYesterday: tasks.filter(
      (t) => t.status === 'open' && t.carried.some((c) => c.from === yesterday),
    ),
    missedHabits: habitsMissed(habits, checks, yesterday, today, dayStart),
  }
}
