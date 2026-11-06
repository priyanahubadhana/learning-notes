import type { LearningNotesDB } from '../core/db'
import { addDays, dayKeyOf } from '../core/homeDays'
import type { Habit, HabitCheck } from '../core/homeTypes'
import { stableId } from '../core/ids'
import { byOrder, orderAtIndex } from '../core/order'
import { isLive, newRecordFields } from '../core/records'
import { dayStartHour } from '../settings/builtinSettings'
import { getSetting } from '../settings/settingsService'

/**
 * Habits and routines (F3). A habit belongs to a routine (Morning, Night or
 * Daily). One check per habit per day; two devices ticking the same habit on
 * the same day make the same record (fixed id), so sync merges them.
 */

// Habits stay whole: a person has a few dozen at most, never thousands.
export async function listHabits(db: LearningNotesDB): Promise<Habit[]> {
  return (await db.habits.toArray()).filter(isLive).sort(byOrder)
}

export async function addHabit(
  db: LearningNotesDB,
  input: {
    name: string
    routine: Habit['routine']
    affirmationPageId?: string
    fileId?: string
  },
): Promise<Habit> {
  const name = input.name.trim().slice(0, 200)
  if (!name) throw new Error('A habit needs a name')
  const all = await listHabits(db)
  const habit: Habit = {
    ...newRecordFields(),
    name,
    routine: input.routine,
    order: orderAtIndex(
      all.map((h) => h.order),
      all.length,
    ),
    ...(input.affirmationPageId
      ? { affirmationPageId: input.affirmationPageId }
      : {}),
    ...(input.fileId ? { fileId: input.fileId } : {}),
  }
  await db.habits.add(habit)
  return habit
}

export async function renameHabit(
  db: LearningNotesDB,
  id: string,
  name: string,
): Promise<void> {
  const clean = name.trim().slice(0, 200)
  if (clean) await db.habits.update(id, { name: clean, updatedAt: Date.now() })
}

/** Soft delete; its checks stay (history is kept). */
export async function deleteHabit(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const now = Date.now()
  await db.habits.update(id, { deletedAt: now, updatedAt: now })
}

export async function restoreHabit(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.habits.update(id, { deletedAt: null, updatedAt: Date.now() })
}

const checkId = (habitId: string, day: string) =>
  stableId(`habitCheck:${habitId}:${day}`)

/** Ticks or unticks a habit for a day. */
export async function setCheck(
  db: LearningNotesDB,
  habitId: string,
  day: string,
  done: boolean,
): Promise<void> {
  const id = checkId(habitId, day)
  const now = Date.now()
  await db.transaction('rw', db.habitChecks, async () => {
    const old = await db.habitChecks.get(id)
    if (old) {
      await db.habitChecks.update(id, { done, deletedAt: null, updatedAt: now })
    } else {
      await db.habitChecks.add({
        ...newRecordFields(),
        id,
        habitId,
        day,
        done,
      })
    }
  })
}

/** Checks for the days from `fromDay` to `toDay`. */
export async function listChecks(
  db: LearningNotesDB,
  fromDay: string,
  toDay: string,
): Promise<HabitCheck[]> {
  return (
    await db.habitChecks
      .where('day')
      .between(fromDay, toDay, true, true)
      .toArray()
  ).filter(isLive)
}

export type DayState = 'done' | 'missed' | 'open' | 'before'

/**
 * How one habit stands on one day. A day before the habit existed is
 * `before`; today without a tick is `open` (the day is not over); an earlier
 * day without a tick is `missed` (the red cross). The day-start hour decides
 * what "today" and "the habit's first day" are.
 */
export function dayState(
  habit: Pick<Habit, 'createdAt'>,
  checks: readonly HabitCheck[],
  day: string,
  today: string,
  dayStart: number,
): DayState {
  if (day < dayKeyOf(habit.createdAt, dayStart)) return 'before'
  const checked = checks.some((c) => c.day === day && c.done)
  if (checked) return 'done'
  return day < today ? 'missed' : 'open'
}

/** The last `count` days ending today, oldest first, with each state. */
export function strip(
  habit: Habit,
  checks: readonly HabitCheck[],
  today: string,
  dayStart: number,
  count = 7,
): { day: string; state: DayState }[] {
  const own = checks.filter((c) => c.habitId === habit.id)
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(today, i - count + 1)
    return { day, state: dayState(habit, own, day, today, dayStart) }
  })
}

/** Habits left undone for `day` (today: the ones not ticked yet). */
export function habitsLeft(
  habits: readonly Habit[],
  checks: readonly HabitCheck[],
  day: string,
  dayStart: number,
): Habit[] {
  return habits.filter(
    (h) =>
      dayState(
        h,
        checks.filter((c) => c.habitId === h.id),
        day,
        day,
        dayStart,
      ) === 'open',
  )
}

/** Habits missed on an earlier `day` (for the red cross on Home). */
export function habitsMissed(
  habits: readonly Habit[],
  checks: readonly HabitCheck[],
  day: string,
  today: string,
  dayStart: number,
): Habit[] {
  return habits.filter(
    (h) =>
      dayState(
        h,
        checks.filter((c) => c.habitId === h.id),
        day,
        today,
        dayStart,
      ) === 'missed',
  )
}

export const readDayStart = (db: LearningNotesDB): Promise<number> =>
  getSetting(db, dayStartHour)
