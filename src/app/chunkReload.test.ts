import { describe, expect, it } from 'vitest'
import { RELOAD_DELAY_MS, reloadCanHelp, shouldReload } from './chunkReload'

const memory = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  }
}

describe('reloading after a failed screen file', () => {
  // Why: CI 43528030714. Offline, an idle prefetch failed and the reload
  // swapped the open notes (and the update notice) for a new load (U10); a
  // download aborted by leaving the page reloaded the old address and
  // cancelled the navigation (SS-01e).
  it('does not reload offline', () => {
    expect(reloadCanHelp(true)).toBe(true)
    expect(reloadCanHelp(false)).toBe(false)
  })

  it('waits before reloading, so a page being left is not reloaded', () => {
    expect(RELOAD_DELAY_MS).toBeGreaterThanOrEqual(500)
  })

  it('reloads once, then lets the error screen show', () => {
    const storage = memory()
    expect(shouldReload(storage, 100_000)).toBe(true)
    expect(shouldReload(storage, 110_000)).toBe(false)
  })

  it('may try again much later', () => {
    const storage = memory()
    expect(shouldReload(storage, 100_000)).toBe(true)
    expect(shouldReload(storage, 200_000)).toBe(true)
  })

  it('never reloads when it cannot remember doing so', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {},
    }
    expect(shouldReload(blocked, 100_000)).toBe(false)
  })
})
