import { describe, expect, it } from 'vitest'
import { pickEngine } from './engine'
import {
  weightPieces,
  weightsFor,
  wordPressures,
  type PadStroke,
} from './pressure'

/** A short horizontal stroke at x..x+w on line y with pressure p. */
const s = (x: number, y: number, p: number, w = 20): PadStroke => [
  { x, y, p },
  { x: x + w / 2, y: y + 20, p },
  { x: x + w, y, p },
]

describe('write pad pressure', () => {
  it('groups strokes into words by gaps, line by line', () => {
    const strokes = [
      s(0, 0, 0.2),
      s(22, 0, 0.2), // same word (2 px gap)
      s(80, 0, 0.9), // new word
      s(0, 100, 0.5), // next line
    ]
    expect(wordPressures(strokes).map((p) => +p.toFixed(3))).toEqual([
      0.2, 0.9, 0.5,
    ])
  })

  it('maps normalised pressure onto the weights the font has', () => {
    expect(weightsFor([0.1, 0.5, 0.95], 'kalam', 'normal')).toEqual([
      'light',
      'normal',
      'bold',
    ])
    // Caveat has no Light.
    expect(weightsFor([0.1, 0.95], 'caveat', 'normal')).toEqual([
      'normal',
      'bold',
    ])
  })

  it('even pressure (a mouse) keeps the chosen weight', () => {
    expect(weightsFor([0.5, 0.5, 0.55], 'kalam', 'bold')).toEqual([
      'bold',
      'bold',
      'bold',
    ])
  })

  it('pairs words with weights, keeping spaces and merging runs', () => {
    expect(
      weightPieces('नमस्ते big world', ['light', 'bold', 'bold'], 'normal'),
    ).toEqual([
      { text: 'नमस्ते ', weight: 'light' },
      { text: 'big world', weight: 'bold' },
    ])
    // A different word count: everything gets the fallback.
    expect(weightPieces('a b', ['bold'], 'normal')).toEqual([
      { text: 'a b', weight: 'normal' },
    ])
  })

  it('the AI engine is a WritePadEngine with pressure', () => {
    const e = pickEngine('ai')
    expect(e.id).toBe('ai')
    expect(e.pressure).toBe(true)
    expect(pickEngine().id).toBe('scribble')
  })
})
