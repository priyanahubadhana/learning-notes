import { describe, expect, it } from 'vitest'
import { NeedsTapError, NotAllowedError, TryLaterError } from './connectors'
import { SyncCryptoError } from './crypto'
import { mapSyncError, syncDisplay } from './syncProblem'

describe('sync errors become plain problems', () => {
  it('maps each kind of error to one of five messages (plus the old ones)', () => {
    expect(mapSyncError(new NotAllowedError('session ended'))).toBe(
      'signInAgain',
    )
    expect(mapSyncError(new NotAllowedError('signed out'))).toBe('signInAgain')
    expect(mapSyncError(new NotAllowedError('someone@example.com'))).toBe(
      'notAllowed',
    )
    expect(mapSyncError(new TryLaterError('drive full'))).toBe('driveFull')
    expect(mapSyncError(new TryLaterError('offline'))).toBe('offline')
    expect(mapSyncError(new TryLaterError('server 503'))).toBe('busy')
    expect(mapSyncError(new TryLaterError('store 429'))).toBe('busy')
    expect(mapSyncError(new TryLaterError('drive 500'))).toBe('busy')
    expect(mapSyncError(new SyncCryptoError('Could not open'))).toBe('needCode')
    expect(mapSyncError(new NeedsTapError('drive 401'))).toBe('failed')
    expect(mapSyncError(new Error('Bearer abc.def.ghi leaked'))).toBe('failed')
    expect(mapSyncError('weird')).toBe('failed')
  })

  it('never returns the raw text of an error', () => {
    const secret = 'eyJhbGciOiJIUzI1NiJ9.token.part'
    for (const e of [
      new TryLaterError(secret),
      new NotAllowedError(secret),
      new Error(secret),
    ]) {
      expect(mapSyncError(e)).not.toContain(secret)
    }
  })
})

describe('the status dot', () => {
  const ready = { phase: 'ready' as const }
  it('shows Synced, Syncing, Offline or Needs attention, and nothing when Sync is off', () => {
    expect(syncDisplay({ phase: 'signedOut' }, true)).toBeNull()
    expect(syncDisplay(ready, true)).toBe('synced')
    expect(syncDisplay({ phase: 'syncing' }, true)).toBe('syncing')
    expect(syncDisplay(ready, false)).toBe('offline')
    expect(syncDisplay({ ...ready, problem: 'offline' }, true)).toBe('offline')
    expect(syncDisplay({ ...ready, problem: 'driveFull' }, true)).toBe(
      'attention',
    )
    expect(syncDisplay({ ...ready, needsDriveTap: true }, true)).toBe(
      'attention',
    )
    expect(syncDisplay({ phase: 'needsKey' }, true)).toBe('attention')
  })
})
