import { describe, expect, it, vi } from 'vitest'
import { requestPersistentStorage } from './storage'

const fakeStorage = (persisted: boolean, persist: () => Promise<boolean>) =>
  ({ persisted: async () => persisted, persist }) as unknown as StorageManager

describe('requestPersistentStorage', () => {
  it('does not ask again when data is already kept', async () => {
    const persist = vi.fn(async () => true)
    expect(await requestPersistentStorage(fakeStorage(true, persist))).toBe(
      true,
    )
    expect(persist).not.toHaveBeenCalled()
  })

  it('asks the browser when data is not yet kept', async () => {
    const storage = fakeStorage(false, async () => true)
    expect(await requestPersistentStorage(storage)).toBe(true)
  })

  it('never throws (unsupported or blocked)', async () => {
    expect(await requestPersistentStorage(undefined)).toBe(false)
    const failing = fakeStorage(false, async () => {
      throw new Error('blocked')
    })
    expect(await requestPersistentStorage(failing)).toBe(false)
  })
})
