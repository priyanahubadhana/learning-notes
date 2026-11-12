import { describe, expect, it, vi } from 'vitest'
import {
  isVersionError,
  watchOtherTabUpgrade,
  type WatchedDb,
} from './otherTab'

function fake(open: () => Promise<unknown> = async () => {}) {
  let handler: Parameters<WatchedDb['on']>[1] = () => {}
  const database: WatchedDb = {
    verno: 23,
    on: (_n, fn) => {
      handler = fn
    },
    close: vi.fn(),
    open,
  }
  return {
    database,
    change: (n: number | null) => handler({ oldVersion: 230, newVersion: n }),
  }
}

describe('other tab upgraded the notes', () => {
  it('a higher stored version asks for the update once and closes the database', () => {
    const { database, change } = fake()
    const onNewer = vi.fn()
    watchOtherTabUpgrade(database, onNewer)
    change(240)
    change(250)
    expect(onNewer).toHaveBeenCalledTimes(1)
    expect(database.close).toHaveBeenCalled()
  })
  it('the same version or a deletion does nothing', () => {
    const { database, change } = fake()
    const onNewer = vi.fn()
    watchOtherTabUpgrade(database, onNewer)
    change(230)
    change(null)
    expect(onNewer).not.toHaveBeenCalled()
  })
  it('a VersionError on open asks for the update', async () => {
    const err = Object.assign(new Error('v'), { name: 'VersionError' })
    const { database } = fake(() => Promise.reject(err))
    const onNewer = vi.fn()
    watchOtherTabUpgrade(database, onNewer)
    await Promise.resolve()
    await Promise.resolve()
    expect(onNewer).toHaveBeenCalledTimes(1)
    expect(isVersionError(err)).toBe(true)
    expect(isVersionError(new Error('x'))).toBe(false)
  })
})
