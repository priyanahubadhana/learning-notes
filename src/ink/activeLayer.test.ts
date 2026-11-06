// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  activeLayerPref,
  MAX_ENTRIES,
  readActiveLayer,
  writeActiveLayer,
} from './activeLayer'

beforeEach(() => activeLayerPref.set({}))

describe('active layer per page', () => {
  it('remembers a layer and ignores one that is gone', () => {
    writeActiveLayer('p1', 'a')
    expect(readActiveLayer('p1', ['a', 'b'])).toBe('a')
    expect(readActiveLayer('p1', ['b'])).toBeNull()
    expect(readActiveLayer('p2', ['a'])).toBeNull()
  })
  it('keeps at most 400 pages, dropping the oldest', () => {
    for (let i = 0; i < MAX_ENTRIES + 5; i++) writeActiveLayer(`p${i}`, 'x')
    const keys = Object.keys(activeLayerPref.get())
    expect(keys).toHaveLength(MAX_ENTRIES)
    expect(keys).not.toContain('p0')
    expect(keys).toContain(`p${MAX_ENTRIES + 4}`)
  })
})
