import { describe, expect, it } from 'vitest'
import { parseLockConfig } from './lockConfig'
import {
  hashSecret,
  isNewPassword,
  isNewPin,
  isPin,
  isSecretHash,
  isStoredPin,
  storedLength,
  verifySecret,
} from './lockCrypto'

describe('code length rules (security.m1)', () => {
  it('a new PIN is exactly 6 digits', () => {
    expect(isNewPin('123456')).toBe(true)
    for (const bad of [
      '1234',
      '12345',
      '1234567',
      '12345a',
      '',
      '１２３４５６',
    ])
      expect(isNewPin(bad)).toBe(false)
  })

  it('a stored PIN may be 4 to 6 digits (old PINs keep unlocking)', () => {
    for (const ok of ['1234', '12345', '123456'])
      expect(isStoredPin(ok)).toBe(true)
    for (const bad of ['123', '1234567', 'abcd'])
      expect(isStoredPin(bad)).toBe(false)
    // The old rule is unchanged for flag off.
    expect(isPin('1234')).toBe(true)
  })

  it('a new password is 8 to 128 characters', () => {
    expect(isNewPassword('1234567')).toBe(false)
    expect(isNewPassword('12345678')).toBe(true)
    expect(isNewPassword('x'.repeat(128))).toBe(true)
    expect(isNewPassword('x'.repeat(129))).toBe(false)
  })

  it('reads the optional len, and treats a missing or bad one as unknown', async () => {
    const h = await hashSecret('1234', 1_000)
    expect(storedLength(h)).toBeUndefined()
    expect(storedLength({ ...h, len: 6 })).toBe(6)
    expect(storedLength({ ...h, len: 0 })).toBeUndefined()
    expect(storedLength({ ...h, len: 2.5 })).toBeUndefined()
    expect(storedLength({ ...h, len: 9999 })).toBeUndefined()
    expect(storedLength(undefined)).toBeUndefined()
  })

  it('an old hash with no len still loads and verifies; a hash with len too', async () => {
    const old = await hashSecret('4821', 1_000)
    const withLen = { ...(await hashSecret('482193', 1_000)), len: 6 }
    expect(isSecretHash(old) && isSecretHash(withLen)).toBe(true)
    const cfg = parseLockConfig({ pin: old, password: withLen })
    expect(cfg.pin).toEqual(old)
    expect(cfg.password?.len).toBe(6)
    expect(await verifySecret('4821', old)).toBe(true)
    expect(await verifySecret('482193', withLen)).toBe(true)
  })
})
