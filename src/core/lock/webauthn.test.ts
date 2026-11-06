import { describe, expect, it } from 'vitest'
import { passkeyFailure, passkeyMessageKey } from './webauthn'

describe('device lock failures', () => {
  it('tells a refusal before any sheet from a cancel', () => {
    expect(passkeyFailure('NotAllowedError', 20)).toBe('refused')
    expect(passkeyFailure('NotAllowedError', 4000)).toBe('cancelled')
  })

  it('maps the other causes', () => {
    expect(passkeyFailure('InvalidStateError', 500)).toBe('notSetUp')
    expect(passkeyFailure('NotSupportedError', 1)).toBe('unsupported')
    expect(passkeyFailure('SecurityError', 1)).toBe('unsupported')
    expect(passkeyFailure('Weird', 1)).toBe('failed')
  })

  it('gives each cause its own message', () => {
    const keys = ['cancelled', 'notSetUp', 'refused', 'unsupported'].map((r) =>
      passkeyMessageKey(r as never),
    )
    expect(new Set(keys).size).toBe(4)
    expect(passkeyMessageKey('failed')).toBe('lock.deviceFailed')
  })
})
