import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import {
  REMIND_AFTER_MS,
  SNOOZE_MS,
  noteFirstUse,
  recordBackupSaved,
  reminderDue,
  snoozeReminder,
} from './backupReminder'

let db: LearningNotesDB
const T = 1_700_000_000_000

beforeEach(async () => {
  db = createTestDb()
})
afterEach(async () => {
  await db.delete()
})

async function addContent() {
  const ws = await getOrCreateDefaultWorkspace(db)
  await createPage(db, (await createNotebook(db, ws.id, 'NB')).id, null)
}

describe('backup reminder', () => {
  it('is not due before a week, or on an empty app', async () => {
    await noteFirstUse(db, T)
    await addContent()
    expect(await reminderDue(db, T + REMIND_AFTER_MS - 1)).toBe(false)
    expect(await reminderDue(db, T + REMIND_AFTER_MS)).toBe(true)
  })

  it('has nothing to say on an empty app', async () => {
    await noteFirstUse(db, T)
    expect(await reminderDue(db, T + 30 * REMIND_AFTER_MS)).toBe(false)
  })

  it('"Remind me later" holds it for a day; saving a file restarts the week', async () => {
    await noteFirstUse(db, T)
    await addContent()
    const late = T + REMIND_AFTER_MS + 1000
    await snoozeReminder(db, late)
    expect(await reminderDue(db, late + SNOOZE_MS - 1)).toBe(false)
    expect(await reminderDue(db, late + SNOOZE_MS)).toBe(true)

    await recordBackupSaved(db, late + SNOOZE_MS)
    expect(await reminderDue(db, late + SNOOZE_MS + REMIND_AFTER_MS - 1)).toBe(
      false,
    )
    expect(await reminderDue(db, late + SNOOZE_MS + REMIND_AFTER_MS)).toBe(true)
  })

  it('does not reset the first day when called again', async () => {
    await noteFirstUse(db, T)
    await noteFirstUse(db, T + 5 * REMIND_AFTER_MS)
    await addContent()
    expect(await reminderDue(db, T + REMIND_AFTER_MS)).toBe(true)
  })
})
