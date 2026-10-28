import { describe, expect, it } from 'vitest'
import { toastDuration } from './toastTiming'

describe('toastDuration', () => {
  it('keeps short messages at 2.5 s and long ones up to 8 s', () => {
    expect(toastDuration('Saved', false)).toBe(2500)
    expect(toastDuration('x'.repeat(60), false)).toBe(4500)
    expect(toastDuration('x'.repeat(500), false)).toBe(8000)
  })

  it('keeps messages with a button for at least 6 s', () => {
    expect(toastDuration('Page deleted', true)).toBe(6000)
    expect(toastDuration('x'.repeat(500), true)).toBe(8000)
  })
})
