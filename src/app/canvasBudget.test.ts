import { beforeEach, describe, expect, it } from 'vitest'
import {
  BUDGET_BYTES,
  canvasBytes,
  clampDpr,
  release,
  reserve,
  resetBudget,
  usedBytes,
} from './canvasBudget'

beforeEach(resetBudget)

describe('canvasBudget', () => {
  it('counts 4 bytes a pixel', () => expect(canvasBytes(10, 5)).toBe(200))
  it('refuses what does not fit and frees on release', () => {
    expect(reserve('a', BUDGET_BYTES - 10)).toBe(true)
    expect(reserve('b', 100)).toBe(false)
    release('a')
    expect(reserve('b', 100)).toBe(true)
    expect(usedBytes()).toBe(100)
  })
  it('resizing the same id replaces its share', () => {
    expect(reserve('a', BUDGET_BYTES)).toBe(true)
    expect(reserve('a', 50)).toBe(true)
    expect(usedBytes()).toBe(50)
  })
  it('caps the pixel ratio at 2', () => {
    expect(clampDpr(3)).toBe(2)
    expect(clampDpr(0)).toBe(1)
  })
})
