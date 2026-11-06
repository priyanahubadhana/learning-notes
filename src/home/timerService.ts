import type { LearningNotesDB } from '../core/db'
import type { TimeEntry } from '../core/homeTypes'
import { isLive, newRecordFields } from '../core/records'
import { todayKey } from '../core/taskService'
import { toCycleList, type Cycle } from './timer'

/**
 * Starting and stopping the timer (F2). There is only ever one running entry
 * (one without `endedAt`). Starting while one runs stops it first, at the
 * same moment, so no time is lost or counted twice.
 */

/** The running entry, newest first, or undefined. */
export async function runningEntry(
  db: LearningNotesDB,
): Promise<TimeEntry | undefined> {
  return db.timeEntries
    .orderBy('startedAt')
    .reverse()
    .filter((e) => isLive(e) && e.endedAt === undefined)
    .first()
}

/** Stops every running entry at `at` (normally one). */
export async function stopTimer(
  db: LearningNotesDB,
  at: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.timeEntries, async () => {
    const open = await db.timeEntries
      .filter((e) => isLive(e) && e.endedAt === undefined)
      .toArray()
    for (const entry of open) {
      await db.timeEntries.update(entry.id, {
        endedAt: Math.max(entry.startedAt, at),
        updatedAt: at,
      })
    }
  })
}

export async function startTimer(
  db: LearningNotesDB,
  input: { projectId?: string; mode: 'free' | 'focus'; cycle?: Cycle },
  now: number = Date.now(),
): Promise<TimeEntry> {
  const day = await todayKey(db, now)
  return db.transaction('rw', db.timeEntries, db.settings, async () => {
    await stopTimer(db, now)
    const entry: TimeEntry = {
      ...newRecordFields(),
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      day,
      mode: input.mode,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.mode === 'focus' && input.cycle
        ? { cycle: toCycleList(input.cycle) }
        : {}),
    }
    await db.timeEntries.add(entry)
    return entry
  })
}

/** "Still working?" answered Keep: ask again after another stretch. */
export async function keepWorking(
  db: LearningNotesDB,
  id: string,
  now: number = Date.now(),
): Promise<void> {
  await db.timeEntries.update(id, { ackedAt: now, updatedAt: now })
}

/** "Still working?" answered Stop at a chosen time (never before the start). */
export async function stopAt(
  db: LearningNotesDB,
  id: string,
  at: number,
  now: number = Date.now(),
): Promise<void> {
  const entry = await db.timeEntries.get(id)
  if (!entry || entry.endedAt !== undefined) return
  const end = Math.min(now, Math.max(entry.startedAt, at))
  await db.timeEntries.update(id, { endedAt: end, updatedAt: now })
}

/** Moves a running or finished entry to another project. */
export async function setEntryProject(
  db: LearningNotesDB,
  id: string,
  projectId: string | undefined,
): Promise<void> {
  await db.timeEntries.update(id, { projectId, updatedAt: Date.now() })
}
