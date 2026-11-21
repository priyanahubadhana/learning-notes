/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { pressHome, setPressHome } from './pressHome'

describe('pressHome', () => {
  it('an element with no home counts for itself', () => {
    const el = document.createElement('div')
    expect(pressHome(el)).toBe(el)
  })

  it('a part and everything inside it count for the home', () => {
    const home = document.createElement('div')
    const part = document.createElement('div')
    const inner = document.createElement('span')
    part.append(inner)
    setPressHome(part, home)
    expect(pressHome(part)).toBe(home)
    expect(pressHome(inner)).toBe(home)
  })

  it('the undo forgets the home, but not a newer one', () => {
    const a = document.createElement('div')
    const b = document.createElement('div')
    const part = document.createElement('div')
    const forgetA = setPressHome(part, a)
    const forgetB = setPressHome(part, b)
    forgetA()
    expect(pressHome(part)).toBe(b)
    forgetB()
    expect(pressHome(part)).toBe(part)
  })
})
