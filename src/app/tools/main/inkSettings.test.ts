// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  PEN_DEFAULTS,
  PEN_TYPES,
  PEN_WIDTHS,
  addCustomColour,
  customColours,
  eraserSettings,
  highlighterPreview,
  highlighterSettings,
  lassoSettings,
  penPreview,
  penSettings,
  penWidth,
  resetInkSettings,
  widthAt,
} from './inkSettings'

beforeEach(() => {
  localStorage.clear()
  resetInkSettings()
})

describe('ink settings', () => {
  it('has all 5 pen types with 3 thicknesses each', () => {
    expect([...PEN_TYPES]).toEqual([
      'fountain',
      'ball',
      'brush',
      'pencil',
      'marker',
    ])
    for (const type of PEN_TYPES) {
      const [a, b, c] = PEN_WIDTHS[type]
      expect(a).toBeLessThan(b)
      expect(b).toBeLessThan(c)
    }
  })

  it('starts with the defaults and saves changes per device', () => {
    expect(penSettings.get()).toEqual(PEN_DEFAULTS)
    penSettings.update({ type: 'brush', colour: '#0B6E99', stabilisation: 80 })
    resetInkSettings()
    expect(penSettings.get().type).toBe('brush')
    expect(penSettings.get().colour).toBe('#0b6e99')
    expect(penSettings.get().stabilisation).toBe(80)
  })

  it('clamps and repairs damaged values field by field', () => {
    localStorage.setItem(
      'learning-notes:ink.pen',
      JSON.stringify({
        type: 'laser',
        sharpness: 900,
        pressure: 'x',
        colour: 'red',
        exact: -3,
        size: 7,
      }),
    )
    resetInkSettings()
    const p = penSettings.get()
    expect(p.type).toBe('fountain')
    expect(p.sharpness).toBe(100)
    expect(p.pressure).toBe(PEN_DEFAULTS.pressure)
    expect(p.colour).toBe(PEN_DEFAULTS.colour)
    expect(p.exact).toBe(0.5)
    expect(p.size).toBe(1)
  })

  it('an exact thickness wins over the 3 sizes', () => {
    penSettings.update({ type: 'ball', size: 2 })
    expect(penWidth(penSettings.get())).toBe(PEN_WIDTHS.ball[2])
    penSettings.update({ exact: 7.5 })
    expect(penWidth(penSettings.get())).toBe(7.5)
    penSettings.update({ exact: null })
    expect(penWidth(penSettings.get())).toBe(PEN_WIDTHS.ball[2])
  })

  it('highlighter, eraser and lasso have their own settings', () => {
    expect(highlighterSettings.get().snapToText).toBe(true)
    highlighterSettings.update({ opacity: 5 })
    expect(highlighterSettings.get().opacity).toBe(20)
    eraserSettings.update({ mode: 'stroke', highlightsOnly: true })
    expect(eraserSettings.get()).toMatchObject({
      mode: 'stroke',
      highlightsOnly: true,
    })
    lassoSettings.update({ shape: 'rect', pictures: false })
    expect(lassoSettings.get()).toMatchObject({
      shape: 'rect',
      pictures: false,
      ink: true,
    })
  })

  it('keeps added colours: newest first, no repeats, at most 6', () => {
    for (const hex of [
      '#111111',
      '#222222',
      '#333333',
      '#444444',
      '#555555',
      '#666666',
      '#777777',
    ]) {
      addCustomColour(hex)
    }
    addCustomColour('#444444')
    expect(customColours.get()[0]).toBe('#444444')
    expect(customColours.get()).toHaveLength(6)
    addCustomColour('#1d1d1f') // already a palette colour
    addCustomColour('nope')
    expect(customColours.get()).not.toContain('#1d1d1f')
  })

  it('the preview follows the settings', () => {
    const solid = penPreview({ ...PEN_DEFAULTS, line: 'solid' })
    expect(solid.stroke).toBeNull()
    expect(solid.fill).toBe(PEN_DEFAULTS.colour)
    const dashed = penPreview({ ...PEN_DEFAULTS, line: 'dashed' })
    expect(dashed.stroke?.dash).not.toBe('none')
    const dotted = penPreview({ ...PEN_DEFAULTS, line: 'dotted' })
    expect(dotted.stroke?.cap).toBe('round')
    const thick = penPreview({ ...PEN_DEFAULTS, exact: 12 })
    const thin = penPreview({ ...PEN_DEFAULTS, exact: 1 })
    expect(thick.d).not.toBe(thin.d)
    expect(penPreview({ ...PEN_DEFAULTS, stabilisation: 0 }).d).not.toBe(
      penPreview({ ...PEN_DEFAULTS, stabilisation: 100 }).d,
    )
    expect(
      highlighterPreview({ ...highlighterSettings.get(), opacity: 40 }).opacity,
    ).toBe(0.4)
  })

  it('pressure and sharpness shape the stroke width', () => {
    expect(widthAt(0.5, 4, 0, 0)).toBeCloseTo(4)
    expect(widthAt(0, 4, 100, 0)).toBeLessThan(widthAt(0.5, 4, 100, 0))
    expect(widthAt(0.5, 4, 0, 100)).toBeLessThanOrEqual(4)
  })
})
