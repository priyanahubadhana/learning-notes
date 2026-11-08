import { describe, expect, it } from 'vitest'
import {
  clock,
  codeLengthSlip,
  createLimiter,
  fingerprint,
  waitAfter,
} from './unlockAttempts'

function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => [...m.values()].join('|'),
  } as unknown as Storage & { dump: () => string }
}
const setup = () => {
  const clockRef = { t: 1_000_000 }
  const store = fakeStorage()
  const make = () =>
    createLimiter(
      () => clockRef.t,
      () => store,
    )
  return { clockRef, store, make, lim: make() }
}
const MIN = 60_000

describe('unlock attempt limiter', () => {
  it('schedule: 3 free tries, then 1 min, 5, 15, then 1 h each', () => {
    expect([1, 2].map(waitAfter)).toEqual([0, 0])
    expect([3, 4, 5, 6, 7, 20].map(waitAfter)).toEqual([
      MIN,
      5 * MIN,
      15 * MIN,
      60 * MIN,
      60 * MIN,
      60 * MIN,
    ])
  })

  it('locks after the third wrong try and frees itself when the time is up', () => {
    const { lim, clockRef } = setup()
    lim.fail('passphrase', 'a')
    lim.fail('passphrase', 'b')
    expect(lim.remaining('passphrase')).toBe(0)
    lim.fail('passphrase', 'c')
    expect(lim.remaining('passphrase')).toBe(MIN)
    clockRef.t += MIN
    expect(lim.remaining('passphrase')).toBe(0)
    lim.fail('passphrase', 'd')
    expect(lim.remaining('passphrase')).toBe(5 * MIN)
  })

  it('counts the passphrase and the code separately', () => {
    const { lim } = setup()
    for (const v of ['a', 'b', 'c']) lim.fail('passphrase', v)
    expect(lim.remaining('passphrase')).toBeGreaterThan(0)
    expect(lim.remaining('code')).toBe(0)
    expect(lim.fails('code')).toBe(0)
  })

  it('the same wrong value twice counts once', () => {
    const { lim } = setup()
    expect(lim.fail('passphrase', 'x')).toBe(true)
    expect(lim.fail('passphrase', 'x')).toBe(false)
    expect(lim.fails('passphrase')).toBe(1)
    expect(lim.fail('passphrase', 'y')).toBe(true)
    expect(lim.fail('passphrase', 'x')).toBe(true)
    expect(lim.fails('passphrase')).toBe(3)
  })

  it('survives a reload (new limiter, same storage) and stores no typed text', async () => {
    const { lim, make, store } = setup()
    const secret = 'my secret passphrase'
    for (const v of ['a', 'b']) lim.fail('passphrase', v)
    lim.fail('passphrase', await fingerprint(secret))
    const again = make()
    expect(again.fails('passphrase')).toBe(3)
    expect(again.remaining('passphrase')).toBe(MIN)
    expect(store.dump()).not.toContain('secret')
    expect(store.dump()).not.toContain(await fingerprint(secret))
  })

  it('resets on success', () => {
    const { lim, make } = setup()
    for (const v of ['a', 'b', 'c']) lim.fail('passphrase', v)
    lim.fail('code', 'z')
    lim.succeed()
    expect(lim.remaining('passphrase')).toBe(0)
    expect(make().fails('passphrase')).toBe(0)
    expect(make().fails('code')).toBe(0)
  })

  it('a clock set far back never waits longer than one hour; blocked storage still counts', () => {
    const { clockRef, store, make } = setup()
    store.setItem(
      'learning-notes:unlock-throttle-v1',
      JSON.stringify({
        passphrase: { fails: 9, lockedUntil: clockRef.t + 99 * 60 * MIN },
        code: { fails: 0, lockedUntil: 0 },
      }),
    )
    expect(make().remaining('passphrase')).toBe(60 * MIN)
    const blocked = createLimiter(
      () => clockRef.t,
      () => null,
    )
    for (const v of ['a', 'b', 'c']) blocked.fail('code', v)
    expect(blocked.remaining('code')).toBe(MIN)
  })

  it('fingerprints differ by value and match for the same value', async () => {
    expect(await fingerprint('abc')).toBe(await fingerprint('abc'))
    expect(await fingerprint('abc')).not.toBe(await fingerprint('abd'))
  })
})

describe('recovery code length check', () => {
  it('tolerates case, spaces, dashes and dots; a wrong length is a slip, not a try', () => {
    const good = '7K2Q-ABCD-EFGH-JKMN-PQRS-TVWX-YZ'
    expect(codeLengthSlip(good)).toBeNull()
    expect(codeLengthSlip(good.toLowerCase().replace(/-/g, ' '))).toBeNull()
    expect(codeLengthSlip(good.replace(/-/g, '.\n'))).toBeNull()
    expect(codeLengthSlip(good.slice(0, -3))).toBe(24)
    expect(codeLengthSlip('')).toBe(0)
  })
  it('clock shows minutes and seconds', () => {
    expect(clock(272_000)).toBe('4:32')
    expect(clock(59_100)).toBe('1:00')
  })
})
