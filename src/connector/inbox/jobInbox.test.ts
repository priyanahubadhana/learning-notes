import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeInboxJobItem } from '../../aitools/connector/inboxJob'
import { DexieNotesPort } from '../../aitools/jobs/dexieNotesPort'
import { FakeClock, FakeFiller } from '../../aitools/jobs/fakes'
import { MemoryJobStore } from '../../aitools/jobs/jobStore'
import type { AiJob } from '../../aitools/jobs/jobTypes'
import { JobRunner } from '../../aitools/jobs/runner'
import { plan } from '../../aitools/jobs/testKit'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import type { ClaudeInboxItem } from '../../core/types'
import { acceptJobItem, rejectJobItem } from './jobInbox'

let db: LearningNotesDB

beforeEach(() => {
  db = createTestDb()
})
afterEach(async () => {
  db.close()
  await db.delete()
})

const NOW = 1_700_000_100_000
const content = (id: string) => {
  const p = plan(id) as {
    steps: { id: string; args: Record<string, unknown> }[]
  }
  p.steps[1].args.page = {
    title: 'Loops',
    blocks: [{ type: 'paragraph', text: 'Cue, craving, response.' }],
  }
  delete p.steps[1].args.brief
  p.steps[2].args.cards = [{ kind: 'qa', q: 'Q?', a: 'A.' }]
  delete p.steps[2].args.count
  return p
}

/** What the connector would have staged: a job in `preview`, from another runner. */
async function staged(id: string): Promise<AiJob> {
  const runner = new JobRunner({
    store: new MemoryJobStore(),
    port: new DexieNotesPort(db, () => NOW),
    filler: new FakeFiller(),
    clock: Object.assign(new FakeClock(), { time: NOW }),
    workspaceId: 'ws1',
    deviceId: 'mcp-pc',
    random: () => 0,
  })
  const made = await runner.create(content(id))
  if (!made.ok) throw new Error(JSON.stringify(made.errors))
  const job = await runner.run(id)
  expect(job.state).toBe('preview')
  return job
}

function app() {
  const store = new MemoryJobStore()
  const runner = new JobRunner({
    store,
    port: new DexieNotesPort(db, () => NOW + 5000),
    filler: new FakeFiller(),
    clock: Object.assign(new FakeClock(), { time: NOW + 1000 }),
    workspaceId: 'ws1',
    random: () => 0,
  })
  return { store, runner }
}

async function inbox(
  job: AiJob,
  request: 'apply' | 'undo' = 'apply',
): Promise<ClaudeInboxItem> {
  const item = makeInboxJobItem(job, request, ['asked'], 'Claude (PC)', NOW)
  await db.claudeInbox.add(item as unknown as ClaudeInboxItem)
  return item as unknown as ClaudeInboxItem
}

const liveNotebooks = async () =>
  (await db.notebooks.toArray()).filter((n) => n.deletedAt == null).length

describe('accepting a job item', () => {
  it('saves the whole job in one go and marks the item accepted', async () => {
    const job = await staged('ij1')
    const item = await inbox(job)
    const deps = app()
    expect(await acceptJobItem(db, item.id, deps, NOW + 9)).toBe('ok')
    expect(await liveNotebooks()).toBe(1)
    expect((await db.pages.toArray()).length).toBe(1)
    expect((await db.cards.toArray()).length).toBe(1)
    const after = await db.claudeInbox.get(item.id)
    expect(after).toMatchObject({ status: 'accepted', decidedAt: NOW + 9 })
    expect((await deps.store.get('ij1'))!.state).toBe('applied')
  })

  it('pressing Accept twice never saves twice', async () => {
    const job = await staged('ij2')
    const item = await inbox(job)
    const deps = app()
    await acceptJobItem(db, item.id, deps)
    const blocks = (await db.blocks.toArray()).length
    expect(await acceptJobItem(db, item.id, deps)).toBe('done')
    expect(await liveNotebooks()).toBe(1)
    expect((await db.blocks.toArray()).length).toBe(blocks)
  })

  it('Undo takes the whole job back, to Trash', async () => {
    const job = await staged('ij3')
    const item = await inbox(job)
    const deps = app()
    await acceptJobItem(db, item.id, deps)
    await deps.runner.undo('ij3')
    expect(await liveNotebooks()).toBe(0)
    expect((await db.notebooks.toArray()).length).toBe(1)
  })

  it('writes nothing when a record it would make already exists with another value', async () => {
    const job = await staged('ij4')
    // Something else made the notebook first and the job edits... use a style edit.
    const ws = { id: 'ws1' }
    void ws
    const item = await inbox(job)
    const deps = app()
    // A different record already holds the same id with another value: the save is refused.
    const nb = job.changeSet!.records.find((r) => r.table === 'notebooks')!
    await db.notebooks.add({ ...nb.value, title: 'Other' } as never)
    expect(await acceptJobItem(db, item.id, deps)).toBe('failed')
    expect((await db.pages.toArray()).length).toBe(0)
    expect((await db.claudeInbox.get(item.id))!.status).toBe('pending')
  })
})

describe('rejecting', () => {
  it('only closes the item', async () => {
    const job = await staged('ij5')
    const item = await inbox(job)
    await rejectJobItem(db, item.id, NOW + 1)
    expect(await db.claudeInbox.get(item.id)).toMatchObject({
      status: 'rejected',
    })
    expect(await liveNotebooks()).toBe(0)
    // Rejected items cannot be accepted afterwards.
    expect(await acceptJobItem(db, item.id, app())).toBe('done')
    expect(await liveNotebooks()).toBe(0)
  })
})

describe('an undo request', () => {
  it('accepting undoes a job that was already saved', async () => {
    const job = await staged('ij6')
    const deps = app()
    // The connector saved it: the records exist here as synced records.
    await deps.store.put(job)
    await deps.runner.apply('ij6')
    expect(await liveNotebooks()).toBe(1)
    const copy = (await deps.store.get('ij6'))!
    const item = await inbox(copy, 'undo')
    const fresh = app()
    expect(await acceptJobItem(db, item.id, fresh)).toBe('ok')
    expect(await liveNotebooks()).toBe(0)
    expect((await db.claudeInbox.get(item.id))!.status).toBe('accepted')
  })

  it('works on a device that never held the job', async () => {
    const job = await staged('ij7')
    const first = app()
    await first.store.put(job)
    await first.runner.apply('ij7')
    const applied = (await first.store.get('ij7'))!
    const item = await inbox(applied, 'undo')
    const other = app()
    expect(await other.store.get('ij7')).toBeUndefined()
    expect(await acceptJobItem(db, item.id, other)).toBe('ok')
    expect(await liveNotebooks()).toBe(0)
  })
})
