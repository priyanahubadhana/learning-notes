import { describe, expect, it } from 'vitest'
import { placeBar, coversText } from './miniBarPlace'

const area = { left: 0, top: 0, right: 800, bottom: 600 }
const size = { width: 300, height: 52 }
const line = (top: number) => ({ left: 100, right: 400, top, bottom: top + 20 })

describe('mini bar place (F7: never over words)', () => {
  it('above the selected line when no text line is there', () => {
    const lines = [line(200)]
    const p = placeBar({
      centre: 250,
      size,
      area,
      lines,
      lineTop: 200,
      lineBottom: 220,
    })
    expect(p.top).toBe(200 - 52 - 8)
    expect(coversText(p, size, lines)).toBe(false)
  })
  it('below the selection when the line above is close (a second line selected)', () => {
    const lines = [line(200), line(230)]
    const p = placeBar({
      centre: 250,
      size,
      area,
      lines,
      lineTop: 230,
      lineBottom: 250,
    })
    expect(p.top).toBe(250 + 28)
    expect(coversText(p, size, lines)).toBe(false)
  })
  it('free space past the last line when above and below are taken', () => {
    const lines = [line(100), line(150), line(200), line(250), line(300)]
    const p = placeBar({
      centre: 250,
      size,
      area,
      lines,
      lineTop: 200,
      lineBottom: 220,
    })
    expect(coversText(p, size, lines)).toBe(false)
    expect(p.top).toBe(320 + 28)
  })
  it('stays inside the page', () => {
    const lines = [line(20)]
    const p = placeBar({
      centre: 5,
      size,
      area,
      lines,
      lineTop: 20,
      lineBottom: 40,
    })
    expect(p.left - 150).toBeGreaterThanOrEqual(8)
    expect(p.top).toBeGreaterThanOrEqual(8)
  })
})
