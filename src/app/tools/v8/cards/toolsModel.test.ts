// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  eraserSettings,
  lassoSettings,
  penSettings,
  resetInkSettings,
} from '../../main/inkSettings'
import { activeTool } from '../../main/mainTools'
import { lassoRow } from '../../../../ink/lassoMenu'
import {
  chooseEraserMode,
  chooseEraserSize,
  eraserModes,
} from './eraser/eraserModel'
import {
  SHAPE_CHOICES,
  chooseShape,
  enterShapes,
  isShapeDraw,
  leaveShapes,
} from './shapes/shapesModel'
import {
  LASSO_ACTIONS,
  setLassoFilter,
  setLassoShape,
  toggleRowAction,
} from './lasso/lassoModel'
import { cardAutoClose } from './autoClose'
import {
  BAR_ACTIONS,
  MORE_BEGINNER,
  MORE_PRO,
  barItems,
  moreItems,
} from '../selectionBarModel'
import { en } from '../../../../i18n/en'
import { enLate } from '../../../../i18n/en/late'
import { es } from '../../../../i18n/es'
import { hi } from '../../../../i18n/hi'

beforeEach(() => {
  localStorage.clear()
  resetInkSettings()
  activeTool.set('eraser')
})

describe('Eraser (TB-30)', () => {
  it('Beginner has Standard and Whole stroke; Professional adds Precise', () => {
    expect(eraserModes(false, 'standard')).toEqual(['standard', 'stroke'])
    expect(eraserModes(true, 'standard')).toEqual([
      'standard',
      'stroke',
      'precise',
    ])
  })
  it('a saved Precise stays visible for Beginner so the pick is not lost', () => {
    expect(eraserModes(false, 'precise')).toContain('precise')
  })
  it("writes the stores today's bar reads", () => {
    chooseEraserMode('stroke')
    chooseEraserSize(2)
    expect(eraserSettings.get()).toMatchObject({ mode: 'stroke', size: 2 })
  })
  it('simple pickers close after a pick; Professional cards stay', () => {
    const none = () => false
    const all = () => true
    expect(cardAutoClose('eraser.mode', none)).toBe(true)
    expect(cardAutoClose('eraser.size', none)).toBe(true)
    expect(cardAutoClose('eraser.mode', all)).toBe(false)
    expect(cardAutoClose('eraser.size', all)).toBe(false)
    expect(cardAutoClose('lasso.shape', none)).toBe(true)
    expect(cardAutoClose('lasso.actions', none)).toBe(false)
    expect(cardAutoClose('shapes.shape', none)).toBe(false)
    expect(cardAutoClose('pen.type', none)).toBe(true)
  })
})

describe('Shapes (TB-31)', () => {
  it('offers the clean shapes only (freehand and tape stay on Pen)', () => {
    expect([...SHAPE_CHOICES]).toEqual([
      'line',
      'arrow',
      'rect',
      'ellipse',
      'triangle',
    ])
  })
  it('entering Shapes draws a clean shape with the pen; a shape already chosen stays', () => {
    enterShapes()
    expect(activeTool.get()).toBe('pen')
    expect(penSettings.get().drawAs).toBe('rect')
    chooseShape('ellipse')
    enterShapes()
    expect(penSettings.get().drawAs).toBe('ellipse')
  })
  it('leaving Shapes for Pen returns to freehand', () => {
    chooseShape('arrow')
    leaveShapes()
    expect(penSettings.get().drawAs).toBe('free')
    expect(isShapeDraw('free')).toBe(false)
    expect(isShapeDraw('rect')).toBe(true)
  })
  it('the shape pick is one change in the shared pen settings', () => {
    chooseShape('triangle')
    expect(penSettings.get().drawAs).toBe('triangle')
  })
  it('Shapes size and colour cards close like the Pen ones', () => {
    expect(cardAutoClose('shapes.size', () => false)).toBe(true)
    expect(cardAutoClose('shapes.colour', () => true)).toBe(false)
  })
})

describe('Lasso (TB-32)', () => {
  it('shape and filter picks go to the Lasso settings', () => {
    setLassoShape('rect')
    setLassoFilter('text', true)
    expect(lassoSettings.get()).toMatchObject({ shape: 'rect', text: true })
  })
  it('lists the actions a selection offers', () => {
    expect(LASSO_ACTIONS.length).toBeGreaterThanOrEqual(7)
  })
  it('a row action switches on and off and keeps the order', () => {
    const before = [...lassoRow.get()]
    toggleRowAction('delete')
    expect(lassoRow.get()).toContain('delete')
    toggleRowAction('delete')
    expect([...lassoRow.get()]).toEqual(before)
  })
})

describe('Selection bar (TB-33)', () => {
  it('the bar has Cut, Copy, Paste, Duplicate, Colour, Resize, Delete', () => {
    expect([...BAR_ACTIONS]).toEqual([
      'cut',
      'copy',
      'paste',
      'duplicate',
      'colour',
      'resize',
      'delete',
    ])
    expect(barItems().map((i) => i.id)).toEqual([...BAR_ACTIONS])
  })
  it('Beginner ⋯ only deselects; Professional adds nine more', () => {
    expect([...MORE_BEGINNER]).toEqual(['deselect'])
    expect([...MORE_PRO]).toEqual([
      'convert',
      'screenshot',
      'keyPoint',
      'makeCard',
      'summary',
      'saveToNotes',
      'move',
      'scale',
      'rotate',
    ])
    expect(moreItems(() => false).map((i) => i.id)).toEqual(['deselect'])
    expect(moreItems(() => true)).toHaveLength(10)
  })
  it('every item has a plain name in English, Spanish and Hindi', () => {
    const all = [...barItems(), ...moreItems(() => true)]
    for (const i of all) {
      for (const dict of [{ ...en, ...enLate }, es, hi] as Record<
        string,
        string
      >[])
        expect(dict[i.label], i.label).toBeTruthy()
    }
  })
})
