import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import { FakeClock, FakeFiller } from './fakes'
import { MemoryJobStore } from './jobStore'
import { DexieNotesPort } from './dexieNotesPort'
import { JobRunner } from './runner'
import { CONTENT, plan } from './testKit'

let db: LearningNotesDB
let runner: JobRunner

beforeEach(() => {
  db = createTestDb()
  runner = new JobRunner({
    store: new MemoryJobStore(),
    port: new DexieNotesPort(db, () => 1_700_000_050_000),
    filler: new FakeFiller(CONTENT),
    clock: new FakeClock(),
    workspaceId: 'ws1',
    random: () => 0,
  })
})

afterEach(async () => {
  db.close()
  await db.delete()
})

const live = async () => ({
  notebooks: (await db.notebooks.toArray()).filter((r) => r.deletedAt == null)
    .length,
  pages: (await db.pages.toArray()).filter((r) => r.deletedAt == null).length,
  cards: (await db.cards.toArray()).filter((r) => r.deletedAt == null).length,
})

describe('DexieNotesPort (fake-indexeddb)', () => {
  it('writes a whole job, undo sends it to Trash, redo brings it back', async () => {
    await runner.create(plan('dx'))
    await runner.run('dx')
    expect(await live()).toEqual({ notebooks: 0, pages: 0, cards: 0 })
    expect((await runner.apply('dx')).outcome).toBe('applied')
    expect(await live()).toEqual({ notebooks: 1, pages: 1, cards: 2 })

    await runner.undo('dx')
    expect(await live()).toEqual({ notebooks: 0, pages: 0, cards: 0 })
    expect(await db.notebooks.count()).toBe(1) // still there, in Trash
    expect(await db.cards.count()).toBe(2)

    await runner.redo('dx')
    expect(await live()).toEqual({ notebooks: 1, pages: 1, cards: 2 })
    expect((await runner.apply('dx')).outcome).toBe('already_applied')
  })

  it('a failure in the middle of the commit rolls everything back', async () => {
    await runner.create(plan('dy'))
    await runner.run('dy')
    // The last record written (a card) is refused by the database.
    db.cards.hook('creating', () => {
      throw new Error('disk full')
    })
    const res = await runner.apply('dy')
    expect(res.outcome).toBe('failed')
    expect(await db.notebooks.count()).toBe(0)
    expect(await db.pages.count()).toBe(0)
    expect(await db.blocks.count()).toBe(0)
    expect(await db.cards.count()).toBe(0)
  })

  it('refuses a table a job may not use', async () => {
    const port = new DexieNotesPort(db)
    await expect(port.read('settings', 'x')).rejects.toThrow(/may not use/)
  })
})
