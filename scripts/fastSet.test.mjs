import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FAST_SET } from '../e2e/fastSet.ts'

// The fast set guards every merge (Phase 0 task 0.8). These checks stop it
// from shrinking or pointing at a file that is gone.
describe('fast test set (e2e/fastSet.ts)', () => {
  const files = FAST_SET.map((entry) => entry.file)

  it('has at least 25 spec files', () => {
    expect(files.length).toBeGreaterThanOrEqual(25)
  })

  it('names only spec files that exist in e2e/', () => {
    const missing = files.filter(
      (file) => !/^[\w-]+\.spec\.ts$/.test(file) || !existsSync(`e2e/${file}`),
    )
    expect(missing).toEqual([])
  })

  it('lists no file twice', () => {
    expect(new Set(files).size).toBe(files.length)
  })

  it('gives every file a reason', () => {
    const noReason = FAST_SET.filter((entry) => entry.why.trim().length < 10)
    expect(noReason).toEqual([])
  })
})
