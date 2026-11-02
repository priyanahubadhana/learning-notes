import { describe, expect, it } from 'vitest'
import { shouldReload } from './chunkReload'

const memory = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  }
}

describe('reloading after a failed screen file', () => {
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
