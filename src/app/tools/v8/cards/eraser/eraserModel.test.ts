// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  eraseScope,
  eraseTargets,
  eraserSettings,
  resetInkSettings,
} from '../../../main/inkSettings'
import { toggleErases } from './eraserModel'
import { eraserRowItems } from '../../rowItems'
import { cardAutoClose } from '../autoClose'
import { cardInfo } from '../../rowItems'

beforeEach(() => {
  localStorage.clear()
  resetInkSettings()
})

describe('Eraser Erases (TB-30b)', () => {
  it('starts as Highlighter + Pen, like today', () => {
    expect(eraseTargets()).toEqual({ hl: true, text: false, pen: true })
  })
  it('Highlighter alone is the old "highlights only"', () => {
    toggleErases('pen')
    expect(eraseTargets()).toEqual({ hl: true, text: false, pen: false })
  })
  it('the old switch still wins while it is on, and the flags come back after', () => {
    eraserSettings.update({ eraseText: true })
    eraserSettings.update({ highlightsOnly: true })
    expect(eraseTargets()).toEqual({ hl: true, text: false, pen: false })
    eraserSettings.update({ highlightsOnly: false })
    expect(eraseTargets()).toEqual({ hl: true, text: true, pen: true })
  })
  it('toggling from the new bar turns the old switch off and keeps what it showed', () => {
    eraserSettings.update({ highlightsOnly: true })
    expect(toggleErases('text')).toBe(true)
    expect(eraserSettings.get().highlightsOnly).toBe(false)
    expect(eraseTargets()).toEqual({ hl: true, text: true, pen: false })
  })
  it('at least one stays on: the last one cannot be turned off', () => {
    toggleErases('pen')
    expect(toggleErases('hl')).toBe(false)
    expect(eraseTargets()).toEqual({ hl: true, text: false, pen: false })
  })
  it('Text alone is allowed', () => {
    toggleErases('text')
    toggleErases('hl')
    toggleErases('pen')
    expect(eraseTargets()).toEqual({ hl: false, text: true, pen: false })
  })
})

describe('Eraser scope follows the switch (review 2)', () => {
  it("switch OFF: today's eraser, typed-word highlights untouched by default", () => {
    expect(eraseScope(eraserSettings.get(), false)).toEqual({
      hlInk: true,
      penInk: true,
      hlWords: false,
      text: false,
    })
  })
  it('switch OFF: "highlights only" still clears highlights on words', () => {
    eraserSettings.update({ highlightsOnly: true, eraseText: true })
    expect(eraseScope(eraserSettings.get(), false)).toEqual({
      hlInk: true,
      penInk: false,
      hlWords: true,
      text: false,
    })
  })
  it('switch ON: the Highlighter clears words too; Text only when on', () => {
    expect(eraseScope(eraserSettings.get(), true)).toEqual({
      hlInk: true,
      penInk: true,
      hlWords: true,
      text: false,
    })
  })
})

describe('Eraser row (TB-30, TB-30a)', () => {
  it('Mode, Size, then Erases and Back after one on the bar', () => {
    expect(eraserRowItems(true).map((i) => i.id)).toEqual([
      'mode',
      'size',
      'erases',
      'back',
    ])
  })
  it('one Eraser menu when it is off', () => {
    const items = eraserRowItems(false)
    expect(items.map((i) => i.id)).toEqual(['mode'])
    expect(items[0]!.label).toBe('v8.item.eraser')
  })
  it('the Mode card is titled Eraser when it holds the sizes too', () => {
    expect(cardInfo('eraser.mode', false).title).toBe('v8.item.eraser')
    expect(cardInfo('eraser.mode', true).title).toBe('v8.item.mode')
    expect(cardInfo('eraser.options', true).title).toBe('v8.item.erases')
  })
  it('quick pickers close after a pick; Options and the Beginner card stay', () => {
    const menus = () => true
    const simple = () => false
    expect(cardAutoClose('eraser.mode', undefined, menus)).toBe(true)
    expect(cardAutoClose('eraser.size', undefined, menus)).toBe(true)
    expect(cardAutoClose('eraser.options', undefined, menus)).toBe(false)
    expect(cardAutoClose('eraser.mode', undefined, simple)).toBe(false)
  })
})
