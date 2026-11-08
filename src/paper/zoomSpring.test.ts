import { describe, expect, it } from 'vitest'
import { PINCH_SLACK, rubberZoom, springEase } from './sheets'

describe('pinch zoom below fit width', () => {
  it('follows the fingers above fit', () => {
    expect(rubberZoom(1)).toBe(1)
    expect(rubberZoom(2.5)).toBe(2.5)
  })
  it('gives way with resistance and never goes under ~73 % of fit', () => {
    expect(rubberZoom(0.95)).toBeGreaterThan(0.94)
    expect(rubberZoom(0.95)).toBeLessThan(1)
    for (const z of [0.7, 0.5, 0.2, 0.01]) {
      expect(rubberZoom(z)).toBeGreaterThan(1 - PINCH_SLACK - 1e-9)
      expect(rubberZoom(z)).toBeLessThan(1)
    }
    expect(rubberZoom(0.3)).toBeLessThan(rubberZoom(0.6)) // monotonic
  })
  it('the spring eases from 0 to 1', () => {
    expect(springEase(0)).toBe(0)
    expect(springEase(1)).toBe(1)
    expect(springEase(0.5)).toBeGreaterThan(0.5)
    expect(springEase(2)).toBe(1)
  })
})
