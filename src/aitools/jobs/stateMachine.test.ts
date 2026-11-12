import { describe, expect, it } from 'vitest'
import {
  JOB_STATES,
  STEP_STATES,
  STEP_TRANSITIONS,
  TRANSITIONS,
  TransitionError,
  assertStepTransition,
  assertTransition,
} from './jobTypes'
import { MemoryJobStore } from './jobStore'
import { makeKit, plan } from './testKit'

describe('state machine (AF-12)', () => {
  const pairs = JOB_STATES.flatMap((a) =>
    JOB_STATES.map((b) => [a, b] as const),
  )

  it.each(pairs)('%s -> %s', (from, to) => {
    if (TRANSITIONS[from].includes(to))
      expect(() => assertTransition(from, to)).not.toThrow()
    else expect(() => assertTransition(from, to)).toThrow(TransitionError)
  })

  it('failed and cancelled are final', () => {
    expect(TRANSITIONS.failed).toEqual([])
    expect(TRANSITIONS.cancelled).toEqual([])
  })

  it('step moves follow the table', () => {
    for (const a of STEP_STATES)
      for (const b of STEP_STATES) {
        if (STEP_TRANSITIONS[a].includes(b)) assertStepTransition(a, b)
        else expect(() => assertStepTransition(a, b)).toThrow(TransitionError)
      }
  })

  it('the runner walks the main road: draft -> validated -> running -> preview -> applying -> applied -> undone -> applied', async () => {
    const kit = makeKit()
    const seen: string[] = []
    const watch = async () => seen.push((await kit.store.get('sm'))!.state)
    await kit.runner.create(plan('sm'))
    await watch()
    await kit.runner.run('sm')
    await watch()
    await kit.runner.apply('sm')
    await watch()
    await kit.runner.undo('sm')
    await watch()
    await kit.runner.redo('sm')
    await watch()
    expect(seen).toEqual([
      'validated',
      'preview',
      'applied',
      'undone',
      'applied',
    ])
  })

  it('a job in a final state cannot be started again', async () => {
    const kit = makeKit()
    await kit.runner.create(plan('fin'))
    await kit.runner.run('fin')
    await kit.runner.stop('fin')
    const job = await kit.runner.run('fin')
    expect(job.state).toBe('cancelled')
    await expect(kit.runner.apply('fin')).rejects.toThrow()
  })
})

describe('memory job store', () => {
  it('keeps copies, so a later change is not stored by accident', async () => {
    const kit = makeKit()
    await kit.runner.create(plan('cp'))
    const a = (await kit.store.get('cp'))!
    a.notice = 'changed'
    expect((await kit.store.get('cp'))?.notice).toBeNull()
    await expect(new MemoryJobStore().list()).resolves.toEqual([])
  })
})
