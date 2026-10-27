import type { LearningNotesDB } from '../core/db'

/**
 * The gentle "save a backup file" reminder. The browser keeps notes on this
 * device only, so a file saved elsewhere is the real safety copy. Kept in
 * the `meta` table: when the app was first used, when a whole-workspace
 * file was last saved, and until when "Remind me later" holds the reminder.
 */
const META_ID = 'backupReminder'
export const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000
export const SNOOZE_MS = 24 * 60 * 60 * 1000

interface ReminderState {
  firstSeenAt: number
  lastSavedAt?: number
  snoozedUntil?: number
}

async function read(db: LearningNotesDB): Promise<ReminderState | undefined> {
  return (await db.meta.get(META_ID))?.value as ReminderState | undefined
}

async function write(db: LearningNotesDB, state: ReminderState) {
  await db.meta.put({ id: META_ID, value: { ...state } })
}

/** Remembers the first day the app was used (once). */
export async function noteFirstUse(
  db: LearningNotesDB,
  now: number = Date.now(),
): Promise<void> {
  if (!(await read(db))) await write(db, { firstSeenAt: now })
}

/** A whole-workspace file was saved: the week starts again. */
export async function recordBackupSaved(
  db: LearningNotesDB,
  now: number = Date.now(),
): Promise<void> {
  const state = (await read(db)) ?? { firstSeenAt: now }
  await write(db, { ...state, lastSavedAt: now, snoozedUntil: undefined })
}

/** "Remind me later": ask again tomorrow. */
export async function snoozeReminder(
  db: LearningNotesDB,
  now: number = Date.now(),
): Promise<void> {
  const state = (await read(db)) ?? { firstSeenAt: now }
  await write(db, { ...state, snoozedUntil: now + SNOOZE_MS })
}

/** True if no file was saved for 7 days (and the user did not say later). */
export async function reminderDue(
  db: LearningNotesDB,
  now: number = Date.now(),
): Promise<boolean> {
  const state = await read(db)
  if (!state) return false
  if (state.snoozedUntil !== undefined && now < state.snoozedUntil) return false
  const since = Math.max(state.firstSeenAt, state.lastSavedAt ?? 0)
  if (now - since < REMIND_AFTER_MS) return false
  // Nothing to protect yet on an empty app.
  return (await db.pages.limit(1).count()) > 0
}
