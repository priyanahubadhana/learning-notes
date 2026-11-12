// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  PEN_COLOURS,
  HIGHLIGHT_COLOURS,
  HIGHLIGHT_WIDTHS,
  PEN_DEFAULTS,
  highlighterSettings,
  penSettings,
  resetInkSettings,
} from '../../../main/inkSettings'
import { activeTool } from '../../../main/mainTools'
import { faceOf, TYPE_IDS, dotPx } from '../../penFace'
import {
  FEEL_TABS,
  TYPE_HINT,
  cardAutoClose,
  chooseColour,
  chooseSize,
  chooseType,
  feelTabs,
  samplePath,
  sameColour,
  swatchesFor,
} from './penModel'
import { en } from '../../../../../i18n/en'
import { enLate } from '../../../../../i18n/en/late'
import { es } from '../../../../../i18n/es'
import { hi } from '../../../../../i18n/hi'

beforeEach(() => {
  localStorage.clear()
  resetInkSettings()
  activeTool.set('pen')
})

describe('type tiles (TB-20)', () => {
  it('has six tiles: five pens and the highlighter', () => {
    expect([...TYPE_IDS]).toEqual([
      'fountain',
      'ball',
      'brush',
      'pencil',
      'marker',
      'highlighter',
    ])
  })

  it('every tile has a name and a hint in en, es and hi', () => {
    const all = { ...en, ...enLate }
    for (const id of TYPE_IDS) {
      for (const key of [`v8.pen.type.${id}`, TYPE_HINT[id]]) {
        expect(all[key as keyof typeof all], key).toBeTruthy()
        expect(es[key], key).toBeTruthy()
        expect(hi[key], key).toBeTruthy()
      }
    }
  })

  it('a pen type writes the same stored pen settings and drops shape mode', () => {
    penSettings.update({ drawAs: 'rect' })
    chooseType('brush')
    expect(penSettings.get().type).toBe('brush')
    expect(penSettings.get().drawAs).toBe('free')
    expect(activeTool.get()).toBe('pen')
    expect(
      JSON.parse(localStorage.getItem('learning-notes:ink.pen')!),
    ).toMatchObject({
      type: 'brush',
    })
  })

  it('the highlighter tile switches the page mode and leaves the pen as it was', () => {
    penSettings.update({ type: 'ball' })
    chooseType('highlighter')
    expect(activeTool.get()).toBe('highlighter')
    expect(penSettings.get().type).toBe('ball')
    chooseType('pencil')
    expect(activeTool.get()).toBe('pen')
  })
})

describe('size and colour', () => {
  it('a size writes the pen size and clears the exact width', () => {
    penSettings.update({ exact: 7 })
    chooseSize('pen', 2)
    expect(penSettings.get()).toMatchObject({ size: 2, exact: null })
  })

  it('in highlighter mode size and colour go to the highlighter store', () => {
    chooseSize('highlighter', 0)
    chooseColour('highlighter', HIGHLIGHT_COLOURS[2].hex.toUpperCase())
    expect(highlighterSettings.get()).toMatchObject({
      size: 0,
      colour: HIGHLIGHT_COLOURS[2].hex,
    })
    expect(penSettings.get().colour).toBe(PEN_DEFAULTS.colour)
  })

  it('the six swatches follow the tool', () => {
    expect(swatchesFor('pen')).toBe(PEN_COLOURS)
    expect(swatchesFor('highlighter')).toBe(HIGHLIGHT_COLOURS)
    expect(swatchesFor('pen')).toHaveLength(6)
  })

  it('compares colours without caring about case', () => {
    expect(sameColour('#AABBCC', '#aabbcc')).toBe(true)
    expect(sameColour('#aabbcc', '#aabbcd')).toBe(false)
  })
})

describe('the face of the chips', () => {
  it('reads the pen, or the highlighter when that mode is on', () => {
    const pen = penSettings.get()
    const hl = highlighterSettings.get()
    expect(faceOf('pen', pen, hl)).toMatchObject({
      typeId: 'fountain',
      colour: pen.colour,
      exact: false,
    })
    const f = faceOf('highlighter', pen, hl)
    expect(f.typeId).toBe('highlighter')
    expect(f.px).toBe(HIGHLIGHT_WIDTHS[hl.size])
    expect(dotPx(f)).toBeGreaterThan(5)
  })

  it('an exact width is shown as the width', () => {
    penSettings.update({ exact: 9.5 })
    const f = faceOf('pen', penSettings.get(), highlighterSettings.get())
    expect(f).toMatchObject({ px: 9.5, exact: true })
  })
})

describe('levels and unlock switches', () => {
  const none = () => false
  const all = () => true

  it('Aids only appears when its switch is on', () => {
    expect(feelTabs(none)).toEqual(['feel', 'math', 'page'])
    expect(feelTabs(all)).toEqual([...FEEL_TABS])
    expect(feelTabs((id) => id === 'tb.penAids')).toContain('aids')
  })

  it('simple pickers close after a pick; a card with more controls stays', () => {
    expect(cardAutoClose('pen.type', none)).toBe(true)
    expect(cardAutoClose('pen.size', none)).toBe(true)
    expect(cardAutoClose('pen.colour', none)).toBe(true)
    expect(cardAutoClose('pen.size', all)).toBe(false)
    expect(cardAutoClose('pen.colour', all)).toBe(false)
    expect(cardAutoClose('pen.feel', none)).toBe(false)
  })
})

describe('sample stroke', () => {
  it('stays inside its box', () => {
    const nums = samplePath(64, 26)
      .match(/-?\d+(\.\d+)?/g)!
      .map(Number)
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...nums)).toBeLessThanOrEqual(64)
  })
})
