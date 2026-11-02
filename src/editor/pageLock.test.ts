import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { holdPageLock, type LockManagerLike, type LockState } from './pageLock'

/** A small stand-in for `navigator.locks`, for one lock name. */
function fakeLocks(): LockManagerLike {
  let holder: { reject: (reason: unknown) => void } | null = null
  return {
    request(_name, options, callback) {
      return new Promise((resolve, reject) => {
        if (holder && options.ifAvailable) {
          void Promise.resolve(callback(null)).then(resolve)
          return
        }
        if (holder && options.steal) holder.reject(new Error('stolen'))
        const me = { reject }
        holder = me
        void Promise.resolve(callback({})).then(() => {
          if (holder === me) holder = null
          resolve(undefined)
        })
      })
    },
  }
}

const open = (locks: LockManagerLike) => {
  const states: LockState[] = []
  const lock = holdPageLock('p', (state) => states.push(state), locks)
  return { lock, states }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('one editor per page', () => {
  it('the first window edits; the second is told after a short wait', async () => {
    const locks = fakeLocks()
    const a = open(locks)
    await vi.advanceTimersByTimeAsync(0)
    expect(a.states).toEqual(['mine'])
    const b = open(locks)
    await vi.advanceTimersByTimeAsync(1000)
    expect(b.states).toEqual(['elsewhere'])
  })

  it('a page reopened right away gets its lock back', async () => {
    const locks = fakeLocks()
    const first = open(locks)
    await vi.advanceTimersByTimeAsync(0)
    const second = open(locks) // asks before the first has let go
    first.lock.release()
    await vi.advanceTimersByTimeAsync(1000)
    expect(second.states).toEqual(['mine'])
  })

  it('Edit here moves the page to the other window', async () => {
    const locks = fakeLocks()
    const a = open(locks)
    await vi.advanceTimersByTimeAsync(0)
    const b = open(locks)
    await vi.advanceTimersByTimeAsync(1000)
    b.lock.takeOver()
    await vi.advanceTimersByTimeAsync(0)
    expect(b.states).toEqual(['elsewhere', 'mine'])
    expect(a.states).toEqual(['mine', 'elsewhere'])
  })

  it('edits as before when the browser has no locks or they fail', async () => {
    expect(open(undefined as unknown as LockManagerLike).states).toEqual([
      'mine',
    ])
    const broken: LockManagerLike = {
      request: () => Promise.reject(new Error('not allowed')),
    }
    const c = open(broken)
    await vi.advanceTimersByTimeAsync(0)
    expect(c.states).toEqual(['mine'])
  })

  it('says nothing after the page closed here', async () => {
    const locks = fakeLocks()
    const a = open(locks)
    await vi.advanceTimersByTimeAsync(0)
    a.lock.release()
    await vi.advanceTimersByTimeAsync(0)
    open(locks).lock.takeOver() // another window takes it
    await vi.advanceTimersByTimeAsync(1000)
    expect(a.states).toEqual(['mine'])
  })
})
