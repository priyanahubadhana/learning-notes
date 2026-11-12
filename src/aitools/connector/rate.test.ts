import { describe, expect, it } from 'vitest'
import { inboxJobId, makeInboxJobItem } from './inboxJob'
import {
  RateLimiter,
  RateLimitError,
  WRITES_PER_DAY,
  WRITES_PER_MINUTE,
  writeCost,
} from './rate'
import { makeKit, plan, build } from '../jobs/testKit'

describe('writeCost', () => {
  it('is one plus one per enabled step', () => {
    expect(writeCost({ steps: [] })).toBe(1)
    const steps = [{}, {}, { enabled: false }, { enabled: true }] as never
    expect(writeCost({ steps })).toBe(4)
    expect(writeCost({} as never)).toBe(1)
  })
})

describe('RateLimiter', () => {
  const make = () => {
    const c = { t: 1_000_000 }
    return { c, rl: new RateLimiter(() => c.t) }
  }

  it('refuses a plan whole and counts nothing when it does not fit', () => {
    const { rl } = make()
    rl.write(15)
    expect(() => rl.write(6)).toThrow(RateLimitError)
    // The refused plan used nothing: five more still fit.
    rl.write(5)
    expect(() => rl.write(1)).toThrow(/Try again in \d+ seconds/)
  })

  it('frees the minute window after a minute', () => {
    const { c, rl } = make()
    rl.write(WRITES_PER_MINUTE)
    expect(() => rl.write(1)).toThrow(RateLimitError)
    c.t += 60_001
    rl.write(1)
  })

  it('says a plan that can never fit must be split', () => {
    const { rl } = make()
    expect(() => rl.write(WRITES_PER_MINUTE + 1)).toThrow(/Split it/)
  })

  it('stops at 500 writes a day', () => {
    const { c, rl } = make()
    for (let i = 0; i < WRITES_PER_DAY / WRITES_PER_MINUTE; i++) {
      rl.write(WRITES_PER_MINUTE)
      c.t += 61_000
    }
    expect(() => rl.write(1)).toThrow(RateLimitError)
    c.t += 86_400_000
    rl.write(1)
  })

  it('limits reads to 60 a minute', () => {
    const { c, rl } = make()
    for (let i = 0; i < 60; i++) rl.read()
    expect(() => rl.read()).toThrow(RateLimitError)
    c.t += 60_001
    rl.read()
  })
})

describe('Inbox job item', () => {
  it('has a stable id per job and request, and keeps older fields empty', async () => {
    const kit = makeKit()
    const job = await build(kit, plan('inb'))
    expect(inboxJobId(job.id, 'apply')).toBe(inboxJobId(job.id, 'apply'))
    expect(inboxJobId(job.id, 'apply')).not.toBe(inboxJobId(job.id, 'undo'))
    const item = makeInboxJobItem(job, 'apply', ['asked'], 'Claude (PC)', 5)
    expect(item).toMatchObject({
      status: 'pending',
      pageId: '',
      ops: [],
      reasons: [],
      job: { request: 'apply', reasons: ['asked'], from: 'Claude (PC)' },
    })
    // A copy: changing the item never changes the job.
    item.job.job.notice = 'x'
    expect(job.notice).not.toBe('x')
  })
})
