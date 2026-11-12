import { afterEach, describe, expect, it } from 'vitest'
import { validPlan } from '../aitools/planFixtures'
import { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getEngine } from './engine'

const opened: LearningNotesDB[] = []
afterEach(async () => {
  for (const d of opened.splice(0)) await d.delete()
})

async function until<T>(read: () => Promise<T | undefined>): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const v = await read()
    if (v !== undefined) return v
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('timed out')
}

describe('Build engine across a reload', () => {
  it('keeps a job in the table after the app closes and opens again', async () => {
    const first = createTestDb()
    opened.push(first)
    const e1 = await getEngine(first)
    const made = await e1.runner.create(validPlan())
    expect(made.ok).toBe(true)
    const id = made.ok ? made.job.id : ''
    first.close()

    const second = new LearningNotesDB(first.name)
    opened.push(second)
    const e2 = await getEngine(second)
    expect((await e2.store.get(id))?.state).toBe('validated')
    expect(await second.aiJobs.count()).toBe(1)
  })

  it('a job left "applying" by a crash is settled once, never applied twice', async () => {
    const first = createTestDb()
    opened.push(first)
    const e1 = await getEngine(first)
    const made = await e1.runner.create(validPlan())
    const job = made.ok ? made.job : null
    expect(job).toBeTruthy()
    // The app died while saving: state applying, nothing written yet.
    await e1.store.put({ ...job!, state: 'applying' })
    first.close()

    const second = new LearningNotesDB(first.name)
    opened.push(second)
    const e2 = await getEngine(second) // starts recovery in the background
    const settled = await until(async () => {
      const j = await e2.store.get(job!.id)
      return j?.state === 'applying' ? undefined : j
    })
    expect(settled.state).toBe('preview')
    expect(settled.notice).toMatch(/Nothing was written/)
    expect(settled.undo).toBeNull()
    expect(await second.pages.count()).toBe(0)
  })
})
