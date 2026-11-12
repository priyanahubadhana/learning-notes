import { describe, expect, it } from 'vitest'
import { build, makeKit, onePlan, outputOf, plan } from './testKit'

describe('runner: happy path', () => {
  it('stages without writing, then applies in one go, then undo and redo', async () => {
    const kit = makeKit()
    const made = await kit.runner.create(plan('j1'))
    expect(made.ok && made.job.state).toBe('validated')
    const before = kit.port.liveSnapshot()
    const job = await kit.runner.run('j1')
    expect(job.state).toBe('preview')
    expect(job.steps.map((s) => s.state)).toEqual(['done', 'done', 'done'])
    expect(kit.port.liveSnapshot()).toBe(before)
    expect(job.changeSet?.counts.notebooks).toBe(1)

    const applied = await kit.runner.apply('j1')
    expect(applied.outcome).toBe('applied')
    expect(kit.port.count('notebooks')).toBe(1)
    expect(kit.port.count('pages')).toBe(1)
    expect(kit.port.count('cards')).toBe(2)
    expect(kit.port.commits).toBe(1)
    const full = kit.port.liveSnapshot(true)

    await kit.runner.undo('j1')
    expect(kit.port.liveSnapshot()).toBe(before)
    expect(kit.port.count('notebooks', true)).toBe(1) // in Trash, never deleted
    await kit.runner.redo('j1')
    expect(kit.port.liveSnapshot(true)).toBe(full)
  })

  it('refuses an invalid plan and creates no job', async () => {
    const kit = makeKit()
    const made = await kit.runner.create({ ...plan('bad'), steps: [] })
    expect(made.ok).toBe(false)
    expect(await kit.store.list()).toEqual([])
  })

  it('edits an existing notebook and undo puts the old values back', async () => {
    const kit = makeKit()
    const first = await build(kit, plan('a'))
    const nb = outputOf(first, 's1', 'notebookId')
    const start = kit.port.liveSnapshot()
    const style = onePlan('styles.apply', {
      notebookId: nb,
      style: { colour: '#2e9e6b', inkBg: 'grid' },
    })
    const second = await build(kit, { ...style, id: 'b' })
    expect(second.state).toBe('applied')
    expect(kit.port.liveSnapshot()).not.toBe(start)
    await kit.runner.undo('b')
    expect(kit.port.liveSnapshot()).toBe(start)
  })
})
