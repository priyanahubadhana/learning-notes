/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { focusShown } from './focusShown'

describe('focusShown', () => {
  it('focuses the element and says it got focus', () => {
    const b = document.createElement('button')
    document.body.appendChild(b)
    expect(focusShown(b)).toBe(true)
    expect(document.activeElement).toBe(b)
    b.remove()
  })

  it('says no for a missing element or one that cannot take focus', () => {
    expect(focusShown(null)).toBe(false)
    const d = document.createElement('div')
    document.body.appendChild(d)
    expect(focusShown(d)).toBe(false)
    d.remove()
  })
})
