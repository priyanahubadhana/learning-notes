import { afterEach, describe, expect, it } from 'vitest'
import { createTestDb } from '../../core/testing'
import { DexieJobStore } from './dexieJobStore'
import { MemoryJobStore, type JobStore } from './jobStore'
import type { AiJob } from './jobTypes'

const job = (
  id: string,
  createdAt: number,
  over: Partial<AiJob> = {},
): AiJob => ({
  id,
  plan: {
    version: 1,
    id,
    goal: 'g',
    origin: 'test',
    destination: { kind: 'new' },
    steps: [],
  },
  state: 'draft',
  steps: [],
  changeSet: null,
  undo: null,
  notice: null,
  deviceId: 'd',
  workspaceId: 'w',
  timings: { createdAt, updatedAt: createdAt + 1 },
  ...over,
})

const dbs: ReturnType<typeof createTestDb>[] = []
const makers: Record<string, () => JobStore> = {
  memory: () => new MemoryJobStore(),
  dexie: () => {
    const db = createTestDb()
    dbs.push(db)
    return new DexieJobStore(db)
  },
}
afterEach(async () => {
  for (const d of dbs.splice(0)) await d.delete()
})

// The same cases run against every store, so they cannot drift apart.
describe.each(Object.keys(makers))('job store contract: %s', (kind) => {
  const make = makers[kind]

  it('starts empty and answers undefined for an unknown id', async () => {
    const s = make()
    expect(await s.list()).toEqual([])
    expect(await s.get('nope')).toBeUndefined()
  })

  it('returns exactly what was put, with no extra fields', async () => {
    const s = make()
    const j = job('a', 10, { notice: 'hello', state: 'preview' })
    await s.put(j)
    expect(await s.get('a')).toEqual(j)
    expect(Object.keys((await s.get('a'))!)).not.toContain('updatedAt')
  })

  it('put replaces a job with the same id (a checkpoint)', async () => {
    const s = make()
    await s.put(job('a', 10))
    await s.put(job('a', 10, { state: 'running' }))
    expect(await s.list()).toHaveLength(1)
    expect((await s.get('a'))?.state).toBe('running')
  })

  it('keeps copies in both directions', async () => {
    const s = make()
    const j = job('a', 10)
    await s.put(j)
    j.notice = 'changed after put'
    expect((await s.get('a'))?.notice).toBeNull()
    const got = (await s.get('a'))!
    got.notice = 'changed after get'
    expect((await s.get('a'))?.notice).toBeNull()
  })

  it('lists oldest first by createdAt', async () => {
    const s = make()
    await s.put(job('c', 30))
    await s.put(job('a', 10))
    await s.put(job('b', 20))
    expect((await s.list()).map((j) => j.id)).toEqual(['a', 'b', 'c'])
  })

  it('delete removes one job and ignores an unknown id', async () => {
    const s = make()
    await s.put(job('a', 10))
    await s.put(job('b', 20))
    await s.delete('a')
    await s.delete('zzz')
    expect((await s.list()).map((j) => j.id)).toEqual(['b'])
  })
})

describe('dexie job store', () => {
  it('survives a reload: a new store on the same database sees the jobs', async () => {
    const db = createTestDb()
    dbs.push(db)
    await new DexieJobStore(db).put(job('a', 10, { state: 'running' }))
    expect((await new DexieJobStore(db).get('a'))?.state).toBe('running')
  })

  it('indexes by state and updatedAt', async () => {
    const db = createTestDb()
    dbs.push(db)
    const s = new DexieJobStore(db)
    await s.put(job('a', 10, { state: 'running' }))
    await s.put(job('b', 20, { state: 'applied' }))
    expect(await db.aiJobs.where('state').equals('running').count()).toBe(1)
    expect((await db.aiJobs.get('b'))?.updatedAt).toBe(21)
  })
})
