import type { PadFont, PadWeight } from './handStyle'

/**
 * The AI engine's pressure → weight step. Strokes are grouped into words by
 * the gaps between them (line by line, left to right); each word's mean
 * pressure is normalised against the lightest and firmest word of this
 * writing, then mapped onto the weights the chosen font really has.
 */

export interface PadPoint {
  x: number
  y: number
  /** 0..1 (a mouse reports 0.5 while pressed). */
  p: number
}
export type PadStroke = PadPoint[]

interface Box {
  x0: number
  x1: number
  y0: number
  y1: number
  p: number
  n: number
}

const boxOf = (s: PadStroke): Box => {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  let p = 0
  for (const pt of s) {
    x0 = Math.min(x0, pt.x)
    x1 = Math.max(x1, pt.x)
    y0 = Math.min(y0, pt.y)
    y1 = Math.max(y1, pt.y)
    p += pt.p
  }
  return { x0, x1, y0, y1, p, n: s.length }
}

/** Mean pressure of each word, in reading order. */
export function wordPressures(strokes: readonly PadStroke[]): number[] {
  const boxes = strokes.filter((s) => s.length > 0).map(boxOf)
  if (boxes.length === 0) return []
  const heights = boxes.map((b) => b.y1 - b.y0).sort((a, b) => a - b)
  const h = Math.max(8, heights[Math.floor(heights.length / 2)])
  // Lines: strokes whose middles are within one letter height.
  const lines: Box[][] = []
  for (const b of [...boxes].sort((a, c) => a.y0 + a.y1 - c.y0 - c.y1)) {
    const mid = (b.y0 + b.y1) / 2
    const line = lines.find((l) => {
      const m = l.reduce((s, c) => s + (c.y0 + c.y1) / 2, 0) / l.length
      return Math.abs(m - mid) < h
    })
    if (line) line.push(b)
    else lines.push([b])
  }
  const words: { p: number; n: number }[] = []
  for (const line of lines) {
    line.sort((a, b) => a.x0 - b.x0)
    let word = { p: 0, n: 0 }
    let right = -Infinity
    for (const b of line) {
      if (word.n > 0 && b.x0 - right > h * 0.6) {
        words.push(word)
        word = { p: 0, n: 0 }
      }
      word.p += b.p
      word.n += b.n
      right = Math.max(right, b.x1)
    }
    if (word.n > 0) words.push(word)
  }
  return words.map((w) => w.p / w.n)
}

/** The weights each font has (Caveat has no Light). */
const FONT_WEIGHTS: Record<PadFont, readonly PadWeight[]> = {
  caveat: ['normal', 'bold'],
  kalam: ['light', 'normal', 'bold'],
  app: ['light', 'normal', 'bold'],
}

/**
 * Weights for words of these pressures. Even pressure (a mouse, or a steady
 * hand: spread under 0.12) keeps the user's chosen weight for every word.
 */
export function weightsFor(
  pressures: readonly number[],
  font: PadFont,
  fallback: PadWeight,
): PadWeight[] {
  if (pressures.length === 0) return []
  const lo = Math.min(...pressures)
  const hi = Math.max(...pressures)
  if (hi - lo < 0.12) return pressures.map(() => fallback)
  const steps = FONT_WEIGHTS[font]
  return pressures.map((p) => {
    const norm = (p - lo) / (hi - lo)
    return steps[Math.min(steps.length - 1, Math.floor(norm * steps.length))]
  })
}

/**
 * Pairs the words of the text with the weights. When the model's word count
 * differs from the drawn words, every word gets the fallback.
 */
export function weightPieces(
  text: string,
  weights: readonly PadWeight[],
  fallback: PadWeight,
): { text: string; weight: PadWeight }[] {
  const parts = text.split(/(\s+)/).filter((s) => s !== '')
  const words = parts.filter((s) => !/^\s+$/.test(s)).length
  const match = words === weights.length
  const out: { text: string; weight: PadWeight }[] = []
  let i = 0
  for (const part of parts) {
    const space = /^\s+$/.test(part)
    const weight = space
      ? (out[out.length - 1]?.weight ?? fallback)
      : match
        ? weights[i++]
        : fallback
    const last = out[out.length - 1]
    if (last && last.weight === weight) last.text += part
    else out.push({ text: part, weight })
  }
  return out
}
