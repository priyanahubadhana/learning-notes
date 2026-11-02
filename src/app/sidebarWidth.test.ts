import { describe, expect, it } from 'vitest'
import { clampSidebarWidth, isSidebarWidth } from './sidebarWidth'

describe('sidebar width', () => {
  it('keeps a width inside the limits', () => {
    expect(clampSidebarWidth(300.4, 1200)).toBe(300)
    expect(clampSidebarWidth(50, 1200)).toBe(200)
    expect(clampSidebarWidth(900, 1200)).toBe(480)
  })

  it('leaves the page room in a narrow window', () => {
    expect(clampSidebarWidth(480, 700)).toBe(350)
    expect(clampSidebarWidth(480, 400)).toBe(200)
  })

  it('stops at half the window, the same limit the screen uses', () => {
    expect(clampSidebarWidth(480, 900)).toBe(450)
  })

  it('accepts only real numbers from storage', () => {
    expect(isSidebarWidth(260)).toBe(true)
    expect(isSidebarWidth('260')).toBe(false)
    expect(isSidebarWidth(NaN)).toBe(false)
  })
})
