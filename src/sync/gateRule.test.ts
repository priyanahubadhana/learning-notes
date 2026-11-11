import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isReadOnlyGate, setReadOnlyGate } from '../core/readOnlyGate'
import { GATE_OFF, gateActive, gateRule, refreshGate } from './gateRule'

const SESSION = 'learning-notes:sync.session'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  setReadOnlyGate(false)
})

describe('account gate rule', () => {
  it('gates only a device with no session and no off switch', () => {
    expect(gateRule({ session: false, off: false })).toBe(true)
    expect(gateRule({ session: true, off: false })).toBe(false)
    expect(gateRule({ session: false, off: true })).toBe(false)
  })

  it('a never-signed-in device is gated, and a reload gives the same answer', () => {
    expect(gateActive()).toBe(true)
    expect(gateActive()).toBe(true)
  })

  it('a stored session is signed in even when its token has expired (offline)', () => {
    localStorage.setItem(
      SESSION,
      JSON.stringify({ access: 'old', refresh: 'r', expiresAt: 1 }),
    )
    expect(gateActive()).toBe(false)
  })

  it('the test connector sign-in counts as signed in', () => {
    localStorage.setItem('learning-notes:sync.mockSignedIn', '1')
    expect(gateActive()).toBe(false)
  })

  it('signing out (session removed) gates again; signing in lifts it', () => {
    expect(refreshGate()).toBe(true)
    expect(isReadOnlyGate()).toBe(true)
    localStorage.setItem(SESSION, '{"refresh":"r"}')
    expect(refreshGate()).toBe(false)
    expect(isReadOnlyGate()).toBe(false)
    localStorage.removeItem(SESSION)
    expect(refreshGate()).toBe(true)
  })

  it('the off switch lifts the gate', () => {
    localStorage.setItem(GATE_OFF, '1')
    expect(gateActive()).toBe(false)
  })
})
