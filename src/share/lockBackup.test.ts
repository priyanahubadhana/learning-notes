import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { getLockConfig, saveLockConfig } from '../core/lock/lockConfig'
import { hashSecret, verifySecret } from '../core/lock/lockCrypto'
import { setLocked } from '../core/lock/lockService'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { setReadFirst } from '../app/reading/readFirst'
import { createPage } from '../pages/pageService'
import { BundleError } from './bundle'
import { checkedRow } from './checkRows'
import { writeFullFile } from './fullFile'
import { readFullFile } from './readFull'
import { replaceWithFile } from './restore'

/** Batch 3: the lock settings (hash only) and the marks travel with a backup. */

let db: LearningNotesDB
let target: LearningNotesDB
const opened: LearningNotesDB[] = []

async function fresh(): Promise<LearningNotesDB> {
  const d = createTestDb()
  await d.open()
  opened.push(d)
  return d
}

beforeEach(async () => {
  db = await fresh()
  target = await fresh()
})

afterEach(async () => {
  for (const d of opened.splice(0)) await d.delete()
})

describe('lock settings in a backup', () => {
  it('the hashes and the locked and read-first marks survive a restore', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb = await createNotebook(db, ws, 'Diary')
    const page = await createPage(db, nb.id, null)
    const hash = await hashSecret('4821', 1_000)
    await saveLockConfig(db, { pin: hash })
    await setLocked(db, 'page', page.id, true)
    await setLocked(db, 'notebook', nb.id, true)
    await setReadFirst(db, 'page', page.id, true)

    const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
    await replaceWithFile(target, parsed)

    expect((await target.pages.get(page.id))?.locked).toBe(true)
    expect((await target.pages.get(page.id))?.readFirst).toBe(true)
    expect((await target.notebooks.get(nb.id))?.locked).toBe(true)
    const config = await getLockConfig(target)
    expect(await verifySecret('4821', config.pin!)).toBe(true)
    expect(await verifySecret('0000', config.pin!)).toBe(false)
    // The file holds the salted hash, never the code.
    const row = await target.settings.get('lock.config')
    expect(JSON.stringify(row)).not.toContain('4821')
  })

  it('an older backup without the marks still restores', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb = await createNotebook(db, ws, 'Diary')
    const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
    await replaceWithFile(target, parsed)
    expect((await target.notebooks.get(nb.id))?.locked).toBeUndefined()
  })

  it('a wrong kind of mark in a file is refused', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb = await createNotebook(db, ws, 'Diary')
    await db.notebooks.update(nb.id, { locked: 'yes' as never })
    await expect(
      readFullFile(await writeFullFile(db, 'full'), target),
    ).rejects.toBeInstanceOf(BundleError)
  })

  it('rows are checked field by field: locked and readFirst must be true', () => {
    const base = {
      id: 'n',
      createdAt: 1,
      updatedAt: 2,
      deletedAt: null,
      workspaceId: 'w',
      title: 'T',
      order: 'a0',
    }
    expect(checkedRow('notebooks', { ...base, locked: true })).toMatchObject({
      locked: true,
    })
    expect(checkedRow('notebooks', { ...base, locked: false })).toBeNull()
    expect(checkedRow('notebooks', { ...base, readFirst: 1 })).toBeNull()
  })
})
