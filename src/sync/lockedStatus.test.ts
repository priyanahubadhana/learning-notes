import { describe, expect, it } from 'vitest'
import { isLocked } from './lockedStatus'

describe('isLocked', () => {
  it('is true when a key exists but this device has no code yet', () => {
    expect(isLocked({ phase: 'needsKey' })).toBe(true)
  })
  it('is true when the key cannot open the data', () => {
    expect(isLocked({ phase: 'ready', problem: 'needCode' })).toBe(true)
    expect(isLocked({ phase: 'ready', problem: 'unreadable' })).toBe(true)
  })
  it('is false when signed out, not set up, or healthy', () => {
    expect(isLocked({ phase: 'signedOut', problem: 'needCode' })).toBe(false)
    expect(isLocked({ phase: 'needsSetup' })).toBe(false)
    expect(isLocked({ phase: 'ready' })).toBe(false)
    expect(isLocked({ phase: 'syncing', problem: 'offline' })).toBe(false)
  })
})
